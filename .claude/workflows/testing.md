# Testing Workflow

Use when adding test coverage to NeutaraDeployment. gstack's `/qa`/`/qa-only` drive a real browser against a running URL — use those for manual/end-to-end verification. This workflow is for actual test *files* (unit/integration), which only `@test-writer` produces.

---

## Step 0 — Check tooling exists first

Neither `backend/package.json` nor `frontend/package.json` currently has a test runner installed (see `.claude/memory/progress.md`). Before writing a single test, confirm or install:

```bash
# Backend
cd backend
npm install --save-dev jest supertest ts-jest @types/jest @types/supertest
# then add a jest.config.js and a "test": "jest" script to package.json

# Frontend
cd frontend
npm install --save-dev vitest @testing-library/react @testing-library/user-event msw jsdom
# then add a vitest.config.ts and a "test": "vitest" script to package.json
```

Don't skip this step silently — if asked to "add tests" and tooling isn't present, say so and propose this install first.

## Step 1 — Identify what needs coverage

Invoke `@test-writer` with the controller or component in question. It will read the code first to enumerate: happy path, validation errors (400), auth failures (401), role failures (403), not-found (404), and edge cases — per `.claude/rules/testing-standard.md`.

## Step 2 — Backend tests

- Location: `backend/src/__tests__/<name>.controller.test.ts`
- Jest + Supertest, hitting a real test PostgreSQL instance for all DB assertions — never mock the `pg` driver.
- Mock only external services: Microsoft Graph email calls, Azure AD token validation.
- Status-transition tests must cover the real 12-state machine (`.claude/memory/domain-knowledge.md`), not the simplified 5-step version — dev-raised happy path, infra-raised happy path (skips QA/ack), QA rejection, infra rejection, deployment failure.
- Request-number tests must verify: format (`/^DPR\d{4}$/`), no duplicate under concurrent creates, correctness after deletions (MAX-based, not COUNT-based).

## Step 3 — Frontend tests

- Location: `frontend/src/__tests__/<ComponentName>.test.tsx`, or co-located per `.claude/rules/testing-standard.md`
- React Testing Library, wrapped in `MemoryRouter` for anything using navigation.
- Mock API calls via `msw` handlers — never mock Axios directly (this project's `api.ts` is a shared instance; mocking it directly would hide real request-shape bugs).
- Test behavior (`getByRole`, `getByText`, `getByLabelText`), not implementation details or Tailwind class names.

## Step 4 — What not to test

- No snapshot tests.
- Don't test styling.
- Don't mock the PostgreSQL driver.

## Step 5 — Review

Run `/project:team-review` and gstack's `/review` on the new test files too — a wrong assertion that always passes is worse than no test.
