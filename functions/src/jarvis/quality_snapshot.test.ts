import { buildQualitySnapshot } from './quality_snapshot';
import type { Evidence } from './decision';
import type { FetchQualitySourceResult } from './quality_firestore_fetcher';

function fetchResult(overrides: Partial<FetchQualitySourceResult> = {}): FetchQualitySourceResult {
  return {
    sourceId: 'error_reports',
    state: 'ready',
    truncated: false,
    droppedCount: 0,
    rows: [],
    observedAtMs: 10_000,
    ...overrides,
  };
}

/**
 * buildQualitySnapshot — единственная точка, которую вызывает и суточный
 * планировщик, и панель по ручному запросу владельца. Оба берут один и тот
 * же снапшот, поэтому Telegram и админка не могут разойтись в показаниях.
 */
describe('Jarvis quality snapshot — the one seam scheduler and panel share', () => {
  test('fetches all three collections and hands them to the department unchanged', async () => {
    const fetchers = {
      error_reports: jest.fn(async () => fetchResult({ sourceId: 'error_reports' })),
      user_reports: jest.fn(async () => fetchResult({ sourceId: 'user_reports', state: 'empty' })),
      app_errors: jest.fn(async () => fetchResult({ sourceId: 'app_errors', state: 'empty' })),
    };
    const snapshot = await buildQualitySnapshot({ fetchers, trigger: 'scheduled', nowMs: 20_000 });
    expect(fetchers.error_reports).toHaveBeenCalledTimes(1);
    expect(fetchers.user_reports).toHaveBeenCalledTimes(1);
    expect(fetchers.app_errors).toHaveBeenCalledTimes(1);
    expect(snapshot.generatedAtMs).toBe(20_000);
    expect(snapshot.decisions).toEqual([]);
  });

  test('one collection throwing degrades to error evidence without aborting the snapshot', async () => {
    // зачем: один упавший источник среди честно пустых остальных — это не
    // сигнал для решения (нет спайка), но и не тишина о самой ошибке.
    // Проверяем именно это: снапшот строится, отказ виден в evidence.
    const fetchers = {
      error_reports: jest.fn(async () => { throw new Error('firestore unavailable'); }),
      user_reports: jest.fn(async () => fetchResult({ sourceId: 'user_reports', state: 'empty' })),
      app_errors: jest.fn(async () => fetchResult({ sourceId: 'app_errors', state: 'empty' })),
    };
    const snapshot = await buildQualitySnapshot({ fetchers, trigger: 'owner_request', question: 'Что с крашами?', nowMs: 20_000 });
    expect(snapshot.decisions).toHaveLength(1);
    expect(snapshot.decisions[0].evidence.find((e: Evidence) => e.sourceId === 'error_reports')?.state).toBe('error');
  });

  test('all three collections throwing yields an insufficient_evidence decision even on schedule', async () => {
    const fetchers = {
      error_reports: jest.fn(async () => { throw new Error('down'); }),
      user_reports: jest.fn(async () => { throw new Error('down'); }),
      app_errors: jest.fn(async () => { throw new Error('down'); }),
    };
    const snapshot = await buildQualitySnapshot({ fetchers, trigger: 'scheduled', nowMs: 20_000 });
    expect(snapshot.decisions).toHaveLength(1);
    expect(snapshot.decisions[0].status).toBe('insufficient_evidence');
  });

  test('owner_request is forwarded with the given question', async () => {
    const fetchers = {
      error_reports: jest.fn(async () => fetchResult()),
      user_reports: jest.fn(async () => fetchResult({ sourceId: 'user_reports', state: 'empty' })),
      app_errors: jest.fn(async () => fetchResult({ sourceId: 'app_errors', state: 'empty' })),
    };
    const snapshot = await buildQualitySnapshot({
      fetchers,
      trigger: 'owner_request',
      question: 'Что с крашами?',
      nowMs: 20_000,
    });
    expect(snapshot.decisions[0].question).toBe('Что с крашами?');
  });
});
