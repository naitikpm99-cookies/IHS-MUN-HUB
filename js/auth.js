// DXB MUN – shared portal helpers. The portal is currently open: there is no sign-in,
// access code, session token, or role gate. Keep this file for the shared API and UI helpers.
(function () {
  var DXB = window.DXB = {};
  var pageRole = /admin\.html$/.test(location.pathname) ? 'admin' : /chair\.html$/.test(location.pathname) ? 'chair' : 'delegate';

  // The server uses this only to choose the open portal view. It is not authentication.
  DXB.api = function (method, url, body) {
    var headers = { 'Content-Type': 'application/json', 'X-DXB-Portal-Role': pageRole };
    return fetch(url, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || 'Something went wrong');
        return j;
      });
    }, function () { throw new Error('Cannot reach the server. Make sure it is running (start-server.bat).'); });
  };

  DXB.fileWarning = function () {
    if (location.protocol !== 'file:') return false;
    var d = document.createElement('div');
    d.className = 'file-warn';
    d.textContent = 'The portal needs the server. Start it, then open http://localhost:3000 in your browser.';
    document.body.appendChild(d);
    return true;
  };
  DXB.guard = function () { if (DXB.fileWarning()) return new Promise(function () {}); return DXB.api('GET', '/api/me'); };
  DXB.signOut = function () { location.href = 'index.html'; };

  DXB.el = function (tag, props, kids) {
    var e = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) { var v = props[k]; if (v === null || v === undefined || v === false) return; if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); });
    (kids || []).forEach(function (c) { if (c !== null && c !== undefined && c !== false) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  };
  DXB.ago = function (ts) { var s = Math.max(0, Math.round((Date.now() - ts) / 1000)); if (s < 45) return 'just now'; var m = Math.round(s / 60); if (m < 60) return m + ' min ago'; var h = Math.round(m / 60); if (h < 24) return h + ' h ago'; return Math.round(h / 24) + ' d ago'; };
  DXB.clock = function (ts) { return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
  var toastTimer;
  DXB.toast = function (msg) { var t = document.getElementById('toast'); if (!t) { t = DXB.el('div', { id: 'toast', class: 'toast', role: 'status' }); document.body.appendChild(t); } t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600); };
  DXB.copy = function (text) { var done = function () { DXB.toast('Copied ' + text); }; if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, function () { DXB.toast('Could not copy'); }); return; } var ta = DXB.el('textarea', { style: 'position:fixed;left:-9999px' }); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { DXB.toast('Could not copy'); } ta.remove(); };
  DXB.poll = function (fn, ms) { fn(); setInterval(function () { if (!document.hidden) fn(); }, ms); document.addEventListener('visibilitychange', function () { if (!document.hidden) fn(); }); };
})();
