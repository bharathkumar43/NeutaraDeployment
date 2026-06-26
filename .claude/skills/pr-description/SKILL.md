---
description: Triggered when creating a PR description, writing a commit message, or summarizing changes for a pull request.
---

# PR Description Skill

## Step 1 — Read the diff
```bash
git diff main...HEAD
git log main...HEAD --oneline
```

## Step 2 — Classify the change
- **type:** feat / fix / refactor / chore / docs / test
- **scope:** auth / deployment / qa / infra / admin / email / ui / db

## Step 3 — Write title
`<type>(<scope>): <description>` — under 72 characters.
Be specific: "fix(deployment): use MAX() to prevent duplicate request_number" not "fix bug".

## Step 4 — Write body
```
## What changed
- [bullet: specific thing that changed]
- [bullet: another specific thing]

## Why
[The motivation — was it a bug report, a feature request, a performance issue?]

## DB Migrations
[Yes — filename | No]

## New Env Variables
[List any additions to .env.example, or "None"]

## Testing
[What was tested manually or via automated tests]
```

## Anti-patterns to avoid
- "Updated code" — say what was updated and why.
- "Fixed issue" — say what the issue was and how it manifests.
- "Minor changes" — every change has a reason; state it.
