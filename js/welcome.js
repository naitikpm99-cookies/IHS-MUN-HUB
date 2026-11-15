// DXB MUN welcome animation (homepage only). The admin presses play; the page sees the new press and plays it.
(function () {
  if (!window.DXB || !DXB.configured || !DXB.configured()) return;
  var el = DXB.el, reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var base = null, busy = false;
  var STAGES = [
    { cls: 'n', text: '5', ms: 950 }, { cls: 'n', text: '4', ms: 950 }, { cls: 'n', text: '3', ms: 950 },
    { cls: 'n', text: '2', ms: 950 }, { cls: 'n', text: '1', ms: 950 },
    { word: true, text: 'DELEGATES', ms: 1300 },
    { word: true, text: 'ARE YOU READY?', ms: 1500 },
    { word: true, text: 'WELCOME', ms: 1300 },
    { cls: 'final', text: 'DXB MUN', ms: 3200 }
  ];

  DXB.poll(function () {
    DXB.api('GET', '/api/welcome').then(function (s) {
      if (base === null) { base = s.seq; return; }
      if (s.seq > base) { base = s.seq; if (!busy) play(); }
    }).catch(function () {});
  }, 2000);

  function play() {
    busy = true;
    var stage = el('div', { class: 'wa-stage' });
    var parts = el('div', { class: 'wa-parts' });
    for (var i = 0; i < 46; i++) {
      var p = el('i', { class: 'wa-p' });
      p.style.setProperty('--x', ((Math.random() * 2 - 1) * 46).toFixed(1) + 'vw');
      p.style.setProperty('--y', ((Math.random() * 2 - 1) * 46).toFixed(1) + 'vh');
      p.style.setProperty('--s', (5 + Math.random() * 12).toFixed(1) + 'px');
      p.style.setProperty('--d', (Math.random() * 0.4).toFixed(2) + 's');
      parts.appendChild(p);
    }
    var root = el('div', { class: 'wa-overlay', role: 'dialog', 'aria-label': 'Welcome to DXB MUN' }, [
      el('div', { class: 'wa-bg' }),
      el('div', { class: 'wa-rays' }),
      parts,
      el('div', { class: 'wa-ring' }),
      stage
    ]);
    document.body.appendChild(root);
    requestAnimationFrame(function () { root.classList.add('is-on'); });
    document.addEventListener('keydown', onKey);

    function onKey(e) { if (e.key === 'Escape') finish(); }
    function burst() {
      var ring = root.querySelector('.wa-ring'), pts = root.querySelector('.wa-parts');
      ring.classList.remove('go'); void ring.offsetWidth; ring.classList.add('go');
      pts.classList.remove('go'); void pts.offsetWidth; pts.classList.add('go');
    }
    function show(i) {
      if (i >= STAGES.length || !root.parentNode) { finish(); return; }
      var st = STAGES[i], node;
      stage.replaceChildren();
      if (st.word) {
        node = el('div', { class: 'wa-word' }, st.text.split('').map(function (ch, k) {
          return el('span', { class: 'wa-ch', style: '--i:' + k, text: ch === ' ' ? '\u00a0' : ch });
        }));
      } else {
        node = el('div', { class: 'wa-big ' + st.cls, text: st.text });
      }
      stage.appendChild(node);
      burst();
      setTimeout(function () { show(i + 1); }, reduce ? Math.min(st.ms, 500) : st.ms);
    }
    function finish() {
      if (!root.parentNode) return;
      document.removeEventListener('keydown', onKey);
      root.classList.add('is-out');
      setTimeout(function () { if (root.parentNode) root.parentNode.removeChild(root); busy = false; }, 900);
    }
    show(0);
  }
})();