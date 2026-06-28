# Area51 — Technical Documentation

> For setup/quick-start instructions, see [`README.md`](../README.md). For Next.js 16 breaking-change notes, see [`AGENTS.md`](../AGENTS.md).

## 1. Overview

Area51 is a web app for tracking and researching Indian equities (NSE/BSE). Users maintain watchlists and multi-portfolio holdings, view live quotes and historical charts, track dividends, and generate AI-written equity research reports. The app is built on Next.js (App Router) with Supabase as the backend (Postgres + Auth), Upstox as the primary live-market-data provider, Finnhub as a fallback, and Anthropic's Claude API for research generation.

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.9 |
| UI library | React | 19.2.4 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| Database | Supabase (PostgreSQL) | via `@supabase/supabase-js` ^2.108.2 |
| Auth | Supabase Auth (+ `@supabase/ssr` ^0.12.0) | |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) | ^0.105.0, model `claude-sonnet-4-6` |
| Charts | `recharts` | ^3.8.1 |
| PDF generation | `@react-pdf/renderer` | ^4.5.1 |
| Dates | `date-fns` | ^4.4.0 |
| Icons | `lucide-react` | ^1.21.0 |
| CAPTCHA | Cloudflare Turnstile (`@marsidev/react-turnstile`) | ^1.5.3 |
| Class merging | `clsx` | ^2.1.1 |
| Linting | ESLint (`eslint-config-next`) | ^9 / 16.2.9 |
| Hosting | Vercel (frontend + serverless API routes) | |
| Live market data | Upstox API (primary, NSE), Finnhub API (fallback, US tickers) | |

**npm scripts** (`package.json`): `dev`, `build`, `start`, `lint`.

---

## 3. Architecture

```
src/
├── app/
│   ├── api/                 # Route handlers (serverless functions)
│   ├── dashboard/            # Authenticated pages (layout + auth guard)
│   ├── login/ signup/ forgot-password/ reset-password/ privacy/
│   └── layout.tsx, page.tsx  # Root layout + landing page
├── components/                # Shared React components (+ components/landing/)
└── lib/
    ├── providers/             # upstox.ts, finnhub.ts, instruments.ts
    ├── supabase/               # client.ts, server.ts, admin.ts, database.types.ts
    ├── use*.ts                 # Custom hooks (data + UI state)
    ├── types.ts                # Domain TypeScript interfaces
    └── analytics.ts, csv.ts, format.ts, peHistory.ts, sectorMap.ts,
        upstoxToken.ts, mock-data.ts, theme.tsx, auth.tsx, resolveStock.ts, liveStock.ts
```

**Typical data flow:** Client component/hook → `fetch` to a route under `src/app/api/**` → route handler calls a Supabase client (`server.ts`/`admin.ts`) and/or a provider in `src/lib/providers/` → Postgres (RLS-scoped) or external API → JSON response back to the hook → rendered via `recharts`/UI components.

---

## 4. Database Schema (Supabase PostgreSQL)

Source of truth: `src/lib/supabase/database.types.ts` (generated types).

### `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | `string` (PK) | matches `auth.users.id` |
| `tier` | `string` | `'free' \| 'premium'`, default applied |
| `role` | `string` | `'user' \| 'administrator'`, default applied |
| `status` | `string` | `'active' \| 'suspended'`, default applied |
| `created_at` | `string` | default applied |

### `watchlists`
| Column | Type | Notes |
|---|---|---|
| `id` | `string` (PK) | |
| `user_id` | `string` | RLS-scoped |
| `name` | `string` | default applied |
| `created_at` | `string` | default applied |

### `watchlist` (entries within a watchlist)
| Column | Type | Notes |
|---|---|---|
| `id` | `string` (PK) | |
| `watchlist_id` | `string` | FK → `watchlists.id` |
| `user_id` | `string` | RLS-scoped |
| `symbol` | `string` | e.g. `"INFY"` |
| `created_at` | `string` | default applied |

### `portfolios`
| Column | Type | Notes |
|---|---|---|
| `id` | `string` (PK) | |
| `user_id` | `string` | RLS-scoped |
| `name` | `string` | default applied (e.g. "Main Portfolio") |
| `created_at` | `string` | default applied |

