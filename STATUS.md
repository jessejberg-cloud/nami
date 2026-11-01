# Where the NAMI Dashboard Suite stands

*The one place that says where we are. Update it whenever a stage moves, a decision is made, or something goes live. Last updated 2026-11-01.*

## Right now

**Stage 1 of 5: talking it through with Emily (the Executive Director), this week.** Everything is built, live and documented. Jesse sent Emily an informal overview on 2026-10-05 with the landing page, the plan and the handbook, and four options to think about. Nothing has gone to staff yet. The next move is the conversation; then the answers come back here and the documents are updated to match.

## New since 2026-11-01: Grants Dashboard v2

Tester feedback and a Nov 1 interview led to a v2 rebuild of the Grant Dashboard, planned in `grants-v2/` (see `grants-v2/SPEC.md`). v2 sits over NAMI's own SharePoint lists, signs in with NAMI Microsoft 365, and folds Grant Radar into a Potentials status and a Funding Watch tile. The live ChatGPT Dashboard and Grant Radar keep running until v2 launches.

- Interview answers: Angela is the champion (one of 3 senior-leader editors, room for 6); staff only, no volunteers; other staff read-only, filtered to their program; Microsoft 365 admins are Emily and Nicole; calendar year; "NAMI database" means their OneDrive.
- Plan and gaps analysis: https://claude.ai/artifact/RYKZP5UCuqF5JmWwSPXLjK
- Phase 1 (data layer, Sample mode, list schema, sample data), Phase 2 (records: statuses, detail view, county contracts, archive, Undo) Phase 3 (home tiles, To-do, Awards toggle, filters), Phase 4 (labels, custom fields, collapse, drag, saved layout), Phase 5 (sign-in, roles, program views, Progress) and Phase 6 (Funding Watch: Grants.gov and feeds through a Netlify function, watch list, Review items in To-do) done 2026-11-01; waiting for Jesse's go-ahead before Phase 7 (SharePoint mode, Netlify deploy, docs). Real Grants.gov results are untested until the page is on Netlify (the build machine cannot reach api.grants.gov). Microsoft sign-in is built but untested until NAMI registers the app (grants-v2/README.md, Sign-in). Jesse takes Claude's recommendations as defaults and is asked only when his judgment is needed.
- Jesse's working copy: `C:\Users\jesse\OneDrive\Office Space\08 Miscellaneous\NAMI\Grant Dashbaord`

The stages below predate v2 and will be rewritten once its plan is approved.

## The stages

**Stage 0: build and prepare. Done 2026-10-05.**
- [x] Grant Dashboard simplified (simple-v2), reviewed, and live: ChatGPT Site version 5, running the Dashboard files of `9b5ab68`, records kept
- [x] Grant Radar 2.1.1, on the landing page with no sign-in
- [x] Volunteers & Events 2.2, built and tested, held for phase two
- [x] Landing page live: https://jessejberg-cloud.github.io/nami_grant_dashboard
- [x] The handbook (plan, implementation, quick starts, manuals, emails), in PDF and Word, on the landing page
- [x] The plan on one page: https://jessejberg-cloud.github.io/nami_grant_dashboard/project-map.html
- [x] Name and credentials on the documents: Jesse Jonesberg, MSW, LCSW, CPS, www.intrinsicchange.com

**Stage 1: talk it through with Emily. This week.**
- [x] Informal overview emailed to Emily, 2026-10-05 (the text is at the end of this file)
- [ ] Conversation with Emily. Settle the four options:
  1. Who tests the grant programs: Emily, or whoever handles grants day to day?
  2. When week 1 starts: next week, or after Emily has tried the practice grants herself?
  3. How the program emails go out: Emily forwards them, or Jesse sends them with Emily copied?
  4. No rush: who at NAMI could be the second person with access in phase two?
- [ ] Bring the answers back to Claude (see "After the conversation" below)
- [ ] Print the handbook: one each for Jesse, Emily, the grants person and the office
- [ ] Optional: create a feedback email address, so the landing page's feedback button can be switched on

**Stage 2: phase one, testing the grant programs. About four weeks.**
- [ ] Week 1: the Grant Dashboard email (handbook appendix, email 2) reaches the grants person
- [ ] Week 1: a 20-minute walkthrough on practice grants (agenda in the handbook, chapter 2)
- [ ] Week 2: Grant Radar email (email 3), any time from here
- [ ] End of week 2: first check-in, three questions
- [ ] Week 3: real grants, if the grants person is comfortable, with a weekly backup
- [ ] End of week 4: second check-in; Emily confirms the internal person

