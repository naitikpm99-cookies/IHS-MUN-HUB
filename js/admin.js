// DXB MUN – admin dashboard: add delegates to committees, manage chairs and codes, watch all chits.
(function () {
  var el = DXB.el;
  var $ = function (id) { return document.getElementById(id); };
  var ov = null;                 // overview from the server
  var sel = 'IPMC';              // committee being edited
  var last = {};
  var showCodes = false;           // codes stay masked until you press Show codes

  DXB.guard('admin').then(function () {
    $('logout').addEventListener('click', DXB.signOut);
    $('add-one').addEventListener('click', addOne);
    $('add-cm').addEventListener('click', addCommittee);
    $('rm-cm').addEventListener('click', removeCommittee);
    $('n-cname').addEventListener('keydown', function (e) { if (e.key === 'Enter') addCommittee(); });
    $('n-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') addOne(); });
    $('n-deleg').addEventListener('keydown', function (e) { if (e.key === 'Enter') addOne(); });
    $('add-bulk').addEventListener('click', addBulk);
    $('imp-file').addEventListener('change', onFile);
    $('tpl').addEventListener('click', downloadTemplate);
    $('xlsx-all').addEventListener('click', downloadAllXlsx);
    $('csv').addEventListener('click', downloadCsv);
    $('toggle-codes').addEventListener('click', function () { showCodes = !showCodes; this.textContent = showCodes ? 'Hide codes' : 'Show codes'; if (ov) draw(); });
    DXB.poll(loadOverview, 6000);
    DXB.poll(loadChits, 6000);
  }).catch(function (e) { if (e.message !== 'Signed out') DXB.toast(e.message); });

  function current() { return ov.committees.filter(function (c) { return c.id === sel; })[0] || ov.committees[0]; }

  function loadOverview() {
    return DXB.api('GET', '/api/admin/overview').then(function (r) {
      var key = JSON.stringify(r);
      if (key === last.ov) return;
      last.ov = key; ov = r;
      if (!ov.committees.some(function (c) { return c.id === sel; })) sel = ov.committees.length ? ov.committees[0].id : '';
      draw();
    }).catch(function () {});
  }
  function refresh() { last.ov = null; return loadOverview(); }

  function draw() {
    $('s-del').textContent = ov.stats.delegates;
    $('s-chair').textContent = ov.stats.chairs;
    $('s-chits').textContent = ov.stats.chits;
    $('s-wait').textContent = ov.stats.pending;
    if (!ov.committees.length) { drawNone(); return; }
    var c = current();
    ['sel-a', 'sel-b', 'sel-c', 'sel-d'].forEach(function (id) { $(id).textContent = c.id; });
    drawPick(); drawChair(c); drawScreen(c); drawTable(c);
  }

  function drawPick() {
    var box = $('pick');
    box.replaceChildren();
    ov.committees.forEach(function (c) {
      box.appendChild(el('button', {
        type: 'button', class: c.chair ? '' : 'no-chair', 'aria-pressed': String(c.id === sel), title: c.name,
        onclick: function () { sel = c.id; $('add-msg').textContent = ''; $('bulk-out').replaceChildren(); $('chair-msg').textContent = ''; draw(); }
      }, [el('b', { text: c.id }), el('small', { text: c.delegates.length + (c.delegates.length === 1 ? ' delegate' : ' delegates') })]));
    });
  }

  /* ---------- delegates ---------- */
  function drawTable(c) {
    var box = $('tbl');
    box.replaceChildren();
    $('tbl-count').textContent = c.delegates.length;
    $('tbl-count').classList.toggle('zero', !c.delegates.length);
    if (!c.delegates.length) { box.appendChild(el('p', { class: 'empty', text: 'No delegates in ' + c.id + ' yet. Add some with the form above.' })); return; }
    var body = el('tbody');
    c.delegates.forEach(function (d) {
      body.appendChild(el('tr', {}, [
        el('td', {}, [el('b', { text: d.delegation })]),
        el('td', { text: d.name || '–' }),
        el('td', {}, [el('span', { class: 'code', text: codeText(d.code) })]),
        el('td', {}, [el('div', { class: 'acts' }, [
          el('button', { class: 'btn ghost xs', type: 'button', text: 'Copy code', onclick: function () { DXB.copy(d.code); } }),
          el('button', { class: 'btn ghost xs', type: 'button', text: 'Edit', onclick: function () { edit(d); } }),
          el('button', { class: 'btn ghost xs', type: 'button', text: 'New code', onclick: function () { newCode(d, d.delegation); } }),
          el('button', { class: 'btn danger xs', type: 'button', text: 'Remove', onclick: function () { remove(d, d.delegation); } })
        ])])
      ]));
    });
    box.appendChild(el('table', { class: 'tbl' }, [
      el('thead', {}, [el('tr', {}, ['Delegation', 'Name', 'Access code', ''].map(function (h) { return el('th', { text: h }); }))]),
      body
    ]));
  }


  function setMsg(node, text, ok) { node.className = 'f-msg' + (ok ? ' ok' : ''); node.textContent = text; }

  function addOne() {
    var msg = $('add-msg');
    var d = $('n-deleg').value.trim();
    if (!d) { setMsg(msg, 'Enter a delegation.'); $('n-deleg').focus(); return; }
    DXB.api('POST', '/api/admin/delegates', { committee: sel, delegation: d, name: $('n-name').value }).then(function (r) {
      setMsg(msg, 'Added ' + r.delegate.delegation + '. Code: ' + r.delegate.code, true);
      $('n-deleg').value = ''; $('n-name').value = ''; $('n-deleg').focus();
      return refresh();
    }).catch(function (e) { setMsg(msg, e.message); });
  }

  function addBulk() {
    var out = $('bulk-out');
    out.replaceChildren();
    if (!$('bulk').value.trim()) { out.textContent = 'Paste one delegation per line first.'; return; }
    DXB.api('POST', '/api/admin/delegates/bulk', { committee: sel, lines: $('bulk').value }).then(function (r) {
      out.appendChild(el('p', {}, [el('b', { text: r.created.length + ' added' }), r.skipped.length ? ', ' + r.skipped.length + ' skipped:' : '.']));
      if (r.skipped.length) out.appendChild(el('ul', {}, r.skipped.map(function (s) { return el('li', { text: s.line + ': ' + s.reason }); })));
      if (!r.skipped.length) $('bulk').value = '';
      else $('bulk').value = r.skipped.map(function (s) { return s.line; }).join('\n');
      return refresh();
    }).catch(function (e) { out.textContent = e.message; });
  }

  function edit(d) {
    var delegation = prompt('Delegation:', d.delegation);
    if (delegation === null) return;
    var name = prompt('Delegate name (can be empty):', d.name);
    if (name === null) return;
    DXB.api('PATCH', '/api/admin/users/' + d.id, { delegation: delegation, name: name })
      .then(function () { DXB.toast('Saved'); return refresh(); })
      .catch(function (e) { DXB.toast(e.message); });
  }
  function remove(u, label) {
    if (!confirm('Remove ' + label + '? Their code stops working and they are signed out. This cannot be undone.')) return;
    DXB.api('DELETE', '/api/admin/users/' + u.id).then(function () { DXB.toast(label + ' removed'); return refresh(); })
      .catch(function (e) { DXB.toast(e.message); });
  }

  /* ---------- chair ---------- */
  function drawChair(c) {
    var box = $('chair-box');
    box.replaceChildren();
    if (c.chair) {
      box.appendChild(el('div', { class: 'chair-box' }, [
        el('div', {}, [el('b', { text: c.chair.name || 'Chair' }), el('div', {}, [el('span', { class: 'code', text: codeText(c.chair.code) })])]),
        el('div', { class: 'acts', style: 'display:flex;flex-wrap:wrap;gap:6px' }, [
          el('button', { class: 'btn ghost xs', type: 'button', text: 'Copy code', onclick: function () { DXB.copy(c.chair.code); } }),
          el('button', { class: 'btn ghost xs', type: 'button', text: 'New code', onclick: function () { newCode(c.chair, c.id + ' chair'); } }),
          el('button', { class: 'btn danger xs', type: 'button', text: 'Remove', onclick: function () { remove(c.chair, c.id + ' chair'); } })
        ])
      ]));
      return;
    }
    var name = el('input', { class: 'f-input', type: 'text', maxlength: '80', placeholder: 'Chair name (optional)', 'aria-label': 'Chair name' });
    var add = function () {
      DXB.api('POST', '/api/admin/chairs', { committee: sel, name: name.value }).then(function (r) {
        setMsg($('chair-msg'), 'Chair created. Code: ' + r.chair.code, true);
        return refresh();
      }).catch(function (e) { setMsg($('chair-msg'), e.message); });
    };
    name.addEventListener('keydown', function (e) { if (e.key === 'Enter') add(); });
    box.appendChild(el('div', { class: 'chair-box' }, [name, el('button', { class: 'btn', type: 'button', text: 'Create chair', onclick: add })]));
  }

  /* ---------- access codes ---------- */
  function codeText(code) { return showCodes ? code : String(code).slice(0, 3) + '-••••-••••'; }
  function newCode(u, label) {
    if (!confirm('Create a new code for ' + label + '? Their old code stops working and they are signed out.')) return;
    DXB.api('POST', '/api/admin/users/' + u.id + '/reset-code').then(function (r) { DXB.toast('New code for ' + label + ': ' + r.code); return refresh(); })
      .catch(function (e) { DXB.toast(e.message); });
  }

  /* ---------- committees and their screens ---------- */
  function drawNone() {
    ['sel-a', 'sel-b', 'sel-c', 'sel-d'].forEach(function (id) { $(id).textContent = '–'; });
    $('pick').replaceChildren(el('p', { class: 'empty', text: 'No committees yet. Add one below.' }));
    $('chair-box').replaceChildren(); $('screen-box').replaceChildren(); $('tbl').replaceChildren();
    $('tbl-count').textContent = '0'; $('tbl-count').classList.add('zero');
    $('rm-cm').hidden = true;
  }
  function drawScreen(c) {
    var box = $('screen-box');
    box.replaceChildren();
    $('rm-cm').hidden = false;
    if (!c.screen) { box.appendChild(el('p', { class: 'empty', text: 'No screen account yet. Run the latest supabase/setup.sql in Supabase.' })); return; }
    box.appendChild(el('div', { class: 'chair-box' }, [
      el('div', {}, [el('b', { text: c.id + ' screen' }), el('div', {}, [el('span', { class: 'code', text: codeText(c.screen.code) })])]),
      el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px' }, [
        el('button', { class: 'btn ghost xs', type: 'button', text: 'Copy code', onclick: function () { DXB.copy(c.screen.code); } }),
        el('button', { class: 'btn ghost xs', type: 'button', text: 'New code', onclick: function () { newCode(c.screen, c.id + ' screen'); } })
      ])
    ]));
  }
  function addCommittee() {
    var msg = $('cm-msg'), id = $('n-cid').value.trim(), name = $('n-cname').value.trim();
    if (!id || !name) { setMsg(msg, 'Enter an acronym and the full name.'); return; }
    DXB.api('POST', '/api/admin/committees', { id: id, name: name }).then(function (r) {
      sel = r.committee.id; $('n-cid').value = ''; $('n-cname').value = '';
      setMsg(msg, 'Added ' + r.committee.id + '. Its screen code: ' + r.screen.code, true);
      return refresh();
    }).catch(function (e) { setMsg(msg, e.message); });
  }
  function removeCommittee() {
    if (!ov.committees.length) return;
    var c = current();
    var n = c.delegates.length + (c.chair ? 1 : 0);
    var typed = prompt('This permanently removes ' + c.id + ' (' + c.name + '): its ' + n + ' account' + (n === 1 ? '' : 's') + ', its screen and all its chits.\n\nType ' + c.id + ' to confirm:');
    if (typed === null) return;
    if (typed.trim().toUpperCase() !== c.id) { DXB.toast('Not removed: the acronym did not match'); return; }
    DXB.api('DELETE', '/api/admin/committees/' + encodeURIComponent(c.id)).then(function () {
      DXB.toast(c.id + ' removed'); sel = ''; return refresh();
    }).catch(function (e) { DXB.toast(e.message); });
  }

  /* ---------- import from Excel ---------- */
  var ready = [];            // rows that passed the check and will be created
  var lastCreated = [];      // accounts created by the last import (for the download)
  var HEAD = {
    committee: /^(committees?|council|comm)$/i,
    delegation: /^(delegations?|countr(?:y|ies)|portfolios?|nations?|allocations?|states?)$/i,
    name: /^(names?|delegates?|delegate names?|students?|student names?|full names?|participants?)$/i
  };
  var CODE_HEAD = ['Committee', 'Role', 'Delegation', 'Name', 'Access code'];

  function findCommittee(v) {
    v = String(v || '').trim().toLowerCase();
    if (!v) return null;
    return ov.committees.filter(function (c) { return c.id.toLowerCase() === v || c.name.toLowerCase() === v; })[0] || null;
  }

  // sheets -> [{ committee, delegation, name, where }], finding the columns by their headings
  function toRecords(sheets) {
    var out = [];
    sheets.forEach(function (sh) {
      var rows = sh.rows.filter(function (r) { return r.some(function (c) { return String(c).trim(); }); });
      if (!rows.length) return;
      var hdr = rows[0].map(function (c) { return String(c).trim(); }), map = {}, start = 1;
      hdr.forEach(function (h, i) { Object.keys(HEAD).forEach(function (k) { if (map[k] === undefined && HEAD[k].test(h)) map[k] = i; }); });
      if (map.delegation === undefined) {            // no recognisable headings: guess from the layout
        start = 0;
        map = (findCommittee(sh.name) || hdr.length < 3) ? { delegation: 0, name: 1 } : { committee: 0, delegation: 1, name: 2 };
      }
      rows.slice(start).forEach(function (r, i) {
        var get = function (k) { return map[k] === undefined || r[map[k]] == null ? '' : String(r[map[k]]).trim(); };
        out.push({ committee: get('committee') || sh.name, delegation: get('delegation'), name: get('name'), where: sh.name + ', line ' + (i + start + 1) });
      });
    });
    return out;
  }

  // check every row against the committees we have; nothing is created yet
  function validate(recs) {
    var seen = {}, good = [], problems = [];
    recs.forEach(function (r) {
      var c = findCommittee(r.committee), isChair = /^chair(person)?$/i.test(r.delegation), why = null;
      if (!r.delegation) why = 'No delegation given';
      else if (!c) why = 'Unknown committee "' + (r.committee || '') + '"';
      else {
        var key = c.id + '|' + r.delegation.toLowerCase();
        if (seen[key]) why = 'Listed twice in the file';
        else if (isChair && c.chair) why = c.id + ' already has a chair';
        else if (!isChair && c.delegates.some(function (d) { return d.delegation.toLowerCase() === r.delegation.toLowerCase(); })) why = 'Already exists in ' + c.id;
        seen[key] = true;
      }
      if (why) problems.push({ where: r.where, delegation: r.delegation, why: why });
      else good.push({ committee: c.id, delegation: r.delegation, name: r.name });
    });
    return { good: good, problems: problems };
  }

  function onFile() {
    var f = $('imp-file').files[0], box = $('imp-preview');
    $('imp-result').replaceChildren(); box.replaceChildren(); ready = [];
    if (!f) return;
    if (!ov || !ov.committees.length) { box.appendChild(el('p', { class: 'f-msg', text: 'Add at least one committee first.' })); return; }
    DXBSheets.readFile(f).then(function (sheets) {
      var recs = toRecords(sheets);
      if (!recs.length) throw new Error('No rows found. The first row should have the headings Committee, Delegation and Name.');
      showPreview(validate(recs), recs.length);
    }).catch(function (e) { box.appendChild(el('p', { class: 'f-msg', text: e.message })); });
  }

  function showPreview(v, total) {
    var box = $('imp-preview');
    ready = v.good;
    box.appendChild(el('p', { class: 'imp-sum' }, [el('b', { text: v.good.length + ' ready to create' }), ' · ' + v.problems.length + ' will be skipped · ' + total + ' rows read']));
    if (v.good.length) {
      var body = el('tbody');
      v.good.slice(0, 8).forEach(function (r) { body.appendChild(el('tr', {}, [el('td', { text: r.committee }), el('td', {}, [el('b', { text: r.delegation })]), el('td', { text: r.name || '–' })])); });
      box.appendChild(el('div', { class: 'tbl-wrap' }, [el('table', { class: 'tbl' }, [el('thead', {}, [el('tr', {}, ['Committee', 'Delegation', 'Name'].map(function (h) { return el('th', { text: h }); }))]), body])]));
      if (v.good.length > 8) box.appendChild(el('p', { class: 'pt-sub', text: '…and ' + (v.good.length - 8) + ' more.' }));
    }
    if (v.problems.length) {
      box.appendChild(el('p', { class: 'imp-bad', text: 'These rows will be skipped:' }));
      var ul = el('ul', { class: 'imp-list' });
      v.problems.slice(0, 12).forEach(function (p) { ul.appendChild(el('li', { text: p.where + (p.delegation ? ' (' + p.delegation + ')' : '') + ': ' + p.why })); });
      if (v.problems.length > 12) ul.appendChild(el('li', { text: '…and ' + (v.problems.length - 12) + ' more.' }));
      box.appendChild(ul);
    }
    box.appendChild(el('div', { class: 'imp-actions' }, [
      el('button', { class: 'btn', id: 'imp-go', type: 'button', text: v.good.length ? 'Create ' + v.good.length + ' account' + (v.good.length === 1 ? '' : 's') : 'Nothing to create', disabled: v.good.length ? null : true, onclick: doImport }),
      el('button', { class: 'btn ghost', type: 'button', text: 'Cancel', onclick: function () { $('imp-file').value = ''; box.replaceChildren(); ready = []; } })
    ]));
  }

  function doImport() {
    var rows = ready.slice(), created = [], skipped = [], go = $('imp-go');
    go.disabled = true; go.textContent = 'Creating…';
    function next(i) {
      if (i >= rows.length) return Promise.resolve();
      return DXB.api('POST', '/api/admin/import', { rows: rows.slice(i, i + 400) }).then(function (r) {
        created = created.concat(r.created); skipped = skipped.concat(r.skipped);
        return next(i + 400);
      });
    }
    next(0).then(function () { return null; }, function (e) { return e; }).then(function (err) {
      lastCreated = created; ready = [];
      $('imp-preview').replaceChildren(); $('imp-file').value = '';
      showResult(created, skipped, err);
      return refresh();
    });
  }

  function showResult(created, skipped, err) {
    var box = $('imp-result');
    box.replaceChildren();
    box.appendChild(el('p', { class: 'imp-sum' }, [el('b', { text: created.length + ' account' + (created.length === 1 ? '' : 's') + ' created' }), skipped.length ? ' · ' + skipped.length + ' skipped' : '']));
    if (err) box.appendChild(el('p', { class: 'f-msg', text: 'Stopped early: ' + err.message }));
    if (created.length) box.appendChild(el('div', { class: 'imp-actions' }, [el('button', { class: 'btn', type: 'button', text: 'Download these codes (Excel)', onclick: downloadNewCodes })]));
    if (skipped.length) {
      var ul = el('ul', { class: 'imp-list' });
      skipped.slice(0, 12).forEach(function (s) { ul.appendChild(el('li', { text: (s.committee ? s.committee + ' · ' : '') + (s.delegation || 'row ' + s.row) + ': ' + s.reason })); });
      box.appendChild(ul);
    }
    if (created.length) DXB.toast(created.length + ' accounts created. Download the codes now.');
  }

  function codesXlsx(rows, filename) {
    DXBSheets.download(DXBSheets.buildXlsx([{ name: 'Access codes', rows: [CODE_HEAD].concat(rows), widths: [14, 11, 30, 28, 18] }]), filename);
  }
  function downloadNewCodes() {
    codesXlsx(lastCreated.map(function (c) { return [c.committee, c.role, c.delegation, c.name, c.code]; }), 'dxb-mun-new-codes.xlsx');
    DXB.toast('Downloaded ' + lastCreated.length + ' codes. Keep the file private.');
  }
  function downloadAllXlsx() {
    var rows = [];
    ov.committees.forEach(function (c) {
      if (c.chair) rows.push([c.id, 'Chair', 'Chair', c.chair.name, c.chair.code]);
      if (c.screen) rows.push([c.id, 'Screen', 'Committee screen', '', c.screen.code]);
      c.delegates.forEach(function (d) { rows.push([c.id, 'Delegate', d.delegation, d.name, d.code]); });
    });
    codesXlsx(rows, 'dxb-mun-access-codes.xlsx');
    DXB.toast('Downloaded ' + rows.length + ' codes. Keep the file private.');
  }
  function downloadTemplate() {
    var a = ov && ov.committees.length ? ov.committees[0].id : 'UNSC', b = ov && ov.committees.length > 1 ? ov.committees[1].id : a;
    DXBSheets.download(DXBSheets.buildXlsx([{ name: 'Delegates', rows: [['Committee', 'Delegation', 'Name'], [a, 'Chair', 'Example Chair'], [a, 'France', 'Example Name'], [b, 'Brazil', 'Example Name']], widths: [16, 30, 28] }]), 'dxb-mun-import-template.xlsx');
  }

  /* ---------- export ---------- */
  function downloadCsv() {
    var rows = [['Committee', 'Role', 'Delegation', 'Name', 'Access code']];
    ov.committees.forEach(function (c) {
      if (c.chair) rows.push([c.id, 'Chair', 'Chair', c.chair.name, c.chair.code]);
      if (c.screen) rows.push([c.id, 'Screen', 'Committee screen', '', c.screen.code]);
      c.delegates.forEach(function (d) { rows.push([c.id, 'Delegate', d.delegation, d.name, d.code]); });
    });
    var csv = rows.map(function (r) { return r.map(function (v) { v = String(v == null ? '' : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
    var a = el('a', { href: URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })), download: 'dxb-mun-access-codes.csv' });
    document.body.appendChild(a); a.click(); a.remove();
    DXB.toast('Downloaded ' + (rows.length - 1) + ' accounts with their codes. Keep this file private.');
  }

  /* ---------- all chits ---------- */
  var STATUS = { pending: 'Waiting', delivered: 'Delivered', rejected: 'Not approved' };
  function loadChits() {
    return DXB.api('GET', '/api/admin/chits').then(function (r) {
      var key = JSON.stringify(r);
      if (key === last.chits) return;
      last.chits = key;
      var box = $('log');
      box.replaceChildren();
      if (!r.chits.length) { box.appendChild(el('p', { class: 'empty', text: 'No chits have been sent yet.' })); return; }
      r.chits.forEach(function (c) {
        box.appendChild(el('article', { class: 'chit' }, [
          el('div', { class: 'chit-top' }, [
            el('span', { class: 'chit-route' }, [c.committee + ' · ' + c.from, el('i', { text: '→' }), c.to]),
            el('span', { class: 'chit-meta' }, [el('span', { class: 'pill ' + c.status, text: STATUS[c.status] || c.status }), ' ' + DXB.ago(c.createdAt)])
          ]),
          el('p', { class: 'chit-text', text: c.text }),
          c.note ? el('p', { class: 'chit-note', text: 'Chair’s note: ' + c.note }) : null
        ]));
      });
    }).catch(function () {});
  }
})();
