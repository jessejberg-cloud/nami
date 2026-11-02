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
- **Phase 3 choices (Nov 1, default).** Home tiles in two columns (one on a phone): Needs attention and To-do first, then Pipeline and Awards across the page, then County contracts and Archive. Needs attention holds anything past its date or due soon; To-do holds what is coming up and not already in Needs attention, and "My to-do" shows everything of the signed-in person's. Potentials join To-do only once their apply-by date is near. Task progress counts forward ("1 step done"). Awards counts Awarded records plus Archived ones marked Closed (or archived with no reason but a start date); "Award year" means the year the award starts. The Year filter picks the year Awards focuses on but never changes the other years' totals. A record with no dates counts as current; an award with no end date runs through today; a record matches a year by its apply-by date too. One entered Award Years row keeps its amount and the rest is split evenly over the other years. Filters, the Award year or Spread choice and My to-do are kept per browser; clearing a filter offers Undo. Amounts accept "$45,000". "Start the sample over" asks once, in the note. Tile stamps show the clock time ("Updated 9:14pm") rather than "X min ago".
- **Phase 4 choices (Nov 1, default).** Renaming happens on a "Labels and fields" page, reached from the footer. Each name has a box showing the built-in word; whatever is typed there is used everywhere, and a blank box goes back to the built-in word. The page title and "My to-do" can be renamed too. Each status explanation can be edited or hidden on its own (Settings row `hiddenStatusNotes`). Notes that name a field follow it ("Past end date" becomes "Past finish" when End date is renamed Finish); "Due soon" and "Past due date" stay as they are. Your own fields are kept in the Settings row `customColumns` as `key|Label|kind|choices|filter`; their kinds are Short text, Long text, Choice, Date, Yes or no, Number and Amount. A field can never take the key of a built-in column or a SharePoint system column (id, created, modified, title and the like). A value that does not fit a field's kind (after the kind is changed) shows as it is until someone changes it. Choice, Date and Yes-or-no fields get a filter, which can be switched off per field. Taking a field off the page keeps the values records hold, so adding it back with the same name brings them back. Each tile's title opens and closes it. A grip handle (six dots) on each tile moves it: drag the dots and the tile lifts at once (Nov 2, after Jesse found waiting for a hold unclear); with a mouse, pressing and holding the heading also lifts it; on a phone only the dots do, so the heading still scrolls the page; the page scrolls when a lifted tile nears the top or bottom), or focus the handle and use the arrow keys; Escape while dragging puts it back. The layout (order and closed tiles) is kept per person in this browser (Phase 5 reads it again once the signed-in person is known), and "Reset layout" brings back the first order; moving and resetting offer Undo. Wide tiles keep their width wherever they go. In SharePoint mode the page adds the column to the Records list when a field is added.
- **Phase 5 choices (Nov 1, default).** Sample mode has a "Signed in as" list instead of a sign-in page, so editors and viewers can both be tried; it starts on the first editor. Microsoft sign-in uses Microsoft's own library (MSAL 2, loaded only in that mode) with a full-page redirect and delegated `User.Read` and `Sites.ReadWrite.All` (plus `Sites.Manage.All` from Phase 7, so editors can make the lists and columns), switched on in `js/config.js`; it stays untested until NAMI's app registration exists. A signed-in person is matched to the People list by email (by name too in Sample mode only); someone not on the list is a Viewer of every program. Viewers start on their own programs, shown as a filter chip that one tap removes (with Undo); records with no program, a person's own tasks and records, and anything a search finds always show. Viewers read records as plain text with empty fields left out, and see no Add, Archive, Mark done, Labels and fields, or Start the sample over. Every change also passes a guard in the page (`js/access.js`), so a viewer's change is refused even if a control slipped through; in SharePoint mode the real lock is SharePoint's own permissions, with viewers allowed to add to the Progress list only. A task opens in its own view: steps to check off and comments for the task's person and editors, a plain list for everyone else, and the task's details for editors. Each check and comment is a new Progress row (nothing is overwritten; a step's latest check counts), with Undo. Step counts only count forward ("2 steps done"). Editors add tasks from a record's Tasks section. Switching person in Sample mode starts on a fresh home page with that person's own layout.
- **Phase 6 choices (Nov 1, default).** Funding Watch is a wide tile with two parts, Feeds and Watch list (both renamable under Sections). Grants.gov is searched through its public search2 API for open and forecasted opportunities that nonprofits with 501(c)(3) status can apply for, all keywords at once under one 8-second limit (Netlify stops a function at 10), with duplicates dropped, soonest closing first. Browsers cannot ask Grants.gov or most feeds directly, so a small Netlify function (`netlify/functions/feeds.mjs`) fetches them and keeps nothing; it reads only Grants.gov's API and RSS or Atom feeds (no page scraping), refuses addresses on private networks, also by looking up what a name points to, checks every redirect, and gives up after 8 seconds or 1 MB. A failure is never cached; results are kept 15 minutes. Opened straight from a folder, the page shows fictional sample results for Grants.gov instead (`js/config.js`, `feeds.endpoint`). Each feed shows three results with "Show all", so the tile stays short on a phone; a feed that does not answer reads "Not loading right now", nothing else changes, and it is asked again a few minutes later. "Add as Potentials" on a result makes a Potentials record with the title, the agency as funder, the close date as the apply-by date, the link, and grant type Federal for Grants.gov; a result already on a record shows "Added", which opens it. Editors add a feed (Grants.gov keywords, a feed link or a quick link) from an "Add feed" link that opens a small form, edit one (name, kind, keywords or link), switch one off, or remove it, with Undo bringing it back. The Watch list holds watched cycles by the month they open ("Opens in March", "Opens this month") and every record with a watch date, soonest first. When a cycle's month arrives, or a record's watch date does, a "Review" item joins To-do with "Add as Potentials", "Add as Upcoming" (which makes the record, links it to the cycle and opens it) and "Done for now" (the cycle comes back next year; a record's watch date is cleared); each has Undo. A cycle added partway through its opening month still comes up that month; one added after its month waits for next year. A one-time watch comes up once, then reads "Reviewed" with the date. Undo after taking something off the watch list keeps its added date, so it still comes up. (In SharePoint mode, Phase 7, the added date is SharePoint's own and cannot be set, so a cycle put back after its month may wait a year; a known limit.) "Add to Funding Watch" on a record opens More details at its watch date. Watch-list rows belong to nobody, so My to-do shows only a person's own records' reviews. Viewers see results and the Watch list but no controls, and feeds that are off are hidden from them.
- **Phase 7 choices (Nov 1, default).** SharePoint mode switches on when `js/config.js` has Microsoft sign-in and a `sharepoint.siteUrl`; with no site address the page keeps Sample data, so sign-in can be tried on its own. The page reads and writes the lists through Microsoft Graph as the signed-in person. When lists are missing, a signed-in person sees **Set up the lists**, which makes the nine lists and their columns (People first), names each list's Title column the page's way and makes it optional, adds NAMI's settings and the Funding Watch starting feeds and cycles to any of those lists that is empty, and adds the person as an Editor when their sign-in address is not on People yet; lists that already exist are left alone, so a setup that stopped partway finishes on the next try. Someone whose SharePoint permissions cannot make lists is told to ask an editor to open the page first. Columns: dates as date-only, yes or no as Yes/No, amounts as Currency, numbers and links between lists as Number, long text and web links as plain multiple lines (single-line text stops at 255 characters), and people, choices and months as single-line text, so names and choices stay editable from the page's Settings and Labels rather than from SharePoint column settings. Dates are written as noon UTC and read as the day nearest SharePoint's stored midnight, so they keep their day whatever the site's time zone. "Your own fields" add a column to the Records list first, of the matching kind (dates, yes or no and amounts keep their kinds); a field's kind is set when it is made. A save that SharePoint refuses says why in plain words ("Your SharePoint permissions do not let you change this"); a busy answer is tried once more. Coming back to the page after two minutes away reads the lists again. "Start the sample over" and "All lists" are hidden in SharePoint mode. Viewers need Contribute on the Progress list only. The ChatGPT records come across at the setup visit by pasting into the Records list's grid view. Docs: `docs/admin-guide.md` and `docs/setup-visit-checklist.md`.

## How decisions are made

Jesse, Nov 1: Claude's recommendations are the defaults; ask him only when his judgment is needed. Each default is recorded under Decided and named in the reply that follows it.

## Early tests (not yet run)

- (a) Can a browser page call the Grants.gov search2 API directly? Blocked here: the session network refuses api.grants.gov.
- (b) Can a single page sign in with Microsoft and read and write a SharePoint list on Jesse's Microsoft 365? Needs an app registration and a test site from Jesse. The sign-in half can be tried as soon as the app is registered: see README, "Sign-in".