### `portfolio_holdings`
| Column | Type | Notes |
|---|---|---|
| `id` | `string` (PK) | |
| `portfolio_id` | `string` | FK → `portfolios.id` |
| `user_id` | `string` | RLS-scoped |
| `symbol` | `string` | |
| `quantity` | `number` | |
| `avg_price` | `number` | ₹ cost basis |
| `buy_date` | `string` | default applied |
| `created_at` | `string` | default applied |

### `transactions`
| Column | Type | Notes |
|---|---|---|
| `id` | `string` (PK) | |
| `portfolio_id` | `string` | FK → `portfolios.id` |
| `user_id` | `string` | RLS-scoped |
| `symbol` | `string` | |
| `side` | `string` | `'buy' \| 'sell'` |
| `quantity` | `number` | |
| `price` | `number` | ₹ per share at transaction time |
| `txn_date` | `string` | default applied |
| `realized_pnl` | `number \| null` | populated on sell |
| `created_at` | `string` | default applied |

### `research_reports`
| Column | Type | Notes |
|---|---|---|
| `symbol` | `string` (PK) | |
| `report` | `Json` | serialized `ResearchReport` object |
| `generated_at` | `string` | default applied |
| `generated_by` | `string \| null` | user id who triggered generation |

### `dividend_cache`
| Column | Type | Notes |
|---|---|---|
| `symbol` | `string` (PK) | |
| `events` | `Json` | serialized `DividendEvent[]` |
| `fetched_at` | `string` | default applied; cache TTL enforced in app logic (24h) |

### `market_data_cache`
| Column | Type | Notes |
|---|---|---|
| `cache_key` | `string` (PK) | namespaced key, e.g. `quote:INFY`, `full_quote:INFY`, `fundamentals:INFY`, `candles:NSE_INDEX\|Nifty 50:1Y` |
| `payload` | `Json` | serialized last-known-good Upstox response (`LiveQuote`, `FullQuote`, `CompanyFundamentals`, or `CandlePoint[]`) |
| `fetched_at` | `string` | default applied; timestamp of the successful Upstox call that produced `payload` |

Write-through cache populated by every successful call in `src/lib/providers/upstox.ts`. Read back via `getStaleUpstox*` helpers (`src/lib/staleCache.ts`) when the live Upstox call fails — e.g. an expired OAuth token — so routes can serve the last real snapshot instead of falling straight to mock data. See §5 (`/api/quotes`, `/api/stocks/[symbol]/quote`, `/api/stocks/[symbol]/fundamentals`, `/api/market-snapshot`) for the stale-fallback response shape.

### `stock_price_history`
| Column | Type | Notes |
|---|---|---|
| `symbol` | `string` (PK, composite with `trade_date`) | |
| `trade_date` | `string` (PK, composite with `symbol`) | |
| `open` / `high` / `low` / `close` | `number` | daily OHLC |
| `volume` | `number` | default applied |
| `fetched_at` | `string` | default applied |

"Golden copy" of daily OHLCV per symbol, lazily backfilled by `ensureGoldenHistory` (`src/lib/priceHistory.ts`) the first time a symbol's history is searched/resolved, and re-fetched from Upstox only once the stored data goes stale. `resolveStock` and `/api/stocks/[symbol]/history` read through this table instead of hitting Upstox live every time; Analytics' Risk tab sources real per-holding volatility from it (via `useHistoryMap`, client-cached for 1h) instead of synthetic data.

### `notifications`
| Column | Type | Notes |
|---|---|---|
| `id` | `string` (PK) | |
| `user_id` | `string` | RLS-scoped |
| `title` | `string` | |
| `body` | `string \| null` | |
| `category` | `string` | notification type |
| `created_at` | `string` | default applied |
| `read_at` | `string \| null` | |

### `upstox_tokens`
| Column | Type | Notes |
|---|---|---|
| `user_id` | `string` (PK) | RLS-scoped |
| `access_token` | `string` | |
| `obtained_at` | `string` | |
| `expires_at` | `string` | Upstox tokens expire daily at 3:30am IST |

