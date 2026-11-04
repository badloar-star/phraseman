// Бонус +500 монет новичку за первое завершённое занятие (владелец 30.10): один раз, только новый, флаг, откат, ключ.
import { createHash } from 'node:crypto';
import { judgeRankGateUser } from '../app/rank_gates_new_user';
import { decideFirstLessonBonus, firstLessonBonusFlagKey, firstLessonBonusRequestId, maybeGrantFirstLessonBonus, FIRST_LESSON_BONUS_COINS, type FirstLessonBonusDeps } from '../app/first_lesson_bonus';

const NEW = { isNew: true, reason: 'new' } as const;
const OLD = { isNew: false, reason: 'prior_progress' } as const;
const sha = async (input: string) => createHash('sha256').update(input).digest('hex');

function deps(over: Partial<FirstLessonBonusDeps> & { flag?: { v: boolean } } = {}): { d: FirstLessonBonusDeps; grants: string[]; flag: { v: boolean } } {
  const grants: string[] = [];
  const flag = over.flag ?? { v: false };
  const d: FirstLessonBonusDeps = {
    gatesEnabled: () => true,
    verdict: async () => NEW,
    ownerStableId: async () => 'owner-1',
    sha256Hex: sha,
    grant: async ({ requestId, giftId }) => { grants.push(`${requestId}|${giftId}`); },
    readFlag: async () => flag.v,
    writeFlag: async () => { flag.v = true; },
    ...over,
  };
  return { d, grants, flag };
}

describe('decideFirstLessonBonus', () => {
  it('новый получает', () => expect(decideFirstLessonBonus({ gatesEnabled: true, verdict: NEW, alreadyGranted: false })).toEqual({ grant: true }));
  it('старый — нет', () => expect(decideFirstLessonBonus({ gatesEnabled: true, verdict: OLD, alreadyGranted: false })).toEqual({ grant: false, reason: 'not_new' }));
  it('неизвестный — нет', () => expect(decideFirstLessonBonus({ gatesEnabled: true, verdict: null, alreadyGranted: false })).toEqual({ grant: false, reason: 'unknown' }));
  it('флаг выкл — нет', () => expect(decideFirstLessonBonus({ gatesEnabled: false, verdict: NEW, alreadyGranted: false })).toEqual({ grant: false, reason: 'flag_off' }));
  it('уже выдан — нет', () => expect(decideFirstLessonBonus({ gatesEnabled: true, verdict: NEW, alreadyGranted: true })).toEqual({ grant: false, reason: 'already_granted' }));
});

describe('maybeGrantFirstLessonBonus', () => {
  it('новый получает ровно один раз: повторное завершение/вход не начисляют', async () => {
    const { d, grants } = deps();
    expect(await maybeGrantFirstLessonBonus(d)).toBe(true);
    expect(await maybeGrantFirstLessonBonus(d)).toBe(false);
    expect(await maybeGrantFirstLessonBonus(d)).toBe(false);
    expect(grants).toHaveLength(1);
    expect(grants[0]).toMatch(/^dailyjourney_[A-Za-z0-9]{32}_1\|stars_500$/);
  });
  it('номинал бонуса 500', () => expect(FIRST_LESSON_BONUS_COINS).toBe(500));
  it('старый и неизвестный не получают; восстановление с прогрессом = старый', async () => {
    const restored = judgeRankGateUser({ completedAtMs: 2_000, priorProgress: true, nowMs: 3_000, sinceMs: 1_000 });
    expect(restored.isNew).toBe(false);
    for (const verdict of [OLD, restored, { isNew: false, reason: 'read_failed' } as const]) {
      const { d, grants } = deps({ verdict: async () => verdict });
      expect(await maybeGrantFirstLessonBonus(d)).toBe(false);
      expect(grants).toHaveLength(0);
    }
  });
  it('флаг выкл — бонуса нет', async () => {
    const { d, grants } = deps({ gatesEnabled: () => false });
    expect(await maybeGrantFirstLessonBonus(d)).toBe(false);
    expect(grants).toHaveLength(0);
  });
  it('ошибка начисления: флаг не ставится, следующий раз повторит с ТЕМ ЖЕ ключом', async () => {
    let fail = true; const ids: string[] = []; const flag = { v: false };
    const { d } = deps({ flag, grant: async ({ requestId }) => { ids.push(requestId); if (fail) throw new Error('network'); } });
    expect(await maybeGrantFirstLessonBonus(d)).toBe(false);
    expect(flag.v).toBe(false);
    fail = false;
    expect(await maybeGrantFirstLessonBonus(d)).toBe(true);
    expect(flag.v).toBe(true);
    expect(ids[0]).toBe(ids[1]);
  });
  it('нет владельца — не начисляем', async () => {
    const { d, grants } = deps({ ownerStableId: async () => null });
    expect(await maybeGrantFirstLessonBonus(d)).toBe(false);
    expect(grants).toHaveLength(0);
  });
  it('двойной одновременный вызов — одно начисление', async () => {
    const { d, grants } = deps();
    await Promise.all([maybeGrantFirstLessonBonus(d), maybeGrantFirstLessonBonus(d)]);
    expect(grants).toHaveLength(1);
  });
});

describe('флаг «выдан» — на владельца (координатор 04.11)', () => {
  it('второй новый аккаунт на том же телефоне получает свой бонус ровно один раз', async () => {
    const store = new Set<string>(); const grants: string[] = []; let owner = 'owner-A';
    const base = (): FirstLessonBonusDeps => ({
      gatesEnabled: () => true, verdict: async () => NEW, ownerStableId: async () => owner, sha256Hex: sha,
      grant: async ({ requestId }) => { grants.push(requestId); },
      readFlag: async (o) => store.has(firstLessonBonusFlagKey(o)), writeFlag: async (o) => { store.add(firstLessonBonusFlagKey(o)); },
    });
    expect(await maybeGrantFirstLessonBonus(base())).toBe(true);   // аккаунт A
    expect(await maybeGrantFirstLessonBonus(base())).toBe(false);  // A повторно — нет
    owner = 'owner-B';                                            // выход, второй новый аккаунт на том же телефоне
    expect(await maybeGrantFirstLessonBonus(base())).toBe(true);   // B получает свой бонус
    expect(await maybeGrantFirstLessonBonus(base())).toBe(false);  // и только один раз
    expect(grants).toHaveLength(2);
    expect(new Set(grants).size).toBe(2);
  });
  it('ключ флага — в стираемом семействе story_events_v1: и разный у разных владельцев', () => {
    expect(firstLessonBonusFlagKey('a')).toMatch(/^story_events_v1:first_lesson_bonus_granted:a$/);
    expect(firstLessonBonusFlagKey('a')).not.toBe(firstLessonBonusFlagKey('b'));
  });
});

describe('ключ операции', () => {
  it('один владелец — один ключ, разные владельцы — разные, форма из белого списка сервера', async () => {
    const a = await firstLessonBonusRequestId('a', sha); const a2 = await firstLessonBonusRequestId('a', sha); const b = await firstLessonBonusRequestId('b', sha);
    expect(a).toBe(a2); expect(a).not.toBe(b);
    expect(a).toMatch(/^dailyjourney_[A-Za-z0-9]{32}_\d{1,3}$/);
  });
});
