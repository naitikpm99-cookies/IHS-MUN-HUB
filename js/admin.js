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
