// DXB MUN portal server. No installs needed: run  node server.js  then open http://localhost:3000
// It serves the website AND the portal API (accounts, committees, chits).
// All permission checks happen here on the server, so a delegate can never do chair or admin things.
'use strict';
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
// Serve the current project folder; keep the local data file beside this server.
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const COMMITTEES = [
  ['IPMC', 'Indian Prime Minister’s Cabinet'], ['HCC', 'Historic Crisis Committee'],
  ['IPC', 'International Press Corps'], ['WHO', 'World Health Organization'],
  ['ECOSOC', 'Economic and Social Council'], ['AU', 'African Union'], ['EU', 'European Union'],
  ['ICJ', 'International Court of Justice'], ['DISEC', 'Disarmament and International Security Committee'],
  ['UNODC', 'United Nations Office on Drugs and Crime'], ['UNEP', 'United Nations Environment Program'],
  ['UNOOSA', 'United Nations Office for Outer Space Affairs'], ['UNSC', 'United Nations Security Council'],
  ['UNHRC', 'United Nations Human Rights Council'], ['UNCSW', 'United Nations Commission on the Status of Women'],
  ['UNCSTD', 'United Nations Commission on Science and Technology for Development'],
  ['SOCHUM', 'Social, Humanitarian, and Cultural Committee'],
  ['INTERPOL', 'International Criminal Police Organization'], ['NATO', 'North Atlantic Treaty Organization']
].map(function (c) { return { id: c[0], name: c[1] }; });
const COMMITTEE_IDS = COMMITTEES.map(function (c) { return c.id; });

const MAX_CHIT = 500;
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

/* ---------------- storage: one JSON file, saved after every change ---------------- */
let db = { users: [], chits: [] };

function loadDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
    catch (e) { console.error('Cannot read ' + DB_FILE + ' (is it damaged?). Fix or move it, then restart.'); process.exit(1); }
  }
  db.users = db.users || []; db.chits = db.chits || [];
}
function saveDb() {
  const tmp = DB_FILE + '.tmp';
  try { fs.writeFileSync(tmp, JSON.stringify(db, null, 2)); fs.renameSync(tmp, DB_FILE); }
  catch (e) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
}

/* ---------------- small helpers ---------------- */
const uid = function () { return crypto.randomBytes(6).toString('hex'); };
function httpErr(status, message) { const e = new Error(message); e.status = status; return e; }
function clean(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max); }
function cleanText(s, max) { return String(s == null ? '' : s).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '').trim().slice(0, max); }
function committeeOf(id) { return COMMITTEES.find(function (c) { return c.id === id; }) || null; }
function userById(id) { return db.users.find(function (u) { return u.id === id; }) || null; }
function pub(u) { return { id: u.id, role: u.role, name: u.name, committee: u.committee || null, delegation: u.delegation || null }; }
function labelOf(u) { return u.role === 'chair' ? 'Chair' : u.delegation; }
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function cookie(req, name) {
  const header = req.headers.cookie || '';
  const part = header.split(';').map(function (item) { return item.trim(); }).find(function (item) { return item.indexOf(name + '=') === 0; });
  return part ? decodeURIComponent(part.slice(name.length + 1)) : '';
}
function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', 'dxb_session=' + encodeURIComponent(token) + '; HttpOnly; SameSite=Lax; Path=/; Max-Age=' + Math.floor(SESSION_TTL / 1000));
}

function ensureAdmin() {
  let admin = db.users.find(function (u) { return u.role === 'admin'; });
  if (!admin) {
    admin = { id: uid(), role: 'admin', name: 'Admin', createdAt: Date.now() };
    db.users.push(admin); saveDb();
    console.log('\n  First run: public admin portal created.\n');
  }
}

function ensureDemoDelegates() {
  if (db.users.some(function (u) { return u.role === 'delegate'; })) return;
  const credentials = [];
  [['delegate001', 'Delegate One', 'Delegation One'], ['delegate002', 'Delegate Two', 'Delegation Two']]
    .forEach(function (account) {
      const code = 'DXB-' + crypto.randomBytes(6).toString('hex').toUpperCase();
      db.users.push({
        id: account[0], role: 'delegate', name: account[1], delegation: account[2], committee: 'IPMC',
        codeHash: hash(code), createdAt: Date.now()
      });
      credentials.push(account[1] + ': ' + code);
    });
  saveDb();
  console.log('\nDelegate access codes (save these now):\n  ' + credentials.join('\n  ') + '\n');
}

