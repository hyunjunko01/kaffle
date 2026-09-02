export type WalletView = {
  chainId: number;
  slug: string;
  transferMode: "eip3009" | "unsupported";
  network: string;
  explorerBaseUrl: string;
  wallet: string;
  token: string;
  symbol: string;
  decimals: number;
  balance: string;
};
