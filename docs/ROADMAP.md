# Roadmap

v0 and v1 share the same product. The difference is where it runs.

- **v0** — testnet only. A beta to confirm the minimum flow works.
- **v1** — the same flow in production.

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
- one on-chain activity (testnet faucet claim)

Out of scope:

- NFT minting
- SNS promotion missions
- additional missions beyond the list above

## v0 — Testnet beta

Deploy only to testnet (Base Sepolia). Goal: prove the loop end to end.

1. Kakao login creates an account and a mapped wallet.
2. A user can complete the v0 missions and receive tickets.
3. A user can spend tickets to enter the open raffle.
4. When the round window ends, entries stop. Anyone can request a winner if there are entries. The winner claims from the vault. The admin starts the next round.

If this loop is stable, v1 can reuse the same features on production.

## v1 — Production

Same features as v0. Ship the verified loop as a live service, not a testnet beta.

## Later

Not planned yet:

- NFT minting
- more on-chain missions
- SNS / extra social missions
