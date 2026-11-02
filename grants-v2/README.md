# NAMI Grants Dashboard v2

A one-page grants and county-contract dashboard for NAMI Southeast Wisconsin, built over NAMI's own SharePoint lists. It replaces the ChatGPT Grant Dashboard and Grant Radar once it launches; both keep running until then.

**Stage:** Phase 7 of 7 built: SharePoint mode, the Netlify setup and the guides. It is tested here against a stand-in for Microsoft's API; the real check on a Microsoft 365 test site and the setup visit come next (`docs/setup-visit-checklist.md`).

## See it

Open `index.html` in a browser, straight from the folder; no server and no install. All records are fictional and kept only in this browser.

- The home page has tiles: Needs attention, To-do, Pipeline, Awards, County contracts, Archive and Funding Watch. Each tile's title opens and closes it; its handle moves it (press and hold, or arrow keys).
- **Filters** narrow every tile. **Search** finds any record.
- **Add** asks only for a name. Click a record to see every field; each saves when you leave it, with **Undo**.
- Click a task to check off its steps and add comments.
- **Funding Watch** shows Grants.gov results (sample ones when opened from a folder) with **Add as Potentials**, your own feeds, and the watch list of funding cycles. When a cycle's month or a record's watch date arrives, a Review item shows in To-do.
- **Signed in as** (top right) switches between the sample people: Morgan, Dana and Lee are editors; Sam and Pat are viewers of two programs each.
- **Labels and fields** (footer, editors) renames anything and adds your own fields. **All lists** shows every list as stored. **Start the sample over** brings back the original sample.

## Sign-in

Sample mode needs no sign-in. To sign in with NAMI's Microsoft 365 accounts, one of NAMI's Microsoft admins (Emily or Nicole) registers the page once:

1. In the Microsoft Entra admin center: App registrations, New registration. Name: NAMI Grants Dashboard. Accounts in this organizational directory only.
2. Platform: Single-page application. Redirect URI: the page's exact address (for example the Netlify address ending in `/`).
3. API permissions: Microsoft Graph, delegated, `User.Read`, `Sites.ReadWrite.All` and `Sites.Manage.All` (the last lets an editor make the lists and add fields), then Grant admin consent. Delegated means people still reach only what SharePoint already lets them reach.
4. Copy the Application (client) ID and the Directory (tenant) ID into `js/config.js`, put the same redirect address in `redirectUri`, and set `mode: 'microsoft'`.

With `sharepoint.siteUrl` left blank the records stay Sample data, so sign-in can be tried safely on its own. Who is an editor comes from the People list, matched by email.

## SharePoint

1. Pick the SharePoint site that will hold the lists and put its address in `js/config.js`, `sharepoint.siteUrl` (for example `https://namisewi.sharepoint.com/sites/Grants`).
2. Open the page and sign in. The first time, the page offers **Set up the lists**: it makes the nine lists with their columns, NAMI's settings, the Funding Watch starting list, and adds you as the first editor.
3. Give people SharePoint permission: editors **Edit** on the site; viewers **Read**, plus **Contribute** on the Progress list. SharePoint's permissions are the real lock; the page's roles only decide what it shows.

Everything is read and written through Microsoft Graph as the signed-in person; the page keeps nothing. Coming back to the page after two minutes away reads the lists again. Dates keep their day whatever time zone the site is set to. The lists' default views show only Title until columns are ticked in SharePoint's "Show/hide columns"; the page does not need them, but people opening the lists do.

## Funding Watch feeds

Browsers cannot ask Grants.gov or most feeds directly, so on Netlify a small function, `netlify/functions/feeds.mjs`, fetches them for the page (`netlify.toml` tells Netlify where it is). It reads Grants.gov's public search API and RSS or Atom feeds only, keeps nothing, and refuses private addresses. Opened from a folder there is no function, so Grants.gov shows fictional sample results and other feeds read "Not loading right now". To use a function somewhere else, put its address in `js/config.js`, `feeds.endpoint`.

## Put it on Netlify

Netlify publishes this folder as it is (`netlify.toml`); there is no build step. Drag the folder onto Netlify's deploy page, or connect the repository with `grants-v2` as the base directory. The feed function in `netlify/functions/` comes with it.

## Check it

`node --test tests/*.test.cjs` from this folder (Node 18 or later). The browser tests run when Playwright is installed and are skipped otherwise.

## Files

- `index.html`, `css/app.css`: the page
- `js/schema.js`: the nine SharePoint lists and their columns
- `js/data.js`: the data layer: Sample mode, and SharePoint mode through `js/sharepoint.js`, same interface
- `js/sharepoint.js`: SharePoint mode over Microsoft Graph, and **Set up the lists**
- `js/sample-data.js`: the fictional sample
- `js/derive.js`: what is worked out, never stored: Active from dates, multi-year, Due soon and past-date notes
- `js/app.js`: the home tiles, filters, full lists, the detail view and the Labels and fields page
- `js/settings.js`: labels, your own fields and the tile layout (plain logic, tested in Node)
- `js/access.js`: who is signed in, editor or viewer, program views, task steps; guards every change
- `js/auth.js`, `js/config.js`: Sample sign-in, and Microsoft sign-in once `config.js` is filled in
- `js/watch.js`: Funding Watch logic: Grants.gov results, RSS and Atom, safe links, when a Review is due (shared with the function)
- `netlify/functions/feeds.mjs`, `netlify.toml`: the feed function on Netlify
- `lists.html`, `js/check.js`: every list as stored, for checking

- For NAMI's admin: [`docs/admin-guide.md`](docs/admin-guide.md)
- For the setup visit: [`docs/setup-visit-checklist.md`](docs/setup-visit-checklist.md)
- What to build: [`SPEC.md`](SPEC.md)
- Rules for whoever builds it: [`CLAUDE.md`](CLAUDE.md)
- Design law: [`docs/adhd-design-guide.md`](docs/adhd-design-guide.md)
- Sources: [`reference/`](reference/)
