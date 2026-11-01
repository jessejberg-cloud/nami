// Phase 3: home tiles, To-do, Awards toggle, filters.
// Done when: every default filter works; the toggle changes totals.
// Run: node --test tests/*.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const derive = require('../js/derive.js');
const sample = require('../js/sample-data.js');

const TODAY = new Date(2026, 10, 1);
const S = sample.build(TODAY);
const names = (f) => S.records.filter((r) => derive.passes(r, f, TODAY)).map((r) => r.name).sort();

test('every default filter narrows the records', () => {
  const all = names({});
  const cases = {
    year: { year: '2024' },
    range: { from: '2027-01-01', to: '2027-12-31' },
    status: { status: 'Active' },
    program: { program: 'Peer-to-Peer' },
    funder: { funder: 'Lakeshore Community Fund (sample)' },
    grantType: { grantType: 'County' },
    owner: { owner: 'Dana Whitfield (sample)' },
    recordType: { recordType: 'County contract' },
    applyRange: { applyFrom: '2026-11-01', applyTo: '2026-11-30' }
  };
  Object.entries(cases).forEach(([k, f]) => {
    const got = names(f);
    assert.ok(got.length > 0, k + ' found nothing');
    assert.ok(got.length < all.length, k + ' did not narrow');
  });
});

test('a record shows in every year it is active', () => {
  const peer = S.records.find((r) => r.name === 'Peer Support Line'); // Jul 2025 to Jun 2027
  ['2025', '2026', '2027'].forEach((y) => assert.ok(derive.passes(peer, { year: y }, TODAY), y));
  assert.ok(!derive.passes(peer, { year: '2024' }, TODAY));
});

test('filters combine', () => {
  const got = names({ recordType: 'County contract', year: '2024' });
  assert.deepEqual(got, ['Crisis Response Training']);
});

test('Award year puts the full amount in the starting year; Spread splits it', () => {
  const r = { id: 1, status: 'Awarded', awardAmount: 90000, startDate: '2025-07-01', endDate: '2027-06-30' };
  assert.deepEqual(derive.awardShares(r, [], 'Award year'), { 2025: 90000 });
  assert.deepEqual(derive.awardShares(r, [], 'Spread'), { 2025: 30000, 2026: 30000, 2027: 30000 });
  const rows = [{ record: 1, year: 2025, amount: 10000 }, { record: 1, year: 2026, amount: 80000 }];
  assert.deepEqual(derive.awardShares(r, rows, 'Spread'), { 2025: 10000, 2026: 80000 });
  const odd = derive.awardShares({ id: 2, status: 'Awarded', awardAmount: 100, startDate: '2025-01-01', endDate: '2027-01-01' }, [], 'Spread');
  assert.equal(Object.values(odd).reduce((a, b) => a + b, 0), 100, 'an uneven split still adds up');
});

test('only awards count: Awarded, or Archived as Closed', () => {
  assert.ok(derive.isAward({ status: 'Awarded', awardAmount: 5 }));
  assert.ok(derive.isAward({ status: 'Archived', archiveReason: 'Closed', awardAmount: 5 }));
  assert.ok(!derive.isAward({ status: 'Archived', archiveReason: 'Declined', awardAmount: 5 }));
  assert.ok(!derive.isAward({ status: 'Applied', awardAmount: 5 }));
});

test('the toggle changes the totals', () => {
  const a = derive.awardsByYear(S.records, S.awardYears, 'Award year');
  const b = derive.awardsByYear(S.records, S.awardYears, 'Spread');
  assert.notDeepEqual(a, b);
  const sum = (o) => Object.values(o).reduce((x, y) => x + y, 0);
  assert.equal(Math.round(sum(a)), Math.round(sum(b)), 'both views count the same money');
});

test('review fixes: undated, open-ended and apply-by records keep their year', () => {
  const y = (r, yr) => derive.passes(r, { year: yr }, TODAY);
  assert.ok(y({ name: 'New idea', status: 'Potentials' }, '2026'), 'an undated record is current');
  assert.ok(!y({ name: 'Old', status: 'Archived' }, '2026'), 'an undated archived one is not');
  assert.ok(y({ status: 'Awarded', startDate: '2024-03-01' }, '2026'), 'an award with no end date runs through today');
  assert.ok(y({ status: 'Upcoming', deadline: '2026-11-20', startDate: '2027-01-01', endDate: '2027-12-31' }, '2026'), 'apply-by year counts');
});

