---
description: Triggered when reviewing code changes, checking a diff, auditing a PR, or when the user says "review my changes", "check this code", "is this safe to merge", or "look at the diff".
---

# Code Review Skill

When reviewing code for NeutaraDeployment, always check these in order:

## 1. Security (highest priority)
- Every new Express route must have `authenticate` then `authorize([roles])` middleware.
- All DB queries must use parameterized form: `query(sql, [params])` — never string interpolation.
- No secrets, API keys, or passwords hardcoded in source files.
- File uploads must have size limits and type validation (Multer config).

## 2. Type Safety
- No `as any` casts without an explanatory comment.
- Controller functions typed as `async (req: Request, res: Response): Promise<void>`.
- All `req.body` fields destructured and typed before use.

## 3. API Contract
- All responses use `{ success: boolean, data?, message? }` envelope.
- Status codes follow the table in `.claude/rules/api-conventions.md`.
- No early returns that skip sending a response.

## 4. Known Project Footguns
- `COUNT(*)` for request number generation → must be `MAX()`.
- Direct `req.body` passed to queries → must destructure first.
- Missing role check → always verify `req.user.role` server-side.

## Output Format
Numbered list: **[SEVERITY]** `file:line` — description — one-line fix.
Severities: CRITICAL | HIGH | MEDIUM | LOW | INFO
