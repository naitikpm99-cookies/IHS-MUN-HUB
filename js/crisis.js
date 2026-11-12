// DXB MUN – committee crisis alerts shared by chair, delegate, and room screens.
(function () {
  var revealTimer = null;
  var countdownTimer = null;

  function clearReveal() {
    clearTimeout(revealTimer);
    clearInterval(countdownTimer);
    revealTimer = null;
    countdownTimer = null;
  }

  function showAlert(state) {
    var box = document.getElementById('crisis-alert');
    if (!box) return;

    if (!state.active) {
      clearReveal();
      box.hidden = true;
      box.removeAttribute('data-seq');
      return;
    }

    var seq = String(state.seq);
    var text = document.getElementById('crisis-alert-text');
    var title = document.getElementById('crisis-alert-title');
    var kicker = document.getElementById('crisis-alert-kicker');
    var counter = document.getElementById('crisis-alert-count');
    box.hidden = false;
    if (box.getAttribute('data-seq') === seq) return;

    clearReveal();
    box.setAttribute('data-seq', seq);
    box.classList.remove('crisis-alert-enter', 'is-revealed');
    text.hidden = true;
    kicker.textContent = 'Incoming transmission · Decoding';
    title.textContent = 'WAIT FOR IT...';
    var seconds = 3;
    counter.textContent = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? '!' : seconds;
    void box.offsetWidth;
    box.classList.add('crisis-alert-enter');

    function reveal() {
      clearReveal();
      kicker.textContent = 'Breaking news · Agenda update';
      title.textContent = 'PLOT TWIST!';
      text.textContent = state.text;
      text.hidden = false;
      counter.textContent = '!';
      box.classList.add('is-revealed');
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      reveal();
      return;
    }

    countdownTimer = setInterval(function () {
      seconds -= 1;
      if (seconds > 0) counter.textContent = seconds;
    }, 850);
    revealTimer = setTimeout(reveal, 2700);
  }

  function getState() {
    return DXB.api('GET', '/api/crisis/state');
  }

  function watchState(onState, onError, interval) {
    var busy = false;
    var delay = interval;
    var timer;

    function load() {
      if (busy) return;
      if (document.hidden) {
        timer = setTimeout(load, delay);
        return;
      }
      busy = true;
      getState().then(function (state) {
        delay = interval;
        onState(state);
      }).catch(function (error) {
        delay = Math.min(delay * 2, 30000);
        onError(error);
      }).then(function () {
        busy = false;
        timer = setTimeout(load, delay);
      });
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      clearTimeout(timer);
      load();
    });
    load();
  }

  DXB.crisisWatch = function () {
    var failed = false;
    watchState(function (state) {
      failed = false;
      showAlert(state);
    }, function (error) {
      if (!failed && error.message !== 'Signed out') DXB.toast('Live committee updates unavailable: ' + error.message);
      failed = true;
    }, 2000);
  };

  DXB.crisisChair = function () {
    var form = document.getElementById('crisis-form');
    if (!form) return;

    var input = document.getElementById('crisis-text');
    var count = document.getElementById('crisis-count');
    var start = document.getElementById('crisis-start');
    var end = document.getElementById('crisis-end');
    var status = document.getElementById('crisis-status');
    var active = document.getElementById('crisis-active');
    var activeText = document.getElementById('crisis-active-text');
    var posting = false;
    function message(text, isError) {
      status.textContent = text;
      status.classList.toggle('crisis-error', !!isError);
    }

    function render(state) {
      active.hidden = !state.active;
      activeText.textContent = state.active ? state.text : '';
      end.hidden = !state.active;
      var label = document.getElementById('crisis-active-label');
      label.textContent = state.active ? 'LIVE' : 'Ready for a plot twist';
      label.classList.toggle('is-active', !!state.active);
      if (state.active && !input.value.trim()) start.textContent = 'Drop another twist';
      else start.textContent = state.active ? 'Update the plot twist' : 'Drop the plot twist';
      start.disabled = posting || !input.value.trim();
      end.disabled = posting;
    }

    watchState(function (state) {
      render(state);
      if (status.dataset.error === 'true') {
        status.dataset.error = '';
        message(state.active ? 'The plot twist is live.' : 'No active plot twist.', false);
      }
    }, function (error) {
      status.dataset.error = 'true';
      message('Could not load crisis status: ' + error.message, true);
    }, 3000);

    function submit(action, body) {
      if (posting) return;
      posting = true;
      start.disabled = true;
      end.disabled = true;
      message(action === 'start' ? 'Sending the plot twist…' : 'Closing this storyline…', false);
      DXB.api('POST', '/api/crisis/' + action, body || {}).then(function (state) {
        if (action === 'start') {
          input.value = '';
          count.textContent = '0 / 400';
        }
        render(state);
        message(action === 'start' ? 'The plot twist is live across your committee.' : 'This storyline is closed.', false);
      }).catch(function (error) {
        message(error.message, true);
      }).then(function () {
        posting = false;
        start.disabled = !input.value.trim();
        end.disabled = false;
      });
    }

    input.addEventListener('input', function () {
      count.textContent = input.value.length + ' / 400';
      start.disabled = posting || !input.value.trim();
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (input.value.trim()) submit('start', { text: input.value });
    });
    end.addEventListener('click', function () { submit('end'); });
  };
})();
