// 小游戏④：图案踩格 —— 参考《机械狂欢》「图案踩格」
(function (g) {
  var GP = g.GP = g.GP || {};
  var CFG = GP.CFG, D = GP.draw, MC = GP.mgCommon;

  var N = 3, PAD = 170, GAP = 16;
  var OX = (CFG.W - (N * PAD + (N - 1) * GAP)) / 2, OY = 430;
  var ROUNDS = [2, 3, 3, 4, 4];

  function Game() {
    var self = this;
    self.meta = MC.metaOf('patternpad');
    self.countT = 2.4;
    self.state = 'count';
    self.result = null;
    self.timeLeft = self.meta.dur;
    self.total = self.meta.dur;
    self.round = 0;
    self.pattern = [];
    self.found = [];
    self.strikes = 0;
    self.phase = 'show'; // show | recall | clear
    self.showT = 1.6;
    self.clearT = 0;
    self.lastWrong = null;
    self.lastWrongT = 0;
    self.celebrate = 0;
  }

  Game.prototype.startPlay = function () {
    this.newPattern();
  };

  Game.prototype.newPattern = function () {
    var self = this;
    var n = ROUNDS[self.round];
    var cells = [];
    var used = {};
    while (cells.length < n) {
      var c = GP.randInt(0, 8);
      if (!used[c]) { used[c] = 1; cells.push(c); }
    }
    self.pattern = cells;
    self.found = [];
    self.phase = 'show';
    self.showT = 1.6;
  };

  Game.prototype.update = function (dt) {
    var self = this;
    if (self.state === 'count') {
      self.countT -= dt;
      if (self.countT <= 0) { self.state = 'play'; self.newPattern(); }
      return;
    }
    if (self.state !== 'play') return;
    self.timeLeft -= dt;
    if (self.timeLeft <= 0) { self.finish(false, '时间耗尽'); return; }
    if (self.phase === 'show') {
      self.showT -= dt;
      if (self.showT <= 0) { self.phase = 'recall'; GP.audio.click(); }
    } else if (self.phase === 'clear') {
      self.clearT -= dt;
      if (self.clearT <= 0) {
        if (self.round >= ROUNDS.length) {
          var score = 500 + Math.max(1, Math.ceil(self.timeLeft)) * 5;
          self.finish(true, '完美记忆！', score);
          return;
        }
        self.newPattern();
      }
    }
    if (self.lastWrong) { self.lastWrongT += dt; if (self.lastWrongT > 0.5) self.lastWrong = null; }
  };

  Game.prototype.finish = function (win, msg, score) {
    var self = this;
    self.state = 'done';
    self.result = { win: win, msg: msg, score: win ? score : 0 };
    if (win) GP.audio.win(); else GP.audio.lose();
  };

  Game.prototype.onDown = function (x, y) {
    var self = this;
    if (self.state !== 'play' || self.phase !== 'recall') return;
    var col = Math.floor((x - OX) / (PAD + GAP));
    var row = Math.floor((y - OY) / (PAD + GAP));
    if (col < 0 || col >= N || row < 0 || row >= N) return;
    var idx = row * N + col;
    // 已踩中的忽略
    for (var i = 0; i < self.found.length; i++) if (self.found[i] === idx) return;
    var hit = false;
    for (var j = 0; j < self.pattern.length; j++) if (self.pattern[j] === idx) { hit = true; break; }
    if (hit) {
      self.found.push(idx);
      GP.audio.good();
      D.floatText('✓', OX + col * (PAD + GAP) + PAD / 2, OY + row * (PAD + GAP) - 20, 40, CFG.COL.green);
      if (self.found.length >= self.pattern.length) {
        self.round++;
        self.phase = 'clear';
        self.clearT = 0.9;
        GP.audio.pickup();
        if (self.round >= ROUNDS.length) self.celebrate = 1;
      }
    } else {
      self.strikes++;
      self.lastWrong = idx;
      self.lastWrongT = 0;
      D.addShake(10);
      GP.audio.bad();
      D.spark(x, y, CFG.COL.red, 14, 220);
      if (self.strikes >= 3) { self.finish(false, '踩错 3 次，板块下沉'); }
    }
  };
  Game.prototype.onMove = function () {};
  Game.prototype.onUp = function () {};
  Game.prototype.onSwipe = function () {};

  Game.prototype.draw = function () {
    var self = this;
    var COL = CFG.COL;
    GP.clear();
    D.rr(0, 0, CFG.W, CFG.H, 0, COL.bg);
    if (self.state === 'count') {
      this.drawBoard();
      MC.count(self.countT);
      return;
    }
    this.drawBoard();
    if (self.state === 'done' && !self.result.win) {
      MC.dim();
      D.textSh('🔲 报废！', CFG.W / 2, CFG.H / 2 - 60, 76, COL.red);
      D.text(self.result.msg, CFG.W / 2, CFG.H / 2 + 30, 34, COL.txt);
    }
  };

  Game.prototype.drawBoard = function () {
    var self = this;
    var COL = CFG.COL;
    MC.hud(self.meta, self.timeLeft, self.total, COL.cyan);
    D.text('记住亮起的格子并踩中它们（' + (self.round + 1) + '/' + ROUNDS.length + ' 关）', CFG.W / 2, 160, 24, COL.dim);
    // 失误
    for (var s = 0; s < 3; s++) {
      D.circle(CFG.W - 90 - s * 56, 150, 20, s < self.strikes ? 'rgba(255,82,82,0.9)' : 'rgba(255,82,82,0.22)', COL.line, 3);
      if (s < self.strikes) D.text('✕', CFG.W - 90 - s * 56, 151, 22, COL.bg);
    }
    // 格子
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        var idx = r * N + c;
        var x = OX + c * (PAD + GAP), y = OY + r * (PAD + GAP);
        var isPat = false, isFd = false;
        for (var i = 0; i < self.pattern.length; i++) if (self.pattern[i] === idx) isPat = true;
        for (var j = 0; j < self.found.length; j++) if (self.found[j] === idx) isFd = true;
        var fill = COL.panel2, edge = COL.line;
        if (self.phase === 'show' && isPat) { fill = 'rgba(53,208,255,0.35)'; edge = COL.cyan; }
        else if (isFd) { fill = 'rgba(53,208,255,0.62)'; edge = COL.cyan; }
        var w = (self.lastWrong === idx) ? (0.5 - self.lastWrongT) * 0.4 + 1 : 1;
        var px = x + PAD / 2, py = y + PAD / 2;
        D.rr(px - PAD * w / 2, py - PAD * w / 2, PAD * w, PAD * w, 18, fill, edge, self.lastWrong === idx ? 8 : 4);
        if (self.phase === 'show' && isPat) {
          D.text('⚙', px, py, 60);
        } else if (isFd) {
          D.text('⚙', px, py, 60);
        } else if (self.phase === 'recall') {
          D.text('?', px, py, 44, 'rgba(255,255,255,0.16)');
        }
      }
    }
    // 过关提示
    if (self.phase === 'clear') {
      D.textSh('✔ 过关！', CFG.W / 2, 300, 44, COL.green);
    }
    D.drawFx();
    D.drawFloat();
  };

  GP.MG = GP.MG || {};
  GP.MG.patternpad = { create: function () { return new Game(); } };
})((typeof GameGlobal !== 'undefined') ? GameGlobal : ((typeof globalThis !== 'undefined') ? globalThis : this));