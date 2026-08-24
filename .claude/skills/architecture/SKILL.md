---
description: Triggered when deciding where new code belongs in NeutaraDeployment, planning a new feature module, or asking "where should this logic live", "how is this layered", "does this need a migration".
---

# Architecture Skill

NeutaraDeployment is deliberately thin-layered. This skill is what `@architect` and `.claude/commands/scaffold.md`/`feature.md` draw on — full detail lives in `.claude/rules/architecture-boundaries.md`, this is the quick-reference version.

## The layering

```
Route → authenticate, authorize([roles]), express-validator
Controller → request/response, orchestrates services + query() calls directly
Service → side effects only (audit log, notifications, email)
connection.ts → the only file that imports `pg` directly
```

No ORM. No repository/DAO layer. Controllers call `query(sql, [params])` directly — this is intentional, not a gap to fill in.

## Schema changes

No numbered migration framework. A schema change is:
1. A new descriptively-named `.sql` file in `backend/src/database/` (see `azure_migration.sql`, `migration_fix.sql` for the pattern).
2. A step added to `migrate.ts` in the correct apply order (after `schema.sql`, before or after existing steps depending on dependency).
3. If it changes a `CHECK` constraint (e.g. `status`, `role`), update **both** `backend/src/types/index.ts` and `frontend/src/types/index.ts` — they don't share a source of truth and have drifted before.

## Adding a new feature module

Reference pattern: `deployment` (controller/routes/service/types/pages all named consistently). Order: schema → controller → routes → server.ts registration → curl smoke test → frontend type → frontend service → frontend page → App.tsx route with role guard. Don't add more files than this pattern uses for a comparably-sized feature.

## The status machine is shared, not owned by one file

`deployment_requests.status` transitions are split across `deployment.controller.ts`, `qa.controller.ts`, `infra.controller.ts`, `acknowledgment.controller.ts` — each owns the transitions for its role. Every transition calls `createAuditLog()`. If you're adding a new transition, find the controller that owns the *triggering role*, not the one that seems topically closest.

## When something doesn't fit this shape

If a change genuinely needs a new layer (e.g. a queue, a cache, a scheduled job), that's a real architectural decision — don't quietly add it. Flag it, and once decided, record it in `.claude/memory/decisions.md`.
