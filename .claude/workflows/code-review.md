# Code Review Workflow

Use before merging any branch into main. This project-specific workflow is meant to run alongside gstack's `/review` — it adds the NeutaraDeployment-specific passes gstack doesn't know about.

---

## Step 1 — Get the full diff
```bash
git diff main...HEAD
git log main...HEAD --oneline
```

## Step 2 — Security pass
Invoke `@security-reviewer` with the list of changed files (and gstack's `/cso` if the change is broadly security-sensitive, not just NeutaraDeployment-specific).
Block merge on any CRITICAL or HIGH findings.

## Step 3 — Quality pass
Run `/project:team-review` (project conventions) and gstack's `/review` (general bugs/logic errors) — together they check types, API conventions, role enforcement, and known footguns.

## Step 4 — Migration check
If any file in `backend/src/database/` changed:
- Is the migration additive? (No destructive column drops without a plan)
- Does it run inside a transaction? (`BEGIN; ... COMMIT;`)
- Is there a rollback path?

## Step 5 — Checklist
Run through this before approving:
- [ ] `npx tsc --noEmit` passes in `backend/`
- [ ] No `.env` secrets visible in the diff
- [ ] All new routes have `authenticate` + `authorize` middleware
- [ ] DB migration included if schema changed
- [ ] No `console.log` left in committed code
- [ ] Commit messages follow `type(scope): description` format
- [ ] `CLAUDE.local.md` is NOT in the diff (it's gitignored)

## Step 6 — Ship
Use gstack's `/ship` to open the PR (reads `.claude/rules/pr-standard.md`). Squash-merge to main once approved. Delete the feature branch after merge. Tag with version if this is a release candidate.

## Step 7 — Deploy
Follow `/project:deploy` (this project's actual manual Docker Compose deploy — there is no CI/CD) or gstack's `/land-and-deploy` if it's been configured for this host.
