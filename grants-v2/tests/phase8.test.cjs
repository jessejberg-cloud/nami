// Nov 2 feedback: a + in each part of a record (every record or just this one),
// Home from any screen, and the NAMI Southeast Wisconsin look.
// Run: node --test tests/*.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const S = require('../js/settings.js');

test('fields for one record read back safely', () => {
  assert.deepEqual(S.parseExtras(''), []);
  assert.deepEqual(S.parseExtras('not json'), []);
  const list = S.parseExtras(JSON.stringify([{ key: 'cell', label: 'Cell', type: 'text', section: 'contact', value: '555' }, { key: 'x', label: 'X', type: 'odd', section: 'nowhere' }]));
  assert.equal(list[0].section, 'contact');
  assert.equal(list[1].type, 'text', 'an unknown kind reads as text');
  assert.equal(list[1].section, 'more', 'an unknown part reads as More details');
  assert.equal(list[1].value, '');
});

let playwright = null;
try { playwright = require('playwright'); } catch (e) { /* skipped */ }

async function openPage() {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await page.waitForSelector('body[data-loaded=yes]');
  return { browser, page, errors };
}

async function openFirstRecord(page) {
  await page.locator('[data-tile=pipeline] .mini .link').first().click();
  await page.waitForSelector('dialog[open]');
  return page.evaluate(() => window.NAMI.app.state.openId);
}

