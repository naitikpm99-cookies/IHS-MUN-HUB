// DXB MUN – shared portal helpers (sign-in, database calls, small DOM tools) and the login page.
// Every portal page loads js/config.js and then this file. All permission checks happen inside the
// Supabase database functions (supabase/setup.sql), never in the browser.
(function () {
  var TOKEN = 'dxbmun_token';
  var HOME = { admin: 'admin.html', chair: 'chair.html', delegate: 'dashboard.html', committee: 'committee.html' };
  var CFG = window.DXB_CONFIG || {};
  var DXB = window.DXB = {};

  try { localStorage.removeItem(TOKEN); } catch (e) {}
  DXB.token = function () { try { return sessionStorage.getItem(TOKEN); } catch (e) { return null; } };
  DXB.setToken = function (t) { try { sessionStorage.setItem(TOKEN, t); } catch (e) {} };
  DXB.clear = function () { try { sessionStorage.removeItem(TOKEN); } catch (e) {} };

  // The pages ask for things like ('GET', '/api/chits'). Each one maps onto a database function.
  var ID = '([0-9a-fA-F-]{36})';
  var ROUTES = [
    ['POST', /^\/api\/login$/, function (m, b) { return ['login', { p_code: String(b.code || '') }, false]; }],
    ['POST', /^\/api\/logout$/, function () { return ['logout', {}]; }],
    ['GET', /^\/api\/me$/, function () { return ['me', {}]; }],
    ['GET', /^\/api\/delegate\/roster$/, function () { return ['delegate_roster', {}]; }],
    ['GET', /^\/api\/chits$/, function () { return ['my_chits', {}]; }],
    ['POST', /^\/api\/chits$/, function (m, b) { return ['send_chit', { p_to: b.to, p_text: b.text, p_reply_to: b.replyTo || null }]; }],
    ['GET', /^\/api\/chair\/chits$/, function () { return ['chair_chits', {}]; }],
    ['POST', new RegExp('^/api/chair/chits/' + ID + '$'), function (m, b) { return ['chair_decide', { p_id: m[1], p_action: b.action, p_note: b.note || '' }]; }],
    ['GET', /^\/api\/chair\/roster$/, function () { return ['chair_roster', {}]; }],
    ['GET', /^\/api\/admin\/overview$/, function () { return ['admin_overview', {}]; }],
    ['POST', /^\/api\/admin\/delegates$/, function (m, b) { return ['admin_add_delegate', { p_committee: b.committee, p_delegation: b.delegation, p_name: b.name || '' }]; }],
    ['POST', /^\/api\/admin\/delegates\/bulk$/, function (m, b) { return ['admin_bulk_add', { p_committee: b.committee, p_lines: b.lines || '' }]; }],
    ['POST', /^\/api\/admin\/chairs$/, function (m, b) { return ['admin_add_chair', { p_committee: b.committee, p_name: b.name || '' }]; }],
    ['PATCH', new RegExp('^/api/admin/users/' + ID + '$'), function (m, b) { return ['admin_update_user', { p_id: m[1], p_name: b.name, p_delegation: b.delegation }]; }],
    ['DELETE', new RegExp('^/api/admin/users/' + ID + '$'), function (m) { return ['admin_delete_user', { p_id: m[1] }]; }],
    ['POST', new RegExp('^/api/admin/users/' + ID + '/reset-code$'), function (m) { return ['admin_reset_code', { p_id: m[1] }]; }],
    ['GET', /^\/api\/floor\/state$/, function () { return ['floor_state', {}]; }],
    ['GET', /^\/api\/crisis\/state$/, function () { return ['crisis_state', {}]; }],
    ['POST', /^\/api\/crisis\/start$/, function (m, b) { return ['crisis_start', { p_text: b.text }]; }],
    ['POST', /^\/api\/crisis\/end$/, function () { return ['crisis_end', {}]; }],
    ['POST', /^\/api\/floor\/session$/, function (m, b) { return ['floor_start_session', { p_mode: b.mode, p_duration: b.duration || null, p_total: b.total || null }]; }],
    ['POST', /^\/api\/floor\/session\/end$/, function () { return ['floor_end_session', {}]; }],
    ['POST', /^\/api\/floor\/queue$/, function (m, b) { return ['floor_queue', { p_action: b.action, p_id: b.id || null, p_direction: b.direction || null }]; }],
    ['POST', /^\/api\/floor\/speaker$/, function (m, b) { return ['floor_start_speaker', { p_user: b.user }]; }],
    ['POST', /^\/api\/floor\/speaker\/stop$/, function () { return ['floor_stop_speaker', {}]; }],
    ['POST', /^\/api\/floor\/general$/, function (m, b) { return ['floor_general', { p_action: b.action, p_duration: b.duration || null }]; }],    ['POST', /^\/api\/admin\/import$/, function (m, b) { return ['admin_import', { p_rows: b.rows }]; }],
    ['GET', /^\/api\/committee\/screen$/, function () { return ['committee_screen', {}]; }],
    ['POST', /^\/api\/admin\/committees$/, function (m, b) { return ['admin_add_committee', { p_id: b.id, p_name: b.name }]; }],
    ['DELETE', /^\/api\/admin\/committees\/([A-Za-z0-9-]+)$/, function (m) { return ['admin_remove_committee', { p_id: m[1] }]; }],
    ['GET', /^\/api\/admin\/chits$/, function () { return ['admin_chits', {}]; }]
  ];
  function route(method, url, body) {
    for (var i = 0; i < ROUTES.length; i++) {
      var m = ROUTES[i][1].exec(url);
      if (ROUTES[i][0] === method && m) return ROUTES[i][2](m, body || {});
    }
    throw new Error('Unknown request ' + method + ' ' + url);
  }

  DXB.configured = function () { return !!CFG.SUPABASE_URL && CFG.SUPABASE_URL.indexOf('http') === 0 && !!CFG.SUPABASE_KEY && CFG.SUPABASE_KEY.indexOf('PASTE') !== 0; };

  // Talk to the database. Resolves with the answer, or throws an Error with a readable message.
  DXB.api = function (method, url, body) {
    var r0 = route(method, url, body);
    var fn = r0[0], params = r0[1], t = DXB.token();
    if (r0[2] !== false) params.p_token = t || null;
    var headers = { 'Content-Type': 'application/json', apikey: CFG.SUPABASE_KEY };
    if (/^eyJ/.test(CFG.SUPABASE_KEY || '')) headers.Authorization = 'Bearer ' + CFG.SUPABASE_KEY;
    return fetch(String(CFG.SUPABASE_URL).replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, { method: 'POST', headers: headers, body: JSON.stringify(params) }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (j) {
        if (!r.ok) {
          if (j && j.code === 'PT401' && t) {
            DXB.clear();
            if (!/login\.html$/.test(location.pathname)) location.replace('login.html');
            throw new Error('Signed out');
          }
          if (j && /^PT\d+$/.test(j.code || '')) throw new Error(j.message);
          if (j && (j.code === 'PGRST202' || j.code === '42883')) throw new Error('The database is not set up yet. Run supabase/setup.sql in Supabase.');
          throw new Error('Something went wrong. Please try again.');
        }
        if (fn === 'login' && j && j.error) throw new Error(j.error);
        return j;
      });
    }, function () { throw new Error('Cannot reach the database. Check your internet connection.'); });
  };

  DXB.fileWarning = function () {
    if (DXB.configured()) return false;
    var d = document.createElement('div');
    d.className = 'file-warn';
    d.textContent = 'Portal not connected yet: paste your Supabase URL and key into js/config.js.';
    document.body.appendChild(d);
    return true;
  };

  // Make sure the right kind of person is on this page; otherwise send them where they belong.
  DXB.guard = function (role) {
    if (DXB.fileWarning()) return new Promise(function () {});
    if (!DXB.token()) { location.replace('login.html'); return new Promise(function () {}); }
    return DXB.api('GET', '/api/me').then(function (info) {
      if (info.user.role !== role) { location.replace(HOME[info.user.role]); return new Promise(function () {}); }
      return info;
    });
  };

  DXB.signOut = function () {
    DXB.api('POST', '/api/logout').catch(function () {}).then(function () { DXB.clear(); location.href = 'login.html'; });
  };

  // Build elements without innerHTML, so nobody can inject markup through a name or a chit.
  DXB.el = function (tag, props, kids) {
    var e = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  };

  DXB.ago = function (ts) {
    var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 45) return 'just now';
    var m = Math.round(s / 60); if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60); if (h < 24) return h + ' h ago';
    return Math.round(h / 24) + ' d ago';
  };
  DXB.clock = function (ts) { return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };

  var toastTimer;
  DXB.toast = function (msg) {
    var t = document.getElementById('toast');
    if (!t) { t = DXB.el('div', { id: 'toast', class: 'toast', role: 'status' }); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  };

  DXB.copy = function (text) {
    var done = function () { DXB.toast('Copied ' + text); };
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, function () { DXB.toast('Could not copy'); }); return; }
    var ta = DXB.el('textarea', { style: 'position:fixed;left:-9999px' });
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { DXB.toast('Could not copy'); }
    ta.remove();
  };

  // Run fn now and then every ms (paused while the tab is hidden), so pages update on their own.
  DXB.poll = function (fn, ms) {
    fn();
    setInterval(function () { if (!document.hidden) fn(); }, ms);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) fn(); });
  };

  /* ---------------- login page ---------------- */
  var form = document.getElementById('delegate-code-form');
  if (!form) return;
  var input = document.getElementById('delegate-code');
  var msg = document.getElementById('msg');
  var button = form.querySelector('button[type="submit"]');
  DXB.fileWarning();

  if (DXB.token() && DXB.configured()) {
    DXB.api('GET', '/api/me').then(function (info) { location.replace(HOME[info.user.role]); }).catch(function () {});
  }
  input.addEventListener('input', function () {
    input.value = input.value.toUpperCase();
    msg.textContent = ''; msg.classList.remove('info');
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    msg.classList.remove('info');
    if (!DXB.configured()) { msg.textContent = 'Portal not connected yet (js/config.js).'; return; }
    if (!input.value.trim()) { msg.textContent = 'Enter your access code.'; input.focus(); return; }
    button.disabled = true; msg.classList.add('info'); msg.textContent = 'Checking…';
    DXB.api('POST', '/api/login', { code: input.value }).then(function (res) {
      DXB.setToken(res.token);
      location.replace(HOME[res.user.role]);
    }).catch(function (err) {
      msg.classList.remove('info'); msg.textContent = err.message;
      button.disabled = false; input.focus(); input.select();
    });
  });
})();
