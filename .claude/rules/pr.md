# Pull Request Format

## Title
`<type>(<scope>): <short description>` — max 72 characters.

**Types:** `feat` | `fix` | `refactor` | `chore` | `docs` | `test`
**Scopes:** `auth` | `deployment` | `qa` | `infra` | `admin` | `email` | `ui` | `db`

Examples:
- `fix(deployment): use MAX() for request_number to prevent duplicate key errors`
- `feat(qa): add bulk approval for multiple deployment requests`
- `refactor(ui): render job IDs as pill tags instead of overflow string`

## Body
- What changed and why (the diff shows what — body explains why).
- Link to Jira ticket if applicable.
- List any DB migrations included (filename).
- List any new environment variables added to `.env.example`.
- Call out breaking changes explicitly.

## Pre-Merge Checklist
- [ ] `npx tsc --noEmit` passes in `backend/`
- [ ] No `.env` secrets in the diff
- [ ] All new routes have `authenticate` + `authorize` middleware
- [ ] DB migration file included if schema changed
- [ ] Tested locally with `docker compose up -d --build`
- [ ] No `console.log` left in committed code
- [ ] Commit messages follow the `type(scope): description` format

## Branch Naming
`<type>/<short-description>` — e.g., `fix/duplicate-request-number`, `feat/bulk-qa-approval`
