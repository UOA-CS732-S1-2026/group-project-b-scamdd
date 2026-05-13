# felt — CS732 Group Project (Team B Scamdd)

**felt** is a mood-first finance tracker. Every transaction is tagged with how it made you feel, so after a month you don't just see *where* your money went — you see how each purchase actually felt.

![](./B%20Scamdd.png)

## Team

| Name | Email |
|---|---|
| Subeen Ban | sban919@aucklanduni.ac.nz |
| Bailey Gibson | bgib630@aucklanduni.ac.nz |
| JooHyun Kang | jkan172@aucklanduni.ac.nz |
| Daniel Kim | dkim848@aucklanduni.ac.nz |
| Daniel Kim | mkim670@aucklanduni.ac.nz |
| Atul Kodla | akod059@aucklanduni.ac.nz |
| Meara Keelty | mkee115@aucklanduni.ac.nz |

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React 19 + TypeScript |
| Routing | React Router v7 |
| Data fetching | TanStack Query v5 |
| Charts | Recharts v3 |
| Styling | Tailwind CSS v4 |
| Toasts | Sonner |
| Backend | Express + TypeScript on Node.js |
| Database | MongoDB Atlas via Mongoose |
| Auth | Better Auth (email/password + Google OAuth) |
| Package manager | pnpm |
| Deployment | Vercel (static frontend + serverless API) |
| Testing | Vitest + mongodb-memory-server |

## Features

### Transactions
Log income and expenses with a title, amount, category, date, optional note, mood tag (`regret`, `meh`, `okay`, `glad`, `worth-it`), payment method, and an "essential" flag. The transactions page includes a daily spend chart, stat tiles (total in/out, net savings), and a sort/filter sidebar with a range slider, category pills, and date range controls.

### Budgets
Set per-category spending limits with weekly, monthly, or yearly periods. The dashboard and budgets page show a colour-coded segment bar for used vs. remaining budget. Budget streaks (consecutive days under budget) are tracked and displayed on the profile.

### Shared Budgets
Create a shared budget and invite friends. Invitees can accept or decline. All members see the same spending progress against the shared limit.

### Goals
Create savings goals with a target amount and deadline. Contribute incrementally; the UI shows progress and fires a completion event when the target is reached. Goals can be marked public so friends can see them.

### Friends
Search for users by display name or username, send friend requests, accept or reject incoming requests, and unfriend. The friends list shows each friend's public goals, public budgets (with live spend), budget streak, and earned achievements. Unfriending cascades: shared budget invites and cheers involving that pair are cleaned up automatically.

### Achievements
Twelve badges are awarded automatically when thresholds are met, and revoked if a later deletion makes the threshold no longer true:

| Key | Description |
|---|---|
| `first_transaction` | Log your first transaction |
| `txn_100` | Reach 100 transactions |
| `txn_500` | Reach 500 transactions |
| `streak_7` | Stay under budget 7 days in a row |
| `streak_30` | Stay under budget 30 days in a row |
| `streak_100` | Stay under budget 100 days in a row |
| `first_budget` | Create your first budget |
| `under_budget_month` | Finish a full calendar month under all budgets |
| `first_goal` | Create your first goal |
| `goal_completed` | Complete a savings goal |
| `no_regret_14` | No regret-tagged transactions in the last 14 days |
| `safety_net` | Log a transaction in the emergency category |

### Cheers
Send a cheer emoji to a friend's achievement badge. Cheers are per-badge, idempotent, and cascade-deleted when friends unfriend each other. Unseen cheers surface as a notification badge.

### Notifications
The navbar shows a red dot when there are unseen events: incoming friend requests, accepted friend requests, or received cheers. Each notification type is dismissed independently via a "mark seen" API call.

