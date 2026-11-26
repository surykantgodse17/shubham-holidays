# Shubham Holidays

Brand-first travel booking with **Pay with Pi**.

Flight and hotel search uses **sample data** on public `/api/flights` and `/api/hotels` routes (rate-limited). Live Amadeus proxying is disabled so anonymous visitors cannot spend operator API credentials.

Demo Pi rate (exact UI copy): **1 Pi = $314159**.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Express + Vite on :5173 |
| `npm run build` | Production client build |
| `npm start` | Serve `dist` + `/api/*` |

## Key routes (HashRouter)

`/#/`, `/#/flights`, `/#/flights/results`, `/#/hotels`, `/#/hotels/results`, `/#/explore`, `/#/checkout`, `/#/confirmation`, `/#/bookings`
