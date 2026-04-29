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
- **Database:** MongoDB (via Mongoose)
- **Charts:** Recharts
- **Package manager:** pnpm

## Getting started

### Prerequisites
- Node.js 24 (see `.nvmrc`)
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- MongoDB running locally on `mongodb://localhost:27017` (or a MongoDB Atlas connection string)

### First-time setup

```bash
# Client
cd client
pnpm install
cp .env.example .env

# Server (in a second terminal)
cd server
pnpm install
cp .env.example .env
```

### Running in development

```bash
# Terminal 1 - backend on http://localhost:4000
cd server
pnpm dev

# Terminal 2 - frontend on http://localhost:5173
cd client
pnpm dev
```

The Vite dev server proxies `/api/*` to the Express server, so the client can call `fetch('/api/health')` directly.

### Building for production

```bash
cd client && pnpm build
cd server && pnpm build
```

## Branching and commits

- Work on feature branches; open a PR into `main` (branch protection requires 1 reviewer).
- Use [Conventional Commits](https://www.conventionalcommits.org/) for branch and commit names:
  - `feat/<scope>` for new features
  - `fix/<scope>` for bug fixes
  - `chore/<scope>` for tooling/setup
  - `docs/<scope>` for documentation
