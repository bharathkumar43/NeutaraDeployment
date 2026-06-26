---
description: Triggered when writing tests, adding test coverage, or when the user asks "how do I test this", "write a test for", or "add test coverage".
---

# Testing Patterns Skill

For NeutaraDeployment, use these patterns as starting points.

## Backend Controller Test (Jest + Supertest)
```typescript
import request from 'supertest';
import app from '../server';

describe('POST /api/v1/deployments', () => {
  it('returns 201 with valid payload', async () => {
    const res = await request(app)
      .post('/api/v1/deployments')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ deployment_title: 'Test', ... });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.request_number).toMatch(/^DPR\d{4}$/);
  });

  it('returns 400 when required field missing', async () => { ... });
  it('returns 401 without auth token', async () => { ... });
  it('returns 403 when non-dev role submits', async () => { ... });
});
```

## Frontend Component Test (React Testing Library)
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Always wrap with MemoryRouter for components that use navigation
// Mock API calls via msw handlers — never mock axios directly
```

## Deployment Workflow Status Transitions
Always test the full happy path and the rejection path:
```
draft → pending_qa_approval → qa_approved → deployed → acknowledged
draft → pending_qa_approval → qa_rejected
```

## What NOT to test
- Don't write snapshot tests.
- Don't test Tailwind class names — test behaviour, not styling.
- Don't mock the PostgreSQL driver — use a real test DB.
