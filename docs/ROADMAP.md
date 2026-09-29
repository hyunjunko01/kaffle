# Roadmap

v0 and v1 share the same product. The difference is where it runs.

- **v0** — testnet beta on Base Sepolia. Confirmed the minimum loop works.
- **v1** — same loop on Base mainnet. Contracts are deployed and one smoke round has been completed; wider public operation is still early.

NFT minting and extra social missions (for example SNS promotion) are out of scope for v0 and v1.

## Shared scope (v0 / v1)

### Flow

- Kakao login
- account + mapped wallet
- earn tickets from missions
- spend tickets to enter the current raffle

### Raffle

- one round at a time
- no participant cap
- duration set when the admin creates the round (target window: about 3 days)
- entry closes automatically when `endTime` is reached
- next round is created by the admin after the current round is finished
- the same user can enter more than once

### Ticket missions

In scope for v0 / v1:

- Kaffle guide (one-time product walkthrough)
- attendance (once per Seoul calendar day)
- friend invite / referral code
- payout address registration (one-time)
- first raffle enter bonus (one-time)
- on-chain faucet claim (**testnet only**; hidden on mainnet)

Out of scope:

- NFT minting
- SNS promotion missions
- additional missions beyond the list above

## v0 — Testnet beta (done)

Deployed to Base Sepolia. Goal was to prove the loop end to end.

1. Kakao login creates an account and a mapped wallet.
2. A user can complete the v0 missions and receive tickets.
3. A user can spend tickets to enter the open raffle.
4. When the round window ends, entries stop. Anyone can request a winner if there are entries. The winner claims from the vault. The admin starts the next round.

## v1 — Production (in progress)

Same features as v0, on Base mainnet.

**Done**

- `DeployKaffle` on Base (factory / vault / implementation). Addresses are listed in the root [README](../README.md).
- App chain slug `base`, optional faucet, EIP-3009 transfers on Base.
- Admin ops: Kakao allowlist, vault funding, owner/relayer balance view.
- One mainnet smoke round: fund vault → create raffle → enter → VRF → claim.

**Still early / not a full launch**

- Limited operators and participants; not marketed as a public product yet.
- Ongoing ops (relayer ETH, VRF subscription funding, round cadence) as needed.
- Optional: Basescan verification, custom domain, Web3Auth `sapphire_mainnet` if moving beyond smoke tests.
- **Follow-up:** operational recovery if Chainlink VRF fails after `requestWinner` (round can stick with prize reserved; see Architecture). To be designed later — not in the current deploy.

## Later

Planned / not built yet:

- Chainlink VRF failure recovery (retry, timeout, or admin path to unblock a stuck round and reserved prize)
- Fairer / more verifiable ticket issuance (less opaque off-chain ledger and admin-only adjustments; public rules, auditability, or stronger proofs where practical)
- Transparency surface for users (contract links, round / VRF explanation)
- NFT minting
- more on-chain missions
- SNS / extra social missions
