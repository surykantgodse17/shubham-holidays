# Vercel Production (Pi Mainnet) — separate from Grok Testnet

| Target | URL | Pi network | API key |
| --- | --- | --- | --- |
| **Grok (unchanged)** | https://shubham-holidays.apps.grok.bot | Leave as currently published | Cursor secret `PI_NETWORK_API_KEY` |
| **Vercel Production** | https://shubham-holidays.vercel.app | Mainnet (`Pi.init({ sandbox: false })`) | Vercel env `PI_NETWORK_API_KEY` (Mainnet key only) |

Do **not** reuse the Testnet key on Vercel. Keys stay on the host — never in source.

## Required Vercel environment variables

| Name | Scope | Notes |
| --- | --- | --- |
| `PI_NETWORK_API_KEY` | Production | Mainnet API key from Pi Developers → Production app |
| `DATABASE_URL` | Production | Postgres connection string (bookings, order jti, rate limits) |
| `VITE_PI_SANDBOX` | Production build | Must be `false` (set in `vercel.json` build.env) |

## Deploy

```bash
npx vercel login
npx vercel link --project shubham-holidays
npx vercel env add PI_NETWORK_API_KEY production
npx vercel env add DATABASE_URL production
npx vercel --prod
```

After deploy, register `https://shubham-holidays.vercel.app` in Pi Developers (Production) and verify `/validation-key.txt`.
