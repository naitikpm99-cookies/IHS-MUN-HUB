// DXB MUN – committee screen: the display shown on the big screen in a committee room.
(function () {
  var el = DXB.el;
  var $ = function (id) { return document.getElementById(id); };
  var last = '';
  var wake = null;

  DXB.guard('committee').then(function (info) {
    $('c-acr').textContent = info.committee.id;
    $('c-name').textContent = info.committee.name;
    document.title = info.committee.id + ' · DXB MUN';
    $('logout').addEventListener('click', DXB.signOut);
    $('fs').addEventListener('click', toggleFs);
    document.addEventListener('keydown', function (e) { if (e.key === 'f' || e.key === 'F') toggleFs(); });
    document.addEventListener('fullscreenchange', function () { $('fs').textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen'; });
    clock(); setInterval(clock, 1000);
    controls();
    keepAwake();
    DXB.crisisWatch();
    DXB.poll(load, 15000);
  }).catch(function (e) { if (e.message !== 'Signed out') DXB.toast(e.message); });

  function clock() {
    var d = new Date();
    $('c-time').textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    $('c-date').textContent = d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function load() {
    return DXB.api('GET', '/api/committee/screen').then(function (r) {
      var key = JSON.stringify(r);
      if (key === last) return;
      last = key;
      $('c-name').textContent = r.committee.name;
      $('c-chair').hidden = !r.chair;
      $('c-chair-name').textContent = r.chair || '';
      $('c-count').textContent = r.delegations.length;
      var ul = $('c-list');
      ul.replaceChildren();
      r.delegations.forEach(function (d) { ul.appendChild(el('li', { text: d })); });
    }).catch(function () {});
  }

  // controls fade away when nobody is touching the screen
  function controls() {
    var ui = $('scr-ui'), timer;
    function wakeUi() {
      ui.classList.add('show'); document.body.classList.remove('idle');
      clearTimeout(timer);
      timer = setTimeout(function () { ui.classList.remove('show'); document.body.classList.add('idle'); }, 3000);
    }
    ['mousemove', 'mousedown', 'touchstart', 'keydown'].forEach(function (ev) { document.addEventListener(ev, wakeUi, { passive: true }); });
    wakeUi();
  }

  function toggleFs() {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    var r = document.documentElement;
    if (r.requestFullscreen) r.requestFullscreen().catch(function () {});
  }

  // stop the display from sleeping where the browser allows it
  function keepAwake() {
    function get() { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { wake = l; }).catch(function () {}); }
    get();
    document.addEventListener('visibilitychange', function () { if (!document.hidden) get(); });
  }
})();