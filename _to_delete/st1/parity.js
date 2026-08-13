const A = require('./stars.js');          // клиентский движок
const B = require('./arena_stars_v3.js'); // серверная копия
let pass = 0, fail = 0;
const eq = (n, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('FAIL ' + n + '\n  клиент: ' + JSON.stringify(a) + '\n  сервер: ' + JSON.stringify(b)); } };

const MODES = ['guess_phrase','fill_gap','find_oddity','translate_build','speed_match'];
const STATUSES = ['correct','wrong','timeout','broken'];

// Полный перебор входов начисления за задание.
let n = 0;
for (const mode of MODES)
  for (const status of STATUSES)
    for (const race of [0, 99, 100, 1500, 3000, 7999, 50000])
      for (const pairs of [0,1,2,3,4])
        for (const oppRace of [null, 0, 2999, 3000, 3100])
          for (const oppCorrect of [true, false])
            for (const combo of [0,1,2,3,7]) {
              const input = { mode, status, raceElapsedMs: race, firstAttemptPairs: pairs,
                opponentRaceElapsedMs: oppRace, opponentCorrect: oppCorrect, comboRunBefore: combo };
              n++;
              const a = A.arenaAwardStars(input), b = B.arenaAwardStars(input);
              if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL вход ' + JSON.stringify(input)); return; }
            }
pass++;
console.log('перебор начислений: ' + n + ' входов совпали');

// Прогоны
const MODES10 = [...MODES, ...MODES];
const mk = (mode, i, over = {}) => Object.assign({ taskIndex: i, mode, status: 'correct',
  raceElapsedMs: 1000 + i * 137, firstAttemptPairs: mode === 'speed_match' ? 4 : 0, resolvedPairs: 4, answer: null }, over);
for (const variant of ['perfect', 'mixed', 'dead']) {
  const own = MODES10.map((m, i) => variant === 'perfect' ? mk(m, i)
    : variant === 'dead' ? mk(m, i, { status: 'timeout', firstAttemptPairs: 0 })
    : mk(m, i, { status: i % 3 === 0 ? 'wrong' : 'correct', firstAttemptPairs: i % 2 ? 3 : 4 }));
  const opp = MODES10.map((m, i) => i % 2 ? null : mk(m, i, { raceElapsedMs: 500 }));
  eq('прогон ' + variant, A.arenaScoreRun({ modes: MODES10, own, opponent: opp }), B.arenaScoreRun({ modes: MODES10, own, opponent: opp }));
}

// Исход, зачисление, опыт
for (const [l, r] of [[[24, 90000], [22, 10000]], [[24, 50000], [24, 60000]], [[24, 50000], [24, 50099]], [[0, 116000], [0, 116000]]]) {
  const L = { matchStars: l[0], tieBreakElapsedMs: l[1] }, R = { matchStars: r[0], tieBreakElapsedMs: r[1] };
  eq('исход ' + JSON.stringify([l, r]), A.arenaResolveDuel(L, R), B.arenaResolveDuel(L, R));
}
for (const mode of ['quick','ranked','friend','today','ghost','series'])
  for (const idx of [0,3,4,5,6])
    for (const before of [0, 150, 160]) {
      const inp = { mode, matchStars: 40, taskCount: 10, eligibleMatchIndex: idx, dailyStarsBefore: before };
      eq('зачисление ' + mode + idx + before, A.arenaBankedStars(inp), B.arenaBankedStars(inp));
    }
for (const outcome of ['win','loss','draw'])
  for (const completed of [true,false]) {
    const inp = { mode: 'quick', matchStars: 19, outcome, completed };
    eq('опыт ' + outcome + completed, A.arenaMatchXp(inp), B.arenaMatchXp(inp));
  }
eq('потолки', [A.arenaMatchStarCeiling(5), A.arenaMatchStarCeiling(10), A.arenaMatchStarCeiling(7)],
              [B.arenaMatchStarCeiling(5), B.arenaMatchStarCeiling(10), B.arenaMatchStarCeiling(7)]);
eq('версия правил', A.ARENA_STARS_RULES_VERSION, B.ARENA_STARS_RULES_VERSION);
eq('окна ответа', A.ARENA_ANSWER_MS, B.ARENA_ANSWER_MS);

console.log('');
console.log('ПРОЙДЕНО: ' + pass + '   ПРОВАЛЕНО: ' + fail);
process.exit(fail ? 1 : 0);
