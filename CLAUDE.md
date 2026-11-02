# NAMI Dashboard Suite: notes for Claude

**Read `STATUS.md` first, every session.** It is the one place that says where the project is, what was decided, and what comes next. Update it before you finish whenever a stage moves, a decision is made, or something goes live.

## What this repository is

Three small programs for NAMI Southeast Wisconsin, plus their guides and a landing page. Jesse Jonesberg, MSW, LCSW, CPS builds them; the Executive Director is Emily.

| Folder | What | Built with |
|---|---|---|
| repository root | Grant Dashboard (Next.js on a ChatGPT Site, Cloudflare D1) | `pnpm build`; tests `node --test tests/records.test.cjs`; `tsc --noEmit` |
| `grant-radar/` | Grant Radar, one file | `node scripts/build.mjs`, then `scripts/build-docs.mjs`; tests in `tests/` |
| `volunteers-and-events/` | Volunteers & Events, one file (phase two) | `node build.mjs`; `node tests/flow.test.mjs` |
| `grants-v2/` | Grants Dashboard v2, being built in phases: one static page over NAMI's SharePoint lists | open `grants-v2/index.html`; tests `node --test grants-v2/tests/*.test.cjs`; read `grants-v2/CLAUDE.md` and `SPEC.md` first |
| `guides/` | Suite guides, the handbook, the emails, the pre-flight list | order in `guides/README.md` |
| `docs/` | The landing page (GitHub Pages) and the plan on one page | `node scripts/build-site.mjs` gathers it |
| `archive/` | The superseded ChatGPT build of Volunteers & Events. Never edit | |

## Rules

- **This repository is NAMI only.** Jesse's other projects live elsewhere: Wide Margin in `jessejberg-cloud/apps`, his practice tools in `jessejberg-cloud/intrinsic-change-`. Never mix them.
- **Every change ends on `main`.** The landing page publishes from it.
- **The live Grant Dashboard changes only through ChatGPT.** After a Dashboard code change, give Jesse the republish prompt (`guides/PREFLIGHT.md`, step 2, updated to the new commit) and the two-minute check. Never claim it is live until he reports it.
- **The design law is `docs/design-principles.md`.** Plain words, only a name is required, nothing is lost, Undo everywhere, no red, no counting backward, no em dashes in words a person reads.
- **A word on screen, a name, or a phase is Jesse's call.** Ask with options and a recommendation, one question at a time.
- **After changing any guide, rebuild the handbook and the site,** so the printed copy and the landing page match the sources.
- **Commit as Claude**, and never commit `node_modules/` or `__pycache__/`.
