# Shubham Holidays

Brand-first travel booking with **Pay with Pi**. Flight and hotel search uses the **Amadeus** self-service API when secrets are configured; otherwise sample data is shown and labeled.

Demo Pi rate (exact UI copy): **1 Pi = $314159**.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

Optional live search — set server env (never commit values):

- `AMADEUS_CLIENT_ID` — Amadeus self-service API key
- `AMADEUS_CLIENT_SECRET` — Amadeus self-service API secret
- `AMADEUS_HOST` — optional, default `https://test.api.amadeus.com`

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Express + Vite (API + app on :5173) |
| `npm run build` | Production client build |
| `npm start` | Serve `dist` + `/api/*` |

## Key routes (HashRouter)

`/#/`, `/#/flights`, `/#/flights/results`, `/#/hotels`, `/#/hotels/results`, `/#/explore`, `/#/checkout`, `/#/confirmation`, `/#/bookings`
