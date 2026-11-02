// Phase 7: SharePoint mode.
// Done when (the part that can be checked here): the page reads and writes NAMI's lists through
// Microsoft Graph, sets up missing lists, and works the same as Sample mode. Real Microsoft 365
// is checked on the test site (README, "SharePoint"); here a stand-in for Graph answers.
// Run: node --test tests/*.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
global.window = globalThis;
const schema = require('../js/schema.js');
require('../js/data.js');
const SP = require('../js/sharepoint.js');
const { createFakeGraph } = require('./fake-graph.cjs');

const SITE_URL = 'https://namitest.sharepoint.com/sites/Grants';
const ME = { name: 'Jesse Test', email: 'jesse@namitest.org' };
function newStore(g, extra) {
  return SP.createSharePointStore(Object.assign({ siteUrl: SITE_URL, token: () => Promise.resolve('t0ken'), fetch: g.fetch, retryWait: 0 }, extra));
}

test('a new site: the store says which lists are missing, and Set up makes them with starting rows', async () => {
  const g = createFakeGraph({ host: 'namitest.sharepoint.com' });
  const store = newStore(g);
  const e = await store.load().then(() => null, (x) => x);
  assert.ok(e && e.needsSetup, 'needs setup');
  assert.equal(e.missing.length, schema.LISTS.length);
  assert.ok(g.calls.includes('GET /sites/namitest.sharepoint.com:/sites/Grants:'), 'the site found by its address');

  const made = await store.setup(ME);
  assert.equal(made.length, schema.LISTS.length);
  assert.deepEqual(g.lists.map((l) => l.displayName).sort(), schema.LISTS.map((l) => l.sp).sort());
  const records = g.lists.find((l) => l.displayName === 'Records');
  const col = (n) => records.columns.find((c) => c.name === n);
  assert.deepEqual(col('Deadline').dateTime, { format: 'dateOnly' });
  assert.ok(col('AwardAmount').currency);
  assert.ok(col('Comments').text.allowMultipleLines);
  assert.ok(col('Owner').text, 'people are plain text, so names from the People list fit');
  assert.equal(records.columns.filter((c) => c.name === 'Title').length, 1, 'Title is SharePoint\'s own');
  assert.deepEqual([records.columns[0].displayName, records.columns[0].required], ['Name', false], 'Title named the page\'s way, never required');
  assert.ok(col('FolderLink').text.allowMultipleLines, 'links can be longer than 255 characters');
  assert.equal(col('Comments').text.textType, 'plain');

  await store.load();
  const people = store.items('people');
  assert.deepEqual(people.map((p) => [p.person, p.email, p.role, p.programs]), [['Jesse Test', 'jesse@namitest.org', 'Editor', 'All']], 'whoever sets it up is the first editor');
  assert.equal(store.items('settings').length, 7, 'read across pages');
  assert.equal(store.items('feeds')[0].type, 'Grants.gov');
  assert.equal(store.items('watch').length, 3);
  assert.equal(store.items('records').length, 0, 'no sample records on a real site');
  assert.ok(store.loadedAt instanceof Date);

  // Setting up again changes nothing
  const again = await store.setup(ME);
  assert.deepEqual(again, []);
  await store.load();
  assert.equal(store.items('people').length, 1);
});

async function readyStore(g) {
  const store = newStore(g);
  await store.setup(ME);
  await store.load();
  return store;
}

