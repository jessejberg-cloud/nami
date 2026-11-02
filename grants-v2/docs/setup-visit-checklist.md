# Setup visit checklist

For the visit where the dashboard goes onto NAMI's own accounts. About two hours. Bring this list and tick as you go.

## Before the visit (Jesse)

- [ ] The test site works end to end on Jesse's Microsoft 365 (sign in, set up the lists, add and change a record, Funding Watch shows Grants.gov results)
- [ ] The ChatGPT Grant Dashboard's records exported as CSV
- [ ] Emily or Nicole booked for 30 minutes (they hold the Microsoft 365 admin rights)
- [ ] Angela booked for the last 30 minutes (champion, first editor after Jesse)

## 1. Netlify (15 minutes)

- [ ] Make a free Netlify account owned by NAMI (an agency email, not a personal one)
- [ ] Add Jesse as a team member
- [ ] Create the site from the `grants-v2` folder (or move the test site into NAMI's team)
- [ ] Name it, for example `nami-grants`, and write the address here: ______________________

## 2. SharePoint site (15 minutes, Emily or Nicole)

- [ ] Pick or make the site that will hold the lists, for example `/sites/Grants`
- [ ] Address: ______________________
- [ ] Jesse: **Owner** (or Edit) on the site, so he can set up the lists in step 4
- [ ] Site settings, Regional settings: time zone Central
- [ ] Editors (Angela and the senior leaders): **Edit** on the site
- [ ] Other staff: **Read** on the site, then **Contribute** on the Progress list once it exists

## 3. Sign-in (15 minutes, Emily or Nicole)

Follow README, "Sign-in":

- [ ] Microsoft Entra: App registrations, New registration, "NAMI Grants Dashboard", this organization only
- [ ] Single-page application, redirect address = the Netlify address from step 1, ending in `/`
- [ ] Microsoft Graph, delegated: `User.Read`, `Sites.ReadWrite.All` and `Sites.Manage.All`, then **Grant admin consent**
- [ ] Copy the Application (client) ID: ______________________
- [ ] Copy the Directory (tenant) ID: ______________________

## 4. Connect the page (10 minutes, Jesse)

- [ ] In `js/config.js`: `mode: 'microsoft'`, the two IDs, `redirectUri` = the Netlify address, `sharepoint.siteUrl` = the site address
- [ ] Deploy to Netlify
- [ ] Open the page, sign in, press **Set up the lists**. You become the first editor
- [ ] On SharePoint, open Records, People, Settings and Watch in turn: **Show/hide columns**, tick every column, **Apply**. (New lists show only the first column until this is done)

## 5. Bring the records across (30 minutes)

- [ ] Open the Records list on SharePoint, then **Edit in grid view**
- [ ] Paste the ChatGPT rows from the CSV, matching columns (Name into Title, apply-by into Deadline)
- [ ] Spot-check five records on the dashboard
- [ ] Fill in the month each funding cycle opens on the Watch list

## 6. People and a first look (30 minutes, with Angela)

- [ ] **⚙ Settings, Staff:** Angela and the other editors as Can edit; staff as Can view with their programs, each with their NAMI email
- [ ] Angela signs in on her own computer and sees herself as Editor
- [ ] A viewer signs in and sees only their programs
- [ ] Angela adds a record, changes its status, and uses Undo
- [ ] Walk through the admin guide (`docs/admin-guide.md`) together

## 7. Reminder emails sent by themselves (optional, 30 minutes, Emily or Nicole)

- [ ] Decide whether NAMI wants reminder emails to go out without anyone pressing Send
- [ ] If yes: a Power Automate flow that reads each record's CheckInPlan reminder dates each morning and emails the responsible people (built with Jesse; then the Automatic switch for it can come on)

## After the visit

- [ ] Keep the ChatGPT Dashboard and Grant Radar running for two weeks, then retire them
- [ ] Update STATUS.md: v2 is live, with the date
