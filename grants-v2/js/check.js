/*
  Phase 1 check page: shows every list as Sample mode loads it.
  The dashboard tiles replace this view in Phase 3.
*/
(function () {
  'use strict';

  var schema = window.NAMI.schema;
  var store = window.NAMI.data.createSampleStore({ storage: window.localStorage });
  var main = document.getElementById('main');

  function text(v, col) {
    if (v === undefined || v === null || v === '') return '';
    if (col && col.type === 'yesno') return v ? 'Yes' : 'No';
    if (col && col.type === 'currency') return '$' + Number(v).toLocaleString('en-US');
    if (col && col.type === 'lookup') {
      var target = store.get(col.list, v);
      return target ? (target.name || target.title || ('#' + v)) : '#' + v;
    }
    return String(v).replace(/\n/g, ' · ');
  }

  // 1:05pm, the way the design guide writes times
  function clock(d) {
    var h = d.getHours(), m = d.getMinutes();
    return ((h % 12) || 12) + ':' + (m < 10 ? '0' : '') + m + (h < 12 ? 'am' : 'pm');
  }

  function render() {
    main.innerHTML = '';
    schema.LISTS.forEach(function (l, i) {
      var items = store.items(l.key);
      var box = document.createElement('details');
      box.className = 'list';
      box.open = i === 0;
      var sum = document.createElement('summary');
      sum.textContent = l.label;
      box.appendChild(sum);

      if (!items.length) {
        var empty = document.createElement('p');
        empty.className = 'quiet';
        empty.textContent = '·';
        box.appendChild(empty);
      } else {
        var wrap = document.createElement('div');
        wrap.className = 'scroll';
        var table = document.createElement('table');
        var head = table.createTHead().insertRow();
        l.columns.forEach(function (c) { var th = document.createElement('th'); th.textContent = c.label; head.appendChild(th); });
        var body = table.createTBody();
        items.forEach(function (it) {
          var tr = body.insertRow();
          l.columns.forEach(function (c) { tr.insertCell().textContent = text(it[c.key], c); });
        });
        wrap.appendChild(table);
        box.appendChild(wrap);
      }
      main.appendChild(box);
    });
    document.getElementById('stamp').textContent = 'Loaded ' + clock(store.loadedAt);
    document.body.setAttribute('data-loaded', 'yes');
  }

  store.load().then(render).catch(function (e) {
    document.getElementById('status').textContent = 'The sample could not load: ' + e.message;
  });

  document.getElementById('reset').addEventListener('click', function () {
    store.reset().then(render);
  });
})();
