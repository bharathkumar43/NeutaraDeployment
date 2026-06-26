---
name: architectural-decisions
description: Key architectural decisions made for NeutaraDeployment and the reasoning behind each
metadata:
  type: project
---

## Request Number Generation: MAX() not COUNT()
Use `MAX(CAST(SUBSTRING(request_number FROM 4) AS INTEGER)) + 1` for generating `request_number`.
**Why:** COUNT-based generation causes unique constraint violations when records are deleted. Count drops but old numbers remain in the DB.
**How to apply:** Never change this back. If the query is ever touched, verify it uses MAX, not COUNT.

## Azure AD as Sole Auth Provider
Azure MSAL for SSO — no local username/password login.
**Why:** CloudFuze uses Microsoft 365 org-wide. Azure AD eliminates a separate credential store.
**How to apply:** Do not add a local login path. Azure AD is the only entry point.

## PostgreSQL over MySQL
PostgreSQL 15 is the canonical database. README.md has stale MySQL references — ignore them.
**Why:** All docker-compose, env examples, and migrations are PostgreSQL syntax.
**How to apply:** All new SQL must be PostgreSQL-compatible. Use `pg` driver only.

## Tailwind-Only Styling
No CSS modules, no styled-components, no inline styles.
**Why:** Consistency across the codebase and Tailwind's purge keeps the bundle lean.
**How to apply:** All styling through Tailwind utility classes. Inline `style={{}}` only for truly dynamic values like widths from data.

## Job IDs as Comma-Separated String in DB
`job_id` column stores a comma-separated string (e.g., "Aggregate,API,AutoDelta").
**Why:** Simpler schema — jobs are stored as a reference list, not a join table.
**How to apply:** Always split on comma before rendering: `job_id.split(',').map(s => s.trim())`. Render as individual pill chips, not a single string.
