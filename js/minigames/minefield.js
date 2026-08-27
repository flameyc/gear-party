// 小游戏①：工坊地雷阵 —— 参考《机械狂欢》「地雷阵」
(function (g) {
  var GP = g.GP = g.GP || {};
  var CFG = GP.CFG, D = GP.draw, MC = GP.mgCommon;

  var COLS = 8, ROWS = 6, CELL = 62;
  var BX = (CFG.W - COLS * CELL) / 2, BY = 300;
  var BW = COLS * CELL, BH = ROWS * CELL;

  function Game() {
    var self = this;
    var Df = GP.difficulty;
    var G = Df.perGame.minefield;
    self.meta = MC.metaOf('minefield');
    self.countT = 2.4;
    self.state = 'count';
    self.result = null;
    self.timeLeft = self.meta.dur * Df.timeMul;
    self.total = self.meta.dur * Df.timeMul;
    // 迷宫布局
    self.start = { x: 0, y: GP.randInt(1, ROWS - 2) };
    self.goal = { x: COLS - 1, y: GP.pick([1, 2, 3, 4]) };
    self.detectR = G.detectR;
    self.mines = [];
    var guard = {};
    var targetMines = 8 + (G.minesAdd || 0);
    var tries = 0;
    while (self.mines.length < targetMines && tries < 500) {
      tries++;
      var mx = GP.randInt(0, COLS - 1), my = GP.randInt(0, ROWS - 1);
      var k = mx + ',' + my;
      var isStart = (mx === self.start.x && my === self.start.y);
      var isGoal = (mx === self.goal.x && my === self.goal.y);
      var nearStart = Math.max(Math.abs(mx - self.start.x), Math.abs(my - self.start.y)) <= 1;
      if (!isStart && !isGoal && !nearStart && !guard[k]) {
        guard[k] = 1;
        self.mines.push({ x: mx, y: my, revealed: false });
      }
    }
    self.revealedSet = {};
    self.px = BX + (self.start.x + 0.5) * CELL;
    self.py = BY + (self.start.y + 0.5) * CELL;
    self.cell = { x: self.start.x, y: self.start.y };
    self.tx = self.px; self.ty = self.py;
    self.down = false;
    self.boom = null; // boom 动画计时
    self.won = false;
  }

  Game.prototype.cellOf = function (px, py) {
    var cx = GP.clamp(Math.round((px - BX) / CELL - 0.5), 0, COLS - 1);
    var cy = GP.clamp(Math.round((py - BY) / CELL - 0.5), 0, ROWS - 1);
    return { x: cx, y: cy };
  };

  Game.prototype.startPlay = function () {};

  Game.prototype.update = function (dt) {
    var self = this;
    if (self.state === 'count') {
      self.countT -= dt;
      if (self.countT <= 0) { self.state = 'play'; }
      return;
    }
    if (self.state !== 'play') {
      if (self.boom !== null) self.boom += dt;
      return;
    }
    self.timeLeft -= dt;
    if (self.timeLeft <= 0) { self.finish(false, '时间耗尽'); return; }

    // 跟随手指，限位在棋盘内
    var pad = CELL * 0.5 + 8;
    var txx = GP.clamp(self.tx, BX + pad, BX + BW - pad);
    var tyy = GP.clamp(self.ty, BY + pad, BY + BH - pad);
    var k = 1 - Math.exp(-10 * dt);
    self.px += (txx - self.px) * k;
    self.py += (tyy - self.py) * k;

    var nc = self.cellOf(self.px, self.py);
    if (nc.x !== self.cell.x || nc.y !== self.cell.y) {
      self.cell = nc;
      // 是否踩雷
      if (!(nc.x === self.start.x && nc.y === self.start.y)) {
        for (var i = 0; i < self.mines.length; i++) {
          var m = self.mines[i];
          if (m.x === nc.x && m.y === nc.y) {
            self.boom = 0;
            GP.audio.bad();
            D.addShake(14);
            D.spark(BX + (m.x + 0.5) * CELL, BY + (m.y + 0.5) * CELL, CFG.COL.red, 26, 320);
            self.finish(false, '踩中地雷');
            return;
          }
        }
      }
      // 终点
      if (nc.x === self.goal.x && nc.y === self.goal.y) {
        self.won = true;
        var score = 150 + Math.ceil(self.timeLeft) * 10;
        self.finish(true, '抵达终点', score);
        return;
      }
    }
    // 探测圈揭示地雷
    for (var j = 0; j < self.mines.length; j++) {
      var mm = self.mines[j];
      if (!mm.revealed) {
        var dx = mm.x - self.cell.x, dy = mm.y - self.cell.y;
        if (dx * dx + dy * dy <= 2.25) mm.revealed = true;
      }
    }
  };

  Game.prototype.finish = function (win, msg, score) {
    var self = this;
    self.state = 'done';
    self.result = { win: win, msg: msg, score: win ? score : 0 };
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
    // 工厂背景装饰
    for (var bi = 0; bi < 4; bi++) {
      D.gear(70 + bi * 190, 190, 30, 8, GP.now() / 900 + bi, 'rgba(139,149,163,0.08)');
    }
    if (self.state === 'count') {
      this.drawBoard();
      MC.count(self.countT);
      return;
    }
    this.drawBoard();
    if (self.state === 'done' && !self.won) {
      MC.dim();
      D.textSh('💥 报废！', CFG.W / 2, CFG.H / 2 - 60, 76, COL.red);
      D.text(self.result ? self.result.msg : '', CFG.W / 2, CFG.H / 2 + 30, 34, COL.txt);
    }
  };

  Game.prototype.drawBoard = function () {
    var self = this;
    var COL = CFG.COL;
    MC.hud(self.meta, self.timeLeft, self.total, COL.cyan);
    // 提示
    D.text('拖动机器人穿过暗雷区抵达终点（靠近的雷会显形）', CFG.W / 2, 160, 24, COL.dim);
    // 棋盘
    D.rr(BX - 10, BY - 10, BW + 20, BH + 20, 10, COL.panel, COL.line, 4);
    for (var r = 0; r < ROWS; r++) {
      for (var cIdx = 0; cIdx < COLS; cIdx++) {
        var x = BX + cIdx * CELL, y = BY + r * CELL;
        var shade = (cIdx + r) % 2 === 0 ? '#1c2026' : '#22272e';
        D.rr(x + 2, y + 2, CELL - 4, CELL - 4, 6, shade);
        // 已揭示的地雷
        for (var m = 0; m < self.mines.length; m++) {
          var mm = self.mines[m];
          if (mm.revealed && mm.x === cIdx && mm.y === r) {
            var blink = 0.6 + 0.4 * Math.sin(GP.now() / 120);
            D.circle(x + CELL / 2, y + CELL / 2, CELL * 0.36, 'rgba(255,82,82,' + (0.35 + blink * 0.25) + ')');
            D.text('💣', x + CELL / 2, y + CELL / 2 + 2, 30);
          }
        }
      }
    }
    // 终点
    var gx = BX + (self.goal.x + 0.5) * CELL, gy = BY + (self.goal.y + 0.5) * CELL;
    D.stripe(gx - CELL * 0.38, gy - CELL * 0.38, CELL * 0.76, CELL * 0.76, 10);
    D.text('终点', gx, gy + 2, 22, COL.bg);
    // 玩家
    var s = 1 + 0.06 * Math.sin(GP.now() / 180);
    D.robot(self.px, self.py, s, COL.cyan);
    // 爆炸
    if (self.boom !== null && self.boom < 1.2) {
      D.textSh('💥', self.px, self.py - 40, 90, COL.red);
    }
    D.drawFx();
    D.drawFloat();
  };

  GP.MG = GP.MG || {};
  GP.MG.minefield = { create: function () { return new Game(); } };
})((typeof GameGlobal !== 'undefined') ? GameGlobal : ((typeof globalThis !== 'undefined') ? globalThis : this));