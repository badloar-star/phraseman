/**
 * U35 (владелец 11.11): «все монеты заработанные везде считать!». Сторож подключения правила к журналу:
 * бонусы за действия (класс grant) растят недельный счётчик Пика, но НЕ «заработано за всё время»; приз прошлой недели,
 * подарки и траты неделю не трогают; заработок (earn) считается как раньше, включая датировку задним числом.
 * Свой файл, а не stars_ledger.test.ts: тот правит другая сессия.
 */
import { prepareStarOperations, starsWeekEarned, type StarOpReason, type StarOpRequest, type StarsState } from './stars_ledger';

const NOW = Date.UTC(2026, 10, 11, 12, 0); // среда недели 2026-W46
const WEEK = '2026-W46';
const PREV_WEEK = '2026-W45';
const SUNDAY_PREV = Date.UTC(2026, 10, 8, 22, 0);

function op(reason: StarOpReason, delta: number, id: string, earnedAtMs = NOW): StarOpRequest {
  return { opId: `u35test:${id}`, delta, reason, sourceKind: 'u35test', sourceId: id, ruleVersion: 1, earnedAtMs };
}

async function apply(ops: readonly StarOpRequest[], stars: Partial<StarsState> = {}, backdate = false): Promise<StarsState> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const tx: any = { get: async () => ({ exists: false, data: () => undefined }) };
  const userSnap: any = {
    ref: { collection: () => ({ doc: (id: string) => ({ id, path: `users/u1/star_operations/${id}` }) }) },
    data: () => ({ stars }),
  };
  const prepared = await prepareStarOperations(tx, {} as any, 'u1', userSnap, ops, {
    nowMs: NOW,
    activeSeasonId: '',
    weekKeyNow: WEEK,
    ...(backdate ? { weekKeyForMs: (ms: number) => (ms < Date.UTC(2026, 10, 9) ? PREV_WEEK : WEEK) } : {}),
    authUid: 'u1',
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */
  expect(prepared.outcomes.map((o) => o.status)).toEqual(ops.map(() => 'applied'));
  return prepared.after;
}

describe('[U35] журнал: что растит монеты недели Пика', () => {
  it('бонус за урок / задания дня (level_spin_grant) идёт в неделю, но не в «заработано за всё время»', async () => {
    const after = await apply([op('level_spin_grant', 500, 'bonus')]);
    expect(starsWeekEarned(after, WEEK)).toBe(500);
    expect(after.balance).toBe(500);
    expect(after.grantedTotal).toBe(500);
    expect(after.earnedTotal).toBe(0);
    expect(after.seasonEarned).toBe(0);
  });

  it('урок + бонус + видео + друг: в неделю идёт всё за действия', async () => {
    const after = await apply([
      op('practice_session', 150, 'lesson'), op('level_spin_grant', 300, 'daily'),
      op('video_watch', 90, 'video'), op('referral_ladder', 500, 'friend'),
    ]);
    expect(starsWeekEarned(after, WEEK)).toBe(1040);
    expect(after.earnedTotal).toBe(150);
    expect(after.grantedTotal).toBe(890);
  });

  it('приз прошлой недели, подарки и переносы неделю НЕ растят', async () => {
    const after = await apply([
      op('spire_week_reward', 1300, 'prize'), op('welcome_gift', 300, 'welcome'), op('global_broadcast', 300, 'news'),
      op('admin_grant', 100, 'admin'), op('coin_exchange', 50, 'exchange'), op('account_merge_in', 70, 'merge'), op('legacy_bonus', 40, 'legacy'),
    ]);
    expect(starsWeekEarned(after, WEEK)).toBe(0);
    expect(after.balance).toBe(2160);
  });

  it('трата не уменьшает монеты недели', async () => {
    const after = await apply([op('practice_session', 400, 'lesson'), op('dialog_extra_replies', -300, 'spend')]);
    expect(starsWeekEarned(after, WEEK)).toBe(400);
    expect(after.balance).toBe(100);
  });

  it('урок, пройденный без сети в прошлую неделю, по-прежнему ложится в свою неделю', async () => {
    const stars = { balance: 100, earnedTotal: 100, weekKey: PREV_WEEK, weekEarned: 100 } as Partial<StarsState>;
    const after = await apply([op('practice_session', 400, 'offline', SUNDAY_PREV)], stars, true);
    expect(starsWeekEarned(after, PREV_WEEK)).toBe(500);
    expect(starsWeekEarned(after, WEEK)).toBe(0);
  });

  it('смена недели обнуляет счётчик и для бонусов: бонус новой недели не попадает в прошлую', async () => {
    const stars = { balance: 700, earnedTotal: 200, grantedTotal: 500, weekKey: PREV_WEEK, weekEarned: 700 } as Partial<StarsState>;
    const after = await apply([op('level_spin_grant', 50, 'monday')], stars);
    expect(starsWeekEarned(after, WEEK)).toBe(50);
    expect(starsWeekEarned(after, PREV_WEEK)).toBe(700);
  });
});
