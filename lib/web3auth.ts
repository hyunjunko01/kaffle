"use client";

import type { Web3AuthNoModal } from "@web3auth/no-modal";

const BASE_SEPOLIA_CHAIN_ID = "0x14a34";

let client: Web3AuthNoModal | null = null;
let initializing: Promise<Web3AuthNoModal> | null = null;

export function isWeb3AuthConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID &&
      process.env.NEXT_PUBLIC_WEB3AUTH_AUTH_CONNECTION_ID,
  );
}

async function waitForAuthReady(instance: Web3AuthNoModal) {
  const { CONNECTOR_STATUS, WALLET_CONNECTORS } = await import(
    "@web3auth/no-modal"
  );
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    const auth = instance.getConnector(WALLET_CONNECTORS.AUTH);
    if (
      auth?.status === CONNECTOR_STATUS.READY ||
      auth?.status === CONNECTOR_STATUS.CONNECTED
    ) {
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

    const instance = new Web3AuthNoModal({
      clientId,
      web3AuthNetwork:
        process.env.NEXT_PUBLIC_WEB3AUTH_NETWORK === "sapphire_mainnet"
          ? WEB3AUTH_NETWORK.SAPPHIRE_MAINNET
          : WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
      multiInjectedProviderDiscovery: false,
      mfaLevel: MFA_LEVELS.NONE,
      defaultChainId: BASE_SEPOLIA_CHAIN_ID,
      chains: [
        {
          chainNamespace: CHAIN_NAMESPACES.EIP155,
          chainId: BASE_SEPOLIA_CHAIN_ID,
          rpcTarget: "https://sepolia.base.org",
          displayName: "Base Sepolia",
          blockExplorerUrl: "https://sepolia.basescan.org",
          ticker: "ETH",
          tickerName: "Ethereum",
          decimals: 18,
          logo: "https://images.web3auth.io/ethereum.svg",
          isTestnet: true,
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

export async function connectMappedWallet(idToken: string) {
  const authConnectionId = process.env.NEXT_PUBLIC_WEB3AUTH_AUTH_CONNECTION_ID;
  if (!authConnectionId) {
    throw new Error("NEXT_PUBLIC_WEB3AUTH_AUTH_CONNECTION_ID is not set");
  }

  const { AUTH_CONNECTION, WALLET_CONNECTORS } = await import(
    "@web3auth/no-modal"
  );
  const web3auth = await getClient();
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

  const accounts = (await provider.request({
    method: "eth_accounts",
  })) as string[];
  const address = accounts[0];
  if (!address) {
    throw new Error("Web3Auth did not return an address");
  }

  return address.toLowerCase();
}
