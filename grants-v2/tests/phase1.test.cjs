// Phase 1: the schema, the sample data and the Sample-mode data layer.
// Run: node --test grants-v2/tests/phase1.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const schema = require('../js/schema.js');
const sample = require('../js/sample-data.js');
const data = require('../js/data.js');

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
const TODAY = new Date(2026, 10, 1);

test('the schema has the nine lists from SPEC.md, and only Records: Name is required', () => {
  assert.deepEqual(schema.LISTS.map((l) => l.sp), ['Records', 'AwardYears', 'Tasks', 'Progress', 'Watch', 'Feeds', 'Labels', 'People', 'Settings']);
  const required = [];
  schema.LISTS.forEach((l) => l.columns.forEach((c) => { if (c.required) required.push(l.key + '.' + c.key); }));
  assert.deepEqual(required, ['records.name']);
  schema.LISTS.forEach((l) => {
    const sp = l.columns.map((c) => c.sp);
    assert.equal(new Set(sp).size, sp.length, l.key + ' has duplicate SharePoint column names');
  });
});

test('no on-screen label uses words the design guide keeps out', () => {
  const banned = /\b(overdue|deadline|must|should|failed|behind)\b/i;
  schema.LISTS.forEach((l) => {
    assert.ok(!banned.test(l.label), l.label);
    l.columns.forEach((c) => assert.ok(!banned.test(c.label), l.key + '.' + c.key + ': ' + c.label));
  });
  Object.values(schema.STATUS_NOTES).forEach((n) => assert.ok(!banned.test(n), n));
});

test('sample data fills every list, uses only known columns and valid choices', () => {
  const built = sample.build(TODAY);
  const custom = built.settings.find((x) => x.key === 'customColumns').value.split(';').map((x) => x.trim().split('|')[0]);
  schema.LISTS.forEach((l) => {
    const items = built[l.key];
    assert.ok(Array.isArray(items) && items.length > 0, l.key + ' is empty');
    const known = new Set(['id', 'created', 'modified', ...l.columns.map((c) => c.key), ...(l.key === 'records' ? custom : [])]);
    items.forEach((it) => {
      Object.keys(it).forEach((k) => assert.ok(known.has(k), l.key + ' has unknown field ' + k));
      l.columns.forEach((c) => {
        const v = it[c.key];
        if (v === undefined || v === '' || v === null) return;
        if (c.choices) assert.ok(c.choices.includes(v), `${l.key}.${c.key} = ${v}`);
        if (c.type === 'date') assert.match(v, /^\d{4}-\d{2}-\d{2}$/);
        if (c.type === 'lookup') assert.ok(built[c.list].some((t) => t.id === v), `${l.key}.${c.key} points at missing ${c.list} #${v}`);
        if (c.type === 'currency' || c.type === 'number') assert.equal(typeof v, 'number');
        if (c.type === 'yesno') assert.equal(typeof v, 'boolean');
      });
    });
  });
});

test('sample data covers the cases later phases need', () => {
  const r = sample.build(TODAY).records;
  ['Potentials', 'Upcoming', 'Applied', 'Awarded', 'Archived'].forEach((s) => assert.ok(r.some((x) => x.status === s), 'no ' + s));
  ['Closed', 'Declined', 'Not pursued'].forEach((s) => assert.ok(r.some((x) => x.archiveReason === s), 'no archive reason ' + s));
  assert.ok(r.some((x) => x.recordType === 'County contract'), 'no county contract');
  assert.ok(r.some((x) => x.startDate && x.endDate && x.startDate.slice(0, 4) !== x.endDate.slice(0, 4)), 'no multi-year record');
  assert.ok(r.some((x) => x.status === 'Awarded' && x.endDate && x.endDate < '2026-11-01'), 'no past-end-date record');
  assert.ok(r.some((x) => x.watchDate), 'no watch date');
  assert.ok(r.every((x) => x.name && x.name.trim()), 'a record has no name');
  assert.ok(r.some((x) => x.status === 'Awarded' && x.startDate > '2026-11-01'), 'no awarded record that starts later');
  const all = sample.build(TODAY);
  assert.ok(all.watch.some((w) => w.opens === '11'), 'no watch item opening this month');
  assert.ok(all.feeds.some((f) => f.type === 'Feed link'), 'no feed link');
  assert.ok(all.labels.some((x) => x.key === 'status.Awarded'), 'no Awarded label');
  assert.ok(all.settings.some((x) => x.key === 'filters'), 'no filters setting');
});

