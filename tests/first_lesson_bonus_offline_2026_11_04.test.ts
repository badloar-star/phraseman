// Первое занятие без сети (координатор 04.11): «неизвестно» не становится «не новый» навсегда, бонус повторяется на ближайшем завершении занятия.
import { createHash } from 'node:crypto';
import { judgeRankGateUser } from '../app/rank_gates_new_user';
import { maybeGrantFirstLessonBonus } from '../app/first_lesson_bonus';

const NEW = { isNew: true, reason: 'new' } as const;
const sha = async (input: string) => createHash('sha256').update(input).digest('hex');

describe('первое занятие без сети (координатор 04.11)', () => {
  it('неизвестное не записывается как «не новый» навсегда: правило и бонус повторяются на ближайшем завершении занятия', async () => {
    const unknown = judgeRankGateUser({ completedAtMs: 2_000, priorProgress: false, nowMs: 3_000, sinceMs: 1_000, accountCreatedAtMs: null });
    expect(unknown).toEqual({ isNew: false, reason: 'account_age_unknown' });
    const store = new Set<string>(); const grants: string[] = []; let verdict: typeof NEW | typeof unknown = unknown;
    const run = () => maybeGrantFirstLessonBonus({
      gatesEnabled: () => true, verdict: async () => verdict, ownerStableId: async () => 'offline-owner', sha256Hex: sha,
      grant: async ({ requestId }) => { grants.push(requestId); },
      readFlag: async (o) => store.has(o), writeFlag: async (o) => { store.add(o); },
    });
    expect(await run()).toBe(false);        // занятие пройдено без сети: время аккаунта неизвестно — бонуса нет…
    expect(store.size).toBe(0);             // …и флаг «выдан» НЕ поставлен
    verdict = NEW;                          // сеть вернулась, время создания аккаунта известно
    expect(await run()).toBe(true);         // ближайшее завершение занятия — бонус выдан
    expect(await run()).toBe(false);        // и только один раз
    expect(grants).toHaveLength(1);
  });
});
