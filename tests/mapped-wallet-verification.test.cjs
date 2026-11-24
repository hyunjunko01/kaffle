/* eslint-disable @typescript-eslint/no-require-imports -- Node test fixtures use CommonJS. */
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { createECDH } = require('node:crypto');
const { privateKeyToAccount } = require('viem/accounts');
const createLoader = require('./helpers/load-ts.cjs');

const kakaoId = '123456789';
const clientId = 'kaffle-project';
const authConnectionId = 'kaffle-kakao';
const privateKey = '0x' + '11'.repeat(32);
const address = privateKeyToAccount(privateKey).address;
const otherAddress = privateKeyToAccount('0x' + '22'.repeat(32)).address;
const ecdh = createECDH('secp256k1');
ecdh.setPrivateKey(Buffer.from(privateKey.slice(2), 'hex'));
const publicKey = ecdh.getPublicKey('hex', 'compressed');
let jose, signingKey, localKeys;

before(async () => {
  jose = await import('jose');
  const keys = await jose.generateKeyPair('ES256');
  signingKey = keys.privateKey;
  localKeys = jose.createLocalJWKSet({ keys: [{ ...(await jose.exportJWK(keys.publicKey)), kid: 'provider-key', alg: 'ES256' }] });
});

function claims(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: 'web3auth.io', aud: clientId, sub: 'opaque-provider-subject', iat: now, exp: now + 300,
    userId: kakaoId, authConnection: 'custom', authConnectionId,
    wallets: [{ type: 'web3auth_app_key', curve: 'secp256k1', public_key: publicKey }],
    ...overrides,
  };
}
const sign = payload => new jose.SignJWT(payload).setProtectedHeader({ alg: 'ES256', kid: 'provider-key' }).sign(signingKey);

function verifier(options = {}) {
  const calls = [];
  const load = createLoader({
    jose: {
      ...jose,
      createRemoteJWKSet(url) {
        assert.equal(url.href, 'https://api.web3auth.io/citadel-service/.well-known/jwks.json');
        return options.keyResolver ?? localKeys;
      },
    },
    ...options.mocks,
  }, {
    process: { env: { NEXT_PUBLIC_WEB3AUTH_CLIENT_ID: clientId, NEXT_PUBLIC_WEB3AUTH_AUTH_CONNECTION_ID: authConnectionId, ...options.env } },
    AbortSignal,
    fetch: async (url, config) => {
      calls.push({ url, config });
      if (options.fetch) return options.fetch(url, config);
      return new Response(JSON.stringify({
        identifier: kakaoId, connectionId: authConnectionId, web3AuthNetwork: 'sapphire_devnet',
        accounts: [{ isPrimary: true, accountType: 'social', chainNamespace: 'evm', eoaAddress: address }],
        ...options.profile,
      }));
    },
  });
  return { ...load('lib/auth/mapped-wallet-verification.ts'), calls, load };
}

async function verify(v, payload = claims(), input = {}) {
  return v.verifyMappedWallet({ kakaoId, address, identityToken: await sign(payload), ...input });
}

test('accepts a provider-signed custom-login token bound to this Kakao user and address', async () => {
  const v = verifier();
  assert.equal(await verify(v), address.toLowerCase());
  assert.equal(v.calls.length, 0);
});

for (const [name, key] of [
  ['compressed', publicKey], ['uncompressed', ecdh.getPublicKey('hex', 'uncompressed')],
  ['raw XY', ecdh.getPublicKey('hex', 'uncompressed').slice(2)],
]) {
  test(`derives the Ethereum address from the complete ${name} public key`, async () => {
    const v = verifier();
    assert.equal(await verify(v, claims({ wallets: [{ type: 'web3auth_app_key', curve: 'secp256k1', public_key: key }] })), address.toLowerCase());
  });
}

test('rejects replacing signed address A with submitted address B', async () => {
  const v = verifier();
  await assert.rejects(() => verify(v, claims(), { address: otherAddress }), v.MappedWalletVerificationError);
});

for (const [name, changes] of [
  ['another Kakao user', { userId: 'someone-else' }],
  ['another project', { aud: 'attacker-project' }],
  ['another issuer', { iss: 'https://attacker.example' }],
  ['another authentication connection', { authConnectionId: 'attacker-connection' }],
  ['a non-custom login', { authConnection: 'google' }],
  ['expired token', { iat: 100, exp: 200 }],
  ['future issued-at time', { iat: Math.floor(Date.now() / 1000) + 300 }],
  ['missing expiration', { exp: undefined }],
  ['missing issued-at time', { iat: undefined }],
  ['empty wallets', { wallets: [] }],
  ['missing wallets', { wallets: undefined }],
  ['unverified identity claim type', { userId: 123456789 }],
]) {
  test(`rejects ${name}`, async () => {
    const v = verifier();
    await assert.rejects(() => verify(v, claims(changes)), v.MappedWalletVerificationError);
  });
}

