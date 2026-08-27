// 小游戏⑤：偷零件 —— 参考《机械狂欢》「偷食豆子」（看守低头时动手）
(function (g) {
  var GP = g.GP = g.GP || {};
  var CFG = GP.CFG, D = GP.draw, MC = GP.mgCommon;

  var COLS = 5, ROWS = 4, CELL = 112;
  var OX = (CFG.W - COLS * CELL) / 2, OY = 430;
  var TYPES = ['gear', 'piston', 'spring', 'chip', 'coil', 'bolt'];
  var GAZE_DOWN = 2.6, GAZE_BLINK = 0.45, GAZE_UP = 1.9;
  var TOTAL = 8, FILL_T = 0.42;

  function Game() {
    var self = this;
    self.meta = MC.metaOf('stealparts');
    self.countT = 2.4;
    self.state = 'count';
    self.result = null;
    self.timeLeft = self.meta.dur;
    self.total = self.meta.dur;
    // 零件
    self.parts = [];
    var used = {};
    while (self.parts.length < TOTAL) {
      var c = GP.randInt(0, COLS * ROWS - 1);
      if (!used[c]) {
        used[c] = 1;
        self.parts.push({
          cell: c,
          col: c % COLS, row: Math.floor(c / COLS),
          type: GP.pick(TYPES),
          x: OX + (c % COLS) * CELL + CELL / 2,
          y: OY + Math.floor(c / COLS) * CELL + CELL / 2
        });
      }
    }
    // 看守机器人
    self.guardX = 400;
    self.guardDir = 1;
    self.gaze = 'down'; // down | blink | up
    self.gazeT = GAZE_DOWN;
    self.manual = 0; // 报纸动画
    self.collected = 0;
    self.active = null; // 正在偷的零件
    self.prog = 0;
    self.caught = null;
  }

  Game.prototype.startPlay = function () {};

  Game.prototype.update = function (dt) {
    var self = this;
    if (self.state === 'count') {
      self.countT -= dt;
      if (self.countT <= 0) { self.state = 'play'; }
      return;
    }
    if (self.state !== 'play') return;
    self.timeLeft -= dt;
    if (self.timeLeft <= 0) { self.finish(false, '时间耗尽'); return; }
    // 看守巡逻
    self.guardX += self.guardDir * 130 * dt;
    if (self.guardX > 640) { self.guardX = 640; self.guardDir = -1; }
    if (self.guardX < 110) { self.guardX = 110; self.guardDir = 1; }
    // 视线状态机
    self.gazeT -= dt;
    if (self.gazeT <= 0) {
      if (self.gaze === 'down') { self.gaze = 'blink'; self.gazeT = GAZE_BLINK; GP.audio.alarm(); }
      else if (self.gaze === 'blink') { self.gaze = 'up'; self.gazeT = GAZE_UP; }
      else { self.gaze = 'down'; self.gazeT = GAZE_DOWN; self.manual = 0; }
    }
    // 偷零件进度
    if (self.active) {
      if (self.fingerInActive) {
        self.prog += dt / FILL_T;
        if (self.prog >= 1) {
          // 收手瞬间
          if (self.gaze === 'up') {
            D.addShake(14);
            D.spark(self.active.x, self.active.y, CFG.COL.red, 22, 260);
            GP.audio.bad();
            self.caught = self.active;
            self.finish(false, '被检修机器人发现');
            return;
          }
          self.collected++;
          GP.audio.pickup();
          D.floatText('+1', self.active.x, self.active.y - 20, 34, CFG.COL.green);
          self.parts.splice(self.parts.indexOf(self.active), 1);
          self.active = null;
          self.prog = 0;
          if (self.collected >= TOTAL) {
            var score = 120 + TOTAL * 30 + Math.max(1, Math.ceil(self.timeLeft)) * 4;
            self.finish(true, '零件偷光！', score);
            return;
          }
        }
      } else {
        self.prog -= dt * 2.2;
        if (self.prog <= 0) { self.prog = 0; self.active = null; }
      }
    }
  };

  Game.prototype.finish = function (win, msg, score) {
    var self = this;
    self.state = 'done';
    self.result = { win: win, msg: msg, score: win ? score : 0 };
    if (win) GP.audio.win(); else GP.audio.lose();
  };

  Game.prototype.onDown = function (x, y) {
    var self = this;
    if (self.state !== 'play') return;
    for (var i = 0; i < self.parts.length; i++) {
      var p = self.parts[i];
      var dx = x - p.x, dy = y - p.y;
      if (dx * dx + dy * dy <= (CELL * 0.42) * (CELL * 0.42)) {
        self.active = p;
        self.prog = 0;
        self.fingerInActive = true;
        return;
      }
    }
  };
  Game.prototype.onMove = function (x, y) {
    var self = this;
    if (self.active) {
      var dx = x - self.active.x, dy = y - self.active.y;
      self.fingerInActive = (dx * dx + dy * dy <= (CELL * 0.55) * (CELL * 0.55));
    }
  };
  Game.prototype.onUp = function () { this.fingerInActive = false; };
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
      D.textSh('🔦 报废！', CFG.W / 2, CFG.H / 2 - 60, 76, COL.red);
      D.text(self.result.msg, CFG.W / 2, CFG.H / 2 + 30, 34, COL.txt);
    }
  };

  Game.prototype.drawBoard = function () {
    var self = this;
    var COL = CFG.COL;
    MC.hud(self.meta, self.timeLeft, self.total, COL.cyan);
    D.text('按住零件偷取（' + self.collected + '/' + TOTAL + '），抬头瞬间收手必被抓！', CFG.W / 2, 160, 24, COL.dim);
    // 看守
    var gx = self.guardX, gy = 300;
    D.rr(gx - 46, gy - 36, 92, 78, 16, COL.panel2, COL.line, 4);
    // 头
    var lookUp = (self.gaze === 'up') || (self.gaze === 'blink');
    D.rr(gx - 30, gy - 66, 60, 44, 10, '#3a414c', COL.line, 3);
    if (self.gaze === 'down') {
      // 低头看报
      D.rr(gx - 26, gy - 34, 52, 30, 6, '#e8ecf1');
      D.line(gx - 18, gy - 24, gx + 18, gy - 24, COL.dim, 3);
      D.line(gx - 18, gy - 14, gx + 18, gy - 14, COL.dim, 3);
    } else {
      // 发光眼睛
      var blinkF = (self.gaze === 'blink') ? (Math.sin(GP.now() / 60) > 0 ? 1 : 0.2) : 1;
      var c = GP.ctx;
      c.globalAlpha = blinkF;
      D.circle(gx - 16, gy - 44, 7, COL.red);
      D.circle(gx + 16, gy - 44, 7, COL.red);
      c.globalAlpha = 1;
      // 探照光锥
      var cone = GP.ctx.createLinearGradient(gx, 260, gx, OY + ROWS * CELL);
      cone.addColorStop(0, 'rgba(255,82,82,0.28)');
      cone.addColorStop(1, 'rgba(255,82,82,0)');
      c.fillStyle = cone;
      c.beginPath();
      c.moveTo(gx - 20, gy + 10);
      c.lineTo(gx + 20, gy + 10);
      c.lineTo(gx + 210, OY + ROWS * CELL);
      c.lineTo(gx - 210, OY + ROWS * CELL);
      c.closePath();
      c.fill();
    }
    // 状态文字
    if (self.gaze === 'down') D.text('📰 低头看报中… 快拿！', CFG.W / 2, 240, 26, COL.dim);
    else if (self.gaze === 'blink') D.text('⚠ 要抬头了！松手！', CFG.W / 2, 240, 26, COL.warn);
    else D.text('🔦 抬头了！别动！', CFG.W / 2, 240, 26, COL.red);
    // 区域
    D.rr(OX - 10, OY - 10, COLS * CELL + 20, ROWS * CELL + 20, 12, COL.panel, COL.line, 4);
    for (var r = 0; r < ROWS; r++) {
      for (var cc = 0; cc < COLS; cc++) {
        if ((cc + r) % 2 === 0) D.rr(OX + cc * CELL + 3, OY + r * CELL + 3, CELL - 6, CELL - 6, 10, '#1c2026');
      }
    }
    for (var i = 0; i < self.parts.length; i++) {
      var p = self.parts[i];
      var isActive = (self.active === p);
      D.part(p.type, p.x, p.y, isActive ? 40 : 34, p.type === 'gear' ? COL.warn : COL.steel);
      if (isActive && self.prog > 0) {
        var cc2 = GP.ctx;
        cc2.strokeStyle = COL.green;
        cc2.lineWidth = 7;
        cc2.beginPath();
        cc2.arc(p.x, p.y, 52, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * self.prog);
        cc2.stroke();
      }
    }
    D.drawFx();
    D.drawFloat();
  };

  GP.MG = GP.MG || {};
  GP.MG.stealparts = { create: function () { return new Game(); } };
})((typeof GameGlobal !== 'undefined') ? GameGlobal : ((typeof globalThis !== 'undefined') ? globalThis : this));