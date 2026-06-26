# Code Style

## TypeScript
- Strict mode is on. Resolve all type errors before committing.
- Use `interface` for object shapes, `type` for unions/intersections/aliases.
- Prefer `const` over `let`. Never `var`.
- Async functions must have explicit return types.
- No `as any` casts without a comment explaining why it's unavoidable.

## Naming
- Files: `kebab-case.ts` for utilities, `PascalCase.tsx` for React components.
- Variables/functions: `camelCase`. Classes/interfaces: `PascalCase`. Constants: `UPPER_SNAKE_CASE`.
- Database columns: `snake_case`. TypeScript properties: `camelCase` (map at the service layer).
- Boolean variables/props: prefix with `is`, `has`, `can`, `should`.

## React
- Functional components only. No class components.
- One component per file.
- Props interface named `<ComponentName>Props`.
- Use Tailwind utility classes only. No inline `style={{}}` except truly dynamic values (e.g., width % from data).
- Avoid `useEffect` for derived state — compute it inline or with `useMemo`.

## Express
- All controller functions are `async (req: Request, res: Response): Promise<void>`.
- Always call `res.json()` exactly once per code path — no early returns without a response.
- Validate request body with `express-validator` before touching the database.
- Never pass `req.body` directly to a DB query — destructure only the fields you need.

## General
- No `console.log` in committed code. Use Winston logger in backend; remove debug logs in frontend.
- Max line length: 120 characters.
- Trailing commas in multi-line arrays/objects.
- No commented-out code blocks — delete unused code, git history preserves it.
