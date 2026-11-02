/*
  NAMI Grants Dashboard v2: SharePoint mode. The same store interface as Sample mode (js/data.js),
  over NAMI's own SharePoint lists through Microsoft Graph, as the signed-in person.

    createSharePointStore({ siteUrl, token, fetch })
      siteUrl   the SharePoint site holding the lists, e.g. https://contoso.sharepoint.com/sites/Grants
      token     function returning a Promise of a Graph access token (auth.token)

    store.load()            reads every list; rejects with e.needsSetup and e.missing when lists are missing
    store.setup(person)     creates the missing lists with their columns, then the starting rows:
                            Settings, the Funding Watch feeds and cycles, and the person as the first Editor
    store.ensureColumn(listKey, { key, type })   adds a column for one of "your own fields"
    the rest as in js/data.js: items, get, add, update, restore, remove, reset (refused), loadedAt

  How columns are stored (SPEC, Decided, Phase 7 choices): dates as date-only columns, yes/no as
  Yes/No, amounts as Currency, numbers and links between lists as Number, long text as multiple
  lines, and everything else (people, choices, months, links) as single-line text, so names and
  choices stay editable from the page's Settings and Labels. SharePoint permissions are the real
  lock: editors need Edit on the site; viewers need Read, plus Contribute on the Progress list.
*/
(function (root) {
  'use strict';

  var schema = root.NAMI && root.NAMI.schema;
  if (!schema && typeof require === 'function') schema = require('./schema.js');

  var GRAPH = 'https://graph.microsoft.com/v1.0';
  // Every SharePoint list's Title column has this same id
  var TITLE_ID = 'fa564e0f-0c70-4ab9-b863-0177e6ddd247';
  // Fields every SharePoint item carries that are not the page's own
  var SYSTEM = /^(@odata|_|id$|ContentType|Modified$|Created$|AuthorLookupId|EditorLookupId|AppAuthorLookupId|AppEditorLookupId|Attachments$|Edit$|LinkTitle|ItemChildCount|FolderChildCount|ComplianceAssetId|DocIcon|OData_)/;

  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // A date-only column keeps midnight in the site's time zone, whatever that is. Writing noon UTC
  // and reading the UTC day twelve hours on gives back the day that was typed for any site or
  // browser time zone between twelve hours behind and twelve ahead.
  function readDate(v) {
    if (!v) return '';
    var d = new Date(v);
    if (isNaN(d)) return String(v);
    d = new Date(d.getTime() + 12 * 3600 * 1000);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  function writeDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || ''));
    if (!m) return v ? String(v) : null;
    return m[1] + '-' + m[2] + '-' + m[3] + 'T12:00:00Z';
  }

  function spType(type) {
    switch (type) {
      // Long text and web links: multiple lines (single-line text stops at 255 characters), plain, never HTML
      case 'note': case 'url': return { text: { allowMultipleLines: true, linesForEditing: 6, textType: 'plain' } };
      case 'number': case 'lookup': return { number: {} };
      case 'currency': return { currency: { locale: 'en-us' } };
      case 'date': return { dateTime: { format: 'dateOnly' } };
      case 'yesno': return { boolean: {} };
      default: return { text: {} };
    }
  }

  // The kinds of "your own fields", as the page stores them, in the kinds this file knows
  var CUSTOM_KIND = { text: 'text', note: 'note', choice: 'text', date: 'date', yesno: 'yesno', number: 'number', currency: 'currency' };
  function customType(custom, k) {
    var c = (custom || []).filter(function (x) { return x.key === k; })[0];
    return c ? CUSTOM_KIND[c.type] || 'text' : null;
  }

  function toSp(listKey, fields, custom) {
    var out = {};
    Object.keys(fields).forEach(function (k) {
      if (k === 'id' || k === 'created' || k === 'modified' || fields[k] === undefined) return;
      var col = schema.column(listKey, k);
      var name = col ? col.sp : k;
      var v = fields[k];
      var type = col ? col.type : customType(custom, k) || (typeof v === 'boolean' ? 'yesno' : typeof v === 'number' ? 'number' : 'text');
      if (type === 'date') v = writeDate(v);
      else if (type === 'yesno') v = v === '' || v === null || v === undefined ? null : (v === true || /^(yes|true|1)$/i.test(String(v)));
      else if (type === 'number' || type === 'currency' || type === 'lookup') v = v === '' || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v);
      else v = v === null || v === undefined ? '' : String(v);
      out[name] = v;
    });
    return out;
  }

  function fromSp(listKey, item, custom) {
    var f = item.fields || {};
    var l = schema.list(listKey);
    var out = { id: Number(item.id), created: item.createdDateTime || f.Created || '', modified: item.lastModifiedDateTime || f.Modified || '' };
    var known = {};
    l.columns.forEach(function (c) {
      known[c.sp] = true;
      var v = f[c.sp];
      if (v === undefined || v === null) return;
      if (c.type === 'date') v = readDate(v);
      else if (c.type === 'lookup' || c.type === 'number' || c.type === 'currency') v = Number(v);
      out[c.key] = v;
    });
    Object.keys(f).forEach(function (k) { // your own fields
      if (known[k] || SYSTEM.test(k)) return;
      var t = customType(custom, k), v = f[k];
      out[k] = t === 'date' && v ? readDate(v) : v;
    });
    return out;
  }

  // Plain words for what went wrong, never a code
  function problem(status, body) {
    var e;
    if (status === 401) e = new Error('Your sign-in has run out. Sign in again to keep going.');
    else if (status === 403) e = new Error('Your SharePoint permissions do not let you change this.');
    else if (status === 404) e = new Error('That is no longer on SharePoint. Reload to see the latest.');
    else if (status === 429 || status === 503) e = new Error('SharePoint is busy. Try again in a minute.');
    else e = new Error('SharePoint did not take that' + (body && body.error && body.error.message ? ': ' + body.error.message : '.'));
    e.status = status;
    return e;
  }

  // The rows a new set of lists starts with: NAMI's settings, the Funding Watch defaults from SPEC,
  // and whoever sets it up as the first Editor
  function starterRows(person) {
    return {
      settings: [
        { key: 'programs', value: 'Family-to-Family; Peer-to-Peer; In Our Own Voice; Ending the Silence; NAMI Basics; Support groups; Crisis education; General operating' },
        { key: 'grantTypes', value: 'Federal; State; County; Foundation; Corporate; Other' },
        { key: 'fiscalYearStart', value: 'January' },
        { key: 'defaultAwardView', value: 'Award year' },
        { key: 'dueSoonDays', value: '14' },
        { key: 'customColumns', value: '' },
        { key: 'grantsGovKeywords', value: 'mental health; peer support; crisis; suicide prevention; family support' }
      ],
      feeds: [
        { name: 'Grants.gov: mental health and peer support', type: 'Grants.gov', source: 'mental health; peer support; crisis; suicide prevention; family support', on: true },
        { name: 'Wisconsin DHS funding opportunities', type: 'Quick link', source: 'https://www.dhs.wisconsin.gov/', on: true },
        { name: 'Wisconsin DHS email sign-up', type: 'Quick link', source: '', on: true }
      ],
      watch: [
        { name: 'Greater Milwaukee Foundation cycles 1 to 3', kind: 'Cycle', opens: '', repeatsYearly: true, link: 'https://www.greatermilwaukeefoundation.org/', notes: 'Add the months each cycle opens.' },
        { name: 'United Way MHCP Mental Health Improvement Fund', kind: 'Cycle', opens: '', repeatsYearly: true, link: '', notes: 'Add the month it opens.' },
        { name: 'Impact100 Greater Milwaukee', kind: 'Cycle', opens: '', repeatsYearly: true, link: '', notes: 'Add the month it opens.' }
      ],
      people: person ? [{ person: person.name || person.email, email: person.email || '', role: 'Editor', programs: 'All' }] : []
    };
  }

  function createSharePointStore(options) {
    options = options || {};
    var doFetch = options.fetch || (root.fetch && root.fetch.bind(root));
    // Your own fields come from the Settings row customColumns (read after load); options.custom
    // lets the page say so before then
    function custom() {
      if (options.custom) return options.custom();
      var row = (lists.settings || []).filter(function (r) { return r.key === 'customColumns'; })[0];
      var settings = root.NAMI && root.NAMI.settings;
      if (!settings && typeof require === 'function') settings = require('./settings.js');
      return row ? settings.parseCustom(row.value) : [];
    }
    var siteId = null, listIds = {}, lists = {}, missing = [];
    schema.LISTS.forEach(function (l) { lists[l.key] = []; });

    function graph(method, path, body, tries) {
      return Promise.resolve(options.token()).then(function (token) {
        var init = { method: method, headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } };
        if (body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
        return doFetch(/^https:/.test(path) ? path : GRAPH + path, init);
      }).then(function (r) {
        if ((r.status === 429 || r.status === 503) && !tries) { // once more, after the wait SharePoint asks for
          var wait = Math.min(Number(r.headers && r.headers.get && r.headers.get('Retry-After')) || 2, 10) * 1000;
          return new Promise(function (ok) { setTimeout(ok, options.retryWait !== undefined ? options.retryWait : wait); }).then(function () { return graph(method, path, body, 1); });
        }
        if (r.status === 204) return null;
        return r.json().catch(function () { return null; }).then(function (j) {
          if (!r.ok) throw problem(r.status, j);
          return j;
        });
      });
    }

    function sitePath() {
      var u = new URL(options.siteUrl);
      var p = u.pathname.replace(/\/+$/, '');
      return '/sites/' + u.hostname + (p ? ':' + p + ':' : '');
    }

    function readAll(path, out) {
      out = out || [];
      return graph('GET', path).then(function (j) {
        out.push.apply(out, (j && j.value) || []);
        return j && j['@odata.nextLink'] ? readAll(j['@odata.nextLink'], out) : out;
      });
    }

    function findLists() {
      var site = siteId ? Promise.resolve() : graph('GET', sitePath() + '?$select=id').then(function (s) { siteId = s.id; });
      return site.then(function () { return readAll('/sites/' + siteId + '/lists?$select=id,name,displayName&$top=200'); }).then(function (found) {
        listIds = {}; missing = [];
        schema.LISTS.forEach(function (l) {
          var hit = found.filter(function (x) { return x.displayName === l.sp || x.name === l.sp; })[0];
          if (hit) listIds[l.key] = hit.id; else missing.push(l.key);
        });
      });
    }

    function itemsPath(listKey) { return '/sites/' + siteId + '/lists/' + listIds[listKey] + '/items'; }

    function find(listKey, id) {
      var arr = lists[listKey] || [];
      for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
      return null;
    }
    function put(listKey, item) {
      var arr = lists[listKey], i;
      for (i = 0; i < arr.length; i++) if (arr[i].id === item.id) { arr[i] = item; return; }
      arr.push(item);
    }

    var store = {
      mode: 'sharepoint',
      loadedAt: null,

      load: function () {
        return findLists().then(function () {
          if (missing.length) {
            var e = new Error('These lists are not on the SharePoint site yet: ' + missing.map(function (k) { return schema.list(k).sp; }).join(', ') + '.');
            e.needsSetup = true; e.missing = missing.slice();
            throw e;
          }
          return Promise.all(schema.LISTS.map(function (l) {
            return readAll(itemsPath(l.key) + '?$expand=fields&$top=500').then(function (rows) { return [l.key, rows]; });
          }));
        }).then(function (pairs) {
          // Settings first, so your own fields' kinds are known when Records is read
          pairs.sort(function (a, b) { return (a[0] === 'settings' ? 0 : 1) - (b[0] === 'settings' ? 0 : 1); });
          pairs.forEach(function (p) { lists[p[0]] = p[1].map(function (it) { return fromSp(p[0], it, custom()); }); });
          store.loadedAt = new Date();
          return clone(lists);
        });
      },

      items: function (listKey) { return clone(lists[listKey] || []); },
      get: function (listKey, id) { var f = find(listKey, id); return f ? clone(f) : null; },

      add: function (listKey, fields, ctx) {
        var prepared = root.NAMI.data.prepare(listKey, fields || {}, ctx);
        if (prepared.problem) return Promise.reject(new Error(prepared.problem));
        return graph('POST', itemsPath(listKey), { fields: toSp(listKey, prepared.fields, custom()) }).then(function (it) {
          var item = fromSp(listKey, it, custom());
          put(listKey, item);
          return clone(item);
        });
      },

      update: function (listKey, id, changes) {
        var item = find(listKey, id);
        if (!item) return Promise.reject(new Error('That item is no longer in ' + listKey + '.'));
        var before = clone(item);
        var col = schema.list(listKey).columns.filter(function (c) { return c.required; })[0];
        var next = Object.assign(clone(item), changes);
        if (col && String(next[col.key] || '').trim() === '') return Promise.reject(new Error(col.label + ' is needed to save.'));
        return graph('PATCH', itemsPath(listKey) + '/' + id + '/fields', toSp(listKey, changes, custom())).then(function () {
          Object.keys(changes).forEach(function (k) { if (k !== 'id' && k !== 'created') item[k] = changes[k]; });
          item.modified = new Date().toISOString();
          return { item: clone(item), before: before };
        });
      },

      // Undo of an update: every field back as it was (fields that were empty become empty again)
      restore: function (listKey, before) {
        var item = before && find(listKey, before.id);
        if (!item) return Promise.reject(new Error('That item is no longer in ' + listKey + '.'));
        var back = {};
        Object.keys(item).concat(Object.keys(before)).forEach(function (k) { back[k] = before[k] === undefined ? '' : before[k]; });
        return graph('PATCH', itemsPath(listKey) + '/' + before.id + '/fields', toSp(listKey, back, custom())).then(function () {
          put(listKey, clone(before));
          return clone(before);
        });
      },

      remove: function (listKey, id) {
        return graph('DELETE', itemsPath(listKey) + '/' + id).then(function () {
          var gone = find(listKey, id);
          lists[listKey] = lists[listKey].filter(function (x) { return x.id !== id; });
          return gone ? clone(gone) : null;
        });
      },

      reset: function () { return Promise.reject(new Error('The real lists are never started over.')); },

      missing: function () { return missing.slice(); },

      // Creates whatever lists are missing, with their columns, then the starting rows. Safe to run
      // again after it stopped partway: it fills any starter list that is still empty, and adds the
      // person to People when they are not there yet. People comes first, so whoever sets it up can
      // always get back in as an editor.
      setup: function (person) {
        var made = [];
        return findLists().then(function () {
          made = missing.slice();
          var order = ['people'].concat(made.filter(function (k) { return k !== 'people'; }));
          return order.filter(function (k) { return made.indexOf(k) !== -1; }).reduce(function (p, key) {
            return p.then(function () {
              var l = schema.list(key);
              var title = l.columns.filter(function (c) { return c.sp === 'Title'; })[0];
              var columns = l.columns.filter(function (c) { return c.sp !== 'Title'; }).map(function (c) { return Object.assign({ name: c.sp, displayName: c.label.slice(0, 255) }, spType(c.type)); });
              return graph('POST', '/sites/' + siteId + '/lists', { displayName: l.sp, columns: columns, list: { template: 'genericList' } }).then(function (made_) {
                listIds[key] = made_.id;
                // SharePoint's own Title column: named the way the page names it, and never required
                // (Progress and Award years have no use for it)
                return graph('PATCH', '/sites/' + siteId + '/lists/' + made_.id + '/columns/' + TITLE_ID, { displayName: title ? title.label : 'Title', required: false });
              });
            });
          }, Promise.resolve());
        }).then(function () {
          missing = [];
          var rows = starterRows(person);
          return ['people', 'settings', 'feeds', 'watch'].reduce(function (p, key) {
            return p.then(function () {
              return graph('GET', itemsPath(key) + '?$expand=fields&$top=500').then(function (j) {
                var have = ((j && j.value) || []).map(function (it) { return fromSp(key, it); });
                var add = key === 'people'
                  ? rows.people.filter(function (r) { return !have.some(function (h) { return String(h.email || '').toLowerCase() === String(r.email).toLowerCase(); }); })
                  : have.length ? [] : rows[key];
                return add.reduce(function (q, r) { return q.then(function () { return graph('POST', itemsPath(key), { fields: toSp(key, r) }); }); }, Promise.resolve());
              });
            });
          }, Promise.resolve());
        }).then(function () { return made; });
      },

      // One of "your own fields" needs its own column on Records before anything is saved in it
      ensureColumn: function (listKey, col) {
        var go = siteId && listIds[listKey] ? Promise.resolve() : findLists();
        return go.then(function () {
          return readAll('/sites/' + siteId + '/lists/' + listIds[listKey] + '/columns?$select=name');
        }).then(function (cols) {
          if (cols.some(function (c) { return c.name === col.key; })) return null;
          var t = CUSTOM_KIND[col.type] || 'text';
          return graph('POST', '/sites/' + siteId + '/lists/' + listIds[listKey] + '/columns', Object.assign({ name: col.key, displayName: col.label || col.key }, spType(t)));
        });
      }
    };
    return store;
  }

  var api = { createSharePointStore: createSharePointStore, toSp: toSp, fromSp: fromSp, readDate: readDate, writeDate: writeDate, starterRows: starterRows, GRAPH: GRAPH };
  root.NAMI = root.NAMI || {};
  root.NAMI.sharepoint = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