for (const [name, wallet] of [
  ['external wallet', { type: 'ethereum', address }],
  ['threshold key', { type: 'web3auth_threshold_key', curve: 'secp256k1', public_key: publicKey }],
  ['another curve', { type: 'web3auth_app_key', curve: 'ed25519', public_key: publicKey }],
  ['invalid curve point', { type: 'web3auth_app_key', curve: 'secp256k1', public_key: '02' + 'ff'.repeat(32) }],
]) {
  test(`rejects ${name} as an embedded app-key proof`, async () => {
    const v = verifier();
    await assert.rejects(() => verify(v, claims({ wallets: [wallet] })), v.MappedWalletVerificationError);
  });
}

test('rejects a token signed by an untrusted key', async () => {
  const v = verifier();
  const rogue = await jose.generateKeyPair('ES256');
  const token = await new jose.SignJWT(claims()).setProtectedHeader({ alg: 'ES256', kid: 'provider-key' }).sign(rogue.privateKey);
  await assert.rejects(() => v.verifyMappedWallet({ kakaoId, address, identityToken: token }), v.MappedWalletVerificationError);
});

test('rejects the application-issued login JWT as wallet proof', async () => {
  const v = verifier();
  const token = await new jose.SignJWT(claims()).setProtectedHeader({ alg: 'HS256' }).sign(new Uint8Array(32));
  await assert.rejects(() => v.verifyMappedWallet({ kakaoId, address, identityToken: token }), v.MappedWalletVerificationError);
});

test('rejects missing, malformed, oversized, and zero-address inputs', async () => {
  const v = verifier();
  for (const identityToken of [undefined, '', 'not-a-jwt', 'x'.repeat(16385), {}]) {
    await assert.rejects(() => v.verifyMappedWallet({ kakaoId, address, identityToken }), v.MappedWalletVerificationError);
  }
  await assert.rejects(() => verify(v, claims(), { address: '0x' + '0'.repeat(40) }), v.MappedWalletVerificationError);
});

test('missing verification configuration fails closed', async () => {
  const v = verifier({ env: { NEXT_PUBLIC_WEB3AUTH_CLIENT_ID: '' } });
  await assert.rejects(() => verify(v), v.MappedWalletVerificationUnavailableError);
});

test('unavailable signing-key service fails closed without treating the address as verified', async () => {
  const v = verifier({ keyResolver: async () => { throw new TypeError('network unavailable'); } });
  await assert.rejects(() => verify(v), v.MappedWalletVerificationUnavailableError);
});

test('v11 opaque-subject tokens resolve the original user from authenticated provider data', async () => {
  const v = verifier();
  assert.equal(await verify(v, claims({ userId: undefined }), { accessToken: 'provider-access-token' }), address.toLowerCase());
  assert.equal(v.calls[0].url, 'https://api.web3auth.io/citadel-service/v1/user');
  assert.equal(v.calls[0].config.headers.Authorization, 'Bearer provider-access-token');
  assert.equal(v.calls[0].config.cache, 'no-store');
  assert.equal(v.calls[0].config.redirect, 'error');
});

for (const [name, profile] of [
  ['another Kakao account', { identifier: 'someone-else' }],
  ['another auth connection', { connectionId: 'another-connection' }],
  ['another SDK network', { web3AuthNetwork: 'sapphire_mainnet' }],
  ['another wallet', { accounts: [{ isPrimary: true, accountType: 'social', chainNamespace: 'evm', eoaAddress: otherAddress }] }],
  ['a linked external wallet', { accounts: [{ isPrimary: false, accountType: 'external_wallet', chainNamespace: 'evm', eoaAddress: address }] }],
]) {
  test(`v11 provider fallback rejects a proof paired with ${name}`, async () => {
    const v = verifier({ profile });
    await assert.rejects(() => verify(v, claims({ userId: undefined }), { accessToken: 'provider-access-token' }), v.MappedWalletVerificationError);
  });
}

test('v11 fallback rejects absent credentials and provider 401 responses', async () => {
  const v = verifier({ fetch: async () => new Response(null, { status: 401 }) });
  await assert.rejects(() => verify(v, claims({ userId: undefined })), v.MappedWalletVerificationError);
  await assert.rejects(() => verify(v, claims({ userId: undefined }), { accessToken: 'expired' }), v.MappedWalletVerificationError);
});

