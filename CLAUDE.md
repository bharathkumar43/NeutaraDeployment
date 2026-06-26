# NeutaraDeployment

Internal deployment request management system for CloudFuze. Tracks the full lifecycle: dev submission → QA approval → infra deployment → dev acknowledgment.

## Tech Stack

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Zustand + Azure MSAL
**Backend:** Express 4 + TypeScript + Node.js 18
**Database:** PostgreSQL 15
**Auth:** Azure AD (Microsoft Entra ID) + JWT (24h expiry)
**Infra:** Docker Compose — db:5432, api:3200, frontend:3201
**Email:** Microsoft Graph API (Mail.Send permission)

## Architecture

```
React SPA (:3201) → Express API (:3200) → PostgreSQL (:5432)
```

Roles: `admin` | `dev` | `qa` | `infra` | `viewer`

Deployment lifecycle: dev creates → QA approves/rejects → Infra deploys + uploads screenshot → dev acknowledges

## Key Directories

```
backend/src/
  controllers/    auth, deployment, qa, infra, acknowledgment, admin
  middleware/     JWT auth, file upload, error handling
  services/       audit, notification, email
  database/       schema.sql, migrations, seed
  routes/         Express router definitions

frontend/src/
  pages/          Route-level components
  components/     Shared UI (StatusBadge, WorkflowProgress, AuditTimeline)
  services/       Axios API wrappers
  store/          Zustand auth store
  types/          TypeScript interfaces
```

## Coding Conventions

- TypeScript strict mode. No `any` without an explaining comment.
- Controllers return `{ success: boolean, data?, message? }` shape — always.
- All DB access through `query()` from `src/database/db.ts`. No raw `pg` calls.
- Frontend API calls through `src/services/api.ts` (Axios instance with interceptors).
- Tailwind only — no inline styles, no CSS modules.
- React Hook Form for all forms. No uncontrolled inputs.
- `date-fns` for all date formatting. No `moment`.
- No `console.log` in committed code — use Winston logger in backend.

## Hard Rules

- NEVER commit `.env` files. All secrets via environment variables only.
- NEVER skip `authenticate` + `authorize` middleware on protected routes.
- NEVER use `COUNT(*)` to generate unique IDs — use `MAX()` to avoid collisions after deletions.
- NEVER modify `docker-compose.yml` without confirming it won't break the DB volume.
- Request numbers format: `DPRxxxx` (server-side only, MAX-based generation).
- Schema changes require a migration file in `backend/src/database/`.
- Role checks always use `req.user.role` — never trust client-sent role values.

## Database Tables

`users` · `deployment_requests` · `deployment_qa_approvals` · `deployment_infra_logs` · `deployment_acknowledgments` · `audit_logs` · `notifications` · `jobs` · `branches`

## Environment Setup

1. Copy `.env.example` → `.env` (root and `backend/`)
2. Fill in Azure AD credentials (tenant ID, client ID, client secret)
3. Set `JWT_SECRET` to a random 64-char string
4. Run: `sudo docker compose up -d --build`
5. Verify: `GET http://localhost:3200/api/v1/health`

See `AGENTS.md` for subagent roles. See `.claude/rules/` for detailed conventions.
