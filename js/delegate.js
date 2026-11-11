// DXB MUN – delegate dashboard: pick a delegation, send a chit, read your inbox, track what you sent.
(function () {
  var el = DXB.el;
  var $ = function (id) { return document.getElementById(id); };
  var me = null;
  var roster = { delegations: [], chair: null };
  var picked = null;          // { id, label, chair }
  var replyTo = null;         // id of the chit we are answering
  var seen = {};              // inbox chits already read
  var last = {};              // what is on screen, so we only redraw when something changed
  var inboxData = [];
  var baseTitle = document.title;

  function seenKey() { return 'dxbmun_seen_' + me.id; }
  function loadSeen() { try { (JSON.parse(localStorage.getItem(seenKey())) || []).forEach(function (id) { seen[id] = true; }); } catch (e) {} }
  function saveSeen() { try { localStorage.setItem(seenKey(), JSON.stringify(Object.keys(seen))); } catch (e) {} }

  DXB.guard('delegate').then(function (info) {
    me = info.user;
    $('hello').textContent = me.name || me.delegation || 'Delegate';
    $('id-delegation').textContent = me.delegation || 'Delegate';
    $('id-committee').textContent = info.committee.id + ' · ' + info.committee.name;
    $('id-name').textContent = me.name || me.delegation || 'Delegate';
    loadSeen();
    $('logout').addEventListener('click', DXB.signOut);
    wire();
    wireShortcuts();
    DXB.poll(loadChits, 4000);
    DXB.poll(loadRoster, 20000);
    wireParallax();
  }).catch(function (e) { if (e.message !== 'Signed out') DXB.toast(e.message); });

  function wireParallax() {
    var stage = $('delegate-stage'), wrap = $('delegate-card-wrap');
    if (!stage || !wrap || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(pointer: fine)').matches) return;
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - .5;
      var y = (e.clientY - r.top) / r.height - .5;
      wrap.style.transform = 'perspective(1100px) rotateY(' + (x * 7) + 'deg) rotateX(' + (-y * 6) + 'deg) translate3d(' + (x * 10) + 'px,' + (y * 8) + 'px,0)';
    });
    stage.addEventListener('pointerleave', function () { wrap.style.transform = ''; });
  }

  function wireShortcuts() {
    [].slice.call(document.querySelectorAll('.delegate-tools [data-jump]')).forEach(function (button) {
      button.addEventListener('click', function () {
        var target = $(button.dataset.jump);
        if (!target) return;
        target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        if (button.dataset.jump === 'send-h') $('filter').focus();
      });
    });
  }

  /* ---------- choosing who to write to ---------- */
  function loadRoster() {
    return DXB.api('GET', '/api/delegate/roster').then(function (r) {
      // Never trust a roster response blindly: the current delegate must not be able
      // to select their own account, even if stale or misconfigured server data includes it.
      r.delegations = (r.delegations || []).filter(function (d) { return d.id !== me.id; });
      var key = JSON.stringify(r);
      if (key === last.roster) return;
      last.roster = key; roster = r;
      if (picked && !(picked.chair ? r.chair : r.delegations.some(function (d) { return d.id === picked.id; }))) picked = null;
      drawRoster(); drawToLine();
    }).catch(function () {});
  }
  function pick(p) { picked = p; drawRoster(); drawToLine(); updateSend(); $('text').focus(); }
  function drawRoster() {
    var q = $('filter').value.trim().toLowerCase();
    var box = $('roster');
    box.replaceChildren();
    var items = [];
    if (roster.chair) items.push({ id: roster.chair.id, label: 'Chair', chair: true });
    roster.delegations.filter(function (d) { return d.id !== me.id; }).forEach(function (d) { items.push({ id: d.id, label: d.delegation, chair: false }); });
    items = items.filter(function (i) { return !q || i.label.toLowerCase().indexOf(q) > -1; });
    if (!items.length) { box.appendChild(el('p', { class: 'empty', text: roster.delegations.length || roster.chair ? 'No delegation matches your search.' : 'No other delegations have been added to your committee yet.' })); return; }
    items.forEach(function (i) {
      box.appendChild(el('button', {
        type: 'button', role: 'radio', class: 'chip-btn' + (i.chair ? ' is-chair' : ''), text: i.label,
        'aria-checked': String(!!picked && picked.id === i.id),
        onclick: function () { replyTo = null; pick(i); drawToLine(); }
      }));
    });
  }
  function drawToLine() {
    var t = $('to-line');
    if (!picked) { t.textContent = 'Pick a delegation above to start.'; $('hint').textContent = 'Approved by the chair before delivery.'; }
    else if (picked.chair) { t.textContent = 'To: the Chair. Delivered straight away.'; $('hint').textContent = 'Goes directly to your chair.'; }
    else { t.textContent = 'To: ' + picked.label + '. Goes via the Chair for approval.'; $('hint').textContent = 'Approved by the chair before delivery.'; }
    $('reply-bar').hidden = !replyTo;
    var guide = $('delegate-guide');
    if (!guide) return;
    if (!picked) guide.replaceChildren(el('b', { text: 'Start here' }), el('span', { text: 'Choose a delegation, write your message, then send it to the chair for approval.' }));
    else if (picked.chair) guide.replaceChildren(el('b', { text: 'Direct line' }), el('span', { text: 'Your message will be delivered directly to the Chair.' }));
    else guide.replaceChildren(el('b', { text: 'Ready to write' }), el('span', { text: 'Your chit to ' + picked.label + ' will go to the Chair for approval first.' }));
  }

  /* ---------- writing and sending ---------- */
  function updateSend() {
    var n = $('text').value.length;
    $('count').textContent = n + ' / 500';
    $('send').disabled = !picked || !$('text').value.trim();
  }
  function wire() {
    $('filter').addEventListener('input', drawRoster);
    $('text').addEventListener('input', updateSend);
    $('reply-cancel').addEventListener('click', function () { replyTo = null; $('reply-bar').hidden = true; drawToLine(); });
    $('read-all').addEventListener('click', function () { inboxData.forEach(function (c) { seen[c.id] = true; }); saveSeen(); drawInbox(true); });
    $('send').addEventListener('click', send);
    $('text').addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !$('send').disabled) send(); });
  }
  function send() {
    var msg = $('send-msg');
    msg.className = 'f-msg'; msg.textContent = '';
    $('send').disabled = true;
    DXB.api('POST', '/api/chits', { to: picked.id, text: $('text').value, replyTo: replyTo }).then(function (r) {
      var toChair = r.chit.status === 'delivered';
      DXB.toast(toChair ? 'Sent to the Chair' : 'Chit sent to your chair for approval');
      $('text').value = ''; replyTo = null; drawToLine(); updateSend();
      return loadChits();
    }).catch(function (e) { msg.textContent = e.message; updateSend(); });
  }

  /* ---------- inbox and sent ---------- */
  function loadChits() {
    return DXB.api('GET', '/api/chits').then(function (r) {
      inboxData = r.inbox;
      var key = JSON.stringify(r);
      if (key === last.chits) return;
      last.chits = key;
      drawInbox(true); drawSent(r.sent);
    }).catch(function () {});
  }
  function drawInbox() {
    var box = $('inbox');
    box.replaceChildren();
    var unread = inboxData.filter(function (c) { return !seen[c.id]; }).length;
    $('in-count').textContent = String(unread || inboxData.length);
    $('in-count').classList.toggle('zero', !unread);
    $('read-all').hidden = !unread;
    var toolCount = $('tool-in-count');
    if (toolCount) { toolCount.textContent = unread; toolCount.hidden = !unread; }
    document.title = (unread ? '(' + unread + ') ' : '') + baseTitle;
    if (!inboxData.length) { box.appendChild(el('p', { class: 'empty', text: 'No chits yet. Messages approved by your chair appear here.' })); return; }
    inboxData.forEach(function (c) {
      var isNew = !seen[c.id];
      box.appendChild(el('article', { class: 'chit' + (isNew ? ' is-new' : '') }, [
        el('div', { class: 'chit-top' }, [
          el('span', { class: 'chit-route' }, ['From ', el('i', { text: '·' }), c.from]),
          el('span', { class: 'chit-meta' }, [isNew ? el('span', { class: 'pill new', text: 'New' }) : null, ' ' + DXB.ago(c.createdAt)])
        ]),
        el('p', { class: 'chit-text', text: c.text }),
        el('div', { class: 'chit-actions' }, [
          el('button', { class: 'btn xs', type: 'button', text: 'Reply', onclick: function () { startReply(c); } }),
          isNew ? el('button', { class: 'btn ghost xs', type: 'button', text: 'Mark read', onclick: function () { seen[c.id] = true; saveSeen(); drawInbox(); } }) : null
        ])
      ]));
    });
  }
  function startReply(c) {
    seen[c.id] = true; saveSeen();
    var target = roster.delegations.filter(function (d) { return d.id === c.fromId; })[0];
    if (!target) { DXB.toast('That delegation is no longer in the committee'); return; }
    replyTo = c.id;
    pick({ id: target.id, label: target.delegation, chair: false });
    $('reply-text').textContent = 'Replying to ' + c.from;
    drawToLine(); drawInbox();
    $('send-h').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  var STATUS = { pending: 'Waiting for chair', delivered: 'Delivered', rejected: 'Not approved' };
  function drawSent(list) {
    var box = $('sent');
    box.replaceChildren();
    if (!list.length) { box.appendChild(el('p', { class: 'empty', text: 'You have not sent any chits yet.' })); return; }
    list.forEach(function (c) {
      box.appendChild(el('article', { class: 'chit' }, [
        el('div', { class: 'chit-top' }, [
          el('span', { class: 'chit-route' }, ['To ', el('i', { text: '·' }), c.to]),
          el('span', { class: 'chit-meta' }, [el('span', { class: 'pill ' + c.status, text: STATUS[c.status] || c.status }), ' ' + DXB.ago(c.createdAt)])
        ]),
        el('p', { class: 'chit-text', text: c.text }),
        c.status === 'rejected' ? el('p', { class: 'chit-note', text: c.note ? 'Chair’s note: ' + c.note : 'The chair did not approve this chit.' }) : null
      ]));
    });
  }
})();
