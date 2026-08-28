import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@web3auth/modal", "@web3auth/no-modal"],
  serverExternalPackages: ["@prisma/client"],
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app"],
};

export default nextConfig;