/* ---------------- request helpers ---------------- */
function send(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise(function (resolve, reject) {
    let size = 0; const chunks = [];
    req.on('data', function (c) {
      size += c.length;
      if (size > 100 * 1024) { reject(httpErr(413, 'Request too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', function () {
      if (!chunks.length) return resolve({});
      try { const v = JSON.parse(Buffer.concat(chunks).toString('utf8')); resolve(v && typeof v === 'object' ? v : {}); }
      catch (e) { reject(httpErr(400, 'Bad request')); }
    });
    req.on('error', reject);
  });
}
function authUser(req) {
  const role = String(req.headers['x-dxb-portal-role'] || 'delegate');
  const token = cookie(req, 'dxb_session');
  if (token && db.sessions) {
    const key = hash(token);
    const session = db.sessions[key];
    if (session && session.exp > Date.now()) return userById(session.userId);
  }
  if (role === 'admin' || role === 'chair') return db.users.find(function (u) { return u.role === role; }) || null;
  return null;
}
function need(user, role) { if (user.role !== role) throw httpErr(403, 'Not allowed'); }

function chitView(c, withNames) {
  const o = { id: c.id, committee: c.committee, fromId: c.fromId, toId: c.toId, from: c.fromLabel, to: c.toLabel, text: c.text,
    status: c.status, note: c.note || '', createdAt: c.createdAt, decidedAt: c.decidedAt || null, replyTo: c.replyTo || null };
  if (withNames) { o.fromName = c.fromName || ''; o.toName = c.toName || ''; }
  return o;
}
const newestFirst = function (a, b) { return b.createdAt - a.createdAt; };

/* ---------------- API ---------------- */
async function api(req, res, p) {
  const m = req.method;
  const body = (m === 'GET' || m === 'HEAD') ? {} : await readBody(req);
  let mm;

  if (p === '/api/login' && m === 'POST') {
    const code = String(body.code || '').trim().toUpperCase();
    if (!code) throw httpErr(400, 'Enter your delegate access code.');
    const submittedHash = Buffer.from(hash(code), 'hex');
    const user = db.users.find(function (u) {
      if (u.role !== 'delegate' || !/^[a-f0-9]{64}$/i.test(u.codeHash || '')) return false;
      return crypto.timingSafeEqual(submittedHash, Buffer.from(u.codeHash, 'hex'));
    });
    if (!user) throw httpErr(401, 'That access code is not valid.');
    db.sessions = db.sessions || {};
    const token = crypto.randomBytes(32).toString('hex');
    db.sessions[hash(token)] = { userId: user.id, exp: Date.now() + SESSION_TTL };
    saveDb();
    setSessionCookie(res, token);
    return send(res, 200, { user: pub(user) });
  }
  if (p === '/api/logout' && m === 'POST') {
    const token = cookie(req, 'dxb_session');
    if (token && db.sessions) {
      delete db.sessions[hash(token)];
      saveDb();
    }
    res.setHeader('Set-Cookie', 'dxb_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    return send(res, 200, { ok: true });
  }

  const user = authUser(req);
  if (!user) throw httpErr(401, 'Please sign in with your delegate access code.');
  if (p === '/api/me' && m === 'GET') return send(res, 200, { user: pub(user), committee: committeeOf(user.committee) });
  if (p === '/api/committees' && m === 'GET') return send(res, 200, { committees: COMMITTEES });

  /* ----- delegate ----- */
  if (p === '/api/delegate/roster' && m === 'GET') {
    need(user, 'delegate');
    const mates = db.users.filter(function (u) { return u.role === 'delegate' && u.committee === user.committee && u.id !== user.id; })
      .map(function (u) { return { id: u.id, delegation: u.delegation }; })
      .sort(function (a, b) { return a.delegation.localeCompare(b.delegation); });
    const chair = db.users.find(function (u) { return u.role === 'chair' && u.committee === user.committee; });
    return send(res, 200, { delegations: mates, chair: chair ? { id: chair.id } : null });
  }

  if (p === '/api/chits' && m === 'GET') {
    need(user, 'delegate');
    const mine = db.chits.filter(function (c) { return c.fromId === user.id || c.toId === user.id; });
    return send(res, 200, {
      inbox: mine.filter(function (c) { return c.toId === user.id && c.status === 'delivered'; }).sort(newestFirst).map(function (c) { return chitView(c); }),
      sent: mine.filter(function (c) { return c.fromId === user.id; }).sort(newestFirst).map(function (c) { return chitView(c); })
    });
  }

  if (p === '/api/chits' && m === 'POST') {
    need(user, 'delegate');
    const to = userById(String(body.to || ''));
    if (!to || to.id === user.id || to.committee !== user.committee || (to.role !== 'delegate' && to.role !== 'chair')) throw httpErr(400, 'Pick a delegation in your committee.');
    const text = cleanText(body.text, MAX_CHIT);
    if (!text) throw httpErr(400, 'Write a message first.');
    const waiting = db.chits.filter(function (c) { return c.fromId === user.id && c.status === 'pending'; }).length;
    if (waiting >= 20) throw httpErr(429, 'You have 20 chits waiting for the chair already. Wait for some to be cleared.');
    let replyTo = null;
    if (body.replyTo) {
      const orig = db.chits.find(function (c) { return c.id === String(body.replyTo); });
      if (orig && orig.toId === user.id && orig.fromId === to.id) replyTo = orig.id;
    }
    const toChair = to.role === 'chair';
    const chit = {
      id: uid(), committee: user.committee, fromId: user.id, toId: to.id,
      fromLabel: labelOf(user), toLabel: labelOf(to), fromName: user.name, toName: to.name,
      text: text, status: toChair ? 'delivered' : 'pending', note: '', createdAt: Date.now(), decidedAt: toChair ? Date.now() : null, replyTo: replyTo
    };
    db.chits.push(chit); saveDb();
    return send(res, 201, { chit: chitView(chit) });
  }

  /* ----- chair ----- */
  if (p === '/api/chair/chits' && m === 'GET') {
    need(user, 'chair');
    const all = db.chits.filter(function (c) { return c.committee === user.committee; });
    const view = function (c) { return chitView(c, true); };
    return send(res, 200, {
      pending: all.filter(function (c) { return c.status === 'pending'; }).sort(function (a, b) { return a.createdAt - b.createdAt; }).map(view),
      toChair: all.filter(function (c) { return c.toId === user.id; }).sort(newestFirst).map(view),
      log: all.filter(function (c) { return c.status !== 'pending' && c.toId !== user.id; }).sort(newestFirst).map(view)
    });
  }
  if ((mm = /^\/api\/chair\/chits\/([a-f0-9]+)$/.exec(p)) && m === 'POST') {
    need(user, 'chair');
    const c = db.chits.find(function (x) { return x.id === mm[1] && x.committee === user.committee; });
    if (!c) throw httpErr(404, 'Chit not found');
    if (c.status !== 'pending') throw httpErr(409, 'This chit was already handled.');
    if (body.action === 'approve') c.status = 'delivered';
    else if (body.action === 'reject') { c.status = 'rejected'; c.note = clean(body.note, 200); }
    else throw httpErr(400, 'Unknown action');
    c.decidedAt = Date.now(); saveDb();
    return send(res, 200, { chit: chitView(c, true) });
  }
  if (p === '/api/chair/roster' && m === 'GET') {
    need(user, 'chair');
    return send(res, 200, { delegates: db.users.filter(function (u) { return u.role === 'delegate' && u.committee === user.committee; })
      .map(function (u) { return { id: u.id, delegation: u.delegation, name: u.name }; }).sort(function (a, b) { return a.delegation.localeCompare(b.delegation); }) });
  }

  /* ----- admin ----- */
  if (p.indexOf('/api/admin/') === 0) {
    need(user, 'admin');

    if (p === '/api/admin/overview' && m === 'GET') {
      const rows = COMMITTEES.map(function (c) {
        const chair = db.users.find(function (u) { return u.role === 'chair' && u.committee === c.id; });
        return {
          id: c.id, name: c.name,
          chair: chair ? { id: chair.id, name: chair.name } : null,
          delegates: db.users.filter(function (u) { return u.role === 'delegate' && u.committee === c.id; })
            .map(function (u) { return { id: u.id, name: u.name, delegation: u.delegation }; })
            .sort(function (a, b) { return a.delegation.localeCompare(b.delegation); })
        };
      });
      return send(res, 200, { committees: rows, stats: {
        delegates: db.users.filter(function (u) { return u.role === 'delegate'; }).length,
        chairs: db.users.filter(function (u) { return u.role === 'chair'; }).length,
        chits: db.chits.length,
        pending: db.chits.filter(function (c) { return c.status === 'pending'; }).length } });
    }

    const addDelegate = function (committee, delegation, name) {
      if (COMMITTEE_IDS.indexOf(committee) < 0) throw httpErr(400, 'Unknown committee');
      delegation = clean(delegation, 60); name = clean(name, 80);
      if (!delegation) throw httpErr(400, 'Delegation is required');
      const dupe = db.users.some(function (u) { return u.role === 'delegate' && u.committee === committee && u.delegation.toLowerCase() === delegation.toLowerCase(); });
      if (dupe) throw httpErr(409, delegation + ' already exists in ' + committee);
      const u = { id: uid(), role: 'delegate', name: name, delegation: delegation, committee: committee, createdAt: Date.now() };
      db.users.push(u);
      return u;
    };

    if (p === '/api/admin/delegates' && m === 'POST') {
      const u = addDelegate(String(body.committee || ''), body.delegation, body.name);
      saveDb();
      return send(res, 201, { delegate: { id: u.id, name: u.name, delegation: u.delegation } });
    }
    if (p === '/api/admin/delegates/bulk' && m === 'POST') {
      const committee = String(body.committee || '');
      if (COMMITTEE_IDS.indexOf(committee) < 0) throw httpErr(400, 'Unknown committee');
      const created = [], skipped = [];
      String(body.lines || '').split(/\r?\n/).slice(0, 300).forEach(function (line) {
        if (!line.trim()) return;
        const parts = line.split(/\s*[|\t,]\s*/);
        try { const u = addDelegate(committee, parts[0], parts.slice(1).join(' ')); created.push({ delegation: u.delegation, name: u.name }); }
        catch (e) { skipped.push({ line: clean(line, 80), reason: e.message }); }
      });
      if (created.length) saveDb();
      return send(res, 201, { created: created, skipped: skipped });
    }
    if (p === '/api/admin/chairs' && m === 'POST') {
      const committee = String(body.committee || '');
      if (COMMITTEE_IDS.indexOf(committee) < 0) throw httpErr(400, 'Unknown committee');
      if (db.users.some(function (u) { return u.role === 'chair' && u.committee === committee; })) throw httpErr(409, committee + ' already has a chair');
      const u = { id: uid(), role: 'chair', name: clean(body.name, 80), committee: committee, createdAt: Date.now() };
      db.users.push(u); saveDb();
      return send(res, 201, { chair: { id: u.id, name: u.name } });
    }
    if ((mm = /^\/api\/admin\/users\/([a-f0-9]+)$/.exec(p))) {
      const target = userById(mm[1]);
      if (!target || target.role === 'admin') throw httpErr(404, 'Account not found');
      if (m === 'DELETE') {
        db.users = db.users.filter(function (u) { return u.id !== target.id; });
        saveDb();
        return send(res, 200, { ok: true });
      }
      if (m === 'PATCH') {
        if (body.name !== undefined) target.name = clean(body.name, 80);
        if (body.delegation !== undefined && target.role === 'delegate') {
          const d = clean(body.delegation, 60);
          if (!d) throw httpErr(400, 'Delegation is required');
          const dupe = db.users.some(function (u) { return u.id !== target.id && u.role === 'delegate' && u.committee === target.committee && u.delegation.toLowerCase() === d.toLowerCase(); });
          if (dupe) throw httpErr(409, d + ' already exists in ' + target.committee);
          target.delegation = d;
        }
        saveDb();
        return send(res, 200, { ok: true });
      }
    }
    if (p === '/api/admin/chits' && m === 'GET') {
      const list = db.chits.slice().sort(newestFirst).slice(0, 300).map(function (c) { return chitView(c, true); });
      return send(res, 200, { chits: list });
    }
  }

  throw httpErr(404, 'Not found');
}

/* ---------------- static website files (only the public ones) ---------------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const PUBLIC_PAGES = ['index.html', 'login.html', 'dashboard.html', 'chair.html', 'admin.html'];
const PUBLIC_DIRS = ['css', 'js', 'images'];
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";

function serveStatic(req, res, p) {
  if (req.method !== 'GET' && req.method !== 'HEAD') throw httpErr(405, 'Method not allowed');
  let rel = p === '/' ? 'index.html' : p.replace(/^\/+/, '');
  const top = rel.split('/')[0];
  const ok = PUBLIC_PAGES.indexOf(rel) >= 0 || (PUBLIC_DIRS.indexOf(top) >= 0 && rel.indexOf('/') > 0);
  const file = path.resolve(ROOT, rel);
  if (!ok || file.indexOf(ROOT + path.sep) !== 0 || !MIME[path.extname(file).toLowerCase()] || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found');
  }
  const headers = { 'Content-Type': MIME[path.extname(file).toLowerCase()], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin', 'Content-Security-Policy': CSP };
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

/* ---------------- start ---------------- */
loadDb();
ensureAdmin();
ensureDemoDelegates();
const server = http.createServer(async function (req, res) {
  try {
    const p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (p.indexOf('/api/') === 0) return await api(req, res, p);
    return serveStatic(req, res, p);
  } catch (e) {
    const status = e.status || (e instanceof URIError ? 400 : 500);
    if (status === 500) console.error(e);
    if (!res.headersSent) send(res, status, { error: status === 500 ? 'Something went wrong on the server.' : e.message });
  }
});
server.listen(PORT, function () {
  console.log('DXB MUN portal running.\n  On this computer:  http://localhost:' + PORT);
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach(function (n) {
    nets[n].forEach(function (a) { if (a.family === 'IPv4' && !a.internal) console.log('  On your network:   http://' + a.address + ':' + PORT + '   (phones/laptops on the same Wi-Fi)'); });
  });
  console.log('Press Ctrl+C to stop.');
});
