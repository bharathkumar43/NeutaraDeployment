# Security Rules

Project-specific security rules for NeutaraDeployment. gstack's `/cso` covers general security audit practice — these are the rules specific to *this* codebase that `/cso` has no way to know.

## Authentication

- Every protected route: `authenticate` then `authorize([roles])`, in that exact order (`backend/src/middleware/auth.ts`). A route with neither is an open, unauthenticated endpoint.
- `req.user` is only ever populated by `authenticate` from a verified JWT (`verifyToken`, `backend/src/utils/jwt.ts`). Never accept a role, user ID, or email from `req.body` for authorization decisions.
- `JWT_SECRET` must be set in every environment. The code has a hardcoded fallback (`'fallback_secret_change_in_production'`) for local dev only — flag any deployment config that doesn't set a real `JWT_SECRET`.

## Azure AD Token Handling

- `azureLogin` (`POST /api/v1/auth/azure`) decodes a client-supplied Azure `idToken` with `jwt.decode` — **no signature verification**. This is acceptable only as a secondary/manual path; it must never become the primary login flow.
- `azureExchange` (`POST /api/v1/auth/azure-exchange`) is the production path: the backend exchanges the OAuth `code` server-side against `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` using `AZURE_CLIENT_SECRET`, which is how the token is actually trusted. Any change to this flow that removes the server-side exchange is a CRITICAL regression.
- New user auto-provisioning is restricted to `@cloudfuze.com` email domains in `resolveAzureUser()` — do not widen this without an explicit decision recorded in `.claude/memory/decisions.md`.

## Database

- All queries go through `query(sql, [params])` from `backend/src/database/connection.ts`. String-concatenated SQL is CRITICAL, no exceptions.
- `DB_PASSWORD` and all DB credentials come from environment variables only, never hardcoded — and never placed in `.claude/settings.local.json` or any other file that could end up in a code snippet, screenshot, or log. If you find a plaintext credential in a local config file, flag it for removal even though the file itself is gitignored.

## File Uploads

- Multer (`backend/src/middleware/upload.ts`) — infra deployment screenshots. Must keep: `fileSize` limit from `MAX_FILE_SIZE`, MIME allowlist (`jpeg|jpg|png|gif|webp|pdf`), UUID-generated filenames (never trust the client's original filename for storage). Files land in `UPLOAD_DIR` and are served back — never let user-controlled path segments reach `fs` calls unsanitized.

## CORS & Rate Limiting

- Allowed origin must be `process.env.FRONTEND_URL` only. A wildcard `*` on any credentialed route is CRITICAL.
- Login and other public-facing submission endpoints must sit behind the rate-limit middleware (`RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX`) — verify it's actually mounted on the route, not just configured.

## Secrets in General

- No hardcoded passwords, JWT secrets, Azure credentials, or API keys in source files — `process.env` only.
- Never commit `.env`, `backend/.env`, or `.claude/settings.local.json` (all gitignored — verify a `git status` before committing if you've touched config).
- `backend/logs/error.log` is currently tracked in git despite `.gitignore` covering `*.log`/`logs/` (it was committed before those rules existed). Don't let it become a place secrets leak into via logged request bodies — check `backend/src/utils/logger.ts` usage doesn't log full request bodies or tokens.

## Frontend

- Client-side role checks (`ROLE_PERMISSIONS` in `authStore.ts`, `ProtectedRoute` in `App.tsx`) are UX only — they hide UI, they do not enforce security. Every server route must independently enforce the same boundary with `authorize()`.
- No `dangerouslySetInnerHTML` with user-supplied data anywhere in `frontend/src/`.
