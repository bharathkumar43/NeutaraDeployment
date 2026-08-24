---
description: Triggered when reviewing code changes, checking a diff, auditing a PR, or when the user says "review my changes", "check this code", "is this safe to merge", or "look at the diff".
---

# Code Review Skill

This teaches NeutaraDeployment's own conventions — it does not replace gstack's `/review`, which covers general bugs and logic errors gstack knows nothing about being specific to this repo. Run both. This skill is what makes `/project:team-review` and the `@code-reviewer` agent consistent regardless of which one triggers.

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
- `job_id` is a comma-separated string, not an array or join table — new code reading it must split/trim before use.
- A deployment-status transition written anywhere other than the four lifecycle controllers, without a matching `createAuditLog()` call, breaks the audit trail (`.claude/memory/domain-knowledge.md`).

## Output Format
Numbered list: **[SEVERITY]** `file:line` — description — one-line fix.
Severities: CRITICAL | HIGH | MEDIUM | LOW | INFO
