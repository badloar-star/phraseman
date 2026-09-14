jest.mock('../max_section_seal', () => ({
  MAX_SECTION_SEALED_BY_OWNER_2026_09_04: false,
}));

import { buildMaxvoiceSnapshot } from './maxvoice_snapshot';

const NOW = Date.UTC(2026, 7, 21, 12);

describe('Jarvis MAX snapshot — behavior after an explicit future owner unseal', () => {
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
