/*
  NAMI Grants Dashboard v2: who is signed in, what they may do, and task progress.
  Plain logic, no page, so it is tested in Node.

    whoIs(people, signedIn, o)  the People row for a signed-in { name, email }:
                                { person, email, role, programs, all, listed }
    can(who, action, task)      'edit' (records, tasks, labels, settings) for editors;
                                'log' (check off steps, comment) for editors and the task's own person
    inPrograms(who, record)     true when a record belongs to one of the person's programs
                                (records with no program show to everyone)
    guard(store, getWho)        the same store, refusing changes the signed-in person may not make
    stepState(task, progress)   each step's latest check, the count done, and the comments, oldest first

  Roles: Editor or Viewer, from the People list. Someone signed in but not on the People list is a
  Viewer of every program until an editor adds them. Program filtering is for focus, not privacy:
  SharePoint permissions are what actually keep a viewer from changing records (Phase 7).
*/
(function (root) {
  'use strict';

  function list(s) { return String(s || '').split(';').map(function (x) { return x.trim(); }).filter(Boolean); }

  // byEmailOnly: with Microsoft sign-in, only the email decides, so a look-alike name gets nothing
  function whoIs(people, signedIn, opts) {
    signedIn = signedIn || {};
    var email = String(signedIn.email || '').toLowerCase();
    var name = String(signedIn.name || '').trim();
    var row = (people || []).filter(function (p) { return email && String(p.email || '').toLowerCase() === email; })[0] ||
      (opts && opts.byEmailOnly ? null : (people || []).filter(function (p) { return name && p.person === name; })[0]);
    if (!row) return { person: name || email, email: email, role: 'Viewer', programs: [], all: true, listed: false };
    var programs = list(row.programs);
    var all = !programs.length || programs.some(function (p) { return /^all$/i.test(p); });
    return { person: row.person, email: row.email || email, role: row.role === 'Editor' ? 'Editor' : 'Viewer', programs: all ? [] : programs, all: all, listed: true };
  }

  function can(who, action, task) {
    if (!who) return false;
    if (who.role === 'Editor') return true;
    if (action === 'log') return !!(task && task.assignedTo && task.assignedTo === who.person);
    return false;
  }

  function onTeam(person, r) {
    return !!person && (r.owner === person || String(r.team || '').split(';').map(function (s) { return s.trim(); }).indexOf(person) !== -1);
  }

  function inPrograms(who, r) {
    if (!who || who.all || !r.program) return true;
    if (onTeam(who.person, r)) return true;
    return who.programs.indexOf(r.program) !== -1;
  }

  // Changes go through here, so a viewer's page cannot change records even if a button slipped through.
  function guard(store, getWho) {
    function no() { return Promise.reject(new Error('Only editors can change this.')); }
    var g = Object.create(store);
    g.add = function (listKey, fields, ctx) {
      var who = getWho();
      if (listKey === 'progress') {
        var task = store.get('tasks', fields && fields.task);
        if (!can(who, 'log', task)) return no();
        return store.add(listKey, Object.assign({}, fields, { person: who.person }), ctx);
      }
      return can(who, 'edit') ? store.add(listKey, fields, ctx) : no();
    };
    g.update = function (listKey, id, changes) { return can(getWho(), 'edit') ? store.update(listKey, id, changes) : no(); };
    g.restore = function (listKey, before) { return can(getWho(), 'edit') ? store.restore(listKey, before) : no(); };
    g.reset = function () { return can(getWho(), 'edit') ? store.reset() : no(); };
    g.remove = function (listKey, id) {
      var who = getWho();
      if (listKey === 'progress') {
        var row = store.get('progress', id);
        if (row && (can(who, 'edit') || row.person === who.person)) return store.remove(listKey, id); // Undo of their own entry
        return no();
      }
      return can(who, 'edit') ? store.remove(listKey, id) : no();
    };
    return g;
  }

  function stepState(task, progress) {
    var rows = (progress || []).filter(function (p) { return p.task === task.id; }).sort(function (a, b) { return a.id - b.id; });
    var latest = {};
    rows.forEach(function (p) { if (p.step) latest[p.step] = p; });
    var steps = String(task.steps || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean).map(function (text) {
      var p = latest[text];
      return { text: text, done: !!(p && p.done), by: p && p.done ? p.person : '', date: p && p.done ? p.date : '' };
    });
    return {
      steps: steps,
      done: steps.filter(function (s) { return s.done; }).length,
      comments: rows.filter(function (p) { return String(p.comment || '').trim(); })
    };
  }

  var api = { whoIs: whoIs, can: can, inPrograms: inPrograms, onTeam: onTeam, guard: guard, stepState: stepState };
  root.NAMI = root.NAMI || {};
  root.NAMI.access = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
