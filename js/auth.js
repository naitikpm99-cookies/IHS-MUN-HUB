// DXB MUN – login and dashboard logic.
// NOTE: this is a front-end demo. Accounts are saved in this browser only (localStorage),
// so it is NOT real security. A real login needs a server and a database.
(function () {
  var USERS = 'dxbmun_users', SESSION = 'dxbmun_session';

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  // Turn email + password into a fingerprint so the password itself is never stored
  function hash(email, pw) {
    var text = email + '|' + pw;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ('0' + b.toString(16)).slice(-2);
        }).join('');
      });
    }
    var h = 0;
    for (var i = 0; i < text.length; i++) { h = (h * 31 + text.charCodeAt(i)) | 0; }
    return Promise.resolve('x' + h);
  }

  function currentUser() {
    var email = localStorage.getItem(SESSION);
    return email ? (read(USERS, {})[email] || null) : null;
  }

  /* ---------------- login page ---------------- */
  var loginForm = document.getElementById('login-form');
  if (loginForm) {
    if (currentUser()) { location.replace('dashboard.html'); return; }

    var signupForm = document.getElementById('signup-form');
    var title = document.getElementById('auth-title');
    var sub = document.getElementById('auth-sub');
    var switchText = document.getElementById('switch-text');
    var switchBtn = document.getElementById('switch-btn');
    var msg = document.getElementById('msg');
    var signup = false;

    function say(text) { msg.textContent = text; }

    function setMode(isSignup) {
      signup = isSignup;
      loginForm.hidden = isSignup;
      signupForm.hidden = !isSignup;
      title.textContent = isSignup ? 'Create account' : 'Sign in';
      sub.textContent = isSignup ? 'Register as a delegate to use your dashboard.' : 'Welcome back, delegate.';
      switchText.textContent = isSignup ? 'Already have an account?' : 'New here?';
      switchBtn.textContent = isSignup ? 'Sign in' : 'Create an account';
      say('');
    }
    switchBtn.addEventListener('click', function () { setMode(!signup); });

    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('li-email').value.trim().toLowerCase();
      var pw = document.getElementById('li-pass').value;
      if (!email || !pw) { say('Enter your email and password.'); return; }
      var user = read(USERS, {})[email];
      hash(email, pw).then(function (h) {
        if (user && user.hash === h) {
          localStorage.setItem(SESSION, email);
          location.href = 'dashboard.html';
        } else {
          say('Email or password is incorrect.');
        }
      });
    });

    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('su-name').value.trim();
      var school = document.getElementById('su-school').value.trim();
      var email = document.getElementById('su-email').value.trim().toLowerCase();
      var pw = document.getElementById('su-pass').value;
      if (!name) { say('Enter your full name.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say('Enter a valid email address.'); return; }
      if (pw.length < 8) { say('Use a password with at least 8 characters.'); return; }
      var users = read(USERS, {});
      if (users[email]) { say('An account with this email already exists.'); return; }
      hash(email, pw).then(function (h) {
        users[email] = { name: name, school: school, email: email, hash: h, committee: '', done: {} };
        write(USERS, users);
        localStorage.setItem(SESSION, email);
        location.href = 'dashboard.html';
      });
    });
  }

  /* ---------------- dashboard page ---------------- */
  var hello = document.getElementById('hello');
  if (hello) {
    var user = currentUser();
    if (!user) { location.replace('login.html'); return; }

    function save() {
      var users = read(USERS, {});
      users[user.email] = user;
      write(USERS, users);
    }
    function flash(id, text) {
      var el = document.getElementById(id);
      el.textContent = text;
      setTimeout(function () { el.textContent = ''; }, 2500);
    }

    hello.textContent = 'Welcome, ' + (user.name.split(' ')[0] || 'delegate');

    var nameInput = document.getElementById('p-name');
    var schoolInput = document.getElementById('p-school');
    nameInput.value = user.name;
    schoolInput.value = user.school || '';
    document.getElementById('p-email').textContent = user.email;

    var committee = document.getElementById('committee');
    committee.value = user.committee || '';

    var items = [].slice.call(document.querySelectorAll('.d-check input'));

    function render() {
      var auto = {
        profile: !!(user.name && user.school),
        committee: !!user.committee
      };
      var done = 0;
      items.forEach(function (box) {
        var key = box.dataset.key;
        if (key in auto) { box.checked = auto[key]; }
        else { box.checked = !!user.done[key]; }
        if (box.checked) { done++; }
      });
      var pct = Math.round(done / items.length * 100);
      document.getElementById('progbar').style.width = pct + '%';
      document.getElementById('prog').setAttribute('aria-valuenow', pct);
      document.getElementById('proglabel').textContent = done + ' of ' + items.length + ' steps done';
      document.getElementById('c-pref').textContent = user.committee || '[Not chosen yet]';
    }

    document.getElementById('profile-form').addEventListener('submit', function (e) {
      e.preventDefault();
      user.name = nameInput.value.trim() || user.name;
      user.school = schoolInput.value.trim();
      save();
      hello.textContent = 'Welcome, ' + (user.name.split(' ')[0] || 'delegate');
      render();
      flash('p-msg', 'Saved.');
    });

    committee.addEventListener('change', function () {
      user.committee = committee.value;
      save();
      render();
      flash('c-msg', 'Preference saved.');
    });

    items.forEach(function (box) {
      box.addEventListener('change', function () {
        user.done[box.dataset.key] = box.checked;
        save();
        render();
      });
    });

    document.getElementById('logout').addEventListener('click', function () {
      localStorage.removeItem(SESSION);
      location.href = 'login.html';
    });

    render();
  }
})();
