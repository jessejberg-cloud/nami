# Grants Dashboard: admin guide

One page for whoever looks after the dashboard at NAMI Southeast Wisconsin. No code is needed for anything here.

## Where things live

| What | Where |
|---|---|
| The page | NAMI's Netlify site (address on the setup-visit checklist) |
| The records | Nine lists on NAMI's SharePoint site: Records, AwardYears, Tasks, Progress, Watch, Feeds, Labels, People, Settings |
| Sign-in | NAMI's Microsoft 365 accounts. The app registration is "NAMI Grants Dashboard" in Microsoft Entra |
| The code | `grants-v2/` in the `nami` repository on GitHub |

Everything people type is saved straight to the SharePoint lists. The page itself keeps nothing.

## Add or remove a person

1. Open the **People** list on the SharePoint site.
2. Add a row: their name, the address they sign in with, Role (**Editor** or **Viewer**), and Programs (`All`, or program names separated by `;`).
3. On the SharePoint site, give editors **Edit** permission. Give viewers **Read**, plus **Contribute** on the Progress list only, so they can check off the steps on their own to-dos.

To remove someone, delete their People row and take away their SharePoint permission. Someone signed in but not on the People list sees everything as a viewer.

## Change words, dropdowns and fields

- **Words on screen:** on the dashboard, editors press **Rename and fields** (top of the page). Type a new name in any box; clear the box to go back.
- **Programs and grant types:** in the **Settings** list, edit the `programs` or `grantTypes` row. Separate choices with `;`.
- **Due soon:** the `dueSoonDays` row in Settings (14 to start).
- **A new field on every record:** **Rename and fields**, then **Your own fields**. The page adds the column to the Records list itself.

## Funding Watch

- Grants.gov keywords: on the Funding Watch tile, **Edit** the Grants.gov feed. Separate keywords with `;`.
- Add a foundation's RSS feed or a useful page with **Add feed**.
- Fill in the month each funding cycle opens: click the cycle in the Watch list. When that month comes, a Review item shows in To-do.

## When something goes wrong

| What you see | What to do |
|---|---|
| "Your sign-in has run out" | Reload the page and sign in again |
| "Your SharePoint permissions do not let you change this" | Check the person's permission on the SharePoint site |
| "Not loading right now" on a feed | Nothing; it tries again in a few minutes. If it lasts for days, check the feed's link |
| "Set up the lists" | The page cannot find a list. Check that no list was renamed or deleted, and that `siteUrl` in `js/config.js` points at the right site |
| Sign-in loops or fails | In Entra, check the redirect address matches the Netlify address exactly |

## The Excel copy

Any SharePoint list opens in Excel with **Export**, then **Export to Excel**. The copy refreshes from SharePoint. Edit in the dashboard or the list, not in the Excel copy.

## Backups

SharePoint keeps each item's version history and a recycle bin for 93 days. To see an older version of a record, open it in the Records list, then **Version history**.
