# Kaffle

A Web3 onboarding experiment: users sign in with Kakao, earn raffle tickets from missions, and enter an on-chain raffle. Private keys never leave Web3Auth. Tickets stay off-chain. Settlement and prizes happen on-chain with Chainlink VRF.

**Status:** contracts are live on **Base mainnet**, and one end-to-end smoke round (create → enter → VRF → claim) has been completed. The product is still early — not a wide public launch.

Supported app chains: `anvil` | `sepolia` | `base-sepolia` | `base` (set `CHAIN` / `NEXT_PUBLIC_CHAIN`).

## How it works

```
Kakao login → account + mapped wallet
                ↓
     missions → tickets → raffle entry
                ↓
     window ends → Chainlink VRF → winner claims prize
```

1. Sign in with Kakao. On first login, the app creates an account and maps a Web3Auth wallet 1:1.
2. Complete missions (Kaffle guide, attendance, friend invite, payout address, first enter; plus testnet-only faucet missions) to earn tickets.
3. Spend tickets to enter the current raffle round. One round at a time, no participant cap. Round duration is set when the admin creates the round (product target: about 3 days).
4. After the window ends, anyone can request a winner. Chainlink VRF picks one. The winner claims the prize from the vault. The admin creates the next round when the current one is finished.

The platform signs ticket spends. A relayer submits the `enter` transaction. The server stores the wallet address only — never the private key.

## Stack

| Layer | Tech |
| --- | --- |
| App | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Auth | Kakao OAuth, session cookies |
| Wallet | Web3Auth (embedded wallet) |
| Database | PostgreSQL (Prisma) |
| Chain | Solidity, Foundry, viem |
| Randomness | Chainlink VRF |

## Repo layout

```
app/          Next.js App Router (pages, API routes)
components/   Shared UI
lib/          Auth, raffle, missions, chain helpers
prisma/       Schema and migrations
contracts/    Factory, raffle clone, vault, faucet
docs/         Architecture, API, database, roadmap
```

## Prerequisites

- Node.js 20+
- PostgreSQL (local or [Neon](https://neon.tech))
- [Foundry](https://book.getfoundry.sh/getting-started/installation) if you work on contracts
- Kakao and Web3Auth credentials (see `.env.example`)

## App setup

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL, Kakao, Web3Auth, and chain values
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful scripts:

```bash
npm run lint
npm run db:migrate    # prisma migrate dev
npm run db:deploy     # prisma migrate deploy
```

Do not commit `.env`. Copy from `.env.example` and keep real keys local or in your host’s secret store.

## Contracts

On-chain pieces live in `contracts/src`:

| Contract | Role |
| --- | --- |
| `KaffleFactory` | Creates raffle rounds, talks to Chainlink VRF |
| `Kaffle` | One round (EIP-1167 clone): entries, window, winner |
| `KaffleVault` | Holds the prize token and pays the winner |
| `KaffleFaucet` | Testnet token faucet (optional; not used on mainnet) |

```bash
cd contracts
forge build
forge test
```

Deploy scripts are in `contracts/script/deploy`. Contract env vars are documented in `contracts/.env.example`. Broadcast logs for non-local chains live under `contracts/broadcast/`.

### Base mainnet (chainId 8453)

Deployed via `DeployKaffle` (see `contracts/broadcast/DeployKaffle.s.sol/8453/`).

| Contract | Address |
| --- | --- |
| Implementation (`Kaffle`) | [`0xce1f74aad352e2da6b937bed5f3b9bbb2de6c0e5`](https://basescan.org/address/0xce1f74aad352e2da6b937bed5f3b9bbb2de6c0e5) |
| Vault | [`0x48ef2451bc93aa8697c919e5518c0309327a3d12`](https://basescan.org/address/0x48ef2451bc93aa8697c919e5518c0309327a3d12) |
| Factory | [`0x2122bd4927c8032f5e1273856ce018aef8a8c35c`](https://basescan.org/address/0x2122bd4927c8032f5e1273856ce018aef8a8c35c) |

Prize token: native USDC on Base (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`).

Smoke test completed on mainnet: admin funded vault → created a round → entered with tickets → requested winner (Chainlink VRF) → claimed prize.

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Database](docs/DATABASE.md)
- [Roadmap](docs/ROADMAP.md)

## License

This project is licensed under the [MIT License](LICENSE).

Vendor code under `contracts/lib/` keeps its own licenses.