### `app_settings`
| Column | Type | Notes |
|---|---|---|
| `id` | `boolean` (PK) | singleton row |
| `default_signup_tier` | `string` | `'free' \| 'premium'`, default applied |

### Foreign keys
- `portfolio_holdings.portfolio_id` → `portfolios.id`
- `transactions.portfolio_id` → `portfolios.id`
- `watchlist.watchlist_id` → `watchlists.id`

### Postgres functions
| Function | Args | Returns | Purpose |
|---|---|---|---|
| `is_admin` | `uid: string` | `boolean` | checks if a user has the `administrator` role |
| `get_user_limits` | `p_user_id: string` | `Record<string, unknown>` | retrieves tier-based limits (e.g. max portfolios) |

### Row-Level Security
All user-scoped tables (`watchlists`, `watchlist`, `portfolios`, `portfolio_holdings`, `transactions`, `notifications`, `upstox_tokens`) enforce:
```sql
auth.uid() = user_id
```
on both `USING` and `WITH CHECK` clauses. `research_reports`, `dividend_cache`, `market_data_cache`, `stock_price_history`, and `app_settings` are shared/cached data, not user-scoped — readable/writable by any authenticated user. Note: `research_reports.generated_by` is tracked but the table itself isn't RLS-scoped by user; visibility filtering for "your reports" is done client-side in `useResearch()` (see §8).

---

## 5. API Reference

All routes live under `src/app/api/`. Responses generally follow `{ ok: boolean, ...data }` or `{ ok: false, error: string }`.

### Quotes & Market Data

| Route | Method | Params | Response |
|---|---|---|---|
| `/api/quotes` | GET | `symbols=INFY,TCS,HDFCBANK` | `{ ok, quotes: {symbol: LiveQuote}, sources: {symbol: QuoteSource}, staleAt: {symbol: string} }` |
| `/api/stocks/[symbol]/quote` | GET | path: `symbol` | `{ ok, quote: FullQuote \| null, stale: boolean, staleAt?: string }` |
| `/api/stocks/[symbol]/history` | GET | `range=1D\|1W\|1M\|1Y\|5Y` (default `1Y`) | `{ ok, candles: CandlePoint[] }` |
| `/api/stocks/[symbol]/fundamentals` | GET | path: `symbol` | `{ ok, fundamentals: CompanyFundamentals \| null, stale: boolean, staleAt?: string }` |
| `/api/stocks/[symbol]/pe-history` | GET | path: `symbol` | `{ ok, peHistory: PeHistoryData }` |
| `/api/market-snapshot` | GET | `range=1D\|1W\|1M\|1Y\|5Y` (default `1M`) | `{ ok, mock: boolean, stale: boolean, staleAt?: string, points: {date, value}[] }` (Nifty 50) |

`QuoteSource` is `"upstox" | "finnhub" | "upstox-stale" | "mock"`. Fallback order: live Upstox (NSE-native) → live Finnhub (US tickers only on free tier, `/api/quotes` only) → last-known-good Upstox snapshot from `market_data_cache` (e.g. when the OAuth token has expired) → mock data. `staleAt` carries the timestamp of the cached snapshot so the UI can show "Stale · Upstox" badges instead of silently serving old data as if it were live (see `LiveBadge` in `src/components/ui.tsx`).

### Equity Research (AI-generated)

| Route | Method | Body / Params | Response |
|---|---|---|---|
| `/api/research` | GET | `symbol=INFY` | `{ ok, report: ResearchReport \| null, generatedAt, stale: boolean }` |
| `/api/research` | POST | `{ symbol: string, force?: boolean }`, requires auth | `{ ok, report: ResearchReport, generatedAt, stale: false }` |

Implementation (`src/app/api/research/route.ts`):
- `GET` reads the cached row from `research_reports` (by `symbol`, single row per symbol) and flags `stale` if `generated_at` is older than 30 days.
- `POST` requires a logged-in user (`supabase.auth.getUser()`); unless `force` is true, it returns the cache if not stale. Otherwise it resolves the stock via `resolveStock()`, calls Claude (`model: "claude-sonnet-4-6"`) with a forced tool call (`submit_research_report`) constrained by a JSON schema, builds the final `ResearchReport`, and `upsert`s it into `research_reports` (recording `generated_by`).

