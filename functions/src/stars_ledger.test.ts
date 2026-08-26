import {
  EMPTY_STARS_STATE,
  STAR_OP_CLASS,
  STAR_OP_SOURCE,
  commitStarOperations,
  normalizeStars,
  prepareStarOperations,
  starsSeasonEarned,
  starsSpendable,
  starsWeekEarned,
  type StarLedgerCtx,
  type StarOpRequest,
  type StarsState,
} from './stars_ledger';

/**
 * Единый журнал звёзд. Спецификация — docs/arena/STAGE1_SPEC.md.
 *
 * Эти тесты фиксируют ровно те решения, ошибка в которых стоит игроку денег
 * или прогресса: пакет операций одному игроку в одной транзакции, бесплатный
 * повтор, отделение выданных звёзд от заработанных, ленивый перенос недели.
 */

type FakeWorld = {
  tx: any;
  userSnap: any;
  reads: { count: number };
  writes: { sets: any[]; creates: any[] };
};

function makeWorld(stars?: Partial<StarsState>, existingReceiptIds: string[] = []): FakeWorld {
  const reads = { count: 0 };
  const writes: FakeWorld['writes'] = { sets: [], creates: [] };
  const receipts = new Set(existingReceiptIds);
  const userRef: any = {
    id: 'u1',
    path: 'users/u1',
    collection: () => ({ doc: (id: string) => ({ id, path: `users/u1/star_operations/${id}` }) }),
  };
  const userSnap: any = { ref: userRef, data: () => (stars ? { stars } : {}) };
  const tx: any = {
    get: async (ref: any) => { reads.count += 1; return { exists: receipts.has(ref.id), data: () => ({ seq: 7 }) }; },
    set: (ref: any, data: any) => writes.sets.push({ ref, data }),
    create: (ref: any, data: any) => writes.creates.push({ ref, data }),
  };
  return { tx, userSnap, reads, writes };
}

const NOW = 1_700_000_000_000;
const ctx = (over: Partial<StarLedgerCtx> = {}): StarLedgerCtx => ({
  nowMs: NOW,
  activeSeasonId: 'arena-2026-08-01',
  weekKeyNow: '2026-W33',
  authUid: 'auth1',
  deviceId: 'dev1',
  ...over,
});

const op = (over: Partial<StarOpRequest> = {}): StarOpRequest => ({
  opId: 'arena_match:m1',
  delta: 24,
  reason: 'arena_match',
  sourceKind: 'arena_match',
  sourceId: 'm1',
  ruleVersion: 1,
  ...over,
});

const settled = (balance: number, over: Partial<StarsState> = {}): Partial<StarsState> => ({
  balance, earnedTotal: balance, grantedTotal: 0, spentTotal: 0,
  weekKey: '2026-W33', weekEarned: balance,
  seasonId: 'arena-2026-08-01', seasonEarned: balance, seq: 1, ...over,
});

async function run(
  stars: Partial<StarsState> | undefined,
  ops: StarOpRequest[],
  c: StarLedgerCtx = ctx(),
  existing: string[] = [],
  extra?: Record<string, unknown>,
) {
  const world = makeWorld(stars, existing);
  const prepared = await prepareStarOperations(world.tx, {} as any, 'u1', world.userSnap, ops, c);
  const result = commitStarOperations(world.tx, prepared, extra);
  return { result, world };
}

