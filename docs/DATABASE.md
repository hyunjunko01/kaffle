# Database

v0 / v1 entity map. This is not a full schema. Column types and indexes can wait until implementation.

Entities come from the product loop: login → wallet → mission → ticket → raffle.

```
User 1 ── 1 Wallet
User 1 ── n MissionCompletion
User 1 ── n TicketLedger
User 1 ── n RaffleEntry
RaffleRound 1 ── n RaffleEntry
```

Referral does not need its own table. Store `referredByUserId` on `User`. Invite rewards go into `TicketLedger` as a referral grant.

Mission definitions stay in code for v0 / v1. Only completions are stored.

## User

The Kakao identity. Created on first login.

- Kakao id
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

Reasons:

- attendance (`+n`)
- on-chain mission (`+n`)
- SNS promotion (`+n`)
- referral (`+n`)
- raffle entry (`-n`)

Each row: user id, amount, reason, related id, created at.

## MissionCompletion

Whether this user finished a mission.

- user id
- mission (`attendance` | `on-chain` | `sns`)
- status (`pending` | `granted`)
- extra data (attendance date, tx proof, SNS url)
- created at

Rules for this version:

- attendance: once per day
- on-chain: once per user
- sns: submit a url, then grant after verification

## RaffleRound

One open round at a time.

- status (`open` | `closed`)
- starts at
- ends at (3-day window)
- closed at (nullable)

Round lifecycle is time-based. There is no participant cap.

## RaffleEntry

One spend of tickets to enter a round. The same user can have many rows in the same round.

- round id
- user id
- ticket count
- created at
