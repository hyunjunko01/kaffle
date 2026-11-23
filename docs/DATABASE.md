# Database

Entity map aligned with `prisma/schema.prisma`. Mission definitions stay in code (`lib/missions.ts`). Raffle participation lives primarily on-chain; Postgres keeps identity, tickets, mission completions, and UI snapshots.

```
User 1 ── 1 Wallet
User 1 ── n MissionCompletion
User 1 ── n TicketLedger
User 1 ── n RaffleEntryOperation ── n TicketLedger
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

Common reasons:

- `kaffle-guide` (`+n`)
- `attendance` (`+n`)
- `on-chain` (`+n`, testnet)
- `payout-address` (`+n`)
- `first-enter` (`+n`)
- `referral` / `referral_join` (`+n`)
- `raffle_entry` (`-n`)
- `raffle_entry_refund` (`+n`, once an entry operation is proven unsuccessful)

Each row: user id, amount, reason, related id, created at. New raffle debits and
refunds also reference `entryOperationId`; `(entryOperationId, reason)` is unique.
`relatedId` remains the raffle address for compatibility with historical rows.
Pending debits reduce the spendable balance, but participant totals and the
first-entry mission count only confirmed operations. Legacy rows without an
operation retain their existing net-spend accounting.

## RaffleEntryOperation

Durable ticket reservation and transaction recovery record, unique on
`(userId, requestId)`. Stores chain, raffle, wallet, ticket count, voucher nonce,
deadline, nonce-snapshot block, signed transaction bytes/hash, state, worker
lease, and reconciliation cursor. A copied voucher may have a different
successful transaction hash, saved as `confirmedTxHash`.

`PREPARING → PENDING → CONFIRMED` or `FAILED`. Creating an operation and its debit
is one transaction under a per-user row lock. Signed bytes and their hash must
commit before any broadcast. Refunds and the transition to `FAILED` commit
together with a conditional state update, so competing workers cannot refund
twice. Expired preparation leases fence stale signers before a refund.

The migration also creates a PostgreSQL partial unique index for
`(chainId, raffleAddress, walletAddress, entryNonce)` on pending/confirmed rows.
Prisma's schema does not express this index; preserve it in migrations. It
prevents a stale nonce snapshot from authorizing a second debit for a consumed
voucher. Apply the SQL migration with `prisma migrate deploy`, rather than
replacing it with `db push`.

After broadcasting, a reverted transaction alone does not authorize a refund:
any caller can copy its public voucher. Recovery waits for a finalized block
past the voucher deadline and verifies that the user's raffle nonce is unchanged.
If the nonce advanced, it scans bounded ranges of `Entered` events after the
snapshot to recover the corresponding entry, including calls forwarded through
another contract. A conflicting historical ticket count or unavailable proof
remains pending for review. Do not manually refund an uncertain operation.

## MissionCompletion

Whether this user finished a mission (or a referral success event).

- user id
- mission (`kaffle-guide` | `attendance` | `on-chain` | `referral` | `referral_join` | `payout-address` | `first-enter` | …)
- status (`granted`, …)
- extra (for example Seoul date key for attendance; empty string when unused)
- created at

Unique on `(userId, mission, extra)`.

Rules:

- `kaffle-guide`: once per user
- `attendance`: once per Seoul calendar day (`extra` = date key)
- `on-chain`: once per user after faucet claim (testnet)
- `payout-address` / `first-enter`: once per user
- `referral`: inviter success rows (capped); invitee join recorded separately

There is no SNS mission table or status.

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

Confirmed participation remains authoritative on the raffle clone. The operation
rows track submission/accounting recovery and do not replace on-chain entries.
