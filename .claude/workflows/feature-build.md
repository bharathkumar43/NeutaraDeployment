# Feature Build Workflow

Use when adding a new end-to-end feature to NeutaraDeployment.

---

## Step 1 — Research
Invoke `@research` to map the existing code path this feature will touch:
- Which controller handles the related domain?
- Which routes exist?
- What DB tables are involved?
- What frontend pages/components are nearby?

## Step 2 — Plan
Before writing any code, answer:
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
Run `/project:review` on the full diff. Fix all HIGH/CRITICAL findings before proceeding.

## Step 6 — Commit and Push
```bash
git add <specific files>
git commit -m "feat(<scope>): <description>"
git push origin <branch>
```
