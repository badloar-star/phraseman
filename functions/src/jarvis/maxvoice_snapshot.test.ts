import { buildMaxvoiceSnapshot } from './maxvoice_snapshot';

const NOW = Date.UTC(2026, 7, 21, 12);

describe('Jarvis MAX snapshot — one fail-closed adapter', () => {
  test('runs the deterministic department with fetched aggregates', async () => {
    const fetchMaxvoice = jest.fn(async () => ({
      state: 'ready' as const, sampledDays: 7, mintRejections: 2, callsStarted: 20, callsConnected: 17,
      callsCompleted: 20, reviewsReady: 20, reconnectAttempts: 10,
      reconnectRecovered: 10, firstAudioGte8s: 0, observedAtMs: NOW,
    }));
    const result = await buildMaxvoiceSnapshot({ fetchMaxvoice, trigger: 'scheduled', nowMs: NOW });
    expect(fetchMaxvoice).toHaveBeenCalledTimes(1);
    expect(result.decisions[0]).toMatchObject({ department: 'maxvoice', severityHint: 'P1' });
  });

  test('a thrown fetcher becomes insufficient evidence instead of fake health', async () => {
    const result = await buildMaxvoiceSnapshot({
      fetchMaxvoice: async () => { throw new Error('down'); },
      trigger: 'owner_request',
      nowMs: NOW,
    });
    expect(result.decisions[0]).toMatchObject({ department: 'maxvoice', status: 'insufficient_evidence' });
  });
});