`ResearchReport` schema:
```ts
interface ResearchReport {
  symbol: string;
  generatedOn: string;          // YYYY-MM-DD
  currentPrice: number;         // ₹
  rating: "BUY" | "HOLD" | "REDUCE" | "SELL";
  targetPrice: number;          // 12-month
  upsidePct: number;
  summary: string;
  scenarios: { name: "Bull" | "Base" | "Bear"; target: number; returnPct: number; desc: string }[]; // exactly 3
  kpis: { label: string; value: string; note?: string }[];
  catalysts: string[];
  risks: string[];
  dcf: { label: string; value: string }[];
}
```

### Dividends

| Route | Method | Params | Response |
|---|---|---|---|
| `/api/dividends` | GET | `symbols=INFY,TCS` | `{ ok, events: DividendEvent[] }` |

```ts
interface DividendEvent {
  symbol: string;
  exDate: string;          // ISO date
  paymentDate: string;     // currently same as exDate
  amountPerShare: number;  // ₹
  type: "Interim" | "Final" | "Special";
}
```
Backed by `dividend_cache` with a 24-hour TTL (corporate actions rarely change post-filing).

### Symbol Search & Lookup

| Route | Method | Params | Response |
|---|---|---|---|
| `/api/symbols/search` | GET | `q=` (≤40 chars) | `{ ok, results: Instrument[] }` |
| `/api/symbols/lookup` | GET | `symbol=` | `{ ok, instrument: Instrument \| null }` |

### Upstox OAuth Integration

| Route | Method | Purpose |
|---|---|---|
| `/api/upstox/login` | GET | Initiates OAuth flow (needs `UPSTOX_CLIENT_ID`, `UPSTOX_REDIRECT_URI`) |
| `/api/upstox/callback` | GET | OAuth callback — validates state, exchanges code for token, stores in `upstox_tokens` |
| `/api/upstox/status` | GET | Returns `{ upstoxConfigured, upstoxConnected, expiresAt, finnhubConfigured }` |
| `/api/upstox/disconnect` | POST | Clears the user's row from `upstox_tokens` |

Tokens expire daily at 3:30am IST — see [`upstoxToken.ts`](../src/lib/upstoxToken.ts) for lifecycle helpers.

### Admin Console

| Route | Method | Body/Params | Auth | Response |
|---|---|---|---|---|
| `/api/admin/users` | GET | — | admin only | `{ ok, users: [{id, email, full_name, created_at, last_sign_in_at, role, tier, status}] }` |
| `/api/admin/users` | POST | `{ email, full_name?, role, tier }` | admin only | `{ ok }` (invites a new user) |
| `/api/admin/users/[id]` | PATCH | `{ role?, tier?, status?, full_name?, notification_prefs? }` | admin only | `{ ok }` |

Admin routes are gated by a `requireAdmin()` middleware that checks the `is_admin(uid)` Postgres function, and use the service-role Supabase client (`src/lib/supabase/admin.ts`) server-side only.

---

## 6. Authentication & Authorization

- **Provider:** Supabase Auth (email/password), with Cloudflare Turnstile CAPTCHA on login/signup/password-reset forms.
- **Flow:** sign up/in at `/signup` or `/login` → Supabase creates an `auth.users` row and (via DB trigger) a corresponding `profiles` row → session persisted via `@supabase/ssr` cookies → `useRequireAuth()`/`AuthProvider` gate the `/dashboard/**` routes client-side; server-side, route handlers call `createClient()` and check `supabase.auth.getUser()`.
- **Tiers:** `free` (single portfolio, base features) vs `premium` (multiple portfolios, advanced analytics) — enforced via `useProfile()`/`isPremium` and the `get_user_limits()` Postgres function; gated client-side by the `PremiumGate` component.
- **Roles:** `user` vs `administrator` — admin-only UI (`/dashboard/admin`) and API routes (`/api/admin/**`) check `isAdmin`/`requireAdmin()`, backed by `is_admin(uid)`.
- **Authorization enforcement:** Postgres RLS policies (`auth.uid() = user_id`) are the actual security boundary for all user-owned tables — UI/route-level checks are for UX, not the sole guard.
- **Key files:** `src/lib/auth.tsx` (AuthProvider/AuthContext), `src/lib/supabase/client.ts` (browser client), `src/lib/supabase/server.ts` (server/SSR client), `src/lib/supabase/admin.ts` (service-role client, server-only).

