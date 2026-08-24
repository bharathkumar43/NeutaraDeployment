---
name: domain-knowledge
description: The real 12-state deployment status machine and exact request-number generation SQL, ground-truthed against the controller code
metadata:
  type: project
---

## The deployment status machine (ground truth, not the simplified version)

`deployment_requests.status` CHECK constraint (`backend/src/database/schema.sql` + `migration_fix.sql`) has 12 values:

```
draft, pending_qa_approval, qa_approved, rejected_by_qa,
pending_infra_deployment, deployment_in_progress, deployment_completed,
deployment_failed, pending_dev_acknowledgment,
successfully_completed, issue_raised, rejected_by_infra
```

**Why this matters:** older docs (and some rule files, since corrected) simplified this to `draft → pending_qa_approval → qa_approved/qa_rejected → deployed → acknowledged`. That simplified chain does not match the actual code — `qa_approved` and `deployment_completed` are legal CHECK values that no controller ever actually writes. Don't design new logic against the simplified version; check the controller.

**Actual transitions, by controller:**

1. **Create** (`createDeployment`, `deployment.controller.ts`) — dev/admin submission → `pending_qa_approval`. Infra-role submission skips QA entirely → `pending_infra_deployment` (tagged `extra_meta.raised_by_infra = true`). Explicit `status: 'draft'` in the body stays `draft`.
2. **QA review** (`processQAApproval`, `qa.controller.ts`) — valid only from `pending_qa_approval`. `approval_status` → status map: `approved → pending_infra_deployment` (not `qa_approved`), `rejected → rejected_by_qa`, `sent_back → draft`.
3. **Infra start** (`startDeployment`, `infra.controller.ts`) — valid only from `pending_infra_deployment` → `deployment_in_progress`; creates a `deployment_infra_logs` row (`deployment_status='in_progress'`).
4. **Infra complete** (`completeDeployment`) — valid from `deployment_in_progress` or `pending_infra_deployment`. `deployment_status='success'`: infra-raised → `successfully_completed` directly (no dev ack needed); dev-raised → `pending_dev_acknowledgment`. `'failed'` → `deployment_failed`.
5. **Infra review/reject** (`infraReview`) — valid only from `pending_infra_deployment`. `sent_back` → `pending_qa_approval` (or `draft` if infra-raised, since there's no QA to send back to). `rejected` → `rejected_by_infra`.
6. **Dev acknowledgment** (`submitAcknowledgment`, `acknowledgment.controller.ts`) — valid only from `pending_dev_acknowledgment`, only by the original `raised_by` user. `acknowledged` → `successfully_completed`; `issue_raised` stays `issue_raised`.

Every transition writes a row to `audit_logs` via `createAuditLog()` (`backend/src/services/audit.service.ts`) with `old_status`/`new_status`/`comment`/`ip_address`, and fires notifications (`notification.service.ts`) plus a fire-and-forget, `.catch`-guarded email (`email.service.ts`).

**How to apply:** any new transition must (a) originate from the controller that owns the triggering role, (b) validate the current status before transitioning, (c) call `createAuditLog()`, (d) match a value actually in the CHECK constraint.

## Request number generation (exact SQL, used identically in two places)

`createDeployment` and `getNextRequestNumber`, both in `deployment.controller.ts`:

```sql
SELECT 'DPR' || LPAD((COALESCE(MAX(CAST(SUBSTRING(request_number FROM 4) AS INTEGER)), 0) + 1)::text, 4, '0') AS num
FROM deployment_requests
```

Strips the `DPR` prefix, casts the remainder to integer, takes `MAX()`, defaults to `0` when the table is empty, adds 1, zero-pads to 4 digits → `DPR0001`, `DPR0002`, ... The `request_number VARCHAR(20) UNIQUE` constraint is a DB-level backstop.

**Known limitation:** there is no transaction/row-lock around the SELECT-then-INSERT — two concurrent creates could theoretically read the same `MAX()` before either commits. The `UNIQUE` constraint converts that into a DB error (500) on the second insert rather than silently duplicating, but there's no retry. If this ever becomes a real contention point, wrap it in a transaction with `SELECT ... FOR UPDATE` or move to a Postgres sequence — that would be a decision worth recording in `.claude/memory/decisions.md`, not a silent fix.

## Type drift to watch for

`backend/src/types/index.ts`'s `DeploymentStatus` union is missing `rejected_by_infra` (11 of 12 values). `frontend/src/types/index.ts`'s equivalent union has all 12 and is the one to trust. When adding a type-level reference to status, prefer checking the frontend version, and fix the backend one if you're touching that file anyway.
