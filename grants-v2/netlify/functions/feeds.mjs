// NAMI Grants Dashboard v2: the one small server piece (SPEC, Build, B3).
// It fetches outside feeds for the page, because browsers block most of them from a web page:
//   /.netlify/functions/feeds?type=grantsgov&keywords=mental health; peer support
//   /.netlify/functions/feeds?type=feed&url=https://example.org/feed.xml
// It answers { items: [...] } or { problem } and keeps nothing. No page scraping: Grants.gov's
// public search API and RSS or Atom feeds only.
import { lookup } from 'node:dns/promises';
import watch from '../../js/watch.js';

const TIMEOUT_MS = 8000;
const MAX_BYTES = 1024 * 1024;

function answer(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    // Results may be kept 15 minutes; a failure never is, so the next try asks again
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': status === 200 ? 'public, max-age=900' : 'no-store' }
  });
}

// What a name points to must be public too, so a public-looking name cannot lead inside a network
async function publicHost(url, resolve) {
  const host = new URL(url).hostname.replace(/^\[|\]$/g, '');
  const found = await resolve(host, { all: true });
  if (!found.length || found.some((a) => watch.privateAddress(a.address))) throw new Error('That is not a public web address.');
}

async function fetchText(url, init, fetchImpl, resolve, signal) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  if (signal) signal.addEventListener('abort', () => ctl.abort());
  try {
    // Redirects are followed by hand, so every hop is checked before it is asked for
    let r = null;
    for (let hop = 0; hop <= 3; hop++) {
      await publicHost(url, resolve);
      r = await fetchImpl(url, { ...init, signal: ctl.signal, redirect: 'manual' });
      const next = r.status >= 300 && r.status < 400 && r.headers && r.headers.get && r.headers.get('location');
      if (!next) break;
      url = watch.safeFeedUrl(new URL(next, url).toString());
      if (!url || hop === 3) throw new Error('The source moved somewhere this page will not follow.');
      if (init.method === 'POST') throw new Error('The source moved.');
    }
    if (!r.ok) throw new Error('The source answered ' + r.status + '.');
    const len = Number(r.headers && r.headers.get && r.headers.get('content-length'));
    if (len > MAX_BYTES) throw new Error('The source is too large.');
    const text = await r.text();
    if (text.length > MAX_BYTES) throw new Error('The source is too large.');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export async function grantsGov(keywords, fetchImpl = fetch, resolve = lookup) {
  const words = String(keywords || '').split(';').map((k) => k.trim()).filter((k, i, all) => k && all.indexOf(k) === i).slice(0, 8);
  if (!words.length) throw new Error('No keywords to search.');
  // All keywords at once, under one time limit, so the answer comes well inside Netlify's 10 seconds
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const answers = await Promise.allSettled(words.map((k) => fetchText(watch.GRANTS_GOV, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(watch.grantsGovRequest(k))
    }, fetchImpl, resolve, ctl.signal).then((text) => watch.grantsGovItems(JSON.parse(text)))));
    const ok = answers.filter((a) => a.status === 'fulfilled');
    if (!ok.length) throw answers[0].reason;
    // Most fitting first: found by more of the keywords, and with a keyword in its title; then
    // soonest closing, with ones that have no close date after
    const found = new Map(), score = new Map();
    ok.forEach((a, n) => a.value.forEach((i) => {
      if (!found.has(i.id)) found.set(i.id, i);
      score.set(i.id, (score.get(i.id) || 0) + 1);
    }));
    const inTitle = (i) => words.some((w) => i.title.toLowerCase().includes(w.toLowerCase()));
    found.forEach((i) => { if (inTitle(i)) score.set(i.id, score.get(i.id) + 2); });
    return [...found.values()].sort((a, b) => (score.get(b.id) - score.get(a.id)) || (a.date || '9999').localeCompare(b.date || '9999')).slice(0, 40);
  } finally {
    clearTimeout(timer);
  }
}

export async function feed(url, fetchImpl = fetch, resolve = lookup) {
  const safe = watch.safeFeedUrl(url);
  if (!safe) throw new Error('That is not a public web address.');
  return watch.parseFeed(await fetchText(safe, { headers: { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' } }, fetchImpl, resolve));
}

export default async (req) => {
  const q = new URL(req.url).searchParams;
  try {
    if (q.get('type') === 'grantsgov') return answer(200, { items: await grantsGov(q.get('keywords')) });
    if (q.get('type') === 'feed') return answer(200, { items: await feed(q.get('url')) });
    return answer(400, { problem: 'Ask for type=grantsgov or type=feed.' });
  } catch (e) {
    return answer(502, { problem: e.name === 'AbortError' ? 'The source took too long.' : e.message });
  }
};
