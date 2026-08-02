import { buildAllDepartmentsSnapshot } from './all_departments_snapshot';
import type { Decision } from './decision';

// зачем: тест проверяет только маршрутизацию (какой департамент дал какое
// решение), не поля самого Decision — упрощённый мок с явным приведением типа.
function decisionOf(department: string): Decision {
  return { department, question: `q-${department}`, evidence: [] } as unknown as Decision;
}

describe('Jarvis all-departments snapshot — one button, one combined result', () => {
  test('resolves the tier once and runs quality/money/growth together', async () => {
    const resolveAppTier = jest.fn(async () => 'scale' as const);
    const runQuality = jest.fn(async (_tier: string) => ({ generatedAtMs: 1, decisions: [decisionOf('quality')] }));
    const runMoney = jest.fn(async (_tier: string) => ({ generatedAtMs: 1, decisions: [decisionOf('money')] }));
    const runGrowth = jest.fn(async (_tier: string) => ({ generatedAtMs: 1, decisions: [] }));

    const result = await buildAllDepartmentsSnapshot({ resolveAppTier, runQuality, runMoney, runGrowth, nowMs: 5_000 });

    expect(resolveAppTier).toHaveBeenCalledTimes(1);
    expect(runQuality).toHaveBeenCalledWith('scale');
    expect(runMoney).toHaveBeenCalledWith('scale');
    expect(runGrowth).toHaveBeenCalledWith('scale');
    expect(result.appTier).toBe('scale');
    expect(result.generatedAtMs).toBe(5_000);
    expect(result.decisions.map((d) => d.department)).toEqual(['quality', 'money']);
  });

  test('one department throwing does not abort the other two', async () => {
    const resolveAppTier = jest.fn(async () => 'seed' as const);
    const runQuality = jest.fn(async () => { throw new Error('boom'); });
    const runMoney = jest.fn(async () => ({ generatedAtMs: 1, decisions: [decisionOf('money')] }));
    const runGrowth = jest.fn(async () => ({ generatedAtMs: 1, decisions: [decisionOf('growth')] }));

    const result = await buildAllDepartmentsSnapshot({ resolveAppTier, runQuality, runMoney, runGrowth, nowMs: 5_000 });

    expect(result.decisions.map((d) => d.department)).toEqual(['money', 'growth']);
    expect(result.departmentErrors).toEqual(['quality']);
  });

  test('all departments empty yields an empty decisions array, not an error', async () => {
    const resolveAppTier = jest.fn(async () => 'growth' as const);
    const empty = jest.fn(async () => ({ generatedAtMs: 1, decisions: [] }));
    const result = await buildAllDepartmentsSnapshot({ resolveAppTier, runQuality: empty, runMoney: empty, runGrowth: empty, nowMs: 5_000 });
    expect(result.decisions).toEqual([]);
    expect(result.departmentErrors).toEqual([]);
  });
});