---

## 7. Frontend Routes

### Public

| Route | File |
|---|---|
| `/` | `src/app/page.tsx` (landing) |
| `/login` | `src/app/login/page.tsx` |
| `/signup` | `src/app/signup/page.tsx` |
| `/forgot-password` | `src/app/forgot-password/page.tsx` |
| `/reset-password` | `src/app/reset-password/page.tsx` |
| `/privacy` | `src/app/privacy/page.tsx` |

### Authenticated (`src/app/dashboard/layout.tsx` provides sidebar/topbar + auth guard)

| Route | File | Purpose |
|---|---|---|
| `/dashboard` | `dashboard/page.tsx` | Overview: market snapshot, net worth, asset allocation |
| `/dashboard/watchlist` | `watchlist/page.tsx` | Watchlist management (multi-list), sortable columns |
| `/dashboard/portfolio` | `portfolio/page.tsx` | Multi-portfolio (premium), sortable holdings table, allocation chart (sub-5% holdings grouped into "Others"), P&L, multi-row add holding, CSV bulk import |
| `/dashboard/transactions` | `transactions/page.tsx` | Buy/sell history with realized P&L, sortable columns, collapsible month cards (current month expanded by default) |
| `/dashboard/dividends` | `dividends/page.tsx` | Upcoming dividends, projected annual income |
| `/dashboard/stocks/[symbol]` | `stocks/[symbol]/page.tsx` | Quote, chart, fundamentals, depth |
| `/dashboard/research` | `research/page.tsx` | List of generated research reports |
| `/dashboard/research/[symbol]` | `research/[symbol]/page.tsx` | View/download a research report (PDF) |
| `/dashboard/analytics` | `analytics/page.tsx` | Portfolio performance analytics |
| `/dashboard/settings` | `settings/page.tsx` | Account settings, Upstox connection |
| `/dashboard/admin` | `admin/page.tsx` | User management console (admin only) |
| `/dashboard/support` | `support/page.tsx` | Help & support |

---

## 8. State Management & Hooks

No global state library — React Context (`AuthContext`) plus domain-specific custom hooks in `src/lib/use*.ts`, each wrapping `fetch` calls to the API routes above.

| Hook | Purpose |
|---|---|
| `useAuth()` | login/signup/logout/password reset, current user |
| `useProfile()` | tier, role, status, `isPremium`, `isAdmin` |
| `useWatchlist()` | CRUD on watchlists/entries; active list persisted in `localStorage` (`area51_active_watchlist`) |
| `usePortfolio()` | multi-portfolio CRUD, position aggregation (qty/avg cost per symbol), single and bulk add (`bulkAddHoldings`), buy/sell |
| `useQuotes()` | batch live-quote fetch |
| `useTransactions()` | transaction history |
| `useDividends()` | dividend events for held symbols |
| `useHistoryMap()` | per-symbol daily price history from `stock_price_history` (via golden-history API), module-level 1h client cache |
| `useResearch()` | fetch cached or trigger generation of a research report; `useAllGeneratedReports` scopes results to `generated_by` = current user |
| `useNotifications()` | notification list + mark-read |

---

## 9. Data Provider Integrations

`src/lib/providers/`

| File | Functions | Notes |
|---|---|---|
| `upstox.ts` | `getUpstoxQuotes`, `getUpstoxFullQuote`, `getUpstoxHistoricalCandles`, `getUpstoxFundamentals`, `getPeHistory`, `getStaleUpstoxQuotes`, `getStaleUpstoxFullQuote`, `getStaleUpstoxCandles`, `getStaleUpstoxFundamentals` | Primary NSE provider; requires an active OAuth token (per-user, expires daily 3:30am IST); live calls, but every successful response is write-through cached into `market_data_cache` (see `src/lib/staleCache.ts`) so the `getStaleUpstox*` helpers can serve the last good snapshot if the live call fails |
| `finnhub.ts` | `getFinnhubQuotes` | Fallback; free tier covers US tickers only |
| `instruments.ts` | `searchInstruments`, `lookupInstrument`, `getInstrumentKey`, `getInstrumentKeys`, `getIsin`, `lookupByInstrumentKey` | Symbol search/lookup against the Upstox instrument master |

