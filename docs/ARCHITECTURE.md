# Architecture

Kaffle is split into an off-chain platform and an on-chain raffle layer. The platform owns identity, wallet mapping, and ticket issuance. On-chain contracts own raffle creation, participation, randomness, and prize payout.

## System flow

1. A user signs in with Kakao.
2. The platform creates an account and maps a wallet to it.
3. The user earns tickets from social or on-chain actions.
4. The user spends tickets to enter the current raffle round.
5. When the round window ends, entries stop. Settlement happens on-chain after that.

```
Kakao login → account → mapped wallet
                         ↓
          social / on-chain actions → tickets → raffle entry
```

## Auth and wallet

Kakao is the only entry gate.

On first login, the platform:

- creates a user account from the Kakao identity
- lets Web3Auth reconstruct the signing key in the browser
- maps that wallet address 1:1 to the account

The server stores the address only. It does not store or generate the private key.

Later logins reuse the same account and wallet. The user does not import or connect an external wallet to enter the platform.

## Tickets

Tickets are issued by the platform, not by the user.

There are three issuance channels:

- KakaoTalk friend invite
- SNS promotion (for example Instagram)
- specific on-chain activity

Social actions are verified off-chain, then recorded as ticket grants. On-chain actions are observed from the mapped wallet, then recorded the same way.

Tickets are the only way to enter a raffle. There is no on-chain entry fee. The ticket ledger stays off-chain. A platform signature proves a spend when the mapped wallet enters on-chain.

## Raffle

The platform runs one raffle at a time, one round per cycle.

A round:

- accepts entries by spending tickets
- allows the same user to enter more than once
- has no participant cap
- stays open for a fixed window (3 days)
- stops accepting entries when that window ends

Round lifecycle is time-based, not capacity-based. After the window ends, `enter` is blocked. Settlement still needs a transaction: anyone can request a winner if the round has entries.

## On-chain contracts

Three contracts share the on-chain layer.

| Contract | Owns |
| --- | --- |
| Factory | raffle creation, raffle registry, Chainlink VRF |
| Raffle (clone) | one round’s entries, window, and winner |
| Vault | prize stablecoin and payout |

Each round is a minimal proxy (EIP-1167 clone) of a single raffle implementation. The clone has its own storage. The code is shared. Implementation upgrades are out of scope for now.

The admin pays gas through a relayer. Service fees are collected off-chain, not taken from raffle entry.

### Factory

The admin creates rounds with `createRaffle`. There is no separate next-round function.

`createRaffle` fails while the current raffle is still active. A raffle is finished when it has a winner, or when the window has ended with zero entries. The clone never creates the next round.

The factory is the only Chainlink VRF consumer. It maps each randomness request to the raffle that asked for it. It accepts `requestWinner` only from clones it created.

### Raffle clone

`enter` records a weighted entry `{ user, cumulativeTickets }` for that call. The same user may enter more than once. Winner selection is a binary search over those records, so the VRF callback stays cheap. A round has no participant cap. A single transaction may cap ticket count to prevent abuse.

`enter` requires a platform signature bound to the user, the raffle, the ticket count, and a nonce. The relayer submits the transaction. The mapped wallet is stored as the participant.

Anyone may call `requestWinner` after the window ends, if there is at least one entry and a winner has not already been requested. The clone then asks the factory for randomness. It does not talk to Chainlink itself.

If nobody entered, `requestWinner` reverts. The prize stays in the vault. The admin starts the next round with `createRaffle`.

The VRF callback only writes the winner. It does not send tokens.

### Vault

The vault holds one ERC-20 stablecoin, set at deploy time. All prizes come from the admin. Users do not deposit into the vault.

When a raffle is created, its prize amount is attached in the vault. After a winner is recorded, payout is pull-based: `claim` sends the prize only to the stored winner. A relayer may submit `claim` and pay gas; the tokens still go to the winner.

There is no refund path. Unclaimed or unused prize funds remain in the vault for later rounds.

```
Admin → createRaffle → clone + prize attached in Vault
User clicks enter → platform signs ticket voucher
Relayer → clone.enter(user, tickets, signature)
Window ends
  ├─ entries ≥ 1 → anyone requestWinner → Factory → Chainlink VRF
  │                    → callback records winner → claim from Vault
  └─ entries = 0 → requestWinner reverts
Admin → createRaffle (current round must be finished)
```

## On-chain vs off-chain

| Layer | Owns |
| --- | --- |
| Off-chain platform | Kakao auth, account, social verification, ticket ledger, round schedule, ticket signatures, relayer gas, service fees |
| On-chain | mapped wallet, factory, raffle clones, vault, participation, VRF settlement, prize payout |

The platform decides who gets tickets and when a round is created. The raffle clone receives signed entries from mapped wallets. The factory settles the round with Chainlink VRF. The vault pays the winner.
