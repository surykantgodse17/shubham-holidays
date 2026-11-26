# Shubham Holidays

Brand-first travel booking: flights, hotels, curated packages/experiences, and **Pay with Pi**. One real IndiGo flight (DEL→GOI). Pi amounts use the demo rate **1 Pi = $314159**. Outside Pi Browser (or without a payment bridge), checkout completes a labeled **Pi sandbox demo**. No Pi API secrets ship in the client.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Key routes (HashRouter)

| Route | Purpose |
| --- | --- |
| `/#/` | Landing + search |
| `/#/flights` | Flight search |
| `/#/flights/results` | Flight results |
| `/#/flights/book` | Passenger details |
| `/#/hotels` | Hotel search |
| `/#/hotels/results` | Hotel results |
| `/#/hotels/book` | Guest details |
| `/#/explore` | Packages & experiences |
| `/#/explore/:id` | Listing detail |
| `/#/checkout` | Pay with Pi |
| `/#/confirmation` | Booking confirmed |
| `/#/bookings` | Saved demo bookings |

## Pi payment

- Loads the official Pi SDK (`sdk.minepi.com`).
- Sandbox mode by default (`VITE_PI_SANDBOX`, defaults to true).
- Optional `VITE_PI_BRIDGE_URL` for server approve/complete (API key stays on that bridge — never in this app).
- Without Pi Browser or bridge: **sandbox demo** completes the booking in-browser.

## Brand

Logo asset: `public/logo.jpg` (used in nav, landing hero, checkout, confirmation, footer).
