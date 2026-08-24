# Bug Fix Workflow

Use when fixing a reported bug in NeutaraDeployment. This workflow's Step 2 is where gstack's `/investigate` can substitute for or supplement `@researcher` if the bug is unclear enough to need gstack's broader investigation approach.

---

## Step 1 — Reproduce
Identify exactly:
- What error message appears (exact text)?
- Which page or action triggers it?
- Which user role is affected?
- Is it consistent or intermittent?

## Step 2 — Trace
Invoke `@researcher` to find the root cause. Trace from symptom to source:
- Frontend error → which API call failed?
- API error → which controller and which line?
- DB error → which query? Is it a constraint, a null, a type mismatch?

## Step 3 — Fix
Make the minimal change that addresses the root cause.
- Do NOT refactor surrounding code in the same commit.
- Do NOT add unrelated improvements.
- If the fix touches DB queries: verify it handles NULL (COALESCE), deletions (MAX not COUNT), and concurrent writes.

## Step 4 — Verify
- Does the fix handle the exact scenario that caused the bug?
- Does it handle adjacent edge cases (empty table, deleted records, concurrent users)?
- Does it break any other functionality in the same controller or component?

## Step 5 — Review
Run `/project:team-review` (project-specific checklist) and gstack's `/review` (general bugs/logic errors) on the diff. Even small bug fixes can introduce security regressions.

## Step 6 — Commit and ship
```bash
git add <specific files — never git add .>
git commit -m "fix(<scope>): <what was broken and how it's fixed>"
```
Use gstack's `/ship` to open the PR (reads `.claude/rules/pr-standard.md` for format).

## Step 7 — Deploy
Once merged, use `/project:deploy` (this project's actual Docker Compose deploy steps) or gstack's `/land-and-deploy` if configured for this host.
