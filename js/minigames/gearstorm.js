// 小游戏②：齿轮风暴 —— 参考《机械狂欢》「飞旋齿轮生存战」
(function (g) {
  var GP = g.GP = g.GP || {};
  var CFG = GP.CFG, D = GP.draw, MC = GP.mgCommon;

  function Game() {
    var self = this;
    self.meta = MC.metaOf('gearstorm');
    self.countT = 2.4;
    self.state = 'count';
    self.result = null;
    self.timeLeft = self.meta.dur;
    self.total = self.meta.dur;
    self.px = CFG.W / 2; self.py = CFG.H * 0.72;
    self.tx = self.px; self.ty = self.py;
    self.down = false;
    self.r = 30;
    self.gears = [];
    self.spawnT = 0.9;
    self.nearMiss = 0;
    self.lastNear = null;
  }

  Game.prototype.startPlay = function () {};

  Game.prototype.spawn = function () {
    var self = this;
    var edge = GP.randInt(0, 3);
    var r = GP.rand(26, 50);
    var sp = GP.rand(150, 300);
    var g = { x: 0, y: 0, vx: 0, vy: 0, r: r, rot: GP.rand(0, 6.28), vr: GP.rand(-3, 3), color: GP.pick([CFG.COL.warn, CFG.COL.orange, CFG.COL.steel, '#c8a415']) };
    if (edge === 0) { g.x = -r - 20; g.y = GP.rand(200, CFG.H - 100); g.vx = sp; g.vy = GP.rand(-40, 40); }
    else if (edge === 1) { g.x = CFG.W + r + 20; g.y = GP.rand(200, CFG.H - 100); g.vx = -sp; g.vy = GP.rand(-40, 40); }
    else if (edge === 2) { g.x = GP.rand(0, CFG.W); g.y = -r - 20; g.vx = GP.rand(-60, 60); g.vy = sp; }
    else { g.x = GP.rand(0, CFG.W); g.y = CFG.H + r + 20; g.vx = GP.rand(-60, 60); g.vy = -sp; }
    self.gears.push(g);
    self.spawnT = Math.max(0.38, self.spawnT * 0.92);
  };

  Game.prototype.update = function (dt) {
    var self = this;
    if (self.state === 'count') {
      self.countT -= dt;
      if (self.countT <= 0) { self.state = 'play'; self.spawnT = 0.5; }
      return;
    }
    if (self.state !== 'play') { return; }
    self.timeLeft -= dt;
    if (self.timeLeft <= 0) {
      var score = 100 + Math.max(1, Math.ceil(self.timeLeft)) * 8 + self.nearMiss * 3;
      self.finish(true, '生存成功！', score);
      return;
    }
    // 移动
    var k = 1 - Math.exp(-11 * dt);
    self.px += (self.tx - self.px) * k;
    self.py += (self.ty - self.py) * k;
    self.px = GP.clamp(self.px, 50, CFG.W - 50);
    self.py = GP.clamp(self.py, 200, CFG.H - 120);
    // 齿轮
    self.spawnT -= dt;
    if (self.spawnT <= 0) { self.spawn(); }
    for (var i = self.gears.length - 1; i >= 0; i--) {
      var g = self.gears[i];
      g.x += g.vx * dt; g.y += g.vy * dt; g.rot += g.vr * dt;
      if (g.x < -120 || g.x > CFG.W + 120 || g.y < -120 || g.y > CFG.H + 120) {
        self.gears.splice(i, 1);
        continue;
      }
      var dx = g.x - self.px, dy = g.y - self.py;
      var dd = Math.sqrt(dx * dx + dy * dy);
      if (dd < self.r + g.r * 0.85) {
        D.addShake(16);
        D.spark(self.px, self.py, CFG.COL.red, 30, 340);
        GP.audio.bad();
        self.finish(false, '被齿轮击中');
        return;
      }
      if (dd < self.r + g.r + 16) {
        if (self.lastNear !== g) { self.nearMiss++; self.lastNear = g; D.spark((self.px + g.x) / 2, (self.py + g.y) / 2, CFG.COL.cyan, 4, 120); }
      }
    }
  };

  Game.prototype.finish = function (win, msg, score) {
    this.state = 'done';
    this.result = { win: win, msg: msg, score: win ? score : 0 };
    if (win) GP.audio.win(); else GP.audio.lose();
  };

  Game.prototype.onDown = function (x, y) { this.down = true; this.tx = x; this.ty = y; };
  Game.prototype.onMove = function (x, y) { if (this.down) { this.tx = x; this.ty = y; } };
  Game.prototype.onUp = function () { this.down = false; };
  Game.prototype.onSwipe = function () {};

  Game.prototype.draw = function () {
    var self = this;
    var COL = CFG.COL;
    GP.clear();
    D.rr(0, 0, CFG.W, CFG.H, 0, COL.bg);
    // 背景管道
    var c = GP.ctx;
    c.strokeStyle = 'rgba(139,149,163,0.10)';
    c.lineWidth = 10;
    c.beginPath(); c.moveTo(-20, 300); c.quadraticCurveTo(300, 260, 380, 420); c.lineTo(760, 380); c.stroke();
    c.beginPath(); c.moveTo(-20, 900); c.quadraticCurveTo(400, 840, 760, 980); c.stroke();
    c.beginPath(); c.moveTo(-20, 1200); c.quadraticCurveTo(300, 1260, 760, 1150); c.stroke();
    if (self.state === 'count') {
      this.drawBoard();
      MC.count(self.countT);
      return;
    }
    this.drawBoard();
    if (self.state === 'done' && !self.result.win) {
      MC.dim();
      D.textSh('⚙️ 报废！', CFG.W / 2, CFG.H / 2 - 60, 76, COL.red);
      D.text(self.result.msg, CFG.W / 2, CFG.H / 2 + 30, 34, COL.txt);
    }
  };

  Game.prototype.drawBoard = function () {
    var self = this;
    var COL = CFG.COL;
    MC.hud(self.meta, self.timeLeft, self.total, COL.cyan);
    D.text('拖动机器人躲避飞旋的齿轮，坚持到最后', CFG.W / 2, 160, 24, COL.dim);
    for (var i = 0; i < self.gears.length; i++) {
      var g = self.gears[i];
      D.gear(g.x, g.y, g.r, 8, g.rot, g.color);
    }
    // 光圈
    D.circle(self.px, self.py, self.r + 6, 'rgba(53,208,255,0.12)');
    D.robot(self.px, self.py, 1.1, COL.cyan);
    D.drawFx();
    if (self.nearMiss > 0) D.text('擦身 ×' + self.nearMiss, CFG.W / 2, CFG.H - 70, 26, COL.dim);
  };

  GP.MG = GP.MG || {};
  GP.MG.gearstorm = { create: function () { return new Game(); } };
})((typeof GameGlobal !== 'undefined') ? GameGlobal : ((typeof globalThis !== 'undefined') ? globalThis : this));