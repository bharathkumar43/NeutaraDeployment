Review the current git diff for bugs, security issues, and code quality problems specific to NeutaraDeployment.

Check for:
1. Missing `authenticate` or `authorize` middleware on any new Express routes
2. SQL queries using string concatenation instead of parameterized `query(sql, [params])`
3. TypeScript type errors or unsafe `any` casts
4. API responses not following the `{ success, data/message }` envelope shape
5. `COUNT(*)` used for ID/number generation (should be `MAX()`)
6. Hardcoded secrets or `.env` values in source code
7. `console.log` left in committed code
8. React components with inline styles instead of Tailwind classes

Report as a numbered list: **[SEVERITY]** `file:line` — issue — recommended fix.

$ARGUMENTS
