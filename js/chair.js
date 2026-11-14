// DXB MUN – chair dashboard: approve or reject the chits of your committee, read chits sent to you.
(function () {
  var el = DXB.el;
  var $ = function (id) { return document.getElementById(id); };
  var last = {};
  var rejecting = {};   // chit id -> true while its "reject" note box is open
  var notes = {};       // chit id -> note text typed so far
  var data = null;
  var deferred = false;
  var baseTitle = document.title;

  DXB.guard('chair').then(function (info) {
    $('hello').textContent = info.committee.id + ' chair';
    $('id-delegation').textContent = info.committee.name;
    $('id-committee').textContent = info.committee.id;
    $('id-name').textContent = info.user.name || 'Committee chair';
    $('logout').addEventListener('click', DXB.signOut);
    wireShortcuts();
    DXB.crisisChair();
    $('queue').addEventListener('focusout', function () {
      setTimeout(function () { if (deferred && !$('queue').contains(document.activeElement)) { deferred = false; drawQueue(); } }, 0);
    });
    DXB.poll(loadChits, 3000);
    DXB.poll(loadRoster, 20000);
  }).catch(function (e) { if (e.message !== 'Signed out') DXB.toast(e.message); });

  function wireShortcuts() {
    [].slice.call(document.querySelectorAll('.chair-tools [data-jump]')).forEach(function (button) {
      button.addEventListener('click', function () {
        var target = $(button.dataset.jump);
        if (target) target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      });
    });
  }

  function loadRoster() {
    return DXB.api('GET', '/api/chair/roster').then(function (r) {
      $('s-del').textContent = r.delegates.length;
      var ul = $('roster');
      ul.replaceChildren();
      if (!r.delegates.length) { ul.appendChild(el('li', {}, [el('span', { text: 'No delegations have been added yet.' })])); return; }
      r.delegates.forEach(function (d) { ul.appendChild(el('li', {}, [el('b', { text: d.delegation }), el('span', { text: d.name || '–' })])); });
    }).catch(function () {});
  }

  function loadChits() {
    return DXB.api('GET', '/api/chair/chits').then(function (r) {
      var key = JSON.stringify(r);
      if (key === last.all) return;
      var grew = data && r.pending.length > data.pending.length;
      last.all = key; data = r;
      $('s-wait').textContent = r.pending.length;
      $('s-ok').textContent = r.log.filter(function (c) { return c.status === 'delivered'; }).length;
      $('s-no').textContent = r.log.filter(function (c) { return c.status === 'rejected'; }).length;
      document.title = (r.pending.length ? '(' + r.pending.length + ') ' : '') + baseTitle;
      if (grew) DXB.toast('New chit waiting for approval');
      var a = document.activeElement;
      if ($('queue').contains(a) && a.tagName === 'INPUT') deferred = true; else drawQueue();
      drawToChair(); drawLog();
    }).catch(function () {});
  }

  function count(id, n) { $(id).textContent = n; $(id).classList.toggle('zero', !n); }

  function drawQueue() {
    var box = $('queue');
    box.replaceChildren();
    count('q-count', data.pending.length);
    if (!data.pending.length) { box.appendChild(el('p', { class: 'empty', text: 'Nothing waiting. New chits will appear here automatically.' })); return; }
    data.pending.forEach(function (c) {
      var card = el('article', { class: 'chit is-new' }, [
        el('div', { class: 'chit-top' }, [
          el('span', { class: 'chit-route' }, [c.from, el('i', { text: '→' }), c.to]),
          el('span', { class: 'chit-meta', text: (c.fromName ? 'from ' + c.fromName + ' · ' : '') + DXB.ago(c.createdAt) })
        ]),
        el('p', { class: 'chit-text', text: c.text })
      ]);
      var actions = el('div', { class: 'chit-actions' }, [
        el('button', { class: 'btn xs', type: 'button', text: 'Approve & deliver', onclick: function () { decide(c, 'approve'); } }),
        el('button', { class: 'btn danger xs', type: 'button', text: 'Reject', onclick: function () { rejecting[c.id] = true; drawQueue(); } })
      ]);
      if (rejecting[c.id]) {
        var input = el('input', { class: 'f-input', type: 'text', maxlength: '200', placeholder: 'Note for the sender (optional)', value: notes[c.id] || '',
          oninput: function (e) { notes[c.id] = e.target.value; },
          onkeydown: function (e) { if (e.key === 'Enter') decide(c, 'reject'); } });
        card.appendChild(el('div', { class: 'reject-row' }, [
          input,
          el('button', { class: 'btn danger xs', type: 'button', text: 'Confirm reject', onclick: function () { decide(c, 'reject'); } }),
          el('button', { class: 'btn ghost xs', type: 'button', text: 'Cancel', onclick: function () { delete rejecting[c.id]; drawQueue(); } })
        ]));
        setTimeout(function () { input.focus(); }, 0);
      } else card.appendChild(actions);
      box.appendChild(card);
    });
  }

  function decide(c, action) {
    DXB.api('POST', '/api/chair/chits/' + c.id, { action: action, note: notes[c.id] || '' }).then(function () {
      delete rejecting[c.id]; delete notes[c.id];
      DXB.toast(action === 'approve' ? 'Delivered to ' + c.to : 'Chit rejected');
      last.all = null; return loadChits();
    }).catch(function (e) { DXB.toast(e.message); last.all = null; loadChits(); });
  }

  function drawToChair() {
    var box = $('tochair');
    box.replaceChildren();
    count('c-count', data.toChair.length);
    if (!data.toChair.length) { box.appendChild(el('p', { class: 'empty', text: 'No messages addressed to you.' })); return; }
    data.toChair.forEach(function (c) {
      box.appendChild(el('article', { class: 'chit' }, [
        el('div', { class: 'chit-top' }, [
          el('span', { class: 'chit-route' }, ['From ', el('i', { text: '·' }), c.from]),
          el('span', { class: 'chit-meta', text: (c.fromName ? c.fromName + ' · ' : '') + DXB.ago(c.createdAt) })
        ]),
        el('p', { class: 'chit-text', text: c.text })
      ]));
    });
  }

  var STATUS = { delivered: 'Delivered', rejected: 'Not approved' };
  function drawLog() {
    var box = $('log');
    box.replaceChildren();
    if (!data.log.length) { box.appendChild(el('p', { class: 'empty', text: 'Chits you have handled will be listed here.' })); return; }
    data.log.forEach(function (c) {
      box.appendChild(el('article', { class: 'chit' }, [
        el('div', { class: 'chit-top' }, [
          el('span', { class: 'chit-route' }, [c.from, el('i', { text: '→' }), c.to]),
          el('span', { class: 'chit-meta' }, [el('span', { class: 'pill ' + c.status, text: STATUS[c.status] || c.status }), ' ' + DXB.clock(c.createdAt)])
        ]),
        el('p', { class: 'chit-text', text: c.text }),
        c.note ? el('p', { class: 'chit-note', text: 'Your note: ' + c.note }) : null
      ]));
    });
  }
})();
