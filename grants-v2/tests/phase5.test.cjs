// Phase 5: sign-in, roles, program views, Progress.
// Done when: a viewer cannot edit records but can log progress.
// Run: node --test tests/*.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
global.window = globalThis; // the modules attach to window.NAMI in a page
require('../js/schema.js');
require('../js/sample-data.js');
const data = require('../js/data.js');
const A = require('../js/access.js');
const auth = require('../js/auth.js');

const PEOPLE = [
  { person: 'Ed Itor', email: 'ed@example.org', role: 'Editor', programs: 'All' },
  { person: 'Vi Ewer', email: 'Vi@Example.org', role: 'Viewer', programs: 'Peer-to-Peer; NAMI Basics' }
];

test('who is signed in comes from the People list, by email first', () => {
  assert.equal(A.whoIs(PEOPLE, { name: 'Someone', email: 'vi@example.org' }).person, 'Vi Ewer', 'email match ignores case');
  const v = A.whoIs(PEOPLE, { name: 'Vi Ewer' });
  assert.deepEqual([v.role, v.all, v.programs], ['Viewer', false, ['Peer-to-Peer', 'NAMI Basics']]);
  assert.equal(A.whoIs(PEOPLE, { name: 'Ed Itor' }).all, true);
  assert.equal(A.whoIs(PEOPLE, { name: 'Ed Itor', email: 'other@example.org' }, { byEmailOnly: true }).role, 'Viewer', 'with Microsoft, a matching name is not enough');
  const stranger = A.whoIs(PEOPLE, { name: 'New Person', email: 'new@example.org' });
  assert.deepEqual([stranger.role, stranger.listed, stranger.all], ['Viewer', false, true], 'not listed: a viewer of everything');
});

test('editors change everything; viewers log progress only on their own tasks', () => {
  const ed = A.whoIs(PEOPLE, { name: 'Ed Itor' }), vi = A.whoIs(PEOPLE, { name: 'Vi Ewer' });
  assert.ok(A.can(ed, 'edit') && A.can(ed, 'log', { assignedTo: 'Someone else' }));
  assert.ok(!A.can(vi, 'edit'));
  assert.ok(A.can(vi, 'log', { assignedTo: 'Vi Ewer' }));
  assert.ok(!A.can(vi, 'log', { assignedTo: 'Ed Itor' }));
  assert.ok(!A.can(null, 'log', { assignedTo: 'Vi Ewer' }));
});

test('program views: a viewer sees their programs and records with none', () => {
  const vi = A.whoIs(PEOPLE, { name: 'Vi Ewer' });
  assert.ok(A.inPrograms(vi, { program: 'Peer-to-Peer' }));
  assert.ok(!A.inPrograms(vi, { program: 'Family-to-Family' }));
  assert.ok(A.inPrograms(vi, { program: '' }));
  assert.ok(A.inPrograms(A.whoIs(PEOPLE, { name: 'Ed Itor' }), { program: 'Family-to-Family' }));
});

test('the store refuses a viewer\'s changes to records and tasks but takes their progress', async () => {
  const raw = data.createSampleStore({ fresh: true, today: new Date(2026, 10, 1) });
  await raw.load();
  let who = A.whoIs(raw.items('people'), { name: 'Sam Okafor (sample)' });
  const store = A.guard(raw, () => who);
  const rec = raw.items('records')[0];
  await assert.rejects(store.update('records', rec.id, { name: 'x' }), /Only editors/);
  await assert.rejects(store.add('records', { name: 'x' }), /Only editors/);
  const sams = raw.items('tasks').find((t) => t.assignedTo === 'Sam Okafor (sample)');
  const other = raw.items('tasks').find((t) => t.assignedTo !== 'Sam Okafor (sample)');
  await assert.rejects(store.update('tasks', sams.id, { done: true }), /Only editors/);
  await assert.rejects(store.add('progress', { task: other.id, step: 'x', done: true }), /Only editors/);
  const row = await store.add('progress', { task: sams.id, step: 'Director signs', done: true, person: 'Someone else' });
  assert.equal(row.person, 'Sam Okafor (sample)', 'progress is always in the signed-in person\'s name');
  await store.remove('progress', row.id); // Undo of their own entry
  assert.equal(raw.get('progress', row.id), null);
  assert.equal(raw.get('records', rec.id).name, rec.name, 'nothing changed');
  who = A.whoIs(raw.items('people'), { name: 'Morgan Reyes (sample)' });
  await store.update('records', rec.id, { name: 'Edited by an editor' });
  assert.equal(raw.get('records', rec.id).name, 'Edited by an editor');
});

