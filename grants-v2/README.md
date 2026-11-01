# NAMI Grants Dashboard v2

A one-page grants and county-contract dashboard for NAMI Southeast Wisconsin, built over NAMI's own SharePoint lists. It replaces the ChatGPT Grant Dashboard and Grant Radar once it launches; both keep running until then.

**Stage:** Phase 5 of 7 done (sign-in, editors and viewers, program views, task steps and comments). Phase 1 built the data layer and sample, Phase 2 the records, detail view and archive, Phase 3 the home tiles, To-do, Awards toggle and filters, Phase 4 labels, your own fields and the tile layout.

## See it

Open `index.html` in a browser, straight from the folder; no server and no install. All records are fictional and kept only in this browser.

- The home page has tiles: Needs attention, To-do, Pipeline, Awards, County contracts and Archive. Each tile's title opens and closes it; its handle moves it (press and hold, or arrow keys).
- **Filters** narrow every tile. **Search** finds any record.
- **Add** asks only for a name. Click a record to see every field; each saves when you leave it, with **Undo**.
- Click a task to check off its steps and add comments.
- **Signed in as** (top right) switches between the sample people: Morgan, Dana and Lee are editors; Sam and Pat are viewers of two programs each.
- **Labels and fields** (footer, editors) renames anything and adds your own fields. **All lists** shows every list as stored. **Start the sample over** brings back the original sample.

## Sign-in

Sample mode needs no sign-in. To sign in with NAMI's Microsoft 365 accounts, one of NAMI's Microsoft admins (Emily or Nicole) registers the page once:

1. In the Microsoft Entra admin center: App registrations, New registration. Name: NAMI Grants Dashboard. Accounts in this organizational directory only.
2. Platform: Single-page application. Redirect URI: the page's exact address (for example the Netlify address ending in `/`).
3. API permissions: Microsoft Graph, delegated, `User.Read` and `Sites.ReadWrite.All`, then Grant admin consent. Delegated means people still reach only what SharePoint already lets them reach.
4. Copy the Application (client) ID and the Directory (tenant) ID into `js/config.js`, put the same redirect address in `redirectUri`, and set `mode: 'microsoft'`.

Until SharePoint mode arrives in Phase 7 the records stay Sample data, so this can be tried safely. Who is an editor comes from the People list, matched by email.

## Check it

`node --test tests/*.test.cjs` from this folder (Node 18 or later). The browser tests run when Playwright is installed and are skipped otherwise.

## Files

- `index.html`, `css/app.css`: the page
- `js/schema.js`: the nine SharePoint lists and their columns
- `js/data.js`: the data layer; Sample mode now, SharePoint mode in Phase 7, same interface
- `js/sample-data.js`: the fictional sample
- `js/derive.js`: what is worked out, never stored: Active from dates, multi-year, Due soon and past-date notes
- `js/app.js`: the home tiles, filters, full lists, the detail view and the Labels and fields page
- `js/settings.js`: labels, your own fields and the tile layout (plain logic, tested in Node)
- `js/access.js`: who is signed in, editor or viewer, program views, task steps; guards every change
- `js/auth.js`, `js/config.js`: Sample sign-in, and Microsoft sign-in once `config.js` is filled in
- `lists.html`, `js/check.js`: every list as stored, for checking

- What to build: [`SPEC.md`](SPEC.md)
- Rules for whoever builds it: [`CLAUDE.md`](CLAUDE.md)
- Design law: [`docs/adhd-design-guide.md`](docs/adhd-design-guide.md)
- Sources: [`reference/`](reference/)
