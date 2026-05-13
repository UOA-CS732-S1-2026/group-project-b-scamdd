# felt — Team B Scamdd

**felt** is a finance tracker that pairs every purchase with a mood. After a month, you stop guessing where your money goes and start seeing where it actually feels good.

![](./B%20Scamdd.png)

---

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

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React + TypeScript |
| Backend | Express + TypeScript on Node.js |
| Database | MongoDB Atlas via Mongoose |
| Auth | Better Auth (email/password + Google OAuth) |
| Charts | Recharts |
| Package manager | pnpm |

---

## Getting started

### Prerequisites

- Node.js 24 (see `.nvmrc`)
- pnpm:
  ```bash
  corepack enable && corepack prepare pnpm@latest --activate
  ```
- Access to the shared MongoDB Atlas cluster (ask a team member for the `.env` values)
- A Google OAuth client ID/secret — optional for local dev

### Installation

```bash
# Client
cd client
pnpm install

# Server (in a second terminal)
cd server
pnpm install
cp .env.example .env   # then fill in your values
```

### Environment variables

Copy `server/.env.example` to `server/.env` and fill in:

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string (include `/bscamdd` database name) |
| `BETTER_AUTH_SECRET` | Random 32-byte hex string (see below) |
| `BETTER_AUTH_URL` | URL the server runs at — default: `http://localhost:4000` |
| `CLIENT_URL` | URL the client runs at — default: `http://localhost:5173` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console → OAuth 2.0 credentials (optional) |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console → OAuth 2.0 credentials (optional) |

**Generating `BETTER_AUTH_SECRET`:**

macOS / Linux:
```bash
openssl rand -hex 32
```

Windows (PowerShell):
```powershell
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
```

> **MongoDB Atlas setup:** Go to **Network Access** and add your IP (or `0.0.0.0/0` for dev). Go to **Database Access** and ensure a user with read/write permissions exists.

> **Google OAuth setup:** Register a Web Application in Google Cloud Console. Add `http://localhost:4000/api/auth/callback/google` as an authorised redirect URI. This is optional — email/password auth works without it.

### Running in development

**macOS / Linux** — use the Makefile from the root directory:
```bash
make install   # install dependencies in client and server
make dev       # runs backend on :4000 and frontend on :5173
```

**Windows** — run each server in a separate terminal:
```bash
# Terminal 1 — backend on http://localhost:4000
cd server
pnpm dev

# Terminal 2 — frontend on http://localhost:5173
cd client
pnpm dev
```

Then open `http://localhost:5173` in your browser.

The Vite dev server proxies `/api/*` to the Express server, so the client can call `fetch('/api/health')` directly without CORS issues.

---

## Authentication

Auth is handled by [Better Auth](https://better-auth.com) with a MongoDB adapter.

### Supported methods
- **Email / password** — sign up and sign in via `/auth`
- **Google OAuth** — one-click sign in via Google (requires credentials in `.env`)

### Auth routes (server)

All auth endpoints are automatically mounted at `/api/auth/*` by Better Auth.

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

### Running tests

Tests use [Vitest](https://vitest.dev/) and require no external services — the server tests spin up an in-memory MongoDB via `mongodb-memory-server` automatically.

> **First run only:** `mongodb-memory-server` downloads a MongoDB binary (~77 MB) the first time it runs. Subsequent runs use the cached binary and are much faster.

#### Server tests (API integration tests)

```bash
cd server
pnpm test          # run once
pnpm test:watch    # re-run on file changes
```

Covers:
- `POST /api/auth/sign-up/email` — success, duplicate email, missing fields
- `POST /api/auth/sign-in/email` — success, wrong password, unknown email
- `GET /api/transactions` — only returns the signed-in user's own data, 401 without token
- `POST /api/transactions` — creates correctly, rejects invalid data, 401 without token
- `DELETE /api/transactions/:id` — deletes correctly, 404 for non-owner, 401 without token

#### Client tests (component tests)

```bash
cd client
pnpm test          # run once
pnpm test:watch    # re-run on file changes
```

#### Run all tests from the project root

```bash
make test
```

Or without Make:

```bash
(cd server && pnpm test) && (cd client && pnpm test)
```

### Building for production

```bash
cd client && pnpm build
cd server && pnpm build
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for branching, commit, and PR guidelines.