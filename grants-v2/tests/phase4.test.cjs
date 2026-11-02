// Phase 4: labels, custom fields, collapse, drag, saved layout.
// Done when: a rename shows everywhere; a new column appears and filters.
// Run: node --test tests/*.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const S = require('../js/settings.js');
const derive = require('../js/derive.js');

test('labels: custom text wins, blank falls back', () => {
  const T = S.makeLabels([{ key: 'tile.todo', customText: 'Our list' }, { key: 'tile.awards', customText: '  ' }]);
  assert.equal(T('tile.todo', 'To-do'), 'Our list');
  assert.equal(T('tile.awards', 'Awards'), 'Awards');
  assert.equal(T('field.funder', 'Funder'), 'Funder');
});

test('every renamable name has a key and default words', () => {
  const groups = S.labelGroups();
  assert.deepEqual(groups.map((g) => g.key), ['tiles', 'statuses', 'fields', 'sections', 'filters']);
  const keys = groups.flatMap((g) => g.items.flatMap((i) => [i.key].concat(i.note ? [i.note.key] : [])));
  assert.equal(new Set(keys).size, keys.length, 'no key twice');
  assert.ok(keys.includes('field.deadline') && keys.includes('statusNote.Upcoming') && keys.includes('section.more'));
  assert.ok(!keys.includes('field.previousStatus'), 'hidden columns are not offered');
});

test('custom columns read and write the Settings row', () => {
  const cols = S.parseCustom('boardMeeting|Board meeting|text; reportCadence|Report cadence|choice|Monthly, Yearly|off; bad key|x|text');
  assert.equal(cols.length, 2, 'a malformed key is left out');
  assert.deepEqual(cols[1], { key: 'reportCadence', label: 'Report cadence', type: 'choice', choices: ['Monthly', 'Yearly'], filter: false });
  assert.equal(cols[0].filter, true, 'filters are on unless switched off');
  assert.deepEqual(S.parseCustom(S.formatCustom(cols)), cols, 'round trip');
  assert.ok(!S.formatCustom([{ key: 'a', label: 'A | B; C', type: 'text' }]).includes('B;'), 'separators in a name are made safe');
});

test('a new key never clashes', () => {
  assert.equal(S.newKey('Site visit', []), 'siteVisit');
  assert.equal(S.newKey('Site visit', ['siteVisit']), 'siteVisit2');
  assert.equal(S.newKey('2027 plan', []), 'field2027Plan');
  assert.equal(S.newKey('Funder', ['funder']), 'funder2');
});

test('a custom field never takes a built-in or SharePoint name', () => {
  assert.equal(S.newKey('Created', []), 'created2');
  assert.equal(S.newKey('Status', []), 'status2');
  assert.deepEqual(S.parseCustom('status|Stage|choice; id|Id|text; a|A|text; a|Again|text').map((c) => c.key), ['a']);
});

test('only choice, date and yes-or-no fields filter', () => {
  assert.ok(S.filterable({ type: 'choice' }) && S.filterable({ type: 'date' }) && S.filterable({ type: 'yesno' }));
  assert.ok(!S.filterable({ type: 'text' }) && !S.filterable({ type: 'choice', filter: false }));
});

test('custom filters', () => {
  const r = { cadence: 'Monthly', ok: true, visit: '2026-05-01' };
  assert.ok(derive.passes(r, { 'c.cadence': 'Monthly', 'y.ok': 'Yes', 'd.visit.from': '2026-01-01', 'd.visit.to': '2026-12-31' }));
  assert.ok(!derive.passes(r, { 'c.cadence': 'Yearly' }));
  assert.ok(!derive.passes(r, { 'y.ok': 'No' }));
  assert.ok(derive.passes({}, { 'y.ok': 'No' }), 'blank counts as No');
  assert.ok(!derive.passes({}, { 'd.visit.from': '2026-01-01' }), 'no date, no match');
});

test('layout keeps every tile once and moves one at a time', () => {
  const all = S.TILES.map((t) => t.key);
  assert.deepEqual(S.normalLayout(null).order, all);
  const l = S.normalLayout({ order: ['archive', 'nope', 'archive'], collapsed: { todo: true, nope: true } });
  assert.equal(l.order[0], 'archive');
  assert.equal(l.order.length, all.length);
  assert.deepEqual(l.collapsed, { todo: true });
  assert.deepEqual(S.moveTile(null, 'todo', -1).order.slice(0, 2), ['todo', 'attention']);
  assert.deepEqual(S.moveTile(null, 'attention', -1).order, all, 'the first tile stays first');
});

let playwright = null;
try { playwright = require('playwright'); } catch (e) { /* skipped */ }