### Monthly Wrapped
At midnight on the 1st of each month (Pacific/Auckland time) a cron job generates a Spotify-Wrapped-style summary for every user who has transactions in the previous month. Note: the cron does not run on Vercel (serverless functions can't host persistent schedules); it only fires when the server is run with `pnpm dev` or `pnpm start`. Stats include total spent/income, savings rate, top category, biggest expense, most-regretted purchase, happiest purchase, busiest day, average daily spend, and mood average. Past wraps are browsable on the profile page.

### Games
Mini-games with in-app score submission. Scores are validated against a per-game ceiling (server-side) to prevent impossible scores. The leaderboard for each game shows you and your friends ranked by best score, with a stable tiebreak (whoever hit the score first wins, then lexicographic by user ID).

### Profile
- Choose a display name, username (immutable once set), bio, preferred currency (default: NZD), phone number, and avatar (solid colour or image upload).
- View your budget streak (consecutive days under budget), earned achievement badges, and past Monthly Wraps.
- Delete account — cascades all owned data (transactions, budgets, goals, friendships, shared budgets, achievements, cheers, wrapped history).

### Custom Categories
Create, rename, and delete spending categories. Deleting a category prompts whether to reassign existing transactions to another category or force-delete them.

### Marketing site
A landing page at `/` with a live mood-bar and category donut preview, a "How it works" section, and links to About, Contact, and Privacy pages — all without requiring login.

---

## Getting started

### Prerequisites
- Node.js 24 (see `.nvmrc`)
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- A [MongoDB Atlas](https://cloud.mongodb.com) cluster (free M0 tier is fine)
- A Google OAuth client ID/secret from [console.cloud.google.com](https://console.cloud.google.com) _(optional for local dev)_

### First-time setup

```bash
# Client
cd client
pnpm install

# Server (in a second terminal)
cd server
pnpm install
cp .env.example .env   # then fill in your values (see Environment variables below)
```

### Environment variables

Copy `server/.env.example` to `server/.env` and fill in:

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string (include `/bscamdd` database name) |
| `BETTER_AUTH_SECRET` | Random 32-byte hex string — generate with `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | URL the server is reachable at (default: `http://localhost:4000`) |
| `CLIENT_URL` | URL the client is reachable at (default: `http://localhost:5173`) |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console → OAuth 2.0 credentials |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console → OAuth 2.0 credentials |
| `SMTP_HOST` | SMTP server hostname for password-reset emails (leave blank to print reset links to the console instead) |
| `SMTP_PORT` | SMTP port (default: `587`) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | From address used on reset emails |

> **Atlas setup:** In your Atlas cluster, go to **Network Access** and add your IP (or `0.0.0.0/0` for dev). Go to **Database Access** and create a user with read/write permissions.

> **Google OAuth setup:** Register a Web Application in Google Cloud Console. Add `http://localhost:4000/api/auth/callback/google` as an authorised redirect URI.

The client also has a `client/.env` (see `client/.env.example`):

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL (default: `/api` — Vite proxy handles `/api` in dev) |

### Running in development

The fastest way is the root `Makefile`, which runs both servers together:

```bash
make install   # pnpm install in client and server
make dev       # backend on :4000 and frontend on :5173
```

Or run them separately in two terminals:

```bash
# Terminal 1 — backend on http://localhost:4000
cd server
pnpm dev

# Terminal 2 — frontend on http://localhost:5173
cd client
pnpm dev
```

The Vite dev server proxies `/api/*` to the Express server, so the client can call `fetch('/api/health')` directly without CORS issues.

---

## Authentication

Auth is handled by [Better Auth](https://better-auth.com) with a MongoDB adapter.

### Supported methods
- **Email / password** — sign up, sign in, and password reset via `/auth`
- **Google OAuth** — one-click sign in via Google

### Auth routes (server)
All auth endpoints are automatically mounted at `/api/auth/*` by Better Auth. Key ones:

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/sign-up/email` | Create a new account |
| `POST` | `/api/auth/sign-in/email` | Sign in with email + password |
| `GET` | `/api/auth/sign-in/social?provider=google` | Initiate Google OAuth |
| `GET` | `/api/auth/sign-out` | Sign out (clears session cookie) |
| `GET` | `/api/auth/get-session` | Returns the current session |

### Client usage

```ts
import { signIn, signUp, signOut, useSession } from './lib/auth-client';

await signUp.email({ name, email, password });
await signIn.email({ email, password });
await signIn.social({ provider: 'google', callbackURL: '/' });
await signOut();

const { data: session } = useSession();
```

### Protecting server routes

```ts
import { auth } from './auth';

app.get('/api/protected', async (req, res) => {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ user: session.user });
});
```

New users are redirected to `/profile/setup` on first login. All app routes (dashboard and below) sit behind a `RequireProfile` guard that checks `profileComplete` and bounces unauthenticated requests to `/auth`.

---

## API routes

All routes require the `requireAuth` middleware except where noted.

| Prefix | Description |
|---|---|
| `GET /api/health` | Health check (public) |
| `/api/auth/*` | Better Auth (public) |
| `/api/profile/*` | Read/update/delete current user's profile |
| `/api/transactions` | Transactions CRUD + pagination |
| `/api/budgets` | Personal budgets CRUD |
| `/api/shared-budgets` | Shared budgets CRUD + invite/accept |
| `/api/goals` | Goals CRUD + contribute endpoint |
| `/api/categories` | Custom categories CRUD |
| `/api/friends` | Friend search, requests, accept/reject, unfriend |
| `/api/achievements` | List own and friends' achievements |
| `/api/cheers` | Send/delete/query cheers on achievements |
| `/api/games/score` | Submit a game score |
| `/api/games/leaderboard/:game` | Leaderboard for a game (you + friends) |
| `/api/wrapped` | List past Monthly Wrapped summaries |

---

## Testing

Tests use [Vitest](https://vitest.dev/) and require no external services — the server tests spin up an in-memory MongoDB via `mongodb-memory-server` automatically.

> **First run only:** `mongodb-memory-server` downloads a MongoDB binary (~77 MB) the first time it runs. Subsequent runs use the cached binary and are much faster.

### Running tests

```bash
cd server
pnpm test          # run once
pnpm test:watch    # re-run on file changes
```

Or from the project root:

```bash
make test
```

### Test coverage

| File | What it tests |
|---|---|
| `health.test.ts` | `GET /api/health` and central 404 handler |
| `auth.test.ts` | `requireAuth` middleware — 401 (no session), 502 (auth service throws), passthrough (valid session) |
| `transactions.test.ts` | Transactions CRUD, pagination, ownership isolation |
| `friends.test.ts` | Friend request lifecycle — request → accept → list, self-friend rejection, duplicate rejection |
| `sharedBudgets.test.ts` | Shared-budget create / invite / accept, concurrent-invite race (C2) |
| `games.test.ts` | Score ceiling rejection (C1), leaderboard stable tiebreak |
| `gamification.test.ts` | Achievement award and revocation on transaction mutations |
| `achievements.test.ts` | Achievement thresholds and edge cases |
| `cascade.test.ts` | Profile-delete cascade, category-delete refusal / reassign / force, unfriend cascade |
| `security.test.ts` | Validation cap on `amount`, unknown-field stripping |
| `dateRange.test.ts` | Date-range helpers used by wrapped + budget streak |

---

## Building for production

```bash
cd client && pnpm build
cd server && pnpm build
```

### Deployment (Vercel)

The project deploys to Vercel as a static frontend + a single serverless function (`api/index.ts`) that wraps the Express app. The `vercel.json` at the root wires up the rewrites:

- `/api/*` → serverless function
- Everything else → `client/dist/index.html` (SPA fallback)

### Database indexes

Indexes are NOT created automatically (`autoIndex: false` on the connection). After deploying, run once against the target cluster:

```bash
cd server
MONGO_URI=<prod-uri> pnpm db:index
```

This runs `syncIndexes()` on every model — creates new indexes declared in `models/*.ts`, drops obsolete ones. Idempotent.

### Seeding demo data

```bash
cd server
pnpm seed <email>   # populates the user found by email with realistic txns/budgets/goals
```

Dates seed relative to "today" so the demo always looks recent; historical month references stay as-is for the monthly-wrapped showcase.

---

## Project structure

```
/
├── client/              # Vite + React frontend
│   └── src/
│       ├── api/         # Typed fetch wrappers + TanStack Query hooks
│       ├── components/  # Shared UI components (Navbar, Modal, forms, charts)
│       ├── context/     # CurrencyContext, ProfileAvatarContext
│       ├── hooks/       # useCategories, useTheme, useApiError
│       ├── pages/       # One file per route
│       └── types/       # Shared TypeScript interfaces
├── server/              # Express backend
│   └── src/
│       ├── jobs/        # wrappedCron — end-of-month Monthly Wrapped generator
│       ├── lib/         # achievements, streaks, spend, userCascade, dateRange, logger
│       ├── middleware/  # requireAuth, validate (Zod), errorHandler
│       ├── models/      # Mongoose models
│       ├── routes/      # One router per resource
│       ├── schemas/     # Zod validation schemas
│       ├── scripts/     # ensureIndexes (db:index)
│       └── seed.ts      # Demo data seeder
├── api/                 # Vercel serverless entry point
├── Makefile             # `make install`, `make dev`, `make test`
└── vercel.json          # Vercel build + rewrite config
```

---

## Branching and commits

- Work on feature branches; open a PR into `main` (branch protection requires 1 reviewer).
- Use [Conventional Commits](https://www.conventionalcommits.org/) for branch and commit names:
  - `feat/<scope>` for new features
  - `fix/<scope>` for bug fixes
  - `chore/<scope>` for tooling/setup
  - `docs/<scope>` for documentation
