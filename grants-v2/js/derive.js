/*
  NAMI Grants Dashboard v2: things worked out from the data, never stored.

    shown(record, today)   the status a person sees: Awarded shows as Active between its dates,
                           and as Awarded before it starts or after it ends
    tags(record, today)    calm notes for a record: Due soon, Apply-by date passed, Past end date
    years(record)          the calendar years a record covers
    multiYear(record)      true when it covers more than one calendar year

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

  var api = { shown: shown, tags: tags, years: years, multiYear: multiYear, iso: iso, addDays: addDays, DUE_SOON_DAYS: DUE_SOON_DAYS };
  root.NAMI = root.NAMI || {};
  root.NAMI.derive = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