test('records save to SharePoint and read back the same', async () => {
  const g = createFakeGraph();
  const store = await readyStore(g);
  const r = await store.add('records', { name: 'County crisis line', deadline: '2026-12-01', awardAmount: 45000, recordType: 'County contract', boardApproved: undefined }, { me: 'Jesse Test' });
  assert.equal(r.name, 'County crisis line');
  assert.equal(r.status, 'Potentials', 'fallbacks as in Sample mode');
  assert.equal(r.owner, 'Jesse Test');
  const stored = g.lists.find((l) => l.displayName === 'Records').items[0].fields;
  assert.equal(stored.Title, 'County crisis line');
  assert.equal(stored.AwardAmount, 45000);
  assert.equal(stored.Deadline, '2026-12-01T08:00:00Z', 'kept as midnight where the site is (Pacific here)');
  await assert.rejects(store.add('records', { name: '  ' }), /Name is needed/);

  const res = await store.update('records', r.id, { status: 'Applied', deadline: '' });
  assert.equal(res.before.status, 'Potentials');
  assert.equal(store.get('records', r.id).status, 'Applied');
  assert.equal(g.lists.find((l) => l.displayName === 'Records').items[0].fields.Deadline, null, 'an emptied date is cleared');
  await assert.rejects(store.update('records', r.id, { name: '' }), /Name is needed/);

  await store.restore('records', res.before);
  const fresh = newStore(g);
  await fresh.load();
  const back = fresh.get('records', r.id);
  assert.deepEqual([back.status, back.deadline, back.awardAmount], ['Potentials', '2026-12-01', 45000], 'Undo puts it back on SharePoint');

  // Yes/no, links between lists and months
  const w = await store.add('watch', { name: 'Spring round', opens: '4', repeatsYearly: true, record: r.id });
  await fresh.load();
  assert.deepEqual([fresh.get('watch', w.id).opens, fresh.get('watch', w.id).repeatsYearly, fresh.get('watch', w.id).record], ['4', true, r.id]);

  // Undo of an add removes it
  await store.remove('watch', w.id);
  await fresh.load();
  assert.equal(fresh.get('watch', w.id), null);
  await assert.rejects(store.reset(), /never started over/);
});

test('dates keep their day whatever time zone the site is in', async () => {
  for (const offset of [-10, -8, -6, 0, 1, 10]) {
    const g = createFakeGraph({ siteOffset: offset });
    const store = await readyStore(g);
    const r = await store.add('records', { name: 'D', deadline: '2026-03-08', startDate: '2026-01-01', endDate: '2026-12-31' });
    const res = await store.update('records', r.id, { status: 'Applied' });
    await store.restore('records', res.before); // every field sent again
    await store.restore('records', res.before);
    const fresh = newStore(g);
    await fresh.load();
    const back = fresh.get('records', r.id);
    assert.deepEqual([back.deadline, back.startDate, back.endDate], ['2026-03-08', '2026-01-01', '2026-12-31'], 'site at UTC' + offset);
  }
});

test('a setup that stops partway finishes on the next try, with the person as editor', async () => {
  const g = createFakeGraph();
  g.failCreateAfter = 3;
  const store = newStore(g);
  await assert.rejects(store.setup(ME), /busy/);
  assert.equal(g.lists[0].displayName, 'People', 'People is made first');
  g.failCreateAfter = null;
  await store.setup(ME);
  await store.load();
  assert.equal(g.lists.length, schema.LISTS.length);
  assert.deepEqual(store.items('people').map((p) => p.role), ['Editor']);
  assert.equal(store.items('settings').length, 7);
  // Someone else setting up later is added once, as an editor; existing rows are left alone
  await newStore(g).setup({ name: 'Angela', email: 'angela@namitest.org' });
  await newStore(g).setup({ name: 'Angela', email: 'Angela@namitest.org' });
  await store.load();
  assert.deepEqual(store.items('people').map((p) => p.person), ['Jesse Test', 'Angela']);
  assert.equal(store.items('settings').length, 7);
});

