# NeutaraDeployment

Internal deployment request management system for CloudFuze. It tracks the full lifecycle of a production deployment — dev submission → QA approval → infra deployment (with screenshot proof) → dev acknowledgment — replacing what used to be ad-hoc Slack/email coordination between the Dev, QA, and Infra teams.

## Prerequisites — Install gstack once on your machine

This project uses **gstack** for AI-assisted development (code review, QA, security audits, docs, deployment). Every contributor must install gstack **once** on their own machine before using Claude Code on this repo.

**Requirements:** Claude Code, Git, Node.js 18+ ([nodejs.org](https://nodejs.org) LTS). Bun is installed automatically by gstack's setup.

**Windows users:** you must use **Git Bash** (comes with Git for Windows). PowerShell and CMD will NOT work.

### Fastest install — paste this to Claude Code

Open Claude Code (from anywhere on your machine) and paste this exact message:

> Install gstack: run `git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup` then confirm the skills are available by listing `~/.claude/skills/`.

Claude will clone the repo, run setup, and verify. Takes ~60 seconds.

### Manual install

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack
./setup
```

### Verify it works

Reopen this project in Claude Code and type `/office-hours` — if Claude responds with the office-hours flow, gstack is working.

### Update gstack later

Inside any Claude Code session, run `/gstack-upgrade`.

### Troubleshooting

| Problem | Fix |
|---|---|
| `/office-hours` not recognized | `cd ~/.claude/skills/gstack && ./setup` |
| Windows: `bad interpreter: /bin/bash^M` | `cd ~/.claude/skills/gstack && git config core.autocrlf false && git config core.eol lf && git rm --cached -r . && git reset --hard HEAD && ./setup` |
| `/browse` fails | `cd ~/.claude/skills/gstack && bun install && bun run build` |

---

## Tech Stack

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Zustand + Azure MSAL (`@azure/msal-browser`, `@azure/msal-react`)
**Backend:** Express 4 + TypeScript + Node.js 18
**Database:** PostgreSQL 15 (`pg` driver, no ORM)
**Auth:** Azure AD (Microsoft Entra ID) via server-side code exchange + JWT (24h expiry, `jsonwebtoken`)
**Infra:** Docker Compose — `db` (:5432), `backend` (:3200), `frontend` (:3201, nginx-served)
**Email:** Microsoft Graph API (`Mail.Send` permission), fire-and-forget from `email.service.ts`
**No test runner is installed** (backend has no `jest`/`supertest`, frontend has no `vitest`/RTL) and **no CI/CD exists** — see `.claude/rules/testing-standard.md` and `.claude/memory/progress.md` for the gap.

## Architecture Summary

```
React SPA (:3201, nginx) → Express API (:3200) → PostgreSQL 15 (:5432)
                                  ↓
                    Microsoft Graph API (email notifications)
```

Roles (RBAC, enforced server-side via `authorize()`, never trust client-sent role): `admin` | `dev` | `qa` | `infra` | `viewer`

Deployment lifecycle is a 12-state machine, not the simplified 5-step version — see `.claude/memory/domain-knowledge.md` for the full state diagram and exactly which controller function drives each transition.

## Critical Constraints

- NEVER commit `.env` files. All secrets via environment variables only.
- NEVER skip `authenticate` + `authorize` middleware on protected routes.
- NEVER use `COUNT(*)` to generate `request_number` — use the `MAX(CAST(SUBSTRING(...) AS INTEGER))` pattern (see `.claude/memory/decisions.md`).
- NEVER modify `docker-compose.yml` without confirming it won't break the `db_data` volume.
- All DB access goes through `query()` / `pool` from `backend/src/database/connection.ts` — no raw `pg` calls elsewhere, no ORM.
- Role checks always read `req.user.role` (set by `authenticate` from the verified JWT) — never a client-supplied role field.
- Schema changes need a new SQL file in `backend/src/database/` (there is no numbered migration framework — see `.claude/rules/architecture-boundaries.md`).

Full rule detail lives in `.claude/rules/` — read the relevant file before touching that area, not all of them every time.

## Repository Navigation

```
backend/src/
  controllers/    auth, deployment, qa, infra, acknowledgment, admin
  middleware/     auth.ts (JWT), upload.ts (Multer), errorHandler.ts
  services/       audit.service.ts, notification.service.ts, email.service.ts
  database/       schema.sql, connection.ts, migrate.ts, azure_migration.sql, migration_fix.sql
  routes/         one *.routes.ts per controller + index.ts
  utils/          jwt.ts, azureAuth.ts, logger.ts (Winston)
  server.ts       Express app entry, mounts all routers under /api/v1

frontend/src/
  pages/          one route-level component per screen (Login, NewDeployment, QAApproval, InfraDeployment, Acknowledgment, Admin, History, ...)
  components/common/  StatusBadge, WorkflowProgress, AuditTimeline, AppLayout, Sidebar, Header, Modal
  services/       api.ts (Axios instance + interceptors), deployment.service.ts, auth.service.ts, admin.service.ts
  store/          authStore.ts (Zustand + persist)
  types/          index.ts (DeploymentStatus union — this is the authoritative 12-value version, ahead of the backend's)
```

No `__tests__/` directories exist yet in either `backend/src/` or `frontend/src/`.

## Memory Files

- [`.claude/memory/project-context.md`](.claude/memory/project-context.md) — stack, ports, roles, lifecycle at a glance
- [`.claude/memory/architecture.md`](.claude/memory/architecture.md) — request flow, auth flow, DB access pattern, email/notification pipeline
- [`.claude/memory/domain-knowledge.md`](.claude/memory/domain-knowledge.md) — the real 12-state deployment status machine and request-number generation
- [`.claude/memory/repository-map.md`](.claude/memory/repository-map.md) — every controller/route/service file and what it owns
- [`.claude/memory/decisions.md`](.claude/memory/decisions.md) — why MAX() not COUNT(), why Azure-only auth, why Postgres, why Tailwind-only, why comma-separated `job_id`
- [`.claude/memory/progress.md`](.claude/memory/progress.md) — recently completed work and known open items (no tests, stale README, etc.)

## Environment Variables

Two `.env.example` files exist — copy each to `.env` alongside it:
- Root `.env.example` — consumed by `docker-compose.yml`: `APP_URL`, `JWT_SECRET`, `DB_PASSWORD`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `VITE_AZURE_CLIENT_ID`, `VITE_AZURE_TENANT_ID`, `EMAIL_SENDER`, `EMAIL_QA_DL`, `EMAIL_INFRA_DL`, `SCOPE_EMAIL_RECIPIENT`.
- `backend/.env.example` — superset for standalone backend dev, adds `PORT`, `DB_HOST/PORT/NAME/USER`, `JWT_EXPIRES_IN`, `UPLOAD_DIR`, `MAX_FILE_SIZE`, `FRONTEND_URL`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, plus extra email DLs (`EMAIL_QA_DL_2/3`, `EMAIL_DEPLOYMENT_DL`, `EMAIL_ACK_NOTIFY_DL`).

`VITE_AZURE_CLIENT_ID` / `VITE_AZURE_TENANT_ID` are baked in at **Docker build time** (`frontend/Dockerfile` build args) — changing them requires a rebuild, not just a container restart.

## Common Commands

```bash
# Full stack (from repo root)
sudo docker compose up -d --build
sudo docker compose logs -f backend
curl http://localhost:3200/api/v1/health

# Backend (standalone dev)
cd backend
npm run dev              # ts-node-dev, hot reload
npm run build && npm start
npm run migrate          # applies schema.sql + Azure migration + reseeds jobs
npm run reset-passwords  # resets the 5 seed accounts to Admin@123
npx tsc --noEmit         # required before every PR

# Frontend (standalone dev)
cd frontend
npm run dev
npm run build            # tsc && vite build
npm run lint
```

`npm run seed` is defined in `backend/package.json` but `backend/src/database/seed.ts` does not exist — don't rely on it; `npm run migrate` is what actually seeds data.

---

## Available gstack Commands

gstack is installed globally at `~/.claude/skills/gstack`. Use `/browse` from gstack for all web browsing; never use `mcp__claude-in-chrome__*` tools.

- **Planning:** `/office-hours`, `/autoplan`, `/spec`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`
- **Review & investigate:** `/review`, `/investigate`, `/codex`
- **Testing:** `/qa <url>`, `/qa-only <url>`, `/browse`, `/open-gstack-browser`
- **Security & docs:** `/cso`, `/document-release`, `/document-generate`
- **Ship & deploy:** `/ship`, `/land-and-deploy`, `/canary`
- **Safety:** `/careful`, `/freeze`, `/guard`, `/unfreeze`
- **Learn & upgrade:** `/learn`, `/gstack-upgrade`

This project's own commands live under `.claude/commands/` and are namespaced `/project:<name>` (`/project:team-review`, `/project:deploy`, `/project:scaffold`, `/project:feature`, `/project:bugfix`) — they do not collide with any gstack command above; see `.claude/memory/decisions.md` for the rename history.

## Recommended Workflow

- **New feature:** `/office-hours` → `/autoplan` → implement → `/review` → `/qa` → `/cso` → `/ship`
- **Routine change:** implement → `/review` → `/qa` → `/ship`
- **Bug fix:** `/investigate` → fix → `/review` → `/qa` → `/ship`

**Before every PR (never skip):**
1. `/review` — bugs CI won't catch
2. `/qa <staging-url>` — real browser test
3. `/cso` — security audit (if security-sensitive)
4. `/ship` — opens PR

## Pre-flight — gstack availability check

Before offering the Skill routing menu OR running any gstack slash command, Claude MUST first verify gstack is installed:

```bash
test -f ~/.claude/skills/gstack/setup && echo "gstack_installed" || echo "gstack_missing"
```

- `gstack_installed` → show **Menu A** below
- `gstack_missing` → show **Menu B** below

Install command (used when the user chooses "Install gstack now"):
```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup
```

After install, tell the user: "✅ gstack installed. Reopen this project in Claude Code so the new skills are discovered. Then re-ask your original question."

If install fails, report the error, suggest the manual install, and fall back to the normal project approach.

## Skill routing

Before any repository task, Claude must run the Pre-flight check and show the correct menu.

**Menu A — gstack IS installed**

"Before I start, choose one:
1. Use gstack workflow
2. Use normal project files / plain Claude approach
3. Let Claude recommend the best option first"

**Menu B — gstack is NOT installed**

"gstack is not installed on your machine. Before I start, choose one:
1. Install gstack now (~60 seconds), then use gstack workflow
2. Use normal project files / plain Claude approach (no gstack workflows available)
3. Let Claude recommend the best option first"

The install option MUST appear on every question until gstack is installed — not just the first time.

**Slash command exception:** if the user types a gstack slash command (`/review`, `/qa`, `/cso`, `/ship`, `/office-hours`, etc.) directly, run the Pre-flight check first. If installed, run the command directly. If not, show Menu B.

Claude must wait for the user's selection before reading files, editing files, or invoking any skill.

### Option 1 (Menu A) — Use gstack workflow

Mappings:
- Product brainstorm / feature ideas → `/office-hours`
- Rough idea to spec → `/spec`
- Scope tradeoffs → `/plan-ceo-review`
- New-feature architecture → `/plan-eng-review`
- Bugs / unexpected errors → `/investigate`
- Test a URL → `/qa` or `/qa-only`
- Diff review before land → `/review`
- Security-sensitive change → `/cso`
- Open a PR → `/ship`
- Deploy / verify prod → `/land-and-deploy`
- Docs update → `/document-release`
- Docs generation → `/document-generate`

### Option 1 (Menu B) — Install gstack now

Run the install command. On success, tell the user to reopen the project. On failure, fall back to Option 2.

### Option 2 — Use normal project files / plain Claude approach

Reading files, explaining code, small edits, typo fixes, one-file updates, basic refactoring, config changes, project Q&A, checking implementation details.

### Option 3 — Let Claude recommend

If gstack installed → recommend between gstack workflow and normal approach. If gstack missing → recommend between installing gstack (for tasks that need it) or normal approach (for small tasks).