test('sample data is labeled fictional', () => {
  const src = require('node:fs').readFileSync(require.resolve('../js/sample-data.js'), 'utf8');
  assert.match(src, /FICTIONAL/);
  const b = sample.build(TODAY);
  b.people.forEach((p) => assert.match(p.person, /\(sample\)/));
  b.records.filter((r) => r.funder).forEach((r) => assert.match(r.funder, /\(sample\)/, r.funder));
  b.records.filter((r) => r.contactName).forEach((r) => assert.match(r.contactName, /\(sample\)/, r.contactName));
});

test('Sample mode loads all lists', async () => {
  const store = data.createSampleStore({ storage: memoryStorage(), build: sample.build, today: TODAY });
  const lists = await store.load();
  schema.LISTS.forEach((l) => assert.ok(lists[l.key].length > 0, l.key));
  assert.equal(store.mode, 'sample');
  assert.ok(store.loadedAt instanceof Date);
});

test('adding with only a name fills Status, Owner and Record type; a blank name is refused', async () => {
  const store = data.createSampleStore({ storage: memoryStorage(), build: sample.build, today: TODAY });
  await store.load();
  const added = await store.add('records', { name: 'Quick idea' }, { me: 'Tester (sample)' });
  assert.equal(added.status, 'Potentials');
  assert.equal(added.owner, 'Tester (sample)');
  assert.equal(added.recordType, 'Grant');
  assert.ok(added.id > 0 && added.created && added.modified);
  await assert.rejects(store.add('records', { name: '   ' }), /Name is needed/);
});

test('update returns the before copy for Undo, and keeps data across a reload', async () => {
  const storage = memoryStorage();
  const store = data.createSampleStore({ storage, build: sample.build, today: TODAY });
  await store.load();
  const first = store.items('records')[0];
  const res = await store.update('records', first.id, { status: 'Archived', archiveReason: 'Closed' });
  assert.equal(res.before.status, first.status);
  assert.equal(res.item.status, 'Archived');
  await assert.rejects(store.update('records', first.id, { name: '' }), /Name is needed/);
  assert.equal(store.get('records', first.id).name, first.name, 'a refused update changes nothing');

  const again = data.createSampleStore({ storage, build: sample.build, today: TODAY });
  await again.load();
  assert.equal(again.get('records', first.id).status, 'Archived');

  await again.restore('records', res.before);
  assert.equal(again.get('records', first.id).status, first.status, 'Undo puts it back');
});

test('Undo clears a field that was empty before the change', async () => {
  const store = data.createSampleStore({ storage: memoryStorage(), build: sample.build, today: TODAY });
  await store.load();
  const bare = store.items('records').find((x) => !x.deadline);
  const res = await store.update('records', bare.id, { deadline: '2026-12-01' });
  await store.restore('records', res.before);
  assert.equal(store.get('records', bare.id).deadline, undefined);
});

test('custom columns ride along on add', async () => {
  const store = data.createSampleStore({ storage: memoryStorage(), build: sample.build, today: TODAY });
  await store.load();
  const added = await store.add('records', { name: 'With extra', boardMeeting: 'March' });
  assert.equal(added.boardMeeting, 'March');
});

test('remove (for Undo of an add) and reset', async () => {
  const store = data.createSampleStore({ storage: memoryStorage(), build: sample.build, today: TODAY });
  await store.load();
  const before = store.items('records').length;
  const added = await store.add('records', { name: 'Undo me' });
  await store.remove('records', added.id);
  assert.equal(store.items('records').length, before);
  await store.update('records', 1, { name: 'Changed' });
  await store.reset();
  assert.notEqual(store.get('records', 1).name, 'Changed');
});

test('the page still works when browser storage is blocked', async () => {
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  const store = data.createSampleStore({ storage: broken, build: sample.build, today: TODAY });
  const lists = await store.load();
  assert.ok(lists.records.length > 0);
  await store.add('records', { name: 'Still fine' });
});

test('SharePoint mode has the same interface as Sample mode', async () => {
  const sp = data.createSharePointStore({ siteUrl: 'https://x.sharepoint.com/sites/G', token: () => Promise.resolve('t') });
  const sm = data.createSampleStore({ storage: memoryStorage(), build: sample.build });
  ['mode', 'load', 'items', 'get', 'add', 'update', 'restore', 'remove', 'reset', 'loadedAt'].forEach((k) => {
    assert.ok(k in sp, 'SharePoint store lacks ' + k);
    assert.ok(k in sm, 'Sample store lacks ' + k);
  });
  await assert.rejects(sp.reset(), /never started over/);
});
