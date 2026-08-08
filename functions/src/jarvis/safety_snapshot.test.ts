import { buildSafetySnapshot } from './safety_snapshot';
import type { FetchSafetySourceResult } from './safety_firestore_fetcher';

const NOW = 1_800_000_000_000;

describe('Jarvis safety snapshot evidence propagation', () => {
  test('preserves age-unverified evidence and insufficient status through the snapshot seam', async () => {
    const fetch = {
      state: 'ready',
      openFlags: 1,
      openMinorFlags: null,
      openAgeUnverifiedFlags: 1,
      openAgeUnavailableFlags: 0,
      ageEvidence: 'age_unverified',
      recentFlags: 1,
      observedAtMs: NOW,
    } as FetchSafetySourceResult;

    const snapshot = await buildSafetySnapshot({
      fetchSafety: async () => fetch,
      trigger: 'scheduled',
      nowMs: NOW,
    });

    expect(snapshot.decisions).toHaveLength(1);
    expect(snapshot.decisions[0]).toMatchObject({
      status: 'insufficient_evidence',
      actionability: 'confirmed_action',
      severityHint: 'P0',
    });
  });
});
