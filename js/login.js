(function () {
  var form = document.getElementById('login-form');
  var code = document.getElementById('access-code');
  var message = document.getElementById('login-msg');
  var button = form.querySelector('button[type="submit"]');

  code.addEventListener('input', function () {
    code.value = code.value.toUpperCase();
    message.textContent = '';
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    message.textContent = '';
    button.disabled = true;

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ code: code.value })
    }).then(function (response) {
      return response.json().then(function (result) {
        if (!response.ok) throw new Error(result.error || 'Could not sign in.');
        return result;
      });
    }).then(function () {
      location.href = 'dashboard.html';
    }).catch(function (error) {
      message.textContent = error.message || 'Could not reach the server. Start it, then try again.';
      button.disabled = false;
    });
  });
})();
