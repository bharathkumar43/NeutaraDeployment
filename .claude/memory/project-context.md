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

**Deployment lifecycle:**
1. `dev` creates request (draft or submit to QA)
2. `qa` approves or rejects
3. `infra` deploys and uploads screenshot
4. `dev` acknowledges the deployment

**Request number format:** `DPRxxxx` (4-digit zero-padded)
Generated server-side only. Uses `MAX(numeric_part) + 1` — NOT `COUNT(*) + 1`.

**Why MAX not COUNT:** COUNT drops when records are deleted; MAX always produces a value higher than any existing number, preventing unique constraint violations on `deployment_requests_request_number_key`.

**How to apply:** Never revert to COUNT-based generation. If touching request number logic, verify the MAX-based SQL query is intact.

**Email:** Microsoft Graph API with `Mail.Send` permission. Sends to QA, Infra, and Dev distribution lists defined in `.env`.

**Auth:** Azure AD SSO → backend validates Azure token → issues 24h JWT → frontend stores in memory (Zustand).

**Database:** PostgreSQL is canonical. README.md has stale MySQL references — ignore them.
