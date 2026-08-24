---
description: Triggered when designing a new API endpoint, adding a route, or asking "how should this endpoint look", "what status code", "how should this response be shaped" for NeutaraDeployment.
---

# API Design Skill

Full detail in `.claude/rules/api-conventions.md` — this is the operational checklist for designing a *new* endpoint consistent with the existing ones.

## Before writing the route

1. **Resource or sub-action?** Plural resource (`/deployments`, `/notifications`) for CRUD; `POST /deployments/:id/<verb>` for a state-changing sub-action (`/submit`, `/approve`, `/start`, `/complete`, `/acknowledge`) — follow the existing verbs, don't invent new ones for the same concept.
2. **Meta endpoint?** Read-only lookups that aren't a resource (next request number, job list, branch list) go under `/deployments/meta/<name>`, not a top-level route.
3. **Which roles?** Decide the `authorize([...])` list before writing the handler — this determines the route signature.

## Response envelope — non-negotiable

```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "Human-readable error description" }
```
Never a bare array or object. `res.json()` exactly once per code path.

## Status codes

| Code | When |
|---|---|
| 200 | GET/PUT success |
| 201 | POST success (created) |
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Wrong role |
| 404 | Not found |
| 500 | Unexpected error |

## Pagination

List endpoints: `?page=1&limit=20` in, `{ data: [], total, page, limit }` out — match `getDeployments`/`getAuditLogs` exactly, don't invent a different shape for a new list endpoint.

## Route wiring order

```typescript
router.post('/route', authenticate, authorize(['dev', 'admin']), controllerFn);
```
This exact order, every time — `authenticate` before `authorize`, both before the handler.

## Request-number-style generation

Any "next sequential identifier" follows the `MAX(CAST(SUBSTRING(...) AS INTEGER)) + 1` pattern used for `request_number` — never `COUNT(*)`. If you're designing a new ID scheme, reuse this pattern rather than inventing a new one.
