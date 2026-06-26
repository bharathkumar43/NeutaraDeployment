---
name: progress
description: Recent work completed and known open items in NeutaraDeployment
metadata:
  type: project
---

## Completed

- **fix(deployment):** Duplicate `request_number` bug — switched from COUNT(*) to MAX() in `deployment.controller.ts`
- **fix(ui):** Job IDs now render as individual pill/chip tags — `InfraDeploymentPage.tsx`, `DeploymentDetailPage.tsx`
- **feat(admin):** Admin calendar view added
- **feat(history):** History page updated
- **feat(ui):** UI job added to job list

## Known Open Items

- No automated test suite exists yet — controllers are untested
- README.md has merge conflict artifacts (stale MySQL references) — needs cleanup
- `.claude/hooks/*.sh` files need to be registered in `.claude/settings.json` under the `hooks` key to take effect
- `CLAUDE.local.md` not yet created — each developer should create their own machine-specific override file (gitignored)

## Infrastructure Notes

- Deployed via Docker Compose on Linux server (`bharath@DXDS3053`)
- Deploy command: `git pull origin main && sudo docker compose up -d --build`
- The server's `.config` directory ownership was previously broken (owned by root) — fixed with `sudo chown -R bharath:bharath /home/bharath/.config`
- Git repo ownership warning resolved with `git config --global --add safe.directory /home/bharath/NeutaraDeployment`
