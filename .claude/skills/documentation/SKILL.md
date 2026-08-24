---
description: Triggered when updating CLAUDE.md, adding a memory file, documenting a new decision, or asking "where should this be documented" for NeutaraDeployment.
---

# Documentation Skill

This project keeps documentation split by lifespan and audience — putting something in the wrong place is why docs go stale. Use this to decide where a piece of knowledge belongs, not to write general documentation prose (gstack's `/document-release` and `/document-generate` handle release notes and generated docs).

## Where does this fact belong?

- **Stable, load-every-session fact** (tech stack, hard rule, top-level directory map) → `CLAUDE.md`. Keep it under ~300 lines — link out, don't inline detail.
- **Personal/machine-specific preference** → `CLAUDE.local.md` (gitignored, never committed).
- **Detailed, single-topic convention someone reads only when working in that area** → `.claude/rules/<topic>.md`.
- **"Why did we do it this way" / precedent that should bind future changes** → `.claude/memory/decisions.md`, structured as rule → **Why:** → **How to apply:**.
- **Facts about how the system currently works** (the real status machine, the auth flow, which file owns what) → `.claude/memory/architecture.md`, `domain-knowledge.md`, or `repository-map.md`.
- **What's in flight or recently done, and known gaps** → `.claude/memory/progress.md`. This one goes stale fast — update it, don't just append.
- **A repeatable multi-step process** → `.claude/workflows/<name>.md`, referencing gstack commands where gstack already does that step (see any existing workflow file for the pattern).
- **A one-shot invocable action** → `.claude/commands/<name>.md`, checked first against the gstack command list in `CLAUDE.md` to avoid a name collision.

## Writing style for this project's docs

- State the fact, then **why**, then **how to apply** — not a narrative. A future Claude session should be able to skim, not read prose.
- Cite exact file paths and exact identifiers (table names, column names, function names) — vague references ("the auth file") force a re-read of the whole codebase, which defeats the point of writing it down.
- If a doc claims something exists (a file, a function, a config value), verify it's still true before relying on it — several existing docs here had drifted from the actual code (a wrong file path, a simplified status list) before this pass corrected them. Don't let it happen again: when you touch code that a doc describes, check the doc in the same change.
- Don't duplicate gstack's own documentation of its commands — link to `CLAUDE.md`'s gstack section instead of re-explaining what `/ship` or `/review` do.
