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

test('in the browser: reminders on a to-do, check-ins on To-do, and every automatic action has a switch', { skip: !playwright && 'Playwright is not installed' }, async () => {
  const { browser, page, errors } = await openPage();
  try {
    const today = await page.evaluate(() => window.NAMI.derive.iso(new Date()));
    // A to-do for someone on Staff, with a check-in today
    const id = await openFirstRecord(page);
    if ((await page.getAttribute('[data-section=tasks]', 'open')) === null) await page.click('[data-section=tasks] summary');
    const person = await page.evaluate(() => window.NAMI.app.store.items('people').find((p) => p.email && p.person !== window.NAMI.app.state.who.person).person);
    const email = await page.evaluate((n) => window.NAMI.app.store.items('people').find((p) => p.person === n).email, person);
    await page.fill('#newTaskTitle', 'Quarterly numbers');
    await page.selectOption('#newTaskWho', person).catch(async () => { await page.fill('#newTaskWho', person); });
    await page.click('#addTask');
    await page.waitForSelector('#remindBlock');
    await page.click('#emailReminder');
    await page.waitForSelector('#mailOpen');
    const href = await page.getAttribute('#mailOpen', 'href');
    assert.ok(href.startsWith('mailto:' + email + '?subject=Reminder%3A%20Quarterly%20numbers'), 'the email goes to their address from Staff');
    assert.ok(decodeURIComponent(href).includes('- Quarterly numbers'), 'their open to-dos are listed');
    assert.ok(!/deadline|overdue|must/i.test(decodeURIComponent(href)), 'calm words');
    await page.fill('#f-checkIn', today);
    await page.press('#f-checkIn', 'Tab');
    await page.waitForSelector('#calendarCheckIn');
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#calendarCheckIn')]);
    const ics = require('node:fs').readFileSync(await download.path(), 'utf8').replace(/\r\n /g, '');
    assert.ok(ics.includes('DTSTART;VALUE=DATE:' + today.replace(/-/g, '')) && ics.includes('mailto:' + email), 'a calendar invite with them invited');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    const checkins = () => page.locator(':is([data-tile=todo], [data-tile=attention]) .rowName', { hasText: 'Check in with ' + person }).count();
    assert.equal(await checkins(), 1, 'the check-in comes up (Needs attention when it is today)');

    // Settings, Automatic: switch check-ins and Funding Watch off
    await page.click('#setupBtn');
    if ((await page.getAttribute('[data-setup=automatic]', 'open')) === null) await page.click('[data-setup=automatic] summary');
    assert.equal(await page.isDisabled('#auto-emails'), true, 'reminder emails wait for SharePoint');
    for (const k of ['feeds', 'reviews', 'checkins', 'refresh']) assert.equal(await page.isChecked('#auto-' + k), true, k + ' starts on');
    await page.uncheck('#auto-checkins');
    await page.waitForFunction(() => /checkins=off/.test(window.NAMI.app.store.items('settings').find((s) => s.key === 'automatic').value));
    await page.uncheck('#auto-feeds');
    await page.waitForFunction(() => /feeds=off/.test(window.NAMI.app.store.items('settings').find((s) => s.key === 'automatic').value));
    await page.click('#homeBtn');
    await page.waitForSelector('[data-tile=todo]');
    assert.equal(await checkins(), 0, 'off means off');
    await page.reload();
    await page.waitForSelector('body[data-loaded=yes]');
    assert.ok(await page.locator('[data-search-now]').count() > 0, 'Funding Watch waits for Search now');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('in the browser: set up a meeting with the owner, team and you', { skip: !playwright && 'Playwright is not installed' }, async () => {
  const { browser, page, errors } = await openPage();
  try {
    const id = await openFirstRecord(page);
    const owner = await page.evaluate((rid) => window.NAMI.app.store.get('records', rid).owner, id);
    await page.click('#meetBtn');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'meetDay');
    await page.fill('#meetDay', '2026-12-03');
    await page.fill('#meetTime', '14:30');
    await page.selectOption('#meetLength', '60');
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#meetSave')]);
    const ics = require('node:fs').readFileSync(await download.path(), 'utf8').replace(/\r\n /g, '');
    assert.ok(ics.includes('DTSTART:20261203T143000') && ics.includes('DTEND:20261203T153000'), 'the time and length');
    const ownerEmail = await page.evaluate((n) => (window.NAMI.app.store.items('people').find((p) => p.person === n) || {}).email, owner);
    const meEmail = await page.evaluate(() => (window.NAMI.app.store.items('people').find((p) => p.person === window.NAMI.app.state.who.person) || {}).email);
    if (ownerEmail && ownerEmail !== meEmail) assert.ok(ics.includes('mailto:' + ownerEmail), 'the owner is invited');
    if (meEmail) assert.ok(ics.includes('ORGANIZER;CN=') && ics.includes('METHOD:REQUEST'), 'you are the organizer, so Outlook can send it');
    assert.ok(await page.isVisible('#meetBtn'), 'the button is back');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('in the browser: Problems and ideas at the bottom, saved with who and when, copied all at once', { skip: !playwright && 'Playwright is not installed' }, async () => {
  const { browser, page, errors } = await openPage();
  try {
    await page.click('#notesBox summary');
    await page.fill('#noteText', 'The Awards tile should show last year too');
    await page.click('#noteSave');
    await page.waitForSelector('#noteList .note');
    assert.equal(await page.inputValue('#noteText'), '', 'the box empties for the next note');
    const who = await page.evaluate(() => window.NAMI.app.state.who.person);
    assert.ok((await page.textContent('#noteList')).includes(who), 'with the person');
    const saved = await page.evaluate(() => window.NAMI.app.store.items('settings').find((s) => s.key === 'feedback').value);
    assert.ok(saved.includes('Awards tile'), 'an editor\'s notes are shared');
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    await page.click('#noteCopy');
    await page.waitForSelector('.toast');
    await page.click('#noteList .link');
    await page.waitForFunction(() => !document.querySelector('#noteList .note'));
    await page.click('.toast .link');
    await page.waitForSelector('#noteList .note');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('in the browser: check-ins on a grant: responsible people, dates from the start, repeats, reminder dates, invites and templates', { skip: !playwright && 'Playwright is not installed' }, async () => {
  const { browser, page, errors } = await openPage();
  try {
    // A record with a start date
    const id = await page.evaluate(() => window.NAMI.app.store.items('records').find((r) => r.startDate && r.endDate && r.status !== 'Archived').id);
    await page.evaluate((rid) => { window.NAMI.app.state.openId = null; }, id);
    await page.evaluate((rid) => document.querySelector('dialog') && 0, id);
    const start = await page.evaluate((rid) => window.NAMI.app.store.get('records', rid).startDate, id);
    await page.evaluate((rid) => window.NAMI.app.openDetail ? window.NAMI.app.openDetail(rid) : null, id);
    if (!(await page.locator('dialog[open]').count())) {
      await page.fill('#search', await page.evaluate((rid) => window.NAMI.app.store.get('records', rid).name, id));
      await page.locator(`[data-id="${id}"]`).first().click();
    }
    await page.waitForSelector('dialog[open] [data-section=checkins]');
    if ((await page.getAttribute('[data-section=checkins]', 'open')) === null) await page.click('[data-section=checkins] summary');
    const person = await page.evaluate(() => window.NAMI.app.store.items('people').find((p) => p.email && p.person !== window.NAMI.app.state.who.person).person);
    await page.locator('#planBlock label', { hasText: person }).locator('input').check();
    await page.waitForFunction((rid) => (window.NAMI.app.store.get('records', rid).checkInPlan || '').includes('people'), id);
    await page.fill('#planTitle', 'Support check-in');
    await page.press('#planTitle', 'Tab');
    await page.waitForFunction((rid) => (window.NAMI.app.store.get('records', rid).checkInPlan || '').includes('Support check-in'), id);
    await page.click('#planAdd3');
    await page.waitForFunction((rid) => JSON.parse(window.NAMI.app.store.get('records', rid).checkInPlan).dates.length === 1, id);
    const plan1 = await page.evaluate((rid) => JSON.parse(window.NAMI.app.store.get('records', rid).checkInPlan), id);
    const expect3 = await page.evaluate((s) => { const d = new Date(s + 'T12:00:00'); d.setMonth(d.getMonth() + 3); return window.NAMI.derive.iso(d); }, start);
    assert.equal(plan1.dates[0], expect3, '3 months from the start date');
    await page.click('#planRepeat');
    await page.waitForFunction((rid) => JSON.parse(window.NAMI.app.store.get('records', rid).checkInPlan).dates.length > 1, id);
    await page.click('#planRemindWeek');
    await page.waitForFunction((rid) => JSON.parse(window.NAMI.app.store.get('records', rid).checkInPlan).reminders.length > 0, id);
    // Undo takes the reminders back off
    await page.click('.toast .link');
    await page.waitForFunction((rid) => JSON.parse(window.NAMI.app.store.get('records', rid).checkInPlan).reminders.length === 0, id);
    await page.waitForSelector('#planBlock');
    if ((await page.getAttribute('[data-section=checkins]', 'open')) === null) await page.click('[data-section=checkins] summary');

    // Invites: one file with every date, them invited
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#planInvites')]);
    const ics = require('node:fs').readFileSync(await download.path(), 'utf8').replace(/\r\n /g, '');
    const n = await page.evaluate((rid) => JSON.parse(window.NAMI.app.store.get('records', rid).checkInPlan).dates.length, id);
    assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, n, 'one meeting per date');
    assert.ok(ics.includes('SUMMARY:Support check-in'));
    assert.ok(ics.replace(/\r\n /g, '').includes('ATTENDEE;CN=' + person), 'the responsible person is invited');
    assert.ok(require('node:fs').readFileSync(await download.path(), 'utf8').split('\r\n').every((l) => l.length <= 75), 'lines folded for Outlook');

    // Email: template, edit, save as a template
    await page.click('#planEmail');
    await page.waitForSelector('#mailBody');
    assert.ok((await page.inputValue('#mailBody')).includes('Hi ' + person.split(' ')[0]));
    await page.fill('#mailBody', (await page.inputValue('#mailBody')) + '\nBring the sign-in sheets.');
    await page.click('#mailSaveAs');
    await page.fill('#mailSaveName', 'Check-in with sheets');
    await page.click('#mailSaveTemplate');
    await page.waitForFunction(() => (window.NAMI.app.store.items('settings').find((s) => s.key === 'emailTemplates') || {}).value);
    const saved = await page.evaluate(() => JSON.parse(window.NAMI.app.store.items('settings').find((s) => s.key === 'emailTemplates').value)[0]);
    assert.ok(saved.body.includes('{name}') && saved.body.includes('{grant}') && saved.body.includes('Bring the sign-in sheets.'), 'saved with the fill-ins kept');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