**Stage 3: the decision, after week 4.** Has the Dashboard tracked one real grant to a report, and has Radar sent one good lead on? Yes means stage 4. Not yet means more testing with fixes, and asking again.

**Stage 4: phase two, NAMI's own home.** NAMI creates a GitHub organization and a Cloudflare account with two owners; Jesse moves everything there behind one sign-in by NAMI email; Volunteers & Events starts with the volunteer coordinator; fresh links and emails go out. Steps in the handbook, chapter 2.

## After the conversation with Emily

Tell Claude the four answers, plus a start date. Claude then:
- puts the owner's name on the landing page and in the emails (the documents say "the grants person" until then);
- changes the plan and the emails if Jesse, not Emily, sends the program emails;
- fills in the week dates in this file;
- rebuilds the handbook, so the printed copy matches.

## Decisions made, with dates

| Date | Decision |
|---|---|
| 2026-10-05 | The suite is called NAMI Dashboard Suite |
| 2026-10-05 | Grants first: the Grant Dashboard and Grant Radar are phase one; Volunteers & Events starts in phase two, behind NAMI's own sign-in |
| 2026-10-05 | The Dashboard runs on practice grants for weeks 1 and 2, real grants from week 3 with a weekly backup |
| 2026-10-05 | The landing page opens the no-sign-in copy of Grant Radar; its Claude page is kept private, as a spare |
| 2026-10-05 | Grant Radar says "Apply by", not "Deadline" |
| 2026-10-05 | NAMI has a donor system, so Volunteers & Events records money only when it is for an event |
| 2026-10-05 | Owners are named by role until names are known; the phase-two person is proposed as a role, confirmed by week 4 |
| 2026-10-05 | Walkthroughs are 20 minutes, by phone, screen share or in person, the owner's choice |
| 2026-10-05 | Check-ins by email at weeks 2 and 4, three questions, "haven't looked yet" accepted |
| 2026-10-05 | One handbook for everyone, leadership first, gaps included, PDF and Word |
| 2026-10-05 | Phase two's home is a NAMI-owned GitHub organization and Cloudflare account, free at this size |
| 2026-10-05 | Intrinsic Change (Jesse's practice tools) lives only in its own repository, never here |
| 2026-11-01 | v2 of the Grant Dashboard is built in `grants-v2/` in this repository, from the Nov 1 v2 plan, not ported from the ChatGPT version |
| 2026-11-01 | The portable ADHD design guide (`grants-v2/docs/adhd-design-guide.md`) is the design law for v2 |
| *pending* | Who sends the program emails (the documents currently say Emily forwards them) |

## Where everything is

| What | Where | How it is updated |
|---|---|---|
| Landing page | https://jessejberg-cloud.github.io/nami_grant_dashboard | By itself, a minute or two after a push to `main` (GitHub Pages, `docs/`) |
| Grant Dashboard | https://nami-grant-workspace.brainspottingonline.chatgpt.site | Only from ChatGPT: paste the republish prompt in `guides/PREFLIGHT.md` step 2 into the Dashboard's ChatGPT conversation |
| Grant Radar | https://jessejberg-cloud.github.io/nami_grant_dashboard/radar/ | By itself, after `node scripts/build-site.mjs` and a push |
| Grant Radar, Claude copy | https://claude.ai/artifact/VpP4y4sWahwyAYuD6zPxoN (private spare) | Republished from a Claude session |
| Volunteers & Events | https://claude.ai/artifact/EDapVYL3SAdAPKV7duNK1H (private, nobody invited; phase two) | Republished from a Claude session |
| Handbook | https://jessejberg-cloud.github.io/nami_grant_dashboard/guides/NAMI_Dashboard_Suite_Handbook.pdf | Rebuilt from its sources: `guides/README.md` has the order |
| Code and documents | https://github.com/jessejberg-cloud/nami_grant_dashboard, branch `main` | Every change ends on `main` |

## Open items

`GAPS.md` has the full list with owners. The ones that matter next: the conversation with Emily, the feedback address, and naming the phase-two person by week 4.

## The note sent to Emily, 2026-10-05

> **Subject:** NAMI grant programs: where we are, and a quick look before we talk
>
> A short, informal update: where things stand (grant programs ready, the Grant Dashboard first, Volunteers & Events in phase two), the two phases, links to the landing page, the plan and the handbook, the four options listed under stage 1, the one ground rule (nothing private goes in), and an ask to talk later this week. Signed Jesse Jonesberg, MSW, LCSW, CPS, www.intrinsicchange.com.
