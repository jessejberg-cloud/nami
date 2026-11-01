# Nami Grant Workspace handoff package

This package is prepared for Claude Code to recreate the Grant Workspace from scratch using prior product, workflow, and workbook work.

## Open first

- [CLAUDE_CODE_START_HERE.md](CLAUDE_CODE_START_HERE.md) — concise instructions for Claude Code.
- [spec/RECREATION_BRIEF.md](spec/RECREATION_BRIEF.md) — screens, workflows, data semantics, and boundaries.
- [data/workbook_data.json](data/workbook_data.json) — machine-readable export of workbook rows and formulas.
- [source_files/Nami/Grant_Management_Compliance_Dashboard_MVP.xlsx](source_files/Nami/Grant_Management_Compliance_Dashboard_MVP.xlsx) — original workbook with Dashboard layout and formatting.

## Package map

- `source_files/`: primary Grant Workspace source workbook and user guides.
- `data/`: normalized JSON export of workbook tables. All sample records are synthetic.
- `spec/`: recreation brief.
- `reference_only/grant_radar/`: Grant Radar guides and captured text for future reference; explicitly out of scope now.
- `reference_only/events_volunteers/`: captured Events & Volunteers text, also separate future-module context.
- `reference_only/nami_suite_overview.md`: historical suite-level screen text.

The source documents describe a September 2026 evaluation prototype. They are not current production requirements or proof of an approved security architecture. The included sample data is fictional and must not be presented as real NAMI records.
