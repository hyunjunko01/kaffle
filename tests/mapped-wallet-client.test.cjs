/* eslint-disable @typescript-eslint/no-require-imports -- Node test fixtures use CommonJS. */
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const createLoader = require('./helpers/load-ts.cjs');
let jose;
before(async () => { jose = await import('jose'); });
const connectionId = 'kaffle-kakao';
const address = '0x' + 'a'.repeat(40);
const loginToken = userId => `${Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: userId })).toString('base64url')}.signature`;

function client(restoredUserId) {
  const calls = { logout: 0, connect: 0, tokens: 0 };
  const instances = [];
  class Web3AuthNoModal {
    constructor() {
      instances.push(this);
      this.auth = { status: restoredUserId ? 'connected' : 'ready', provider: this.makeProvider() };
      this.userInfo = { userId: restoredUserId, authConnection: 'custom', authConnectionId: connectionId };
      this.accessToken = 'provider-access-token';
    }
    makeProvider() { return { request: async ({ method }) => { assert.equal(method, 'eth_accounts'); return [address]; } }; }
    async init() {}
    getConnector() { return this.auth; }
    async getUserInfo() { return this.userInfo; }
    async logout() { calls.logout++; this.auth.status = 'ready'; }
    async connectTo(connector, options) {
      calls.connect++;
      assert.equal(connector, 'auth'); assert.equal(options.authConnectionId, connectionId);
      this.userInfo = { userId: jose.decodeJwt(options.idToken).sub, authConnection: 'custom', authConnectionId: connectionId };
      this.auth.status = 'connected';
      return { ethereumProvider: this.makeProvider() };
    }
    async getAuthTokenInfo() { calls.tokens++; return { idToken: 'provider-identity-token' }; }
  }
  const load = createLoader({
    jose,
    '@web3auth/no-modal': {
      Web3AuthNoModal, AUTH_CONNECTION: { CUSTOM: 'custom' }, WALLET_CONNECTORS: { AUTH: 'auth' },
      CONNECTOR_STATUS: { READY: 'ready', CONNECTED: 'connected', AUTHORIZED: 'authorized' },
      MFA_LEVELS: { NONE: 'none' }, WEB3AUTH_NETWORK: { SAPPHIRE_MAINNET: 'sapphire_mainnet', SAPPHIRE_DEVNET: 'sapphire_devnet' },
      CHAIN_NAMESPACES: { EIP155: 'eip155' },
    },
    '@/lib/chain/config': { getPublicChainConfig: () => ({ chainIdHex: '0x1', rpcUrl: 'https://rpc.test', blockExplorerUrl: '' }) },
  }, { process: { env: { NEXT_PUBLIC_WEB3AUTH_CLIENT_ID: 'project', NEXT_PUBLIC_WEB3AUTH_AUTH_CONNECTION_ID: connectionId } } });
  return { api: load('lib/auth/web3auth.ts'), calls, get instance() { return instances.at(-1); } };
}

test('onboarding retrieves provider proof separately from the application login JWT', async () => {
  const h = client();
  const proof = await h.api.connectMappedWalletProof(loginToken('123'));
  assert.equal(proof.address, address); assert.equal(proof.identityToken, 'provider-identity-token');
  assert.equal(proof.accessToken, 'provider-access-token'); assert.equal(h.calls.tokens, 1);
});

test('a restored wallet from another Kakao account is disconnected before connecting', async () => {
  const h = client('old-user');
  await h.api.connectMappedWalletProof(loginToken('new-user'));
  assert.equal(h.calls.logout, 1); assert.equal(h.calls.connect, 1);
  assert.equal(h.instance.userInfo.userId, 'new-user');
});

test('a restored wallet for the same Kakao account and connection is reused', async () => {
  const h = client('same-user');
  await h.api.connectMappedWalletProof(loginToken('same-user'));
  assert.equal(h.calls.logout, 0); assert.equal(h.calls.connect, 0);
});

test('registration cannot proceed when the SDK supplies no provider identity token', async () => {
  const h = client('same-user');
  await h.api.connectMappedWalletProvider(loginToken('same-user'));
  h.instance.getAuthTokenInfo = async () => ({ idToken: null });
  await assert.rejects(() => h.api.connectMappedWalletProof(loginToken('same-user')), /identity token/);
});
