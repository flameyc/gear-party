// 齿轮派对 Gear Party — 全局配置
(function (g) {
  var GP = g.GP = g.GP || {};
  GP.CFG = {
    W: 750,
    H: 1334,
    NAME: '齿轮派对',
    SUB: '报废厂淘汰之夜',
    COL: {
      bg: '#15171b',
      panel: '#22262d',
      panel2: '#2b3038',
      line: '#3a414c',
      txt: '#e8ecf1',
      dim: '#9aa5b1',
      warn: '#ffc400',
      orange: '#ff7a00',
      cyan: '#35d0ff',
      green: '#7ee081',
      red: '#ff5252',
      magenta: '#ff5ca8',
      steel: '#8b95a3'
    },
    PLAYER_COLORS: ['#35d0ff', '#ff9f1c', '#7ee081', '#ff5ca8'],
    PLAYER_NAMES: ['玩家A', '玩家B', '玩家C', '玩家D'],
    SOLO_LIVES: 3,
    PARTY_LIVES: 3,
    LB_MAX: 10,
    MG: [
      { id: 'minefield', name: '工坊地雷阵', icon: '💣', desc: '拖着机器人穿过暗雷区抵达终点', dur: 25 },
      { id: 'gearstorm', name: '齿轮风暴', icon: '⚙️', desc: '躲避飞旋的齿轮，坚持到倒计时结束', dur: 18 },
      { id: 'ladder', name: '爬梯狂飙', icon: '🪜', desc: '按提示快速滑动方向，一路爬顶', dur: 25 },
      { id: 'patternpad', name: '图案踩格', icon: '🔲', desc: '记住亮起的格子并踩中它们', dur: 30 },
      { id: 'stealparts', name: '偷零件', icon: '🔧', desc: '趁检修机器人低头时摸走零件', dur: 22 },
      { id: 'assembly', name: '装配流水线', icon: '🏭', desc: '按图纸顺序组装三台机器', dur: 30 }
    ]
  };
})((typeof GameGlobal !== 'undefined') ? GameGlobal : ((typeof globalThis !== 'undefined') ? globalThis : this));