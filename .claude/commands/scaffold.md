Scaffold a new feature module for NeutaraDeployment. Use `deployment` as the reference pattern.

Given the feature name in $ARGUMENTS, create these files:

**Backend:**
1. `backend/src/controllers/<name>.controller.ts` — CRUD stubs following the pattern in `deployment.controller.ts`. All functions are `async (req, res): Promise<void>`. Responses use `{ success, data }` envelope.
2. `backend/src/routes/<name>.routes.ts` — Express router with `authenticate` + `authorize` on all routes, following `deployment.routes.ts`.
3. Register the new router in `backend/src/server.ts` under `/api/v1/<name>`.

**Frontend:**
4. Add TypeScript interface to `frontend/src/types/index.ts`.
5. `frontend/src/services/<name>.service.ts` — Axios wrapper following `deployment.service.ts`.
6. `frontend/src/pages/<Name>Page.tsx` — stub page component with the AppLayout wrapper.
7. Register the new route in `frontend/src/App.tsx` with the appropriate role guard.

Do NOT scaffold test files — use `@test-writer` for that after the feature is built.

Feature name: $ARGUMENTS
