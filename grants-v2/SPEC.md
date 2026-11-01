# NAMI Grants Dashboard v2: SPEC

*Source: "NAMI Grants Dashboard: Tester Feedback & v2 Plan", Nov 1, 2026 (decisions D1 to D38). The plan itself holds testers' verbatim feedback, so it stays in Jesse's OneDrive folder (`source\`), not in this public repository. This file wins over chat; if they conflict, ask Jesse. Open points are listed at the end and marked where they touch a section.*

## Purpose

One-page grants and county-contract dashboard for NAMI Southeast Wisconsin. It shows at a glance what is active, pending and worth applying for, and tracks deadlines, follow-ups and awards. Data lives in NAMI's SharePoint lists; a live-connected Excel copy is the agency's backup and report view. Files stay in their OneDrive and SharePoint; the dashboard links to them.

It is a rebuild from this spec, not a port of the ChatGPT version (D28).

## Users and access

| Role | Who | Can |
|---|---|---|
| Editor | 3 senior leaders, including Angela (room for up to 6) | Everything: add and edit records, tasks, labels, settings; assign programs |
| Viewer | Other staff (no volunteers) | See records for their assigned program(s); check off steps and comment on tasks assigned to them; cannot change records or tasks |

- Sign-in: NAMI Microsoft 365 accounts. Microsoft admins: Emily and Nicole.
- Program filtering is for focus, not privacy.
- Angela assigns people to programs and roles from the People list.
- Read-only is a SharePoint view-only permission group, not custom role code (D21, T8).

## Data (SharePoint lists)

| List | Columns |
|---|---|
| Records | Name*, Funder, Record type (Grant / County contract), Grant type, Program, Owner, Status, Previous status (hidden), Archive reason (Closed / Declined / Not pursued), Award amount, Start date, End date, Deadline, Contact name, Contact email, Contact phone, Next (what the funder wants to know), Comments, Links, Folder link, Watch date, Watch note, plus any custom columns |
| Award Years | Record, Year, Amount (multi-year and irregular records only) |
| Tasks | Record, Title, Type (Thank-you letter / 6-month report / 1-year report / Review / Other), Due date, Assigned to, Steps (one per line), Done |
| Progress | Task, Person, Step, Done, Comment, Date (viewers can add) |
| Watch | Name, Kind (Cycle / Renewal / Retry / Custom), Opens (month), Repeats yearly, Link, Notes, Linked record |
| Feeds | Name, Type (Grants.gov / Feed link / Quick link), Keywords or URL, On |
| Labels | Key, Default text, Custom text |
| People | Person, Email, Role, Programs |
| Settings | Key, Value (programs, grant types, fiscal-year start = January, default award view, filters on/off, Grants.gov keywords) |

Only Name is required (see Decided); Funder, Status and Owner were starred in the source plan. Calendar year (D8). Computed, not stored: Active, active years, multi-year flag, due-soon and past-date flags.

Grant types: an editable dropdown of Federal, State, County, Foundation, Corporate, Other (D11). No documents are stored (D15).

## Statuses

Each label shows a short explanation in parentheses; users can edit or remove it (D26).

| Status | Means |
|---|---|
| Potentials | (opportunities we're considering) |
| Upcoming | (decided to apply, apply-by date ahead) |
| Applied | (submitted, waiting to hear) |
| Active | (awarded, currently running; shown automatically, see Decided) |
| Archived | (finished: Closed, Declined or Not pursued) |

Status is a dropdown on every record; change any direction anytime, including out of Archived (D35).

## Dashboard (one page, tiles)

| Tile | Shows |
|---|---|
| Needs attention | Past their date and due in the next 14 days, across everything, in a calm accent with an icon and plain words |
| Pipeline | Counts and short lists per status; ring or bar per status |
| To-do | Tasks, upcoming deadlines, past-end-date flags, Watch reviews; "My to-do" filter; progress per task |
| Awards | Totals by year with a toggle: Award year (full amount in the year awarded) / Spread (split across the years covered, even split, editable); compare to last year |
| County contracts | Same as records, contracts only |
| Funding Watch | Two parts: Feeds (Grants.gov + user feed links; add, remove; a failed feed shows "not loading") and Watch list (cycles, renewals, retries, custom cycles) |
| Archive | Search archived records |

- Every tile collapsible; press-and-hold to drag; layout saved per user; reset layout (D30, D38).
- Click a tile item to open a detail view with every editable field editable (editors), plus status change, "Add to Funding Watch", tasks, award years, links.
- When a Watch date or cycle month arrives, a "Review" task appears in To-do with a button to create a Potentials or Upcoming record (D36).
- "Add to Funding Watch" on any record keeps its status and adds a watch date (D34).
- Renewal reminders: Active and Archived records with a known cycle reappear in Watch before the cycle.

## Filters

Default: time period (year or custom range), status, program, funder, grant type, owner, record type, deadline range. Custom columns of type choice, date or yes/no get a filter automatically, switched on or off in Settings. A record shows in every year it is active (D7).

## Labels and custom fields

- Every title, status, field, section and filter name is renamable from Labels; a rename shows everywhere in the dashboard (D26).
- The Excel copy keeps SharePoint column names unless renamed in SharePoint too (B4).
- A new column in Records appears under "More details" in the detail view (D13).

## Funding Watch defaults

- Grants.gov keywords: mental health, peer support, crisis, suicide prevention, family support; eligibility: nonprofits.
- Watch cycles preloaded (editable): Greater Milwaukee Foundation cycles 1 to 3; United Way MHCP Mental Health Improvement Fund; Impact100 Greater Milwaukee.
- Quick links: Wisconsin DHS current funding opportunities page and email sign-up.
- No page scraping (D31). Any free source that can be connected is set up by default (D37).

## Design

- Apply `docs/adhd-design-guide.md` to every screen. Where it and the source plan disagree, the guide wins unless Decided below says otherwise.
- NAMI SEWI brand colors from namisoutheastwi.org, muted where possible; clean cards, white space, large readable text.
- One color per status, always with an icon and a word.
- Progress rings and simple bars where they help, filling forward; no dense tables on the main page.
- Calm, gradual transitions.
- A small "updated X min ago" stamp per tile; one-line empty states.
- Most important top-left; answers "what needs me?" in 5 seconds.
- Works on desktop and phone; keyboard usable; good contrast.
- Short, plain titles. No subtitles, helper blurbs, taglines or reassurance lines.
- Do not imitate the old ChatGPT version's generic boxes and lists.

## Build

- One static page, no build step, no server, no own database (D22, T13). One small Netlify function is allowed only for fetching outside feeds (B3).
- Data layer is swappable: Sample mode (local test data) and SharePoint mode, same interface (B1).
- Microsoft sign-in library in the page; app registered in NAMI's Microsoft 365 with the Netlify address; delegated permissions, so people see only what SharePoint allows (B2).
- No email alerts in v2 (D23).
- If IT blocks the app, Microsoft Lists views on the same lists are the fallback (D24, T14).

## Build phases

| Phase | Builds | Done when |
|---|---|---|
| 1 | Data layer, Sample mode, list schema, sample data | Sample mode loads all lists |
| 2 | Records: statuses, fields, detail view, county contracts, archive | Add, edit, status change, archive, restore all work |
| 3 | Views: home tiles, To-do, Awards toggle, filters | Every default filter works; toggle changes totals |
| 4 | Labels, custom fields, collapse, drag, saved layout | A rename shows everywhere; a new column appears and filters |
| 5 | Sign-in, roles, program views, Progress | A viewer cannot edit records but can log progress |
| 6 | Funding Watch | Grants.gov results show; feed add and remove; a watch date creates a To-do item |
| 7 | SharePoint mode on Jesse's Microsoft 365, Netlify deploy, docs | Works on a test site; README, one-page admin guide, setup-visit checklist |

## Not in v2

Document uploads; CRM sync; email reminders (possible later via Power Automate); paid grant databases; page scraping; a Funders list; offline editing.

## Hand-over

Free Netlify account owned by NAMI, Jesse added. App registered in NAMI's Microsoft 365 (Emily or Nicole approves). Lists created on their SharePoint; ChatGPT test data imported as CSV at the setup visit.

## Decided

- **Urgency look and words (Nov 1, Jesse).** No red and no "overdue" or "deadline". Items that are due soon or past their date show a calm accent color, an icon and plain words ("Past due date", "Due this week"), and sort to the top of each tile.
- **Required fields (Nov 1, Jesse).** Only Name is required. Status starts as Potentials and Owner as the person adding it; both can be changed. This replaces D10.
- **Active (Nov 1, default).** People pick Awarded. The dashboard shows it as Active while today is within the start and end dates, as Awarded before the start date and again after the end date, and adds a "Past end date" item to To-do once the end date passes; a person then sets Archived (T5). Stored statuses: Potentials, Upcoming, Applied, Awarded, Archived.
- **Hosting (Nov 1, default).** A NAMI-owned Netlify account (D27). STATUS.md's phase-two plan for Cloudflare does not apply to v2.
- **Old programs (Nov 1, default).** The ChatGPT Grant Dashboard and Grant Radar keep running until v2 launches; the ChatGPT data is exported as CSV at the setup visit (D28).
- **"Deadline" on screen (Nov 1, default).** The Records column is stored as Deadline, but its default label is "Apply by", matching Grant Radar. Upcoming reads "(decided to apply, apply-by date ahead)".
- **Archive reason (Nov 1, default).** A choice of Closed, Declined, Not pursued.
- **Spread view (Nov 1, default).** Even split across the calendar years a record covers; Award Years rows exist only once someone edits a year.
- **Due soon (Nov 1, default).** Within 14 days, matching Needs attention.
- **No build step (Nov 1, default).** Plain HTML, CSS and JavaScript files, loaded as ordinary scripts so the page also opens straight from a folder. The Microsoft sign-in library (MSAL) is loaded from a CDN in Phase 5.
- **Sample data (Nov 1, default).** Fresh fictional records in the v2 shape, with fictional funders and dates set relative to today so the sample never goes stale. The three Milwaukee funding cycles are real names with the opening month left for NAMI to fill in.

- **Schema additions (Nov 1, default, Phase 1).** Feeds also take the type "Quick link", for the Wisconsin DHS page and other links that are not feeds. People has an Email column, so sign-in can match a person to their row. Settings keeps a `customColumns` row (key|label|type) so the page knows which extra Records columns to show and filter.
- **Sample dates (Nov 1, default, Phase 1).** The sample's dates are fixed the first time it loads in a browser and kept after that, so edits survive. "Start the sample over" rebuilds them around the new today.
- **Phase 2 choices (Nov 1, default).** The status dropdown lists the five stored statuses, each with its explanation; Awarded reads "(won; shows as Active while it runs)". Records keep a hidden PreviousStatus column so Restore puts an archived record back where it was (Potentials if unknown). Archive asks for a reason but does not require one. Records are grouped by status, with Upcoming first; inside a group, ones with a calm "Due soon", "Apply-by date passed" or "Past end date" note sort to the top. Every change shows a one-line note with Undo for 8 seconds.

## How decisions are made

Jesse, Nov 1: Claude's recommendations are the defaults; ask him only when his judgment is needed. Each default is recorded under Decided and named in the reply that follows it.

## Early tests (not yet run)

- (a) Can a browser page call the Grants.gov search2 API directly? Blocked here: the session network refuses api.grants.gov.
- (b) Can a single page sign in with Microsoft and read and write a SharePoint list on Jesse's Microsoft 365? Needs an app registration and a test site from Jesse.
