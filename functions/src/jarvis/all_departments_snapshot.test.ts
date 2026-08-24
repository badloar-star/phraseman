import { buildAllDepartmentsSnapshot } from './all_departments_snapshot';
import type { Decision } from './decision';
import { buildPaymentsSnapshot } from './payments_snapshot';

// зачем: тест проверяет только маршрутизацию (какой департамент дал какое
// решение), не поля самого Decision — упрощённый мок с явным приведением типа.
function decisionOf(department: string): Decision {
  return { department, question: `q-${department}`, evidence: [] } as unknown as Decision;
}

describe('Jarvis all-departments snapshot — one button, one combined result', () => {
  test('includes MAX reliability in the combined snapshot', async () => {
    const empty = jest.fn(async () => ({ generatedAtMs: 1, decisions: [] }));
    const runMaxvoice = jest.fn(async () => ({ generatedAtMs: 1, decisions: [decisionOf('maxvoice')] }));
    const input = {
      resolveAppTier: async () => 'seed' as const,
      runQuality: empty, runMoney: empty, runGrowth: empty, runContent: empty,
      runPayments: empty, runSafety: empty, runSupport: empty, runFactory: empty,
      runRetention: empty, runMaxvoice, nowMs: 5_000,
    } as unknown as Parameters<typeof buildAllDepartmentsSnapshot>[0];

    const result = await buildAllDepartmentsSnapshot(input);

    expect(runMaxvoice).toHaveBeenCalledTimes(1);
    expect(result.departmentErrors).not.toContain('maxvoice');
    expect(result.decisions.map((decision) => decision.department)).toContain('maxvoice');
  });

  test('resolves the tier once and runs all nine departments together', async () => {
    const resolveAppTier = jest.fn(async () => 'scale' as const);
    const runQuality = jest.fn(async (_tier: string) => ({ generatedAtMs: 1, decisions: [decisionOf('quality')] }));
    const runMoney = jest.fn(async (_tier: string) => ({ generatedAtMs: 1, decisions: [decisionOf('money')] }));
    const runGrowth = jest.fn(async (_tier: string) => ({ generatedAtMs: 1, decisions: [] }));
    const runContent = jest.fn(async (_tier: string) => ({ generatedAtMs: 1, decisions: [decisionOf('content')] }));
    const runPayments = jest.fn(async (_tier: string) => ({ generatedAtMs: 1, decisions: [decisionOf('payments')] }));
    const runSafety = jest.fn(async (_tier: string) => ({ generatedAtMs: 1, decisions: [decisionOf('safety')] }));
    const runSupport = jest.fn(async (_tier: string) => ({ generatedAtMs: 1, decisions: [decisionOf('support')] }));
    const runFactory = jest.fn(async (_tier: string) => ({ generatedAtMs: 1, decisions: [decisionOf('factory')] }));
    const runRetention = jest.fn(async (_tier: string) => ({ generatedAtMs: 1, decisions: [decisionOf('retention')] }));
    const runMaxvoice = jest.fn(async (_tier: string) => ({ generatedAtMs: 1, decisions: [decisionOf('maxvoice')] }));

    const result = await buildAllDepartmentsSnapshot({ resolveAppTier, runQuality, runMoney, runGrowth, runContent, runPayments, runSafety, runSupport, runFactory, runRetention, runMaxvoice, nowMs: 5_000 });

    expect(resolveAppTier).toHaveBeenCalledTimes(1);
    expect(runQuality).toHaveBeenCalledWith('scale');
    expect(runMoney).toHaveBeenCalledWith('scale');
    expect(runGrowth).toHaveBeenCalledWith('scale');
    expect(runContent).toHaveBeenCalledWith('scale');
    expect(runPayments).toHaveBeenCalledWith('scale');
    expect(runSafety).toHaveBeenCalledWith('scale');
    expect(runSupport).toHaveBeenCalledWith('scale');
    expect(runFactory).toHaveBeenCalledWith('scale');
    expect(runRetention).toHaveBeenCalledWith('scale');
    expect(runMaxvoice).toHaveBeenCalledWith('scale');
    expect(result.appTier).toBe('scale');
    expect(result.generatedAtMs).toBe(5_000);
    expect(result.decisions.map((d) => d.department)).toEqual(['quality', 'money', 'content', 'payments', 'safety', 'support', 'factory', 'retention', 'maxvoice']);
  });

  test('one department throwing does not abort the others', async () => {
    const resolveAppTier = jest.fn(async () => 'seed' as const);
    const runQuality = jest.fn(async () => { throw new Error('boom'); });
    const runMoney = jest.fn(async () => ({ generatedAtMs: 1, decisions: [decisionOf('money')] }));
    const runGrowth = jest.fn(async () => ({ generatedAtMs: 1, decisions: [decisionOf('growth')] }));
    const runContent = jest.fn(async () => ({ generatedAtMs: 1, decisions: [decisionOf('content')] }));
    const runPayments = jest.fn(async () => ({ generatedAtMs: 1, decisions: [decisionOf('payments')] }));
    const runSafety = jest.fn(async () => ({ generatedAtMs: 1, decisions: [decisionOf('safety')] }));
    const runSupport = jest.fn(async () => ({ generatedAtMs: 1, decisions: [decisionOf('support')] }));
    const runFactory = jest.fn(async () => ({ generatedAtMs: 1, decisions: [decisionOf('factory')] }));
    const runRetention = jest.fn(async () => ({ generatedAtMs: 1, decisions: [decisionOf('retention')] }));
    const runMaxvoice = jest.fn(async () => ({ generatedAtMs: 1, decisions: [decisionOf('maxvoice')] }));

    const result = await buildAllDepartmentsSnapshot({ resolveAppTier, runQuality, runMoney, runGrowth, runContent, runPayments, runSafety, runSupport, runFactory, runRetention, runMaxvoice, nowMs: 5_000 });

    expect(result.decisions.map((d) => d.department)).toEqual(['money', 'growth', 'content', 'payments', 'safety', 'support', 'factory', 'retention', 'maxvoice']);
    expect(result.departmentErrors).toEqual(['quality']);
  });

  test('a failing content department is reported like any other, not swallowed', async () => {
    const resolveAppTier = jest.fn(async () => 'seed' as const);
    const ok = jest.fn(async () => ({ generatedAtMs: 1, decisions: [] }));
    const runContent = jest.fn(async () => { throw new Error('lesson_stats down'); });
    const result = await buildAllDepartmentsSnapshot({
      resolveAppTier, runQuality: ok, runMoney: ok, runGrowth: ok, runContent, runPayments: ok, runSafety: ok, runSupport: ok, runFactory: ok, runRetention: ok, runMaxvoice: ok, nowMs: 5_000,
    });
    expect(result.departmentErrors).toEqual(['content']);
  });

  test('a failing payments department is reported too — lost money must never be hidden', async () => {
    const resolveAppTier = jest.fn(async () => 'seed' as const);
    const ok = jest.fn(async () => ({ generatedAtMs: 1, decisions: [] }));
    const runPayments = jest.fn(async () => { throw new Error('dead letter unreachable'); });
    const result = await buildAllDepartmentsSnapshot({
      resolveAppTier, runQuality: ok, runMoney: ok, runGrowth: ok, runContent: ok, runPayments, runSafety: ok, runSupport: ok, runFactory: ok, runRetention: ok, runMaxvoice: ok, nowMs: 5_000,
    });
    expect(result.departmentErrors).toEqual(['payments']);
  });

  test('a failing safety department is reported too — silence must never read as safe', async () => {
    const resolveAppTier = jest.fn(async () => 'seed' as const);
    const ok = jest.fn(async () => ({ generatedAtMs: 1, decisions: [] }));
    const runSafety = jest.fn(async () => { throw new Error('safety_flags unreachable'); });
    const result = await buildAllDepartmentsSnapshot({
      resolveAppTier, runQuality: ok, runMoney: ok, runGrowth: ok, runContent: ok, runPayments: ok, runSafety, runSupport: ok, runFactory: ok, runRetention: ok, runMaxvoice: ok, nowMs: 5_000,
    });
    expect(result.departmentErrors).toEqual(['safety']);
  });

  test('a failing support department is reported too — a waiting person must not vanish', async () => {
    const resolveAppTier = jest.fn(async () => 'seed' as const);
    const ok = jest.fn(async () => ({ generatedAtMs: 1, decisions: [] }));
    const runSupport = jest.fn(async () => { throw new Error('support_inbox unreachable'); });
    const result = await buildAllDepartmentsSnapshot({
      resolveAppTier, runQuality: ok, runMoney: ok, runGrowth: ok, runContent: ok, runPayments: ok, runSafety: ok, runSupport, runFactory: ok, runRetention: ok, runMaxvoice: ok, nowMs: 5_000,
    });
    expect(result.departmentErrors).toEqual(['support']);
  });

  test('an insufficient payments decision survives the combined all-departments snapshot', async () => {
    const resolveAppTier = jest.fn(async () => 'seed' as const);
    const empty = jest.fn(async () => ({ generatedAtMs: 1, decisions: [] }));
    const runPayments = jest.fn(async () => buildPaymentsSnapshot({
      fetchers: {
        telegram_premium_dead_letter: async () => ({
          sourceId: 'telegram_premium_dead_letter', state: 'error', truncated: false,
          droppedCount: 0, rows: [], observedAtMs: 5_000,
        }),
        revenuecat_premium_denials: async () => ({
          sourceId: 'revenuecat_premium_denials', state: 'empty', truncated: false,
          droppedCount: 0, rows: [], observedAtMs: 5_000,
        }),
      },
      trigger: 'scheduled',
      nowMs: 5_000,
    }));

    const result = await buildAllDepartmentsSnapshot({
      resolveAppTier, runQuality: empty, runMoney: empty, runGrowth: empty, runContent: empty,
      runPayments, runSafety: empty, runSupport: empty, runFactory: empty, runRetention: empty, runMaxvoice: empty,
      nowMs: 5_000,
    });

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0]).toMatchObject({ department: 'payments', status: 'insufficient_evidence' });
    expect(result.departmentErrors).toEqual([]);
  });

  test('all departments empty yields an empty decisions array, not an error', async () => {
    const resolveAppTier = jest.fn(async () => 'growth' as const);
    const empty = jest.fn(async () => ({ generatedAtMs: 1, decisions: [] }));
    const result = await buildAllDepartmentsSnapshot({
      resolveAppTier, runQuality: empty, runMoney: empty, runGrowth: empty, runContent: empty, runPayments: empty, runSafety: empty, runSupport: empty, runFactory: empty, runRetention: empty, runMaxvoice: empty, nowMs: 5_000,
    });
    expect(result.decisions).toEqual([]);
    expect(result.departmentErrors).toEqual([]);
  });
});
