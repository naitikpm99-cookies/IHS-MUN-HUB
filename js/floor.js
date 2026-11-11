// DXB MUN – floor timer helpers shared by the committee screen (display) and the chair dashboard (controls).
(function () {
  var F = window.DXBFloor = {};

  F.NAMES = { gsl: 'General Speakers List', moderated_caucus: 'Moderated Caucus', unmoderated_caucus: 'Unmoderated Caucus' };
  F.SPEECH = { gsl: 'a GSL Speech', moderated_caucus: 'a Moderated Caucus Speech' };

  // 75 -> "01:15"
  F.format = function (seconds) {
    var s = Math.max(0, Math.ceil(seconds));
    return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2);
  };

  // A countdown that keeps ticking between polls. It only re-syncs when the server's timer really changed,
  // and it counts from the seconds the server reported, so it does not depend on this device's clock being right.
  F.Clock = function () {
    var key = null, deadline = 0, frozen = 0, running = false;
    return {
      sync: function (k, remaining, run) {
        if (k === key) return;
        key = k; running = !!run; frozen = remaining; deadline = Date.now() + remaining * 1000;
      },
      clear: function () { key = null; running = false; frozen = 0; deadline = 0; },
      get: function () { return running ? Math.max(0, (deadline - Date.now()) / 1000) : frozen; },
      active: function () { return key !== null; }
    };
  };

  // Feed the three clocks from a server state.
  F.syncClocks = function (s, clocks) {
    var t = s.timer, g = s.general_timer, ss = s.session;
    if (t) clocks.speaker.sync(t.started_at + ':' + t.user + ':' + t.duration, t.remaining, t.remaining > 0); else clocks.speaker.clear();
    if (ss && ss.total_duration) clocks.caucus.sync(ss.started_at + ':' + ss.total_duration, ss.total_remaining, ss.total_remaining > 0); else clocks.caucus.clear();
    if (g) clocks.general.sync([g.running, g.started_at, g.duration, g.running ? '' : g.remaining].join(':'), g.remaining, g.running); else clocks.general.clear();
  };

  // Ask the server for the floor state now and then. onState(state) runs after every answer.
  F.watch = function (onState, ms) {
    var busy = false;
    function load() {
      if (busy) return Promise.resolve();
      busy = true;
      return DXB.api('GET', '/api/floor/state').then(onState).catch(function () {}).then(function () { busy = false; });
    }
    DXB.poll(load, ms || 2500);
    return { reload: load };
  };
})();
