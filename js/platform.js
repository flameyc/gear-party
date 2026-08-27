// 平台适配层：微信小游戏 / 浏览器 双端统一
(function (g) {
  var GP = g.GP = g.GP || {};

  var isWX = (typeof wx !== 'undefined') && typeof wx.createCanvas === 'function';
  GP.IS_WX = isWX;

  var canvas, ctx;
  var W = GP.CFG.W, H = GP.CFG.H;
  var scale = 1, ox = 0, oy = 0;

  if (isWX) {
    var info = null;
    try { info = wx.getSystemInfoSync(); } catch (e) {}
    if (!info || !info.windowWidth) { try { info = wx.getWindowInfo(); } catch (e2) {} }
    canvas = g.canvas;
    GP.canvasOff = { left: 0, top: 0 };
    var dpr = (info && info.pixelRatio) || 1;
    var winW = (info && info.windowWidth) || 750;
    var winH = (info && info.windowHeight) || 1334;
    canvas.width = winW * dpr;
    canvas.height = winH * dpr;
    ctx = canvas.getContext('2d');
    GP.SCREEN = { w: winW, h: winH, dpr: dpr };
  } else {
    // 浏览器：以 canvas 实际展示尺寸（容器）为准，自动适配桌面/手机布局
    canvas = document.getElementById('game');
    var lastRect = null;
    function sizeFromContainer() {
      var br = window.devicePixelRatio || 1;
      var rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return; // 布局未就绪
      lastRect = rect;
      canvas.width = Math.round(rect.width * br);
      canvas.height = Math.round(rect.height * br);
      GP.SCREEN = { w: rect.width, h: rect.height, dpr: br };
      GP.canvasOff = { left: rect.left, top: rect.top };
      computeView();
    }
    ctx = canvas.getContext('2d');
    sizeFromContainer();
    window.addEventListener('resize', sizeFromContainer);
    window.addEventListener('orientationchange', sizeFromContainer);
  }
  GP.canvas = canvas;
  GP.ctx = ctx;

  function computeView() {
    scale = Math.min(GP.SCREEN.w / W, GP.SCREEN.h / H);
    ox = (GP.SCREEN.w - W * scale) / 2;
    oy = (GP.SCREEN.h - H * scale) / 2;
  }
  computeView();

  GP.applyView = function () {
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
  };
  GP.clear = function () {
    ctx.clearRect(0, 0, W, H);
  };
  GP.toLogical = function (x, y) {
    var off = GP.canvasOff || { left: 0, top: 0 };
    return { x: (x - off.left - ox) / scale, y: (y - off.top - oy) / scale };
  };

  // ------- 输入 -------
  var listeners = { down: [], move: [], up: [], swipe: [] };
  GP.on = function (type, fn) {
    (listeners[type] = listeners[type] || []).push(fn);
  };
  function emit(type, a, b) {
    var arr = listeners[type];
    if (arr) for (var i = 0; i < arr.length; i++) arr[i](a, b);
  }
  var downPos = null, downT = 0;
  function handleDown(x, y) {
    var p = GP.toLogical(x, y);
    downPos = p; downT = Date.now();
    emit('down', p.x, p.y);
  }
  function handleMove(x, y) {
    var p = GP.toLogical(x, y);
    emit('move', p.x, p.y);
  }
  function handleUp() {
    if (downPos) {
      var p = downPos;
      var dx, dy;
      // move 事件里可能已经没有坐标，用最后的坐标
      var last = lastMove;
      if (last) { dx = last.x - p.x; dy = last.y - p.y; }
      var dt = Date.now() - downT;
      if (dt < 520 && Math.abs(dx) + Math.abs(dy) > 46) {
        var dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
        emit('swipe', dir);
      }
    }
    downPos = null; lastMove = null;
    emit('up');
  }
  var lastMove = null;
  function firstTouch(touches) {
    return (touches && touches.length) ? touches[0] : null;
  }
  if (isWX) {
    wx.onTouchStart(function (e) { var t = firstTouch(e.touches); if (t) handleDown(t.clientX, t.clientY); });
    wx.onTouchMove(function (e) { var t = firstTouch(e.touches); if (t) { lastMove = GP.toLogical(t.clientX, t.clientY); handleMove(t.clientX, t.clientY); } });
    wx.onTouchEnd(function () { handleUp(); });
    if (wx.onTouchCancel) wx.onTouchCancel(function () { handleUp(); });
  } else {
    function bind(el) {
      el.addEventListener('touchstart', function (e) { e.preventDefault(); var t = e.touches[0]; if (t) handleDown(t.clientX, t.clientY); }, { passive: false });
      el.addEventListener('touchmove', function (e) { e.preventDefault(); var t = e.touches[0]; if (t) { lastMove = GP.toLogical(t.clientX, t.clientY); handleMove(t.clientX, t.clientY); } }, { passive: false });
      el.addEventListener('touchend', function (e) { e.preventDefault(); handleUp(); }, { passive: false });
      el.addEventListener('mousedown', function (e) { handleDown(e.clientX, e.clientY); });
      el.addEventListener('mousemove', function (e) { if (downPos) { lastMove = GP.toLogical(e.clientX, e.clientY); handleMove(e.clientX, e.clientY); } });
      el.addEventListener('mouseup', function (e) { handleUp(); });
    }
    bind(canvas);
  }

  // ------- 存档 -------
  var SAVE_KEY = 'gear_party_save';
  GP.save = {
    load: function () {
      var raw = null;
      try {
        if (isWX) raw = wx.getStorageSync(SAVE_KEY);
        else raw = localStorage.getItem(SAVE_KEY);
      } catch (e) { raw = null; }
      if (!raw) return null;
      try { return typeof raw === 'string' ? JSON.parse(raw) : raw; }
      catch (e) { return null; }
    },
    write: function (data) {
      try {
        var s = typeof data === 'string' ? data : JSON.stringify(data);
        if (isWX) wx.setStorageSync(SAVE_KEY, s);
        else localStorage.setItem(SAVE_KEY, s);
      } catch (e) {}
    }
  };

  // ------- 帧循环 -------
  // rAF 看门狗：后台标签页/系统休眠时 rAF 可能停摆，超时用定时器补帧
  var _lastFrame = Date.now(), _wd = null;
  GP.raf = function (cb) {
    var nat = (isWX ? requestAnimationFrame : window.requestAnimationFrame.bind(window));
    nat(function (t) { _lastFrame = Date.now(); cb(t); });
    if (!_wd) {
      _wd = setInterval(function () {
        if (Date.now() - _lastFrame > 250) { _lastFrame = Date.now(); cb(Date.now()); }
      }, 100);
    }
  };

  // 单调时钟（性能时钟优先，不受系统改时间影响）
  var _nowFn = null;
  GP.now = function () {
    if (!_nowFn) {
      var p = (typeof performance !== 'undefined') ? performance : null;
      _nowFn = (p && typeof p.now === 'function') ? function () { return p.now(); } : function () { return Date.now(); };
    }
    return _nowFn();
  };

  // 页面隐藏暂停标记（微信：onHide/onShow；浏览器：document.hidden）
  GP.__paused = false;
  if (isWX) {
    if (wx.onHide) wx.onHide(function () { GP.__paused = true; });
    if (wx.onShow) wx.onShow(function () { GP.__paused = false; });
  }
  GP.isHidden = function () {
    return GP.__paused || (typeof document !== 'undefined' && document.hidden);
  };

  // 工具：随机
  GP.rand = function (a, b) { return a + Math.random() * (b - a); };
  GP.randInt = function (a, b) { return Math.floor(GP.rand(a, b + 1)); };
  GP.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  GP.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
})((typeof GameGlobal !== 'undefined') ? GameGlobal : ((typeof globalThis !== 'undefined') ? globalThis : this));