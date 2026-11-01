/*
  NAMI Grants Dashboard v2: the data layer.

  Two modes behind one interface, so the screens never know which is in use:
    Sample mode      fictional records kept in this browser (localStorage), for building and training
    SharePoint mode  NAMI's own SharePoint lists, through Microsoft sign-in (arrives in Phase 7)

  The interface every store offers:
    store.mode                     'sample' or 'sharepoint'
    store.load()                   Promise; fills the store and resolves to { listKey: [items] }
    store.items(listKey)           copies of the items in one list
    store.get(listKey, id)         a copy of one item, or null
    store.add(listKey, fields, ctx)   Promise; the new item (fallbacks filled, Name checked)
    store.update(listKey, id, changes) Promise; { item, before } so Undo can put it back
    store.restore(listKey, before) Promise; Undo of an update: puts the whole item back as it was
    store.remove(listKey, id)      Promise; used only by Undo of an add. Nothing else deletes
    store.reset()                  Promise; Sample mode starts over; SharePoint mode refuses
    store.loadedAt                 when the data was last read (for the "updated" stamp)

  Every item carries id, created and modified, the way SharePoint list items do.
*/
(function (root) {
  'use strict';

  var schema = root.NAMI && root.NAMI.schema;
  if (!schema && typeof require === 'function') schema = require('./schema.js');

  var STORAGE_KEY = 'nami-grants-v2-sample';

  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function nowIso() { return new Date().toISOString(); }

  function safeStorage(storage) {
    return {
      read: function () {
        try { var raw = storage && storage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
      },
      write: function (value) {
        try { if (storage) storage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch (e) { /* the page still works without saving */ }
      },
      clear: function () {
        try { if (storage) storage.removeItem(STORAGE_KEY); } catch (e) { /* nothing to clear */ }
      }
    };
  }

  function emptyLists() {
    var out = {};
    schema.LISTS.forEach(function (l) { out[l.key] = []; });
    return out;
  }

  // Fill fallbacks (Status → Potentials, Owner → the person adding it, Record type → Grant)
  // and check the one required field. Returns { fields, problem }.
  function prepare(listKey, fields, ctx) {
    var l = schema.list(listKey);
    if (!l) return { problem: 'There is no list called ' + listKey + '.' };
    var out = {};
    l.columns.forEach(function (c) {
      var v = fields[c.key];
      if ((v === undefined || v === null || v === '') && c.fallback !== undefined) {
        v = c.fallback === '@me' ? (ctx && ctx.me) || '' : c.fallback;
      }
      if (v !== undefined) out[c.key] = v;
    });
    Object.keys(fields).forEach(function (k) { if (!(k in out) && k !== 'id') out[k] = fields[k]; }); // custom columns ride along
    for (var i = 0; i < l.columns.length; i++) {
      var col = l.columns[i];
      if (col.required && (out[col.key] === undefined || String(out[col.key]).trim() === '')) {
        return { problem: col.label + ' is needed to save.' };
      }
    }
    return { fields: out };
  }

  function createSampleStore(options) {
    options = options || {};
    var saved = safeStorage(options.storage);
    var build = options.build || (root.NAMI && root.NAMI.sample && root.NAMI.sample.build);
    var lists = emptyLists();
    var nextId = 1;

    var store = {
      mode: 'sample',
      loadedAt: null,

      load: function () {
        var kept = options.fresh ? null : saved.read();
        if (kept && kept.lists) {
          lists = kept.lists;
          nextId = kept.nextId || 1;
        } else {
          lists = emptyLists();
          var built = build ? build(options.today || new Date()) : {};
          Object.keys(built).forEach(function (k) { lists[k] = built[k]; });
          nextId = 1;
          Object.keys(lists).forEach(function (k) {
            lists[k].forEach(function (item) { if (item.id >= nextId) nextId = item.id + 1; });
          });
          persist();
        }
        Object.keys(emptyLists()).forEach(function (k) { if (!lists[k]) lists[k] = []; });
        store.loadedAt = new Date();
        return Promise.resolve(clone(lists));
      },

      items: function (listKey) { return clone(lists[listKey] || []); },

      get: function (listKey, id) {
        var found = find(listKey, id);
        return found ? clone(found) : null;
      },

      add: function (listKey, fields, ctx) {
        var prepared = prepare(listKey, fields || {}, ctx);
        if (prepared.problem) return Promise.reject(new Error(prepared.problem));
        var stamp = nowIso();
        var item = Object.assign({ id: nextId++, created: stamp, modified: stamp }, prepared.fields);
        lists[listKey].push(item);
        persist();
        return Promise.resolve(clone(item));
      },

      update: function (listKey, id, changes) {
        var item = find(listKey, id);
        if (!item) return Promise.reject(new Error('That item is no longer in ' + listKey + '.'));
        var before = clone(item);
        Object.keys(changes || {}).forEach(function (k) {
          if (k !== 'id' && k !== 'created') item[k] = changes[k];
        });
        var col = schema.list(listKey).columns.filter(function (c) { return c.required; })[0];
        if (col && String(item[col.key] || '').trim() === '') {
          Object.keys(item).forEach(function (k) { delete item[k]; });
          Object.assign(item, before);
          return Promise.reject(new Error(col.label + ' is needed to save.'));
        }
        item.modified = nowIso();
        persist();
        return Promise.resolve({ item: clone(item), before: before });
      },

      restore: function (listKey, before) {
        var item = before && find(listKey, before.id);
        if (!item) return Promise.reject(new Error('That item is no longer in ' + listKey + '.'));
        Object.keys(item).forEach(function (k) { delete item[k]; });
        Object.assign(item, clone(before));
        persist();
        return Promise.resolve(clone(item));
      },

      remove: function (listKey, id) {
        var arr = lists[listKey] || [];
        for (var i = 0; i < arr.length; i++) {
          if (arr[i].id === id) { var gone = arr.splice(i, 1)[0]; persist(); return Promise.resolve(clone(gone)); }
        }
        return Promise.resolve(null);
      },

      // Start the sample over from fresh fictional records.
      reset: function () {
        saved.clear();
        options.fresh = true;
        var p = store.load();
        options.fresh = false;
        return p;
      }
    };

    function find(listKey, id) {
      var arr = lists[listKey] || [];
      for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
      return null;
    }

    function persist() { saved.write({ lists: lists, nextId: nextId, savedAt: nowIso() }); }

    return store;
  }

  // SharePoint mode keeps the same shape. It is filled in during Phase 7.
  function createSharePointStore() {
    function notYet() { return Promise.reject(new Error('SharePoint mode is not connected yet.')); }
    return {
      mode: 'sharepoint', loadedAt: null,
      load: notYet, add: notYet, update: notYet, restore: notYet, remove: notYet, reset: notYet,
      items: function () { return []; }, get: function () { return null; }
    };
  }

  var api = { createSampleStore: createSampleStore, createSharePointStore: createSharePointStore, prepare: prepare, STORAGE_KEY: STORAGE_KEY };
  root.NAMI = root.NAMI || {};
  root.NAMI.data = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