---

## 10. Key Type Definitions

Source: `src/lib/types.ts`.

```ts
type Exchange = "NSE" | "BSE";
type QuoteSource = "upstox" | "finnhub" | "upstox-stale" | "mock";

interface LiveQuote { price; change; changePercent; high; low; prevClose }
interface FullQuote { price; prevClose; high; low; open; volume; averagePrice; netChange;
  totalBuyQuantity; totalSellQuantity; upperCircuitLimit; lowerCircuitLimit;
  depth: { buy: DepthLevel[]; sell: DepthLevel[] }; timestamp }
interface CandlePoint { date; timestamp; open; high; low; close; volume }

interface Stock { symbol; name; exchange: Exchange; sector; price; prevClose; dayHigh; dayLow;
  week52High; week52Low; marketCapCr; peRatio: number | null; history: { date; price }[] }

interface CompanyProfile { description; sector; sectorMarketCapInrCr }
interface KeyRatio { name; companyValue; sectorValue; history?: { period; value }[] }
interface ShareholdingSlice { category; percent; period }
interface CorporateAction { name; exDate: string | null; amount: number | null; details }
interface Competitor { symbol: string | null; name; sector; marketCapInrCr }
interface CompanyFundamentals { profile: CompanyProfile | null; keyRatios: KeyRatio[];
  shareholding: ShareholdingSlice[]; corporateActions: CorporateAction[]; competitors: Competitor[] }

interface Holding { id; symbol; quantity; avgPrice; buyDate }

interface DividendEvent { symbol; exDate; paymentDate; amountPerShare; type: "Interim" | "Final" | "Special" }

type Rating = "BUY" | "HOLD" | "REDUCE" | "SELL";
interface ScenarioTarget { name: "Bull" | "Base" | "Bear"; target; returnPct; desc }
interface ResearchReport { symbol; generatedOn; rating: Rating; targetPrice; currentPrice; upsidePct;
  summary; scenarios: ScenarioTarget[]; kpis: { label; value; note? }[]; catalysts: string[];
  risks: string[]; dcf: { label; value }[] }
```

---

## 11. Configuration & Environment Variables

From `.env.example` (copy to `.env.local`, gitignored):

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Claude API key — powers AI-generated equity research |
| `FINNHUB_API_KEY` | Fallback live-quote provider; free tier covers US tickers only |
| `UPSTOX_CLIENT_ID` | Upstox developer app client ID — primary NSE quote provider |
| `UPSTOX_CLIENT_SECRET` | Upstox OAuth client secret |
| `UPSTOX_REDIRECT_URI` | Must exactly match the redirect URI registered in the Upstox app console (default: `http://localhost:3000/api/upstox/callback`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only, bypasses RLS — used by the Admin Console; never expose to the browser or commit |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile public site key for auth-form CAPTCHA; the secret key lives in Supabase Auth settings, not in env |

---

## 12. Infrastructure & Deployment

- **Frontend + API:** Vercel (Next.js App Router; API routes run as serverless functions). Local `.vercel/` config present.
- **Database/Auth:** Supabase (hosted Postgres + Auth).
- **Third-party services:** Anthropic Claude API (research generation), Upstox API (OAuth2, live NSE data), Finnhub API (fallback quotes), Cloudflare Turnstile (CAPTCHA).
- **Local-only state:** `.data/` holds a local Upstox token cache (gitignored); production tokens live in the `upstox_tokens` table.

---

## 13. Security Notes

- RLS is the enforcement boundary for every user-owned table — see §4 for the policy pattern.
- `SUPABASE_SERVICE_ROLE_KEY` is used only in server-side code (`src/lib/supabase/admin.ts`) and never sent to the browser.
- Admin API routes additionally verify the caller via `requireAdmin()` → `is_admin(uid)` before touching data.
- Secrets (`.env.local`, `.data/`) are gitignored; the Turnstile secret key is configured in Supabase Auth settings rather than in this repo's env vars.
