# Database

v0 entity map aligned with `prisma/schema.prisma`. Mission definitions stay in code (`lib/missions.ts`). Raffle participation lives primarily on-chain; Postgres keeps identity, tickets, mission completions, and UI snapshots.

```
User 1 ── 1 Wallet
User 1 ── n MissionCompletion
User 1 ── n TicketLedger
User 1 ── 0..n referrals (via referredByUserId)
RaffleSnapshot 1 ── n PrizeClaim
```

Referral does not need its own table. Store `referredByUserId` on `User`. Invite rewards go into `TicketLedger` (and matching `MissionCompletion` rows).

## User

The Kakao identity. Created on first login.

- Kakao id
- nickname (+ nickname change flags used by onboarding / profile)
- referral code (this user’s own code)
- referred by user id (nullable, set once)
- created at

## Wallet

One wallet per user. Mapped after Kakao login, when Web3Auth returns an address.

- user id
- address

The private key is not stored. Web3Auth holds key shares; we persist the address only.

## TicketLedger

Every ticket grant and spend. Balance is the sum of these rows, not a separate number on `User`.

Common reasons in v0:

- `kaffle-guide` (`+n`)
- `attendance` (`+n`)
- `on-chain` (`+n`)
- `referral` / `referral_join` (`+n`)
- `raffle_entry` (`-n`)
- `raffle_entry_refund` (`+n`, if an enter fails after debit)

Each row: user id, amount, reason, related id, created at.

## MissionCompletion

Whether this user finished a mission (or a referral success event).

- user id
- mission (`kaffle-guide` | `attendance` | `on-chain` | `referral` | `referral_join` | …)
- status (`granted`, …)
- extra (for example Seoul date key for attendance; empty string when unused)
- created at

Unique on `(userId, mission, extra)`.

Rules for v0:

- `kaffle-guide`: once per user
- `attendance`: once per Seoul calendar day (`extra` = date key)
- `on-chain`: once per user after faucet claim
- `referral`: inviter success rows (capped); invitee join recorded separately

There is no SNS mission table or status in v0.

## RaffleSnapshot

Off-chain cache for round UI / history. Not the source of truth for entries.

- raffle address (unique)
- round number
- winner address (nullable)
- prize amount / symbol / decimals
- prize claimed flag
- timestamps

## PrizeClaim

Recorded claim txs for winners.

- raffle address
- winner address
- amount
- tx hash
- claimed at

Entries themselves are stored on the raffle clone on-chain, not as `RaffleEntry` rows in Postgres.
