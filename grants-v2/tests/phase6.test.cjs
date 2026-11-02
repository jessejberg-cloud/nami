// Phase 6: Funding Watch.
// Done when: Grants.gov results show; a feed can be added and removed; a watch date creates a To-do item.
// Run: node --test tests/*.test.cjs
// Grants.gov cannot be reached from the build machine, so its answers here are fixtures in the
// shape of the search2 API, and the feed function is run with a stand-in fetch.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
global.window = globalThis;
require('../js/schema.js');
const W = require('../js/watch.js');

const SEARCH2 = {
  errorcode: 0,
  data: {
    hitCount: 2,
    oppHits: [
      { id: '358001', number: 'SM-26-001', title: 'Peer Recovery Support Services', agency: 'Substance Abuse and Mental Health Services Administration', openDate: '10/01/2026', closeDate: '12/15/2026', oppStatus: 'posted' },
      { id: '358002', number: 'HRSA-27-010', title: 'Rural Behavioral Health Outreach', agencyCode: 'HHS-HRSA', openDate: '', closeDate: '', oppStatus: 'forecasted' },
      { id: '358003', title: '   ', agency: 'Nobody' }
    ]
  }
};

test('Grants.gov answers become results', () => {
  const req = W.grantsGovRequest('peer support');
  assert.deepEqual(req, { keyword: '"peer support"', oppStatuses: 'forecasted|posted', eligibilities: '12', rows: 25 }, 'a phrase stays a phrase');
  assert.equal(W.grantsGovRequest('crisis').keyword, 'crisis');
  const items = W.grantsGovItems(SEARCH2);
  assert.equal(items.length, 2, 'a result with no title is left out');
  assert.deepEqual(items[0], {
    id: 'gg-358001', title: 'Peer Recovery Support Services', source: 'Substance Abuse and Mental Health Services Administration',
    date: '2026-12-15', opens: '2026-10-01', url: 'https://www.grants.gov/search-results-detail/358001', number: 'SM-26-001'
  });
  assert.equal(items[1].source, 'HHS-HRSA');
  assert.equal(items[1].date, '');
  assert.deepEqual(W.grantsGovItems({}), []);
});

test('RSS and Atom feeds are read; anything else is refused', () => {
  const rss = '<?xml version="1.0"?><rss version="2.0"><channel><title>News</title>' +
    '<item><title><![CDATA[Fall grants open & ready]]></title><link>https://example.org/a?x=1&amp;y=2</link><pubDate>Mon, 02 Nov 2026 10:00:00 GMT</pubDate><guid>a1</guid></item>' +
    '<item><title>Bad link</title><link>javascript:alert(1)</link></item></channel></rss>';
  const r = W.parseFeed(rss);
  assert.equal(r.length, 2);
  assert.equal(r[0].title, 'Fall grants open & ready');
  assert.equal(r[0].url, 'https://example.org/a?x=1&y=2');
  assert.equal(r[0].date, '2026-11-02');
  assert.equal(r[1].url, '', 'an unsafe link is dropped');

  const atom = '<feed xmlns="http://www.w3.org/2005/Atom"><entry><title type="html">Spring &lt;b&gt;cycle&lt;/b&gt;</title>' +
    '<link rel="alternate" href="https://example.org/spring"/><updated>2026-03-01T00:00:00Z</updated><id>tag:1</id></entry></feed>';
  const a = W.parseFeed(atom);
  assert.equal(a[0].url, 'https://example.org/spring');
  assert.equal(a[0].date.slice(0, 7), '2026-03');
  assert.match(a[0].title, /^Spring/);
  assert.throws(() => W.parseFeed('<html><body>Hello</body></html>'), /not a feed/);
});

test('only public web addresses are fetched', () => {
  assert.equal(W.safeFeedUrl('https://example.org/feed.xml'), 'https://example.org/feed.xml');
  ['http://localhost/x', 'http://127.0.0.1/', 'http://10.0.0.5/', 'http://192.168.1.1/', 'http://172.20.0.1/', 'http://169.254.169.254/latest',
    'http://[::1]/', 'http://[::]/', 'http://[::ffff:127.0.0.1]/', 'http://[::ffff:a9fe:a9fe]/', 'http://100.64.1.1/', 'http://[fd00::1]/', 'file:///etc/passwd', 'ftp://example.org/', 'https://user:pw@example.org/', 'http://intranet/', 'not a url', '']
    .forEach((u) => assert.equal(W.safeFeedUrl(u), null, u));
});

