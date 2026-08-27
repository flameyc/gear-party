// 主流程：场景状态机 + 单人/派对两种模式 + 存档
(function (g) {
  var GP = g.GP = g.GP || {};
  var CFG = GP.CFG, D = GP.draw;

  var F = {
    state: 'menu',
    mode: null,          // solo | party
    players: [],         // 派对玩家
    solo: null,          // 单人数据
    roundIdx: 0,
    lastGameId: null,
    curMeta: null,
    mg: null,
    introT: 0,
    introPlayer: null,   // 派对轮到的玩家
    pendingPlayer: null, // 结果页之后轮到谁
    afterResult: null,   // 结果页点击后进入的状态
    resultT: 0,
    roundRank: [],       // 本回合排名
    winner: null,
    newBest: false,
    bgT: 0,
    buttons: [],
    resultDelay: null
  };

  // ---------- 存档 ----------
  function loadSave() {
    var sv = GP.save.load();
    if (!sv) sv = { best: 0, lb: [] };
    if (!sv.lb) sv.lb = [];
    return sv;
  }
  F.saveData = loadSave();

  // ---------- 工具 ----------
  function pickGame() {
    var cands = [];
    for (var i = 0; i < CFG.MG.length; i++) if (CFG.MG[i].id !== F.lastGameId) cands.push(CFG.MG[i]);
    F.curMeta = cands[GP.randInt(0, cands.length - 1)];
    F.lastGameId = F.curMeta.id;
  }

  function addBtn(x, y, w, h, cb) {
    F.buttons.push({ x: x, y: y, w: w, h: h, cb: cb });
  }

  // ---------- 模式启动 ----------
  function startSolo() {
    F.mode = 'solo';
    F.solo = { lives: CFG.SOLO_LIVES, score: 0, streak: 0 };
    F.soloStreakMax = 0;
    F.roundIdx = 1;
    F.newBest = false;
    F.pendingPlayer = null;
    // 重玩沿用：上次最高级 70% 起步（至少 1）
    F.level = Math.max(1, Math.floor((F.saveData.levelMax || 0) * 0.7) || 1);
    F.startLevel = F.level;
    startIntro();
  }

  function startParty() {
    F.mode = 'party';
    F.players = GP.players.makePlayers(F.partyN);
    F.roundIdx = 1;
    F.partyLevel = 1;
    F.newBest = false;
    startIntro();
  }

  function startIntro() {
    F.state = 'intro';
    F.introT = 1.7;
    pickGame();
    if (F.mode === 'party') {
      // 轮到下一个存活的玩家（pendingPlayer 由 onRoundEnd 预置）
      var alive = [];
      for (var i = 0; i < F.players.length; i++) if (F.players[i].alive) alive.push(F.players[i]);
      if (F.pendingPlayer) {
        F.introPlayer = F.pendingPlayer;
        F.pendingPlayer = null;
      } else {
        F.introPlayer = alive[0];
      }
    } else {
      F.introPlayer = null;
    }
  }

  function createGame() {
    // 注入本局难度参数到 GP.difficulty，小游戏 create() 内部读快照
    var lv = (F.mode === 'party') ? F.partyLevel : F.level;
    GP.diffApply(lv);
    F.curLevel = lv;
    F.mg = GP.MG[F.curMeta.id].create();
    F.resultDelay = null;
  }

  // 回合结束
  function onRoundEnd() {
    var res = F.mg.result;
    if (F.mode === 'solo') {
      F.solo.score += res.score;
      if (res.win) {
        F.solo.streak++;
        if (F.solo.streak > F.soloStreakMax) F.soloStreakMax = F.solo.streak;
        // 升级：每胜利一关 +1 级
        F.level++;
        if (F.level > (F.saveData.levelMax || 0)) F.saveData.levelMax = F.level;
      } else {
        F.solo.lives--;
        F.solo.streak = 0;
      }
      if (F.solo.score > F.saveData.best) { F.saveData.best = F.solo.score; F.newBest = true; }
      if (F.solo.lives <= 0) {
        F.afterResult = 'gameover';
      } else {
        F.afterResult = 'intro';
      }
    } else {
      var p = F.introPlayer;
      p.roundScore = res.score;
      p.score += res.score;
      // 还有玩家没玩本回合？
      var alive = [];
      for (var i = 0; i < F.players.length; i++) if (F.players[i].alive) alive.push(F.players[i]);
      var ai = 0;
      for (var j = 0; j < alive.length; j++) if (alive[j] === p) { ai = j; break; }
      if (ai < alive.length - 1) {
        F.pendingPlayer = alive[ai + 1];
        F.afterResult = 'intro';
      } else {
        F.pendingPlayer = null;
        F.afterResult = 'roundbreak';
        // 本回合结束：派对关卡 +1
        F.partyLevel++;
        applyRound();
      }
    }
    F.resultT = 0;
    F.state = 'result';
  }

  // 派对：本回合结算
  function applyRound() {
    var alive = [];
    for (var i = 0; i < F.players.length; i++) if (F.players[i].alive) alive.push(F.players[i]);
    var ranked = GP.players.rankRound(alive);
    F.roundRank = ranked;
    // 最低分者扣命（并列都扣）
    var min = ranked[ranked.length - 1].roundScore;
    for (var j = 0; j < ranked.length; j++) {
      if (ranked[j].roundScore === min) {
        ranked[j].lives--;
        if (ranked[j].lives <= 0) ranked[j].alive = false;
      }
    }
    var survivors = 0, winner = null;
    for (var k = 0; k < F.players.length; k++) {
      if (F.players[k].alive) { survivors++; winner = F.players[k]; }
    }
    if (survivors <= 1) {
      F.winner = winner;
      // 记录排行榜
      var entry = { name: F.winner ? F.winner.name : '无人', score: F.winner ? F.winner.score : 0, mode: 'party', date: new Date().toLocaleDateString() };
      F.saveData.lb.push(entry);
      F.saveData.lb.sort(function (a, b) { return b.score - a.score; });
      if (F.saveData.lb.length > CFG.LB_MAX) F.saveData.lb.length = CFG.LB_MAX;
      GP.save.write(F.saveData);
      F.afterResult2 = 'gameover';
    } else {
      F.roundIdx++;
      F.afterResult2 = 'roundbreak';
    }
  }

  // 结果页点击
  function advanceResult() {
    if (F.mode === 'solo') {
      if (F.solo.lives <= 0) {
        // 存档
        var e2 = { name: '你', score: F.solo.score, mode: 'solo', date: new Date().toLocaleDateString() };
        F.saveData.lb.push(e2);
        F.saveData.lb.sort(function (a, b) { return b.score - a.score; });
        if (F.saveData.lb.length > CFG.LB_MAX) F.saveData.lb.length = CFG.LB_MAX;
        GP.save.write(F.saveData);
        F.state = 'gameover';
      } else {
        F.roundIdx++;
        startIntro();
      }
    } else {
      if (F.afterResult === 'intro') {
        startIntro();
      } else if (F.afterResult === 'roundbreak') {
        F.state = 'roundbreak';
      } else {
        F.state = 'gameover';
      }
    }
  }

  // ---------- 输入 ----------
  function handleDown(x, y) {
    GP.audio.unlock();
    if (F.state === 'menu') {
      for (var i = F.buttons.length - 1; i >= 0; i--) {
        var b = F.buttons[i];
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.cb(); GP.audio.click(); return; }
      }
    } else if (F.state === 'partycount') {
      for (var j = F.buttons.length - 1; j >= 0; j--) {
        var bj = F.buttons[j];
        if (x >= bj.x && x <= bj.x + bj.w && y >= bj.y && y <= bj.y + bj.h) { bj.cb(); GP.audio.click(); return; }
      }
    } else if (F.state === 'play') {
      if (F.mg) F.mg.onDown(x, y);
    } else if (F.state === 'result') {
      if (F.resultT > 0.4) advanceResult();
    } else if (F.state === 'roundbreak') {
      if (F.afterResult2 === 'gameover') F.state = 'gameover';
      else startIntro();
    } else if (F.state === 'gameover') {
      for (var k = F.buttons.length - 1; k >= 0; k--) {
        var bk = F.buttons[k];
        if (x >= bk.x && x <= bk.x + bk.w && y >= bk.y && y <= bk.y + bk.h) { bk.cb(); GP.audio.click(); return; }
      }
    } else if (F.state === 'lb') {
      for (var m = F.buttons.length - 1; m >= 0; m--) {
        var bm = F.buttons[m];
        if (x >= bm.x && x <= bm.x + bm.w && y >= bm.y && y <= bm.y + bm.h) { bm.cb(); GP.audio.click(); return; }
      }
    }
  }

  function handleMove(x, y) {
    if (F.state === 'play' && F.mg) F.mg.onMove(x, y);
  }
  function handleUp() {
    if (F.state === 'play' && F.mg) F.mg.onUp();
  }
  function handleSwipe(dir) {
    if (F.state === 'play' && F.mg) F.mg.onSwipe(dir);
  }

  // ---------- 主循环 ----------
  var last = 0;
  function tick() {
    var now = GP.now();
    var dt = Math.min(1, (now - last) / 1000 || 0.016);
    last = now;
    update(dt);
    draw(dt);
    GP.raf(tick);
  }

  function update(dt) {
    F.bgT += dt;
    D.updateFx(dt);
    D.updateFloat(dt);
    if (F.state === 'intro') {
      F.introT -= dt;
      if (F.introT <= 0) {
        F.state = 'play';
        createGame();
      }
    } else if (F.state === 'play') {
      if (F.mg) {
        F.mg.update(dt);
        if (F.mg.result) {
          if (F.resultDelay === null) F.resultDelay = 0.45;
          else {
            F.resultDelay -= dt;
            if (F.resultDelay <= 0) onRoundEnd();
          }
        }
      }
    } else if (F.state === 'result') {
      F.resultT += dt;
    }
  }

  // ---------- 绘制 ----------
  function drawBg() {
    GP.applyView();
    GP.clear();
    D.rr(0, 0, CFG.W, CFG.H, 0, CFG.COL.bg);
    // 背景大齿轮
    D.gear(120, 260, 110, 10, F.bgT * 0.6, 'rgba(139,149,163,0.07)');
    D.gear(640, 380, 80, 8, -F.bgT * 0.5, 'rgba(139,149,163,0.07)');
    D.gear(90, 1050, 70, 8, F.bgT * 0.4, 'rgba(139,149,163,0.06)');
    D.gear(660, 1000, 100, 10, -F.bgT * 0.3, 'rgba(139,149,163,0.06)');
    D.stripe(0, 200, CFG.W, 14, 20);
    D.stripe(0, CFG.H - 90, CFG.W, 90, 26);
  }

  function drawMenu() {
    drawBg();
    var COL = CFG.COL;
    // 标题
    D.gear(CFG.W / 2, 420, 130, 12, F.bgT * 0.8, COL.warn);
    D.gear(CFG.W / 2 - 150, 330, 46, 8, -F.bgT * 0.9, COL.orange);
    D.gear(CFG.W / 2 + 150, 330, 46, 8, F.bgT * 0.7, COL.orange);
    D.textSh(CFG.NAME, CFG.W / 2, 520, 88, COL.txt);
    D.text(CFG.SUB + ' · 输了就报废的工厂派对', CFG.W / 2, 610, 30, COL.warn);
    // 玩家机器人
    D.robot(CFG.W / 2, 760, 1.25, COL.cyan, Math.sin(F.bgT * 2) * 0.08);

    F.buttons.length = 0;
    var bw = 480, bx = (CFG.W - bw) / 2;
    addBtn(bx, 880, bw, 110, startSolo);
    D.btn(bx, 880, bw, 110, '⚡ 单人挑战', COL.panel2, 4, false);
    addBtn(bx, 1020, bw, 110, function () { F.state = 'partycount'; });
    D.btn(bx, 1020, bw, 110, '👥 本地派对（2-4人）', COL.panel2, 4, false);
    addBtn(bx, 1160, bw, 90, function () { F.state = 'lb'; });
    D.btn(bx, 1160, bw, 90, '🏆 排行榜', COL.panel2, 4, false);
    // 音效开关
    var muted = GP.audio.isMuted();
    addBtn(CFG.W - 240, 40, 210, 66, function () { GP.audio.setMuted(!muted); });
    D.btn(CFG.W - 240, 40, 210, 66, (muted ? '🔇 音效关' : '🔊 音效开'), COL.panel2, 3, false);
    // 存档信息
    var lvMax = F.saveData.levelMax || 0;
    var startLv = Math.max(1, Math.floor(lvMax * 0.7) || 1);
    D.text('最高关卡 Lv ' + lvMax + '（下次单挑从 Lv ' + startLv + ' 起步）', CFG.W / 2, 1278, 24, COL.dim);
    D.text('最佳成绩 ' + F.saveData.best + ' 分', CFG.W / 2, 1310, 24, COL.dim);
    D.text('玩法灵感：致敬「死亡派对」玩法 · 完全原创实现', CFG.W / 2, 1346, 20, COL.dim);
  }

  function drawPartyCount() {
    drawBg();
    var COL = CFG.COL;
    D.textSh('👥 本地派对', CFG.W / 2, 420, 64, COL.txt);
    D.text('轮流同屏挑战 · 每回合最低分扣 1 命', CFG.W / 2, 520, 28, COL.dim);
    D.text('命尽淘汰 · 最后存活者胜', CFG.W / 2, 566, 28, COL.dim);
    F.buttons.length = 0;
    var bw = 460, bx = (CFG.W - bw) / 2;
    for (var i = 2; i <= 4; i++) {
      (function (n) {
        var y = 660 + (i - 2) * 150;
        addBtn(bx, y, bw, 120, function () { F.partyN = n; startParty(); });
        D.btn(bx, y, bw, 120, n + ' 人对战', COL.panel2, 4, false);
      })(i);
    }
    addBtn(bx, 1160, bw, 90, function () { F.state = 'menu'; });
    D.btn(bx, 1160, bw, 90, '← 返回', COL.panel2, 4, false);
  }

  function drawIntro(dt) {
    drawBg();
    var COL = CFG.COL;
    var meta = F.curMeta;
    var lv = F.curLevel || (F.mode === 'party' ? F.partyLevel : F.level);
    var diff = GP.diffCompute(lv);
    D.panel(70, 380, CFG.W - 140, 520);
    D.textSh(meta.icon, CFG.W / 2, 500, 110);
    D.textSh(meta.name, CFG.W / 2, 640, 62, COL.warn);
    if (F.mode === 'party' && F.introPlayer) {
      D.circle(CFG.W / 2, 720, 26, F.introPlayer.color);
      D.text('轮到 ' + F.introPlayer.name, CFG.W / 2, 790, 40, F.introPlayer.color);
    } else {
      D.text('第 ' + F.roundIdx + ' 回合', CFG.W / 2, 790, 40, COL.dim);
    }
    // 难度标签
    D.text('Lv ' + lv + ' · ' + diff.palette.name, CFG.W / 2, 824, 28, diff.palette.accent);
    D.text(meta.desc, CFG.W / 2, 878, 30, COL.txt);
    D.text('即将开始…', CFG.W / 2, 940, 28, COL.dim);
  }

  function drawPlay() {
    if (F.mg) F.mg.draw();
  }

  function drawResult() {
    if (F.mg) F.mg.draw();
    var COL = CFG.COL;
    var res = F.mg ? F.mg.result : null;
    GP.applyView();
    MCover();
    // 结果面板
    var pw = 520, ph = 420;
    var px = (CFG.W - pw) / 2, py = (CFG.H - ph) / 2 - 40;
    D.panel(px, py, pw, ph);
    var pColor = COL.cyan;
    if (F.mode === 'party' && F.introPlayer) pColor = F.introPlayer.color;
    if (res) {
      D.circle(px + pw / 2, py + 66, 24, pColor);
      D.text(F.mode === 'party' && F.introPlayer ? F.introPlayer.name : '你', px + pw / 2, py + 66, 30, pColor);
      D.textSh(res.win ? '✔ 完成!' : '✘ 报废!', px + pw / 2, py + 150, 62, res.win ? COL.green : COL.red);
      D.text('本局得分  ' + res.score, px + pw / 2, py + 220, 40, COL.warn);
      if (F.mode === 'solo') {
        var s = F.solo;
        D.text('总分 ' + s.score, px + pw / 2, py + 270, 30, COL.dim);
        for (var i = 0; i < CFG.SOLO_LIVES; i++) {
          D.heart(px + pw / 2 - 60 + i * 60, py + 318, 0.85, i < s.lives ? COL.red : 'rgba(255,82,82,0.18)');
        }
        if (s.streak > 1) D.text('连胜 ×' + s.streak, px + pw / 2, py + 366, 26, COL.orange);
        if (res.win) D.text('↑ 升级到 Lv ' + (F.level), px + pw / 2, py + 396, 26, COL.warn);
      } else {
        D.text('回合排名将在全部玩家完成后揭晓', px + pw / 2, py + 280, 24, COL.dim);
      }
    }
    if (F.resultT > 0.4) D.text('点击继续…', px + pw / 2, py + ph + 40, 26, COL.dim);
  }

  function MCover() {
    var c = GP.ctx;
    c.fillStyle = 'rgba(8,10,13,0.45)';
    c.fillRect(0, 0, CFG.W, CFG.H);
  }

  function drawRoundBreak() {
    drawBg();
    var COL = CFG.COL;
    D.textSh('📊 本回合排名', CFG.W / 2, 300, 56, COL.txt);
    D.text('最低分者扣 1 命！', CFG.W / 2, 380, 30, COL.red);
    var y = 460;
    for (var i = 0; i < F.roundRank.length; i++) {
      var p = F.roundRank[i];
      var isLast = p.roundScore === F.roundRank[F.roundRank.length - 1].roundScore;
      var rowH = isLast ? 150 : 118;
      D.panel(80, y, CFG.W - 160, rowH - 12);
      D.text('#' + (i + 1), 140, y + rowH / 2 - 6, 40, i === 0 ? COL.warn : COL.dim);
      D.circle(250, y + rowH / 2 - 6, 24, p.color);
      D.text(p.name, 300, y + rowH / 2 - 6, 34, p.color, 'left');
      D.text('+' + p.roundScore, CFG.W - 140, y + rowH / 2 - 6, 36, COL.txt, 'right');
      if (isLast) {
        D.text('🔻 扣 1 命（剩 ' + Math.max(0, p.lives) + '）', CFG.W / 2, y + rowH - 40, 28, COL.red);
      }
      y += rowH;
    }
    D.text('点击继续 → 第 ' + (F.roundIdx + 1) + ' 回合', CFG.W / 2, CFG.H - 150, 28, COL.dim);
  }

  function drawGameover() {
    drawBg();
    var COL = CFG.COL;
    if (F.mode === 'solo') {
      D.textSh('⚡ 挑战结束', CFG.W / 2, 350, 64, COL.txt);
      D.textSh(String(F.solo.score), CFG.W / 2, 490, 100, COL.warn);
      D.text('最终总分', CFG.W / 2, 580, 28, COL.dim);
      D.text('抵达 Lv ' + (F.level) + ' · ' + GP.diffTierName(F.level), CFG.W / 2, 622, 32, GP.diffCompute(F.level).palette.accent);
      if (F.newBest) D.text('🎉 新纪录！', CFG.W / 2, 680, 34, COL.orange);
      D.text('存活 ' + F.roundIdx + ' 回合 · 最高连胜 ×' + F.soloStreakMax, CFG.W / 2, 730, 24, COL.dim);
    } else {
      if (F.winner) {
        D.textSh('🎉 派对结束', CFG.W / 2, 360, 60, COL.txt);
        D.circle(CFG.W / 2, 460, 46, F.winner.color);
        D.textSh(F.winner.name + ' 存活到最后！', CFG.W / 2, 560, 52, F.winner.color);
        // 最终排行
        var ranked = F.players.slice().sort(function (a, b) { return b.score - a.score; });
        var y = 660;
        for (var i = 0; i < ranked.length; i++) {
          var p = ranked[i];
          D.text('#' + (i + 1) + '  ' + p.name + '   ' + p.score + ' 分', CFG.W / 2, y, 30, p.alive ? p.color : COL.dim);
          if (!p.alive) D.text('（已淘汰）', CFG.W / 2 + 150, y, 24, COL.dim);
          y += 56;
        }
      } else {
        D.textSh('全员报废！😵', CFG.W / 2, 450, 60, COL.red);
      }
    }
    F.buttons.length = 0;
    var bw = 460, bx = (CFG.W - bw) / 2;
    addBtn(bx, 1050, bw, 100, function () {
      if (F.mode === 'solo') startSolo(); else { F.state = 'partycount'; }
    });
    D.btn(bx, 1050, bw, 100, '🔄 再来一局', COL.panel2, 4, false);
    addBtn(bx, 1170, bw, 90, function () { F.state = 'lb'; });
    D.btn(bx, 1170, bw, 90, '🏆 排行榜', COL.panel2, 4, false);
    addBtn(bx + 40, 1280, bw - 80, 76, function () { F.state = 'menu'; });
    D.btn(bx + 40, 1280, bw - 80, 76, '← 返回主页', COL.panel2, 3, false);
  }

  function drawLB() {
    drawBg();
    var COL = CFG.COL;
    D.textSh('🏆 排行榜', CFG.W / 2, 260, 60, COL.txt);
    var lb = F.saveData.lb || [];
    if (lb.length === 0) {
      D.text('还没有记录，快去挑战吧！', CFG.W / 2, 500, 32, COL.dim);
    } else {
      var y = 340;
      for (var i = 0; i < Math.min(lb.length, 10); i++) {
        var e = lb[i];
        D.panel(80, y, CFG.W - 160, 84);
        D.text('#' + (i + 1), 140, y + 42, 34, i === 0 ? COL.warn : COL.dim);
        D.text(e.name, 210, y + 42, 32, COL.txt, 'left');
        D.text(String(e.score), CFG.W - 200, y + 42, 34, COL.warn, 'right');
        D.text(e.mode === 'party' ? '派对' : '单人', CFG.W - 130, y + 42, 22, COL.dim, 'right');
        y += 96;
      }
    }
    D.text('最佳单人成绩：' + F.saveData.best, CFG.W / 2, y + 40, 28, COL.dim);
    F.buttons.length = 0;
    addBtn(CFG.W / 2 - 230, 1180, 460, 90, function () { F.state = 'menu'; });
    D.btn(CFG.W / 2 - 230, 1180, 460, 90, '← 返回', COL.panel2, 4, false);
  }

  function draw(dt) {
    GP.applyView();
    switch (F.state) {
      case 'menu': drawMenu(); break;
      case 'partycount': drawPartyCount(); break;
      case 'intro': drawIntro(dt); break;
      case 'play': drawPlay(); break;
      case 'result': drawResult(); break;
      case 'roundbreak': drawRoundBreak(); break;
      case 'gameover': drawGameover(); break;
      case 'lb': drawLB(); break;
    }
  }

  // ---------- 启动 ----------
  F.boot = function () {
    GP.on('down', handleDown);
    GP.on('move', handleMove);
    GP.on('up', handleUp);
    GP.on('swipe', handleSwipe);
    last = GP.now();
    GP.raf(tick);
  };

  GP.flow = F;
})((typeof GameGlobal !== 'undefined') ? GameGlobal : ((typeof globalThis !== 'undefined') ? globalThis : this));