# NAMI Grants Dashboard v2

A one-page grants and county-contract dashboard for NAMI Southeast Wisconsin, built over NAMI's own SharePoint lists. It replaces the ChatGPT Grant Dashboard and Grant Radar once it launches; both keep running until then.

**Stage:** Phase 2 of 7 done (records: statuses, detail view, county contracts, archive). Phase 1 built the data layer and sample.

## See it

Open `index.html` in a browser, straight from the folder; no server and no install. All records are fictional.

- **Grants**, **County contracts** and **Archive** across the top; Search finds any record by name, funder, program, owner or notes.
- **Add** asks only for a name. The record opens so you can fill in the rest, or not.
- Click a record to see every field. Each one saves when you leave it, and a note with **Undo** appears for 8 seconds.
- **Status** changes in any direction. **Archive** moves a record to the Archive tab and asks for a reason; **Restore** puts it back where it was.
- `lists.html` shows every list as stored. "Start the sample over" brings back the original sample.

## Check it

`node --test tests/*.test.cjs` from this folder (Node 18 or later). The browser flow test runs when Playwright is installed and is skipped otherwise.

## Files

- `index.html`, `css/app.css`: the page
- `js/schema.js`: the nine SharePoint lists and their columns
- `js/data.js`: the data layer; Sample mode now, SharePoint mode in Phase 7, same interface
- `js/sample-data.js`: the fictional sample
- `js/derive.js`: what is worked out, never stored: Active from dates, multi-year, Due soon and past-date notes
- `js/app.js`: the records page (Phase 2); the home tiles arrive in Phase 3
- `lists.html`, `js/check.js`: every list as stored, for checking

- What to build: [`SPEC.md`](SPEC.md)
- Rules for whoever builds it: [`CLAUDE.md`](CLAUDE.md)
- Design law: [`docs/adhd-design-guide.md`](docs/adhd-design-guide.md)
- Sources: [`reference/`](reference/)