test('in the browser: a + in Contact adds a field to just this record, or to every record', { skip: !playwright && 'Playwright is not installed' }, async () => {
  const { browser, page, errors } = await openPage();
  try {
    const id = await openFirstRecord(page);
    if ((await page.getAttribute('[data-section=contact]', 'open')) === null) await page.click('[data-section=contact] summary');
    assert.equal(await page.locator('dialog .plus').count() >= 4, true, 'a + in the main details and each part');

    // Just this record
    await page.click('#addField-contact');
    await page.fill('#newOwnName-contact', 'Cell phone');
    await page.press('#newOwnName-contact', 'Enter');
    assert.ok((await page.textContent('.whichFor')).includes('Add "Cell phone" to every record, or just this one?'));
    await page.click('#ownJustThis');
    await page.waitForSelector('#fx-cellPhone');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'fx-cellPhone', 'the new field is ready to type in');
    assert.equal(await page.locator('[data-section=contact] #fx-cellPhone').count(), 1, 'it shows in Contact');
    await page.fill('#fx-cellPhone', '414 555 0100');
    await page.press('#fx-cellPhone', 'Enter');
    await page.waitForFunction((rid) => (window.NAMI.app.store.get('records', rid).extraFields || '').includes('414 555 0100'), id);

    // Another record does not have it
    await page.keyboard.press('Escape');
    await page.locator('[data-tile=pipeline] .mini .link').nth(1).click();
    await page.waitForSelector('dialog[open]');
    assert.equal(await page.locator('#fx-cellPhone').count(), 0, 'only that record has it');
    await page.keyboard.press('Escape');

    // Take it off, then Undo
    await page.locator('[data-tile=pipeline] .mini .link').first().click();
    await page.waitForSelector('#fx-cellPhone');
    await page.click('.takeOff');
    await page.waitForFunction(() => !document.querySelector('#fx-cellPhone'));
    await page.click('.toast .link');
    await page.waitForSelector('#fx-cellPhone');
    assert.equal(await page.inputValue('#fx-cellPhone'), '414 555 0100', 'Undo brings it back with what it held');

    // Every record
    await page.click('#addField-contact');
    await page.fill('#newOwnName-contact', 'Program officer');
    await page.click('.addField button[type=submit]');
    await page.click('#ownEvery');
    await page.waitForSelector('[data-section=contact] #f-programOfficer');
    await page.keyboard.press('Escape');
    await page.locator('[data-tile=pipeline] .mini .link').nth(1).click();
    await page.waitForSelector('dialog[open]');
    if ((await page.getAttribute('[data-section=contact]', 'open')) === null) await page.click('[data-section=contact] summary');
    assert.equal(await page.locator('[data-section=contact] #f-programOfficer').count(), 1, 'every record has it, in the same part');
    await page.keyboard.press('Escape');

    // Settings shows where it goes, and can move it
    await page.click('#setupBtn');
    if ((await page.getAttribute('[data-setup=custom]', 'open')) === null) await page.click('[data-setup=custom] summary');
    assert.equal(await page.inputValue('#cf-section-programOfficer'), 'contact');
    await page.selectOption('#cf-section-programOfficer', 'notes');
    await page.waitForFunction(() => window.NAMI.settings.parseCustom(window.NAMI.app.store.items('settings').find((s) => s.key === 'customColumns').value).some((c) => c.key === 'programOfficer' && c.section === 'notes'));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('in the browser: Home works from every screen', { skip: !playwright && 'Playwright is not installed' }, async () => {
  const { browser, page, errors } = await openPage();
  try {
    const atHome = async () => {
      await page.waitForSelector('[data-tile=pipeline]');
      assert.equal(await page.locator('dialog[open]').count(), 0, 'nothing left open');
      assert.equal(await page.inputValue('#search'), '', 'search cleared');
    };
    // From a record
    await openFirstRecord(page);
    await page.click('dialog .dialogHome');
    await atHome();
    // From a to-do inside a record
    await openFirstRecord(page);
    if ((await page.getAttribute('[data-section=tasks]', 'open')) === null) await page.click('[data-section=tasks] summary');
    await page.fill('#newTaskTitle', 'Call the funder');
    await page.click('#addTask');
    await page.waitForSelector('[data-task-view]');
    await page.click('dialog .dialogHome');
    await atHome();
    // From search
    await page.fill('#search', 'peer');
    await page.waitForFunction(() => !document.querySelector('[data-tile=pipeline]'));
    await page.click('#homeBtn');
    await atHome();
    // From Settings, by the title
    await page.click('#setupBtn');
    await page.waitForFunction(() => !document.querySelector('[data-tile=pipeline]'));
    await page.click('#homeLink');
    await atHome();
    // From the add form
    await page.click('#add');
    await page.waitForSelector('dialog[open] #addName');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'addName', 'the new record opens in a pop-up, name first');
    await page.click('dialog .dialogHome');
    await atHome();
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('in the browser: the page wears NAMI Southeast Wisconsin colors, with no red', { skip: !playwright && 'Playwright is not installed' }, async () => {
  const { browser, page } = await openPage();
  try {
    const look = await page.evaluate(() => ({
      band: getComputedStyle(document.querySelector('.brandBand')).borderBottomColor,
      button: getComputedStyle(document.querySelector('#add')).backgroundColor,
      brand: document.querySelector('.brandName').textContent.replace(/\s+/g, ' ').trim()
    }));
    assert.equal(look.band, 'rgb(12, 73, 156)', 'NAMI blue');
    assert.equal(look.button, 'rgb(12, 73, 156)');
    assert.equal(look.brand, 'NAMI Southeast Wisconsin');
  } finally { await browser.close(); }
});

test('in the browser: a to-do can be assigned and dated as it is added', { skip: !playwright && 'Playwright is not installed' }, async () => {
  const { browser, page, errors } = await openPage();
  try {
    const id = await openFirstRecord(page);
    if ((await page.getAttribute('[data-section=tasks]', 'open')) === null) await page.click('[data-section=tasks] summary');
    assert.equal(await page.textContent('[data-section=tasks] summary'), 'To-do', 'one name: To-do');
    const someone = await page.evaluate(() => window.NAMI.app.store.items('people').map((p) => p.person).filter((p) => p !== window.NAMI.app.state.who.person)[0]);
    assert.ok(await page.inputValue('#newTaskWho'), 'starts as the person adding it');
    await page.fill('#newTaskTitle', 'Send site photos');
    await page.fill('#newTaskWho', someone);
    await page.fill('#newTaskDue', '2026-12-01');
    await page.click('#addTask');
    await page.waitForSelector('[data-task-view]');
    const t = await page.evaluate((rid) => window.NAMI.app.store.items('tasks').find((x) => x.record === rid && x.title === 'Send site photos'), id);
    assert.equal(t.assignedTo, someone);
    assert.equal(t.dueDate, '2026-12-01');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('in the browser: Settings behind the gear: Staff, Programs, Layout; Owner and Team pick from Staff', { skip: !playwright && 'Playwright is not installed' }, async () => {
  const { browser, page, errors } = await openPage();
  try {
    assert.equal(await page.getAttribute('#setupBtn', 'aria-label'), 'Settings');
    await page.click('#setupBtn');
    assert.equal(await page.textContent('.listHead h2'), 'Settings');
    const open = async (k) => { if ((await page.getAttribute(`[data-setup=${k}]`, 'open')) === null) await page.click(`[data-setup=${k}] summary`); };

    // Staff: add a person, give them a program
    await open('staff');
    await page.fill('#newStaffName', 'Rosa Diaz');
    await page.fill('#newStaffEmail', 'rosa@example.org');
    await page.click('#addStaff');
    await page.waitForFunction(() => window.NAMI.app.store.items('people').some((p) => p.person === 'Rosa Diaz' && p.email === 'rosa@example.org'));
    const rosa = await page.evaluate(() => window.NAMI.app.store.items('people').find((p) => p.person === 'Rosa Diaz').id);
    await page.check(`#sf-prog-${rosa}-1`);
    await page.waitForFunction((id) => !/all/i.test(window.NAMI.app.store.get('people', id).programs), rosa);

    // Programs: add one
    await open('programs');
    await page.fill('#newProgram', 'Youth outreach');
    await page.click('#addProgram');
    await page.waitForFunction(() => window.NAMI.app.store.items('settings').find((s) => s.key === 'programs').value.includes('Youth outreach'));

    // Layout: hide a tile
    await open('layout');
    await page.uncheck('#showTile-archive');
    await page.click('#homeBtn');
    await page.waitForSelector('[data-tile=pipeline]');
    assert.equal(await page.locator('[data-tile=archive]').count(), 0, 'a hidden tile stays off the home page');

    // Owner and Team pick from Staff
    const id = await openFirstRecord(page);
    assert.ok((await page.$$eval('#f-owner option', (os) => os.map((o) => o.value))).includes('Rosa Diaz'), 'Owner picks from Staff');
    await page.locator('#f-team label', { hasText: 'Rosa Diaz' }).locator('input').check();
    await page.waitForFunction((rid) => String(window.NAMI.app.store.get('records', rid).team || '').includes('Rosa Diaz'), id);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
