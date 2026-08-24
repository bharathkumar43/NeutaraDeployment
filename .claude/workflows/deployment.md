# Deployment Workflow

Use when deploying NeutaraDeployment to the target server. There is no CI/CD (`.claude/memory/repository-map.md`) — every deploy is this manual sequence, wrapped by `/project:deploy`. Use gstack's `/land-and-deploy` instead only if it has been explicitly configured for this project's host; otherwise this workflow is the real one.

---

## Step 1 — Pre-flight checks

```bash
cd backend && npx tsc --noEmit
```
Confirm `.env` (root) and `backend/.env` both exist with every variable from their respective `.env.example` filled in — see `CLAUDE.md` → Environment Variables for the exact list.

## Step 2 — Check for pending schema changes

Look for any new `.sql` file in `backend/src/database/` that hasn't been added as a step in `migrate.ts` yet — migrations run automatically on container start (`backend/Dockerfile`'s entrypoint is `node dist/database/migrate.js && node dist/server.js`), so a schema file that isn't wired into `migrate.ts` will silently never apply.

## Step 3 — Rebuild and deploy

```bash
git pull origin main && sudo docker compose up -d --build
```

Remember: `frontend/Dockerfile` bakes `VITE_AZURE_CLIENT_ID`/`VITE_AZURE_TENANT_ID` in at build time via Docker build args. If either changed in `.env`, a plain `docker compose up -d` (no `--build`) will NOT pick it up — the `--build` is required.

## Step 4 — Watch startup

```bash
sudo docker compose logs -f backend
```
Confirm migrations ran without error and the server started before moving on.

## Step 5 — Verify

```bash
curl http://localhost:3200/api/v1/health
```
Then open the frontend (`http://localhost:3201`) and confirm login works — both the password path (seed accounts) and the Azure SSO path if credentials are configured for this environment. For a scripted browser check instead of a manual one, use gstack's `/qa http://localhost:3201`.

## Step 6 — Rollback path

There is no automated rollback. If the deploy fails:
1. `git log --oneline` to find the last known-good commit.
2. `git checkout <last-good-commit> -- .` (or a full revert commit — never force-reset a shared branch without confirming with the team first).
3. Re-run Step 3.
4. If a schema migration was part of the failed deploy and it wasn't purely additive, the rollback needs a hand-written reverse migration — there's no auto-generated down migration in this framework.