test('a cycle month and a watch date make Review items, once each time round', () => {
  const today = new Date(2026, 10, 1); // 1 November 2026
  assert.deepEqual(W.nextOpening({ opens: '11' }, today), { year: 2026, month: 11 }, 'this month counts');
  assert.deepEqual(W.nextOpening({ opens: '2' }, today), { year: 2027, month: 2 });
  assert.equal(W.nextOpening({ opens: '' }, today), null);

  const watch = [
    { id: 1, name: 'This month', opens: '11', repeatsYearly: true, created: '2026-01-05T00:00:00Z' },
    { id: 2, name: 'Earlier this year', opens: '3', repeatsYearly: true, created: '2026-01-05T00:00:00Z' },
    { id: 3, name: 'Reviewed already', opens: '3', repeatsYearly: true, created: '2025-01-05T00:00:00Z', lastReviewed: '2026-03-10' },
    { id: 4, name: 'Added after it opened', opens: '9', repeatsYearly: true, created: '2026-10-20T00:00:00Z' },
    { id: 5, name: 'One time, done', opens: '6', repeatsYearly: false, created: '2025-01-05T00:00:00Z', lastReviewed: '2025-06-02' },
    { id: 6, name: 'Last year review, yearly', opens: '6', repeatsYearly: true, created: '2025-01-05T00:00:00Z', lastReviewed: '2025-06-02' },
    { id: 7, name: 'No month', opens: '', repeatsYearly: true }
  ];
  const recs = [
    { id: 10, name: 'Arrived', watchDate: '2026-11-01' },
    { id: 11, name: 'Later', watchDate: '2026-12-01' }
  ];
  watch.push({ id: 8, name: 'One time, said No', opens: '3', repeatsYearly: 'No', created: '2025-01-05T00:00:00Z', lastReviewed: '2025-03-02' });
  const out = W.reviewItems(watch, recs, today);
  assert.deepEqual(out.map((i) => i.title), ['Review: This month', 'Review: Earlier this year', 'Review: Last year review, yearly', 'Review: Arrived']);
  assert.equal(out[0].date, '2026-11-01');
  assert.equal(out[2].date, '2026-06-01');
  assert.equal(out[3].record.id, 10);

  // Across the turn of the year: a December cycle, added in December, checked in January
  const jan = new Date(2027, 0, 10);
  const dec = [{ id: 1, name: 'December round', opens: '12', repeatsYearly: true, created: '2026-12-03T00:00:00Z' }];
  assert.deepEqual(W.reviewItems(dec, [], jan).map((i) => i.date), ['2026-12-01']);
  dec[0].lastReviewed = '2026-12-20';
  assert.equal(W.reviewItems(dec, [], jan).length, 0, 'reviewed in December: nothing more until next December');
  assert.deepEqual(W.nextOpening({ opens: '1' }, new Date(2026, 11, 31)), { year: 2027, month: 1 });
  // A record's watch date arriving makes a Review whatever its status (the renewal reminder)
  assert.equal(W.reviewItems([], [{ id: 3, name: 'Old award', status: 'Archived', watchDate: '2027-01-02' }], jan).length, 1);
});

test('the page asks the feed function, or uses sample results from a folder', async () => {
  const asked = [];
  const fakeFetch = (url) => { asked.push(url); return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [{ id: 'x', title: 'X' }] }) }); };
  const c = W.createFeedClient({ endpoint: '/fn', fetch: fakeFetch });
  assert.deepEqual(await c.load({ type: 'Quick link', source: 'https://example.org' }), []);
  assert.equal((await c.load({ type: 'Grants.gov', source: 'mental health; crisis' })).length, 1);
  await c.load({ type: 'Feed link', source: 'https://example.org/f.xml' });
  assert.deepEqual(asked, ['/fn?type=grantsgov&keywords=mental%20health%3B%20crisis', '/fn?type=feed&url=https%3A%2F%2Fexample.org%2Ff.xml']);
  await assert.rejects(c.load({ type: 'Feed link', source: 'http://localhost/' }), /not loading/);
  const bad = W.createFeedClient({ endpoint: '/fn', fetch: () => Promise.resolve({ ok: false, json: () => Promise.resolve({ problem: 'The source answered 500.' }) }) });
  await assert.rejects(bad.load({ type: 'Grants.gov', source: 'x' }), /500/);

  const sample = W.createFeedClient({ endpoint: 'sample', sampleResults: () => Promise.resolve([1, 2]) });
  assert.deepEqual(await sample.load({ type: 'Grants.gov' }), [1, 2]);
});

function answer(status, body, headers) {
  return {
    ok: status >= 200 && status < 300, status,
    headers: { get: (k) => (headers || {})[k.toLowerCase()] || null },
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body))
  };
}

