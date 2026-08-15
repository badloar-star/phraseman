const L = require('./stars_ledger.js');

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; console.log('FAIL  ' + name + '\n  получено:  ' + JSON.stringify(got) + '\n  ожидалось: ' + JSON.stringify(want)); }
};
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.log('FAIL  ' + name); } };

// ── фейковый Firestore: считаем чтения и записи ──────────────────────────────
function makeWorld(userStars, existingReceiptIds = []) {
  const reads = { count: 0 };
  const writes = { sets: [], creates: [] };
  const receipts = new Set(existingReceiptIds);
  const receiptDoc = (id) => ({ id, __receipt: true });
  const collection = () => ({ doc: receiptDoc });
  const userRef = { id: 'u1', collection, path: 'users/u1' };
  const userSnap = { ref: userRef, data: () => (userStars === undefined ? {} : { stars: userStars }) };
  const tx = {
    get: async (ref) => { reads.count++; return { exists: receipts.has(ref.id), data: () => ({ seq: 7 }) }; },
    set: (ref, data) => writes.sets.push({ ref, data }),
    create: (ref, data) => writes.creates.push({ ref, data }),
  };
  return { tx, userSnap, userRef, reads, writes };
}
const ctx = (over = {}) => Object.assign({
  nowMs: 1_700_000_000_000,
  activeSeasonId: 'arena-2026-08-01',
  weekKeyNow: '2026-W33',
  authUid: 'auth1',
  deviceId: 'dev1',
}, over);

const op = (over = {}) => Object.assign({
  opId: 'arena_match:m1', delta: 24, reason: 'arena_match',
  sourceKind: 'arena_match', sourceId: 'm1', ruleVersion: 1,
}, over);

const run = async (stars, ops, c = ctx(), existing = []) => {
  const w = makeWorld(stars, existing);
  const prepared = await L.prepareStarOperations(w.tx, {}, 'u1', w.userSnap, ops, c);
  const result = L.commitStarOperations(w.tx, prepared);
  return { prepared, result, w };
};

