// DXB MUN – floor timer on the committee screen (the display in the room). Read-only: the chair runs it.
(function () {
  var root = document.getElementById('scr-floor');
  if (!root || !window.DXBFloor) return;
  var F = DXBFloor, el = DXB.el;
  var $ = function (id) { return document.getElementById(id); };
  var clocks = { speaker: F.Clock(), caucus: F.Clock(), general: F.Clock() };
  var S = null, lineKey = '', orderKey = '';

  F.watch(function (s) {
    S = s;
    F.syncClocks(s, clocks);
    var active = !!(s.session || s.general_timer);
    document.body.classList.toggle('floor-on', active);
    root.hidden = !active;
    $('c-chip').textContent = s.committee.id;
    drawOrder();
    draw();
  }, 2500);
  setInterval(draw, 250);

  function setLine(key, nodes) {
    if (key === lineKey) return;
    lineKey = key;
    var p = $('fl-speaker');
    p.replaceChildren.apply(p, nodes);
  }

  function draw() {
    if (!S || root.hidden) return;
    var ss = S.session, t = S.timer, g = S.general_timer, big = null, counting = true, sub = '', fmt = ss ? F.NAMES[ss.mode] : 'Timer';
    if (t) {
      big = clocks.speaker.get();
      setLine('s:' + t.user + ':' + (ss ? ss.mode : ''), [el('strong', { text: t.country || 'A delegate' }), document.createTextNode(ss && F.SPEECH[ss.mode] ? ' is giving ' + F.SPEECH[ss.mode] : ' has the floor')]);
      sub = big > 0 ? 'Time remaining' : 'Time is up';
    } else if (ss && ss.mode === 'unmoderated_caucus') {
      big = clocks.caucus.get();
      setLine('u', [document.createTextNode('Unmoderated caucus')]);
      sub = big > 0 ? 'Time remaining' : 'Caucus time is up';
    } else if (ss) {
      counting = false; big = ss.duration;
      setLine('w:' + S.session_finished, [document.createTextNode(S.session_finished ? 'Caucus time is up' : 'Waiting for the next speaker')]);
      sub = 'Speaking time per delegate';
    } else if (g) {
      big = clocks.general.get();
      setLine('g', [document.createTextNode('General timer')]);
      sub = g.running ? 'Timer running' : big > 0 ? 'Timer paused' : 'Time is up';
    }
    $('fl-format').textContent = fmt;
    $('fl-clock').textContent = big === null ? '--:--' : F.format(big);
    $('fl-clock').classList.toggle('low', counting && big > 0 && big <= 10);
    $('fl-clock').classList.toggle('done', counting && big === 0);
    $('fl-sub').textContent = sub;

    var showCaucus = !!(ss && ss.mode === 'moderated_caucus'), showGen = !!(g && ss);
    $('fl-caucus').hidden = !showCaucus;
    if (showCaucus) { var cr = clocks.caucus.get(); $('fl-caucus-t').textContent = F.format(cr); $('fl-caucus-l').textContent = cr > 0 ? 'Caucus time left' : 'Caucus time is up'; }
    $('fl-general').hidden = !showGen;
    if (showGen) { $('fl-general-t').textContent = F.format(clocks.general.get()); $('fl-general-l').textContent = g.running ? 'General timer' : 'General timer · paused'; }
    $('fl-extra').hidden = !showCaucus && !showGen;
  }

  // the speaking order: the current speaker and the next few
  function drawOrder() {
    var ss = S.session, show = !!(ss && ss.mode === 'gsl');
    $('fl-order').hidden = !show;
    root.classList.toggle('no-order', !show);
    if (!show) return;
    var now = S.timer ? S.timer.user : null;
    var key = JSON.stringify([S.queue.map(function (q) { return q.id; }), now]);
    if (key === orderKey) return;
    orderKey = key;
    var ul = $('fl-queue'), q = S.queue, from = 0;
    ul.replaceChildren();
    $('fl-order-n').textContent = q.length;
    if (!q.length) { ul.appendChild(el('li', { class: 'fl-empty', text: 'No speakers yet' })); return; }
    var idx = q.findIndex(function (x) { return x.user === now; });
    if (idx > 0) from = idx;
    q.slice(from, from + 9).forEach(function (x) { ul.appendChild(el('li', { class: x.user === now ? 'is-now' : '', text: x.country })); });
    if (q.length > from + 9) ul.appendChild(el('li', { class: 'fl-empty', text: '+ ' + (q.length - from - 9) + ' more' }));
  }
})();
