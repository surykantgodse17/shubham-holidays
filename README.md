# Shubham Holidays

Flight and hotel booking for Pi Network. Fares are set in US dollars and charged in Pi at **1 Pi = $314,159**.

Cancelling a confirmed Pi payment keeps a 10% charge and refunds the remaining Pi to the same traveler.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`. The Pi redirect URI for local sign-in is `http://localhost:3000`.

Copy `.env.example` to `.env` and set:

- `PI_CLIENT_ID` — public OAuth client id from Pi Developers
- `PI_REDIRECT_URI` — must match the registered redirect URI exactly
- `PI_SANDBOX` — `true` for Testnet, `false` for Mainnet
- `PI_NETWORK_API_KEY` — server API key from Pi Developers → Settings. `PI_API_KEY` is still accepted. Keep it only on the server.
- `PI_WALLET_SEED` — app wallet private seed from wallet setup. Required for refunds. Keep it only on the server.

Pay with Pi from Pi Browser. The server approves and completes the payment before a PNR is issued. Sign in again after this update so Pi can grant the `wallet_address` scope used for refunds.

## Deploy

Set the same environment variables on the host and point `PI_REDIRECT_URI` at the public `https://` origin registered for the app. `npm start` listens on `PORT` (default 3000). A `Dockerfile` and `Procfile` are included.

Do not commit `.env` or `data/store.json`.
