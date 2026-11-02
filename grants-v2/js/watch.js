/*
  NAMI Grants Dashboard v2: Funding Watch. Plain logic shared by the page and the feed function.

    grantsGovRequest(keyword)        the body for Grants.gov's search2 API (open and forecasted,
                                     nonprofits with 501(c)(3) status)
    grantsGovItems(json)             search2's answer as [{ id, title, source, date, opens, url }]
    parseFeed(xml)                   an RSS or Atom feed as the same shape (no page scraping)
    safeFeedUrl(url)                 the URL when it is a public http(s) address, else null
    createFeedClient(options)        load(feed): Promise of items; the page's way to reach feeds
    nextOpening(watch, today)        { year, month } of the next time a cycle opens (this month counts)
    reviewItems(watch, records, today)   the Review items due now: a cycle month that has arrived
                                     and has not been reviewed since, or a record's watch date that
                                     has arrived
    MONTHS                           month names, January first

  Items: { id, title, source, date (closes, YYYY-MM-DD), opens, url }
*/
(function (root) {
  'use strict';

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var GRANTS_GOV = 'https://api.grants.gov/v1/api/search2';

  function iso(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  // Grants.gov dates come as MM/DD/YYYY
  function usToIso(s) {
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(s || ''));
    if (!m) return '';
    return m[3] + '-' + (m[1].length < 2 ? '0' : '') + m[1] + '-' + (m[2].length < 2 ? '0' : '') + m[2];
  }

  function grantsGovRequest(keyword) {
    // A phrase is searched as a phrase, so "peer support" does not match every grant about support
    var k = String(keyword || '').trim().replace(/"/g, '');
    return { keyword: /\s/.test(k) ? '"' + k + '"' : k, oppStatuses: 'forecasted|posted', eligibilities: '12', rows: 25 };
  }

  function grantsGovItems(json) {
    var hits = (json && json.data && json.data.oppHits) || [];
    return hits.map(function (h) {
      return {
        id: 'gg-' + h.id,
        title: String(h.title || '').trim(),
        source: h.agency || h.agencyName || h.agencyCode || 'Grants.gov',
        date: usToIso(h.closeDate),
        opens: usToIso(h.openDate),
        url: 'https://www.grants.gov/search-results-detail/' + encodeURIComponent(h.id),
        number: h.number || ''
      };
    }).filter(function (i) { return i.title; });
  }

  // ---------- RSS and Atom ----------

  function decode(s) {
    return String(s || '')
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
      .replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(Number(n)); })
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ').trim();
  }
  function tag(block, name) {
    var m = new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>', 'i').exec(block);
    return m ? m[1] : '';
  }
  function feedDate(s) {
    var d = new Date(decode(s));
    return isNaN(d) ? '' : iso(d);
  }

  function parseFeed(xml) {
    xml = String(xml || '');
    if (!/<(rss|feed|rdf:RDF)[\s>]/i.test(xml)) throw new Error('That address is not a feed.');
    var blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
    return blocks.slice(0, 30).map(function (b, i) {
      var link = decode(tag(b, 'link'));
      if (!link) { var h = /<link[^>]*href="([^"]+)"/i.exec(b); link = h ? h[1].replace(/&amp;/g, '&') : ''; }
      return {
        id: 'f-' + i + '-' + decode(tag(b, 'guid') || tag(b, 'id') || link).slice(0, 80),
        title: decode(tag(b, 'title')),
        source: '',
        date: feedDate(tag(b, 'pubDate') || tag(b, 'updated') || tag(b, 'published') || tag(b, 'dc:date')),
        opens: '',
        url: safeFeedUrl(link) || ''
      };
    }).filter(function (i) { return i.title; });
  }

  // Only public web addresses: never this machine or a private network
  function safeFeedUrl(s) {
    var u;
    try { u = new URL(String(s || '').trim()); } catch (e) { return null; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (u.username || u.password) return null;
    var h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (h === 'localhost' || /\.(local|internal|localhost)$/.test(h) || h.indexOf('.') === -1 && h.indexOf(':') === -1) return null;
    if (privateAddress(h)) return null;
    return u.toString();
  }

  // A private, loopback, link-local or shared address, written as IPv4 or IPv6 (the feed function
  // also checks what a name points to before it fetches)
  function privateAddress(h) {
    h = String(h || '').toLowerCase().replace(/^\[|\]$/g, '');
    if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
      var p = h.split('.').map(Number);
      return p[0] === 0 || p[0] === 10 || p[0] === 127 || (p[0] === 169 && p[1] === 254) || (p[0] === 192 && p[1] === 168) ||
        (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127) || p[0] >= 224;
    }
    if (h.indexOf(':') === -1) return false;
    return h === '::' || h === '::1' || /^::ffff:/.test(h) || /^(fc|fd|fe[89ab])/.test(h) || /^::(\d|$)/.test(h) || /^64:ff9b:/.test(h);
  }

  // ---------- the page's way to reach feeds ----------
  // options.endpoint: the feed function's address, or 'sample' for the made-up results used when
  // the page is opened straight from a folder (no function there to ask).
  function createFeedClient(options) {
    options = options || {};
    var doFetch = options.fetch || (root.fetch && root.fetch.bind(root));
    function viaFunction(query) {
      return doFetch(options.endpoint + '?' + query).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || !j.items) throw new Error(j.problem || 'not loading');
          return j.items;
        });
      });
    }
    return {
      sample: options.endpoint === 'sample',
      load: function (feed) {
        if (feed.type === 'Quick link') return Promise.resolve([]);
        if (options.endpoint === 'sample') return options.sampleResults ? options.sampleResults(feed) : Promise.reject(new Error('not loading'));
        if (feed.type === 'Grants.gov') return viaFunction('type=grantsgov&keywords=' + encodeURIComponent(feed.source || ''));
        var url = safeFeedUrl(feed.source);
        if (!url) return Promise.reject(new Error('not loading'));
        return viaFunction('type=feed&url=' + encodeURIComponent(url));
      }
    };
  }

  // ---------- the Watch list ----------

  function nextOpening(w, today) {
    var mo = Number(w.opens);
    if (!(mo >= 1 && mo <= 12)) return null;
    var y = today.getFullYear(), m = today.getMonth() + 1;
    return { year: mo >= m ? y : y + 1, month: mo };
  }

  function yes(v) { return v === true || /^(yes|true|1)$/i.test(String(v || '')); }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function reviewItems(watch, records, today) {
    var t = iso(today), y = today.getFullYear(), m = today.getMonth() + 1;
    var out = [];
    (watch || []).forEach(function (w) {
      var mo = Number(w.opens);
      if (!(mo >= 1 && mo <= 12)) return;
      var start = (mo <= m ? y : y - 1) + '-' + pad(mo) + '-01'; // the latest opening on or before today
      var added = String(w.created || '').slice(0, 7) + '-01';
      if (w.created && start < added) return;          // it opened before it was on the list
      if (w.lastReviewed && w.lastReviewed >= start) return; // already reviewed this time round
      if (!yes(w.repeatsYearly) && w.lastReviewed) return; // a one-time watch is reviewed once
      out.push({ kind: 'review', date: start, title: 'Review: ' + w.name, watch: w });
    });
    (records || []).forEach(function (r) {
      if (r.watchDate && r.watchDate <= t) out.push({ kind: 'review', date: r.watchDate, title: 'Review: ' + r.name, record: r });
    });
    return out;
  }

  var api = {
    MONTHS: MONTHS, GRANTS_GOV: GRANTS_GOV, usToIso: usToIso, grantsGovRequest: grantsGovRequest, grantsGovItems: grantsGovItems,
    parseFeed: parseFeed, safeFeedUrl: safeFeedUrl, privateAddress: privateAddress, createFeedClient: createFeedClient, nextOpening: nextOpening, reviewItems: reviewItems
  };
  root.NAMI = root.NAMI || {};
  root.NAMI.watch = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
