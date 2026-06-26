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
Always cover all status transitions:
```
draft → pending_qa_approval → qa_approved → deployed → acknowledged
draft → pending_qa_approval → qa_rejected
```

## General
- No snapshot tests — they create churn with zero signal.
- Never commit a failing or skipped test. Fix or delete it.
- Target: 80% coverage on backend controllers. Frontend coverage is secondary to integration tests.
- Tests must pass in CI before merge. There is no manual override.
