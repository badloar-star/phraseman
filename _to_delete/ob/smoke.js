const O = require('./result_outbox.js');
let pass = 0, fail = 0;
const eq = (n, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('FAIL ' + n + ': получено ' + JSON.stringify(a) + ', ожидалось ' + JSON.stringify(b)); } };
const ok = (n, c) => { if (c) pass++; else { fail++; console.log('FAIL ' + n); } };

const report = (id) => ({ schemaVersion: 'arena-local-match.v2', matchId: id, seat: 'a', planHash: 'h',
  outcomes: [], matchStars: 24, tieBreakElapsedMs: 90000, correctCount: 8, firstCount: 4, longestCombo: 3,
  clockSuspect: false, abandoned: false, startedAtWallMs: 1, finishedAtWallMs: 2 });

// классификация
eq('нет сети', O.arenaOutboxClassify(new Error('Network request failed')), 'offline');
eq('unavailable', O.arenaOutboxClassify({ code: 'unavailable' }), 'offline');
eq('таймаут', O.arenaOutboxClassify(new Error('timeout of 10000ms exceeded')), 'offline');
eq('временная', O.arenaOutboxClassify({ code: 'deadline-exceeded' }), 'transient');
eq('внутренняя', O.arenaOutboxClassify({ code: 'internal' }), 'transient');
eq('app check', O.arenaOutboxClassify(new Error('App Check token refresh failed')), 'transient');
eq('нужно обновление', O.arenaOutboxClassify(new Error('arena_client_update_required')), 'gated');
eq('отказ сервера', O.arenaOutboxClassify({ code: 'invalid-argument' }), 'rejected');
eq('мусор', O.arenaOutboxClassify(null), 'rejected');

// попытки: сеть их не тратит
{
  const e = O.arenaOutboxMakeEntry(report('m1'), 1000);
  eq('свежая запись без попыток', e.attempts, 0);
  const afterOffline = O.arenaOutboxAfterFailure(e, 'offline', 2000);
  eq('нет сети — попытка не потрачена', afterOffline.attempts, 0);
  eq('нет сети — повтор сразу', afterOffline.nextAttemptAtWallMs, 2000);
  const afterGated = O.arenaOutboxAfterFailure(e, 'gated', 2000);
  eq('нужно обновление — попытка не потрачена', afterGated.attempts, 0);
  ok('нужно обновление — держим долго', afterGated.nextAttemptAtWallMs > 2000 + 200000);
  const afterTransient = O.arenaOutboxAfterFailure(e, 'transient', 2000);
  eq('временная — попытка потрачена', afterTransient.attempts, 1);
  ok('временная — задержка есть', afterTransient.nextAttemptAtWallMs >= 3000);
  eq('отказ — запись снимается', O.arenaOutboxAfterFailure(e, 'rejected', 2000), null);
}

// рост задержки
{
  let e = O.arenaOutboxMakeEntry(report('m2'), 0);
  const delays = [];
  for (let i = 0; i < 6; i++) {
    const before = e.attempts;
    e = O.arenaOutboxAfterFailure(e, 'transient', 0);
    delays.push(Math.floor(e.nextAttemptAtWallMs / 1000));
    ok('попытка ' + i + ' потрачена', e.attempts === before + 1);
  }
  ok('задержки растут', delays[0] <= delays[1] && delays[1] <= delays[2] && delays[2] <= delays[3]);
  ok('и упираются в пять минут', delays[5] >= 300);
}

// срок жизни
{
  const e = O.arenaOutboxMakeEntry(report('m3'), 0);
  ok('свежий не истёк', !O.arenaOutboxExpired(e, O.ARENA_OUTBOX_TTL_MS - 1));
  ok('старый истёк', O.arenaOutboxExpired(e, O.ARENA_OUTBOX_TTL_MS + 1));
  eq('истёкший снимается даже без сети', O.arenaOutboxAfterFailure(e, 'offline', O.ARENA_OUTBOX_TTL_MS + 1), null);
}

// вытеснение: выбрасывается самая старая
{
  const entries = Array.from({ length: 25 }, (_, i) => O.arenaOutboxMakeEntry(report('m' + i), i * 1000));
  const { keep, dropped } = O.arenaOutboxEvict(entries, 30000);
  eq('осталось ровно максимум', keep.length, O.ARENA_OUTBOX_MAX);
  eq('выброшено пять', dropped.length, 5);
  eq('выброшены самые старые', dropped.slice(0, 5), ['m0','m1','m2','m3','m4']);
  ok('самый новый остался', keep.some((e) => e.matchId === 'm24'));
}

// истёкшие уходят вместе с переполнением
{
  const old = O.arenaOutboxMakeEntry(report('старый'), 0);
  const fresh = O.arenaOutboxMakeEntry(report('свежий'), O.ARENA_OUTBOX_TTL_MS);
  const { keep, dropped } = O.arenaOutboxEvict([old, fresh], O.ARENA_OUTBOX_TTL_MS + 10);
  eq('истёкший выброшен', dropped, ['старый']);
  eq('свежий остался', keep.map((e) => e.matchId), ['свежий']);
}

// готовность к отправке и подсказка про обновление
{
  const e = O.arenaOutboxMakeEntry(report('m9'), 1000);
  ok('свежая готова сразу', O.arenaOutboxDue(e, 1000));
  const waiting = O.arenaOutboxAfterFailure(e, 'transient', 1000);
  ok('после ошибки ждёт', !O.arenaOutboxDue(waiting, 1000));
  ok('и дожидается', O.arenaOutboxDue(waiting, waiting.nextAttemptAtWallMs));
  ok('подсказка про обновление видна', O.arenaOutboxHasGated([O.arenaOutboxAfterFailure(e, 'gated', 1000)]));
  ok('без неё подсказки нет', !O.arenaOutboxHasGated([e]));
}

eq('ключ записи', O.arenaOutboxEntryKey('abc'), 'arena.outbox.v2.abc');

console.log('');
console.log('ПРОЙДЕНО: ' + pass + '   ПРОВАЛЕНО: ' + fail);
process.exit(fail ? 1 : 0);
