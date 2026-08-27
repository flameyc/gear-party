// 程序化绘制工具：所有美术均为代码绘制，零素材依赖
(function (g) {
  var GP = g.GP = g.GP || {};
  var ctx;
  function C() { if (!ctx) ctx = GP.ctx; return ctx; }

  var D = {};

  D.rr = function (x, y, w, h, r, fill, stroke, lw) {
    var c = C();
    r = r || 8;
    if (w <= 0 || h <= 0) return;
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 3; c.stroke(); }
  };

  D.line = function (x1, y1, x2, y2, color, lw) {
    var c = C();
    c.strokeStyle = color; c.lineWidth = lw || 3;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  };

  D.circle = function (x, y, r, fill, stroke, lw) {
    var c = C();
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 3; c.stroke(); }
  };

  // 危险警示条纹
  D.stripe = function (x, y, w, h, step) {
    var c = C();
    step = step || 22;
    c.save();
    c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.fillStyle = GP.CFG.COL.warn;
    c.fillRect(x, y, w, h);
    c.fillStyle = '#1c1f24';
    for (var i = -h; i < w + h; i += step) {
      c.beginPath();
      c.moveTo(x + i, y + h);
      c.lineTo(x + i + step * 0.75, y + h);
      c.lineTo(x + i + step * 0.75 - h, y);
      c.lineTo(x + i - h, y);
      c.closePath();
      c.fill();
    }
    c.restore();
  };

  // 齿轮
  D.gear = function (x, y, r, teeth, rot, color) {
    var c = C();
    teeth = teeth || 8;
    rot = rot || 0;
    color = color || GP.CFG.COL.steel;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.fillStyle = color;
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = Math.max(2, r * 0.08);
    var toothH = r * 0.28;
    var n = teeth * 2;
    c.beginPath();
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      var rr = (i % 2 === 0) ? r : r + toothH;
      var px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
    c.fill();
    c.stroke();
    c.beginPath(); c.arc(0, 0, r * 0.45, 0, Math.PI * 2);
    c.fillStyle = GP.CFG.COL.bg; c.fill();
    c.beginPath(); c.arc(0, 0, r * 0.22, 0, Math.PI * 2);
    c.fillStyle = color; c.fill();
    c.restore();
  };

  // 小机器人（玩家）
  D.robot = function (x, y, s, color, rot) {
    var c = C();
    s = s || 1;
    c.save();
    c.translate(x, y);
    c.rotate(rot || 0);
    c.scale(s, s);
    // 天线
    c.strokeStyle = GP.CFG.COL.steel; c.lineWidth = 4;
    c.beginPath(); c.moveTo(0, -26); c.lineTo(6, -38); c.stroke();
    c.beginPath(); c.arc(8, -40, 5, 0, Math.PI * 2);
    c.fillStyle = GP.CFG.COL.red; c.fill();
    // 身体
    D.rr(-22, -22, 44, 46, 12, color, 'rgba(0,0,0,0.4)', 3);
    // 眼睛
    c.fillStyle = '#0b0e12';
    D.rr(-16, -14, 13, 12, 4, '#0b0e12');
    D.rr(3, -14, 13, 12, 4, '#0b0e12');
    c.fillStyle = '#dff6ff';
    D.rr(-13, -11, 7, 6, 3, '#dff6ff');
    D.rr(6, -11, 7, 6, 3, '#dff6ff');
    // 嘴
    c.strokeStyle = '#0b0e12'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-8, 10); c.lineTo(8, 10); c.stroke();
    c.restore();
  };

  // 零件（装配/偷零件用）：6 种
  D.part = function (type, x, y, r, color) {
    var c = C();
    color = color || GP.CFG.COL.steel;
    r = r || 22;
    c.save();
    c.translate(x, y);
    if (type === 'gear') {
      D.gear(0, 0, r * 0.72, 8, 0.3, color);
    } else if (type === 'piston') {
      D.rr(-r * 0.9, -r * 0.28, r * 1.8, r * 0.56, 6, color);
      D.rr(-r * 0.5, -r * 0.7, r, r * 0.5, 5, '#3a414c');
      D.circle(0, r * 0.35, r * 0.24, '#ff5252');
    } else if (type === 'spring') {
      c.strokeStyle = color; c.lineWidth = r * 0.3;
      c.beginPath();
      for (var i = 0; i <= 8; i++) {
        var yy = -r + (i / 8) * 2 * r;
        var xx = (i % 2 === 0 ? -1 : 1) * r * 0.55;
        if (i === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy);
      }
      c.stroke();
    } else if (type === 'chip') {
      D.rr(-r, -r * 0.7, r * 2, r * 1.4, 6, color);
      c.fillStyle = '#0b0e12';
      for (var j = -1; j <= 1; j++) { D.rr(j * r * 0.6 - 4, -r * 1.05, 8, r * 0.35, 2, '#0b0e12'); D.rr(j * r * 0.6 - 4, r * 0.7, 8, r * 0.35, 2, '#0b0e12'); }
    } else if (type === 'bolt') {
      D.circle(0, 0, r * 0.8, color);
      c.fillStyle = '#0b0e12';
      c.beginPath(); c.arc(0, 0, r * 0.28, 0, Math.PI * 2); c.fill();
      D.line(-r * 0.8, 0, r * 0.8, 0, '#0b0e12', r * 0.18);
    } else { // coil
      D.circle(0, 0, r * 0.55, color);
      c.strokeStyle = '#0b0e12'; c.lineWidth = r * 0.22;
      c.beginPath(); c.arc(0, 0, r * 0.55, 0.4, Math.PI * 1.6); c.stroke();
      D.circle(-r * 0.7, 0, r * 0.22, '#ff7a00');
      D.circle(r * 0.7, 0, r * 0.22, '#ff7a00');
    }
    c.restore();
  };

  D.text = function (txt, x, y, size, color, align, bold) {
    var c = C();
    c.font = (bold === false ? '' : 'bold ') + size + 'px "Microsoft YaHei", "PingFang SC", sans-serif';
    c.fillStyle = color || GP.CFG.COL.txt;
    c.textAlign = align || 'center';
    c.textBaseline = 'middle';
    c.fillText(txt, x, y);
  };

  D.textSh = function (txt, x, y, size, color, align) {
    var c = C();
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.55)';
    c.shadowBlur = 10;
    c.shadowOffsetY = 4;
    D.text(txt, x, y, size, color, align);
    c.restore();
  };

  D.btn = function (x, y, w, h, label, color, lw, sub) {
    D.rr(x, y, w, h, 16, color || GP.CFG.COL.panel2, GP.CFG.COL.line, lw || 3);
    D.text(label, x + w / 2, y + h / 2 - (sub ? 5 : 0), 30, GP.CFG.COL.txt);
  };

  D.panel = function (x, y, w, h, fill) {
    D.rr(x, y, w, h, 18, fill || GP.CFG.COL.panel, GP.CFG.COL.line, 3);
  };

  D.heart = function (x, y, s, fill) {
    var c = C();
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.fillStyle = fill || GP.CFG.COL.red;
    c.beginPath();
    c.moveTo(0, 8);
    c.bezierCurveTo(-14, -6, -8, -16, 0, -8);
    c.bezierCurveTo(8, -16, 14, -6, 0, 8);
    c.fill();
    c.restore();
  };

  // 粒子
  var parts = [];
  D.spark = function (x, y, color, n, speed) {
    for (var i = 0; i < (n || 8); i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = (speed || 180) * GP.rand(0.4, 1);
      parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: GP.rand(0.25, 0.6), t: 0, r: GP.rand(2, 5), color: color || GP.CFG.COL.warn });
    }
  };
  D.updateFx = function (dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 420 * dt;
      if (p.t >= p.life) parts.splice(i, 1);
    }
  };
  D.drawFx = function () {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var a = 1 - p.t / p.life;
      D.circle(p.x, p.y, p.r * a, p.color);
    }
  };

  // 飘字
  var texts = [];
  D.floatText = function (txt, x, y, color, size) {
    texts.push({ txt: txt, x: x, y: y, t: 0, life: 0.9, color: color || GP.CFG.COL.txt, size: size || 30 });
  };
  D.updateFloat = function (dt) {
    for (var i = texts.length - 1; i >= 0; i--) {
      var t = texts[i];
      t.t += dt; t.y -= 60 * dt;
      if (t.t >= t.life) texts.splice(i, 1);
    }
  };
  D.drawFloat = function () {
    for (var i = 0; i < texts.length; i++) {
      var t = texts[i];
      var a = 1 - t.t / t.life;
      var c = C();
      c.globalAlpha = a;
      D.textSh(t.txt, t.x, t.y, t.size, t.color);
      c.globalAlpha = 1;
    }
  };

  D.shake = 0;
  D.addShake = function (v) { if (v > D.shake) D.shake = v; };
  D.applyShake = function () {
    if (D.shake > 0.2) {
      var c = C();
      c.translate(GP.rand(-D.shake, D.shake), GP.rand(-D.shake, D.shake));
      D.shake *= 0.86;
      if (D.shake < 0.2) D.shake = 0;
    }
  };

  GP.draw = D;
})((typeof GameGlobal !== 'undefined') ? GameGlobal : ((typeof globalThis !== 'undefined') ? globalThis : this));