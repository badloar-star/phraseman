import { buildAllDepartmentsSnapshot } from './all_departments_snapshot';
import type { Decision } from './decision';

/**
 * Бриф в255: cost regression tests.
 *
 * зачем отдельно от all_departments_snapshot.test.ts: те тесты проверяют
 * МАРШРУТИЗАЦИЮ (кто что вернул), этот — СТОИМОСТЬ (сколько раз что-то было
 * вызвано). Порог здесь — явное число, а не «работает и ладно»: если завтра
 * кто-то по ошибке уберёт кэширование тира или начнёт дёргать resolveAppTier
 * внутри каждого департамента вместо одного раза, тест покраснеет с понятной
 * причиной, а не тихо утроит счёт Firebase.
 */

function decisionOf(department: string): Decision {
  return { department, question: `q-${department}`, evidence: [] } as unknown as Decision;
}

const DEPARTMENT_KEYS = [
  'runQuality', 'runMoney', 'runGrowth', 'runContent',
  'runPayments', 'runSafety', 'runSupport', 'runFactory', 'runRetention',
  'runMaxvoice',
] as const;

describe('Jarvis cost regression — one button press must not multiply reads', () => {
  test('resolveAppTier is called exactly once, never once per department', async () => {
    // зачем это главная защита от перерасхода: naive-реализация вызвала бы
    // тир девять раз (по разу на департамент). Каждый лишний вызов —
    // отдельный .count() по users, реальные деньги на масштабе.
    const resolveAppTier = jest.fn(async () => 'scale' as const);
    const runners = Object.fromEntries(
      DEPARTMENT_KEYS.map((key) => [key, jest.fn(async () => ({
        generatedAtMs: 1, decisions: [decisionOf(key)],
      }))]),
    );

    await buildAllDepartmentsSnapshot({ resolveAppTier, ...runners, nowMs: 5_000 } as never);

    expect(resolveAppTier).toHaveBeenCalledTimes(1);
  });

  test('each department runner is called exactly once per button press', async () => {
    // зачем: двойной вызов одного департамента удвоил бы его чтения молча —
    // такое легко пропустить при рефакторинге async-логики свода.
    const resolveAppTier = jest.fn(async () => 'seed' as const);
    const runners = Object.fromEntries(
      DEPARTMENT_KEYS.map((key) => [key, jest.fn(async () => ({
        generatedAtMs: 1, decisions: [],
      }))]),
    );

    await buildAllDepartmentsSnapshot({ resolveAppTier, ...runners, nowMs: 5_000 } as never);

    for (const key of DEPARTMENT_KEYS) {
      expect(runners[key]).toHaveBeenCalledTimes(1);
    }
  });

  test('a department that fails is still called exactly once, not retried in a loop', async () => {
    // зачем: молчаливый retry-по-кругу на ошибке превратил бы один сбойный
    // источник в лавину чтений вместо одной честной записи в departmentErrors.
    const resolveAppTier = jest.fn(async () => 'seed' as const);
    const failing = jest.fn(async () => { throw new Error('source down'); });
    const runners = Object.fromEntries(
      DEPARTMENT_KEYS.map((key) => [key, key === 'runQuality'
        ? failing
        : jest.fn(async () => ({ generatedAtMs: 1, decisions: [] }))]),
    );

    const result = await buildAllDepartmentsSnapshot({ resolveAppTier, ...runners, nowMs: 5_000 } as never);

    expect(failing).toHaveBeenCalledTimes(1);
    expect(result.departmentErrors).toEqual(['quality']);
  });
});