test('steps: the latest check counts, comments in order', () => {
  const task = { id: 7, steps: 'One\nTwo\n\nThree' };
  const progress = [
    { id: 1, task: 7, step: 'One', done: true, person: 'A', date: '2026-10-01' },
    { id: 2, task: 7, step: 'Two', done: true, person: 'A', date: '2026-10-02' },
    { id: 3, task: 7, step: 'Two', done: false, person: 'B', date: '2026-10-03' },
    { id: 4, task: 7, step: '', comment: 'First note', person: 'B', date: '2026-10-03' },
    { id: 5, task: 8, step: 'Three', done: true }
  ];
  const s = A.stepState(task, progress);
  assert.deepEqual(s.steps.map((x) => x.done), [true, false, false]);
  assert.equal(s.done, 1);
  assert.equal(s.steps[0].by, 'A');
  assert.deepEqual(s.comments.map((c) => c.comment), ['First note']);
});

test('sample sign-in keeps the chosen person and starts on an editor', async () => {
  const mem = {}; const storage = { getItem: (k) => mem[k] || null, setItem: (k, v) => { mem[k] = v; } };
  const a = auth.createSampleAuth({ storage, people: () => PEOPLE });
  assert.equal((await a.start()).name, 'Ed Itor');
  await a.signIn('Vi Ewer');
  assert.equal((await a.start()).name, 'Vi Ewer');
  assert.equal(auth.createAuth({ mode: 'microsoft', microsoft: {} }, {}).mode, 'microsoft');
  await assert.rejects(auth.createMicrosoftAuth({}).start(), /not set up yet/);
});

let playwright = null;
try { playwright = require('playwright'); } catch (e) { /* skipped */ }

