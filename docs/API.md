# API

v0 backend surface as implemented under `app/api` and `app/auth`. Session cookies authenticate users unless noted.

Friend invite is mostly cookie + onboarding based. `GET /api/referrals` exposes the user’s code and link; grants happen when an invitee completes first signup/onboarding with a referral.

## Auth and session

### `GET /auth/kakao`

Start Kakao OAuth. Optional `?ref=` stores a referral cookie for first-time signup.

### `GET /auth/kakao/callback`

OAuth callback. Creates or resumes the session.

### `POST /api/auth/logout`

End the user session.

### `POST /api/auth/web3auth-token`

Issue a short-lived JWT the client uses with Web3Auth (embedded wallet).

### `GET /api/me`

Return the current user, mapped wallet, and ticket balance.

### `POST /api/me/profile`

Update profile fields allowed after signup (for example nickname rules).

### `GET` / `POST /api/me/wallet`

Read or attach the mapped wallet address for the current user.

### `GET` / `POST /api/onboarding`

First-run nickname / wallet / referral completion after Kakao login.

## Missions and tickets

### `GET /api/missions`

List v0 missions and completion status for the current user.

Missions in v0:

- `kaffle-guide` — one-time product guide claim (`POST /api/missions/guide`)
- `attendance` — once per Seoul calendar day (`POST /api/missions/attendance`)
- `referral` — friend invite (status / counts; grants on successful invitee signup)
- `on-chain` — faucet claim mission (credited after faucet success)

### `POST /api/missions/attendance`

Check in and grant attendance tickets.

### `POST /api/missions/guide`

Claim the one-time Kaffle guide tickets.

### `POST /api/faucet`

Claim testnet tokens to the mapped wallet (on-chain mission path).

### `GET` / `POST /api/referrals`

- `GET` — referral code, invite link, invite count / cap
- `POST` — apply a referral code after login if it was not bound on first create

## Wallet helpers

### `GET /api/wallet`

Wallet balances / view data for the profile wallet UI.

### `POST /api/wallet/transfer`

Transfer from the mapped wallet (user-initiated flow).

## Raffle

### `GET /api/raffle`

Current round status, ticket balance, user entry tickets, participants, and related UI fields.

### `POST /api/raffle/enter`

Spend tickets to enter the current round (platform signature + relayer). The same user may enter more than once.

### `POST /api/raffle/request-winner`

After the window ends, request Chainlink VRF settlement when the round has entries.

### `POST /api/raffle/claim`

Winner (or relayer on their behalf) claims the prize from the vault.

## Admin

Admin routes use a separate admin session (`/admin/login`).

- `POST /api/admin/login` / `POST /api/admin/logout`
- `POST /api/admin/raffle` — create a round (`durationSeconds`, `prizeAmount`)
- `POST /api/admin/vault` — vault funding / admin vault actions

There is no `/internal/raffles/close` job. Entry closes on-chain at `endTime`; the admin creates the next round when the current one is finished.
