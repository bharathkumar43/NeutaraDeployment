Fix a reported bug in NeutaraDeployment, following `.claude/workflows/bug-fix.md`.

Given the bug report in $ARGUMENTS:

1. Reproduce: pin down the exact error message, the page/action that triggers it, the affected role, and whether it's consistent or intermittent. If you need a real browser to confirm it, use gstack's `/qa <url>` instead of guessing.
2. Trace: invoke `@researcher` to find the root cause — frontend call → service → route → controller → DB query.
3. Fix: make the minimal change that addresses the root cause. No unrelated refactors, no drive-by improvements. If the fix touches DB queries, verify NULL handling (`COALESCE`), deletion safety (`MAX()` not `COUNT()`), and concurrent-write safety.
4. Verify: confirm the fix handles the exact reported scenario plus adjacent edge cases (empty table, deleted records, concurrent users), and doesn't break sibling functionality in the same controller/component.
5. Review: run `.claude/commands/team-review.md` and gstack's `/review` — small bug fixes can still introduce security regressions.
6. Do not open a PR from this command — use gstack's `/ship` once reviewed.

Bug: $ARGUMENTS
