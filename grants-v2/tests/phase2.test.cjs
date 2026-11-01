// Phase 2: records. Status logic in Node; the add, edit, status change, archive and restore
// flow in a real browser (skipped when Playwright is not installed).
// Run: node --test tests/*.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const derive = require('../js/derive.js');

const TODAY = new Date(2026, 10, 1); // Nov 1, 2026

test('Awarded shows as Active between its dates and as Awarded before it starts', () => {
  assert.equal(derive.shown({ status: 'Awarded', startDate: '2026-01-01', endDate: '2026-12-31' }, TODAY), 'Active');
  assert.equal(derive.shown({ status: 'Awarded', startDate: '2027-01-01', endDate: '2027-12-31' }, TODAY), 'Awarded');
  assert.equal(derive.shown({ status: 'Awarded' }, TODAY), 'Active');
  assert.equal(derive.shown({ status: 'Awarded', startDate: '2025-01-01', endDate: '2026-10-01' }, TODAY), 'Awarded');
  assert.equal(derive.shown({ status: 'Applied' }, TODAY), 'Applied');
  assert.equal(derive.shown({}, TODAY), 'Potentials');
});

test('tags: due soon, apply-by date passed, past end date, multi-year; none on archived', () => {
  const keys = (r) => derive.tags(r, TODAY).map((t) => t.key);
  assert.deepEqual(keys({ status: 'Upcoming', deadline: '2026-11-10' }), ['dueSoon']);
  assert.deepEqual(keys({ status: 'Upcoming', deadline: '2026-12-31' }), []);
  assert.deepEqual(keys({ status: 'Upcoming', deadline: '2026-10-30' }), ['applyPassed']);
  assert.deepEqual(keys({ status: 'Applied', deadline: '2026-10-30' }), []);
  assert.deepEqual(keys({ status: 'Awarded', startDate: '2025-01-01', endDate: '2026-10-01' }), ['pastEnd', 'multiYear']);
  assert.deepEqual(keys({ status: 'Archived', deadline: '2026-10-30', startDate: '2025-01-01', endDate: '2026-10-01' }), []);
});

test('tag words stay calm', () => {
  const banned = /overdue|deadline|late|must|should|failed|behind/i;
  const all = [
    { status: 'Upcoming', deadline: '2026-11-10' }, { status: 'Upcoming', deadline: '2026-10-01' },
    { status: 'Awarded', startDate: '2025-01-01', endDate: '2026-10-01' }
  ].flatMap((r) => derive.tags(r, TODAY));
  all.forEach((t) => assert.ok(!banned.test(t.text), t.text));
});

test('years covers every calendar year of a record', () => {
  assert.deepEqual(derive.years({ startDate: '2025-07-01', endDate: '2027-06-30' }), [2025, 2026, 2027]);
  assert.deepEqual(derive.years({ startDate: '2026-01-01' }), [2026]);
  assert.deepEqual(derive.years({}), []);
  assert.equal(derive.multiYear({ startDate: '2026-01-01', endDate: '2026-12-31' }), false);
});

let playwright = null;
try { playwright = require('playwright'); } catch (e) { /* the browser flow is skipped */ }

