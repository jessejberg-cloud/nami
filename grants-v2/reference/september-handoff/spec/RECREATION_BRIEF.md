# Nami Grant Workspace — recreation brief

**Source snapshot:** documentation and workbook dated September 11, 2026.  
**Purpose:** recreate the grant management dashboard from scratch, using the existing work as the product and data reference.  
**Current scope:** Grant Workspace only. Grant Radar is retained separately for reference.

## Product purpose

The primary user is the Associate Director or grant-management staff. The dashboard should quickly answer:

> What needs my attention now, and can I trust that everything else is being tracked?

The Executive Director needs a useful summary and visibility into escalated issues. The dashboard organizes awards, requirements, staff tasks, dependencies, evidence references, financial snapshots, program metrics, and issues. It supports human review; it is not an accounting system, source-document repository, grant eligibility engine, or notification service.

## Screen map

| Screen | Job | Core behavior |
|---|---|---|
| Needs Attention / Overview | Show the next important work and whether the underlying information is trustworthy | Portfolio signals, separate trust checks, ranked action queue, confidence statement, and per-grant health matrix |
| Grants | Find and inspect award records | Search, status filters, grant details, linked requirements/tasks/issues, edit, and archive |
| Requirements / Compliance | Track grant commitments and evidence state | Funder and internal deadlines, recurrence, owner/reviewer, dependencies, evidence link, verification state |
| Tasks | Track staff work that supports commitments | Owner, due date, status, dependency, reviewer, severity, escalation state; tasks are distinct from requirements |
| Finances | Review manual cumulative snapshots | Award, expenses, remaining amount, snapshot date, freshness, and management warning; never present as a reconciled ledger |
| Issues | Record problems and route human follow-up | Severity, linked grant/requirement, owner, resolution, escalation owner and state; escalation does not send a notification |
| Grant Radar entry point | Existing product language refers to this separate opportunity intake tool | Do not build Radar in this phase; keep a future integration boundary or placeholder only if needed for navigation continuity |
| Activity | Review recent action summaries | Show what changed and when; do not imply an immutable audit trail or verified approval signature |
| Settings | Select workspace, import/export synthetic records, and explain future integrations | Clearly distinguish current functionality from planned integrations |

## Overview layout and hierarchy

Use the workbook's Dashboard tab as the primary layout reference:

1. A clear heading and the question the dashboard answers.
2. **Portfolio Signal**: active grants, open issues, critical action items, and unknown/stale financial snapshots.
3. **Trust Check**: deadline health, financial health, and compliance/evidence health, each with its basis, check timing, and next action.
4. **Top Actions**: ranked queue with grant, action, owner, due date, reason, priority, and next step.
5. **Confidence statement**: a plain-language description of what still needs attention before someone relies on the portfolio summary.
6. **Grant health matrix**: each grant by distinct health dimension (deadline, deliverable, financial, compliance, data confidence).

Do not turn the layout into a single composite risk score. The spreadsheet's priority score is a queue-ordering aid, not a compliance, financial, clinical, or eligibility risk score. Provide the written reason for every ranked action.

## Main workflows

### Review and act on the attention queue

- Open a queue row to inspect the record and the written reasons it was prioritized.
- Keep attention states visible and explainable: critical issues, overdue work, stale/missing information, blocked tasks, dependencies, missing owners, missing evidence, and near-term deadlines.
- Exclude completed/resolved/closed/archived/declined work from active attention reasons, while still allowing users to find those records.
- A blank queue must not imply complete coverage, no obligations, or compliance.

### Manage grants, requirements, and tasks

- A **grant** is an award record. A Pending grant is unconfirmed funding.
- A **requirement** is an obligation under an award.
- A **task** is staff work that may support a requirement.
- A **dependency** is a prerequisite for another task or requirement. Completing a prerequisite does not complete the dependent record. Dates do not shift automatically when a related date changes.
- Preserve linked records when editing and archiving.

### Record evidence and confidence

- A record may link to an HTTP(S) source or evidence URL; the app does not upload files, read file contents, or verify link permissions.
- A URL's presence is not proof that evidence is adequate.
- `Source verified on` is a human-entered assertion after source review.
- Missing verification is `UNKNOWN`; more than 30 days old is `STALE`. Freshness is not proof of eligibility or accuracy.
- If records fail to load, show workspace status as `UNKNOWN`, never misleading zero counts.