test('in the browser: a viewer cannot edit records but can log progress', { skip: !playwright && 'Playwright is not installed' }, async () => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await page.addInitScript(() => { try { localStorage.setItem('nami-grants-v2-edit-first', 'yes'); } catch (e) { /* fine */ } }); // older tests type straight into a grant
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await page.waitForSelector('body[data-loaded=yes]');

  // Starts as the sample editor
  assert.equal(await page.inputValue('#whoSelect'), 'Morgan Reyes (sample)');
  assert.ok(await page.isVisible('#add'));

  // Switch to Sam, a viewer of two programs
  await page.selectOption('#whoSelect', 'Sam Okafor (sample)');
  await page.waitForFunction(() => window.NAMI.app.state.who.person === 'Sam Okafor (sample)');
  assert.ok(await page.isHidden('#add'), 'no Add for viewers');
  assert.ok(await page.isHidden('#setupBtn'), 'no Labels and fields for viewers');
  assert.ok(await page.isHidden('#reset'), 'no Start over for viewers');
  assert.equal(await page.evaluate(() => window.NAMI.app.store.reset().then(() => 'reset', (e) => e.message)), 'Only editors can change this.');
  assert.equal(await page.locator('[data-tile=attention] .check, [data-tile=todo] .check').count(), 0, 'no Mark done for viewers');

  // Program view: only Sam's programs (and records with none), with one tap to see everything
  const shown = async () => page.evaluate(() => Array.from(document.querySelectorAll('[data-tile=pipeline] .mini .link')).map((a) => a.textContent));
  const allNames = await page.evaluate(() => window.NAMI.app.store.items('records'));
  const outside = allNames.filter((r) => r.program && !['Ending the Silence', 'Crisis education'].includes(r.program)).map((r) => r.name);
  assert.ok((await shown()).every((n) => !outside.includes(n)), 'nothing from other programs');
  await page.click('#programsChip');
  assert.ok((await shown()).some((n) => outside.includes(n)), 'everything after the tap');
  await page.click('#toastUndo');
  assert.ok((await shown()).every((n) => !outside.includes(n)), 'Undo brings the program view back');

  // A search looks in every program
  await page.fill('#search', 'Family Education');
  assert.equal(await page.locator('.group .rowName', { hasText: 'Family Education Expansion' }).count(), 1);
  await page.fill('#search', '');

  // A record reads, and cannot be changed
  await page.click('[data-tile=pipeline] .mini .link >> text=School Outreach Pilot');
  await page.waitForSelector('dialog[open]');
  assert.equal(await page.locator('dialog input, dialog select, dialog textarea').count(), 0, 'no editable fields');
  assert.equal(await page.locator('dialog .detailActions').count(), 0, 'no Archive');
  assert.equal(await page.textContent('#detailName'), 'School Outreach Pilot', 'the name is the heading, not repeated as a row');
  assert.equal(await page.locator('#f-name').count(), 0);
  const refused = await page.evaluate(() => window.NAMI.app.store.update('records', window.NAMI.app.state.openId, { name: 'Hacked' }).then(() => 'saved', (e) => e.message));
  assert.equal(refused, 'Only editors can change this.');

  // ...but Sam's own task takes progress: a checked step and a comment, each with Undo
  await page.click('dialog [data-task]');
  await page.waitForSelector('#taskSteps');
  assert.equal(await page.locator('dialog #f-title').count(), 0, 'task details are not editable');
  await page.check('#step-1');
  await page.waitForFunction(() => window.NAMI.app.store.items('progress').some((p) => p.step === 'Director signs' && p.done && p.person === 'Sam Okafor (sample)'));
  assert.ok((await page.textContent('#taskSteps')).includes('2 steps done'), 'counts forward');
  assert.equal(await page.locator('#taskSteps .meter').count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'step-1', 'focus stays on the step');
  await page.click('#toastUndo'); // Undo of a step keeps focus on that step
  await page.waitForFunction(() => !window.NAMI.app.store.items('progress').some((p) => p.step === 'Director signs' && p.done));
  assert.equal(await page.evaluate(() => document.activeElement.id), 'step-1');
  await page.check('#step-1');
  await page.waitForFunction(() => window.NAMI.app.store.items('progress').some((p) => p.step === 'Director signs' && p.done));
  await page.fill('#commentText', 'Director is out until Friday.');
  await page.click('#addComment');
  await page.waitForSelector('#taskComments li');
  assert.ok((await page.textContent('#taskComments')).includes('Director is out until Friday.'));
  await page.click('#toastUndo');
  await page.waitForFunction(() => !window.NAMI.app.store.items('progress').some((p) => p.comment === 'Director is out until Friday.'));
  await page.keyboard.press('Escape');

  // The To-do note shows the progress
  assert.ok((await page.textContent('[data-tile=attention]')).includes('2 steps done'));

  // Someone else's task: the steps are there to read but not to check
  await page.click('#programsChip');
  await page.evaluate(() => window.NAMI.app.openTask(window.NAMI.app.store.items('tasks').find((t) => t.assignedTo === 'Morgan Reyes (sample)' && !t.done).id));
  await page.waitForSelector('#taskSteps');
  assert.equal(await page.locator('#taskSteps input').count(), 0, 'a plain list, nothing to press');
  assert.equal(await page.locator('#commentText').count(), 0);
  await page.keyboard.press('Escape');

  // A task assigned to Sam on a record outside Sam's programs still shows in To-do
  await page.click('#programsChip'); // back to Sam's programs (the chip was turned off above)
  await page.evaluate(() => window.NAMI.app.rawStore.add('tasks', { record: window.NAMI.app.store.items('records').find((r) => r.name === 'Peer Workforce Subaward').id, title: 'Sam helps with letters', assignedTo: 'Sam Okafor (sample)', dueDate: '2099-01-01', done: false }).then(() => window.NAMI.app.render()));
  assert.ok((await page.textContent('[data-tile=todo]')).includes('Sam helps with letters'));
  await page.check('#myTodo');
  assert.ok((await page.textContent('[data-tile=todo]')).includes('Sam helps with letters'));
  await page.uncheck('#myTodo');

  // Back as the editor: tasks can be added and edited, and marked done
  await page.selectOption('#whoSelect', 'Morgan Reyes (sample)');
  await page.waitForFunction(() => window.NAMI.app.state.who.role === 'Editor');
  assert.ok(await page.isVisible('#add'));
  await page.evaluate(() => window.NAMI.app.openDetail(window.NAMI.app.store.items('records').find((r) => r.name === 'Peer Workforce Subaward').id));
  await page.fill('#newTaskTitle', 'Ask partners for letters');
  await page.click('#addTask');
  await page.waitForSelector('[data-task-view] #f-dueDate');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'f-dueDate');
  await page.fill('#f-steps', 'Email county A\nEmail county B');
  await page.press('#f-steps', 'Tab');
  await page.waitForSelector('#taskSteps #step-1');
  await page.check('#step-0');
  await page.waitForFunction(() => window.NAMI.app.store.items('progress').some((p) => p.step === 'Email county A' && p.person === 'Morgan Reyes (sample)'));
  await page.click('#taskDone');
  await page.waitForFunction(() => window.NAMI.app.store.items('tasks').some((t) => t.title === 'Ask partners for letters' && t.done));
  await page.click('#toastUndo');
  await page.waitForFunction(() => window.NAMI.app.store.items('tasks').some((t) => t.title === 'Ask partners for letters' && !t.done));
  await page.click('#taskRecord');
  await page.waitForSelector('#f-name');

  // Each person keeps their own tile layout
  await page.keyboard.press('Escape');
  await page.click('#tile-archive');
  await page.selectOption('#whoSelect', 'Dana Whitfield (sample)');
  await page.waitForFunction(() => window.NAMI.app.state.who.person === 'Dana Whitfield (sample)');
  assert.ok(await page.$('[data-tile=archive] .tileBody'), 'Dana has their own layout');
  await page.selectOption('#whoSelect', 'Morgan Reyes (sample)');
  await page.waitForFunction(() => window.NAMI.app.state.who.person === 'Morgan Reyes (sample)');
  assert.equal(await page.$('[data-tile=archive] .tileBody'), null, 'Morgan\'s closed tile stays closed');

  // Phone: no sideways scroll with the person list in the header
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);

  assert.deepEqual(errors, []);
  await browser.close();
});

test('in the browser: Microsoft mode without an app registration says so plainly', { skip: !playwright && 'Playwright is not installed' }, async () => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();
  await page.addInitScript(() => { try { localStorage.setItem('nami-grants-v2-edit-first', 'yes'); } catch (e) { /* fine */ } }); // older tests type straight into a grant
  page.setDefaultTimeout(8000);
  await page.route('**/js/config.js', (route) => route.fulfill({ contentType: 'text/javascript', body: "window.NAMI_CONFIG = { mode: 'microsoft', microsoft: { clientId: '', tenantId: '' } };" }));
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.waitForSelector('body[data-loaded=yes]');
  assert.ok((await page.textContent('.signIn')).includes('not set up yet'));
  assert.ok(await page.isHidden('#add'));
  await browser.close();
});
