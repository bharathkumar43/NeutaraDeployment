# Agents

Specialized subagents for NeutaraDeployment. Invoke with `@agent-name` in chat.

---

## security-reviewer

**Role:** Audits code changes for security vulnerabilities.
**Capabilities:** OWASP Top 10, SQL injection, XSS, JWT misuse, missing auth middleware, exposed secrets, insecure CORS, rate limiting gaps.
**Invoke when:** Adding new routes, changing auth logic, handling user input, modifying CORS/rate-limit config, before any merge to main.
**Handoff:** Returns findings list with `file:line`, severity (critical/high/medium/low), and recommended fix per item.

---

## test-writer

**Role:** Writes integration and unit tests for new features or bug fixes.
**Capabilities:** Jest + Supertest for Express API tests, React Testing Library for frontend components.
**Invoke when:** A new controller endpoint is added, a bug fix needs a regression test, or a component needs coverage.
**Handoff:** Returns complete runnable test file(s) for `backend/src/__tests__/` or `frontend/src/__tests__/`.

---

## research

**Role:** Investigates the codebase or external APIs without polluting the main session context.
**Capabilities:** Read/grep across the entire repo, trace call chains, fetch external docs (Azure AD, Microsoft Graph, PostgreSQL).
**Invoke when:** You need to understand how a feature works before changing it, or trace a bug back to its root cause.
**Handoff:** Returns a structured summary — **Answer**, **Evidence** (file:line), **Gotchas** (non-obvious constraints).

---

## Handoff Protocol

1. State the task clearly when invoking: `@research how does the QA approval flow update deployment status?`
2. The agent works in isolation — it cannot see your current conversation context.
3. Review the agent's output before acting on it. Trust but verify.
4. If the agent produces code, paste it back to the main session for a `/project:review` pass before committing.
