# Testing Standards

## Backend (Jest + Supertest)
- Test files go in `backend/src/__tests__/`.
- One file per controller: `deployment.controller.test.ts`.
- Use a dedicated test database. Never run tests against the dev or production DB.
- Mock only external services (email via Microsoft Graph, Azure AD token validation).
- Hit a real test PostgreSQL instance for all DB assertions.

Every new API endpoint needs at minimum:
- Happy path (200/201 with valid payload)
- Missing required fields (400)
- Unauthenticated request (401)
- Wrong role (403)
- Resource not found where applicable (404)

## Frontend (React Testing Library)
- Test files co-located: `ComponentName.test.tsx` next to the component.
- Test user behaviour, not implementation details.
- Prefer `getByRole`, `getByText`, `getByLabelText` over `getByTestId`.
- Mock API calls via `msw` (Mock Service Worker) — never mock Axios directly.

## Deployment Workflow Tests
Cover the real 12-state machine (`.claude/memory/domain-knowledge.md`), not a simplified linear chain:
```
draft → pending_qa_approval → pending_infra_deployment → pending_dev_acknowledgment → successfully_completed   (dev-raised happy path)
pending_infra_deployment → successfully_completed                                                              (infra-raised — skips QA and dev ack)
pending_qa_approval → rejected_by_qa
pending_infra_deployment → rejected_by_infra
deployment_in_progress → deployment_failed
```

## General
- No snapshot tests — they create churn with zero signal.
- Never commit a failing or skipped test. Fix or delete it.
- Target: 80% coverage on backend controllers. Frontend coverage is secondary to integration tests.
- **Current reality:** no CI/CD pipeline exists yet (no `.github/workflows/`), and no test runner is installed in either `backend/` or `frontend/` — see `.claude/memory/repository-map.md`. This "tests must pass in CI" bar is the target to build toward, not the current enforced state; don't claim CI is blocking merges until it actually exists.