test('your own fields get a column on Records first', async () => {
  const g = createFakeGraph();
  const store = await readyStore(g);
  await assert.rejects(store.add('records', { name: 'A', boardMeeting: 'March' }), /not recognized/);
  await store.ensureColumn('records', { key: 'boardMeeting', label: 'Board meeting', type: 'choice' });
  await store.ensureColumn('records', { key: 'boardMeeting', label: 'Board meeting', type: 'choice' });
  const cols = g.lists.find((l) => l.displayName === 'Records').columns.filter((c) => c.name === 'boardMeeting');
  assert.equal(cols.length, 1, 'made once');
  assert.ok(cols[0].text);
  const r = await store.add('records', { name: 'A', boardMeeting: 'March' });
  await store.load();
  assert.equal(store.get('records', r.id).boardMeeting, 'March', 'read back with the record');
  assert.equal(store.get('records', r.id).ContentType, undefined, 'SharePoint\'s own fields are left out');

  // A Date, Yes or no and Amount field of your own keep their kinds
  const own = [{ key: 'boardDate', label: 'Board date', type: 'date' }, { key: 'boardApproved', label: 'Board approved', type: 'yesno' }, { key: 'match', label: 'Match', type: 'currency' }];
  for (const c of own) await store.ensureColumn('records', c);
  const settingsRow = store.items('settings').find((x) => x.key === 'customColumns');
  await store.update('settings', settingsRow.id, { value: 'boardDate|Board date|date||on; boardApproved|Board approved|yesno||on; match|Match|currency||on' });
  const recCols = g.lists.find((l) => l.displayName === 'Records').columns;
  assert.deepEqual(recCols.find((c) => c.name === 'boardDate').dateTime, { format: 'dateOnly' });
  const r2 = await store.add('records', { name: 'B', boardDate: '2026-04-02', boardApproved: true, match: 5000 });
  await store.update('records', r2.id, { boardApproved: '', match: '' });
  const fresh = newStore(g);
  await fresh.load();
  const b = fresh.get('records', r2.id);
  assert.deepEqual([b.boardDate, b.boardApproved, b.match], ['2026-04-02', null, null]);
  // A long OneDrive link fits
  const long = 'https://namitest.sharepoint.com/sites/Grants/Shared%20Documents/' + 'x'.repeat(300);
  await store.update('records', r2.id, { folderLink: long });
});

test('SharePoint problems come back in plain words; a busy answer is tried once more', async () => {
  const g = createFakeGraph();
  const store = await readyStore(g);
  g.readOnly = true;
  await assert.rejects(store.add('records', { name: 'X' }), /permissions do not let you change this/);
  g.readOnly = false;
  g.busyOnce = true;
  const r = await store.add('records', { name: 'After a wait' });
  assert.equal(r.name, 'After a wait');
  const noToken = SP.createSharePointStore({ siteUrl: SITE_URL, token: () => Promise.resolve(''), fetch: g.fetch });
  await assert.rejects(noToken.load(), /sign-in has run out/);
});

test('dates keep their day', () => {
  assert.equal(SP.writeDate('2026-03-08'), '2026-03-08T12:00:00Z', 'noon UTC, the same day everywhere');
  // What SharePoint hands back: midnight where the site is
  assert.equal(SP.readDate('2026-03-08T06:00:00Z'), '2026-03-08', 'Central');
  assert.equal(SP.readDate('2026-03-07T14:00:00Z'), '2026-03-08', 'ten hours ahead');
  assert.equal(SP.readDate('2026-12-31T10:00:00Z'), '2026-12-31', 'ten hours behind');
  assert.equal(SP.writeDate(''), null);
  assert.equal(SP.readDate(null), '');
});

// ---------- in the browser, with Microsoft sign-in and Graph both stood in for ----------

let playwright = null;
try { playwright = require('playwright'); } catch (e) { /* skipped */ }

const FAKE_MSAL = `window.msal = {
  InteractionRequiredAuthError: function () {},
  PublicClientApplication: function () {
    var acc = { name: 'Jesse Test', username: 'jesse@namitest.org' };
    this.handleRedirectPromise = function () { return Promise.resolve({ account: acc }); };
    this.getActiveAccount = function () { return acc; };
    this.setActiveAccount = function () {};
    this.getAllAccounts = function () { return [acc]; };
    this.acquireTokenSilent = function () { return Promise.resolve({ accessToken: 'fake-token' }); };
    this.loginRedirect = function () { return Promise.resolve(); };
    this.logoutRedirect = function () { return Promise.resolve(); };
  }
};`;

