// A stand-in for Microsoft Graph's SharePoint list API, enough for the page's store:
// the site, its lists and columns, and list items (paged, two to a page, to exercise paging).
// Used by tests/phase7.test.cjs in Node and, through page.route, in the browser.
const SITE = 'site-1';

function createFakeGraph(opts = {}) {
  // siteOffset: the site's time zone in hours from UTC (a new site is often on Pacific time, -8)
  const g = { lists: [], nextList: 1, nextItem: 1, calls: [], readOnly: false, busyOnce: false, pageSize: 2, siteOffset: opts.siteOffset === undefined ? -8 : opts.siteOffset, failCreateAfter: null };
  // What SharePoint does to values: a date-only column keeps midnight in the site's time zone,
  // and single-line text stops at 255 characters
  function store(l, fields) {
    const out = {};
    for (const [k, v] of Object.entries(fields)) {
      const c = l.columns.find((x) => x.name === k) || {};
      if (c.dateTime && v) {
        const local = new Date(new Date(v).getTime() + g.siteOffset * 3600000);
        const day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
        out[k] = new Date(day - g.siteOffset * 3600000).toISOString().replace('.000', '');
      } else if ((c.name === 'Title' || (c.text && !c.text.allowMultipleLines)) && typeof v === 'string' && v.length > 255) {
        throw new Error('The value of ' + k + ' is too long');
      } else out[k] = v;
    }
    return out;
  }
  g.addList = (displayName, columns = []) => {
    const l = { id: 'list-' + g.nextList++, displayName, name: displayName, columns: [{ name: 'Title' }].concat(columns), items: [] };
    g.lists.push(l);
    return l;
  };
  function reply(status, body, headers = {}) {
    return { ok: status >= 200 && status < 300, status, headers: { get: (k) => headers[k] || null }, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) };
  }
  g.fetch = (url, init = {}) => {
    const method = init.method || 'GET';
    const u = new URL(url);
    const path = decodeURIComponent(u.pathname.replace(/^\/v1\.0/, ''));
    const body = init.body ? JSON.parse(init.body) : null;
    g.calls.push(method + ' ' + path);
    if (!/^Bearer \S+/.test((init.headers || {}).Authorization || '')) return Promise.resolve(reply(401, { error: { message: 'no token' } }));
    if (g.busyOnce) { g.busyOnce = false; return Promise.resolve(reply(429, { error: { message: 'busy' } }, { 'Retry-After': '1' })); }
    if (method !== 'GET' && g.readOnly) return Promise.resolve(reply(403, { error: { message: 'Access denied' } }));
    let m;
    if ((m = /^\/sites\/([^/:]+):(\/.*?):?$/.exec(path)) && method === 'GET') {
      if (opts.host && m[1] !== opts.host) return Promise.resolve(reply(404, { error: { message: 'no site' } }));
      return Promise.resolve(reply(200, { id: SITE }));
    }
    if (path === '/sites/' + SITE + '/lists') {
      if (method === 'GET') return Promise.resolve(reply(200, { value: g.lists.map((l) => ({ id: l.id, name: l.name, displayName: l.displayName })) }));
      if (g.failCreateAfter !== null && g.lists.length >= g.failCreateAfter) return Promise.resolve(reply(503, { error: { message: 'stopped partway' } }));
      const l = g.addList(body.displayName, body.columns);
      return Promise.resolve(reply(201, { id: l.id, displayName: l.displayName }));
    }
    if ((m = /^\/sites\/site-1\/lists\/([^/]+)\/columns\/fa564e0f-0c70-4ab9-b863-0177e6ddd247$/.exec(path)) && method === 'PATCH') {
      const l = g.lists.find((x) => x.id === m[1]);
      Object.assign(l.columns.find((c) => c.name === 'Title'), body);
      return Promise.resolve(reply(200, {}));
    }
    if ((m = /^\/sites\/site-1\/lists\/([^/]+)\/columns$/.exec(path))) {
      const l = g.lists.find((x) => x.id === m[1]);
      if (method === 'GET') return Promise.resolve(reply(200, { value: l.columns.map((c) => ({ name: c.name })) }));
      l.columns.push(body);
      return Promise.resolve(reply(201, body));
    }
    if ((m = /^\/sites\/site-1\/lists\/([^/]+)\/items(?:\/(\d+))?(\/fields)?$/.exec(path))) {
      const l = g.lists.find((x) => x.id === m[1]);
      if (!l) return Promise.resolve(reply(404, { error: { message: 'no list' } }));
      const known = new Set(l.columns.map((c) => c.name));
      const unknown = (f) => Object.keys(f).filter((k) => !known.has(k));
      if (method === 'GET' && !m[2]) {
        const skip = Number(u.searchParams.get('skip') || 0);
        const page = l.items.slice(skip, skip + g.pageSize);
        const out = { value: page.map((i) => JSON.parse(JSON.stringify(i))) };
        if (skip + g.pageSize < l.items.length) out['@odata.nextLink'] = 'https://graph.microsoft.com/v1.0/sites/' + SITE + '/lists/' + l.id + '/items?$expand=fields&skip=' + (skip + g.pageSize);
        return Promise.resolve(reply(200, out));
      }
      if (method === 'POST') {
        if (unknown(body.fields).length) return Promise.resolve(reply(400, { error: { message: 'Field ' + unknown(body.fields)[0] + ' is not recognized' } }));
        const id = String(g.nextItem++);
        const now = new Date().toISOString();
        let kept;
        try { kept = store(l, body.fields); } catch (e) { return Promise.resolve(reply(400, { error: { message: e.message } })); }
        const item = { id, createdDateTime: now, lastModifiedDateTime: now, fields: Object.assign({ id, '@odata.etag': 'x', ContentType: 'Item' }, kept) };
        l.items.push(item);
        return Promise.resolve(reply(201, item));
      }
      const item = l.items.find((i) => i.id === m[2]);
      if (!item) return Promise.resolve(reply(404, { error: { message: 'no item' } }));
      if (method === 'PATCH') {
        if (unknown(body).length) return Promise.resolve(reply(400, { error: { message: 'Field ' + unknown(body)[0] + ' is not recognized' } }));
        try { Object.assign(item.fields, store(l, body)); } catch (e) { return Promise.resolve(reply(400, { error: { message: e.message } })); }
        item.lastModifiedDateTime = new Date().toISOString();
        return Promise.resolve(reply(200, item.fields));
      }
      if (method === 'DELETE') { l.items = l.items.filter((i) => i !== item); return Promise.resolve({ ok: true, status: 204, headers: { get: () => null }, json: () => Promise.reject(new Error('empty')) }); }
    }
    return Promise.resolve(reply(400, { error: { message: 'The stand-in does not know ' + method + ' ' + path } }));
  };
  return g;
}

module.exports = { createFakeGraph, SITE };
