/*
  NAMI Grants Dashboard v2, Phase 2: records.

  Grants, County contracts and Archive; search; add with just a name; a detail view where
  every field saves as you leave it; a status dropdown in any direction; Archive and Restore;
  Undo after every change. The home tiles arrive in Phase 3.
*/
(function () {
  'use strict';

  var N = window.NAMI;
  var schema = N.schema, derive = N.derive;
  var store = N.data.createSampleStore({ storage: window.localStorage });
  var ME = 'Morgan Reyes (sample)'; // who is "me" in Sample mode; sign-in replaces this in Phase 5

  var ORDER = ['Upcoming', 'Potentials', 'Applied', 'Awarded', 'Active'];
  var state = { tab: 'Grant', query: '', openId: null, undo: null };

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
    plain: 'M3 8h10'
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
  function toast(text, undo) {
    state.undo = undo || null;
    $('toastText').textContent = text;
    $('toastUndo').hidden = !undo;
    // While a record is open the rest of the page is inert, so the note travels into the open view.
    var home = dialog.open ? dialog : document.body;
    if ($('toast').parentNode !== home) home.appendChild($('toast'));
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $('toast').hidden = true; state.undo = null; }, 8000);
  }

  $('toastUndo').addEventListener('click', function () {
    var u = state.undo; if (!u) return;
    state.undo = null; $('toast').hidden = true;
    var p = u.type === 'add' ? store.remove('records', u.id) : store.restore('records', u.before);
    p.then(function () {
      if (u.type === 'add' && state.openId === u.id) closeDetail();
      render(); if (state.openId) openDetail(state.openId);
      toast('Put back.');
    });
  });

  // ---------- the list ----------

  function matches(r, q) {
    if (!q) return true;
    var hay = [r.name, r.funder, r.program, r.owner, r.grantType, r.comments, r.next, r.contactName, r.archiveReason].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
  }

  function row(r, today) {
    var meta = [];
    if (r.funder) meta.push(r.funder);
    if (r.status === 'Archived' && r.archiveReason) meta.push(r.archiveReason);
    if (r.awardAmount) meta.push(money(r.awardAmount));
    if ((r.status === 'Potentials' || r.status === 'Upcoming') && r.deadline) meta.push(label('deadline') + ' ' + niceDate(r.deadline));
    else if (r.startDate || r.endDate) meta.push([niceDate(r.startDate), niceDate(r.endDate)].filter(Boolean).join(' to '));
    var tags = derive.tags(r, today).map(tagEl);
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

  function render() {
    var today = new Date();
    var all = store.items('records').filter(function (r) { return matches(r, state.query); });
    listEl.innerHTML = '';

    if (state.tab === 'Archive') {
      var arch = all.filter(function (r) { return r.status === 'Archived'; }).sort(byName);
      listEl.appendChild(group('Archived', schema.STATUS_NOTES.Archived, arch, today));
    } else {
      var mine = all.filter(function (r) { return r.status !== 'Archived' && (r.recordType || 'Grant') === state.tab; });
      var any = false;
      ORDER.forEach(function (s) {
        var items = mine.filter(function (r) { return derive.shown(r, today) === s; }).sort(attentionFirst(today));
        if (!items.length) return;
        any = true;
        listEl.appendChild(group(s, schema.STATUS_NOTES[s], items, today));
      });
      if (!any) listEl.appendChild(el('p', { class: 'quiet empty', text: '·' }));
    }
    $('stamp').textContent = 'Updated ' + clock(store.loadedAt || new Date());
  }

  function byName(a, b) { return String(a.name).localeCompare(String(b.name)); }

  function attentionFirst(today) {
    return function (a, b) {
      var ta = derive.tags(a, today).some(function (t) { return t.tone === 'attention'; }) ? 0 : 1;
      var tb = derive.tags(b, today).some(function (t) { return t.tone === 'attention'; }) ? 0 : 1;
      if (ta !== tb) return ta - tb;
      return String(a.deadline || a.endDate || '9999').localeCompare(String(b.deadline || b.endDate || '9999')) || byName(a, b);
    };
  }

  function group(status, note, items, today) {
    var sec = el('section', { class: 'group' }, [
      el('h2', {}, [chip(status), el('span', { class: 'note', text: '(' + note + ')' })])
    ]);
    if (!items.length) { sec.appendChild(el('p', { class: 'quiet empty', text: '·' })); return sec; }
    var ul = el('ul', { class: 'rows' });
    items.forEach(function (r) { ul.appendChild(row(r, today)); });
    sec.appendChild(ul);
    return sec;
  }

  // ---------- tabs, search, add ----------

  var tabButtons = document.querySelectorAll('.tabs button');
  Array.prototype.forEach.call(tabButtons, function (b) {
    b.addEventListener('click', function () {
      state.tab = b.getAttribute('data-tab');
      Array.prototype.forEach.call(tabButtons, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      closeAdd();
      render();
    });
  });

  $('search').addEventListener('input', function (e) { state.query = e.target.value.trim(); render(); });

  $('add').addEventListener('click', function () {
    $('addForm').hidden = false; $('add').hidden = true; $('addName').value = ''; $('addName').focus();
  });
  $('addCancel').addEventListener('click', closeAdd);
  function closeAdd() { $('addForm').hidden = true; $('add').hidden = state.tab === 'Archive'; }

  $('addForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('addName').value.trim();
    if (!name) { $('addName').focus(); return; }
    store.add('records', { name: name, recordType: state.tab === 'Archive' ? 'Grant' : state.tab }, { me: ME }).then(function (r) {
      closeAdd(); render(); openDetail(r.id);
      toast('Added.', { type: 'add', id: r.id });
    });
  });

  // ---------- the detail view ----------

  function closeDetail() { state.openId = null; if (dialog.open) dialog.close(); }
  dialog.addEventListener('close', function () {
    state.openId = null;
    if ($('toast').parentNode === dialog) document.body.appendChild($('toast'));
    render();
  });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) closeDetail(); });

  function save(id, changes, done) {
    store.update('records', id, changes).then(function (res) {
      render();
      toast('Saved.', { type: 'update', before: res.before });
      if (done) done(res.item);
    }).catch(showProblem);
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
      var type = { date: 'date', email: 'email', url: 'url', phone: 'tel', currency: 'number', number: 'number' }[col.type] || 'text';
      input = el('input', { id: id, type: type, autocomplete: 'off' });
      if (col.type === 'currency') { input.setAttribute('min', '0'); input.setAttribute('step', '1'); input.setAttribute('inputmode', 'numeric'); }
      if (col.type === 'person') input.setAttribute('list', 'peopleList');
      input.value = value;
    }

    input.addEventListener('change', function () {
      var v = input.value;
      if (col.type === 'currency' || col.type === 'number') v = v === '' ? '' : Number(v);
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
        else refreshHead(r);
      });
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
    if (st) { st.innerHTML = ''; [chip(derive.shown(r, today))].concat(derive.tags(r, today).map(tagEl)).forEach(function (n) { st.appendChild(n); }); }
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
          el('p', { class: 'detailStatus' }, [chip(shownStatus)].concat(derive.tags(r, today).map(tagEl)))
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
      toast('Archived.', { type: 'update', before: res.before });
    }).catch(showProblem);
  }

  function restoreRecord(r) {
    var back = r.previousStatus && r.previousStatus !== 'Archived' ? r.previousStatus : 'Potentials';
    store.update('records', r.id, { status: back, archiveReason: '', previousStatus: '' }).then(function (res) {
      render(); openDetail(r.id);
      toast('Restored to ' + back + '.', { type: 'update', before: res.before });
    }).catch(showProblem);
  }

  // ---------- start ----------

  $('reset').addEventListener('click', function () {
    store.reset().then(function () { closeDetail(); render(); toast('The sample is back to its start.'); });
  });

  store.load().then(function () {
    render();
    document.body.setAttribute('data-loaded', 'yes');
  }).catch(function (e) {
    listEl.innerHTML = '';
    listEl.appendChild(el('p', { class: 'quiet', text: 'The records could not load: ' + e.message }));
  });

  // For the browser tests
  window.NAMI.app = { store: store, render: render, openDetail: openDetail };
})();