### Review financial snapshots

- Show award amount, recorded expenses, remaining amount, snapshot date, freshness, and any management warning.
- Remaining = award amount − recorded expenses. A negative balance remains visible.
- These are manually recorded cumulative totals, not transactions, reconciled balances, spending authorization, or restricted-fund determinations.
- A missing date is `UNKNOWN`; a snapshot older than 30 days is `STALE`. Editing unrelated fields does not refresh financial data.
- Keep financial health distinct from compliance and deadline health.

### Track issues and escalation

- Issues have severity (Low, Medium, High, Critical), linked record(s), owner, due date, resolution, escalation owner, and status.
- Escalation records who should review; it does not send email, Teams messages, calendar invitations, or notifications.
- Activity summaries are not authenticated approval records or immutable regulatory audit logs.

### Onboarding and sample workspace

- The documented prototype has a seven-step first-visit orientation and a separate guided demonstration.
- Help can reopen onboarding and launch the demo.
- Sample and Agency are data labels, not permission boundaries. Do not reproduce that as a security promise.
- Use synthetic sample data only. No production access or agency account connection is approved by this package.

## Data model reference

The spreadsheet includes 13 tabs. `data/workbook_data.json` contains rows and headers in a machine-readable form; the original workbook preserves formulas and visual formatting.

| Entity/table | Purpose |
|---|---|
| Config | Thresholds, lead-time defaults, portfolio owner, and workbook reference date |
| Grants | Award identity, amounts, dates, owners, contacts, lifecycle status, and source references |
| Requirements | Funder commitments, funder/internal deadlines, recurrence, owners/reviewers, dependencies, evidence, verification, and status |
| Milestones | Dated checkpoints such as dependencies, approvals, and external deadlines |
| Tasks | Staff action records, dependencies, evidence need, severity, escalation, priority score, and rank |
| Evidence | Evidence references and submission/verification details |
| Issues | Operational problems, severity, owner, resolution, escalation, and status |
| Financials | Snapshot totals, spend/elapsed percentages, freshness, health, warnings, and source |
| ProgramMetrics | Reusable aggregate outcomes with definitions, targets, units, freshness, and confidence |
| SourceOfTruth | Authoritative source by information type and permitted dashboard role/sync direction |
| ChangeLog | Change metadata, previous/new values, source, and reason |
| ActionQueue | Derived ranked action rows and written next steps |
| Dashboard | Overview metrics, trust checks, top actions, confidence copy, and per-grant health matrix |

The workbook has formulas and visual formatting that are not fully represented by the JSON export. Inspect both files.

## Status and display semantics

- Keep `UNKNOWN`, `STALE`, and `AT RISK` distinct.
- `UNKNOWN` means the required information or its verification has not been established. It is never the same as healthy, zero, or no work.
- `STALE` means the recorded verification/snapshot exceeds the current freshness policy (30 days in the documented prototype).
- Health dimensions should have their own label, basis, and last/next check.
- An action-priority number may sort a queue but must be accompanied by the reasons that generated it.
- An opportunity lead is not an award. Promotion to Pending does not confirm funding.

## Current prototype limitations to avoid presenting as production-ready

The manual describes an evaluation prototype with synthetic data, no agency role enforcement, no approved production identity boundary, and future integrations that are not connected. Existing documentation describes both public access and shared prototype storage; do not copy that deployment model. Any production architecture, authentication, permissions, notifications, database, backups, audit attribution, or integrations require explicit agency review and configuration.

The workbook itself is a planning artifact; it is not the app's import format. The manual says the app imports JSON envelopes (schema version 1 or 2, up to 100 records), while the workbook supports design/data planning. Do not claim that XLSX import works.

## Reference-only files

- `reference_only/grant_radar/`: separate opportunity discovery/review product. Keep outside this implementation scope.
- `reference_only/events_volunteers/`: captured text from a separate Events & Volunteers evaluation prototype. No implementation scope or detailed requirements were established in this handoff.
- `reference_only/nami_suite_overview.md`: captured suite overview for context.

These reference materials are historical snapshots. Verify any future reuse with the user.
