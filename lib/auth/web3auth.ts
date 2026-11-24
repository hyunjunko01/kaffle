"use client";

import { decodeJwt } from "jose";
import type { Web3AuthNoModal } from "@web3auth/no-modal";
import { getPublicChainConfig } from "@/lib/chain/config";

let client: Web3AuthNoModal | null = null;
let initializing: Promise<Web3AuthNoModal> | null = null;

export function isWeb3AuthConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID &&
      process.env.NEXT_PUBLIC_WEB3AUTH_AUTH_CONNECTION_ID,
  );
}

function isAuthConnectorUsable(
  status: string | undefined,
  CONNECTOR_STATUS: {
    READY: string;
    CONNECTED: string;
    AUTHORIZED: string;
  },
) {
  return (
    status === CONNECTOR_STATUS.READY ||
    status === CONNECTOR_STATUS.CONNECTED ||
    status === CONNECTOR_STATUS.AUTHORIZED
  );
}

async function waitForAuthReady(instance: Web3AuthNoModal) {
  const { CONNECTOR_STATUS, WALLET_CONNECTORS } = await import(
    "@web3auth/no-modal"
  );
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    const auth = instance.getConnector(WALLET_CONNECTORS.AUTH);
    if (isAuthConnectorUsable(auth?.status, CONNECTOR_STATUS)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const auth = instance.getConnector(WALLET_CONNECTORS.AUTH);
  throw new Error(
    `Web3Auth AUTH connector did not become ready (status: ${auth?.status ?? "missing"})`,
  );
}

async function getClient() {
  if (client) {
    return client;
  }
  if (initializing) {
    return initializing;
  }

  const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error("NEXT_PUBLIC_WEB3AUTH_CLIENT_ID is not set");
  }

  initializing = (async () => {
    const {
      CHAIN_NAMESPACES,
      MFA_LEVELS,
      WEB3AUTH_NETWORK,
      Web3AuthNoModal,
    } = await import("@web3auth/no-modal");

    const chainConfig = getPublicChainConfig();
    const blockExplorerUrl =
      chainConfig.blockExplorerUrl.length > 0
        ? chainConfig.blockExplorerUrl
        : "http://localhost";

    const instance = new Web3AuthNoModal({
      clientId,
      web3AuthNetwork:
        process.env.NEXT_PUBLIC_WEB3AUTH_NETWORK === "sapphire_mainnet"
          ? WEB3AUTH_NETWORK.SAPPHIRE_MAINNET
          : WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
      multiInjectedProviderDiscovery: false,
      mfaLevel: MFA_LEVELS.NONE,
      defaultChainId: chainConfig.chainIdHex,
      chains: [
        {
          chainNamespace: CHAIN_NAMESPACES.EIP155,
          chainId: chainConfig.chainIdHex,
          rpcTarget: chainConfig.rpcUrl,
          displayName: chainConfig.displayName,
          blockExplorerUrl,
          ticker: "ETH",
          tickerName: "Ethereum",
          decimals: 18,
          logo: "https://images.web3auth.io/ethereum.svg",
          isTestnet: chainConfig.isTestnet,
        },
      ],
    });

    await instance.init();
    await waitForAuthReady(instance);
    client = instance;
    return instance;
  })().catch((error) => {
    initializing = null;
    client = null;
    throw error;
  });

  return initializing;
}

export async function connectMappedWalletProvider(idToken: string) {
  const authConnectionId = process.env.NEXT_PUBLIC_WEB3AUTH_AUTH_CONNECTION_ID;
  if (!authConnectionId) {
    throw new Error("NEXT_PUBLIC_WEB3AUTH_AUTH_CONNECTION_ID is not set");
  }

  const { AUTH_CONNECTION, CONNECTOR_STATUS, WALLET_CONNECTORS } = await import(
    "@web3auth/no-modal"
  );
  const requestedUserId = decodeJwt(idToken).sub;
  if (!requestedUserId) throw new Error("Invalid wallet login token");
  const web3auth = await getClient();
  const auth = web3auth.getConnector(WALLET_CONNECTORS.AUTH);
  if (
    auth?.status === CONNECTOR_STATUS.CONNECTED ||
    auth?.status === CONNECTOR_STATUS.AUTHORIZED
  ) {
    const userInfo = await web3auth.getUserInfo();
    if (userInfo.userId === requestedUserId && userInfo.authConnectionId === authConnectionId &&
        userInfo.authConnection === AUTH_CONNECTION.CUSTOM) {
      const existingProvider = auth.provider ?? web3auth.provider;
      if (existingProvider) return existingProvider;
    }
    // A Kakao account switch must not reuse another user's restored wallet.
    await web3auth.logout();
    await waitForAuthReady(web3auth);
  }

  const connection = await web3auth.connectTo(WALLET_CONNECTORS.AUTH, {
    authConnection: AUTH_CONNECTION.CUSTOM,
    authConnectionId,
    idToken,
    extraLoginOptions: {
      isUserIdCaseSensitive: true,
    },
  });

  const provider = connection?.ethereumProvider;
  if (!provider) {
    throw new Error("Web3Auth did not return a provider");
  }

  return provider;
}

export async function connectMappedWallet(idToken: string) {
  const provider = await connectMappedWalletProvider(idToken);
  const accounts = (await provider.request({
    method: "eth_accounts",
  })) as string[];
  const address = accounts[0];
  if (!address) {
    throw new Error("Web3Auth did not return an address");
  }

  return address.toLowerCase();
}

/** Provider-signed registration proof. Never send the Kaffle login JWT as this proof. */
export async function connectMappedWalletProof(idToken: string) {
  const address = await connectMappedWallet(idToken);
  const web3auth = await getClient();
  const { idToken: identityToken } = await web3auth.getAuthTokenInfo();
  if (!identityToken) throw new Error("Web3Auth did not return a wallet identity token");
  return { address, identityToken, accessToken: web3auth.accessToken ?? undefined };
}
