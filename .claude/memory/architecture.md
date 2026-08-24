---
name: architecture
description: How a request actually flows through NeutaraDeployment — auth, DB access, email/notification pipeline — ground-truthed against the code
metadata:
  type: project
---

## Request flow

```
React SPA (Axios, frontend/src/services/api.ts)
  → Express route (backend/src/routes/*.routes.ts): authenticate, authorize([roles]), express-validator
  → Controller (backend/src/controllers/*.controller.ts): request/response, calls query() directly
  → connection.ts: pg Pool (max 20 connections), env-configured (DB_HOST/PORT/NAME/USER/PASSWORD)
```
No ORM, no repository layer — this is intentional (see `.claude/rules/architecture-boundaries.md`).

## Auth — three login paths, one JWT

All three end in the same place: `generateToken()` (`backend/src/utils/jwt.ts`) issues our own JWT (`JWT_SECRET`, expiry `JWT_EXPIRES_IN`, default `24h`), which `authenticate` middleware verifies on every subsequent request and sets as `req.user = { userId, email, role, name }`.

1. **`login`** (`POST /api/v1/auth/login`) — email/password, seed accounts only (`auth_type === 'password'`), bcrypt compare.
2. **`azureLogin`** (`POST /api/v1/auth/azure`) — client sends a raw Azure `idToken`; backend decodes it with `jwt.decode` (no signature check — acceptable only as a secondary path, see `.claude/rules/security-rules.md`).
3. **`azureExchange`** (`POST /api/v1/auth/azure-exchange`) — the production path. Frontend sends an OAuth `code` + `redirectUri`; backend exchanges it server-side against Microsoft's token endpoint using `AZURE_CLIENT_SECRET` (avoids CORS, and this server-side exchange is what actually makes the token trustworthy).

Both Azure paths funnel into the shared `resolveAzureUser()` helper: looks up the user by email, auto-provisions new `@cloudfuze.com` accounts as role `dev`, rejects other domains and deactivated users.

**Frontend token storage:** `authStore.ts` (Zustand + `persist`, key `neutara_auth`) *and* a separate explicit `localStorage.setItem('neutara_token', ...)` call both persist the JWT to `localStorage` — it is not memory-only despite what older docs claimed. `frontend/src/services/api.ts` injects the Bearer token from `localStorage` on every request and redirects to `/login` on any 401.

**Role enforcement is server-side only in the ways that matter:** `ProtectedRoute` (`App.tsx`) and `ROLE_PERMISSIONS` (`authStore.ts`) are UX convenience — every real boundary is `authorize([...roles])` on the route.

## Notification & email pipeline

Every status transition (see `.claude/memory/domain-knowledge.md`) does three things, in this order, from inside the controller:
1. `createAuditLog()` (`audit.service.ts`) — writes `audit_logs` (old/new status, actor, comment, IP, metadata).
2. `createNotification` / `notifyRoleUsers` (`notification.service.ts`) — writes `notifications` rows for in-app display.
3. Email via Microsoft Graph (`email.service.ts`) — fire-and-forget, wrapped in `.catch()` so an email failure never fails the underlying transition. Recipients come from `.env` distribution lists (`EMAIL_QA_DL`, `EMAIL_INFRA_DL`, `EMAIL_DEPLOYMENT_DL`, `EMAIL_ACK_NOTIFY_DL`, etc.).

## File uploads

Infra deployment completion screenshots go through Multer (`backend/src/middleware/upload.ts`) — disk storage under `UPLOAD_DIR`, UUID filenames (never the client's original name), MIME allowlist (`jpeg|jpg|png|gif|webp|pdf`), size limit from `MAX_FILE_SIZE` (default 10MB).

## Deployment topology

```
docker-compose.yml: db (postgres:15) → backend (:3200) → frontend (:3201, nginx)
```
`backend/Dockerfile` entrypoint runs `node dist/database/migrate.js && node dist/server.js` — migrations run automatically on every container start, not as a separate manual step. `frontend/Dockerfile` bakes `VITE_AZURE_CLIENT_ID`/`VITE_AZURE_TENANT_ID` in at build time via Docker build args — changing them needs a rebuild, not just a restart. No CI/CD exists; deploys are manual (`git pull && sudo docker compose up -d --build` on the target host).