test('in the browser: renames show everywhere, a new field appears and filters, tiles collapse and move', { skip: !playwright && 'Playwright is not installed' }, async () => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await page.waitForSelector('body[data-loaded=yes]');
  const home = async () => { if (!(await page.$('[data-tile=pipeline]'))) { await page.click('.listHead .link'); await page.waitForSelector('[data-tile=pipeline]'); } };
  const openSetup = async (k) => { if ((await page.getAttribute(`[data-setup=${k}]`, 'open')) === null) await page.click(`[data-setup=${k}] summary`); };
  const rename = async (key, text) => {
    const sel = `[data-label="${key}"]`;
    const box = page.locator(sel);
    if (!(await box.isVisible())) await page.locator(sel).locator('xpath=ancestor::details[1]/summary').click();
    await page.fill(sel, text);
    await page.press(sel, 'Enter');
    await page.waitForFunction(([k, t]) => window.NAMI.app.store.items('labels').some((l) => l.key === k && l.customText === t), [key, text]);
  };

  // ---- Renames
  await page.click('#setupBtn');
  await rename('tile.todo', 'Our list');
  await rename('status.Upcoming', 'Planning to apply');
  await rename('statusNote.Upcoming', 'we said yes');
  await rename('field.funder', 'Funder name');
  await rename('section.contact', 'Who to call');
  await rename('filter.year', 'Calendar year');
  await home();

  assert.equal(await page.textContent('#tile-todo'), 'Our list', 'tile title');
  assert.ok((await page.textContent('[data-tile=pipeline]')).includes('Planning to apply'), 'pipeline chip');
  assert.ok((await page.textContent('[data-tile=pipeline]')).includes('(we said yes)'), 'status explanation');
  assert.ok(!(await page.textContent('body')).includes('Upcoming'), 'the old status name is gone from the page');
  await page.click('#filtersBtn');
  assert.equal(await page.textContent('label[for="flt-funder"]'), 'Funder name', 'filter label from the field name');
  assert.equal(await page.textContent('label[for="flt-year"]'), 'Calendar year', 'filter name');
  assert.ok((await page.$$eval('#flt-status option', (os) => os.map((o) => o.textContent))).includes('Planning to apply'), 'status filter choice');
  await page.selectOption('#flt-status', 'Upcoming');
  assert.equal(await page.locator('.fchip', { hasText: 'Planning to apply' }).count(), 1, 'filter chip');
  await page.click('#filterChips .link');
  await page.locator('[data-tile=pipeline] .mini .link').first().click();
  await page.waitForSelector('dialog[open]');
  assert.equal(await page.textContent('label[for="f-funder"]'), 'Funder name', 'detail field');
  assert.equal(await page.textContent('[data-section=contact] summary'), 'Who to call', 'detail section');
  assert.ok((await page.$$eval('#f-status option', (os) => os.map((o) => o.textContent))).includes('Planning to apply (we said yes)'), 'status dropdown');
  await page.keyboard.press('Escape');
  await page.fill('#search', 'peer workforce');
  assert.equal(await page.locator('.group h2', { hasText: 'Planning to apply' }).count(), 1, 'full list heading');
  await page.fill('#search', '');

  // Typing on into the next box after a rename keeps every letter
  await page.click('#setupBtn');
  await openSetup('fields');
  await page.fill('[data-label="field.owner"]', 'Lead');
  await page.click('[data-label="field.program"]');
  await page.keyboard.type('Area');
  await page.waitForFunction(() => window.NAMI.app.store.items('labels').some((l) => l.key === 'field.owner' && l.customText === 'Lead'));
  await page.waitForTimeout(100);
  assert.equal(await page.inputValue('[data-label="field.program"]'), 'Area', 'nothing typed is lost');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-label')), 'field.program');
  await page.press('[data-label="field.program"]', 'Enter');
  await page.waitForFunction(() => window.NAMI.app.store.items('labels').some((l) => l.key === 'field.program' && l.customText === 'Area'));
  await rename('field.deadline', 'Submit by');
  await home();
  assert.ok((await page.textContent('[data-tile=attention]')).includes('Submit by date passed'), 'notes follow the field name');

  // A blank name goes back to the default, and a rename can be undone
  await page.click('#setupBtn');
  await rename('tile.todo', '');
  await home();
  assert.equal(await page.textContent('#tile-todo'), 'To-do');
  await page.click('#toastUndo');
  await page.waitForFunction(() => document.querySelector('#tile-todo').textContent === 'Our list');

  // Explanations can be switched off
  await page.click('#setupBtn');
  await openSetup('statuses');
  await page.uncheck('#showNote-Upcoming');
  await home();
  assert.ok(!(await page.textContent('[data-tile=pipeline]')).includes('(we said yes)'));

  // ---- A new field appears under More details and filters
  await page.click('#setupBtn');
  await openSetup('custom');
  await page.fill('#newFieldName', 'Site visit');
  await page.selectOption('#newFieldType', 'date');
  await page.click('.customAdd button[type=submit]');
  await page.waitForSelector('[data-custom=siteVisit]');
  await home();
  await page.evaluate(() => window.NAMI.app.openDetail(window.NAMI.app.store.items('records').find((r) => r.name === 'Peer Workforce Subaward').id));
  await page.waitForSelector('dialog[open]');
  await page.click('[data-section=more] summary');
  assert.equal(await page.textContent('label[for="f-siteVisit"]'), 'Site visit', 'shows under More details');
  await page.fill('#f-siteVisit', '2026-12-03');
  await page.press('#f-siteVisit', 'Tab');
  await page.waitForFunction(() => window.NAMI.app.store.items('records').some((r) => r.siteVisit === '2026-12-03'));
  await page.keyboard.press('Escape');
  await page.waitForSelector('dialog[open]', { state: 'detached' });
  if (await page.isHidden('#filterPanel')) await page.click('#filtersBtn');
  assert.equal(await page.textContent('label[for="flt-d.siteVisit.from"]'), 'Site visit from');
  await page.fill('[id="flt-d.siteVisit.from"]', '2026-12-01');
  await page.dispatchEvent('[id="flt-d.siteVisit.from"]', 'change');
  const counts = await page.locator('[data-tile=pipeline] .count').allTextContents();
  assert.equal(counts.reduce((a, b) => a + Number(b), 0), 1, 'only the record with a site visit is left');
  await page.click('#filterChips .link');

  // The sample's choice and yes-or-no fields filter too
  await page.selectOption('[id="flt-c.reportCadence"]', 'Monthly');
  assert.equal((await page.locator('[data-tile=pipeline] .count').allTextContents()).reduce((a, b) => a + Number(b), 0), 1);
  await page.selectOption('[id="flt-c.reportCadence"]', '');
  await page.selectOption('[id="flt-y.boardApproved"]', 'Yes');
  assert.equal((await page.locator('[data-tile=pipeline] .count').allTextContents()).reduce((a, b) => a + Number(b), 0), 2);
  await page.selectOption('[id="flt-y.boardApproved"]', '');

  // Taking a field off the page keeps what records hold, and Undo brings it back
  await page.click('#setupBtn');
  await openSetup('custom');
  await page.click('[data-custom=siteVisit] .customFoot .link');
  await page.waitForSelector('[data-custom=siteVisit]', { state: 'detached' });
  assert.ok(await page.evaluate(() => window.NAMI.app.store.items('records').some((r) => r.siteVisit === '2026-12-03')), 'values kept');
  await page.click('#toastUndo');
  await page.waitForSelector('[data-custom=siteVisit]');
  await home();

  // ---- Collapse, kept after a reload
  await page.click('#tile-archive');
  assert.equal(await page.$('[data-tile=archive] .tileBody'), null);
  assert.equal(await page.getAttribute('#tile-archive', 'aria-expanded'), 'false');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'tile-archive', 'focus stays on the title');
  await page.reload();
  await page.waitForSelector('body[data-loaded=yes]');
  assert.equal(await page.$('[data-tile=archive] .tileBody'), null, 'kept after reload');
  await page.click('#tile-archive');
  assert.ok(await page.$('[data-tile=archive] .tileBody'));

  const order = () => page.$$eval('.grid > [data-tile]', (ts) => ts.map((t) => t.dataset.tile));
  const start = await order();

  // ---- Arrow keys on the handle move a tile; Undo puts it back
  await page.focus('[data-tile=archive] .handle');
  await page.keyboard.press('ArrowUp');
  const moved = await order();
  assert.equal(moved.indexOf('archive'), start.indexOf('archive') - 1);
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains('handle')), true, 'focus stays on the handle');
  await page.click('#toastUndo');
  assert.deepEqual(await order(), start);

  // ---- Drag the dots (archive onto County contracts, its neighbour): it lifts at once
  await page.locator('[data-tile=archive] .handle').scrollIntoViewIfNeeded();
  const handle = await page.locator('[data-tile=archive] .handle').boundingBox();
  const target = await page.locator('[data-tile=contracts]').boundingBox();
  await page.mouse.move(handle.x + 10, handle.y + 10);
  await page.mouse.down();
  assert.equal(await page.locator('.tile.lifted').count(), 1, 'lifted at once from the dots');
  await page.mouse.move(target.x + 60, target.y + 40, { steps: 8 });
  await page.mouse.up();
  const dragged = await order();
  assert.ok(dragged.indexOf('archive') < dragged.indexOf('contracts'), 'dropped where it was let go: ' + dragged);
  await page.reload();
  await page.waitForSelector('body[data-loaded=yes]');
  assert.deepEqual(await order(), dragged, 'layout kept after reload');

  // On the heading, a quick press-and-move without holding does nothing (it may be a scroll or a click)
  await page.locator('[data-tile=pipeline] .handle').scrollIntoViewIfNeeded();
  const h2 = await page.locator('[data-tile=pipeline] .handle').boundingBox();
  await page.mouse.move(h2.x - 120, h2.y + 10);
  await page.mouse.down();
  await page.mouse.move(h2.x - 300, h2.y + 200, { steps: 4 });
  await page.mouse.up();
  assert.deepEqual(await order(), dragged);

  // Reset layout
  await page.click('#setupBtn');
  await openSetup('layout');
  await page.click('#resetLayout');
  await home();
  assert.deepEqual(await order(), S.TILES.map((t) => t.key));

  // Nothing runs off a phone screen on the Labels page
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('#setupBtn');
  for (const k of ['fields', 'statuses', 'custom']) await openSetup(k);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);

  assert.deepEqual(errors, []);
  await browser.close();
});