describe('единый журнал звёзд', () => {
  it('начисляет и пишет ровно одну запись игрока и одну расписку', async () => {
    const { result, world } = await run(undefined, [op()]);
    expect(result.balance).toBe(24);
    expect(result.earnedTotal).toBe(24);
    expect(result.weekEarned).toBe(24);
    expect(result.seasonEarned).toBe(24);
    expect(world.writes.sets).toHaveLength(1);
    expect(world.writes.creates).toHaveLength(1);
    expect(world.reads.count).toBe(1);
  });

  it('делает повтор бесплатным — ни одной записи', async () => {
    const { result, world } = await run(settled(24), [op()], ctx(), ['arena_match:m1']);
    expect(result.balance).toBe(24);
    expect(result.outcomes[0].status).toBe('already_applied');
    expect(world.writes.sets.length + world.writes.creates.length).toBe(0);
  });

  it('применяет пакет операций одному игроку без затирания', async () => {
    // settleMatch начисляет одному игроку дважды в одной транзакции:
    // за матч и за пороги мастерства.
    const { result, world } = await run(undefined, [
      op(),
      op({ opId: 'arena_mastery:m1', delta: 10, reason: 'arena_mastery', sourceKind: 'arena_mastery' }),
    ]);
    expect(result.balance).toBe(34);
    expect(world.writes.creates).toHaveLength(2);
    expect(world.writes.sets).toHaveLength(1);
    expect(world.writes.creates[0].data.balanceAfter).toBe(24);
    expect(world.writes.creates[1].data.balanceBefore).toBe(24);
    expect(world.writes.creates.map((r: any) => r.data.seq)).toEqual([1, 2]);
  });

  it('запрещает второй prepare для того же игрока в той же транзакции', async () => {
    const world = makeWorld();
    await prepareStarOperations(world.tx, {} as any, 'u1', world.userSnap, [op()], ctx());
    await expect(
      prepareStarOperations(world.tx, {} as any, 'u1', world.userSnap, [op({ opId: 'arena_match:m2' })], ctx()),
    ).rejects.toThrow(/double_prepare/);
  });

  it('не уменьшает заработанное за всё время при трате', async () => {
    const { result } = await run(settled(100), [
      op({ opId: 'spend_shop:title_a_v1', delta: -40, reason: 'spend_shop', sourceKind: 'spend_shop', sourceId: 'title_a_v1' }),
    ]);
    expect(result.balance).toBe(60);
    expect(result.earnedTotal).toBe(100);
    expect(result.spentTotal).toBe(40);
    expect(result.seasonEarned).toBe(100);
  });

  it('отказывает при нехватке средств без частичной траты', async () => {
    const { result, world } = await run(settled(10), [
      op({ opId: 'spend_shop:x_v1', delta: -40, reason: 'spend_shop', sourceKind: 'spend_shop', sourceId: 'x_v1' }),
    ]);
    expect(result.balance).toBe(10);
    expect(result.outcomes[0].errorCode).toBe('insufficient_stars');
    expect(world.writes.creates).toHaveLength(0);
  });

  it('не даёт выданным звёздам открывать награды', async () => {
    // Иначе купленные за деньги монеты покупали бы прогресс сезонного пропуска.
    const { result } = await run(undefined, [
      op({ opId: 'coin_exchange:t1', delta: 50, reason: 'coin_exchange', sourceKind: 'coin_exchange', sourceId: 't1' }),
    ]);
    expect(result.balance).toBe(50);
    expect(result.earnedTotal).toBe(0);
    expect(result.seasonEarned).toBe(0);
    expect(result.weekEarned).toBe(0);
    expect(result.grantedTotal).toBe(50);
  });

  it('подарочные звёзды Спина попадают в единый баланс, но не в соревновательный прогресс', async () => {
    const { result } = await run(undefined, [
      op({
        opId: 'level_spin:request0000000001',
        delta: 250,
        reason: 'level_spin_grant' as any,
        sourceKind: 'level_spin',
        sourceId: 'request0000000001',
      }),
    ]);
    expect(result.balance).toBe(250);
    expect(result.grantedTotal).toBe(250);
    expect(result.earnedTotal).toBe(0);
    expect(result.weekEarned).toBe(0);
    expect(result.seasonEarned).toBe(0);
  });

  it('материализованный Spin credit сразу доступен следующей трате единого журнала', async () => {
    const { result } = await run(undefined, [
      op({
        opId: 'level_spin:request0000000001.base', delta: 50,
        reason: 'level_spin_grant' as any,
        sourceKind: 'level_spin_client_composite', sourceId: 'request0000000001.base',
      }),
      op({
        opId: 'spend_shop:after_spin', delta: -40,
        reason: 'spend_shop', sourceKind: 'spend_shop', sourceId: 'after_spin',
      }),
    ]);
    expect(result.outcomes.map((outcome) => outcome.status)).toEqual(['applied', 'applied']);
    expect(starsSpendable(normalizeStars({
      balance: result.balance, earnedTotal: result.earnedTotal,
      grantedTotal: result.grantedTotal, spentTotal: result.spentTotal,
    }))).toBe(10);
  });

  it('переносит неделю лениво и сохраняет предыдущую', async () => {
    const stale = settled(30, { weekKey: '2026-W32', weekEarned: 30 });
    const { result } = await run(stale, [op({ delta: 5 })]);
    expect(result.weekKey).toBe('2026-W33');
    expect(result.weekEarned).toBe(5);
    const state = normalizeStars(stale);
    expect(starsWeekEarned(state, '2026-W32')).toBe(30);
    expect(starsWeekEarned(state, '2026-W30')).toBe(0);
  });

  it('обнуляет сезонный счётчик, не трогая заработанное за всё время', async () => {
    const old = settled(300, { seasonId: 'arena-2026-06-01', seasonEarned: 300, weekEarned: 0, seq: 5 });
    const { result } = await run(old, [op({ delta: 7 })]);
    expect(result.seasonEarned).toBe(7);
    expect(result.earnedTotal).toBe(307);
    const state = normalizeStars(old);
    expect(starsSeasonEarned(state, 'arena-2026-08-01')).toBe(0);
    expect(starsSeasonEarned(state, 'arena-2026-06-01')).toBe(300);
  });

  it.each([
    ['НЕВЕРНО', 'invalid_op_id', {}],
    ['__proto__:x', 'invalid_op_id', {}],
    ['arena_match:m1', 'invalid_delta', { delta: 0 }],
    ['arena_match:m1', 'invalid_delta', { delta: 99_999 }],
    ['arena_match:m1', 'invalid_delta', { delta: 1.5 }],
    ['arena_match:m1', 'invalid_reason', { reason: 'что_то' as any }],
    ['arena_match:m1', 'invalid_reason', { delta: -5 }],
  ])('отклоняет операцию %s как %s', async (opId, code, over) => {
    const { result } = await run(undefined, [op({ opId, ...(over as object) })]);
    expect(result.outcomes[0].errorCode).toBe(code);
  });

  it('отклоняет дубль в пакете, но применяет первую операцию', async () => {
    const { result } = await run(undefined, [op(), op()]);
    expect(result.outcomes[1].errorCode).toBe('op_conflict');
    expect(result.balance).toBe(24);
  });

  it('роняет транзакцию на порченом балансе и не чинит его молча', async () => {
    const broken = { ...settled(100), earnedTotal: 10, weekEarned: 10, seasonEarned: 10, seq: 3 };
    await expect(run(broken, [op()])).rejects.toThrow(/inconsistent/);
  });

  it('кладёт опыт в ту же запись документа игрока', async () => {
    const { world } = await run(
      undefined, [op()], ctx({ xpDelta: 110, xpTotalAfter: 5_110 }), [],
      { progress: { user_total_xp: '5110' } },
    );
    expect(world.writes.sets).toHaveLength(1);
    expect(world.writes.sets[0].data.stars).toBeDefined();
    expect(world.writes.sets[0].data.progress).toBeDefined();
    expect(world.writes.creates[0].data.xpDelta).toBe(110);
  });

  /**
   * Разрез «откуда руны». Владелец 2026-08-26: «получил бонус 300 за вход, а в
   * разделе Руны написано заработано за всё время 0». Экран показывает сумму
   * earnedTotal + grantedTotal, а строки источников — эту карту. Ошибка здесь
   * снова спрячет подарок от игрока, поэтому она застолблена.
   */
  describe('разрез притока по источникам', () => {
    it('копит приток по источнику, а траты в разрез не пишет', async () => {
      const { world } = await run(undefined, [
        op(),
        op({ opId: 'welcome_gift:u1', delta: 300, reason: 'welcome_gift', sourceKind: 'welcome_gift', sourceId: 'u1' }),
        op({ opId: 'spend_shop:s1', delta: -20, reason: 'spend_shop', sourceKind: 'spend_shop', sourceId: 's1' }),
      ]);
      const stars = world.writes.sets[0].data.stars as StarsState;
      expect(stars.bySource.arena).toBe(24);
      expect(stars.bySource.other).toBe(300);
      // Трата ушла в spentTotal, но разрез притока не тронула — иначе цифра
      // источника «уменьшалась бы» и перестала отвечать на «откуда пришло».
      expect(stars.spentTotal).toBe(20);
      expect(stars.bySource.spin).toBeUndefined();
      // Главное число экрана: заработано игрой + подарено.
      expect(stars.earnedTotal + stars.grantedTotal).toBe(324);
    });

    it('накапливает поверх карты уже существующего аккаунта', async () => {
      const { world } = await run(
        settled(24, { bySource: { arena: 24 } }),
        [op({ opId: 'level_spin_grant:g1', delta: 50, reason: 'level_spin_grant', sourceKind: 'level_spin', sourceId: 'g1' })],
      );
      const stars = world.writes.sets[0].data.stars as StarsState;
      expect(stars.bySource.arena).toBe(24);
      expect(stars.bySource.spin).toBe(50);
    });

    it('переживает документ без карты и мусор в ней', () => {
      expect(normalizeStars({ balance: 5 }).bySource).toEqual({});
      expect(normalizeStars({ bySource: { arena: 7, unknown_key: 3, spin: -1 } }).bySource)
        .toEqual({ arena: 7 });
      expect(normalizeStars({ bySource: 'broken' }).bySource).toEqual({});
    });

    it('держит таблицу источников закрытой', () => {
      expect(STAR_OP_SOURCE.arena_match).toBe('arena');
      expect(STAR_OP_SOURCE.learning_v2_session).toBe('learning');
      expect(STAR_OP_SOURCE.friends_together_chest).toBe('friends');
      expect(STAR_OP_SOURCE.level_spin_grant).toBe('spin');
      expect(STAR_OP_SOURCE.coin_exchange).toBe('exchange');
      // Стартовый подарок обязан попадать в приток — это и был баг владельца.
      expect(STAR_OP_SOURCE.welcome_gift).toBe('other');
      // Каждая причина имеет источник: новая причина без строки здесь уронит
      // сборку, а не проедет молча с нулём на экране.
      for (const reason of Object.keys(STAR_OP_CLASS)) {
        expect((STAR_OP_SOURCE as Record<string, string>)[reason]).toBeTruthy();
      }
    });
  });

  it('держит таблицу классов операций закрытой', () => {
    expect(STAR_OP_CLASS.arena_match).toBe('earn');
    expect(STAR_OP_CLASS.coin_exchange).toBe('grant');
    expect((STAR_OP_CLASS as Record<string, string>).level_spin_grant).toBe('grant');
    expect(STAR_OP_CLASS.spend_shop).toBe('spend');
    expect(starsSpendable(undefined)).toBe(0);
    expect(starsSpendable({ ...EMPTY_STARS_STATE, balance: 12 })).toBe(12);
  });
});
