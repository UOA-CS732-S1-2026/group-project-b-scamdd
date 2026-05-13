# Contributing to felt

## Branching

Always branch off `main`. Use [Conventional Commits](https://www.conventionalcommits.org/) naming:

| Type | Branch name example |
|---|---|
| New feature | `feat/friends-widget` |
| Bug fix | `fix/auth-redirect` |
| Tooling / config | `chore/update-deps` |
| Documentation | `docs/update-readme` |

## Commit messages

Follow the same format as your branch name:

```
feat(friends): add friend request notifications
fix(auth): redirect to dashboard after login
chore(deps): update pnpm lockfile
docs(readme): add Windows setup instructions
```

## Pull requests

- All PRs must target `main`
- At least **1 team member must review and approve** before merging (enforced by branch protection)
- Fill out the PR template fully
- Keep PRs focused — one feature or fix per PR where possible
- Make sure the app runs without errors before opening a PR

## Code style

The project uses ESLint and Prettier. Before pushing, run:

```bash
# From client/ or server/
pnpm lint
pnpm format
```

## What not to commit

- Never commit `.env` files or any secrets
- Never commit `node_modules/`
- These are already covered by `.gitignore` — double check before pushing if unsure