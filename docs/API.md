# API

v0 / v1 backend surface. These endpoints cover Kakao login → tickets → raffle.

Auth endpoints return a session. The rest assume the caller is signed in, except Kakao login and the internal close job.

Friend invite is not a separate endpoint. If a referral code is sent on first Kakao login, the inviter gets tickets.

## Auth

### `POST /auth/kakao`

Sign in with Kakao. On first login, create an account and map a wallet.

Request:

```json
{
  "kakaoToken": "string",
  "referralCode": "string | null"
}
```

`referralCode` is optional. It is applied only on first login.

### `GET /me`

Return the current user, mapped wallet, and ticket balance.

### `POST /auth/logout`

End the session.

## Missions and tickets

### `GET /missions`

List v0 / v1 missions and whether the current user has completed each one.

Missions in this version:

- attendance
- one on-chain activity
- SNS promotion
- referral / friend invite (status only; grant happens on the invitee’s first login)

### `POST /missions/attendance`

Check in and grant attendance tickets.

### `POST /missions/on-chain`

Verify the one on-chain activity on the mapped wallet, then grant tickets.

### `POST /missions/sns`

Submit SNS promotion proof for verification, then grant tickets.

Request:

```json
{
  "url": "string"
}
```

### `GET /referrals/me`

Return the current user’s referral code and invite link.

### `POST /referrals`

Apply a referral code after login, if it was not sent on first Kakao login.

Request:

```json
{
  "referralCode": "string"
}
```

## Raffle

### `GET /raffles/current`

Return the open round: status, close time, and how many times the current user has entered.

### `POST /raffles/current/entries`

Spend tickets to enter the current round. The same user may call this more than once.

Request:

```json
{
  "ticketCount": 1
}
```

### `GET /raffles`

List past rounds.

### `GET /raffles/:id`

Return one round, including the result after it has closed.

## Internal

Not for the client. Called by a scheduler.

### `POST /internal/raffles/close`

Close the current round when its 3-day window has ended, then settle it.
