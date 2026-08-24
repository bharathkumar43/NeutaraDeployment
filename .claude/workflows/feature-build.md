# Feature Build Workflow

Use when adding a new end-to-end feature to NeutaraDeployment. `.claude/commands/feature.md` runs this same sequence as a single invocable command — use this file when you want to drive the steps yourself instead. For the earlier product-shaping steps (should we build this, what's the scope), use gstack's `/office-hours` → `/autoplan` before Step 1.

---

## Step 1 — Research
Invoke `@researcher` to map the existing code path this feature will touch:
- Which controller handles the related domain?
- Which routes exist?
- What DB tables are involved?
- What frontend pages/components are nearby?

## Step 2 — Plan
Invoke `@architect` (or gstack's `/plan-eng-review` for a broader architectural gut-check) before writing any code. Answer:
- Does this require a DB schema change? → Create a migration file first.
- Does this need a new role or permission? → Update `authorize([roles])` calls.
- Does this add new env variables? → Update `.env.example` and document in the PR body.

## Step 3 — Backend First
1. Migration if needed: `backend/src/database/migration_<name>.sql`
2. Controller: `backend/src/controllers/<name>.controller.ts`
3. Routes: `backend/src/routes/<name>.routes.ts` — always with `authenticate` + `authorize`
4. Register route in `backend/src/server.ts`
5. Smoke test with curl before touching frontend

## Step 4 — Frontend
1. TypeScript interface in `frontend/src/types/index.ts`
2. Service method in `frontend/src/services/<name>.service.ts`
3. Page component: `frontend/src/pages/<Name>Page.tsx`
4. Register in `frontend/src/App.tsx` with role guard

## Step 5 — Review
Run `/project:team-review` and gstack's `/review` on the full diff. Fix all HIGH/CRITICAL findings before proceeding. Run `/project:team-review`'s security items plus `@security-reviewer` (and gstack's `/cso`) if the feature touches auth, uploads, or role boundaries.

## Step 6 — Test (if tooling exists)
Invoke `@test-writer` — it will flag if the test runner isn't installed yet rather than writing tests that can't execute (see `.claude/memory/progress.md`).

## Step 7 — Commit and Ship
```bash
git add <specific files>
git commit -m "feat(<scope>): <description>"
```
Use gstack's `/ship` to open the PR. If you tested against a real browser first, run gstack's `/qa <staging-url>` before shipping.
