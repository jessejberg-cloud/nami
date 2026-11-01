# NAMI Grants Dashboard v2: standing rules

These rules apply inside `grants-v2/`. The repository's own `CLAUDE.md` and `STATUS.md` still apply on top of them.

**What this is:** a one-page dashboard over the agency's own Microsoft 365 data. Interface only. It stores no documents and owns no database.

## Rules

- Read `SPEC.md` before every task. SPEC.md wins over chat if they conflict; ask Jesse.
- Do not build a phase before Jesse approves the plan for it. Stop after each phase for his review.
- Keep it simple: a static page on Netlify, no build step if possible, no server. One small Netlify function is allowed only for fetching outside feeds.
- The data layer is swappable: Sample mode (local test data) and SharePoint mode, behind the same interface.
- The agency must be able to maintain it without code: dropdowns, labels, programs and settings live in SharePoint lists.
- Plain language in all text. Short titles that say what the thing does. No subtitles, helper blurbs, taglines or reassurance lines. No em dashes in words a person reads.
- Apply `docs/adhd-design-guide.md` to every screen. It replaces the earlier principles file.
- Status and urgency: color + icon + words, never color alone.
- Sample data is fictional and labeled so. Never put real NAMI records in the repository.
- Test your own work: run it, take screenshots, check against the phase's "done when" list before saying it is done.
- At the end of each phase, audit against SPEC.md with a fresh-eyes reviewer subagent.
- Commits: one per finished step, named "Phase N: what changed". Commit as Claude.
- Model use: Opus for design, data layer, auth and anything uncertain; Sonnet only for simple single fixes; never Haiku; ask before using Fable.

## When a task is finished, tell Jesse

- Rebuild, new version, or update
- What changed, in plain words
- Step by step, how to see and test it
- Anything decided for him
- Update SPEC.md, README.md and docs/admin-guide.md if anything changed

## Where things are

- `SPEC.md`: what to build
- `docs/adhd-design-guide.md`: the design law for every screen
- `reference/`: the September handoff (sample data and old-version reference only; its Grant Radar and Volunteers & Events material is out of scope)
- The Nov 1 v2 plan (the source of SPEC.md) is kept out of this public repository; it is in `source\` in Jesse's working copy: `C:\Users\jesse\OneDrive\Office Space\08 Miscellaneous\NAMI Grant Dashboard`
