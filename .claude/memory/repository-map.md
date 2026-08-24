---
name: repository-map
description: Every backend controller/route/service and frontend page/service, and what each one owns
metadata:
  type: project
---

## Backend controllers (`backend/src/controllers/`)

| File | Owns |
|---|---|
| `auth.controller.ts` | `login`, `azureLogin`, `azureExchange`, `getProfile`, `listUsers`, `createUser`, `updateUser`; shared `resolveAzureUser()` |
| `deployment.controller.ts` | `createDeployment`, `updateDraft`, `getDeployments`, `getDeploymentById`, `getDashboardStats`, `getNextRequestNumber`, `getJobsList`, `getBranchesList`, `deleteDeployment`, `sendDeploymentScopeEmail`; owns the MAX()-based request-number SQL |
| `qa.controller.ts` | `getPendingQARequests`, `processQAApproval` |
| `infra.controller.ts` | `getInfraQueue`, `startDeployment`, `completeDeployment` (screenshot upload), `infraReview` |
| `acknowledgment.controller.ts` | `getPendingAcknowledgments`, `submitAcknowledgment` (only the original `raised_by` user may call this) |
| `admin.controller.ts` | `getUserStats`, `getAuditLogs` |

## Backend routes (`backend/src/routes/`)

One `*.routes.ts` per controller above, plus `index.ts` (aggregates and mounts under `/api/v1`) and `notification.routes.ts` (no matching controller file — notification reads/writes live in `notification.service.ts`, called directly from other controllers).

## Backend middleware (`backend/src/middleware/`)

- `auth.ts` — `authenticate`, `authorize(...roles)`
- `errorHandler.ts` — `errorHandler`, `notFound`
- `upload.ts` — Multer config for screenshot uploads

## Backend services (`backend/src/services/`)

- `audit.service.ts` — `createAuditLog()`, the single place every status transition is recorded
- `notification.service.ts` — `createNotification`, `notifyRoleUsers`
- `email.service.ts` — Microsoft Graph `Mail.Send` wrapper, always called `.catch()`-guarded

## Backend database (`backend/src/database/`)

- `schema.sql` — base schema + seed data (5 users, ~40 jobs, 5 branches)
- `connection.ts` — the only file that imports `pg` directly: `query()`, `pool`, `executeBatch`, `closePool`
- `migrate.ts` — applies `schema.sql`, then `azure_migration.sql` inline, then adds `artifact_version` to `deployment_infra_logs`, then re-seeds the real job list (run via `npm run migrate`, and automatically on container start)
- `azure_migration.sql` — makes `password_hash` nullable, adds `auth_type`
- `migration_fix.sql` — adds `request_number` and related columns, rebuilds the 12-value `status` CHECK constraint
- `reset-passwords.ts` — resets the 5 seed accounts to `Admin@123` (`npm run reset-passwords`)
- **`seed.ts` does not exist** despite `backend/package.json` defining a `seed` script that references it — that script is broken; `npm run migrate` is what actually seeds data

## Backend utils (`backend/src/utils/`)

- `jwt.ts` — `generateToken`, `verifyToken`
- `azureAuth.ts` — `decodeAzureToken()` (unverified `jwt.decode`, used only where a server-side exchange has already happened)
- `logger.ts` — Winston logger (never `console.log`)

## Frontend pages (`frontend/src/pages/`)

One page per screen: `LoginPage`, `AuthCallbackPage`, `DashboardPage`, `NewDeploymentPage`, `DeploymentListPage`, `DeploymentDetailPage`, `QAApprovalPage`, `InfraDeploymentPage`, `AcknowledgmentPage`, `HistoryPage`, `AdminDashboardPage`, `UserManagementPage`.

## Frontend services (`frontend/src/services/`)

- `api.ts` — the shared Axios instance (Bearer token injection, 401 → redirect to `/login`); every other service imports this, never a raw Axios call
- `deployment.service.ts` — exports `deploymentService`, `qaService`, `infraService`, `acknowledgmentService`, `notificationService` as separate objects hitting `/api/v1/...`
- `auth.service.ts`, `admin.service.ts`

## Frontend state & config

- `store/authStore.ts` — Zustand + `persist` (key `neutara_auth`), also writes the JWT to `localStorage['neutara_token']` directly
- `config/msalConfig.ts` — MSAL config (`VITE_AZURE_CLIENT_ID`/`VITE_AZURE_TENANT_ID`, baked in at Vite build time)
- `types/index.ts` — the authoritative `DeploymentStatus` union (12 values; the backend's equivalent is missing `rejected_by_infra`)

## What doesn't exist yet

- No `backend/src/__tests__/` or `frontend/src/__tests__/` — no test files anywhere
- No test runner installed in either `package.json` (no Jest/Supertest/ts-jest, no Vitest/RTL/msw)
- No `.github/` directory — no CI/CD, no PR template
- No numbered migration framework — see `.claude/rules/architecture-boundaries.md`
