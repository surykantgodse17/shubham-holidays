# Shubham Holidays

Brand-first travel booking with **Pay with Pi** (Production / Mainnet).

Flight and hotel search uses **sample data** on public `/api/flights` and `/api/hotels` (rate-limited), with a client-side sample fallback if the host has no API. Live Amadeus proxying is disabled.

Demo Pi rate (exact UI copy): **1 Pi = $314159**.

Pi Developer setup, console clicks, Sandbox vs Pi Browser testing: see the integration guide in the agent store (`docs/pi-network-integration.md`).

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173` (Hash routes: `/#/flights`, `/#/checkout`).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Express + Vite on :5173 |
| `npm run build` | Production client build |
| `npm start` | Serve `dist` + `/api/*` |

## Key routes (HashRouter)

`/#/`, `/#/flights`, `/#/flights/results`, `/#/hotels`, `/#/hotels/results`, `/#/explore`, `/#/checkout`, `/#/confirmation`, `/#/bookings`