test('v11 fallback retains verification failure on a provider outage', async () => {
  const v = verifier({ fetch: async () => { throw new TypeError('offline'); } });
  await assert.rejects(() => verify(v, claims({ userId: undefined }), { accessToken: 'provider-access-token' }), v.MappedWalletVerificationUnavailableError);
});

function registrationRoutes() {
  const state = {
    user: { id: 'user-a', kakaoId, nickname: 'tester', nicknameChangeCount: 0, wallet: null },
    writes: [], transactions: 0,
  };
  const prisma = {
    wallet: { create: async ({ data }) => {
      state.writes.push(data);
      state.user.wallet = { address: data.address };
      return state.user.wallet;
    } },
    user: { findUnique: async () => state.user },
    $transaction: async fn => { state.transactions++; return fn(prisma); },
  };
  const v = verifier({ mocks: {
    'next/server': { NextResponse: { json: (body, options) => {
      const response = new Response(JSON.stringify(body), options);
      response.cookies = { set() {} };
      return response;
    } } },
    'next/headers': { cookies: async () => ({ get: () => undefined }) },
    '@/lib/auth/user': { getCurrentUser: async () => state.user, toMePayload: async user => ({ wallet: user.wallet }) },
    '@/lib/db': { prisma },
    '@/lib/referrals': { REFERRAL_COOKIE: 'referral', clearReferralCookie: () => ({}), attachReferralOnCreate: async () => { throw Error('unexpected referral mutation'); } },
  } });
  return { ...v, state };
}

for (const [name, path, field] of [
  ['mapped-wallet API', 'app/api/me/wallet/route.ts', 'address'],
  ['onboarding API', 'app/api/onboarding/route.ts', 'walletAddress'],
]) {
  const post = (route, body) => route.POST(new Request('https://kaffle.test', { method: 'POST', body: JSON.stringify(body) }));
  test(`${name}: missing proof cannot create a mapping or change onboarding data`, async () => {
    const h = registrationRoutes();
    const result = await post(h.load(path), { [field]: address, nickname: 'tester' });
    assert.equal(result.status, 401);
    assert.equal(h.state.writes.length, 0); assert.equal(h.state.transactions, 0);
  });
  test(`${name}: a genuine signed A token cannot register address B`, async () => {
    const h = registrationRoutes();
    const result = await post(h.load(path), { [field]: otherAddress, nickname: 'tester', identityToken: await sign(claims()) });
    assert.equal(result.status, 401);
    assert.equal(h.state.writes.length, 0); assert.equal(h.state.transactions, 0);
  });
  test(`${name}: another Kakao user's proof cannot create a mapping`, async () => {
    const h = registrationRoutes();
    const result = await post(h.load(path), { [field]: address, nickname: 'tester', identityToken: await sign(claims({ userId: 'another-user' })) });
    assert.equal(result.status, 401); assert.equal(h.state.writes.length, 0);
  });
  test(`${name}: a verified registration stores the normalized address exactly once`, async () => {
    const h = registrationRoutes(); const route = h.load(path);
    const body = { [field]: address, nickname: 'tester', identityToken: await sign(claims()) };
    assert.equal((await post(route, body)).status, 200);
    assert.equal((await post(route, body)).status, 200);
    assert.equal(h.state.writes.length, 1);
    assert.equal(h.state.writes[0].address, address.toLowerCase());
    assert.equal(h.state.writes[0].userId, 'user-a');
    assert.equal(Object.hasOwn(h.state.writes[0], 'identityToken'), false);
  });
  test(`${name}: an existing mapping cannot be overwritten`, async () => {
    const h = registrationRoutes(); h.state.user.wallet = { address: otherAddress.toLowerCase() };
    const result = await post(h.load(path), { [field]: address, nickname: 'tester', identityToken: await sign(claims()) });
    assert.equal(result.status, 409); assert.equal(h.state.writes.length, 0);
  });
  test(`${name}: malformed requests produce 400 without mutations`, async () => {
    const h = registrationRoutes(); const route = h.load(path);
    for (const body of [null, [], { [field]: {}, nickname: 'tester' }, { [field]: '0x' + '0'.repeat(40), nickname: 'tester' }]) {
      assert.equal((await post(route, body)).status, 400);
    }
    assert.equal(h.state.writes.length, 0);
  });
  test(`${name}: signed-in session is required`, async () => {
    const h = registrationRoutes(); h.state.user = null;
    assert.equal((await post(h.load(path), {})).status, 401);
    assert.equal(h.state.writes.length, 0);
  });
}
