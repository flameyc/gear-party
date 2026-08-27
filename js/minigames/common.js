// 小游戏公共组件：HUD、倒计时
(function (g) {
  var GP = g.GP = g.GP || {};
  var CFG = GP.CFG, D = GP.draw, C = function () { return GP.ctx; };

  GP.mgCommon = {
    metaOf: function (id) {
      for (var i = 0; i < CFG.MG.length; i++) if (CFG.MG[i].id === id) return CFG.MG[i];
      return CFG.MG[0];
    },
    // 顶部状态条：名字 + 时间条
    hud: function (meta, timeLeft, total, pColor) {
      var COL = CFG.COL;
      D.panel(24, 24, GP.CFG.W - 48, 92);
      if (pColor) D.circle(56, 70, 14, pColor);
      D.text(meta.icon + ' ' + meta.name, 84, 70, 28, COL.txt, 'left');
      var bx = GP.CFG.W - 48 - 210, bw = 200;
      D.rr(bx, 56, bw, 20, 10, '#101318');
      var frac = GP.clamp(timeLeft / total, 0, 1);
      var colr = frac > 0.4 ? COL.cyan : (frac > 0.2 ? COL.warn : COL.red);
      if (frac > 0) D.rr(bx, 56, Math.max(6, bw * frac), 20, 10, colr);
      D.text(Math.max(0, Math.ceil(timeLeft)) + 's', bx + bw + 30, 66, 26, colr, 'left');
    },
    // 开局倒计时
    count: function (t) {
      var COL = CFG.COL;
      if (t <= 0) return;
      var n = Math.ceil(t / 0.8);
      var frac = 1 - (t - (n - 1) * 0.8) / 0.8;
      var cx = GP.CFG.W / 2, cy = GP.CFG.H / 2 - 20;
      D.circle(cx, cy, 120, 'rgba(10,12,16,0.75)', 'rgba(255,255,255,0.12)', 6);
      var c = C();
      c.strokeStyle = COL.cyan;
      c.lineWidth = 10;
      c.beginPath();
      c.arc(cx, cy, 120, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      c.stroke();
      D.textSh(String(n), cx, cy, 130, n === 1 ? COL.red : COL.warn);
    },
    // 结束时的暗色遮罩
    dim: function () {
      var c = C();
      c.fillStyle = 'rgba(8,10,13,0.55)';
      c.fillRect(0, 0, GP.CFG.W, GP.CFG.H);
    }
  };
})((typeof GameGlobal !== 'undefined') ? GameGlobal : ((typeof globalThis !== 'undefined') ? globalThis : this));