test('in the browser: add, edit, status change, archive, restore, Undo, all kept after reload', { skip: !playwright && 'Playwright is not installed' }, async () => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.waitForSelector('body[data-loaded=yes]');

  // Add with just a name
  await page.click('#add');
  await page.fill('#addName', 'Test grant from the browser');
  await page.click('#addForm button[type=submit]');
  await page.waitForSelector('dialog[open] #detailName');
  assert.equal(await page.textContent('#detailName'), 'Test grant from the browser');
  assert.equal(await page.inputValue('#f-status'), 'Potentials');
  assert.equal(await page.inputValue('#f-owner'), 'Morgan Reyes (sample)');

  // Edit a field: saved on leaving it
  await page.fill('#f-funder', 'Test Fund (sample)');
  await page.press('#f-funder', 'Tab');
  await page.waitForFunction(() => window.NAMI.app.store.items('records').some((r) => r.funder === 'Test Fund (sample)'));

  // Typing straight on into the next field is kept (a save never moves the cursor)
  await page.fill('#f-next', '');
  await page.click('#f-next');
  await page.keyboard.type('Acme');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Zed');
  await page.keyboard.press('Tab');
  await page.waitForFunction(() => window.NAMI.app.store.items('records').some((r) => r.name === 'Test grant from the browser' && r.next === 'Acme'));
  const nextOne = await page.evaluate(() => document.activeElement && document.activeElement.id);
  assert.equal(await page.inputValue('#f-next'), 'Acme');
  assert.notEqual(nextOne, 'f-next');

  // Escape closes the record and a pending save does not reopen it
  await page.fill('#f-funder', 'Test Fund (sample) 2');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  assert.equal(await page.$('dialog[open]'), null);
  await page.locator('.row', { hasText: 'Test grant from the browser' }).click();
  await page.waitForSelector('dialog[open]');
  await page.fill('#f-funder', 'Test Fund (sample)');
  await page.press('#f-funder', 'Tab');
  await page.waitForFunction(() => window.NAMI.app.store.items('records').some((r) => r.funder === 'Test Fund (sample)'));

  // A blank name is refused and nothing is lost
  await page.fill('#f-name', '');
  await page.press('#f-name', 'Tab');
  await page.waitForSelector('.problem:not([hidden])');
  assert.ok(await page.evaluate(() => window.NAMI.app.store.items('records').some((r) => r.name === 'Test grant from the browser')));

  // Status change, then Undo
  await page.selectOption('#f-status', 'Applied');
  await page.waitForFunction(() => window.NAMI.app.store.items('records').some((r) => r.name === 'Test grant from the browser' && r.status === 'Applied'));
  await page.click('#toastUndo');
  await page.waitForFunction(() => window.NAMI.app.store.items('records').some((r) => r.name === 'Test grant from the browser' && r.status === 'Potentials'));

  // Change to Upcoming, then archive
  await page.selectOption('#f-status', 'Upcoming');
  await page.waitForFunction(() => window.NAMI.app.store.items('records').some((r) => r.name === 'Test grant from the browser' && r.status === 'Upcoming'));
  await page.click('.detailActions button');
  await page.waitForSelector('#f-archiveReason');
  await page.selectOption('#f-archiveReason', 'Not pursued');
  await page.waitForFunction(() => window.NAMI.app.store.items('records').some((r) => r.name === 'Test grant from the browser' && r.archiveReason === 'Not pursued'));
  await page.click('.close');

  // It leaves Grants and shows in Archive, found by search
  assert.equal(await page.locator('.row', { hasText: 'Test grant from the browser' }).count(), 0);
  await page.click('[data-tab=Archive]');
  await page.fill('#search', 'test fund');
  assert.equal(await page.locator('.row').count(), 1);
  await page.fill('#search', 'not pursued');
  assert.ok(await page.locator('.row', { hasText: 'Test grant from the browser' }).count() === 1, 'archive reason is searchable');
  await page.fill('#search', 'test fund');

  // Restore puts it back to the status it had
  await page.click('.row');
  await page.click('.detailActions button');
  await page.waitForFunction(() => window.NAMI.app.store.items('records').some((r) => r.name === 'Test grant from the browser' && r.status === 'Upcoming' && !r.archiveReason));

  // Kept after a reload
  await page.reload();
  await page.waitForSelector('body[data-loaded=yes]');
  const kept = await page.evaluate(() => window.NAMI.app.store.items('records').find((r) => r.name === 'Test grant from the browser'));
  assert.equal(kept.status, 'Upcoming');
  assert.equal(kept.funder, 'Test Fund (sample)');

  // County contracts tab shows only contracts
  await page.click('[data-tab="County contract"]');
  const names = await page.locator('.rowName').allTextContents();
  const contracts = await page.evaluate(() => window.NAMI.app.store.items('records').filter((r) => r.recordType === 'County contract' && r.status !== 'Archived').map((r) => r.name));
  assert.deepEqual(names.sort(), contracts.sort());

  // Undo of an add removes it
  await page.click('[data-tab=Grant]');
  await page.click('#add');
  await page.fill('#addName', 'Undo this one');
  await page.click('#addForm button[type=submit]');
  await page.waitForSelector('dialog[open]');
  await page.click('#toastUndo');
  await page.waitForFunction(() => !window.NAMI.app.store.items('records').some((r) => r.name === 'Undo this one'));

  // No unsafe links: a javascript: link is never made clickable
  await page.evaluate(() => window.NAMI.app.store.update('records', 1, { links: 'javascript:alert(1)\nhttps://example.org/ok' }));
  await page.evaluate(() => window.NAMI.app.openDetail(1));
  const hrefs = await page.$$eval('dialog .links a', (as) => as.map((a) => a.getAttribute('href')));
  assert.ok(hrefs.every((h) => /^https?:/.test(h)), hrefs.join(','));

  assert.deepEqual(errors, []);
  await browser.close();
});