test('the feed function: Grants.gov by keyword, feeds by link, nothing private', async () => {
  const fn = await import(path.resolve(__dirname, '../netlify/functions/feeds.mjs'));
  const dns = { 'example.org': '93.184.215.14', 'api.grants.gov': '23.1.2.3', 'localtest.me': '127.0.0.1', 'v6.example.org': '::ffff:10.0.0.1' };
  const resolve = (host) => Promise.resolve(dns[host] ? [{ address: dns[host] }] : []);
  const calls = [];
  const gg = (url, init) => { calls.push(JSON.parse(init.body).keyword); return Promise.resolve(answer(200, SEARCH2)); };
  const items = await fn.grantsGov('mental health; peer support; mental health', gg, resolve);
  assert.deepEqual(calls, ['"mental health"', '"peer support"'], 'each keyword asked once');
  assert.equal(items.length, 2, 'the same opportunity found twice shows once');
  assert.equal(items[0].id, 'gg-358001', 'soonest closing first');
  await assert.rejects(fn.grantsGov('', gg, resolve), /No keywords/);
  // One keyword failing still gives the others' results
  let k = 0;
  assert.equal((await fn.grantsGov('a; b', () => Promise.resolve(k++ ? answer(500, 'no') : answer(200, SEARCH2)), resolve)).length, 2);
  // A result with a keyword in its title comes before one that only closes sooner
  const mixed = { data: { oppHits: [
    { id: '1', title: 'Travel-associated Infectious Diseases', agency: 'CDC', closeDate: '11/05/2026' },
    { id: '2', title: 'Peer Support Recovery Services', agency: 'SAMHSA', closeDate: '01/15/2027' }
  ] } };
  const ranked = await fn.grantsGov('peer support', () => Promise.resolve(answer(200, mixed)), resolve);
  assert.deepEqual(ranked.map((i) => i.id), ['gg-2', 'gg-1']);

  const rss = '<rss><channel><item><title>One</title><link>https://example.org/1</link></item></channel></rss>';
  assert.equal((await fn.feed('https://example.org/f.xml', () => Promise.resolve(answer(200, rss)), resolve))[0].title, 'One');
  await assert.rejects(fn.feed('http://127.0.0.1/f.xml', () => Promise.resolve(answer(200, rss)), resolve), /not a public/);
  // A public-looking name that points inside a network is refused before anything is fetched
  let fetched = 0;
  const count = () => { fetched++; return Promise.resolve(answer(200, rss)); };
  await assert.rejects(fn.feed('http://localtest.me/f.xml', count, resolve), /not a public/);
  await assert.rejects(fn.feed('http://v6.example.org/f.xml', count, resolve), /not a public/);
  assert.equal(fetched, 0);
  // A redirect to a private address is never followed
  const hops = [];
  const sneaky = (url) => { hops.push(url); return Promise.resolve(answer(302, '', { location: 'http://169.254.169.254/latest' })); };
  await assert.rejects(fn.feed('https://example.org/f.xml', sneaky, resolve), /will not follow/);
  assert.deepEqual(hops, ['https://example.org/f.xml']);
  // A public redirect is followed
  let n = 0;
  const moved = () => Promise.resolve(n++ ? answer(200, rss) : answer(301, '', { location: '/new.xml' }));
  assert.equal((await fn.feed('https://example.org/f.xml', moved, resolve)).length, 1);
  await assert.rejects(fn.feed('https://example.org/f.xml', () => Promise.resolve(answer(200, '<html></html>')), resolve), /not a feed/);

  const res = await fn.default(new Request('https://x.netlify.app/.netlify/functions/feeds?type=other'));
  assert.equal(res.status, 400);
  assert.equal(res.headers.get('cache-control'), 'no-store', 'a failure is never kept');
});

let playwright = null;
try { playwright = require('playwright'); } catch (e) { /* skipped */ }

test('in the browser: Grants.gov results, feeds added and removed, a watch date in To-do', { skip: !playwright && 'Playwright is not installed' }, async () => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await page.addInitScript(() => { try { localStorage.setItem('nami-grants-v2-edit-first', 'yes'); } catch (e) { /* fine */ } }); // older tests type straight into a grant
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try { await browserSteps(page, errors); } finally { await browser.close(); }
});

