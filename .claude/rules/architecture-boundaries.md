# Architecture Boundaries

How NeutaraDeployment is layered, and where new code belongs. This is deliberately a thin, direct architecture — don't introduce layers or abstractions it doesn't already have.

## Layering

```
Route (backend/src/routes/*.routes.ts)
  → authenticate, authorize([roles]), express-validator checks
Controller (backend/src/controllers/*.controller.ts)
  → request/response shape, orchestrates services + direct query() calls
Service (backend/src/services/*.service.ts)
  → side effects only: audit logging, notifications, email
Database (backend/src/database/connection.ts)
  → query()/pool/executeBatch — the only place `pg` is imported directly
```

- **No ORM, no repository/DAO layer.** Controllers call `query()` directly with parameterized SQL. Do not introduce Prisma/TypeORM/Knex or a repository abstraction — this is a deliberate choice for a small, direct codebase, not an oversight.
- **No numbered migration framework.** `backend/src/database/` holds `schema.sql` (base) plus standalone files applied in sequence by `migrate.ts` (`azure_migration.sql`, `migration_fix.sql`, plus inline SQL in `migrate.ts` itself for the `artifact_version` column). A new schema change is a new descriptively-named `.sql` file plus a step added to `migrate.ts` — not a new ORM migration.
- **Services own side effects, not request/response.** `audit.service.ts`, `notification.service.ts`, `email.service.ts` never touch `req`/`res`. Email sends are fire-and-forget (`.catch`-guarded) — a failed email must never fail the underlying status transition.

## Role & Permission Boundaries

- Role checks live in exactly one place per request: `authorize([...roles])` in the route definition. Controllers assume the check already passed; they don't re-check `req.user.role` for authorization (they may still read it for business logic, e.g. "only the original `raised_by` user can acknowledge").
- Frontend role gating (`ProtectedRoute`, `ROLE_PERMISSIONS` in `authStore.ts`) is UX convenience only — it is not a security boundary and must never be the only check for a sensitive action.
- Adding a new role is a precedent-setting change — update the `role` CHECK constraint in `schema.sql`, every `authorize([...])` call that should include/exclude it, and record the decision in `.claude/memory/decisions.md`.

## Module Boundaries (adding a new feature)

Follow the `deployment` module as the reference pattern (see `.claude/commands/scaffold.md`):
1. Schema (if needed) — new `.sql` file in `backend/src/database/`.
2. Controller — one file per domain concept, async handlers returning the `{ success, data/message }` envelope.
3. Routes — one file per controller, registered in `backend/src/routes/index.ts` and mounted in `backend/src/server.ts` under `/api/v1/<resource>`.
4. Frontend type in `frontend/src/types/index.ts`, service in `frontend/src/services/`, page in `frontend/src/pages/`, route registration with role guard in `App.tsx`.

Don't split a small feature across more files than this pattern uses — a new "manager" class, a new state-management layer beyond Zustand, or a new HTTP client beyond the shared `api.ts` Axios instance are all out of bounds without an explicit decision.

## Status Machine Boundary

The 12-value `deployment_requests.status` machine (`.claude/memory/domain-knowledge.md`) is owned collectively by `deployment.controller.ts`, `qa.controller.ts`, `infra.controller.ts`, and `acknowledgment.controller.ts` — each owns the transitions relevant to its role. Every transition must call `createAuditLog()` (`audit.service.ts`). Don't write a status update anywhere else (e.g. directly in a route handler or a one-off script) without going through the same audit trail.

## Type Boundary

`backend/src/types/index.ts` and `frontend/src/types/index.ts` each define their own `DeploymentStatus` (and related) unions — they are not shared, and they have already drifted once (the backend's is missing `rejected_by_infra`). When you change the status machine, update both files in the same change.
