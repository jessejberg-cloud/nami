# NAMI Grants Dashboard v2

A one-page grants and county-contract dashboard for NAMI Southeast Wisconsin, built over NAMI's own SharePoint lists. It replaces the ChatGPT Grant Dashboard and Grant Radar once it launches; both keep running until then.

**Stage:** Phase 1 of 7 done (data layer, Sample mode, list schema, sample data).

## See it

Open `index.html` in a browser, straight from the folder; no server and no install. It shows every list as Sample mode loads it. All records are fictional. "Start the sample over" brings back the original sample.

## Check it

`node --test tests/*.test.cjs` from this folder (Node 18 or later).

## Files

- `index.html`, `css/app.css`: the page
- `js/schema.js`: the nine SharePoint lists and their columns
- `js/data.js`: the data layer; Sample mode now, SharePoint mode in Phase 7, same interface
- `js/sample-data.js`: the fictional sample
- `js/check.js`: the Phase 1 view; the dashboard tiles replace it in Phase 3

- What to build: [`SPEC.md`](SPEC.md)
- Rules for whoever builds it: [`CLAUDE.md`](CLAUDE.md)
- Design law: [`docs/adhd-design-guide.md`](docs/adhd-design-guide.md)
- Sources: [`reference/`](reference/)