async function browserSteps(page, errors) {
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await page.waitForSelector('body[data-loaded=yes]');
  const tile = page.locator('[data-tile=watch]');

  // Grants.gov results show (sample results when opened from a folder), three at first
  await tile.locator('.result').first().waitFor();
  const gg = tile.locator('.feed').first();
  assert.equal(await gg.locator('.result').count(), 3);
  await gg.locator('button', { hasText: 'Show all' }).click();
  assert.equal(await gg.locator('.result').count(), 5);
  assert.match(await gg.innerText(), /Peer Support Workforce Expansion \(sample\)/);
  assert.match(await gg.innerText(), /Closes /);
  // A feed that does not answer says so calmly
  assert.match(await tile.innerText(), /Not loading right now/);

  // Add as Potentials makes a record, and the result then shows Added
  const before = await page.evaluate(() => window.NAMI.app.store.items('records').length);
  await gg.locator('button', { hasText: 'Add as Potentials' }).first().click();
  await page.waitForFunction((n) => window.NAMI.app.store.items('records').length === n + 1, before);
  const made = await page.evaluate(() => window.NAMI.app.store.items('records').slice(-1)[0]);
  assert.deepEqual([made.name, made.status, made.grantType], ['Peer Support Workforce Expansion (sample)', 'Potentials', 'Federal']);
  assert.ok(made.deadline && made.links.includes('grants.gov'));
  await tile.locator('.result .added').first().waitFor();
  await page.click('#toastUndo');
  await page.waitForFunction((n) => window.NAMI.app.store.items('records').length === n, before);

  // Add a feed, then remove it, then Undo brings it back
  await page.click('#openAddFeed');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'newFeedName');
  await page.fill('#newFeedName', 'County news');
  await page.selectOption('#newFeedType', 'Feed link');
  await page.fill('#newFeedSource', 'http://localhost/feed');
  await page.click('#addFeed');
  assert.match(await tile.locator('.addFeed .problem').innerText(), /web address/);
  await page.fill('#newFeedSource', 'https://example.org/county.xml');
  await page.click('#addFeed');
  const county = tile.locator('.feed', { hasText: 'County news' });
  await county.waitFor();
  assert.match(await county.innerText(), /Not loading right now/, 'sample mode loads only Grants.gov');
  await county.locator('button', { hasText: 'Remove' }).click();
  await county.waitFor({ state: 'detached' });
  assert.equal(await page.evaluate(() => window.NAMI.app.store.items('feeds').filter((f) => f.name === 'County news').length), 0);
  await page.click('#toastUndo');
  await tile.locator('.feed', { hasText: 'County news' }).waitFor();

  // Turning a feed off hides what it shows
  const offId = await page.evaluate(() => window.NAMI.app.store.items('feeds')[1].id);
  await page.uncheck('#feed-on-' + offId);
  await page.waitForFunction((i) => !document.querySelector('[data-feed="' + i + '"] .notLoading'), offId);

  // A cycle opening this month is a Review in To-do; Done for now sets it aside, Undo brings it back
  const todo = page.locator('[data-tile=todo]');
  const review = todo.locator('.todo.review', { hasText: 'Community bank giving round' });
  await review.waitFor();
  await review.locator('button', { hasText: 'Done for now' }).click();
  await review.waitFor({ state: 'detached' });
  await page.click('#toastUndo');
  await review.waitFor();
  // Add as Upcoming makes the record and links it to the watched cycle
  await review.locator('button', { hasText: 'Add as Upcoming' }).click();
  await page.waitForSelector('dialog[open] #f-name');
  assert.equal(await page.inputValue('dialog[open] #f-name'), 'Community bank giving round');
  const w = await page.evaluate(() => window.NAMI.app.store.items('watch').filter((x) => x.name === 'Community bank giving round')[0]);
  assert.ok(w.record && w.lastReviewed, 'linked and reviewed');
  await page.click('#toastUndo');
  await page.waitForSelector('dialog[open]', { state: 'detached' });
  await page.waitForFunction(() => document.activeElement && document.activeElement.closest('[data-tile=todo] .review'));
  const back = await page.evaluate(() => window.NAMI.app.store.items('watch').filter((x) => x.name === 'Community bank giving round')[0]);
  assert.ok(!back.record && !back.lastReviewed, 'Undo puts both back');

  // A watch date set on a record ("Add to Funding Watch") makes a Review when it arrives
  const name = 'Annual Fund Drive';
  const id = await page.evaluate((n) => window.NAMI.app.store.items('records').filter((r) => r.name === n)[0].id, name).catch(() => null);
  const rid = id || await page.evaluate(() => window.NAMI.app.store.items('records').filter((r) => r.status !== 'Archived' && !r.watchDate)[0].id);
  const rname = await page.evaluate((i) => window.NAMI.app.store.get('records', i).name, rid);
  await page.evaluate((i) => window.NAMI.app.openDetail(i), rid);
  await page.click('#addToWatch');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'f-watchDate');
  const today = await page.evaluate(() => window.NAMI.derive.iso(new Date()));
  await page.fill('#f-watchDate', today);
  await page.press('#f-watchDate', 'Tab');
  await page.waitForFunction((i) => !!window.NAMI.app.store.get('records', i).watchDate, rid);
  await page.click('dialog[open] .close');
  const more = todo.locator('button', { hasText: 'Show all' });
  if (await more.count()) await more.click();
  await todo.locator('.todo.review', { hasText: 'Review: ' + rname }).waitFor();
  assert.match(await tile.innerText(), new RegExp(rname.replace(/[()]/g, '.')), 'and it is on the watch list');

  // A watched item opens with its fields; the month is a month
  await tile.locator('[data-watch]', { hasText: 'Technology Upgrade retry' }).click();
  await page.waitForSelector('dialog[open] #f-opens');
  assert.equal(await page.inputValue('#f-opens'), '2');
  assert.equal(await page.locator('#f-opens option:checked').innerText(), 'February');
  assert.equal(await page.locator('#f-record option:checked').innerText(), 'Technology Upgrade');
  await page.selectOption('#f-opens', '3');
  await page.waitForFunction(() => document.querySelector('#watchWhen').textContent === 'Opens in March');
  await page.click('dialog[open] .close');

  // Add to the watch list
  await page.click('#openAddWatch');
  await page.fill('#newWatchName', 'Foundation spring round');
  await page.selectOption('#newWatchMonth', '4');
  await page.click('#addWatch');
  await tile.locator('[data-watch]', { hasText: 'Foundation spring round' }).waitFor();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'openAddWatch');

  // Taking a watched cycle off the list and Undo keeps its Review in To-do
  await tile.locator('[data-watch]', { hasText: 'Community bank giving round' }).click();
  await page.click('#removeWatch');
  await review.waitFor({ state: 'detached' });
  await page.click('#toastUndo');
  await review.waitFor();

  // A feed's keywords can be changed
  await tile.locator('[data-feed-edit]').first().click();
  await page.waitForSelector('dialog[open] #f-source');
  await page.fill('#f-source', 'mental health; housing');
  await page.press('#f-name', 'Tab').catch(() => {});
  await page.focus('#f-name');
  await page.waitForFunction(() => window.NAMI.app.store.items('feeds')[0].source === 'mental health; housing');
  await page.click('dialog[open] .close');

  // Viewers see the results but no controls
  await page.selectOption('#whoSelect', 'Sam Okafor (sample)');
  await page.waitForFunction(() => window.NAMI.app.state.who.person === 'Sam Okafor (sample)');
  await tile.locator('.result').first().waitFor();
  assert.equal(await tile.locator('#addFeed, #addWatch, .feedTools, .result .quietBtn').count(), 0);
  assert.equal(await page.locator('[data-tile=todo] .reviewActions').count(), 0);
  assert.equal(await tile.locator('[data-feed="' + offId + '"]').count(), 0, 'a feed that is off is not shown to viewers');

  assert.deepEqual(errors, []);
}

