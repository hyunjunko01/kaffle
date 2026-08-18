# Roadmap

v0 and v1 share the same product. The difference is where it runs.

- **v0** — testnet only. A beta to confirm the minimum flow works.
- **v1** — the same flow in production.

Later versions can add missions. NFT minting and extra missions are out of scope for v0 and v1.

## Shared scope (v0 / v1)

### Flow

- Kakao login
- account + mapped wallet
- earn tickets from missions
- spend tickets to enter the current raffle

### Raffle

- one round at a time
- no participant cap
- one round every 3 days
- closes automatically when the window ends
- the same user can enter more than once

### Ticket missions

In scope:

- attendance
- one on-chain activity
- friend invite and SNS promotion, or a referral code

Out of scope:

- NFT minting
- additional missions

## v0 — Testnet beta

Deploy only to testnet. Goal: prove the loop end to end.

1. Kakao login creates an account and a mapped wallet.
2. A user can complete the v0 missions and receive tickets.
3. A user can spend tickets to enter the open raffle.
4. After 3 days, the round closes on its own.

If this loop is stable, v1 can reuse the same features on production.

## v1 — Production

Same features as v0. Ship the verified loop as a live service, not a testnet beta.

## Later

Not planned yet:

- NFT minting
- more on-chain missions
- extra social missions
