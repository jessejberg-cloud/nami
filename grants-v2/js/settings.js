/*
  NAMI Grants Dashboard v2: labels, custom fields and the tile layout. Plain logic, no page.

    makeLabels(rows)              text(key, fallback): the custom text from the Labels list, else the fallback
    LABEL_GROUPS                  every renamable name, grouped the way the Labels page shows them
    parseCustom(value)            the Settings customColumns row as [{ key, label, type, choices, filter }]
    formatCustom(columns)         back to the row's text
    newKey(label, taken)          a column key made from a name, never one already taken
    filterable(column)            true for choice, date and yes/no columns with their filter on
    TILES                         the home tiles in their first order
    normalLayout(saved)           a layout with every tile once, in the saved order where there is one
    moveTile(layout, key, by)     a new layout with one tile moved earlier (by < 0) or later

  Label keys:  tile.<tile>  status.<status>  statusNote.<status>  field.<column>  section.<name>
               filter.<key>  page.title
  customColumns:  key|Label|type|choice one, choice two|filter|section   rows separated by ";"
                  type is text, note, choice, date, yesno, number or currency; filter is on or off
*/
(function (root) {
  'use strict';

  var schema = root.NAMI && root.NAMI.schema;
  if (!schema && typeof require === 'function') schema = require('./schema.js');

  function makeLabels(rows) {
    var map = {};
    (rows || []).forEach(function (r) {
      var t = r && typeof r.customText === 'string' ? r.customText.trim() : '';
      if (r && r.key && t) map[r.key] = t;
    });
    return function text(key, fallback) { return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : fallback; };
  }

  var TILES = [
    { key: 'attention', text: 'Needs attention' },
    { key: 'todo', text: 'To-do' },
    { key: 'pipeline', text: 'Pipeline', wide: true },
    { key: 'awards', text: 'Awards' },
    { key: 'contracts', text: 'County contracts' },
    { key: 'archive', text: 'Archive' },
    { key: 'watch', text: 'Funding Watch', wide: true }
  ];

  var SECTIONS = [
    { key: 'main', text: 'Main details' },
    { key: 'contact', text: 'Contact' },
    { key: 'notes', text: 'Notes and links' },
    { key: 'tasks', text: 'To-do' },
    { key: 'awardYears', text: 'Award years' },
    { key: 'taskDetails', text: 'To-do details' },
    { key: 'feeds', text: 'Feeds' },
    { key: 'watchList', text: 'Watch list' },
    { key: 'more', text: 'More details' }
  ];

  var STATUS_SHOWN = ['Potentials', 'Upcoming', 'Applied', 'Awarded', 'Active', 'Archived'];

  // Every name a person can rename, in the order the Labels page lists them
  function labelGroups() {
    var fields = schema.list('records').columns.filter(function (c) { return !c.hidden; });
    return [
      { key: 'tiles', text: 'Titles', items: [{ key: 'page.title', text: 'Grants Dashboard' }].concat(TILES.map(function (t) { return { key: 'tile.' + t.key, text: t.text }; })) },
      { key: 'statuses', text: 'Statuses', items: STATUS_SHOWN.map(function (s) { return { key: 'status.' + s, text: s, note: { key: 'statusNote.' + s, text: schema.STATUS_NOTES[s] } }; }) },
      { key: 'fields', text: 'Fields', items: fields.map(function (c) { return { key: 'field.' + c.key, text: c.label }; }) },
      { key: 'sections', text: 'Sections', items: SECTIONS.map(function (s) { return { key: 'section.' + s.key, text: s.text }; }) },
      { key: 'filters', text: 'Filters', items: [
        { key: 'filter.year', text: 'Year' }, { key: 'filter.from', text: 'From' }, { key: 'filter.to', text: 'To' },
        { key: 'filter.myTodo', text: 'My to-do' }
      ] }
    ];
  }

  // ---------- custom columns ----------

  var TYPES = [
    { key: 'text', text: 'Short text' },
    { key: 'note', text: 'Long text' },
    { key: 'choice', text: 'Choice' },
    { key: 'date', text: 'Date' },
    { key: 'yesno', text: 'Yes or no' },
    { key: 'number', text: 'Number' },
    { key: 'currency', text: 'Amount' }
  ];
  var TYPE_KEYS = TYPES.map(function (t) { return t.key; });
  // The parts of a record a field of your own can show in
  var FIELD_SECTIONS = ['main', 'contact', 'notes', 'more'];

  // Fields added to just one record, kept on that record as JSON: [{ key, label, type, section, value }]
  function parseExtras(s) {
    var list;
    try { list = JSON.parse(s || '[]'); } catch (e) { return []; }
    return Array.isArray(list) ? list.filter(function (x) { return x && typeof x.key === 'string' && x.label; }).map(function (x) {
      return { key: x.key, label: String(x.label), type: TYPE_KEYS.indexOf(x.type) === -1 ? 'text' : x.type, section: FIELD_SECTIONS.indexOf(x.section) === -1 ? 'more' : x.section, value: x.value === undefined ? '' : x.value };
    }) : [];
  }

  // Names a custom field may never take: the built-in Records columns and the ones every
  // SharePoint item carries
  var RESERVED = ['id', 'created', 'modified', 'title', 'author', 'editor', 'attachments', 'contentType', 'version'];
  function takenKeys() { return schema.list('records').columns.map(function (c) { return c.key; }).concat(RESERVED); }

  function parseCustom(value) {
    var seen = takenKeys().map(function (k) { return k.toLowerCase(); });
    return String(value || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
      var p = s.split('|').map(function (x) { return x.trim(); });
      var type = TYPE_KEYS.indexOf(p[2]) === -1 ? 'text' : p[2];
      return {
        key: p[0],
        label: p[1] || p[0],
        type: type,
        choices: (p[3] || '').split(',').map(function (c) { return c.trim(); }).filter(Boolean),
        filter: p[4] ? p[4] !== 'off' : true,
        section: FIELD_SECTIONS.indexOf(p[5]) !== -1 ? p[5] : 'more'
      };
    }).filter(function (c) {
      if (!/^[A-Za-z][A-Za-z0-9]*$/.test(c.key) || seen.indexOf(c.key.toLowerCase()) !== -1) return false;
      seen.push(c.key.toLowerCase());
      return true;
    });
  }

  function clean(s) { return String(s || '').replace(/[|;]/g, ' ').replace(/,/g, ' ').trim(); }

  function formatCustom(columns) {
    return columns.map(function (c) {
      return [c.key, String(c.label || c.key).replace(/[|;]/g, ' ').trim(), c.type || 'text',
        (c.choices || []).map(clean).filter(Boolean).join(', '), c.filter === false ? 'off' : 'on', c.section || 'more'].join('|');
    }).join('; ');
  }

  function newKey(label, taken) {
    var words = String(label || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim().split(/\s+/).filter(Boolean);
    var base = words.map(function (w, i) { return i ? w.charAt(0).toUpperCase() + w.slice(1) : w; }).join('');
    if (!/^[a-z]/.test(base)) base = 'field' + base.charAt(0).toUpperCase() + base.slice(1);
    base = base.slice(0, 40);
    var all = (taken || []).concat(takenKeys()).map(function (k) { return k.toLowerCase(); });
    var key = base, n = 2;
    while (all.indexOf(key.toLowerCase()) !== -1) key = base + n++;
    return key;
  }

  function filterable(c) { return c.filter !== false && (c.type === 'choice' || c.type === 'date' || c.type === 'yesno'); }

  // ---------- layout ----------

  function normalLayout(saved) {
    saved = saved || {};
    var all = TILES.map(function (t) { return t.key; });
    var order = (saved.order || []).filter(function (k, i, a) { return all.indexOf(k) !== -1 && a.indexOf(k) === i; });
    all.forEach(function (k) { if (order.indexOf(k) === -1) order.push(k); });
    var collapsed = {};
    Object.keys(saved.collapsed || {}).forEach(function (k) { if (all.indexOf(k) !== -1 && saved.collapsed[k]) collapsed[k] = true; });
    var hidden = {};
    Object.keys(saved.hidden || {}).forEach(function (k) { if (all.indexOf(k) !== -1 && saved.hidden[k]) hidden[k] = true; });
    return { order: order, collapsed: collapsed, hidden: hidden };
  }

  function moveTile(layout, key, by) {
    var l = normalLayout(layout);
    var i = l.order.indexOf(key);
    var j = Math.max(0, Math.min(l.order.length - 1, i + by));
    if (i === -1 || i === j) return l;
    l.order.splice(i, 1);
    l.order.splice(j, 0, key);
    return l;
  }

  var api = {
    makeLabels: makeLabels, labelGroups: labelGroups, TILES: TILES, SECTIONS: SECTIONS, TYPES: TYPES,
    parseCustom: parseCustom, formatCustom: formatCustom, parseExtras: parseExtras, FIELD_SECTIONS: FIELD_SECTIONS, newKey: newKey, filterable: filterable,
    normalLayout: normalLayout, moveTile: moveTile
  };
  root.NAMI = root.NAMI || {};
  root.NAMI.settings = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
