/*
  NAMI Grants Dashboard v2: the page.

  Phase 3 home: Needs attention, To-do (with My to-do), Pipeline, Awards (Award year or
  Spread, this year beside last year, and the awards sheet), County contracts and Archive,
  all narrowed by the filters. "Show all" and Search open a full list.
  Phase 2 records: add with just a name; a detail view where every field saves as you leave
  it; status in any direction; Archive and Restore; Undo after every change.
*/
(function () {
  'use strict';

  var N = window.NAMI;
  var schema = N.schema, derive = N.derive;
  var store = N.data.createSampleStore({ storage: window.localStorage });
  var ME = 'Morgan Reyes (sample)'; // who is "me" in Sample mode; sign-in replaces this in Phase 5

  var ORDER = ['Potentials', 'Upcoming', 'Applied', 'Active', 'Awarded'];
  var state = { view: 'home', list: null, query: '', archiveQuery: '', myTodo: false, awardView: '', expanded: {}, openId: null, undo: null, toastAction: null };
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

  function label(colKey) { var c = schema.column('records', colKey); return c ? c.label : colKey; }

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
    check: 'M3.5 8.5 6.5 11.5 12.5 4.5'
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
    return el('span', { class: 'chip s-' + status }, [icon(status), status]);
  }

  function tagEl(t) { return el('span', { class: 'tag t-' + t.tone }, [icon(t.tone), t.text]); }

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
    var list = u.list || 'records';
    var p = u.added ? store.remove(list, u.id) : store.restore(list, u.before);
    p.then(function () {
      if (u.added && list === 'records' && state.openId === u.id) closeDetail();
      render(); if (state.openId) openDetail(state.openId);
      toast('Put back.');
    });
  });

  // ---------- filters ----------

  var FILTER_KEY = 'nami-grants-v2-filters';
  var FILTERS = [
    { key: 'year', label: 'Year' },
    { key: 'status', label: 'Status' },
    { key: 'program', label: 'Program' },
    { key: 'funder', label: 'Funder' },
    { key: 'grantType', label: 'Grant type' },
    { key: 'owner', label: 'Owner' },
    { key: 'recordType', label: 'Record type' }
  ];
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
    if (key === 'program') return settingList('programs');
    if (key === 'grantType') return settingList('grantTypes');
    if (key === 'recordType') return schema.column('records', 'recordType').choices;
    return distinct(key);
  }

  function buildFilterPanel() {
    var panel = $('filterPanel');
    panel.innerHTML = '';
    FILTERS.forEach(function (f) {
      var id = 'flt-' + f.key;
      var sel = el('select', { id: id, 'data-filter': f.key }, [el('option', { value: '', text: 'Any' })]);
      var choices = filterChoices(f.key);
      if (state.filters[f.key] && choices.indexOf(state.filters[f.key]) === -1) choices = choices.concat([state.filters[f.key]]);
      choices.forEach(function (c) { sel.appendChild(el('option', { value: c, text: c })); });
      sel.value = state.filters[f.key] || '';
      sel.addEventListener('change', function () { setFilter(f.key, sel.value); });
      panel.appendChild(el('div', { class: 'field' }, [el('label', { for: id, text: f.label }), sel]));
    });
    [['from', 'From'], ['to', 'To'], ['applyFrom', label('deadline') + ' from'], ['applyTo', label('deadline') + ' to']].forEach(function (p) {
      var id = 'flt-' + p[0];
      var inp = el('input', { id: id, type: 'date', 'data-filter': p[0] });
      inp.value = state.filters[p[0]] || '';
      inp.addEventListener('change', function () { setFilter(p[0], inp.value); });
      panel.appendChild(el('div', { class: 'field' }, [el('label', { for: id, text: p[1] }), inp]));
    });
  }

  function setFilter(key, value) {
    if (value) state.filters[key] = value; else delete state.filters[key];
    if (key === 'year' && value) { delete state.filters.from; delete state.filters.to; }
    if ((key === 'from' || key === 'to') && value) delete state.filters.year;
    keepFilters();
    keepFocus(function () { buildFilterPanel(); draw(); });
  }

  function filterLabel(key) {
    var f = FILTERS.filter(function (x) { return x.key === key; })[0];
    if (f) return f.label;
    return { from: 'From', to: 'To', applyFrom: label('deadline') + ' from', applyTo: label('deadline') + ' to' }[key] || key;
  }

  function renderFilterChips() {
    var box = $('filterChips');
    box.innerHTML = '';
    var keys = Object.keys(state.filters);
    $('filtersBtn').textContent = 'Filters';
    box.hidden = !keys.length;
    keys.forEach(function (k) {
      var v = state.filters[k];
      box.appendChild(el('button', { type: 'button', class: 'fchip', 'aria-label': 'Remove filter ' + filterLabel(k), onclick: function () {
        setFilter(k, '');
        toast(filterLabel(k) + ' filter off.', null, { label: 'Undo', run: function () { setFilter(k, v); } });
      } }, [
        filterLabel(k) + ': ' + (/^\d{4}-\d{2}-\d{2}$/.test(v) ? niceDate(v) : v), el('span', { class: 'x', 'aria-hidden': 'true', text: '×' })
      ]));
    });
    if (keys.length) box.appendChild(el('button', { type: 'button', class: 'link', text: 'Clear filters', onclick: function () {
      var was = state.filters;
      state.filters = {}; keepFilters(); buildFilterPanel(); render();
      toast('Filters cleared.', null, { label: 'Undo', run: function () { state.filters = was; keepFilters(); buildFilterPanel(); render(); } });
    } }));
  }

  $('filtersBtn').addEventListener('click', function () {
    var p = $('filterPanel');
    p.hidden = !p.hidden;
    $('filtersBtn').setAttribute('aria-expanded', String(!p.hidden));
    if (!p.hidden) buildFilterPanel();
  });

  function filtered(today, f) {
    f = f || state.filters;
    return store.items('records').filter(function (r) { return derive.passes(r, f, today) && matches(r, state.query); });
  }
  // Every filter but the time period: the Awards tile shows several years side by side
  function filteredAnyYear(today) {
    var f = {}; Object.keys(state.filters).forEach(function (k) { if (['year', 'from', 'to'].indexOf(k) === -1) f[k] = state.filters[k]; });
    return filtered(today, f);
  }

  // ---------- rows and lists ----------

  function matches(r, q) {
    if (!q) return true;
    var hay = [r.name, r.funder, r.program, r.owner, r.grantType, r.comments, r.next, r.contactName, r.archiveReason].join(' ').toLowerCase();
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
      listEl.appendChild(group(st, schema.STATUS_NOTES[st], these, today));
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

  function tile(key, title, kids, opts) {
    opts = opts || {};
    return el('section', { class: 'tile' + (opts.wide ? ' wide' : ''), 'data-tile': key, 'aria-labelledby': 'tile-' + key }, [
      el('header', { class: 'tileHead' }, [
        el('h2', { id: 'tile-' + key, text: title }),
        opts.head || null
      ]),
      el('div', { class: 'tileBody' }, kids),
      el('p', { class: 'stamp', text: 'Updated ' + clock(store.loadedAt || new Date()) })
    ]);
  }

  function dueDays() { return Number(setting('dueSoonDays')) || derive.DUE_SOON_DAYS; }

  function more(text, onclick) { return el('button', { type: 'button', class: 'link more', text: text, onclick: onclick }); }

  function taskRecordPasses(t, ids) { return !t.record || ids[t.record]; }

  function stepsDone(t) {
    var done = {};
    store.items('progress').forEach(function (p) { if (p.task === t.id && p.done) done[p.step] = true; });
    return Object.keys(done).length;
  }

  // Everything with a date that needs doing: tasks, apply-by dates, ended awards.
  function todoItems(today, recs, mineOnly) {
    var ids = {}; recs.forEach(function (r) { ids[r.id] = r; });
    var t = derive.iso(today), soon = derive.iso(derive.addDays(today, dueDays()));
    var items = [];
    store.items('tasks').forEach(function (task) {
      if (task.done || !taskRecordPasses(task, ids)) return;
      if (mineOnly && task.assignedTo !== ME) return;
      var rec = task.record ? store.get('records', task.record) : null;
      items.push({ kind: 'task', date: task.dueDate || '', title: task.title, task: task, record: rec,
        note: !task.dueDate ? '' : task.dueDate < t ? 'Past due date' : task.dueDate <= soon ? 'Due soon' : '' });
    });
    recs.forEach(function (r) {
      if (mineOnly && r.owner !== ME) return;
      if ((r.status === 'Upcoming' || r.status === 'Potentials') && r.deadline) {
        var note = r.deadline < t ? 'Apply-by date passed' : r.deadline <= soon ? 'Due soon' : '';
        // Potentials only come up once their apply-by date is near, so To-do stays short
        if (r.status === 'Upcoming' || note) items.push({ kind: 'apply', date: r.deadline, title: label('deadline') + ': ' + r.name, record: r, note: note });
      }
      if (r.status === 'Awarded' && r.endDate && r.endDate < t) {
        items.push({ kind: 'ended', date: r.endDate, title: r.name, record: r, note: 'Past end date' });
      }
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
    var open = function () { if (it.record) openDetail(it.record.id); };
    var main = el('button', { type: 'button', class: 'todoMain', 'data-id': it.record ? it.record.id : null, onclick: open, disabled: !it.record }, [
      el('span', { class: 'rowName', text: it.title }),
      el('span', { class: 'rowMeta', text: meta.join(' · ') }),
      it.note ? tagEl({ text: it.note, tone: 'attention' }) : null
    ]);
    var kids = [];
    if (it.kind === 'task') {
      kids.push(el('button', { type: 'button', class: 'check', 'aria-label': 'Mark done: ' + it.title, title: 'Mark done', onclick: function () { markDone(it.task); } }, [icon('check')]));
    }
    kids.push(main);
    return el('li', { class: 'todo' }, kids);
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

    // Needs attention: anything past its date or due within the due-soon window, across everything
    var attention = todoItems(today, recs, false).filter(function (it) { return it.note; });
    var attBody = attention.length ? el('ul', { class: 'todos' }) : el('p', { class: 'quiet empty', text: '·' });
    attention.slice(0, state.expanded.attention ? 99 : 6).forEach(function (it) { attBody.appendChild(todoRow(it)); });
    grid.appendChild(tile('attention', 'Needs attention', [attBody,
      attention.length > 6 && !state.expanded.attention ? more('Show all', function () { state.expanded.attention = true; render(); }) : null]));

    // To-do: what is coming up and not already in Needs attention; My to-do shows all of mine
    var todos = todoItems(today, recs, state.myTodo).filter(function (it) { return state.myTodo || !it.note; });
    var todoBody = todos.length ? el('ul', { class: 'todos' }) : el('p', { class: 'quiet empty', text: '·' });
    todos.slice(0, state.expanded.todo ? 99 : 6).forEach(function (it) { todoBody.appendChild(todoRow(it)); });
    var mine = el('label', { class: 'toggle' }, [el('input', { type: 'checkbox', id: 'myTodo' }), 'My to-do']);
    mine.firstChild.checked = !!state.myTodo;
    mine.firstChild.addEventListener('change', function (e) { state.myTodo = e.target.checked; keepChoices(); render(); });
    grid.appendChild(tile('todo', 'To-do', [todoBody,
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
        el('p', { class: 'note', text: '(' + schema.STATUS_NOTES[st] + ')' })
      ]);
      var ul = el('ul', { class: 'mini' });
      these.slice(0, 3).forEach(function (r) { ul.appendChild(el('li', {}, [el('button', { type: 'button', class: 'link', text: r.name, onclick: function () { openDetail(r.id); } })])); });
      if (these.length) col.appendChild(ul);
      if (these.length > 3) col.appendChild(more('Show all', function () { showList(st, function (r) { return derive.shown(r, today) === st && r.status !== 'Archived'; }, [st]); }));
      pipe.appendChild(col);
    });
    grid.appendChild(tile('pipeline', 'Pipeline', [pipe], { wide: true }));

    grid.appendChild(awardsTile(today, recs));

    // County contracts
    var cc = active.filter(function (r) { return r.recordType === 'County contract'; }).sort(attentionFirst(today));
    grid.appendChild(tile('contracts', 'County contracts', [
      cc.length ? rows(cc.slice(0, 4), today) : el('p', { class: 'quiet empty', text: '·' }),
      cc.length > 4 ? more('Show all', function () { showList('County contracts', function (r) { return r.recordType === 'County contract'; }, ORDER); }) : null
    ]));

    // Archive: its own search
    var aq = el('input', { type: 'search', id: 'archiveSearch', placeholder: 'Search the archive', autocomplete: 'off' });
    aq.value = state.archiveQuery || '';
    var arch = recs.filter(function (r) { return r.status === 'Archived' && matches(r, state.archiveQuery); }).sort(byName);
    var archList = el('div', { id: 'archiveList' });
    function fillArchive() {
      archList.innerHTML = '';
      var found = recs.filter(function (r) { return r.status === 'Archived' && matches(r, state.archiveQuery); }).sort(byName);
      archList.appendChild(found.length ? rows(found.slice(0, 5), today) : el('p', { class: 'quiet empty', text: '·' }));
      if (found.length > 5) archList.appendChild(more('Show all', function () { showList('Archive', function (r) { return r.status === 'Archived' && matches(r, state.archiveQuery); }, ['Archived']); }));
    }
    aq.addEventListener('input', function () { state.archiveQuery = aq.value.trim(); fillArchive(); });
    fillArchive();
    grid.appendChild(tile('archive', 'Archive', [el('label', {}, [el('span', { class: 'sr', text: 'Search the archive' }), aq]), archList]));

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
        el('thead', {}, [el('tr', {}, [el('th', { text: 'Name' }), el('th', { text: 'Program' }), el('th', { text: 'Type' }), el('th', { class: 'num', text: String(focus) })])])
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

    return tile('awards', 'Awards', [compare, bars,
      sheet,
      more(state.expanded.awards ? 'Hide the list' : 'Show the list', function () { state.expanded.awards = !state.expanded.awards; render(); })
    ], { head: toggle });
  }

  // ---------- render ----------

  // A rebuild must not throw a keyboard user back to the top: put focus back on the same control,
  // or, when that control is gone (a task just marked done), on the one now in its place.
  function keepFocus(fn) {
    var a = document.activeElement, key = null, tileKey = null, index = -1;
    if (a && a !== document.body && !dialog.contains(a)) {
      if (a.id) key = '#' + a.id;
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

  function render() { keepFocus(draw); }

  function draw() {
    var today = new Date();
    listEl.innerHTML = '';
    renderFilterChips();
    if (state.query) {
      state.view = 'list';
      state.list = { title: 'Search', test: function () { return true; } };
    }
    if (state.view === 'list' && state.list) renderList(today);
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
    store.add('records', { name: name, recordType: $('addType').value }, { me: ME }).then(function (r) {
      closeAdd(); render(); openDetail(r.id);
      toast('Added.', { list: 'records', id: r.id, added: true });
    });
  });


  // ---------- the detail view ----------

  function closeDetail() { state.openId = null; if (dialog.open) dialog.close(); }
  dialog.addEventListener('close', function () {
    var was = state.openId;
    state.openId = null;
    if ($('toast').parentNode === dialog) document.body.appendChild($('toast'));
    draw();
    // Back on the row that was opened, so the keyboard picks up where it left off
    var back = was != null && document.querySelector('[data-id="' + was + '"]');
    if (back) back.focus();
  });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) closeDetail(); });

  function save(id, changes, done, failed) {
    store.update('records', id, changes).then(function (res) {
      render();
      toast('Saved.', { list: 'records', before: res.before });
      if (done) done(res.item);
    }).catch(function (err) { showProblem(err); if (failed) failed(); });
  }

  function showProblem(err) {
    var msg = dialog.querySelector('.problem');
    if (msg) { msg.textContent = err.message; msg.hidden = false; }
  }

  function field(r, key, opts) {
    opts = opts || {};
    var col = schema.column('records', key) || { key: key, label: opts.label || key, type: opts.type || 'text' };
    var id = 'f-' + key;
    var value = r[key] === undefined || r[key] === null ? '' : r[key];
    var input;

    if (col.type === 'note') {
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
      input = el('input', { id: id, type: type, autocomplete: 'off' });
      if (col.type === 'currency') input.setAttribute('inputmode', 'decimal');
      if (col.type === 'person') input.setAttribute('list', 'peopleList');
      input.value = col.type === 'currency' ? shownValue(value) : value;
    }

    input.addEventListener('change', function () {
      var v = input.value;
      if (col.type === 'currency' || col.type === 'number') {
        var cleaned = v.replace(/[$,\s]/g, '');
        if (cleaned !== '' && !/^\d+(\.\d+)?$/.test(cleaned)) {
          showProblem(new Error(col.label + ' takes a number, like 45000.'));
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
      save(r.id, changes, function (item) {
        Object.keys(r).forEach(function (k) { delete r[k]; });
        Object.assign(r, item);
        if (!dialog.open || state.openId !== r.id) return;
        if (key === 'status') openDetail(r.id, 'status'); // the Archive reason field comes and goes
        else { refreshHead(r); if (col.type === 'currency') input.value = shownValue(r[key]); }
      }, function () { input.value = shownValue(r[key]); });
    });
    if (input.tagName === 'INPUT') input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });

    return el('div', { class: 'field' + (opts.wide ? ' wide' : '') }, [el('label', { for: id, text: col.label }), input]);
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
    state.openId = id;
    var today = new Date();
    var shownStatus = derive.shown(r, today);
    var archived = r.status === 'Archived';

    var statusField = field(r, 'status', {
      wide: true,
      optionText: function (s) { return s + ' (' + schema.STATUS_NOTES[s] + ')'; }
    });

    var tasks = store.items('tasks').filter(function (t) { return t.record === id; });
    var years = store.items('awardYears').filter(function (y) { return y.record === id; }).sort(function (a, b) { return a.year - b.year; });
    var custom = setting('customColumns').split(';').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
      var p = s.split('|'); return { key: p[0], label: p[1] || p[0], type: p[2] || 'text' };
    });

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
      section('Contact', [field(r, 'contactName'), field(r, 'contactEmail'), field(r, 'contactPhone')], !!(r.contactName || r.contactEmail || r.contactPhone)),
      section('Notes and links', [field(r, 'comments', { wide: true }), field(r, 'links', { wide: true }), field(r, 'folderLink', { wide: true }), linksView(r)], !!(r.comments || r.links || r.folderLink)),
      tasks.length ? section('Tasks', [taskList(tasks)], true) : null,
      years.length ? section('Award years', [yearList(years)], true) : null,
      section('More details', [field(r, 'watchDate'), field(r, 'watchNote', { wide: true })].concat(custom.map(function (c) { return field(r, c.key, { label: c.label, type: c.type }); })), !!(r.watchDate || r.watchNote || custom.some(function (c) { return r[c.key]; }))),
      el('div', { class: 'detailActions' }, [
        archived
          ? el('button', { type: 'button', class: 'primary', onclick: function () { restoreRecord(r); } }, ['Restore'])
          : el('button', { type: 'button', class: 'quietBtn', onclick: function () { archiveRecord(r); } }, ['Archive'])
      ])
    ]);

    var keepToast = $('toast');
    dialog.innerHTML = '';
    dialog.appendChild(body);
    dialog.appendChild(keepToast);
    dialog.appendChild(peopleDatalist());
    if (!dialog.open) dialog.showModal();
    var f = focusKey && dialog.querySelector('#f-' + focusKey);
    if (f) f.focus();
  }

  var openSections = {};
  function section(title, kids, open) {
    var isOpen = title in openSections ? openSections[title] : open;
    var d = el('details', { class: 'more', open: isOpen }, [el('summary', { text: title }), el('div', { class: 'fields' }, kids)]);
    d.addEventListener('toggle', function () { openSections[title] = d.open; });
    return d;
  }

  function taskList(tasks) {
    var ul = el('ul', { class: 'plainList' });
    tasks.forEach(function (t) {
      ul.appendChild(el('li', {}, [
        el('span', { text: (t.done ? '✓ ' : '') + t.title }),
        el('span', { class: 'quiet', text: [t.type, niceDate(t.dueDate), t.assignedTo].filter(Boolean).join(' · ') })
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
      toast('Archived.', { list: 'records', before: res.before });
    }).catch(showProblem);
  }

  function restoreRecord(r) {
    var back = r.previousStatus && r.previousStatus !== 'Archived' ? r.previousStatus : 'Potentials';
    store.update('records', r.id, { status: back, archiveReason: '', previousStatus: '' }).then(function (res) {
      render(); openDetail(r.id);
      toast('Restored to ' + back + '.', { list: 'records', before: res.before });
    }).catch(showProblem);
  }

  // ---------- start ----------

  $('reset').addEventListener('click', function () {
    toast('This puts the sample back as it began, and your changes to it go.', null, {
      label: 'Start over',
      run: function () { store.reset().then(function () { closeDetail(); render(); toast('The sample is back to its start.'); }); }
    });
  });

  store.load().then(function () {
    render();
    document.body.setAttribute('data-loaded', 'yes');
  }).catch(function (e) {
    listEl.innerHTML = '';
    listEl.appendChild(el('p', { class: 'quiet', text: 'The records could not load: ' + e.message }));
  });

  // For the browser tests
  window.NAMI.app = { store: store, render: render, openDetail: openDetail, state: state };
})();
