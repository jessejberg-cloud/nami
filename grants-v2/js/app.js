/*
  NAMI Grants Dashboard v2: the page.

  Phase 6: Funding Watch. Feeds (Grants.gov through the feed function, RSS or Atom links, quick
  links) with "Add as Potentials" on each result; the Watch list (cycles by month, and records with
  a watch date); a Review item in To-do when a cycle month or watch date arrives (js/watch.js).
  Phase 5: sign-in (Sample "Signed in as", or Microsoft through js/auth.js), Editor and Viewer roles
  from the People list (js/access.js guards every change), program views for viewers, and a task
  view where steps are checked off and comments added (the Progress list).
  Phase 4: every title, status, field, section and filter name comes from the Labels list (T);
  custom fields from Settings show under More details and get a filter; tiles collapse, move by
  press and hold (or arrow keys on their handle), and the layout is kept per person.
  Phase 3 home: Needs attention, To-do (with My to-do), Pipeline, Awards (Award year or
  Spread, this year beside last year, and the awards sheet), County contracts and Archive,
  all narrowed by the filters. "Show all" and Search open a full list.
  Phase 2 records: add with just a name; a detail view where every field saves as you leave
  it; status in any direction; Archive and Restore; Undo after every change.
*/
(function () {
  'use strict';

  var N = window.NAMI;
  var schema = N.schema, derive = N.derive, S = N.settings;
  var A = N.access;
  var W = N.watch;
  var CFG = window.NAMI_CONFIG || {};
  // Opened straight from a folder there is no feed function to ask, so the feeds show sample results
  var feedEndpoint = (CFG.feeds && CFG.feeds.endpoint) || (location.protocol === 'file:' ? 'sample' : '/.netlify/functions/feeds');
  var feedClient = W.createFeedClient({ endpoint: feedEndpoint, sampleResults: function (f) { return N.sample.feedResults(f, new Date()); } });
  var CFG0 = window.NAMI_CONFIG || {};
  // SharePoint mode: Microsoft sign-in plus a site address in js/config.js; otherwise Sample data
  var onSharePoint = CFG0.mode === 'microsoft' && !!(CFG0.sharepoint && CFG0.sharepoint.siteUrl);
  var rawStore = onSharePoint
    ? N.data.createSharePointStore({ siteUrl: CFG0.sharepoint.siteUrl, token: function () { return auth.token(); } })
    : N.data.createSampleStore({ storage: window.localStorage });
  // Every change passes the signed-in person's role; a viewer can only log progress on their tasks
  var store = A.guard(rawStore, function () { return state.who; });
  var auth = N.auth.createAuth(window.NAMI_CONFIG, { storage: window.localStorage, people: function () { return rawStore.items('people'); } });
  function me() { return state.who ? state.who.person : ''; }
  function isEditor() { return A.can(state.who, 'edit'); }

  var ORDER = ['Potentials', 'Upcoming', 'Applied', 'Active', 'Awarded'];
  var state = { view: 'home', list: null, query: '', archiveQuery: '', myTodo: false, awardView: '', expanded: {}, openId: null, openTaskId: null, openWatchId: null, undo: null, toastAction: null, who: null, myPrograms: false };
  // Choices a person makes on the page (Award year or Spread, My to-do) are kept per browser
  var CHOICE_KEY = 'nami-grants-v2-choices';
  try { var kept = JSON.parse(window.localStorage.getItem(CHOICE_KEY)) || {}; state.myTodo = !!kept.myTodo; state.awardView = kept.awardView || ''; } catch (e) { /* fine without */ }
  function keepChoices() { try { window.localStorage.setItem(CHOICE_KEY, JSON.stringify({ myTodo: state.myTodo, awardView: state.awardView })); } catch (e) { /* fine without */ } }

  var $ = function (id) { return document.getElementById(id); };
  var listEl = $('records'), dialog = $('detail');

  // ---------- small helpers ----------

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'text') e.textContent = v;
      else if (k === 'class') e.className = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }

  // ---------- names: the Labels list wins over the built-in words ----------
  var T = S.makeLabels([]);
  function refreshLabels() { T = S.makeLabels(store.items('labels')); }
  function label(colKey) {
    var c = schema.column('records', colKey);
    if (c) return T('field.' + colKey, c.label);
    var cc = customCols().filter(function (x) { return x.key === colKey; })[0];
    return cc ? cc.label : colKey;
  }
  function statusName(s) { return T('status.' + s, s); }
  function noteHidden(s) { return settingList('hiddenStatusNotes').indexOf(s) !== -1; }
  function statusNote(s) { return noteHidden(s) ? '' : T('statusNote.' + s, schema.STATUS_NOTES[s] || ''); }
  function tileName(k) { var t = S.TILES.filter(function (x) { return x.key === k; })[0]; return T('tile.' + k, t ? t.text : k); }
  function sectionName(k) { var t = S.SECTIONS.filter(function (x) { return x.key === k; })[0]; return T('section.' + k, t ? t.text : k); }
  function customCols() { return S.parseCustom(setting('customColumns')); }

  function setting(key) {
    var row = store.items('settings').filter(function (s) { return s.key === key; })[0];
    return row ? row.value : '';
  }
  function settingList(key) { return setting(key).split(';').map(function (s) { return s.trim(); }).filter(Boolean); }

  // Amounts show with commas in a field ("45,000") and are stored as plain numbers.
  function shownValue(v) {
    if (v === undefined || v === null || v === '') return '';
    return typeof v === 'number' ? v.toLocaleString('en-US') : String(v);
  }

  function money(v) { return (v === undefined || v === null || v === '') ? '' : '$' + Number(v).toLocaleString('en-US'); }

  function niceDate(s) {
    if (!s) return '';
    var p = s.split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    var opts = { month: 'short', day: 'numeric' };
    if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
    return d.toLocaleDateString('en-US', opts);
  }

  function clock(d) {
    var h = d.getHours(), m = d.getMinutes();
    return ((h % 12) || 12) + ':' + (m < 10 ? '0' : '') + m + (h < 12 ? 'am' : 'pm');
  }

  function safeUrl(s) {
    s = String(s || '').trim();
    return /^https?:\/\/\S+$/i.test(s) ? s : null;
  }

  // One icon per status, drawn in the status color. Shape and word always travel with the color.
  var ICONS = {
    Potentials: 'M8 2.5 13.5 8 8 13.5 2.5 8Z',
    Upcoming: 'M3 8h8M8 4.5 11.5 8 8 11.5',
    Applied: 'M2.5 4.5h11v7h-11zM2.5 4.5 8 9l5.5-4.5',
    Awarded: 'M8 2.5l1.7 3.5 3.8.5-2.8 2.6.7 3.8L8 11.1l-3.4 1.8.7-3.8-2.8-2.6 3.8-.5Z',
    Active: 'M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3Z',
    Archived: 'M2.5 4h11v2.5h-11zM3.5 6.5v6h9v-6M6.5 9h3',
    attention: 'M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3ZM8 5.5V8l1.8 1.2',
    plain: 'M3 8h10',
    check: 'M3.5 8.5 6.5 11.5 12.5 4.5',
    chevron: 'M5 6.5 8 9.5 11 6.5',
    grip: 'M6 4h.01M10 4h.01M6 8h.01M10 8h.01M6 12h.01M10 12h.01'
  };
  function icon(name) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 16 16'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'icon');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', ICONS[name] || ICONS.plain);
    svg.appendChild(p);
    return svg;
  }

  function chip(status) {
    return el('span', { class: 'chip s-' + status }, [icon(status), statusName(status)]);
  }

  // Notes that name a field follow that field's name when it is renamed
  function tagText(t) {
    if (t.key === 'applyPassed' && label('deadline') !== 'Apply by') return label('deadline') + ' date passed';
    if (t.key === 'pastEnd') return 'Past ' + label('endDate').toLowerCase();
    return t.text;
  }
  function tagEl(t) { return el('span', { class: 'tag t-' + t.tone }, [icon(t.tone), tagText(t)]); }

  // ---------- Undo ----------

  var toastTimer = null;
  // undo: { list, before } for a change, { list, id, added: true } for an add.
  // action: { label, run } for a one-tap follow-up such as "Start over".
  function toast(text, undo, action) {
    state.undo = undo || null;
    state.toastAction = action || null;
    $('toastText').textContent = text;
    $('toastUndo').textContent = action ? action.label : 'Undo';
    $('toastUndo').hidden = !undo && !action;
    // While a record is open the rest of the page is inert, so the note travels into the open view.
    var home = dialog.open ? dialog : document.body;
    if ($('toast').parentNode !== home) home.appendChild($('toast'));
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $('toast').hidden = true; state.undo = null; state.toastAction = null; }, 8000);
  }

  $('toastUndo').addEventListener('click', function () {
    var a = state.toastAction;
    if (a) { state.toastAction = null; $('toast').hidden = true; a.run(); return; }
    var u = state.undo; if (!u) return;
    state.undo = null; $('toast').hidden = true;
    undoOne(u).catch(function (e) { console.error(e); toast('That could not be put back.'); return Promise.reject(null); }).then(function () {
      state.afterClose = u.home || null; // where focus goes if the open view is gone now
      render(); reopen(u.focus);
      if (!dialog.open && u.home) { var h = document.querySelector(u.home); if (h) h.focus(); }
      toast('Put back.');
    }).catch(function () { /* already said */ });
  });

  // undo: { list, before } puts a change back; { list, id, added } takes an add away;
  // { list, readd } adds a removed item again; { steps: [...] } runs several, in order
  function undoOne(u) {
    var list = u.list || 'records';
    if (u.steps) return u.steps.reduce(function (p, s) { return p.then(function () { return undoOne(s); }); }, Promise.resolve());
    if (u.readd) return store.add(list, u.readd);
    return u.added ? store.remove(list, u.id) : store.restore(list, u.before);
  }

  // ---------- filters ----------

  var FILTER_KEY = 'nami-grants-v2-filters';
  var FILTERS = ['year', 'status', 'program', 'funder', 'grantType', 'owner', 'recordType'];
  state.filters = (function () {
    try { return JSON.parse(window.localStorage.getItem(FILTER_KEY)) || {}; } catch (e) { return {}; }
  })();
  function keepFilters() { try { window.localStorage.setItem(FILTER_KEY, JSON.stringify(state.filters)); } catch (e) { /* fine without */ } }

  function distinct(key) {
    var seen = {};
    store.items('records').forEach(function (r) { if (r[key]) seen[r[key]] = true; });
    return Object.keys(seen).sort();
  }

  function filterChoices(key) {
    if (key === 'year') {
      var ys = {};
      store.items('records').forEach(function (r) { derive.years(r).forEach(function (y) { ys[y] = true; }); if (r.deadline) ys[r.deadline.slice(0, 4)] = true; });
      ys[new Date().getFullYear()] = true;
      return Object.keys(ys).sort();
    }
    if (key === 'status') return ['Potentials', 'Upcoming', 'Applied', 'Awarded', 'Active', 'Archived'];
    var m = /^c\.(\w+)$/.exec(key);
    if (m) {
      var col = customCols().filter(function (c) { return c.key === m[1]; })[0];
      var all = (col ? col.choices : []).slice();
      distinct(m[1]).forEach(function (v) { if (all.indexOf(v) === -1) all.push(v); });
      return all;
    }
    if (/^y\./.test(key)) return ['Yes', 'No'];
    if (key === 'program') return settingList('programs');
    if (key === 'grantType') return settingList('grantTypes');
    if (key === 'recordType') return schema.column('records', 'recordType').choices;
    return distinct(key);
  }

  function buildFilterPanel() {
    var panel = $('filterPanel');
    panel.innerHTML = '';
    var selects = FILTERS.slice(), dates = ['from', 'to', 'applyFrom', 'applyTo'];
    // Custom fields of type choice, yes or no, or date get a filter of their own
    customCols().filter(S.filterable).forEach(function (c) {
      if (c.type === 'choice') selects.push('c.' + c.key);
      else if (c.type === 'yesno') selects.push('y.' + c.key);
      else dates.push('d.' + c.key + '.from', 'd.' + c.key + '.to');
    });
    selects.forEach(function (key) {
      var id = 'flt-' + key;
      var sel = el('select', { id: id, 'data-filter': key }, [el('option', { value: '', text: 'Any' })]);
      var choices = filterChoices(key);
      if (state.filters[key] && choices.indexOf(state.filters[key]) === -1) choices = choices.concat([state.filters[key]]);
      choices.forEach(function (c) { sel.appendChild(el('option', { value: c, text: key === 'status' ? statusName(c) : c })); });
      sel.value = state.filters[key] || '';
      sel.addEventListener('change', function () { setFilter(key, sel.value); });
      panel.appendChild(el('div', { class: 'field' }, [el('label', { for: id, text: filterLabel(key) }), sel]));
    });
    dates.forEach(function (key) {
      var id = 'flt-' + key;
      var inp = el('input', { id: id, type: 'date', 'data-filter': key });
      inp.value = state.filters[key] || '';
      inp.addEventListener('change', function () { setFilter(key, inp.value); });
      panel.appendChild(el('div', { class: 'field' }, [el('label', { for: id, text: filterLabel(key) }), inp]));
    });
  }

  // Filters on custom fields that are gone, or whose filter was switched off, stop counting
  function liveFilters() {
    var ok = {};
    customCols().filter(S.filterable).forEach(function (c) { ok[c.key] = c.type; });
    var out = {};
    Object.keys(state.filters).forEach(function (k) {
      var m = /^[cyd]\.(\w+)/.exec(k);
      if (!m || ok[m[1]] === { c: 'choice', y: 'yesno', d: 'date' }[k.charAt(0)]) out[k] = state.filters[k];
    });
    return out;
  }

  function setFilter(key, value) {
    if (value) state.filters[key] = value; else delete state.filters[key];
    if (key === 'year' && value) { delete state.filters.from; delete state.filters.to; }
    if ((key === 'from' || key === 'to') && value) delete state.filters.year;
    keepFilters();
    keepFocus(draw);
  }

  function filterLabel(key) {
    if (key === 'year' || key === 'from' || key === 'to') return T('filter.' + key, { year: 'Year', from: 'From', to: 'To' }[key]);
    if (key === 'applyFrom') return label('deadline') + ' from';
    if (key === 'applyTo') return label('deadline') + ' to';
    var m = /^[cy]\.(\w+)$/.exec(key);
    if (m) return label(m[1]);
    m = /^d\.(\w+)\.(from|to)$/.exec(key);
    if (m) return label(m[1]) + ' ' + m[2];
    return label(key);
  }

  function renderFilterChips() {
    var box = $('filterChips');
    box.innerHTML = '';
    var keys = Object.keys(liveFilters());
    $('filtersBtn').textContent = 'Filters';
    var narrow = state.who && !state.who.all;
    box.hidden = !keys.length && !narrow;
    // Viewers see their own programs first; for focus, not privacy, so one tap shows everything
    if (narrow && state.myPrograms) {
      box.appendChild(el('button', { type: 'button', class: 'fchip', id: 'programsChip', 'aria-label': 'Show every program', onclick: function () {
        state.myPrograms = false; render();
        toast('Showing every program.', null, { label: 'Undo', run: function () { state.myPrograms = true; render(); } });
      } }, [label('program') + ': ' + state.who.programs.join(', '), el('span', { class: 'x', 'aria-hidden': 'true', text: '×' })]));
    } else if (narrow) {
      box.appendChild(el('button', { type: 'button', class: 'link', id: 'programsChip', text: 'Only my programs', onclick: function () { state.myPrograms = true; render(); } }));
    }
    keys.forEach(function (k) {
      var v = state.filters[k];
      box.appendChild(el('button', { type: 'button', class: 'fchip', 'aria-label': 'Remove filter ' + filterLabel(k), onclick: function () {
        setFilter(k, '');
        toast(filterLabel(k) + ' filter off.', null, { label: 'Undo', run: function () { setFilter(k, v); } });
      } }, [
        filterLabel(k) + ': ' + (/^\d{4}-\d{2}-\d{2}$/.test(v) ? niceDate(v) : k === 'status' ? statusName(v) : v), el('span', { class: 'x', 'aria-hidden': 'true', text: '×' })
      ]));
    });
    if (keys.length) box.appendChild(el('button', { type: 'button', class: 'link', text: 'Clear filters', onclick: function () {
      var was = state.filters;
      state.filters = {}; keepFilters(); render();
      toast('Filters cleared.', null, { label: 'Undo', run: function () { state.filters = was; keepFilters(); render(); } });
    } }));
  }

  $('filtersBtn').addEventListener('click', function () {
    var p = $('filterPanel');
    p.hidden = !p.hidden;
    $('filtersBtn').setAttribute('aria-expanded', String(!p.hidden));
    if (!p.hidden) buildFilterPanel();
  });

  // allPrograms: leave out the viewer's program view (for their own work, and for searches)
  function filtered(today, f, allPrograms) {
    f = f || liveFilters();
    var narrow = state.myPrograms && !allPrograms && !state.query; // a search looks everywhere
    return store.items('records').filter(function (r) {
      return derive.passes(r, f, today) && matches(r, state.query) && (!narrow || A.inPrograms(state.who, r));
    });
  }
  // Every filter but the time period: the Awards tile shows several years side by side
  function filteredAnyYear(today) {
    var live = liveFilters();
    var f = {}; Object.keys(live).forEach(function (k) { if (['year', 'from', 'to'].indexOf(k) === -1) f[k] = live[k]; });
    return filtered(today, f);
  }

  // ---------- rows and lists ----------

  function matches(r, q) {
    if (!q) return true;
    var hay = [r.name, r.funder, r.program, r.owner, r.grantType, r.comments, r.next, r.contactName, r.archiveReason]
      .concat(customCols().filter(function (c) { return c.type !== 'yesno'; }).map(function (c) { return r[c.key]; })).join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
  }

  function row(r, today, extra) {
    var meta = [];
    if (r.funder) meta.push(r.funder);
    if (r.recordType === 'County contract') meta.push('County contract');
    if (r.status === 'Archived' && r.archiveReason) meta.push(r.archiveReason);
    if (extra) meta.push(extra);
    else if (r.awardAmount) meta.push(money(r.awardAmount));
    if ((r.status === 'Potentials' || r.status === 'Upcoming') && r.deadline) meta.push(label('deadline') + ' ' + niceDate(r.deadline));
    else if (r.startDate || r.endDate) meta.push([niceDate(r.startDate), niceDate(r.endDate)].filter(Boolean).join(' to '));
    var tags = derive.tags(r, today, dueDays()).map(tagEl);
    return el('li', {}, [
      el('button', { type: 'button', class: 'row', 'data-id': r.id, onclick: function () { openDetail(r.id); } }, [
        el('span', { class: 'rowMain' }, [
          el('span', { class: 'rowName', text: r.name }),
          meta.length ? el('span', { class: 'rowMeta', text: meta.join(' · ') }) : null
        ]),
        tags.length ? el('span', { class: 'rowSide' }, tags) : null
      ])
    ]);
  }

  function rows(records, today) {
    var ul = el('ul', { class: 'rows' });
    records.forEach(function (r) { ul.appendChild(row(r, today)); });
    return ul;
  }

  function byName(a, b) { return String(a.name).localeCompare(String(b.name)); }

  function hasAttention(r, today) { return derive.tags(r, today, dueDays()).some(function (t) { return t.tone === 'attention'; }); }

  function attentionFirst(today) {
    return function (a, b) {
      var ta = hasAttention(a, today) ? 0 : 1, tb = hasAttention(b, today) ? 0 : 1;
      if (ta !== tb) return ta - tb;
      return String(a.deadline || a.endDate || '9999').localeCompare(String(b.deadline || b.endDate || '9999')) || byName(a, b);
    };
  }

  function group(status, note, items, today) {
    var sec = el('section', { class: 'group' }, [
      el('h2', {}, [chip(status), note ? el('span', { class: 'note', text: '(' + note + ')' }) : null])
    ]);
    sec.appendChild(items.length ? rows(items, today) : el('p', { class: 'quiet empty', text: '·' }));
    return sec;
  }

  // A full list, reached from "Show all" on a tile or by searching.
  function renderList(today) {
    var v = state.list;
    var items = filtered(today).filter(v.test);
    listEl.appendChild(el('div', { class: 'listHead' }, [
      el('button', { type: 'button', class: 'link', text: '← Home', onclick: function () { showHome(); } }),
      el('h2', { text: v.title })
    ]));
    var statuses = v.statuses || ORDER.concat(['Archived']);
    var any = false;
    statuses.forEach(function (st) {
      var these = items.filter(function (r) { return derive.shown(r, today) === st; }).sort(st === 'Archived' ? byName : attentionFirst(today));
      if (!these.length) return;
      any = true;
      listEl.appendChild(group(st, statusNote(st), these, today));
    });
    if (!any) listEl.appendChild(el('p', { class: 'quiet empty', text: '·' }));
  }

  function showList(title, test, statuses) {
    state.view = 'list';
    state.list = { title: title, test: test, statuses: statuses };
    render();
    window.scrollTo(0, 0);
  }

  function showHome() {
    state.view = 'home';
    state.list = null;
    if (state.query) { state.query = ''; $('search').value = ''; }
    render();
  }

  // ---------- the home page: tiles ----------

  // A tile: its title opens and closes it; the handle moves it (press and hold, or arrow keys)
  function tile(key, kids, opts) {
    opts = opts || {};
    var name = tileName(key);
    var shut = !!state.layout.collapsed[key];
    var head = el('header', { class: 'tileHead' }, [
      el('h2', {}, [el('button', { type: 'button', class: 'tileToggle', id: 'tile-' + key, 'aria-expanded': String(!shut), onclick: function () { toggleTile(key); } }, [icon('chevron'), name])]),
      shut ? null : (opts.head || null),
      el('button', { type: 'button', class: 'handle', 'aria-label': 'Move ' + name, title: 'Drag to move, or use the arrow keys', onkeydown: function (e) { moveByKey(e, key); } }, [icon('grip')])
    ]);
    head.addEventListener('pointerdown', function (e) { holdToMove(e, key); });
    return el('section', { class: 'tile' + (opts.wide ? ' wide' : '') + (shut ? ' shut' : ''), 'data-tile': key, 'aria-labelledby': 'tile-' + key }, [
      head,
      shut ? null : el('div', { class: 'tileBody' + (state.opening === key ? ' opening' : '') }, kids),
      shut ? null : el('p', { class: 'stamp', text: 'Updated ' + clock(store.loadedAt || new Date()) })
    ]);
  }

  // ---------- layout: order and collapsed tiles, kept per person in this browser ----------

  function layoutKey() { return 'nami-grants-v2-layout:' + me(); }
  state.layout = S.normalLayout(null);
  function loadLayout() {
    try { state.layout = S.normalLayout(JSON.parse(window.localStorage.getItem(layoutKey()))); } catch (e) { state.layout = S.normalLayout(null); }
  }
  function setLayout(next, note) {
    var before = state.layout;
    state.layout = S.normalLayout(next);
    try { window.localStorage.setItem(layoutKey(), JSON.stringify(state.layout)); } catch (e) { /* fine without */ }
    render();
    if (note) toast(note, null, { label: 'Undo', run: function () { setLayout(before); } });
  }

  function toggleTile(key) {
    var c = Object.assign({}, state.layout.collapsed);
    state.opening = c[key] ? key : null;
    if (c[key]) delete c[key]; else c[key] = true;
    setLayout({ order: state.layout.order, collapsed: c });
  }

  function moveByKey(e, key) {
    var by = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key];
    if (!by) return;
    e.preventDefault();
    var next = S.moveTile(state.layout, key, by);
    if (next.order.join() !== state.layout.order.join()) setLayout(next, tileName(key) + ' moved.');
  }

  // Dragging the dots, or pressing and holding the tile's heading, lifts a tile; it follows the
  // pointer and drops where it is let go. A scroll does nothing. Escape puts it back.
  var HOLD_MS = 350;
  function holdToMove(e, key) {
    if (e.button !== 0 || state.view !== 'home') return;
    var onHandle = !!e.target.closest('.handle');
    if (!onHandle && e.target.closest('button, input, select, label, a')) return;
    if (e.pointerType !== 'mouse' && !onHandle) return; // on a phone the heading scrolls; the handle moves
    var grid = listEl.querySelector('.grid');
    var me = grid && grid.querySelector('[data-tile=' + key + ']');
    if (!me) return;
    var sx = e.clientX, sy = e.clientY, lifted = false;
    var px = sx, py = sy, frame = null, lastOver = null, travelled = false;
    function lift() { lifted = true; me.classList.add('lifted'); document.body.classList.add('moving'); frame = requestAnimationFrame(edge); }
    // The dots lift the tile at once; the heading (with a mouse) waits for a short hold, so a click still opens and closes it
    var timer = null;
    if (onHandle) { e.preventDefault(); lift(); } else timer = setTimeout(lift, HOLD_MS);
    // Near the top or bottom of the window the page scrolls, gently, so a tile can travel far
    function edge() {
      if (!lifted) return;
      var h = window.innerHeight, by = 0;
      if (!travelled) { frame = requestAnimationFrame(edge); return; } // only once the tile is on its way
      if (py < 60) by = -Math.ceil((60 - py) / 6);
      else if (py > h - 60) by = Math.ceil((py - (h - 60)) / 6);
      if (by) { window.scrollBy(0, by); place(); }
      frame = requestAnimationFrame(edge);
    }
    function move(ev) {
      if (!lifted) { if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 10) stop(false); return; }
      ev.preventDefault();
      px = ev.clientX; py = ev.clientY;
      if (Math.abs(px - sx) + Math.abs(py - sy) > 10) travelled = true;
      place();
    }
    function place() {
      var over = document.elementFromPoint(px, py);
      var t = over && over.closest('[data-tile]');
      if (!t || t === me || t.parentNode !== grid) { lastOver = null; return; }
      if (t === lastOver) return; // one move per tile entered, so tiles of different sizes do not flicker
      lastOver = t;
      if (me.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING) grid.insertBefore(me, t.nextSibling);
      else grid.insertBefore(me, t);
    }
    function key_(ev) { if (ev.key === 'Escape') stop(true); }
    function up() { stop(false); }
    function stop(cancel) {
      clearTimeout(timer);
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', key_);
      if (!lifted) return;
      lifted = false;
      me.classList.remove('lifted'); document.body.classList.remove('moving');
      var order = Array.prototype.map.call(grid.querySelectorAll(':scope > [data-tile]'), function (t) { return t.getAttribute('data-tile'); });
      if (cancel || order.join() === state.layout.order.join()) { render(); return; }
      setLayout({ order: order, collapsed: state.layout.collapsed }, tileName(key) + ' moved.');
    }
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', key_);
  }

  function dueDays() { return Number(setting('dueSoonDays')) || derive.DUE_SOON_DAYS; }

  function more(text, onclick) { return el('button', { type: 'button', class: 'link more', text: text, onclick: onclick }); }

  function taskRecordPasses(t, ids) { return !t.record || ids[t.record]; }

  function stepsDone(t) { return A.stepState(t, store.items('progress')).done; }

  // Everything with a date that needs doing: tasks, apply-by dates, ended awards.
  // recsAll: the same records without the program view, so a person's own tasks and records always show
  function todoItems(today, recs, mineOnly, recsAll) {
    var ids = {}; recs.forEach(function (r) { ids[r.id] = r; });
    var idsAll = {}; (recsAll || recs).forEach(function (r) { idsAll[r.id] = r; });
    if (mineOnly) { recs = recsAll || recs; ids = idsAll; }
    var t = derive.iso(today), soon = derive.iso(derive.addDays(today, dueDays()));
    var items = [];
    store.items('tasks').forEach(function (task) {
      if (task.done) return;
      if (!taskRecordPasses(task, ids) && !(task.assignedTo === me() && taskRecordPasses(task, idsAll))) return;
      if (mineOnly && task.assignedTo !== me()) return;
      var rec = task.record ? store.get('records', task.record) : null;
      items.push({ kind: 'task', date: task.dueDate || '', title: task.title, task: task, record: rec,
        note: !task.dueDate ? '' : task.dueDate < t ? 'Past due date' : task.dueDate <= soon ? 'Due soon' : '' });
    });
    recs.forEach(function (r) {
      if (mineOnly && r.owner !== me()) return;
      if ((r.status === 'Upcoming' || r.status === 'Potentials') && r.deadline) {
        var note = r.deadline < t ? tagText({ key: 'applyPassed', text: 'Apply-by date passed' }) : r.deadline <= soon ? 'Due soon' : '';
        // Potentials only come up once their apply-by date is near, so To-do stays short
        if (r.status === 'Upcoming' || note) items.push({ kind: 'apply', date: r.deadline, title: label('deadline') + ': ' + r.name, record: r, note: note });
      }
      if (r.status === 'Awarded' && r.endDate && r.endDate < t) {
        items.push({ kind: 'ended', date: r.endDate, title: r.name, record: r, note: tagText({ key: 'pastEnd' }) });
      }
    });
    // Review: a watched cycle's month, or a record's watch date, has arrived. Watch-list rows
    // belong to nobody, so My to-do shows only the person's own records here.
    W.reviewItems(mineOnly ? [] : store.items('watch'), recs.filter(function (r) { return !mineOnly || r.owner === me(); }), today).forEach(function (it) {
      if (it.watch && it.watch.record) it.record = store.get('records', it.watch.record);
      items.push(it);
    });
    items.sort(function (a, b) {
      var na = a.note ? 0 : 1, nb = b.note ? 0 : 1;
      if (na !== nb) return na - nb;
      return String(a.date || '9999').localeCompare(String(b.date || '9999'));
    });
    return items;
  }

  function todoRow(it) {
    var meta = [];
    if (it.date) meta.push(niceDate(it.date));
    if (it.kind === 'task') {
      if (it.record) meta.push(it.record.name);
      if (it.task.assignedTo) meta.push(it.task.assignedTo);
      var n = stepsDone(it.task);
      if (n) meta.push(n === 1 ? '1 step done' : n + ' steps done');
    }
    if (it.kind === 'review') {
      if (it.watch) meta.push(it.watch.kind || '', it.record ? it.record.name : '');
      else if (it.record.watchNote) meta.push(it.record.watchNote);
      meta = meta.filter(Boolean);
    }
    var open = function () {
      if (it.kind === 'task') openTask(it.task.id);
      else if (it.kind === 'review' && it.watch) openWatch(it.watch.id);
      else if (it.record) openDetail(it.record.id);
    };
    var reviewOfWatch = it.kind === 'review' && it.watch;
    var main = el('button', { type: 'button', class: 'todoMain', 'data-id': it.kind !== 'task' && !reviewOfWatch && it.record ? it.record.id : null, 'data-task': it.kind === 'task' ? it.task.id : null, 'data-watch': reviewOfWatch ? it.watch.id : null, onclick: open }, [
      el('span', { class: 'rowName', text: it.title }),
      el('span', { class: 'rowMeta', text: meta.join(' · ') }),
      it.note ? tagEl({ text: it.note, tone: 'attention' }) : null
    ]);
    var kids = [];
    if (it.kind === 'task' && isEditor()) {
      kids.push(el('button', { type: 'button', class: 'check', 'aria-label': 'Mark done: ' + it.title, title: 'Mark done', onclick: function () { markDone(it.task); } }, [icon('check')]));
    }
    kids.push(main);
    if (it.kind === 'review' && isEditor()) kids.push(reviewActions(it));
    return el('li', { class: 'todo' + (it.kind === 'review' ? ' review' : '') }, kids);
  }

  // ---------- Review items: make a record from a watched cycle, or set it aside until next time ----------

  function reviewActions(it) {
    var name = it.watch ? it.watch.name : it.record.name;
    var kids = [];
    if (it.watch && !it.record) {
      ['Potentials', 'Upcoming'].forEach(function (st) {
        kids.push(el('button', { type: 'button', class: 'quietBtn small', 'aria-label': 'Add ' + name + ' as ' + statusName(st), onclick: function () { recordFromWatch(it.watch, st); } }, ['Add as ' + statusName(st)]));
      });
    }
    kids.push(el('button', { type: 'button', class: 'quietBtn small', 'aria-label': 'Done for now: ' + name, onclick: function () { reviewed(it); } }, ['Done for now']));
    return el('div', { class: 'reviewActions' }, kids);
  }

  function recordFromWatch(w, status) {
    var today = derive.iso(new Date());
    var fields = { name: w.name, status: status, comments: w.notes || '', links: safeUrl(w.link) || '' };
    store.add('records', fields, { me: me() }).then(function (r) {
      return store.update('watch', w.id, { record: r.id, lastReviewed: today }).then(function (res) {
        render(); openDetail(r.id);
        toast('Added as ' + statusName(status) + '.', { steps: [{ list: 'watch', before: res.before }, { list: 'records', id: r.id, added: true }], home: '[data-tile=todo] [data-watch="' + w.id + '"]' });
      });
    }).catch(function (e) { console.error(e); toast('That did not save.'); });
  }

  // The watched cycle comes back next year; a record's watch date is cleared (Undo brings it back)
  function reviewed(it) {
    var p = it.watch
      ? store.update('watch', it.watch.id, { lastReviewed: derive.iso(new Date()) }).then(function (res) { return { list: 'watch', before: res.before }; })
      : store.update('records', it.record.id, { watchDate: '' }).then(function (res) { return { list: 'records', before: res.before }; });
    p.then(function (undo) { render(); toast('Done for now.', undo); }).catch(function (e) { console.error(e); toast('That did not save.'); });
  }

  function markDone(task) {
    store.update('tasks', task.id, { done: true }).then(function (res) {
      render();
      toast('Done: ' + task.title + '.', { list: 'tasks', before: res.before });
    });
  }

  function renderHome(today) {
    var recs = filtered(today);
    var active = recs.filter(function (r) { return r.status !== 'Archived'; });
    var grid = el('div', { class: 'grid' });
    var tiles = {};

    // Needs attention: anything past its date or due within the due-soon window, across everything
    var recsAll = state.myPrograms ? filtered(today, null, true) : recs;
    var attention = todoItems(today, recs, false, recsAll).filter(function (it) { return it.note; });
    var attBody = attention.length ? el('ul', { class: 'todos' }) : el('p', { class: 'quiet empty', text: '·' });
    attention.slice(0, state.expanded.attention ? 99 : 6).forEach(function (it) { attBody.appendChild(todoRow(it)); });
    tiles.attention = (tile('attention', [attBody,
      attention.length > 6 && !state.expanded.attention ? more('Show all', function () { state.expanded.attention = true; render(); }) : null]));

    // To-do: what is coming up and not already in Needs attention; My to-do shows all of mine
    var todos = todoItems(today, recs, state.myTodo, recsAll).filter(function (it) { return state.myTodo || !it.note; });
    var todoBody = todos.length ? el('ul', { class: 'todos' }) : el('p', { class: 'quiet empty', text: '·' });
    todos.slice(0, state.expanded.todo ? 99 : 6).forEach(function (it) { todoBody.appendChild(todoRow(it)); });
    var mine = el('label', { class: 'toggle' }, [el('input', { type: 'checkbox', id: 'myTodo' }), T('filter.myTodo', 'My to-do')]);
    mine.firstChild.checked = !!state.myTodo;
    mine.firstChild.addEventListener('change', function (e) { state.myTodo = e.target.checked; keepChoices(); render(); });
    tiles.todo = (tile('todo', [todoBody,
      todos.length > 6 && !state.expanded.todo ? more('Show all', function () { state.expanded.todo = true; render(); }) : null], { head: mine }));

    // Pipeline: a count, a bar and a short list per status
    var pipe = el('div', { class: 'pipeline' });
    var counts = ORDER.map(function (st) { return active.filter(function (r) { return derive.shown(r, today) === st; }); });
    var biggest = Math.max.apply(null, counts.map(function (c) { return c.length; }).concat([1]));
    ORDER.forEach(function (st, i) {
      var these = counts[i].sort(attentionFirst(today));
      var col = el('div', { class: 'stage' }, [
        el('div', { class: 'stageHead' }, [chip(st), el('span', { class: 'count', text: String(these.length) })]),
        el('div', { class: 'meter' }, [el('span', { class: 'fill s-' + st, style: 'width:' + Math.round(these.length / biggest * 100) + '%' })]),
        statusNote(st) ? el('p', { class: 'note', text: '(' + statusNote(st) + ')' }) : null
      ]);
      var ul = el('ul', { class: 'mini' });
      these.slice(0, 3).forEach(function (r) { ul.appendChild(el('li', {}, [el('button', { type: 'button', class: 'link', text: r.name, onclick: function () { openDetail(r.id); } })])); });
      if (these.length) col.appendChild(ul);
      if (these.length > 3) col.appendChild(more('Show all', function () { showList(statusName(st), function (r) { return derive.shown(r, today) === st && r.status !== 'Archived'; }, [st]); }));
      pipe.appendChild(col);
    });
    tiles.pipeline = (tile('pipeline', [pipe], { wide: true }));

    tiles.awards = awardsTile(today);
    tiles.watch = watchTile(today, recsAll);

    // County contracts
    var cc = active.filter(function (r) { return r.recordType === 'County contract'; }).sort(attentionFirst(today));
    tiles.contracts = (tile('contracts', [
      cc.length ? rows(cc.slice(0, 4), today) : el('p', { class: 'quiet empty', text: '·' }),
      cc.length > 4 ? more('Show all', function () { showList(tileName('contracts'), function (r) { return r.recordType === 'County contract'; }, ORDER); }) : null
    ]));

    // Archive: its own search
    var aq = el('input', { type: 'search', id: 'archiveSearch', placeholder: 'Search', autocomplete: 'off' });
    aq.value = state.archiveQuery || '';
    var arch = null;
    var archList = el('div', { id: 'archiveList' });
    function fillArchive() {
      archList.innerHTML = '';
      var found = (state.archiveQuery ? recsAll : recs).filter(function (r) { return r.status === 'Archived' && matches(r, state.archiveQuery); }).sort(byName);
      archList.appendChild(found.length ? rows(found.slice(0, 5), today) : el('p', { class: 'quiet empty', text: '·' }));
      if (found.length > 5) archList.appendChild(more('Show all', function () { showList(tileName('archive'), function (r) { return r.status === 'Archived' && matches(r, state.archiveQuery); }, ['Archived']); }));
    }
    aq.addEventListener('input', function () { state.archiveQuery = aq.value.trim(); fillArchive(); });
    fillArchive();
    tiles.archive = (tile('archive', [el('label', {}, [el('span', { class: 'sr', text: 'Search ' + tileName('archive') }), aq]), archList]));

    state.layout.order.forEach(function (k) { if (tiles[k]) grid.appendChild(tiles[k]); });
    listEl.appendChild(grid);
    if (arch) { /* kept for the search box above */ }
  }

  // Awards: totals by year, Award year or Spread, this year beside last year, and the sheet
  function awardsTile(today) {
    var recs = filteredAnyYear(today);
    var mode = state.awardView || setting('defaultAwardView') || 'Award year';
    var totals = derive.awardsByYear(recs, store.items('awardYears'), mode);
    var focus = Number(state.filters.year) || today.getFullYear();
    var shownYears = [focus - 2, focus - 1, focus, focus + 1].filter(function (y) { return totals[y] || y === focus || y === focus - 1; });
    var biggest = Math.max.apply(null, shownYears.map(function (y) { return totals[y] || 0; }).concat([1]));

    var toggle = el('div', { class: 'seg', role: 'group', 'aria-label': 'How totals are counted' });
    ['Award year', 'Spread'].forEach(function (m) {
      toggle.appendChild(el('button', { type: 'button', 'aria-pressed': String(m === mode), 'data-view': m, text: m, onclick: function () { state.awardView = m; keepChoices(); render(); } }));
    });

    var bars = el('ul', { class: 'yearBars' });
    shownYears.forEach(function (y) {
      bars.appendChild(el('li', { class: y === focus ? 'focus' : '' }, [
        el('span', { class: 'yr', text: String(y) }),
        el('span', { class: 'meter' }, [el('span', { class: 'fill', style: 'width:' + Math.round((totals[y] || 0) / biggest * 100) + '%' })]),
        el('span', { class: 'amt', 'data-year': y, text: money(totals[y] || 0) })
      ]));
    });

    var compare = el('p', { class: 'compare' }, [
      el('strong', { class: 'big', id: 'awardFocus', text: money(totals[focus] || 0) }),
      el('span', { class: 'quiet', text: ' in ' + focus + ' · ' + money(totals[focus - 1] || 0) + ' in ' + (focus - 1) })
    ]);

    var sheet = null;
    if (state.expanded.awards) {
      var lines = recs.filter(derive.isAward).map(function (r) {
        return { r: r, amt: derive.awardShares(r, store.items('awardYears'), mode)[focus] || 0 };
      }).filter(function (x) { return x.amt; }).sort(function (a, b) { return b.amt - a.amt; });
      sheet = el('table', { class: 'sheet' }, [
        el('thead', {}, [el('tr', {}, [el('th', { text: label('name') }), el('th', { text: label('program') }), el('th', { text: label('recordType') }), el('th', { class: 'num', text: String(focus) })])])
      ]);
      var tb = el('tbody');
      lines.forEach(function (x) {
        tb.appendChild(el('tr', {}, [
          el('td', {}, [el('button', { type: 'button', class: 'link', text: x.r.name, onclick: function () { openDetail(x.r.id); } })]),
          el('td', { text: x.r.program || '' }),
          el('td', { text: x.r.recordType || 'Grant' }),
          el('td', { class: 'num', text: money(x.amt) })
        ]));
      });
      sheet.appendChild(tb);
      sheet = el('div', { class: 'scroll' }, [sheet]);
    }

    return tile('awards', [compare, bars,
      sheet,
      more(state.expanded.awards ? 'Hide the list' : 'Show the list', function () { state.expanded.awards = !state.expanded.awards; render(); })
    ], { head: toggle });
  }

  // ---------- Funding Watch: feeds and the watch list ----------

  // Results kept per feed while the page is open: { key, state: 'loading' | 'ok' | 'error', items }
  var feedCache = {};
  var RETRY_MS = 3 * 60 * 1000;
  function feedKey(f) { return [f.id, f.type, f.source].join('|'); }
  function feedState(f) {
    var k = feedKey(f), c = feedCache[f.id];
    // A feed that did not answer is asked again after a few minutes
    if (c && c.key === k && !(c.state === 'error' && Date.now() - c.at > RETRY_MS)) return c;
    c = feedCache[f.id] = { key: k, state: 'loading', items: [], at: Date.now() };
    feedClient.load(f).then(function (items) { c.state = 'ok'; c.items = items || []; })
      .catch(function (e) { console.warn('Feed not loading:', f.name, e && e.message); c.state = 'error'; c.at = Date.now(); })
      .then(function () { if (feedCache[f.id] === c) refreshFeeds(); });
    return c;
  }
  function refreshFeeds() {
    var box = $('feeds');
    if (box) keepFocus(function () { fillFeeds(box, new Date()); });
  }

  function watchTile(today, recsAll) {
    var editor = isEditor();
    var feedsBox = el('div', { id: 'feeds', class: 'feedsBox' });
    if (!state.layout.collapsed.watch) fillFeeds(feedsBox, today);
    return tile('watch', [el('div', { class: 'watchCols' }, [
      el('div', { class: 'watchPart' }, [el('h3', { text: sectionName('feeds') }), feedsBox, editor ? opener('addingFeed', 'openAddFeed', 'Add feed', addFeedForm, 'newFeedName') : null]),
      el('div', { class: 'watchPart' }, [el('h3', { text: sectionName('watchList') }), watchList(today, recsAll), editor ? opener('addingWatch', 'openAddWatch', 'Add to the list', addWatchForm, 'newWatchName') : null])
    ])], { wide: true });
  }

  // A small form that stays out of the way until it is asked for
  function opener(flag, id, text, makeForm, first) {
    if (!state[flag]) return el('button', { type: 'button', class: 'link more', id: id, text: text, onclick: function () {
      state[flag] = true; render(); var f = $(first); if (f) f.focus();
    } });
    var form = makeForm();
    form.appendChild(el('button', { type: 'button', class: 'link', text: 'Cancel', onclick: function () { closeOpener(flag, id); } }));
    return form;
  }
  function closeOpener(flag, id) { state[flag] = false; render(); var b = $(id); if (b) b.focus(); }

  function fillFeeds(box, today) {
    box.innerHTML = '';
    var editor = isEditor();
    var feeds = store.items('feeds').filter(function (f) { return editor || derive.isYes(f.on); });
    if (!feeds.length) { box.appendChild(el('p', { class: 'quiet empty', text: '·' })); return; }
    var ul = el('ul', { class: 'feeds' });
    var recs = store.items('records');
    feeds.forEach(function (f) {
      var on = derive.isYes(f.on);
      var link = f.type === 'Quick link' && safeUrl(f.source);
      var head = el('div', { class: 'feedHead' }, [
        link ? el('a', { href: link, target: '_blank', rel: 'noopener noreferrer', class: 'feedName', text: f.name || f.source }) : el('strong', { class: 'feedName', text: f.name || f.source || 'Feed' }),
        editor ? el('span', { class: 'feedTools' }, [feedToggle(f, on),
          el('button', { type: 'button', class: 'link', 'data-feed-edit': f.id, 'aria-label': 'Edit ' + (f.name || 'feed'), text: 'Edit', onclick: function () { openFeed(f.id); } }),
          el('button', { type: 'button', class: 'link', 'aria-label': 'Remove ' + (f.name || 'feed'), text: 'Remove', onclick: function () { removeFeed(f); } })]) : null
      ]);
      var kids = [head];
      if (on && f.type !== 'Quick link') kids.push(feedBody(f, recs));
      ul.appendChild(el('li', { class: 'feed' + (on ? '' : ' off'), 'data-feed': f.id }, kids));
    });
    box.appendChild(ul);
  }

  function feedToggle(f, on) {
    var box = el('input', { type: 'checkbox', id: 'feed-on-' + f.id });
    box.checked = on;
    box.addEventListener('change', function () {
      store.update('feeds', f.id, { on: box.checked }).then(function (res) {
        render(); toast(box.checked ? 'Feed on.' : 'Feed off.', { list: 'feeds', before: res.before, focus: null });
      }).catch(function (e) { console.error(e); box.checked = on; });
    });
    return el('label', { class: 'toggle' }, [box, 'On', el('span', { class: 'sr', text: ': ' + (f.name || 'feed') })]);
  }

  function feedBody(f, recs) {
    var c = feedState(f);
    if (c.state === 'loading') return el('p', { class: 'quiet', text: 'Loading' });
    if (c.state === 'error') return el('p', { class: 'quiet notLoading' }, [icon('plain'), 'Not loading right now']);
    if (!c.items.length) return el('p', { class: 'quiet', text: '·' });
    var all = !!state.expanded['feed-' + f.id];
    var ul = el('ul', { class: 'results' });
    c.items.slice(0, all ? 99 : 3).forEach(function (it) { ul.appendChild(resultRow(it, f, recs)); });
    return el('div', { class: 'feedBody' }, [ul,
      c.items.length > 3 && !all ? more('Show all', function () { state.expanded['feed-' + f.id] = true; refreshFeeds(); }) : null]);
  }

  function resultRow(it, f, recs) {
    var meta = [it.source, it.date ? (f.type === 'Grants.gov' ? 'Closes ' : 'Posted ') + niceDate(it.date) : ''].filter(Boolean).join(' · ');
    var url = safeUrl(it.url);
    var have = url && recs.filter(function (r) { return String(r.links || '').split(/\s+/).indexOf(url) !== -1; })[0];
    var side = null;
    if (have) side = el('button', { type: 'button', class: 'link added', 'data-id': have.id, 'aria-label': 'Added: open ' + have.name, onclick: function () { openDetail(have.id); } }, [icon('check'), 'Added']);
    else if (isEditor()) side = el('button', { type: 'button', class: 'quietBtn small', 'aria-label': 'Add as ' + statusName('Potentials') + ': ' + it.title, onclick: function () { addFromResult(it, f); } }, ['Add as ' + statusName('Potentials')]);
    return el('li', { class: 'result' }, [
      el('div', { class: 'resultMain' }, [
        url ? el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text: it.title }) : el('span', { text: it.title }),
        meta ? el('span', { class: 'quiet', text: meta }) : null
      ]),
      side
    ]);
  }

  function addFromResult(it, f) {
    var fields = { name: it.title, funder: it.source || '', deadline: /^\d{4}-\d{2}-\d{2}$/.test(it.date || '') && f.type === 'Grants.gov' ? it.date : '', links: safeUrl(it.url) || '', status: 'Potentials' };
    if (f.type === 'Grants.gov') fields.grantType = 'Federal';
    store.add('records', fields, { me: me() }).then(function (r) {
      render();
      toast('Added to ' + statusName('Potentials') + '.', { list: 'records', id: r.id, added: true });
    }).catch(function (e) { console.error(e); toast('That did not save.'); });
  }

  function removeFeed(f) {
    var keep = {}; Object.keys(f).forEach(function (k) { if (k !== 'id' && k !== 'modified') keep[k] = f[k]; }); // created stays
    store.remove('feeds', f.id).then(function () {
      delete feedCache[f.id];
      render(); toast((f.name || 'Feed') + ' removed.', { list: 'feeds', readd: keep });
    }).catch(function (e) { console.error(e); toast('That did not save.'); });
  }

  function addFeedForm() {
    var name = el('input', { id: 'newFeedName', autocomplete: 'off' });
    var type = el('select', { id: 'newFeedType' });
    schema.column('feeds', 'type').choices.forEach(function (t) { type.appendChild(el('option', { value: t, text: t })); });
    var source = el('input', { id: 'newFeedSource', autocomplete: 'off' });
    var sourceLabel = el('label', { for: 'newFeedSource' });
    var problem = el('p', { class: 'problem', hidden: true });
    function relabel() { sourceLabel.textContent = type.value === 'Grants.gov' ? 'Keywords' : 'Link'; }
    type.addEventListener('change', relabel); relabel();
    var form = el('form', { class: 'addFeed' }, [
      el('div', { class: 'field' }, [el('label', { for: 'newFeedName', text: 'New feed' }), name]),
      el('div', { class: 'field' }, [el('label', { for: 'newFeedType', text: 'Kind' }), type]),
      el('div', { class: 'field' }, [sourceLabel, source]),
      problem,
      el('button', { type: 'submit', class: 'quietBtn', id: 'addFeed' }, ['Add feed'])
    ]);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      problem.hidden = true;
      var src = source.value.trim(), nm = name.value.trim();
      if (!nm && !src) { name.focus(); return; }
      if (type.value !== 'Grants.gov' && src && !W.safeFeedUrl(src)) {
        problem.textContent = 'That link needs to be a web address, like https://example.org/feed.xml.';
        problem.hidden = false; source.focus(); return;
      }
      if (type.value === 'Feed link' && !src) { source.focus(); return; }
      store.add('feeds', { name: nm || src, type: type.value, source: src, on: true }).then(function (f) {
        closeOpener('addingFeed', 'openAddFeed');
        toast('Feed added.', { list: 'feeds', id: f.id, added: true });
      }).catch(function (err) { problem.textContent = err.message; problem.hidden = false; });
    });
    return form;
  }

  // The watch list: watched cycles by the month they open, and records with a watch date
  function openingText(w, today) {
    if (!derive.isYes(w.repeatsYearly) && w.lastReviewed) return 'Reviewed ' + niceDate(w.lastReviewed);
    var n = W.nextOpening(w, today);
    if (!n) return 'Opening month not set';
    if (n.year === today.getFullYear() && n.month === today.getMonth() + 1) return 'Opens this month';
    return 'Opens in ' + W.MONTHS[n.month - 1];
  }

  function watchList(today, recsAll) {
    var watch = store.items('watch');
    var linked = {}; watch.forEach(function (w) { if (w.record) linked[w.record] = true; });
    var rowsOut = watch.map(function (w) {
      var n = W.nextOpening(w, today);
      return { sort: n ? n.year + '-' + (n.month < 10 ? '0' : '') + n.month : '9999', watch: w };
    }).concat(recsAll.filter(function (r) { return r.watchDate && !linked[r.id]; }).map(function (r) {
      return { sort: String(r.watchDate).slice(0, 7), record: r };
    })).sort(function (a, b) { return a.sort.localeCompare(b.sort) || String((a.watch || a.record).name).localeCompare(String((b.watch || b.record).name)); });
    if (!rowsOut.length) return el('p', { class: 'quiet empty', text: '·' });
    var all = !!state.expanded.watchList;
    var ul = el('ul', { class: 'todos watchList' });
    rowsOut.slice(0, all ? 99 : 6).forEach(function (x) {
      var w = x.watch, r = x.record;
      var meta = w ? [openingText(w, today), w.kind, w.record && store.get('records', w.record) ? store.get('records', w.record).name : ''] : [label('watchDate') + ' ' + niceDate(r.watchDate), r.watchNote];
      ul.appendChild(el('li', { class: 'todo' }, [el('button', {
        type: 'button', class: 'todoMain', 'data-watch': w ? w.id : null, 'data-id': r ? r.id : null,
        onclick: function () { if (w) openWatch(w.id); else openDetail(r.id); }
      }, [el('span', { class: 'rowName', text: w ? w.name : r.name }), el('span', { class: 'rowMeta', text: meta.filter(Boolean).join(' · ') })])]));
    });
    return el('div', { class: 'watchBox' }, [ul,
      rowsOut.length > 6 && !all ? more('Show all', function () { state.expanded.watchList = true; render(); }) : null]);
  }

  function addWatchForm() {
    var name = el('input', { id: 'newWatchName', autocomplete: 'off' });
    var month = el('select', { id: 'newWatchMonth' }, [el('option', { value: '', text: '' })]);
    W.MONTHS.forEach(function (m, i) { month.appendChild(el('option', { value: String(i + 1), text: m })); });
    var form = el('form', { class: 'addFeed' }, [
      el('div', { class: 'field' }, [el('label', { for: 'newWatchName', text: 'Watch for' }), name]),
      el('div', { class: 'field' }, [el('label', { for: 'newWatchMonth', text: 'Opens in' }), month]),
      el('button', { type: 'submit', class: 'quietBtn', id: 'addWatch' }, ['Add to the list'])
    ]);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nm = name.value.trim();
      if (!nm) { name.focus(); return; }
      store.add('watch', { name: nm, kind: 'Cycle', opens: month.value, repeatsYearly: true }).then(function (w) {
        closeOpener('addingWatch', 'openAddWatch');
        toast('Added to the watch list.', { list: 'watch', id: w.id, added: true });
      }).catch(function (err) { console.error(err); toast('That did not save.'); });
    });
    return form;
  }

  // One watched item: every field (editors), the record it led to, and Remove
  function openWatch(id, focusSel) {
    var w = store.get('watch', id);
    if (!w) { closeDetail(); return; }
    refreshLabels();
    state.openWatchId = id; state.openId = null; state.openTaskId = null; state.openFeedId = null;
    var editor = isEditor();
    var rec = w.record ? store.get('records', w.record) : null;
    var body = el('div', { class: 'detailBody', 'data-watch-view': id }, [
      el('header', { class: 'detailHead' }, [
        el('div', {}, [el('h2', { id: 'detailName', text: w.name || 'Watch' }), el('p', { class: 'detailStatus quiet', id: 'watchWhen', text: openingText(w, new Date()) })]),
        el('button', { type: 'button', class: 'link close', onclick: closeDetail, 'aria-label': 'Close' }, ['Close'])
      ]),
      el('p', { class: 'problem', hidden: true }),
      rec ? el('p', { class: 'taskRecord' }, [el('button', { type: 'button', class: 'link', id: 'watchRecord', text: '← ' + rec.name, onclick: function () { openDetail(rec.id); } })]) : null,
      el('div', { class: 'fields' }, [
        field(w, 'name', { list: 'watch', wide: true }), field(w, 'kind', { list: 'watch' }), field(w, 'opens', { list: 'watch' }),
        field(w, 'repeatsYearly', { list: 'watch' }), field(w, 'link', { list: 'watch', wide: true }), field(w, 'record', { list: 'watch', wide: true }),
        field(w, 'notes', { list: 'watch', wide: true })
      ].filter(Boolean)),
      editor ? el('div', { class: 'detailActions' }, [
        el('button', { type: 'button', class: 'quietBtn', id: 'removeWatch', onclick: function () { removeWatch(w); } }, ['Take off the list'])
      ]) : null
    ]);
    mount(body, focusSel);
  }

  // One feed's details, so a name, keywords or link can be changed
  function openFeed(id, focusSel) {
    var f = store.get('feeds', id);
    if (!f) { closeDetail(); return; }
    state.openFeedId = id; state.openId = null; state.openTaskId = null; state.openWatchId = null;
    mount(el('div', { class: 'detailBody', 'data-feed-view': id }, [
      el('header', { class: 'detailHead' }, [
        el('div', {}, [el('h2', { id: 'detailName', text: f.name || 'Feed' })]),
        el('button', { type: 'button', class: 'link close', onclick: closeDetail, 'aria-label': 'Close' }, ['Close'])
      ]),
      el('p', { class: 'problem', hidden: true }),
      el('div', { class: 'fields' }, [field(f, 'name', { list: 'feeds', wide: true }), field(f, 'type', { list: 'feeds' }), field(f, 'on', { list: 'feeds' }),
        field(f, 'source', { list: 'feeds', wide: true, label: f.type === 'Grants.gov' ? 'Keywords (separated by ;)' : 'Link' })].filter(Boolean))
    ]), focusSel || '#f-name');
  }

  function refreshWatch(w, key) {
    var h = dialog.querySelector('#detailName'); if (h) h.textContent = w.name || 'Watch';
    var when = dialog.querySelector('#watchWhen'); if (when) when.textContent = openingText(w, new Date());
    if (key === 'record') openWatch(w.id, '#f-record'); // the link to the record comes and goes
  }

  function removeWatch(w) {
    // created stays, so a cycle that has already opened still comes up after Undo
    var keep = {}; Object.keys(w).forEach(function (k) { if (k !== 'id' && k !== 'modified') keep[k] = w[k]; });
    store.remove('watch', w.id).then(function () {
      closeDetail();
      toast((w.name || 'It') + ' is off the watch list.', { list: 'watch', readd: keep });
    }).catch(showProblem);
  }

  // ---------- render ----------

  // A rebuild must not throw a keyboard user back to the top: put focus back on the same control,
  // or, when that control is gone (a task just marked done), on the one now in its place.
  function keepFocus(fn) {
    var a = document.activeElement, key = null, tileKey = null, index = -1;
    if (a && a !== document.body && !dialog.contains(a)) {
      if (a.id) key = '#' + CSS.escape(a.id);
      else if (a.getAttribute('data-view')) key = '[data-view="' + a.getAttribute('data-view') + '"]';
      else if (a.getAttribute('aria-label')) key = '[aria-label="' + a.getAttribute('aria-label').replace(/"/g, '\\"') + '"]';
      var t = a.closest('[data-tile]');
      if (t) {
        tileKey = t.getAttribute('data-tile');
        if (!key && a.getAttribute('data-id')) key = '[data-tile=' + tileKey + '] [data-id="' + a.getAttribute('data-id') + '"]';
        index = Array.prototype.indexOf.call(t.querySelectorAll(FOCUSABLE), a);
      }
    }
    fn();
    if (!key && !tileKey) return;
    var b = null;
    try { b = key && document.querySelector(key); } catch (e) { b = null; }
    if (!b && tileKey) {
      var box = document.querySelector('[data-tile=' + tileKey + ']');
      var all = box ? box.querySelectorAll(FOCUSABLE) : [];
      b = all[Math.min(index, all.length - 1)] || null;
    }
    if (b && b !== document.activeElement) b.focus();
  }
  var FOCUSABLE = 'button:not([disabled]), input, select, a[href]';

  function render() { keepFocus(draw); state.opening = null; }

  function draw() {
    var today = new Date();
    refreshLabels();
    listEl.innerHTML = '';
    renderFilterChips();
    if (!$('filterPanel').hidden) buildFilterPanel(); // names and custom fields may have changed
    var editor = isEditor();
    if (!editor) { $('add').hidden = true; $('addForm').hidden = true; if (state.view === 'setup') state.view = 'home'; }
    else if ($('addForm').hidden) $('add').hidden = false;
    $('setupBtn').hidden = !editor;
    $('reset').hidden = !editor || onSharePoint;
    $('allLists').hidden = onSharePoint; // that page shows the sample
    renderWho();
    document.querySelector('label[for=addName]').textContent = label('name');
    document.querySelector('label[for=addType]').textContent = label('recordType');
    document.querySelector('h1').textContent = document.title = T('page.title', 'Grants Dashboard');
    if (state.query) {
      state.view = 'list';
      state.list = { title: 'Search', test: function () { return true; } };
    }
    if (state.view === 'setup') renderSetup();
    else if (state.view === 'list' && state.list) renderList(today);
    else renderHome(today);
    $('stamp').textContent = 'Updated ' + clock(store.loadedAt || new Date());
  }

  // ---------- search, add ----------

  $('search').addEventListener('input', function (e) {
    state.query = e.target.value.trim();
    if (!state.query && state.list && state.list.title === 'Search') { state.view = 'home'; state.list = null; }
    render();
  });

  $('add').addEventListener('click', function () {
    $('addForm').hidden = false; $('add').hidden = true; $('addName').value = ''; $('addName').focus();
  });
  $('addCancel').addEventListener('click', closeAdd);
  function closeAdd() { $('addForm').hidden = true; $('add').hidden = false; }

  $('addForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('addName').value.trim();
    if (!name) { $('addName').focus(); return; }
    store.add('records', { name: name, recordType: $('addType').value }, { me: me() }).then(function (r) {
      closeAdd(); render(); openDetail(r.id);
      toast('Added.', { list: 'records', id: r.id, added: true });
    });
  });


  // ---------- the detail view ----------

  function closeDetail() { state.openId = null; state.openTaskId = null; state.openWatchId = null; state.openFeedId = null; if (dialog.open) dialog.close(); }
  dialog.addEventListener('close', function () {
    var was = state.openId, wasTask = state.openTaskId, wasWatch = state.openWatchId, wasFeed = state.openFeedId;
    state.openId = null; state.openTaskId = null; state.openWatchId = null; state.openFeedId = null;
    if ($('toast').parentNode === dialog) document.body.appendChild($('toast'));
    draw();
    // Back on the row that was opened, so the keyboard picks up where it left off
    var after = state.afterClose; state.afterClose = null;
    var back = (after && document.querySelector(after)) || (was != null && document.querySelector('[data-id="' + was + '"]')) || (wasTask != null && document.querySelector('[data-task="' + wasTask + '"]')) ||
      (wasWatch != null && document.querySelector('[data-watch="' + wasWatch + '"]')) || (wasFeed != null && document.querySelector('[data-feed-edit="' + wasFeed + '"]'));
    if (back) back.focus();
  });
  // After Undo: the same view again, with focus where the person was (or on Close)
  function reopen(focusSel) {
    if (state.openTaskId) openTask(state.openTaskId, focusSel || '.close');
    else if (state.openWatchId) openWatch(state.openWatchId, focusSel || '.close');
    else if (state.openFeedId) openFeed(state.openFeedId, focusSel || '.close');
    else if (state.openId) { openDetail(state.openId); var f = dialog.querySelector(focusSel || '.close'); if (f) f.focus(); }
  }
  dialog.addEventListener('click', function (e) { if (e.target === dialog) closeDetail(); });

  function save(list, id, changes, done, failed) {
    store.update(list, id, changes).then(function (res) {
      render();
      toast('Saved.', { list: list, before: res.before });
      if (done) done(res.item);
    }).catch(function (err) { showProblem(err); if (failed) failed(); });
  }

  function showProblem(err) {
    var msg = dialog.querySelector('.problem');
    if (msg) { msg.textContent = err.message; msg.hidden = false; }
  }

  // A value as a viewer reads it; empty ones are left out so the record reads short
  function readOnlyField(col, key, value, name, wide) {
    if (value === '' || value === undefined || value === null) return null;
    var linked = col.type === 'lookup' ? store.get(col.list || 'records', Number(value)) : null;
    var text = col.type === 'currency' ? money(value) : col.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? niceDate(value)
      : col.type === 'yesno' ? (derive.isYes(value) ? 'Yes' : 'No') : key === 'status' ? statusName(value)
      : col.type === 'month' ? (W.MONTHS[Number(value) - 1] || String(value))
      : col.type === 'lookup' ? (linked ? linked.name || linked.title || '' : '') : String(value);
    if (text === '') return null;
    return el('div', { class: 'field readonly' + (wide ? ' wide' : '') }, [el('span', { class: 'fieldLabel', text: name }), el('p', { class: 'value', id: 'f-' + key, text: text })]);
  }

  function field(r, key, opts) {
    opts = opts || {};
    var list = opts.list || 'records';
    var col = schema.column(list, key) || { key: key, type: opts.type || 'text' };
    var name = opts.label || (list === 'records' ? label(key) : col.label);
    var id = 'f-' + key;
    var value = r[key] === undefined || r[key] === null ? '' : r[key];
    var input;
    if (!isEditor()) return readOnlyField(col, key, value, name, opts.wide);

    if (col.type === 'yesno') {
      input = el('select', { id: id }, [el('option', { value: '', text: '' }), el('option', { value: 'Yes', text: 'Yes' }), el('option', { value: 'No', text: 'No' })]);
      var fits = value === '' || typeof value === 'boolean' || /^(yes|no|true|false)$/i.test(String(value));
      if (!fits) input.appendChild(el('option', { value: '__as-is', text: String(value) })); // kept as it is until changed
      input.value = value === '' ? '' : !fits ? '__as-is' : derive.isYes(value) ? 'Yes' : 'No';
    } else if (col.type === 'month') {
      input = el('select', { id: id }, [el('option', { value: '', text: '' })]);
      W.MONTHS.forEach(function (m, i) { input.appendChild(el('option', { value: String(i + 1), text: m })); });
      input.value = W.MONTHS[Number(value) - 1] ? String(Number(value)) : '';
    } else if (col.type === 'lookup') {
      input = el('select', { id: id }, [el('option', { value: '', text: '' })]);
      store.items(col.list || 'records').filter(function (x) { return x.status !== 'Archived' || x.id === Number(value); }).sort(byName).forEach(function (x) {
        input.appendChild(el('option', { value: String(x.id), text: x.name }));
      });
      input.value = value === '' ? '' : String(value);
    } else if (col.type === 'note') {
      input = el('textarea', { id: id, rows: key === 'links' ? 3 : 2 });
      input.value = value;
    } else if (col.type === 'choice' || opts.choices) {
      var choices = opts.choices || (col.choicesFrom ? settingList(col.choicesFrom) : col.choices) || [];
      if (key === 'grantType') choices = settingList('grantTypes').length ? settingList('grantTypes') : choices;
      input = el('select', { id: id });
      if (!col.fallback) input.appendChild(el('option', { value: '', text: '' }));
      choices.forEach(function (c) { input.appendChild(el('option', { value: c, text: opts.optionText ? opts.optionText(c) : c })); });
      if (value && choices.indexOf(value) === -1) input.appendChild(el('option', { value: value, text: value }));
      input.value = value;
    } else {
      var type = { date: 'date', email: 'email', url: 'url', phone: 'tel', number: 'number' }[col.type] || 'text';
      if (type === 'date' && value && !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) type = 'text'; // an older value that is not a date
      input = el('input', { id: id, type: type, autocomplete: 'off' });
      if (col.type === 'currency') input.setAttribute('inputmode', 'decimal');
      if (col.type === 'person') input.setAttribute('list', 'peopleList');
      input.value = col.type === 'currency' ? shownValue(value) : value;
    }

    input.addEventListener('change', function () {
      var v = input.value;
      if (col.type === 'yesno') { if (v === '__as-is') return; v = v === '' ? '' : v === 'Yes'; }
      if (col.type === 'lookup') v = v === '' ? '' : Number(v);
      if (col.type === 'currency' || col.type === 'number') {
        var cleaned = v.replace(/[$,\s]/g, '');
        if (cleaned !== '' && !/^\d+(\.\d+)?$/.test(cleaned)) {
          showProblem(new Error(name + ' takes a number, like 45000.'));
          input.value = shownValue(r[key]);
          return;
        }
        v = cleaned === '' ? '' : Number(cleaned);
      }
      if (typeof v === 'string') v = v.replace(/\s+$/, '');
      if ((r[key] === undefined ? '' : r[key]) === v) return;
      var changes = {}; changes[key] = v;
      if (key === 'status') {
        if (v === 'Archived') changes.previousStatus = r.status;
        else changes.archiveReason = '';
      }
      save(list, r.id, changes, function (item) {
        Object.keys(r).forEach(function (k) { delete r[k]; });
        Object.assign(r, item);
        if (list === 'tasks') { if (dialog.open && state.openTaskId === r.id) refreshTask(r, key); return; }
        if (list === 'watch') { if (dialog.open && state.openWatchId === r.id) refreshWatch(r, key); return; }
        if (list === 'feeds') { if (dialog.open && state.openFeedId === r.id) { if (key === 'type') openFeed(r.id, '#f-type'); else dialog.querySelector('#detailName').textContent = r.name || 'Feed'; } return; }
        if (!dialog.open || state.openId !== r.id) return;
        if (key === 'status') openDetail(r.id, 'status'); // the Archive reason field comes and goes
        else { refreshHead(r); if (col.type === 'currency') input.value = shownValue(r[key]); }
      }, function () { input.value = shownValue(r[key]); });
    });
    if (input.tagName === 'INPUT') input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });

    return el('div', { class: 'field' + (opts.wide ? ' wide' : '') }, [el('label', { for: id, text: name }), input]);
  }

  // After a save, update the heading, the status notes and the links without rebuilding the
  // fields, so whatever the person is typing next is left alone.
  function refreshHead(r) {
    var today = new Date();
    var nameEl = dialog.querySelector('#detailName');
    if (nameEl) nameEl.textContent = r.name;
    var st = dialog.querySelector('.detailStatus');
    if (st) { st.innerHTML = ''; [chip(derive.shown(r, today))].concat(derive.tags(r, today, dueDays()).map(tagEl)).forEach(function (n) { st.appendChild(n); }); }
    var old = dialog.querySelector('.links');
    var fresh = linksView(r);
    if (old && fresh) old.replaceWith(fresh);
    else if (old) old.remove();
    else if (fresh) { var host = dialog.querySelector('#f-folderLink'); if (host) host.closest('.fields').appendChild(fresh); }
    var problem = dialog.querySelector('.problem');
    if (problem) problem.hidden = true;
  }

  function linksView(r) {
    var urls = String(r.links || '').split(/\s*\n\s*/).concat([r.folderLink]).map(safeUrl).filter(Boolean);
    if (!urls.length) return null;
    var ul = el('ul', { class: 'links' });
    urls.forEach(function (u) { ul.appendChild(el('li', {}, [el('a', { href: u, target: '_blank', rel: 'noopener noreferrer', text: u.replace(/^https?:\/\//, '') })])); });
    return ul;
  }

  function openDetail(id, focusKey) {
    var r = store.get('records', id);
    if (!r) { closeDetail(); return; }
    refreshLabels();
    state.openId = id; state.openTaskId = null; state.openWatchId = null; state.openFeedId = null;
    var editor = isEditor();
    var today = new Date();
    var shownStatus = derive.shown(r, today);
    var archived = r.status === 'Archived';

    var statusField = field(r, 'status', {
      wide: true,
      optionText: function (s) { var n = statusNote(s); return statusName(s) + (n ? ' (' + n + ')' : ''); }
    });

    var tasks = store.items('tasks').filter(function (t) { return t.record === id; });
    var years = store.items('awardYears').filter(function (y) { return y.record === id; }).sort(function (a, b) { return a.year - b.year; });
    var custom = customCols();

    var body = el('div', { class: 'detailBody' }, [
      el('header', { class: 'detailHead' }, [
        el('div', {}, [
          el('h2', { id: 'detailName', text: r.name }),
          el('p', { class: 'detailStatus' }, [chip(shownStatus)].concat(derive.tags(r, today, dueDays()).map(tagEl)))
        ]),
        el('button', { type: 'button', class: 'link close', onclick: closeDetail, 'aria-label': 'Close' }, ['Close'])
      ]),
      el('p', { class: 'problem', hidden: true }),
      el('div', { class: 'fields' }, [
        field(r, 'name', { wide: true }),
        statusField,
        archived ? field(r, 'archiveReason') : null,
        field(r, 'funder'),
        field(r, 'owner'),
        field(r, 'recordType'),
        field(r, 'program'),
        field(r, 'grantType'),
        field(r, 'awardAmount'),
        field(r, 'deadline'),
        field(r, 'startDate'),
        field(r, 'endDate'),
        field(r, 'next', { wide: true })
      ]),
      section('contact', [field(r, 'contactName'), field(r, 'contactEmail'), field(r, 'contactPhone')], !!(r.contactName || r.contactEmail || r.contactPhone)),
      section('notes', [field(r, 'comments', { wide: true }), field(r, 'links', { wide: true }), field(r, 'folderLink', { wide: true }), linksView(r)], !!(r.comments || r.links || r.folderLink)),
      tasks.length || editor ? section('tasks', [taskList(tasks), editor ? addTaskForm(r) : null], true) : null,
      years.length ? section('awardYears', [yearList(years)], true) : null,
      section('more', [field(r, 'watchDate'), field(r, 'watchNote', { wide: true })].concat(custom.map(function (c) {
        return field(r, c.key, { label: c.label, type: c.type, choices: c.type === 'choice' ? c.choices : null, wide: c.type === 'note' });
      })), !!(r.watchDate || r.watchNote || custom.some(function (c) { return r[c.key] !== undefined && r[c.key] !== ''; }))),
      editor ? el('div', { class: 'detailActions' }, [
        r.watchDate ? null : el('button', { type: 'button', class: 'quietBtn', id: 'addToWatch', onclick: function () {
          openSections.more = true; openDetail(r.id, 'watchDate');
        } }, ['Add to ' + tileName('watch')]),
        archived
          ? el('button', { type: 'button', class: 'primary', onclick: function () { restoreRecord(r); } }, ['Restore'])
          : el('button', { type: 'button', class: 'quietBtn', onclick: function () { archiveRecord(r); } }, ['Archive'])
      ]) : null
    ]);
    mount(body, focusKey && '#f-' + focusKey);
  }

  function mount(body, focusSel) {
    var keepToast = $('toast');
    dialog.innerHTML = '';
    dialog.appendChild(body);
    dialog.appendChild(keepToast);
    dialog.appendChild(peopleDatalist());
    if (!dialog.open) dialog.showModal();
    var f = focusSel && dialog.querySelector(focusSel);
    if (f) f.focus();
  }

  // ---------- a task: its steps, comments and (for editors) its details ----------

  function taskStatus(t) {
    var today = derive.iso(new Date()), soon = derive.iso(derive.addDays(new Date(), dueDays()));
    var out = [];
    if (t.done) out.push(el('span', { class: 'chip s-Active' }, [icon('check'), 'Done']));
    else if (t.dueDate && t.dueDate < today) out.push(tagEl({ text: 'Past due date', tone: 'attention' }));
    else if (t.dueDate && t.dueDate <= soon) out.push(tagEl({ text: 'Due soon', tone: 'attention' }));
    var meta = [t.type, t.dueDate ? 'Due ' + niceDate(t.dueDate) : '', t.assignedTo].filter(Boolean).join(' · ');
    if (meta) out.push(el('span', { class: 'quiet', text: meta }));
    return out;
  }

  function openTask(id, focusSel) {
    var t = store.get('tasks', id);
    if (!t) { closeDetail(); return; }
    refreshLabels();
    state.openTaskId = id; state.openId = null; state.openWatchId = null; state.openFeedId = null;
    var rec = t.record ? store.get('records', t.record) : null;
    var editor = isEditor();
    var body = el('div', { class: 'detailBody', 'data-task-view': id }, [
      el('header', { class: 'detailHead' }, [
        el('div', {}, [el('h2', { id: 'detailName', text: t.title || 'Task' }), el('p', { class: 'detailStatus', id: 'taskStatus' }, taskStatus(t))]),
        el('button', { type: 'button', class: 'link close', onclick: closeDetail, 'aria-label': 'Close' }, ['Close'])
      ]),
      el('p', { class: 'problem', hidden: true }),
      rec ? el('p', { class: 'taskRecord' }, [el('button', { type: 'button', class: 'link', id: 'taskRecord', text: '← ' + rec.name, onclick: function () { openDetail(rec.id); } })]) : null,
      stepsBlock(t),
      commentsBlock(t),
      editor ? section('taskDetails', [field(t, 'title', { list: 'tasks', wide: true }), field(t, 'type', { list: 'tasks' }), field(t, 'dueDate', { list: 'tasks' }),
        field(t, 'assignedTo', { list: 'tasks' }), field(t, 'steps', { list: 'tasks', wide: true })], !!focusSel) : null,
      editor ? el('div', { class: 'detailActions' }, [
        el('button', { type: 'button', id: 'taskDone', class: t.done ? 'quietBtn' : 'primary', onclick: function () { setTaskDone(t, !t.done); } }, [t.done ? 'Not done yet' : 'Mark done'])
      ]) : null
    ]);
    mount(body, focusSel);
  }

  // After a task field saves: the heading, and the steps when they changed, without touching the fields
  function refreshTask(t, key) {
    var h = dialog.querySelector('#detailName'); if (h) h.textContent = t.title || 'Task';
    var st = dialog.querySelector('#taskStatus'); if (st) { st.innerHTML = ''; taskStatus(t).forEach(function (n) { st.appendChild(n); }); }
    if (key === 'steps' || key === 'assignedTo') { var old = dialog.querySelector('#taskSteps'); var fresh = stepsBlock(t); if (old && fresh) old.replaceWith(fresh); else if (old) old.remove(); else if (fresh) dialog.querySelector('.taskRecord, .problem').after(fresh); }
  }

  function stepsBlock(t) {
    var state_ = A.stepState(t, store.items('progress'));
    if (!state_.steps.length) return null;
    var canLog = A.can(state.who, 'log', t);
    var ul = el('ul', { class: 'steps' + (canLog ? '' : ' readOnly') });
    state_.steps.forEach(function (step, i) {
      var who = step.done ? el('span', { class: 'quiet who', text: [step.by, niceDate(step.date)].filter(Boolean).join(' · ') }) : null;
      if (!canLog) { // nothing to press: a plain list, with a check beside what is done
        ul.appendChild(el('li', { class: step.done ? 'done' : '' }, [el('span', { class: 'mark' }, [step.done ? icon('check') : null]), el('span', { text: step.text }), who]));
        return;
      }
      var box = el('input', { type: 'checkbox', id: 'step-' + i });
      box.checked = step.done;
      box.addEventListener('change', function () { logStep(t, step.text, box.checked, '#step-' + i); });
      ul.appendChild(el('li', {}, [el('label', { for: 'step-' + i }, [box, ' ' + step.text]), who]));
    });
    return el('section', { class: 'taskPart', id: 'taskSteps' }, [
      el('h3', { text: 'Steps' }),
      state_.done ? el('p', { class: 'quiet', text: state_.done === 1 ? '1 step done' : state_.done + ' steps done' }) : null,
      ul
    ]);
  }

  function logStep(t, step, done, focusSel) {
    store.add('progress', { task: t.id, step: step, done: done, comment: '', date: derive.iso(new Date()) }).then(function (item) {
      render();
      openTask(t.id, focusSel);
      toast(done ? 'Step checked.' : 'Step unchecked.', { list: 'progress', id: item.id, added: true, focus: focusSel });
    }).catch(function (e) { openTask(t.id, focusSel); showProblem(e); });
  }

  function commentsBlock(t) {
    var canLog = A.can(state.who, 'log', t);
    var comments = A.stepState(t, store.items('progress')).comments;
    if (!comments.length && !canLog) return null;
    var ul = el('ul', { class: 'comments' });
    comments.forEach(function (c) {
      ul.appendChild(el('li', {}, [el('span', { class: 'quiet who', text: [c.person, niceDate(c.date)].filter(Boolean).join(' · ') }), el('p', { text: c.comment })]));
    });
    var form = null;
    if (canLog) {
      var text = el('textarea', { id: 'commentText', rows: 2 });
      form = el('form', { class: 'commentForm' }, [el('label', { for: 'commentText', class: 'sr', text: 'Comment' }), text,
        el('button', { type: 'submit', class: 'quietBtn', id: 'addComment' }, ['Add comment'])]);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var c = text.value.trim();
        if (!c) { text.focus(); return; }
        store.add('progress', { task: t.id, step: '', done: false, comment: c, date: derive.iso(new Date()) }).then(function (item) {
          render(); openTask(t.id, '#commentText');
          toast('Comment added.', { list: 'progress', id: item.id, added: true, focus: '#commentText' });
        }).catch(showProblem);
      });
    }
    return el('section', { class: 'taskPart', id: 'taskComments' }, [el('h3', { text: 'Comments' }), comments.length ? ul : null, form]);
  }

  function setTaskDone(t, done) {
    store.update('tasks', t.id, { done: done }).then(function (res) {
      render(); openTask(t.id, '#taskDone');
      toast(done ? 'Done: ' + (t.title || 'task') + '.' : 'Back on the list.', { list: 'tasks', before: res.before });
    }).catch(showProblem);
  }

  function addTaskForm(r) {
    var input = el('input', { id: 'newTaskTitle', autocomplete: 'off' });
    var form = el('form', { class: 'customAdd wide' }, [
      el('div', { class: 'field' }, [el('label', { for: 'newTaskTitle', text: 'New task' }), input]),
      el('button', { type: 'submit', class: 'quietBtn', id: 'addTask' }, ['Add task'])
    ]);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var title = input.value.trim();
      if (!title) { input.focus(); return; }
      store.add('tasks', { record: r.id, title: title, assignedTo: me(), done: false }).then(function (t) {
        render(); openTask(t.id, '#f-dueDate');
        toast('Task added.', { list: 'tasks', id: t.id, added: true });
      }).catch(showProblem);
    });
    return form;
  }

  var openSections = {};
  function section(key, kids, open) {
    kids = kids.filter(Boolean);
    if (!kids.length) return null; // a viewer sees only the parts that hold something
    var isOpen = key in openSections ? openSections[key] : open;
    var d = el('details', { class: 'more', 'data-section': key, open: isOpen }, [el('summary', { text: sectionName(key) }), el('div', { class: 'fields' }, kids)]);
    d.addEventListener('toggle', function () { openSections[key] = d.open; });
    return d;
  }

  function taskList(tasks) {
    var ul = el('ul', { class: 'plainList' });
    tasks.forEach(function (t) {
      var n = A.stepState(t, store.items('progress'));
      ul.appendChild(el('li', {}, [
        el('button', { type: 'button', class: 'link', 'data-task': t.id, text: (t.done ? '✓ ' : '') + (t.title || 'Task'), onclick: function () { openTask(t.id); } }),
        el('span', { class: 'quiet', text: [t.type, niceDate(t.dueDate), t.assignedTo, n.done ? (n.done === 1 ? '1 step done' : n.done + ' steps done') : ''].filter(Boolean).join(' · ') })
      ]));
    });
    return ul;
  }

  function yearList(years) {
    var ul = el('ul', { class: 'plainList' });
    years.forEach(function (y) { ul.appendChild(el('li', {}, [el('span', { text: String(y.year) }), el('span', { text: money(y.amount) })])); });
    return ul;
  }

  function peopleDatalist() {
    var dl = el('datalist', { id: 'peopleList' });
    store.items('people').forEach(function (p) { dl.appendChild(el('option', { value: p.person })); });
    return dl;
  }

  function archiveRecord(r) {
    store.update('records', r.id, { status: 'Archived', previousStatus: r.status, archiveReason: r.archiveReason || '' }).then(function (res) {
      render(); openDetail(r.id, 'archiveReason');
      toast(statusName('Archived') + '.', { list: 'records', before: res.before });
    }).catch(showProblem);
  }

  function restoreRecord(r) {
    var back = r.previousStatus && r.previousStatus !== 'Archived' ? r.previousStatus : 'Potentials';
    store.update('records', r.id, { status: back, archiveReason: '', previousStatus: '' }).then(function (res) {
      render(); openDetail(r.id);
      toast('Restored to ' + statusName(back) + '.', { list: 'records', before: res.before });
    }).catch(showProblem);
  }

  // ---------- Labels and fields: rename anything, add fields, reset the layout ----------

  function setSetting(key, value, note) {
    var row = store.items('settings').filter(function (x) { return x.key === key; })[0];
    var p = row
      ? store.update('settings', row.id, { value: value }).then(function (res) { return { list: 'settings', before: res.before }; })
      : store.add('settings', { key: key, value: value }).then(function (item) { return { list: 'settings', id: item.id, added: true }; });
    return p.then(function (undo) {
      if (key === 'customColumns') { state.filters = liveFilters(); keepFilters(); } // drop filters on fields that are gone
      afterSave(); toast(note || 'Saved.', undo);
    });
  }

  // A save fires as focus leaves a box. On the Labels page, wait until focus has landed on
  // whatever the person moved to, so the rebuild can put it back there and nothing typed is lost.
  function afterSave() {
    if (state.view !== 'setup') { render(); return; }
    setTimeout(function () {
      var want = state.focusNext; state.focusNext = null;
      render();
      var f = want && $(want);
      if (f) f.focus();
    }, 0);
  }

  function setLabel(key, fallback, text) {
    text = String(text || '').trim();
    var row = store.items('labels').filter(function (x) { return x.key === key; })[0];
    if ((row ? row.customText || '' : '') === text) return;
    var p = row
      ? store.update('labels', row.id, { customText: text }).then(function (res) { return { list: 'labels', before: res.before }; })
      : store.add('labels', { key: key, defaultText: fallback, customText: text }).then(function (item) { return { list: 'labels', id: item.id, added: true }; });
    p.then(function (undo) { afterSave(); toast(text ? 'Renamed.' : 'Back to "' + fallback + '".', undo); });
  }

  function labelInput(item, lab) {
    var id = 'lbl-' + item.key;
    var inp = el('input', { id: id, autocomplete: 'off', placeholder: item.text, 'data-label': item.key });
    inp.value = T(item.key, '') === item.text ? '' : T(item.key, '');
    inp.addEventListener('change', function () { setLabel(item.key, item.text, inp.value); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
    return el('div', { class: 'field' }, [el('label', { for: id, text: lab || item.text }), inp]);
  }

  var setupOpen = { tiles: true };
  function setupSection(key, title, kids) {
    var d = el('details', { class: 'more', 'data-setup': key, open: !!setupOpen[key] }, [el('summary', { text: title }), el('div', { class: 'fields' }, kids)]);
    d.addEventListener('toggle', function () { setupOpen[key] = d.open; });
    return d;
  }

  function renderSetup() {
    listEl.appendChild(el('div', { class: 'listHead' }, [
      el('button', { type: 'button', class: 'link', text: '← Home', onclick: function () { showHome(); } }),
      el('h2', { text: 'Labels and fields' })
    ]));
    var box = el('div', { class: 'list setup' });
    S.labelGroups().forEach(function (g) {
      var kids = [];
      g.items.forEach(function (item) {
        if (!item.note) { kids.push(labelInput(item)); return; }
        var st = item.key.slice('status.'.length);
        var show = el('input', { type: 'checkbox', id: 'showNote-' + st });
        show.checked = !noteHidden(st);
        show.addEventListener('change', function () {
          var hidden = settingList('hiddenStatusNotes').filter(function (x) { return x !== st; });
          if (!show.checked) hidden.push(st);
          setSetting('hiddenStatusNotes', hidden.join('; '), show.checked ? 'Explanation shown.' : 'Explanation hidden.');
        });
        kids.push(el('div', { class: 'pair wide' }, [labelInput(item), labelInput(item.note, item.text + ' explanation'),
          el('label', { class: 'toggle' }, [show, 'Show'])]));
      });
      box.appendChild(setupSection(g.key, g.text, kids));
    });
    box.appendChild(setupSection('custom', 'Your own fields', customEditor()));
    box.appendChild(setupSection('layout', 'Layout', [
      el('button', { type: 'button', class: 'quietBtn', id: 'resetLayout', onclick: function () { setLayout(null, 'Layout back to the start.'); } }, ['Reset layout'])
    ]));
    listEl.appendChild(box);
  }

  // Your own fields: each shows under More details on every record; choice, date and
  // yes-or-no fields also get a filter. Taking one off the page keeps what records hold.
  function customEditor() {
    var cols = customCols();
    var save = function (next, note) { setSetting('customColumns', S.formatCustom(next), note); };
    var kids = cols.map(function (c, i) {
      var change = function (patch, note) { var next = cols.map(function (x) { return Object.assign({}, x); }); Object.assign(next[i], patch); save(next, note); };
      var nameIn = el('input', { id: 'cf-name-' + c.key, autocomplete: 'off', value: c.label });
      nameIn.addEventListener('change', function () { if (nameIn.value.trim()) change({ label: nameIn.value.trim() }, 'Renamed.'); else nameIn.value = c.label; });
      var typeSel = el('select', { id: 'cf-type-' + c.key });
      S.TYPES.forEach(function (t) { typeSel.appendChild(el('option', { value: t.key, text: t.text })); });
      typeSel.value = c.type;
      typeSel.addEventListener('change', function () { change({ type: typeSel.value }); });
      var parts = [
        el('div', { class: 'field' }, [el('label', { for: nameIn.id, text: 'Name' }), nameIn]),
        el('div', { class: 'field' }, [el('label', { for: typeSel.id, text: 'Kind' }), typeSel])
      ];
      if (c.type === 'choice') {
        var ch = el('input', { id: 'cf-choices-' + c.key, autocomplete: 'off', value: c.choices.join(', ') });
        ch.addEventListener('change', function () { change({ choices: ch.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean) }); });
        parts.push(el('div', { class: 'field wide' }, [el('label', { for: ch.id, text: 'Choices' }), ch]));
      }
      var foot = [];
      if (c.type === 'choice' || c.type === 'date' || c.type === 'yesno') {
        var fl = el('input', { type: 'checkbox', id: 'cf-filter-' + c.key });
        fl.checked = c.filter !== false;
        fl.addEventListener('change', function () { change({ filter: fl.checked }, fl.checked ? 'Filter on.' : 'Filter off.'); });
        foot.push(el('label', { class: 'toggle' }, [fl, 'Filter']));
      }
      foot.push(el('button', { type: 'button', class: 'link', text: 'Take off the page', 'aria-label': 'Take ' + c.label + ' off the page', onclick: function () {
        state.focusNext = cols[i + 1] ? 'cf-name-' + cols[i + 1].key : 'newFieldName';
        save(cols.filter(function (x, j) { return j !== i; }), c.label + ' off the page.');
      } }));
      parts.push(el('div', { class: 'customFoot wide' }, foot));
      return el('div', { class: 'customField wide', 'data-custom': c.key }, parts);
    });

    var newName = el('input', { id: 'newFieldName', autocomplete: 'off' });
    var newType = el('select', { id: 'newFieldType' });
    S.TYPES.forEach(function (t) { newType.appendChild(el('option', { value: t.key, text: t.text })); });
    var addForm = el('form', { class: 'customAdd wide' }, [
      el('div', { class: 'field' }, [el('label', { for: 'newFieldName', text: 'New field' }), newName]),
      el('div', { class: 'field' }, [el('label', { for: 'newFieldType', text: 'Kind' }), newType]),
      el('button', { type: 'submit', class: 'primary' }, ['Add field'])
    ]);
    addForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = newName.value.replace(/[|;]/g, ' ').trim();
      if (!name) { newName.focus(); return; }
      var taken = cols.map(function (x) { return x.key; });
      var col = { key: S.newKey(name, taken), label: name, type: newType.value, choices: [], filter: true };
      setupOpen.custom = true;
      state.focusNext = 'cf-name-' + col.key;
      // On SharePoint the field needs its own column on Records first
      (rawStore.ensureColumn ? rawStore.ensureColumn('records', col) : Promise.resolve()).then(function () {
        save(cols.concat([col]), name + ' added.');
      }).catch(function (err) { console.error(err); toast('That field could not be added: ' + err.message); });
    });
    kids.push(addForm);
    return kids;
  }

  $('setupBtn').addEventListener('click', function () {
    state.view = 'setup'; state.list = null;
    if (state.query) { state.query = ''; $('search').value = ''; }
    closeDetail(); render(); window.scrollTo(0, 0);
  });

  // ---------- start ----------

  $('reset').addEventListener('click', function () {
    toast('This puts the sample back as it began, and your changes to it go.', null, {
      label: 'Start over',
      run: function () { store.reset().then(function () { return auth.start(); }).then(function (who) { closeDetail(); signedIn(who); toast('The sample is back to its start.'); }); }
    });
  });

  // ---------- who is signed in ----------

  function signedIn(person) {
    if (!person) { showSignIn(); return; }
    var before = state.who && state.who.person;
    state.who = A.whoIs(rawStore.items('people'), person, { byEmailOnly: auth.mode === 'microsoft' });
    if (before && before !== state.who.person) { // a different person starts on a fresh home page
      state.view = 'home'; state.list = null; state.query = ''; $('search').value = ''; state.expanded = {}; state.archiveQuery = '';
    }
    state.myPrograms = !state.who.all; // viewers start on their own programs
    if (state.view === 'setup' && !isEditor()) state.view = 'home';
    loadLayout();
    closeDetail();
    render();
  }

  function renderWho() {
    var box = $('who');
    box.innerHTML = '';
    if (!state.who) return;
    var role = state.who.role + (state.who.listed ? '' : ', not on the People list yet');
    if (auth.mode === 'sample') {
      var sel = el('select', { id: 'whoSelect' });
      rawStore.items('people').forEach(function (p) { sel.appendChild(el('option', { value: p.person, text: p.person + ', ' + (p.role || 'Viewer') })); });
      sel.value = state.who.person;
      sel.addEventListener('change', function () { auth.signIn(sel.value).then(signedIn).then(function () { $('whoSelect').focus(); toast('Signed in as ' + sel.value + '.'); }); });
      box.appendChild(el('span', { class: 'mode', text: 'Sample data' }));
      box.appendChild(el('label', { for: 'whoSelect', class: 'sr', text: 'Signed in as' }));
      box.appendChild(sel);
    } else {
      box.appendChild(el('span', { class: 'mode', id: 'whoName', text: state.who.person + ', ' + role }));
      box.appendChild(el('button', { type: 'button', class: 'link', text: 'Sign out', onclick: function () { auth.signOut(); } }));
    }
  }

  function showSignIn(problem, notSetUp) {
    state.who = null;
    $('who').innerHTML = '';
    ['add', 'filtersBtn', 'setupBtn'].forEach(function (id) { $(id).hidden = true; });
    document.querySelector('.bar').hidden = true;
    listEl.innerHTML = '';
    listEl.appendChild(el('div', { class: 'list signIn' }, [
      el('h2', { text: 'Sign in' }),
      problem ? el('p', { class: 'problem', text: problem }) : null,
      notSetUp ? null : el('button', { type: 'button', class: 'primary', id: 'signIn', onclick: function () {
        auth.signIn().catch(function (e) { console.error(e); showSignIn('Sign-in did not finish.'); });
      } }, ['Sign in with Microsoft'])
    ]));
    document.body.setAttribute('data-loaded', 'yes');
  }

  // ---------- SharePoint: first-time setup, and fresh data when someone comes back to the page ----------

  function showSetupLists(person, missing) {
    state.who = null;
    $('who').innerHTML = '';
    ['add', 'filtersBtn', 'setupBtn'].forEach(function (id) { $(id).hidden = true; });
    document.querySelector('.bar').hidden = true;
    listEl.innerHTML = '';
    var problem = el('p', { class: 'problem', hidden: true });
    var go = el('button', { type: 'button', class: 'primary', id: 'setupLists' }, ['Set up the lists']);
    go.addEventListener('click', function () {
      go.disabled = true; go.textContent = 'Setting up';
      problem.hidden = true;
      rawStore.setup(person).then(function () { return rawStore.load(); }).then(function () {
        document.querySelector('.bar').hidden = false; $('filtersBtn').hidden = false;
        signedIn(person);
        toast('The lists are ready.');
      }).catch(function (e) {
        console.error(e);
        go.disabled = false; go.textContent = 'Set up the lists';
        // Someone who may only read the site cannot make lists; an editor opens the page first
        problem.textContent = e.status === 403 ? 'Your SharePoint permissions do not let you make lists. Ask an editor to open the page first.' : e.message;
        problem.hidden = false;
      });
    });
    listEl.appendChild(el('div', { class: 'list signIn' }, [
      el('h2', { text: 'Set up the lists' }),
      el('p', { text: 'The SharePoint site has no ' + missing.map(function (k) { return schema.list(k).sp; }).join(', ') + ' list yet. This makes them, with NAMI\'s settings, the Funding Watch starting list, and you as the first editor.' }),
      problem, go
    ]));
    document.body.setAttribute('data-loaded', 'yes');
  }

  function loadProblem(e) {
    console.error(e);
    listEl.innerHTML = '';
    listEl.appendChild(el('div', { class: 'list signIn' }, [
      el('h2', { text: 'The records did not load' }),
      el('p', { class: 'problem', text: e.message }),
      el('button', { type: 'button', class: 'primary', id: 'tryAgain', onclick: function () { location.reload(); } }, ['Try again'])
    ]));
    document.body.setAttribute('data-loaded', 'yes');
  }

  // Coming back to the page after a while reads the lists again, so other people's changes show
  var STALE_MS = 2 * 60 * 1000;
  document.addEventListener('visibilitychange', function () {
    if (!onSharePoint || document.hidden || !state.who || dialog.open) return;
    if (store.loadedAt && Date.now() - store.loadedAt.getTime() < STALE_MS) return;
    rawStore.load().then(function () { render(); }).catch(function (e) { console.warn('Could not read the lists again:', e.message); });
  });

  function startFailed(e) {
    if (auth.mode === 'microsoft') {
      console.error(e);
      if (e && e.notSetUp) showSignIn('Microsoft sign-in is not set up yet.', true);
      else showSignIn('Sign-in did not finish.');
      return;
    }
    loadProblem(e);
  }

  if (onSharePoint) {
    // Sign in first: SharePoint is read as the signed-in person
    auth.start().then(function (person) {
      if (!person) { showSignIn(); return; }
      return rawStore.load().then(function () {
        signedIn(person);
        document.body.setAttribute('data-loaded', 'yes');
      }, function (e) {
        if (e && e.needsSetup) showSetupLists(person, e.missing);
        else loadProblem(e);
      });
    }, startFailed);
  } else {
    store.load().then(function () { return auth.start(); }).then(function (person) {
      if (!person) { showSignIn(); return; }
      signedIn(person);
      document.body.setAttribute('data-loaded', 'yes');
    }).catch(startFailed);
  }

  // For the browser tests
  window.NAMI.app = { store: store, rawStore: rawStore, render: render, openDetail: openDetail, openTask: openTask, openWatch: openWatch, state: state, auth: auth };
})();
