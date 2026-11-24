# API

Backend surface as implemented under `app/api` and `app/auth`. Session cookies authenticate users unless noted.

Friend invite is mostly cookie + onboarding based. `GET /api/referrals` exposes the user’s code and link; grants happen when an invitee completes first signup/onboarding with a referral.

## Auth and session

### `GET /auth/kakao`

Start Kakao OAuth. Optional `?ref=` stores a referral cookie for first-time signup.

### `GET /auth/kakao/callback`

OAuth callback. Creates or resumes the session.

### `POST /api/auth/logout`

End the user session.

### `GET /api/auth/web3auth-token`

Issue a short-lived JWT the client uses with Web3Auth (embedded wallet).

### `GET /api/me`

Return the current user, mapped wallet, and ticket balance.

### `POST /api/me/profile`

Update profile fields allowed after signup (for example nickname rules).

### `POST /api/me/wallet`

Attach the mapped wallet for the current user. Send `address`, `identityToken`
(the Web3Auth-issued identity JWT), and `accessToken` from the current Web3Auth
session. `accessToken` is needed when the identity JWT omits the original user ID.
Read the stored mapping through `GET /api/me`.

Both this route and onboarding verify the provider token before writing a wallet:
ES256 signature against the pinned Web3Auth v11 Citadel JWKS, issuer, project
audience, expiration/issued-at time, and the configured custom auth connection.
The submitted address must derive from a signed `web3auth_app_key` secp256k1
public key, and the authenticated provider identity must match the Kakao session.
External-wallet and threshold-key claims are rejected. The application-issued
JWT from `/api/auth/web3auth-token` is a login credential, not registration proof.

When a v11 token omits `userId`, the server uses the provider access token to
query the same `/v1/user` endpoint as the installed SDK. It checks the original
identifier, connection, network, and primary social EVM address. An unrelated
access token or linked external address cannot satisfy that check. Invalid proof
returns 401; unavailable configuration/provider verification returns 503. Neither
case creates a wallet or updates onboarding fields. Existing mappings cannot be
overwritten.

### `GET` / `POST /api/onboarding`

First-run nickname / wallet / referral completion after Kakao login.
`POST` requires `nickname`, `walletAddress`, `identityToken`, and the provider
`accessToken` described above. The onboarding client obtains proof via
`connectMappedWalletProof()` and sends it automatically; users do not choose or
paste a wallet address.

## Missions and tickets

### `GET /api/missions`

List missions and completion status for the current user. Testnet-only missions (on-chain faucet, ticket faucet) are omitted on Base mainnet.

Missions:

- `kaffle-guide` — one-time product guide claim (`POST /api/missions/guide`)
- `attendance` — once per Seoul calendar day (`POST /api/missions/attendance`)
- `referral` — friend invite (status / counts; grants on successful invitee signup)
- `payout-address` — one-time after registering a payout wallet (`POST /api/missions/payout-address`)
- `first-enter` — one-time after first successful raffle enter (`POST /api/missions/first-enter`)
- `on-chain` — faucet claim mission (testnet only; credited after faucet success)
- `ticket-faucet` — Base Sepolia-only ticket drip (`POST /api/missions/ticket-faucet`)

### `POST /api/missions/attendance`

Check in and grant attendance tickets.

### `POST /api/missions/guide`

Claim the one-time Kaffle guide tickets.

### `POST /api/faucet`

Claim testnet tokens to the mapped wallet (on-chain mission path). Available only when the active chain is a testnet and a faucet address is configured; omitted on Base mainnet.

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

Reserve tickets to enter the current round (platform signature + relayer). Send
`{ "ticketCount": 1, "requestId": "<UUID>" }`. Generate one request ID per
intended entry and reuse it for every retry of that entry. Reusing the ID with a
different ticket count is rejected. Only one operation per user and chain may
be preparing or pending; a concurrent new request returns the existing operation.

The response contains `operationId`, `requestId`, `state` (`pending`, `confirmed`,
or `failed`), `hash`, `raffleAddress`, `ticketCount`, and `error`. Pending returns
HTTP 202; terminal outcomes return 200. A failed outcome means its refund has
committed. A timeout or HTTP 503 is an unknown outcome: keep the same request ID.
Reload `/api/raffle` separately after a terminal result; view-refresh failures
cannot change the ticket deduction. The same user may deliberately enter again
with a new request ID after the previous operation is terminal.

### `GET /api/raffle/enter`

Recover/check the signed-in user's operation using `?requestId=<UUID>` or
`?operationId=<id>`. Without either parameter, return their active operation on
the configured chain, or `{ "operation": null }`. An explicit missing/foreign
operation returns 404. The endpoint also attempts reconciliation without
creating a new entry or deducting more tickets. Signed transaction bytes and
worker lease tokens are never returned.

### `GET /api/cron/raffle-entries`

Background recovery, authenticated by `Authorization: Bearer <CRON_SECRET>`.
Processes up to five active operations per invocation, rotating unresolved work.
`vercel.json` schedules this every minute on Vercel. Configure `CRON_SECRET` in
the deployment environment and enable the deployment's cron service. Other hosts
must schedule the same authenticated HTTP call. Browser polling supplements
this job; recovery after a restart does not depend on an open browser.

### `POST /api/raffle/request-winner`

After the window ends, request Chainlink VRF settlement when the round has entries.

### `POST /api/raffle/claim`

Winner (or relayer on their behalf) claims the prize from the vault.

## Admin

Admin routes reuse the Kakao user session. `ADMIN_KAKAO_IDS` must include that user’s Kakao ID.

- `GET` / `POST /api/admin/vault` — read vault status; fund vault from the owner wallet
- `GET /api/admin/ops-wallets` — owner / relayer ETH (and owner prize-token) balances
- `POST /api/admin/raffle` — create a round (`durationSeconds`, `prizeAmount`)

There is no `/internal/raffles/close` job. Entry closes on-chain at `endTime`; the admin creates the next round when the current one is finished.
