# API Conventions

## Response Shape
All endpoints return a consistent JSON envelope:
```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "Human-readable error description" }
```
Never return bare objects or arrays. Always wrap in the envelope.

## Routes
- Prefix: `/api/v1/`
- Resource names are plural: `/deployments`, `/users`, `/notifications`
- Sub-actions: `POST /deployments/:id/submit`, `POST /deployments/:id/approve`
- Meta/preview endpoints: `GET /deployments/meta/next-number`

## Auth Middleware Order
Every protected route must follow this exact order:
```typescript
router.post('/route', authenticate, authorize(['dev', 'admin']), controllerFn);
```
- `authenticate` — verifies JWT, sets `req.user`
- `authorize([roles])` — checks `req.user.role` is in the allowed list

## Status Codes
| Code | When to use |
|------|-------------|
| 200  | GET / PUT success |
| 201  | POST success (resource created) |
| 400  | Validation error (missing/invalid fields) |
| 401  | Not authenticated (no/invalid token) |
| 403  | Not authorized (wrong role) |
| 404  | Resource not found |
| 500  | Unexpected server error |

## Deployment Request Statuses (in order)
```
draft → pending_qa_approval → qa_approved / qa_rejected → deployed → acknowledged
```

## Request Number Format
- Format: `DPRxxxx` (4-digit zero-padded, e.g. DPR0001)
- Always generated server-side
- Use `MAX(CAST(SUBSTRING(request_number FROM 4) AS INTEGER))` not `COUNT(*)`
- Reason: COUNT drops when records are deleted; MAX never produces a duplicate

## Pagination
List endpoints accept `?page=1&limit=20`. Response includes `{ data: [], total, page, limit }`.
