// DXB MUN – login and dashboard logic.
// NOTE: this is a front-end demo. Accounts are saved in this browser only (localStorage),
// so it is NOT real security. A real login needs a server and a database.
(function () {
  var USERS = 'dxbmun_users', SESSION = 'dxbmun_session';

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  function currentUser() {
    var email = localStorage.getItem(SESSION);
    return email ? (read(USERS, {})[email] || null) : null;
  }

  /* ---------------- login page ---------------- */
  var codeForm = document.getElementById('delegate-code-form');
  if (codeForm) {
    var codeInput = document.getElementById('delegate-code');
    var msg = document.getElementById('msg');
    codeInput.addEventListener('input', function () {
      codeInput.value = codeInput.value.toUpperCase();
      msg.textContent = '';
      msg.classList.remove('info');
    });

    codeForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!codeInput.value.trim()) {
        msg.classList.remove('info');
        msg.textContent = 'Enter your delegate access code.';
        codeInput.focus();
        return;
      }
      msg.classList.add('info');
      msg.textContent = 'Code sign-in is not active yet. Your delegate code will be provided before the conference.';
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