async function spPage(browser, g) {
  const fs = require('node:fs');
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.setDefaultTimeout(8000);
  const cfg = fs.readFileSync(path.resolve(__dirname, '../js/config.js'), 'utf8')
    .replace("mode: 'sample',", "mode: 'microsoft',")
    .replace("clientId: ''", "clientId: 'client-1'").replace("tenantId: ''", "tenantId: 'tenant-1'")
    .replace("siteUrl: ''", "siteUrl: '" + SITE_URL + "'")
    .replace("endpoint: ''", "endpoint: 'sample'");
  await page.route('**/js/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: cfg }));
  await page.route('https://alcdn.msauth.net/**', (r) => r.fulfill({ contentType: 'text/javascript', body: FAKE_MSAL }));
  await page.route('https://graph.microsoft.com/**', async (r) => {
    const req = r.request();
    const res = await g.fetch(req.url(), { method: req.method(), headers: { Authorization: req.headers().authorization }, body: req.postData() || undefined });
    let body = '';
    try { body = JSON.stringify(await res.json()); } catch (e) { body = ''; }
    await r.fulfill({ status: res.status, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body });
  });
  return page;
}

test('in the browser: set up the lists, then add and change a record on SharePoint', { skip: !playwright && 'Playwright is not installed' }, async () => {
  const g = createFakeGraph();
  const browser = await playwright.chromium.launch();
  const errors = [];
  try {
    const page = await spPage(browser, g);
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.waitForSelector('body[data-loaded=yes]');
    await page.waitForSelector('#setupLists');
    await page.click('#setupLists');
    await page.waitForSelector('#add:not([hidden])');
    assert.equal(g.lists.length, schema.LISTS.length);
    assert.match(await page.innerText('#who'), /Jesse Test, Editor/);
    assert.ok(await page.isHidden('#reset'), 'no Start over on real lists');
    assert.ok(await page.isHidden('#allLists'));

    // Add a record; it lands on SharePoint
    await page.click('#add');
    await page.fill('#addName', 'Real-site test grant');
    await page.click('#addForm button[type=submit]');
    await page.waitForSelector('dialog[open] #f-funder');
    await page.fill('#f-funder', 'Test Foundation');
    await page.press('#f-funder', 'Tab');
    await page.waitForFunction(() => /Saved/.test(document.querySelector('#toastText').textContent));
    const rec = g.lists.find((l) => l.displayName === 'Records').items[0].fields;
    assert.deepEqual([rec.Title, rec.Funder, rec.Status, rec.Owner], ['Real-site test grant', 'Test Foundation', 'Potentials', 'Jesse Test']);
    // Undo puts it back on SharePoint
    await page.click('#toastUndo');
    await page.waitForFunction(() => /Put back/.test(document.querySelector('#toastText').textContent));
    assert.equal(g.lists.find((l) => l.displayName === 'Records').items[0].fields.Funder, '');
    await page.click('dialog[open] .close');

    // A reload reads it from SharePoint
    await page.reload();
    await page.waitForSelector('body[data-loaded=yes]');
    await page.fill('#search', 'Real-site');
    await page.waitForSelector('text=Real-site test grant');

    // Your own field: the column is made on Records first
    await page.fill('#search', '');
    await page.click('#setupBtn');
    await page.click('[data-setup=custom] summary');
    await page.fill('#newFieldName', 'Board meeting');
    await page.click('[data-setup=custom] button[type=submit]');
    await page.waitForSelector('#cf-name-boardMeeting');
    assert.ok(g.lists.find((l) => l.displayName === 'Records').columns.some((c) => c.name === 'boardMeeting'));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('in the browser: someone without edit rights sees a plain message', { skip: !playwright && 'Playwright is not installed' }, async () => {
  const g = createFakeGraph();
  const store = newStore(g);
  await store.setup({ name: 'Someone Else', email: 'else@namitest.org' });
  const browser = await playwright.chromium.launch();
  try {
    const page = await spPage(browser, g);
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.waitForSelector('body[data-loaded=yes]');
    // Jesse is not on the People list here, so reads as a viewer: no Add
    assert.match(await page.innerText('#who'), /Viewer, not on the People list yet/);
    assert.ok(await page.isHidden('#add'));
    // And a broken site shows Try again, not a blank page
    g.lists = [];
    await page.reload();
    await page.waitForSelector('#setupLists');
  } finally { await browser.close(); }
});
