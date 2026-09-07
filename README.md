# Kaffle

A Web3 onboarding experiment: users sign in with Kakao, earn raffle tickets from missions, and enter an on-chain raffle. Private keys never leave Web3Auth. Tickets stay off-chain. Settlement and prizes happen on-chain with Chainlink VRF.

Currently in **v0** (testnet beta) on Base Sepolia.

## How it works

```
Kakao login → account + mapped wallet
                ↓
     missions → tickets → raffle entry
                ↓
     window ends → Chainlink VRF → winner claims prize
```

1. Sign in with Kakao. On first login, the app creates an account and maps a Web3Auth wallet 1:1.
2. Complete missions (attendance, on-chain activity, friend invite, SNS) to earn tickets.
3. Spend tickets to enter the current raffle round. One round at a time, open for 3 days, no participant cap.
4. After the window ends, anyone can request a winner. Chainlink VRF picks one. The winner claims the prize from the vault.

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
components/   UI
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
| `KaffleFaucet` | Testnet token faucet |

```bash
cd contracts
forge build
forge test
```

Deploy scripts are in `contracts/script/deploy`. Contract env vars are documented in `contracts/.env.example`.

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Database](docs/DATABASE.md)
- [Roadmap](docs/ROADMAP.md)

## License

This project is licensed under the [MIT License](LICENSE).

Vendor code under `contracts/lib/` keeps its own licenses.
