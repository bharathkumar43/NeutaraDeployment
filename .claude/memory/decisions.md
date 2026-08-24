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

## gstack Adoption: Renamed Files to Avoid Command Collisions
When adding gstack (Garry Tan's Claude Code toolkit, installed globally at `~/.claude/skills/gstack`) as the shared AI-assisted workflow layer, three existing project files collided with reserved gstack slash-command or subagent names:
- `.claude/commands/review.md` → renamed to `.claude/commands/team-review.md` (gstack reserves `/review` for its own general-purpose diff review).
- `.claude/rules/pr.md` → renamed to `.claude/rules/pr-standard.md` (no direct collision, but aligned to the naming gstack integration used elsewhere and to distinguish it as this project's PR *content* standard vs. gstack's `/ship` which opens the PR).
- `.claude/agents/research.md` → renamed to `.claude/agents/researcher.md` (matches the naming convention used by the other four project agents — `architect`, `code-reviewer`, `security-reviewer`, `test-writer` — added in the same pass).
**Why:** gstack's `/review` and this project's old `/project:review` would otherwise be ambiguous to invoke, and a future contributor typing `/review` expecting the project checklist would silently get gstack's generic one instead (or vice versa).
**How to apply:** Any new project command or agent name must be checked against gstack's reserved command list in `CLAUDE.md` before being added. Existing references to the old names (`review.md`, `pr.md`, `research.md`, `@research`, `/project:review`) were updated across `AGENTS.md`, `.claude/workflows/*.md`, and the skill/agent files that referenced them.

## Local Secret Hygiene: Plaintext Password Found in settings.local.json
A repo audit found a plaintext database password embedded directly in two `Bash` permission-allow entries inside `.claude/settings.local.json`.
**Why this is only a warning, not a blocking finding:** `settings.local.json` is gitignored and was never committed — it isn't a version-control leak. But it's still a real credential sitting in plaintext on a contributor's disk, which is worth avoiding regardless of git status (screenshots, backups, other tooling that reads local config could pick it up).
**How to apply:** Don't add new permission-allow entries (or any config) containing literal passwords/secrets, even to gitignored local files — reference the DB via `psql` with an interactive prompt, a `.pgpass` file, or an env var instead. If you see a credential in a local config file while working in this repo, flag it for removal rather than propagating the pattern.
