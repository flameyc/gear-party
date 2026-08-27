// 小游戏③：爬梯狂飙 —— 参考《机械狂欢》「指令爬梯」
(function (g) {
  var GP = g.GP = g.GP || {};
  var CFG = GP.CFG, D = GP.draw, MC = GP.mgCommon;

  var RUNGS = 12;
  var TOP_Y = 700, BOT_Y = 1100;
  var SPACING = (BOT_Y - TOP_Y) / (RUNGS - 1);
  var DIRS = ['left', 'up', 'right', 'down'];
  var ARROWS = { left: '←', up: '↑', right: '→', down: '↓' };

  function Game() {
    var self = this;
    self.meta = MC.metaOf('ladder');
    self.countT = 2.4;
    self.state = 'count';
    self.result = null;
    self.timeLeft = self.meta.dur;
    self.total = self.meta.dur;
    self.rung = 0;
    self.misses = 0;
    self.combo = 0;
    self.bestCombo = 0;
    self.prompt = null; // {dir, t}
    self.promptT = 2.0;
  }

  Game.prototype.startPlay = function () {
    this.newPrompt();
  };

  Game.prototype.newPrompt = function () {
    var self = this;
    var dir = DIRS[GP.randInt(0, 3)];
    self.prompt = { dir: dir, t: self.promptT };
  };

  Game.prototype.update = function (dt) {
    var self = this;
    if (self.state === 'count') {
      self.countT -= dt;
      if (self.countT <= 0) { self.state = 'play'; self.newPrompt(); }
      return;
    }
    if (self.state !== 'play') return;
    self.timeLeft -= dt;
    if (self.timeLeft <= 0) { self.finish(false, '时间耗尽'); return; }
    if (self.prompt) {
      self.prompt.t -= dt;
      if (self.prompt.t <= 0) { self.miss(true); }
    }
  };

  Game.prototype.miss = function (timeout) {
    var self = this;
    self.misses++;
    self.combo = 0;
    self.rung = Math.max(0, self.rung - 1);
    D.addShake(8);
    GP.audio.bad();
    D.floatText(timeout ? '超时！' : '滑错方向！', CFG.W / 2, 560, 34, CFG.COL.red);
    if (self.misses >= 3) { self.finish(false, '连续失误，坠入滚筒'); return; }
    self.newPrompt();
  };

  Game.prototype.finish = function (win, msg, score) {
    var self = this;
    self.state = 'done';
    self.result = { win: win, msg: msg, score: win ? score : 0 };
    if (win) GP.audio.win(); else GP.audio.lose();
  };

  Game.prototype.onSwipe = function (dir) {
    var self = this;
    if (self.state !== 'play' || !self.prompt) return;
    if (dir === self.prompt.dir) {
      self.rung++;
      self.combo++;
      if (self.combo > self.bestCombo) self.bestCombo = self.combo;
      GP.audio.tick();
      if (self.combo % 4 === 0) D.floatText('连击 ×' + self.combo + '！', CFG.W / 2, 560, 36, CFG.COL.warn);
      if (self.rung >= RUNGS) {
        var score = 400 + Math.max(1, Math.ceil(self.timeLeft)) * 10 + self.bestCombo * 15;
        self.finish(true, '登顶成功！', score);
        return;
      }
      self.newPrompt();
    } else {
      self.miss(false);
    }
  };

  Game.prototype.onDown = function () {};
  Game.prototype.onMove = function () {};
  Game.prototype.onUp = function () {};

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
      D.textSh('🪜 报废！', CFG.W / 2, CFG.H / 2 - 60, 76, COL.red);
      D.text(self.result.msg, CFG.W / 2, CFG.H / 2 + 30, 34, COL.txt);
    }
  };

  Game.prototype.drawBoard = function () {
    var self = this;
    var COL = CFG.COL;
    MC.hud(self.meta, self.timeLeft, self.total, COL.cyan);
    D.text('看准提示，快速滑动对应方向；按错会下滑！', CFG.W / 2, 160, 24, COL.dim);
    // 爬梯
    var lx = CFG.W / 2;
    var half = 78;
    D.line(lx - half, TOP_Y, lx - half, BOT_Y, '#3a414c', 14);
    D.line(lx + half, TOP_Y, lx + half, BOT_Y, '#3a414c', 14);
    for (var i = 0; i < RUNGS; i++) {
      var y = BOT_Y - i * SPACING;
      var lit = i < self.rung;
      D.line(lx - half + 4, y, lx + half - 4, y, lit ? COL.warn : '#2c313a', lit ? 8 : 6);
    }
    D.stripe(lx - half - 16, BOT_Y - 14, half * 2 + 32, 14, 10);
    // 玩家
    var py = BOT_Y - self.rung * SPACING;
    D.robot(lx, py, 1, COL.cyan);
    // 错误计数
    for (var m = 0; m < 3; m++) {
      D.circle(CFG.W - 90 - m * 56, 150, 20, m < self.misses ? 'rgba(255,82,82,0.9)' : 'rgba(255,82,82,0.22)', COL.line, 3);
      if (m < self.misses) D.text('✕', CFG.W - 90 - m * 56, 151, 22, COL.bg);
    }
    // 提示箭头
    if (self.state === 'play' && self.prompt) {
      var blink = self.prompt.t < 0.55 ? (Math.sin(GP.now() / 70) > 0 ? 1 : 0.35) : 1;
      var c = GP.ctx;
      c.globalAlpha = blink;
      D.rr(lx - 90, 430, 180, 180, 26, COL.panel2, COL.warn, 6);
      D.textSh(ARROWS[self.prompt.dir], lx, 520, 110, COL.warn);
      c.globalAlpha = 1;
      // 底部方向提示
      var bw = 110, gap = 22, bx = (CFG.W - (bw * 4 + gap * 3)) / 2, by = 1240;
      for (var k = 0; k < 4; k++) {
        D.rr(bx + k * (bw + gap), by, bw, 90, 14, DIRS[k] === self.prompt.dir ? 'rgba(255,196,0,0.28)' : COL.panel2, DIRS[k] === self.prompt.dir ? COL.warn : COL.line, 3);
        D.text(ARROWS[DIRS[k]], bx + k * (bw + gap) + bw / 2, by + 46, 44, DIRS[k] === self.prompt.dir ? COL.warn : COL.dim);
      }
    }
    D.drawFloat();
  };

  GP.MG = GP.MG || {};
  GP.MG.ladder = { create: function () { return new Game(); } };
})((typeof GameGlobal !== 'undefined') ? GameGlobal : ((typeof globalThis !== 'undefined') ? globalThis : this));