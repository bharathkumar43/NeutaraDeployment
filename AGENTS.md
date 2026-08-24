# Agents

Specialized subagents for NeutaraDeployment, defined in `.claude/agents/`. Invoke with `@agent-name` in chat. These are project-specific experts — for general-purpose review/QA/security/shipping, use gstack's commands instead (see `CLAUDE.md` → Available gstack Commands).

---

## researcher

**Role:** Investigates the codebase or external APIs without polluting the main session context.
**Capabilities:** Read/grep across the entire repo, trace call chains, fetch external docs (Azure AD, Microsoft Graph, PostgreSQL).
**Invoke when:** You need to understand how a feature works before changing it, or trace a bug back to its root cause.
**Handoff:** Returns a structured summary — **Answer**, **Evidence** (file:line), **Gotchas** (non-obvious constraints), **Related areas**.

## architect

**Role:** Plans schema, route, and role-boundary decisions before code is written.
**Capabilities:** Knows where logic belongs (route vs. controller vs. service), when a schema change is needed, when a decision sets a precedent worth recording in `.claude/memory/decisions.md`.
**Invoke when:** A change touches the DB schema, adds/changes a role or permission, or introduces a new module.
**gstack overlap:** gstack's `/plan-eng-review` reviews a drafted plan against general engineering best practice; `@architect` is the narrower step before that — deciding where in *this* codebase something belongs.
**Handoff:** Returns **Plan** (ordered file list), **Precedent check** (against `decisions.md`), **Open questions**.

## code-reviewer

**Role:** Deep review of a diff against NeutaraDeployment's own conventions (response envelope, MAX()-not-COUNT(), `job_id` comma-separated handling, auth middleware order, status-machine correctness).
**Invoke when:** Before merging any controller, route, or schema change — in addition to, not instead of, gstack's `/review`.
**gstack overlap:** `/review` catches general bugs and logic errors; `@code-reviewer` catches violations of conventions gstack has no way to know about. Run both.
**Handoff:** Numbered findings, most severe first — **[SEVERITY]** `file:line` — description — fix.

## security-reviewer

**Role:** Audits code changes for security vulnerabilities.
**Capabilities:** OWASP Top 10, SQL injection, XSS, JWT misuse, missing auth middleware, exposed secrets, insecure CORS, rate limiting gaps, this project's specific Azure-token-verification boundary.
**Invoke when:** Adding new routes, changing auth logic, handling user input, modifying CORS/rate-limit config, before any merge to main.
**gstack overlap:** gstack's `/cso` is the broad security audit; `@security-reviewer` covers the project-specific risks `/cso` won't know (Multer config specifics, the un-verified `jwt.decode` path in `azureAuth.ts`).
**Handoff:** Findings list with `file:line`, severity (critical/high/medium/low), and recommended fix per item.

## test-writer

**Role:** Writes integration and unit tests for new features or bug fixes.
**Capabilities:** Jest + Supertest for Express API tests, React Testing Library for frontend components — per `.claude/rules/testing-standard.md`.
**Invoke when:** A new controller endpoint is added, a bug fix needs a regression test, or a component needs coverage.
**Important:** No test runner is currently installed in either `backend/` or `frontend/` (see `.claude/memory/progress.md`). This agent will flag that and propose the install step before generating test files that can't run yet.
**gstack overlap:** None — gstack's `/qa` drives a real browser against a URL, it doesn't generate test files. This agent is the only source of test code here.
**Handoff:** Returns complete runnable test file(s) for `backend/src/__tests__/` or `frontend/src/__tests__/`.

---

## Handoff Protocol

1. State the task clearly when invoking: `@researcher how does the QA approval flow update deployment status?`
2. The agent works in isolation — it cannot see your current conversation context.
3. Review the agent's output before acting on it. Trust but verify.
4. If the agent produces code, run it through `.claude/commands/team-review.md` (or gstack's `/review`) before committing.
5. For schema or role-boundary changes, run `@architect` before `@code-reviewer` — plan first, then review what got built against the plan.
