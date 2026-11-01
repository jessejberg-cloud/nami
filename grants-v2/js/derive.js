/*
  NAMI Grants Dashboard v2: things worked out from the data, never stored.

    shown(record, today)   the status a person sees: Awarded shows as Active between its dates,
                           and as Awarded before it starts or after it ends
    tags(record, today)    calm notes for a record: Due soon, Apply-by date passed, Past end date
    years(record)          the calendar years a record covers
    multiYear(record)      true when it covers more than one calendar year
    passes(record, filters, today)   true when a record fits every filter that is set
    isAward(record)        counts toward Awards: Awarded, or Archived as Closed (or with no reason and a start date)
    awardsByYear(records, awardYears, mode)   { year: total } in 'Award year' or 'Spread' view
    awardShares(record, awardYears, mode)     { year: amount } for one record

  Dates are 'YYYY-MM-DD' strings, compared as text. "today" is a Date.
  Words follow the design guide: no "overdue", no "deadline", no countdowns.
*/
(function (root) {
  'use strict';

  var DUE_SOON_DAYS = 14;

  function iso(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }

  function shown(r, today) {
    if (r.status !== 'Awarded') return r.status || 'Potentials';
    var t = iso(today || new Date());
    if (r.startDate && r.startDate > t) return 'Awarded';
    if (r.endDate && r.endDate < t) return 'Awarded'; // ended; To-do shows "Past end date" until a person archives it
    return 'Active';
  }

  function tags(r, today, dueSoonDays) {
    var out = [];
    var now = today || new Date();
    var t = iso(now);
    var soon = iso(addDays(now, dueSoonDays || DUE_SOON_DAYS));
    if (r.status === 'Archived') return out;
    if ((r.status === 'Potentials' || r.status === 'Upcoming') && r.deadline) {
      if (r.deadline < t) out.push({ key: 'applyPassed', text: 'Apply-by date passed', tone: 'attention' });
      else if (r.deadline <= soon) out.push({ key: 'dueSoon', text: 'Due soon', tone: 'attention' });
    }
    if (r.status === 'Awarded' && r.endDate && r.endDate < t) {
      out.push({ key: 'pastEnd', text: 'Past end date', tone: 'attention' });
    }
    if (multiYear(r)) out.push({ key: 'multiYear', text: 'Multi-year', tone: 'plain' });
    return out;
  }

  function years(r) {
    var a = r.startDate ? Number(r.startDate.slice(0, 4)) : null;
    var b = r.endDate ? Number(r.endDate.slice(0, 4)) : null;
    if (!a && !b) return [];
    if (!a) return [b];
    if (!b || b < a) return [a];
    var out = [];
    for (var y = a; y <= b; y++) out.push(y);
    return out;
  }

  function multiYear(r) { return years(r).length > 1; }

  // ---------- filters ----------
  // filters: { year, from, to, status, program, funder, grantType, owner, recordType, applyFrom, applyTo,
  //            and for custom columns c.<key>, y.<key>, d.<key>.from, d.<key>.to }
  // Empty values mean "any". year is a calendar year; from/to a custom range. A record shows in
  // every year it is active; a record with no dates at all is matched by its apply-by date.
  // The dates a record covers: from the earliest of its apply-by and start dates to the latest
  // of its end, start and apply-by dates. An award with no end date runs through today. A record
  // with no dates at all is treated as current (only a name is required, so new ideas often have none).
  function inPeriod(r, from, to, today) {
    var t = iso(today || new Date());
    var ds = [r.deadline, r.startDate, r.endDate].filter(Boolean).sort();
    var a, b;
    if (!ds.length) { if (r.status === 'Archived') return false; a = b = t; }
    else {
      a = ds[0]; b = ds[ds.length - 1];
      if (r.status === 'Awarded' && r.startDate && !r.endDate && t > b) b = t;
    }
    return a <= to && b >= from;
  }

  function passes(r, f, today) {
    f = f || {};
    if (f.year) { if (!inPeriod(r, f.year + '-01-01', f.year + '-12-31', today)) return false; }
    else if (f.from || f.to) { if (!inPeriod(r, f.from || '0000-01-01', f.to || '9999-12-31', today)) return false; }
    if (f.status && shown(r, today) !== f.status) return false;
    if (f.program && (r.program || '') !== f.program) return false;
    if (f.funder && (r.funder || '') !== f.funder) return false;
    if (f.grantType && (r.grantType || '') !== f.grantType) return false;
    if (f.owner && (r.owner || '') !== f.owner) return false;
    if (f.recordType && (r.recordType || 'Grant') !== f.recordType) return false;
    if (f.applyFrom || f.applyTo) {
      if (!r.deadline) return false;
      if (f.applyFrom && r.deadline < f.applyFrom) return false;
      if (f.applyTo && r.deadline > f.applyTo) return false;
    }
    return customPasses(r, f);
  }

  // Custom columns: c.<key> a choice, y.<key> Yes or No, d.<key>.from and d.<key>.to a date range
  function isYes(v) { return v === true || /^(yes|true|1)$/i.test(String(v || '')); }
  function customPasses(r, f) {
    var keys = Object.keys(f);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i], want = f[k], m;
      if (!want) continue;
      if ((m = /^c\.(\w+)$/.exec(k))) { if (String(r[m[1]] || '') !== want) return false; }
      else if ((m = /^y\.(\w+)$/.exec(k))) { if (isYes(r[m[1]]) !== (want === 'Yes')) return false; }
      else if ((m = /^d\.(\w+)\.(from|to)$/.exec(k))) {
        var v = r[m[1]];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v || ''))) return false; // not a date (the field may have been text once)
        if (m[2] === 'from' && v < want) return false;
        if (m[2] === 'to' && v > want) return false;
      }
    }
    return true;
  }

  // ---------- awards ----------
  // Archived awards keep counting when Closed, and also when archived with no reason but a start
  // date (an award that ran), so archiving without a reason does not wipe it from the history.
  function isAward(r) {
    if (!(Number(r.awardAmount) > 0)) return false;
    if (r.status === 'Awarded') return true;
    if (r.status !== 'Archived') return false;
    return r.archiveReason === 'Closed' || (!r.archiveReason && !!r.startDate);
  }

  // Award year: the full amount in the year the award starts (the accounting view).
  // Spread: split across the calendar years it covers: Award Years rows where someone has
  // entered them, and an even split of the rest over the other years.
  function awardShares(r, awardYears, mode) {
    var out = {};
    var amount = Number(r.awardAmount) || 0;
    var ys = years(r);
    var first = ys[0] || (r.deadline ? Number(r.deadline.slice(0, 4)) : (r.created ? Number(String(r.created).slice(0, 4)) : null));
    if (!first) return out;
    if (mode !== 'Spread') { out[first] = amount; return out; }
    var rows = (awardYears || []).filter(function (y) { return y.record === r.id; });
    if (!ys.length) ys = [first];
    // Years someone has entered keep their amount; what is left is split evenly over the rest
    var left = amount;
    rows.forEach(function (y) { out[y.year] = (out[y.year] || 0) + (Number(y.amount) || 0); left -= Number(y.amount) || 0; });
    var open = ys.filter(function (y) { return !(y in out); });
    if (!open.length || left <= 0) return out;
    var each = Math.floor((left / open.length) * 100) / 100;
    open.forEach(function (y, i) { out[y] = i === open.length - 1 ? Math.round((left - each * (open.length - 1)) * 100) / 100 : each; });
    return out;
  }

  function awardsByYear(records, awardYears, mode) {
    var out = {};
    records.filter(isAward).forEach(function (r) {
      var s = awardShares(r, awardYears, mode);
      Object.keys(s).forEach(function (y) { out[y] = (out[y] || 0) + s[y]; });
    });
    return out;
  }

  var api = { isYes: isYes, shown: shown, tags: tags, years: years, multiYear: multiYear, passes: passes, inPeriod: inPeriod, isAward: isAward, awardShares: awardShares, awardsByYear: awardsByYear, iso: iso, addDays: addDays, DUE_SOON_DAYS: DUE_SOON_DAYS };
  root.NAMI = root.NAMI || {};
  root.NAMI.derive = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
