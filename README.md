# Area51

An Indian-markets-focused stock investing app: live NSE/BSE quotes, a personal watchlist and portfolio, AI-generated equity research, and a dividend calendar — built with Next.js and Supabase.

## Features

- **Auth** — real email/password accounts via Supabase Auth
- **Watchlist & Portfolio** — stored in Postgres, row-level-security scoped so each user only sees their own data
- **Live quotes** — Upstox (NSE-native) as the primary provider, Finnhub as fallback, mock data as a last resort; a Live/Mock badge always shows which one served a given price
- **Equity research** — AI-generated rating, target price, bull/base/bear scenarios per stock
- **Dividend calendar** — projected income and upcoming ex-dividend dates for your actual holdings
- **Light/dark theme**

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env template and fill in your own credentials:

   ```bash
   cp .env.example .env.local
   ```

   You'll need:
   - A [Supabase](https://supabase.com) project (URL + publishable key from Project Settings → API)
   - A [Finnhub](https://finnhub.io) API key (free tier; US tickers only — NSE/BSE will show mock data unless Upstox is also configured)
   - A [Upstox developer app](https://upstox.com/developer) (client ID/secret) for live NSE quotes — optional, the app works with mock data if you skip this

3. Apply the database schema (see `src/lib/supabase/database.types.ts` for the expected shape) — create `watchlist` and `portfolio_holdings` tables with RLS policies scoped to `auth.uid() = user_id`.

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Notes

- Upstox access tokens expire daily at 3:30am IST — reconnect from Settings when needed.
- `.env.local` and the local Upstox token cache (`.data/`) are gitignored; never commit real secrets.
