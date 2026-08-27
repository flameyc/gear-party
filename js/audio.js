// 音效：WebAudio 合成（微信小游戏 wx.createWebAudioContext 优先）
(function (g) {
  var GP = g.GP = g.GP || {};
  var AC = null;
  var muted = false;
  try { var sv = GP.save.load(); if (sv && sv.muted) muted = true; } catch (e) {}

  function ensure() {
    if (AC) return true;
    try {
      if (GP.IS_WX) {
        if (typeof wx.createWebAudioContext === 'function') AC = wx.createWebAudioContext();
      } else {
        AC = new (window.AudioContext || window.webkitAudioContext)();
      }
    } catch (e) { AC = null; }
    if (AC && AC.state === 'suspended' && AC.resume) { try { AC.resume(); } catch (e) {} }
    return !!AC;
  }

  function tone(freq, dur, type, vol, when, slide) {
    if (!AC || muted) return;
    try {
      var t0 = (AC.currentTime || 0) + (when || 0);
      var o = AC.createOscillator();
      var gn = AC.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t0);
      if (slide) { try { o.frequency.exponentialRampToValueAtTime(slide, t0 + dur); } catch (e) {} }
      gn.gain.setValueAtTime(0.0001, t0);
      gn.gain.exponentialRampToValueAtTime(vol || 0.14, t0 + 0.012);
      gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(gn); gn.connect(AC.destination);
      o.start(t0); o.stop(t0 + dur + 0.03);
    } catch (e) {}
  }

  GP.audio = {
    unlock: function () { ensure(); },
    setMuted: function (m) { muted = m; var sv = GP.save.load() || {}; sv.muted = m; GP.save.write(sv); },
    isMuted: function () { return muted; },
    tick: function () { ensure(); tone(880, 0.07, 'square', 0.10); },
    click: function () { ensure(); tone(560, 0.06, 'triangle', 0.16); },
    good: function () { ensure(); tone(660, 0.09, 'triangle', 0.15); tone(990, 0.11, 'square', 0.10, 0.07); },
    pickup: function () { ensure(); tone(520, 0.06, 'triangle', 0.14); tone(780, 0.08, 'triangle', 0.12, 0.05); },
    bad: function () { ensure(); tone(170, 0.24, 'sawtooth', 0.16, 0, 110); },
    alarm: function () { ensure(); tone(440, 0.13, 'square', 0.13, 0, 320); tone(440, 0.13, 'square', 0.13, 0.18, 320); },
    win: function () { ensure(); [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.16, 'square', 0.12, i * 0.11); }); },
    lose: function () { ensure(); [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.22, 'triangle', 0.14, i * 0.15); }); }
  };
})((typeof GameGlobal !== 'undefined') ? GameGlobal : ((typeof globalThis !== 'undefined') ? globalThis : this));