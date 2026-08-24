---
name: project-context
description: Core facts about NeutaraDeployment — stack, ports, roles, workflow, and key architectural decisions
metadata:
  type: project
---

NeutaraDeployment is CloudFuze's internal deployment request tracking system.

**Stack:** React 18 + TypeScript (Vite, Tailwind, Zustand, Azure MSAL) · Express 4 + TypeScript · PostgreSQL 15 · Docker Compose · Microsoft Graph API (email)

**Ports:** Frontend :3201 · API :3200 · PostgreSQL :5432

**Roles (RBAC):** `admin` · `dev` · `qa` · `infra` · `viewer`

**Deployment lifecycle (simplified):**
1. `dev` creates request (draft or submit to QA) — or `infra` raises one directly, skipping QA
2. `qa` approves or rejects
3. `infra` deploys and uploads screenshot
4. `dev` acknowledges the deployment (skipped for infra-raised requests)

The real status machine has 12 values, not this 4-step summary — see `.claude/memory/domain-knowledge.md` for the ground-truthed version before relying on this simplification.

**Request number format:** `DPRxxxx` (4-digit zero-padded)
Generated server-side only. Uses `MAX(numeric_part) + 1` — NOT `COUNT(*) + 1`.

**Why MAX not COUNT:** COUNT drops when records are deleted; MAX always produces a value higher than any existing number, preventing unique constraint violations on `deployment_requests_request_number_key`.

**How to apply:** Never revert to COUNT-based generation. If touching request number logic, verify the MAX-based SQL query is intact.

**Email:** Microsoft Graph API with `Mail.Send` permission. Sends to QA, Infra, and Dev distribution lists defined in `.env`.

**Auth:** Azure AD SSO → backend exchanges the auth code server-side → issues 24h JWT → frontend persists it to `localStorage` (both via Zustand's `persist` middleware and a direct `localStorage` write) — not memory-only. See `.claude/memory/architecture.md` for the full auth flow, including the two other login paths.

**Database:** PostgreSQL is canonical. README.md has stale MySQL references — ignore them.
