# Nami Grant Workspace — Claude Code handoff

## Build target

Recreate the **Nami Grant Workspace** from scratch. Treat this package as a product and data reference, not as source code to port. The target is the grant management dashboard described in the user manual and represented in the workbook's Dashboard tab.

**Grant Radar is reference only for this phase. Do not implement it as part of the Grant Workspace.** Its guides are in `reference_only/grant_radar/`. The Events & Volunteers prototype is also kept as a separate future-module reference in `reference_only/events_volunteers/`.

## Start by reading

1. `spec/RECREATION_BRIEF.md` — functional scope, key screens, interaction rules, data semantics, and boundaries.
2. `data/workbook_data.json` — structured workbook tables and sample rows.
3. `source_files/Nami_Grant_User_Manual.docx` and `source_files/Nami_Grant_Quick_Start.docx` — user-facing workflow source.
4. `source_files/Nami/Grant_Management_Compliance_Dashboard_MVP.xlsx` — original spreadsheet, including formatting, formulas, and Dashboard layout.

## Build instructions

- Inspect the target repository and its existing conventions before editing.
- Implement a fresh, usable application, not a static mockup. Keep the first deliverable focused on the Grant Workspace.
- Preserve the user-visible information hierarchy: attention first, confidence and data freshness beside it, then the portfolio and record-level detail.
- Keep **deadlines, finance, compliance/evidence, deliverable health, and data confidence separate**. Do not collapse them into one score.
- Make missing or unverified facts visible as `UNKNOWN`; never display unavailable data as zero, healthy, complete, or absent work.
- Use fictional records only in demo/sample mode. Keep the provided workbook data clearly labeled synthetic; dates are anchored to 2026-09-11 and are historical.
- Do not connect agency accounts, send messages, schedule events, submit applications, or perform financial actions. The package contains no production credentials or approved integration configuration.
- Keep Grant Radar out of the current implementation. Keep its reference materials intact and separate.
- Before making architectural assumptions that affect deployment or security, record them in a short decisions file and flag them for human review. The old prototype's browser/database and public-access behavior must not be treated as an approved production design.

## Expected first checkpoint

Before building beyond a small vertical slice, provide:

- a proposed stack and directory plan based on the repository;
- the screen map and data model you infer from the package;
- any discrepancies between the workbook and manual;
- a concise list of assumptions that need review;
- then implement the dashboard shell and one complete synthetic workflow.

Do not treat the included workbook sample rows as real NAMI awards, obligations, financials, program outcomes, or staff assignments.
