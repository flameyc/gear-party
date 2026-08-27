// 小游戏⑥：装配流水线 —— 参考《机械狂欢》「枪械组装抢夺战」「魔方打砖块」（记忆+按序操作）
(function (g) {
  var GP = g.GP = g.GP || {};
  var CFG = GP.CFG, D = GP.draw, MC = GP.mgCommon;

  var TYPES = ['gear', 'piston', 'spring', 'chip', 'coil', 'bolt'];
  var SLOTS = 6, SLOT_W = 100, SLOT_H = 100, SLOT_GAP = 12;
  var SX = (CFG.W - (SLOTS * SLOT_W + (SLOTS - 1) * SLOT_GAP)) / 2, SY = 1080;
  var MACHINES = 3;
  var BLUE_T = 2.4;

  function Game() {
    var self = this;
    self.meta = MC.metaOf('assembly');
    self.countT = 2.4;
    self.state = 'count';
    self.result = null;
    self.timeLeft = self.meta.dur;
    self.total = self.meta.dur;
    self.machine = 0;      // 已完成机器数
    self.seq = [];
    self.floor = [];
    self.idx = 0;          // 当前装配进度
    self.phase = 'blueprint';
    self.blueT = 0;
    self.lastTap = null; self.lastTapT = 0;
    self.made = null; self.madeT = 0;
  }

  Game.prototype.startPlay = function () {
    this.newMachine();
  };

  Game.prototype.newMachine = function () {
    var self = this;
    var len = 3 + Math.min(self.machine, 2); // 3,4,5
    self.seq = [];
    for (var i = 0; i < len; i++) self.seq.push(TYPES[GP.randInt(0, TYPES.length - 1)]);
    // 地板零件：随机 6 个
    self.floor = [];
    for (var j = 0; j < SLOTS; j++) {
      // 保证前 len 个槽位凑齐所需类型（混排）
      var t = j < len ? self.seq[j] : TYPES[GP.randInt(0, TYPES.length - 1)];
      self.floor.push(t);
    }
    // 洗牌
    for (var k = self.floor.length - 1; k > 0; k--) {
      var w = GP.randInt(0, k);
      var tmp = self.floor[k]; self.floor[k] = self.floor[w]; self.floor[w] = tmp;
    }
    self.idx = 0;
    self.phase = 'blueprint';
    self.blueT = BLUE_T;
  };

  Game.prototype.update = function (dt) {
    var self = this;
    if (self.state === 'count') {
      self.countT -= dt;
      if (self.countT <= 0) { self.state = 'play'; self.newMachine(); }
      return;
    }
    if (self.state !== 'play') {
      if (self.made) { self.madeT += dt; if (self.madeT > 0.8) self.made = null; }
      return;
    }
    self.timeLeft -= dt;
    if (self.timeLeft <= 0) { self.finish(false, '时间耗尽'); return; }
    if (self.phase === 'blueprint') {
      self.blueT -= dt;
      if (self.blueT <= 0) { self.phase = 'build'; GP.audio.click(); }
    }
    if (self.lastTap) { self.lastTapT += dt; if (self.lastTapT > 0.3) self.lastTap = null; }
    if (self.made) { self.madeT += dt; if (self.madeT > 0.8) self.made = null; }
  };

  Game.prototype.finish = function (win, msg, score) {
    var self = this;
    self.state = 'done';
    self.result = { win: win, msg: msg, score: win ? score : 0 };
    if (win) GP.audio.win(); else GP.audio.lose();
  };

  Game.prototype.onDown = function (x, y) {
    var self = this;
    if (self.state !== 'play' || self.phase !== 'build') return;
    for (var i = 0; i < SLOTS; i++) {
      var sx = SX + i * (SLOT_W + SLOT_GAP);
      if (x >= sx && x <= sx + SLOT_W && y >= SY && y <= SY + SLOT_H) {
        var t = self.floor[i];
        if (t === self.seq[self.idx]) {
          self.idx++;
          GP.audio.good();
          self.lastTap = { slot: i, t: 0.3 };
          D.floatText('✓', sx + SLOT_W / 2, SY - 16, 32, CFG.COL.green);
          if (self.idx >= self.seq.length) {
            self.machine++;
            self.made = 1; self.madeT = 0;
            GP.audio.pickup();
            D.addShake(6);
            D.spark(sx + SLOT_W / 2, SY - 40, CFG.COL.warn, 26, 300);
            if (self.machine >= MACHINES) {
              var score = 480 + Math.max(1, Math.ceil(self.timeLeft)) * 4;
              self.finish(true, '三台机器组装完成！', score);
              return;
            }
            self.newMachine();
          }
        } else {
          self.idx = 0;
          self.lastTap = { slot: i, t: 0.3 };
          D.addShake(9);
          GP.audio.bad();
          D.floatText('顺序错误！', sx + SLOT_W / 2, SY - 16, 32, CFG.COL.red);
        }
        return;
      }
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
      D.textSh('🏭 报废！', CFG.W / 2, CFG.H / 2 - 60, 76, COL.red);
      D.text(self.result.msg, CFG.W / 2, CFG.H / 2 + 30, 34, COL.txt);
    }
  };

  Game.prototype.drawBoard = function () {
    var self = this;
    var COL = CFG.COL;
    MC.hud(self.meta, self.timeLeft, self.total, COL.cyan);
    D.text('按图纸顺序点击零件，组装 ' + MACHINES + ' 台机器', CFG.W / 2, 160, 24, COL.dim);
    // 机器进度
    for (var mi = 0; mi < MACHINES; mi++) {
      D.circle(CFG.W / 2 - 60 + mi * 60, 220, 20, mi < self.machine ? COL.warn : 'rgba(255,196,0,0.15)', COL.line, 3);
      if (mi < self.machine) D.text('⚙', CFG.W / 2 - 60 + mi * 60, 221, 22, COL.bg);
    }
    // 图纸区
    D.panel(90, 270, CFG.W - 180, 210);
    D.text('📐 图纸（记住顺序！）', CFG.W / 2, 305, 26, COL.dim);
    if (self.phase === 'blueprint') {
      // 图纸可见
      var n = self.seq.length;
      var bw = 86, bgap = 20;
      var bx = (CFG.W - (n * bw + (n - 1) * bgap)) / 2;
      for (var i = 0; i < n; i++) {
        D.rr(bx + i * (bw + bgap), 340, bw, 106, 14, COL.panel2, COL.warn, 3);
        D.part(self.seq[i], bx + i * (bw + bgap) + bw / 2, 393, 34, COL.warn);
        D.text(String(i + 1), bx + i * (bw + bgap) + bw / 2, 350, 22, COL.dim);
      }
      D.text('…' + Math.ceil(self.blueT) + 's 后开始装配', CFG.W / 2, 476, 24, COL.warn);
    } else {
      // 图纸隐藏：只显示当前进度
      D.text('装配进度 ' + self.idx + '/' + self.seq.length, CFG.W / 2, 390, 30, COL.green);
      var dots = 40;
      for (var di = 0; di < self.seq.length; di++) {
        D.circle(CFG.W / 2 - (self.seq.length - 1) * dots / 2 - 20 + di * dots, 430, 11, di < self.idx ? COL.green : 'rgba(126,224,129,0.18)', COL.line, 2);
      }
    }
    // 地板零件
    for (var s = 0; s < SLOTS; s++) {
      var sx = SX + s * (SLOT_W + SLOT_GAP);
      var isHot = (self.lastTap && self.lastTap.slot === s && self.lastTap.t > 0);
      D.rr(sx, SY, SLOT_W, SLOT_H, 16, isHot ? 'rgba(255,196,0,0.25)' : COL.panel2, isHot ? COL.warn : COL.line, 4);
      D.part(self.floor[s], sx + SLOT_W / 2, SY + SLOT_H / 2, 34, COL.warn === '#ffc400' && self.floor[s] === 'gear' ? '#d8a600' : COL.steel);
    }
    D.text('机器 ' + (self.machine + 1) + '/' + MACHINES, CFG.W / 2, 1240, 26, COL.dim);
    if (self.made) {
      D.textSh('✔ 机器组装完成！', CFG.W / 2, 980, 42, COL.green);
    }
    D.drawFx();
    D.drawFloat();
  };

  GP.MG = GP.MG || {};
  GP.MG.assembly = { create: function () { return new Game(); } };
})((typeof GameGlobal !== 'undefined') ? GameGlobal : ((typeof globalThis !== 'undefined') ? globalThis : this));