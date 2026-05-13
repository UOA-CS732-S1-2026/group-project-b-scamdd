# CS732 project - Team B Scamdd

Welcome to the CS732 project. We look forward to seeing the amazing things you create this semester! This is your team's repository.

Your team members are:
- Subeen Ban _(sban919@aucklanduni.ac.nz)_
- Bailey Gibson _(bgib630@aucklanduni.ac.nz)_
- JooHyun Kang _(jkan172@aucklanduni.ac.nz)_
- Daniel Kim _(dkim848@aucklanduni.ac.nz)_
- Daniel Kim _(mkim670@aucklanduni.ac.nz)_
- Atul Kodla _(akod059@aucklanduni.ac.nz)_
- Meara Keelty _(mkee115@aucklanduni.ac.nz)_

You have complete control over how you run this repo. All your members will have admin access. The only thing setup by default is branch protections on `main`, requiring a PR with at least one code reviewer to modify `main` rather than direct pushes.

Please use good version control practices, such as feature branching, both to make it easier for markers to see your group's history and to lower the chances of you tripping over each other during development

![](./B%20Scamdd.png)

## Tech stack

- **Frontend:** Vite + React + TypeScript
- **Backend:** Express + TypeScript on Node.js
- **Database:** MongoDB Atlas (via Mongoose + Better Auth MongoDB adapter)
- **Auth:** Better Auth (email/password + Google OAuth)
- **Charts:** Recharts
- **Package manager:** pnpm

## Getting started

### Prerequisites
- Node.js 24 (see `.nvmrc`)
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- A [MongoDB Atlas](https://cloud.mongodb.com) cluster (free M0 tier is fine)
- A Google OAuth client ID/secret from [console.cloud.google.com](https://console.cloud.google.com) (optional for local dev)

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

> **Atlas setup:** In your Atlas cluster, go to **Network Access** and add your IP (or `0.0.0.0/0` for dev). Go to **Database Access** and create a user with read/write permissions.

> **Google OAuth setup:** Register a Web Application in Google Cloud Console. Add `http://localhost:4000/api/auth/callback/google` as an authorised redirect URI.

### Running in development

The fastest way is the root `Makefile`, which runs both servers together:

```bash
make install   # pnpm install in client and server
make dev       # backend on :4000 and frontend on :5173
```

Or run them separately in two terminals:

```bash
# Terminal 1 - backend on http://localhost:4000
cd server
pnpm dev

# Terminal 2 - frontend on http://localhost:5173
cd client
pnpm dev
```

The Vite dev server proxies `/api/*` to the Express server, so the client can call `fetch('/api/health')` directly.

## Authentication

Auth is handled by [Better Auth](https://better-auth.com) with a MongoDB adapter.

### Supported methods
- **Email / password** — sign up and sign in via `/auth`
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

// Sign up
await signUp.email({ name, email, password });

// Sign in
await signIn.email({ email, password });

// Google OAuth
await signIn.social({ provider: 'google', callbackURL: '/' });

// Sign out
await signOut();

// Get session in a component
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

### Running tests

Tests use [Vitest](https://vitest.dev/) and require no external services — the server tests spin up an in-memory MongoDB via `mongodb-memory-server` automatically.

> **First run only:** `mongodb-memory-server` downloads a MongoDB binary (~77 MB) the first time it runs. Subsequent runs use the cached binary and are much faster.

#### Server tests (API integration tests)

```bash
cd server
pnpm test          # run once
pnpm test:watch    # re-run on file changes
```

Or from the project root:

```bash
make test          # runs the server suite
```

(Client tests are not yet in place — Phase 6 introduces TanStack Query but the page-level fetch hooks aren't migrated, so component tests are deferred.)

Covers:
- `GET /api/health` and the central 404 handler
- `requireAuth` middleware — 401 (no session), 502 (auth service throws), passthrough (valid session)
- Transactions CRUD — create / update / delete + ownership isolation
- Friend request lifecycle — request → accept → list, self-friend rejection, duplicate rejection
- Shared-budget create / invite / accept, and concurrent-invite race (C2)
- Game score ceiling rejection (C1)
- Validation cap on `amount`, unknown-field stripping
- Profile-delete cascade — every collection cleared
- Category-delete refusal / reassign / force flows
- Unfriend cascade (cheers + pending invites)
- Achievement reversal on transaction delete
- Goal contribute `{ completed, justCompleted }` semantics
- Leaderboard stable tiebreak

### Building for production

```bash
cd client && pnpm build
cd server && pnpm build
```

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

## Branching and commits

- Work on feature branches; open a PR into `main` (branch protection requires 1 reviewer).
- Use [Conventional Commits](https://www.conventionalcommits.org/) for branch and commit names:
  - `feat/<scope>` for new features
  - `fix/<scope>` for bug fixes
  - `chore/<scope>` for tooling/setup
  - `docs/<scope>` for documentation
