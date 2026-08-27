// 关卡难度：随 level (1..N) 递增，生成每局共享参数
(function (g) {
  var GP = g.GP = g.GP || {};

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  // 阶段：每 5 级一个阶段，循环 0..4
  function tierOf(level) { return Math.max(0, Math.floor((level - 1) / 5)); }

  // 阶段调色板（影响 UI 背景与强调色，渲染器读取 GP.difficulty.palette）
  var PALETTES = [
    { id: 0, name: '工厂', bg: '#15171b', panel: '#22262d', line: '#3a414c', accent: '#ffc400', accent2: '#ff7a00' },
    { id: 1, name: '深海', bg: '#0d1820', panel: '#15252f', line: '#2a4757', accent: '#35d0ff', accent2: '#7ee081' },
    { id: 2, name: '深空', bg: '#1a0d22', panel: '#2a1a35', line: '#4a2d59', accent: '#ff5ca8', accent2: '#9c6cff' },
    { id: 3, name: '熔岩', bg: '#220f0d', panel: '#331513', line: '#5a2520', accent: '#ff7a00', accent2: '#ffc400' },
    { id: 4, name: '量产', bg: '#1c1f1a', panel: '#272c25', line: '#44493f', accent: '#7ee081', accent2: '#ffc400' }
  ];

  // 输入：关卡 1..N；输出本局共享参数
  function compute(level) {
    level = Math.max(1, level | 0);
    var tier = tierOf(level) % PALETTES.length;
    // 通用乘子
    var timeMul = clamp(1 - 0.04 * (level - 1), 0.45, 1.0);
    var spawnMul = clamp(1 - 0.045 * (level - 1), 0.22, 1.0);
    var speedMul = clamp(1 + 0.045 * (level - 1), 1.0, 1.9);
    var playerSpeedMul = clamp(1 + 0.02 * (level - 1), 1.0, 1.35);
    var tolerance = clamp(3 - Math.floor((level - 1) / 4), 1, 3); // 失误上限：1..3
    return {
      level: level,
      tier: tier,
      palette: PALETTES[tier],
      timeMul: timeMul,
      spawnMul: spawnMul,
      speedMul: speedMul,
      playerSpeedMul: playerSpeedMul,
      tolerance: tolerance,
      // 各游戏专项
      perGame: {
        minefield:  { minesAdd: Math.min(12, Math.floor((level - 1) * 0.7)), detectR: level >= 8 ? 1.0 : 1.5 },
        gearstorm:  { spawnMul: spawnMul, speedMul: speedMul },
        ladder:     { promptT: clamp(2.0 - 0.07 * (level - 1), 1.0, 2.0), scoreBonus: 1 + Math.floor((level - 1) / 5) * 0.1 },
        patternpad: { roundsAdd: Math.min(2, Math.floor((level - 1) / 3)) },
        stealparts: { downT: clamp(2.6 - 0.1 * (level - 1), 1.2, 2.6), upT: clamp(1.9 - 0.08 * (level - 1), 0.7, 1.9), fillT: clamp(0.42 - 0.008 * (level - 1), 0.30, 0.42), totalAdd: Math.min(2, Math.floor((level - 1) / 3)) },
        assembly:   { machinesAdd: Math.min(2, Math.floor((level - 1) / 3)), blueT: clamp(2.4 - 0.1 * (level - 1), 1.0, 2.4) }
      }
    };
  }

  // 单次应用：把 difficulty 拍到 GP.difficulty（小游戏 create() 里读此快照）
  function apply(level) { GP.difficulty = compute(level); }

  // 阶段名
  function tierName(level) { return PALETTES[tierOf(level) % PALETTES.length].name; }

  GP.difficulty = compute(1);
  GP.diffCompute = compute;
  GP.diffApply = apply;
  GP.diffTierName = tierName;
})((typeof GameGlobal !== 'undefined') ? GameGlobal : ((typeof globalThis !== 'undefined') ? globalThis : this));