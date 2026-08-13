const M = require('./match_machine.js');
let pass = 0, fail = 0;
const eq = (n, got, want) => { if (JSON.stringify(got) === JSON.stringify(want)) pass++; else { fail++; console.log('FAIL ' + n + '\n  получено:  ' + JSON.stringify(got) + '\n  ожидалось: ' + JSON.stringify(want)); } };
const ok = (n, c) => { if (c) pass++; else { fail++; console.log('FAIL ' + n); } };

const MODES = ['guess_phrase','fill_gap','find_oddity','translate_build','speed_match'];
const plan = (count) => ({
  matchId: 'm1', seat: 'a', mode: count === 5 ? 'quick' : 'ranked', planHash: 'h1',
  tasks: Array.from({ length: count }, (_, i) => ({ taskIndex: i, mode: MODES[i % 5] })),
});
const P10 = plan(10), P5 = plan(5);
const init = (p, mono = 1000, wall = 500000) =>
  M.arenaLocalMatchInit(p, { monoNowMs: mono, wallNowMs: wall, monoEpochId: 'e1', countdownRemainingMs: 3000 });
const red = (p, s, e) => M.arenaLocalMatchReduce(p, s, e);

// 1. Отсчёт → чтение → ответ
{
  let s = init(P10);
  eq('старт: отсчёт', s.phase, 'countdown');
  s = red(P10, s, { type: 'tick', monoNowMs: 1000 + 2999 });
  eq('отсчёт ещё идёт', s.phase, 'countdown');
  s = red(P10, s, { type: 'tick', monoNowMs: 1000 + 3000 });
  eq('после отсчёта — чтение', s.phase, 'reading');
  s = red(P10, s, { type: 'tick', monoNowMs: 1000 + 3000 + 1500 });
  eq('после чтения — ответ', s.phase, 'answer');
  eq('бюджет ответа = окно типа задания', s.phaseBudgetMs, 8000);
}

// 2. Верный ответ без соперника = 3 звезды, мгновенно
{
  let s = init(P10);
  s = red(P10, s, { type: 'tick', monoNowMs: 5500 });   // ответ открыт
  eq('фаза ответа', s.phase, 'answer');
  const t = s.phaseStartedAtMonoMs + 2000;
  s = red(P10, s, { type: 'answer', monoNowMs: t, wallNowMs: 500000 + (t - 1000), correct: true, answer: 1 });
  eq('звёзды за первый верный', s.matchStars, 3);
  eq('после ответа — показ результата', s.phase, 'reveal');
  eq('причина', s.awards[0].headline.key, 'starFirst');
  ok('награда разрешается с паузой', s.awardResolveAtMonoMs === t + 600);
}

// 3. Соперник ответил раньше — 2 звезды и названо отставание
{
  let s = init(P10);
  s = red(P10, s, { type: 'tick', monoNowMs: 5500 });
  s = red(P10, s, { type: 'opponent_answered', monoNowMs: 5600, tick: { taskIndex: 0, correct: true, raceElapsedMs: 1000 } });
  const t = s.phaseStartedAtMonoMs + 3000;
  s = red(P10, s, { type: 'answer', monoNowMs: t, wallNowMs: 500000 + (t - 1000), correct: true, answer: 1 });
  eq('вторым = 2 звезды', s.matchStars, 2);
  eq('причина названа', s.awards[0].headline.key, 'starSecond');
  eq('отставание в секундах', s.awards[0].headline.behindSeconds, 2);
}

// 4. Ошибка соперника не отбирает бонус
{
  let s = init(P10);
  s = red(P10, s, { type: 'tick', monoNowMs: 5500 });
  s = red(P10, s, { type: 'opponent_answered', monoNowMs: 5600, tick: { taskIndex: 0, correct: false, raceElapsedMs: 200 } });
  const t = s.phaseStartedAtMonoMs + 3000;
  s = red(P10, s, { type: 'answer', monoNowMs: t, wallNowMs: 500000 + (t - 1000), correct: true, answer: 1 });
  eq('ошибка соперника не блокирует', s.matchStars, 3);
}