test('review fixes: one entered Award Years row keeps the rest of the money', () => {
  const r = { id: 1, status: 'Awarded', awardAmount: 90000, startDate: '2025-07-01', endDate: '2027-06-30' };
  assert.deepEqual(derive.awardShares(r, [{ record: 1, year: 2026, amount: 40000 }], 'Spread'), { 2025: 25000, 2026: 40000, 2027: 25000 });
});

test('review fixes: archiving an award with no reason keeps it in Awards', () => {
  assert.ok(derive.isAward({ status: 'Archived', awardAmount: 5, startDate: '2024-01-01' }));
  assert.ok(!derive.isAward({ status: 'Archived', archiveReason: 'Not pursued', awardAmount: 5, startDate: '2024-01-01' }));
});

let playwright = null;
try { playwright = require('playwright'); } catch (e) { /* skipped */ }

test('in the browser: tiles, filters, toggle, To-do and full lists', { skip: !playwright && 'Playwright is not installed' }, async () => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await page.waitForSelector('body[data-loaded=yes]');

  for (const t of ['attention', 'todo', 'pipeline', 'awards', 'contracts', 'archive']) {
    assert.equal(await page.locator(`[data-tile=${t}]`).count(), 1, t + ' tile');
  }

  // Each default filter changes what the Pipeline counts
  const pipelineTotal = async () => (await page.locator('[data-tile=pipeline] .count').allTextContents()).reduce((a, b) => a + Number(b), 0);
  const before = await pipelineTotal();
  await page.click('#filtersBtn');
  const selects = ['year', 'status', 'program', 'funder', 'grantType', 'owner', 'recordType'];
  for (const k of selects) {
    const opts = await page.$$eval(`#flt-${k} option`, (os) => os.map((o) => o.value).filter(Boolean));
    let changed = false;
    for (const v of opts) {
      await page.selectOption(`#flt-${k}`, v);
      const n = await pipelineTotal();
      if (n !== before) { changed = true; break; }
    }
    assert.ok(changed, k + ' filter changes the home page');
    await page.selectOption(`#flt-${k}`, '');
    assert.equal(await pipelineTotal(), before, k + ' clears');
  }
  for (const [a, b] of [['from', 'to'], ['applyFrom', 'applyTo']]) {
    await page.fill(`#flt-${a}`, '2026-11-01');
    await page.dispatchEvent(`#flt-${a}`, 'change');
    await page.fill(`#flt-${b}`, '2026-11-30');
    await page.dispatchEvent(`#flt-${b}`, 'change');
    assert.notEqual(await pipelineTotal(), before, a + ' range changes the home page');
    assert.ok(await page.locator('.fchip').count() >= 2, 'active filters show as chips');
    await page.click('#filterChips .link'); // Clear filters
    assert.equal(await pipelineTotal(), before);
  }

  // Filters are kept after a reload
  await page.selectOption('#flt-recordType', 'County contract');
  await page.reload();
  await page.waitForSelector('body[data-loaded=yes]');
  assert.ok(await page.locator('.fchip', { hasText: 'County contract' }).count() === 1);
  await page.click('#filterChips .link');

  // The Awards toggle changes the totals
  const amounts = async () => page.$$eval('[data-tile=awards] .amt', (as) => as.map((a) => a.textContent).join('|'));
  const awardYear = await amounts();
  await page.click('[data-tile=awards] [data-view=Spread]');
  const spread = await amounts();
  assert.notEqual(awardYear, spread);
  await page.click('[data-tile=awards] .link.more'); // Show the list
  assert.ok(await page.locator('[data-tile=awards] .sheet tbody tr').count() > 0);

  // Ticking a task done, then Undo
  const firstTask = page.locator('[data-tile=attention] .check').first();
  const label = await firstTask.getAttribute('aria-label');
  await firstTask.click();
  await page.waitForFunction((l) => !Array.from(document.querySelectorAll('.check')).some((c) => c.getAttribute('aria-label') === l), label);
  await page.click('#toastUndo');
  await page.waitForFunction((l) => Array.from(document.querySelectorAll('.check')).some((c) => c.getAttribute('aria-label') === l), label);

  // My to-do narrows to the sample "me"
  await page.check('#myTodo');
  const mine = await page.locator('[data-tile=todo] .todo').allTextContents();
  assert.ok(mine.length > 0);
  await page.uncheck('#myTodo');

  // Show all opens a full list; Home comes back
  await page.click('[data-tile=pipeline] .link.more');
  await page.waitForSelector('.listHead');
  await page.click('.listHead .link');
  await page.waitForSelector('[data-tile=pipeline]');

  // Amounts accept "$45,000" and show with commas
  await page.locator('[data-tile=pipeline] .mini .link').first().click();
  await page.waitForSelector('dialog[open]');
  await page.fill('#f-awardAmount', '$45,000');
  await page.press('#f-awardAmount', 'Tab');
  await page.waitForFunction(() => window.NAMI.app.store.items('records').some((r) => r.awardAmount === 45000 && r.id === window.NAMI.app.state.openId));
  assert.equal(await page.inputValue('#f-awardAmount'), '45,000');
  await page.fill('#f-awardAmount', 'forty');
  await page.press('#f-awardAmount', 'Tab');
  await page.waitForSelector('.problem:not([hidden])');
  assert.equal(await page.inputValue('#f-awardAmount'), '45,000', 'a bad amount is put back');
  await page.keyboard.press('Escape');

  // Start the sample over asks first
  await page.evaluate(() => window.NAMI.app.store.update('records', 1, { name: 'Changed name' }));
  await page.click('#reset');
  assert.equal(await page.evaluate(() => window.NAMI.app.store.get('records', 1).name), 'Changed name', 'nothing is reset on the first tap');
  await page.click('#toastUndo'); // the note's button reads "Start over"
  await page.waitForFunction(() => window.NAMI.app.store.get('records', 1).name !== 'Changed name');

  // The Year filter picks the focus year but does not change the other years' totals
  const bars = async () => page.$$eval('[data-tile=awards] .amt', (as) => Object.fromEntries(as.map((a) => [a.dataset.year, a.textContent])));
  await page.click('[data-tile=awards] [data-view="Award year"]');
  const allYears = await bars();
  if (await page.isHidden('#filterPanel')) await page.click('#filtersBtn');
  await page.selectOption('#flt-year', '2025');
  const in2025 = await bars();
  Object.keys(in2025).forEach((yr) => { if (allYears[yr]) assert.equal(in2025[yr], allYears[yr], yr + ' total unchanged by the Year filter'); });

  // Clear filters can be undone
  await page.click('#filterChips .link');
  assert.equal(await page.locator('.fchip').count(), 0);
  await page.click('#toastUndo');
  assert.equal(await page.locator('.fchip', { hasText: '2025' }).count(), 1, 'Undo puts the filters back');
  await page.click('#filterChips .link');

  // Keyboard focus stays put after a toggle, and the choice is kept after a reload
  await page.focus('[data-tile=awards] [data-view=Spread]');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-view')), 'Spread');
  await page.reload();
  await page.waitForSelector('body[data-loaded=yes]');
  assert.equal(await page.getAttribute('[data-tile=awards] [data-view=Spread]', 'aria-pressed'), 'true');

  // Marking a task done by keyboard leaves focus in the same tile
  await page.focus('[data-tile=attention] .check');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.activeElement.closest('[data-tile=attention]'));
  await page.click('#toastUndo');

  // No horizontal scroll on a phone
  await page.setViewportSize({ width: 390, height: 844 });
  const wide = await page.evaluate(() => Array.from(document.querySelectorAll('body *')).filter((e) => e.getBoundingClientRect().right > 391 && getComputedStyle(e).position !== 'fixed' && !e.closest('.scroll')).map((e) => e.tagName + '.' + e.className + ':' + Math.round(e.getBoundingClientRect().right)));
  assert.deepEqual(wide, [], 'nothing runs off a phone screen');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);

  assert.deepEqual(errors, []);
  await browser.close();
});
