// 玩家管理（单人挑战 / 本地派对）
(function (g) {
  var GP = g.GP = g.GP || {};

  function mkPlayer(i) {
    return {
      name: GP.CFG.PLAYER_NAMES[i],
      color: GP.CFG.PLAYER_COLORS[i],
      lives: GP.CFG.PARTY_LIVES,
      score: 0,          // 累计总分
      roundScore: 0,     // 当前回合得分
      alive: true,
      wins: 0
    };
  }

  GP.players = {
    makePlayers: function (n) {
      var a = [];
      for (var i = 0; i < n; i++) a.push(mkPlayer(i));
      return a;
    },
    // 排名：按 roundScore 降序；返回排序后的列表
    rankRound: function (list) {
      return list.slice().sort(function (a, b) { return b.roundScore - a.roundScore; });
    }
  };
})((typeof GameGlobal !== 'undefined') ? GameGlobal : ((typeof globalThis !== 'undefined') ? globalThis : this));