(async () => {
  // 1. чистое начисление
  {
    const { result, w } = await run(undefined, [op()]);
    eq('начисление: баланс', result.balance, 24);
    eq('начисление: заработано за всё время', result.earnedTotal, 24);
    eq('начисление: за неделю', result.weekEarned, 24);
    eq('начисление: за сезон', result.seasonEarned, 24);
    eq('начисление: одна запись документа игрока', w.writes.sets.length, 1);
    eq('начисление: одна расписка', w.writes.creates.length, 1);
    eq('начисление: одно чтение расписки', w.reads.count, 1);
  }

  // 2. повтор той же операции ничего не пишет
  {
    const { result, w } = await run(
      { balance: 24, earnedTotal: 24, grantedTotal: 0, spentTotal: 0, weekKey: '2026-W33', weekEarned: 24, seasonId: 'arena-2026-08-01', seasonEarned: 24, seq: 1 },
      [op()], ctx(), ['arena_match:m1'],
    );
    eq('повтор: баланс не изменился', result.balance, 24);
    eq('повтор: статус', result.outcomes[0].status, 'already_applied');
    eq('повтор: ноль записей', w.writes.sets.length + w.writes.creates.length, 0);
  }

  // 3. две операции одному игроку в одной транзакции (матч + мастерство)
  {
    const { result, w } = await run(undefined, [
      op(),
      op({ opId: 'arena_mastery:m1', delta: 10, reason: 'arena_mastery', sourceKind: 'arena_mastery' }),
    ]);
    eq('пакет: баланс', result.balance, 34);
    eq('пакет: две расписки', w.writes.creates.length, 2);
    eq('пакет: всё равно одна запись игрока', w.writes.sets.length, 1);
    eq('пакет: цепочка балансов', [w.writes.creates[0].data.balanceAfter, w.writes.creates[1].data.balanceBefore], [24, 24]);
    eq('пакет: последовательные номера', [w.writes.creates[0].data.seq, w.writes.creates[1].data.seq], [1, 2]);
  }

  // 4. второй prepare для того же игрока в той же транзакции запрещён
  {
    const w = makeWorld(undefined);
    await L.prepareStarOperations(w.tx, {}, 'u1', w.userSnap, [op()], ctx());
    let threw = false;
    try { await L.prepareStarOperations(w.tx, {}, 'u1', w.userSnap, [op({ opId: 'arena_match:m2' })], ctx()); }
    catch (e) { threw = /double_prepare/.test(String(e && e.message)); }
    ok('двойной prepare отклонён', threw);
  }

  // 5. трата
  {
    const base = { balance: 100, earnedTotal: 100, grantedTotal: 0, spentTotal: 0, weekKey: '2026-W33', weekEarned: 100, seasonId: 'arena-2026-08-01', seasonEarned: 100, seq: 1 };
    const { result } = await run(base, [op({ opId: 'spend_shop:title_a_v1', delta: -40, reason: 'spend_shop', sourceKind: 'spend_shop', sourceId: 'title_a_v1' })]);
    eq('трата: баланс', result.balance, 60);
    eq('трата: заработано НЕ уменьшилось', result.earnedTotal, 100);
    eq('трата: потрачено', result.spentTotal, 40);
    eq('трата: сезон не тронут', result.seasonEarned, 100);
  }

  // 6. нехватка средств — отказ без частичной траты
  {
    const base = { balance: 10, earnedTotal: 10, grantedTotal: 0, spentTotal: 0, weekKey: '2026-W33', weekEarned: 10, seasonId: 'arena-2026-08-01', seasonEarned: 10, seq: 1 };
    const { result, w } = await run(base, [op({ opId: 'spend_shop:x_v1', delta: -40, reason: 'spend_shop', sourceKind: 'spend_shop', sourceId: 'x_v1' })]);
    eq('нехватка: баланс цел', result.balance, 10);
    eq('нехватка: код ошибки', result.outcomes[0].errorCode, 'insufficient_stars');
    eq('нехватка: ноль расписок', w.writes.creates.length, 0);
  }

  // 7. выдача не открывает награды
  {
    const { result } = await run(undefined, [op({ opId: 'coin_exchange:t1', delta: 50, reason: 'coin_exchange', sourceKind: 'coin_exchange', sourceId: 't1' })]);
    eq('выдача: баланс вырос', result.balance, 50);
    eq('выдача: заработано НЕ выросло', result.earnedTotal, 0);
    eq('выдача: сезон НЕ вырос', result.seasonEarned, 0);
    eq('выдача: неделя НЕ выросла', result.weekEarned, 0);
    eq('выдача: учтено отдельно', result.grantedTotal, 50);
  }

  // 8. смена недели — предыдущая сохраняется, ремонта нет
  {
    const base = { balance: 30, earnedTotal: 30, grantedTotal: 0, spentTotal: 0, weekKey: '2026-W32', weekEarned: 30, seasonId: 'arena-2026-08-01', seasonEarned: 30, seq: 1 };
    const { result } = await run(base, [op({ delta: 5 })]);
    eq('новая неделя: счётчик обнулён и наполнен', result.weekEarned, 5);
    eq('новая неделя: ключ', result.weekKey, '2026-W33');
    const stars = { ...base, weekKey: '2026-W32', weekEarned: 30 };
    eq('проекция: прошлая неделя читается', L.starsWeekEarned({ ...stars }, '2026-W32'), 30);
    eq('проекция: устаревшая неделя = 0', L.starsWeekEarned({ ...stars }, '2026-W30'), 0);
  }

  // 9. смена сезона обнуляет сезонный счётчик, но не заработанное за всё время
  {
    const base = { balance: 300, earnedTotal: 300, grantedTotal: 0, spentTotal: 0, weekKey: '2026-W33', weekEarned: 0, seasonId: 'arena-2026-06-01', seasonEarned: 300, seq: 5 };
    const { result } = await run(base, [op({ delta: 7 })]);
    eq('новый сезон: счётчик с нуля', result.seasonEarned, 7);
    eq('новый сезон: за всё время цело', result.earnedTotal, 307);
    eq('проекция: чужой сезон = 0', L.starsSeasonEarned(base, 'arena-2026-08-01'), 0);
    eq('проекция: свой сезон', L.starsSeasonEarned(base, 'arena-2026-06-01'), 300);
  }

  // 10. валидация
  {
    const bad = async (over, code) => {
      const { result } = await run(undefined, [op(over)]);
      eq('валидация ' + code, result.outcomes[0].errorCode, code);
    };
    await bad({ opId: 'НЕВЕРНО' }, 'invalid_op_id');
    await bad({ opId: '__proto__:x' }, 'invalid_op_id');
    await bad({ delta: 0 }, 'invalid_delta');
    await bad({ delta: 99999 }, 'invalid_delta');
    await bad({ delta: 1.5 }, 'invalid_delta');
    await bad({ reason: 'что_то' }, 'invalid_reason');
    await bad({ delta: -5 }, 'invalid_reason');
    await bad({ meta: Object.fromEntries(Array.from({ length: 12 }, (_, i) => ['k' + i, 1])) }, 'meta_too_large');
    const { result: dup } = await run(undefined, [op(), op()]);
    eq('валидация дубля в пакете', dup.outcomes[1].errorCode, 'op_conflict');
    eq('валидация: первая всё равно применилась', dup.balance, 24);
  }

  // 11. порченый баланс — транзакция падает, ничего не пишется
  {
    let threw = false;
    try {
      await run({ balance: 100, earnedTotal: 10, grantedTotal: 0, spentTotal: 0, weekKey: '2026-W33', weekEarned: 10, seasonId: 'arena-2026-08-01', seasonEarned: 10, seq: 3 }, [op()]);
    } catch (e) { threw = /inconsistent/.test(String(e && e.message)); }
    ok('порченый баланс отклонён без ремонта', threw);
  }

  // 12. опыт едет в той же записи документа игрока
  {
    const w = makeWorld(undefined);
    const prepared = await L.prepareStarOperations(w.tx, {}, 'u1', w.userSnap, [op()], ctx({ xpDelta: 110, xpTotalAfter: 5110 }));
    L.commitStarOperations(w.tx, prepared, { progress: { user_total_xp: '5110' } });
    eq('опыт: по-прежнему одна запись игрока', w.writes.sets.length, 1);
    ok('опыт: звёзды и опыт в одной записи',
       Boolean(w.writes.sets[0].data.stars) && Boolean(w.writes.sets[0].data.progress));
    eq('опыт: попал в расписку', w.writes.creates[0].data.xpDelta, 110);
  }

  console.log('');
  console.log('ПРОЙДЕНО: ' + pass + '   ПРОВАЛЕНО: ' + fail);
  process.exit(fail ? 1 : 0);
})();
