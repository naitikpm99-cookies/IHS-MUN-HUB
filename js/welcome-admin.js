// Admin: plays the welcome animation on the homepage.
(function () {
  var b = document.getElementById('wa-play');
  if (!b) return;
  b.addEventListener('click', function () {
    DXB.api('POST', '/api/admin/welcome').then(function () {
      document.getElementById('wa-msg').textContent = 'Sent. It plays on any open homepage within a few seconds.';
      document.getElementById('wa-msg').className = 'f-msg ok';
    }).catch(function (e) { document.getElementById('wa-msg').textContent = e.message; document.getElementById('wa-msg').className = 'f-msg'; });
  });
})();