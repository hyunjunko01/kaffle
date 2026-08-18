# Architecture

Kaffle is split into an off-chain platform and an on-chain raffle layer. The platform owns identity, wallet mapping, and ticket issuance. The raffle contract owns participation and round settlement.

## System flow

1. A user signs in with Kakao.
2. The platform creates an account and maps a wallet to it.
3. The user earns tickets from social or on-chain actions.
4. The user spends tickets to enter the current raffle round.
5. When the round window ends, the raffle closes automatically.

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

Tickets are the only way to enter a raffle.

## Raffle

The platform runs one raffle at a time, one round per cycle.

A round:

- accepts entries by spending tickets
- allows the same user to enter more than once
- has no participant cap
- stays open for a fixed window (3 days)
- closes automatically when that window ends

Round lifecycle is time-based, not capacity-based.

## On-chain vs off-chain

| Layer | Owns |
| --- | --- |
| Off-chain platform | Kakao auth, account, social verification, ticket ledger, round schedule |
| On-chain | mapped wallet, raffle contract, raffle participation and settlement |

The platform decides who gets tickets and when a round is open. The raffle contract receives entries from mapped wallets and settles the round after it closes.