// 5. Просрочка закрывает задание нулём и ведёт дальше
{
  let s = init(P10);
  s = red(P10, s, { type: 'tick', monoNowMs: 5500 });
  const end = s.phaseStartedAtMonoMs + 8000;
  s = red(P10, s, { type: 'tick', monoNowMs: end });
  eq('просрочка = 0 звёзд', s.matchStars, 0);
  eq('исход просрочен', s.outcomes[0].status, 'timeout');
  eq('перешли к показу', s.phase, 'reveal');
  s = red(P10, s, { type: 'tick', monoNowMs: end + 1200 });
  eq('следующее задание', s.taskIndex, 1);
  eq('и снова чтение', s.phase, 'reading');
}

// 6. Пары: звезда только с первой попытки
{
  let s = init(P10);
  // доводим до задания 4 (speed_match)
  let t = 1000 + 3000;
  for (let i = 0; i < 4; i++) {
    s = red(P10, s, { type: 'tick', monoNowMs: t + 1500 });
    s = red(P10, s, { type: 'tick', monoNowMs: t + 1500 + s.phaseBudgetMs });
    t = s.phaseStartedAtMonoMs + 1200;
    s = red(P10, s, { type: 'tick', monoNowMs: t });
  }
  eq('дошли до пар', P10.tasks[s.taskIndex].mode, 'speed_match');
  s = red(P10, s, { type: 'tick', monoNowMs: s.phaseStartedAtMonoMs + 1500 });
  eq('фаза ответа на парах', s.phase, 'answer');
  const base = s.phaseStartedAtMonoMs;
  s = red(P10, s, { type: 'speed_attempt', monoNowMs: base + 100, pairIndex: 0, correct: true });
  s = red(P10, s, { type: 'speed_attempt', monoNowMs: base + 200, pairIndex: 1, correct: false });
  s = red(P10, s, { type: 'speed_attempt', monoNowMs: base + 300, pairIndex: 1, correct: true });
  s = red(P10, s, { type: 'speed_attempt', monoNowMs: base + 400, pairIndex: 2, correct: true });
  eq('доска ещё не закрыта', s.phase, 'answer');
  s = red(P10, s, { type: 'speed_attempt', monoNowMs: base + 500, pairIndex: 3, correct: true });
  eq('доска закрыта', s.phase, 'reveal');
  const award = s.awards[s.awards.length - 1];
  eq('три пары с первой попытки', award.base, 3);
  ok('перебор не даёт четвёртую звезду', award.base === 3);
}

// 7. Комбо с третьего подряд
{
  let s = init(P10);
  let mono = 1000 + 3000;
  for (let i = 0; i < 4; i++) {
    s = red(P10, s, { type: 'tick', monoNowMs: mono + 1500 });
    const t = s.phaseStartedAtMonoMs + 500;
    s = red(P10, s, { type: 'answer', monoNowMs: t, wallNowMs: 500000 + t, correct: true, answer: 1 });
    mono = s.phaseStartedAtMonoMs + 1200;
    s = red(P10, s, { type: 'tick', monoNowMs: mono });
  }
  eq('три плюс комбо на 3-м и 4-м', s.matchStars, 3 + 3 + 4 + 4);
  eq('длина серии', s.longestCombo, 4);
}

// 8. Быстрый матч заканчивается на пятом задании
{
  let s = init(P5);
  let mono = 1000 + 3000;
  for (let i = 0; i < 5; i++) {
    s = red(P5, s, { type: 'tick', monoNowMs: mono + 1500 });
    const t = s.phaseStartedAtMonoMs + 400;
    s = red(P5, s, { type: 'answer', monoNowMs: t, wallNowMs: 500000 + t, correct: true, answer: 1 });
    if (s.phase === 'finished') break;
    mono = s.phaseStartedAtMonoMs + 1200;
    s = red(P5, s, { type: 'tick', monoNowMs: mono });
  }
  eq('быстрый матч завершён', s.phase, 'finished');
  eq('идеальный быстрый = потолок 19', s.matchStars, 19);
  const rep = M.arenaLocalMatchReport(P5, s);
  ok('отчёт готов', rep !== null);
  eq('в отчёте пять заданий', rep.outcomes.length, 5);
}

