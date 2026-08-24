Build a new end-to-end feature for NeutaraDeployment, following `.claude/workflows/feature-build.md`.

Given the feature description in $ARGUMENTS:

1. Invoke `@researcher` to map the existing code this feature touches (related controllers, routes, DB tables, frontend pages).
2. Invoke `@architect` to decide: does this need a schema change, a new role, or a new env var? Where does the logic belong (route/controller/service split per `.claude/rules/architecture-boundaries.md`)?
3. Build backend-first: migration file (if needed) → controller → routes (`authenticate` + `authorize`) → register in `backend/src/server.ts` → smoke test with curl.
4. Build frontend: type in `frontend/src/types/index.ts` → service → page → route registration with role guard in `App.tsx`.
5. Run `.claude/commands/team-review.md` and gstack's `/review` on the full diff.
6. If the feature touches auth, uploads, or role boundaries, invoke `@security-reviewer` (and gstack's `/cso` for anything broader).
7. If a test runner is installed, invoke `@test-writer`; if not, it will flag that first.

Do not open a PR from this command — use gstack's `/ship` once the diff is reviewed.

Feature: $ARGUMENTS