test('in the browser, hosted: results come from the feed function; a broken answer reads Not loading', { skip: !playwright && 'Playwright is not installed' }, async () => {
  const fs = require('node:fs');
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await page.addInitScript(() => { try { localStorage.setItem('nami-grants-v2-edit-first', 'yes'); } catch (e) { /* fine */ } }); // older tests type straight into a grant
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    const cfg = fs.readFileSync(path.resolve(__dirname, '../js/config.js'), 'utf8').replace("endpoint: ''", "endpoint: 'https://feeds.test/fn'");
    await page.route('**/js/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: cfg }));
    const asked = [];
    await page.route('https://feeds.test/**', (r) => {
      const u = new URL(r.request().url());
      asked.push(u.searchParams.get('type'));
      const cors = { 'access-control-allow-origin': '*' };
      if (u.searchParams.get('type') === 'grantsgov') {
        return r.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ items: W.grantsGovItems(SEARCH2) }) });
      }
      return r.fulfill({ status: 502, headers: cors, contentType: 'text/html', body: '<html>Bad gateway</html>' });
    });
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload();
    await page.waitForSelector('body[data-loaded=yes]');
    const tile = page.locator('[data-tile=watch]');
    await tile.locator('.result', { hasText: 'Peer Recovery Support Services' }).waitFor();
    await tile.locator('.notLoading').first().waitFor();
    assert.ok(asked.includes('grantsgov') && asked.includes('feed'));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