// 9. Свернули приложение на полчаса — задания закрываются просрочкой
{
  let s = init(P10);
  s = red(P10, s, { type: 'tick', monoNowMs: 5500 });
  eq('до сна — ответ', s.phase, 'answer');
  const far = 5500 + 60000;
  s = red(P10, s, { type: 'resume', monoNowMs: far, wallNowMs: 500000 + (far - 1000), monoEpochId: 'e1' });
  ok('прокрутились вперёд', s.taskIndex > 0 || s.phase === 'finished');
  ok('звёзд не начислено', s.matchStars === 0);
}

// 10. Холодный старт: другой идентификатор запуска
{
  let s = init(P10);
  s = red(P10, s, { type: 'tick', monoNowMs: 5500 });
  const t = 40;
  s = red(P10, s, { type: 'resume', monoNowMs: t, wallNowMs: 500000 + 6000, monoEpochId: 'e2' });
  eq('часам нет веры', s.clockSuspect, true);
  ok('незакрытое задание просрочено', s.outcomes.length >= 1 && s.outcomes[0].status === 'timeout');
  ok('звёзд за восстановленное время нет', s.matchStars === 0);
}

// 11. Перевод часов назад помечает состояние
{
  let s = init(P10);
  s = red(P10, s, { type: 'tick', monoNowMs: 5500 });
  const t = s.phaseStartedAtMonoMs + 1000;
  s = red(P10, s, { type: 'answer', monoNowMs: t, wallNowMs: 400000, correct: true, answer: 1 });
  eq('подозрительные часы', s.clockSuspect, true);
  eq('но звёзды начислены', s.matchStars, 3);
}

// 12. Брошенный матч
{
  let s = init(P10);
  s = red(P10, s, { type: 'tick', monoNowMs: 5500 });
  const far = 5500 + 11 * 60 * 1000;
  s = red(P10, s, { type: 'resume', monoNowMs: far, wallNowMs: 500000 + (far - 1000), monoEpochId: 'e1' });
  eq('матч завершён', s.phase, 'finished');
  eq('помечен как брошенный', s.abandoned, true);
  eq('звёзд нет', s.matchStars, 0);
}

// 13. Явный выход
{
  let s = init(P10);
  s = red(P10, s, { type: 'tick', monoNowMs: 5500 });
  s = red(P10, s, { type: 'abandon', monoNowMs: 9000, wallNowMs: 508000 });
  eq('выход завершает матч', s.phase, 'finished');
  eq('все задания закрыты', s.outcomes.length, 10);
  eq('звёзд нет', s.matchStars, 0);
  const rep = M.arenaLocalMatchReport(P10, s);
  eq('в отчёте помечено', rep.abandoned, true);
}

// 14. Отчёт до конца матча не выдаётся
{
  const s = init(P10);
  eq('отчёта нет', M.arenaLocalMatchReport(P10, s), null);
}

// 15. Тик соперника после ответа уже не меняет награду
{
  let s = init(P10);
  s = red(P10, s, { type: 'tick', monoNowMs: 5500 });
  const t = s.phaseStartedAtMonoMs + 2000;
  s = red(P10, s, { type: 'answer', monoNowMs: t, wallNowMs: 500000 + t, correct: true, answer: 1 });
  const before = s.matchStars;
  s = red(P10, s, { type: 'opponent_answered', monoNowMs: t + 100, tick: { taskIndex: 0, correct: true, raceElapsedMs: 10 } });
  eq('награда уже зафиксирована', s.matchStars, before);
}

console.log('');
console.log('ПРОЙДЕНО: ' + pass + '   ПРОВАЛЕНО: ' + fail);
process.exit(fail ? 1 : 0);
