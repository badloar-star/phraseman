import { SUPPORTED_CONTENT_FACTORY_STUDY_TARGETS } from '../admin_content_factory';
import { runR7FakeProviderMatrix } from './r7_fake_provider_harness';

describe('R7 fake-provider smoke matrix', () => {
  it('passes all required deterministic scenarios without external providers', async () => {
    const report = await runR7FakeProviderMatrix({ supportedTargets: SUPPORTED_CONTENT_FACTORY_STUDY_TARGETS });
    expect(report.scenarios.map((item) => item.id)).toEqual(['R7-SINGLE-01', 'R7-RANGE', 'R7-PARTIAL', 'R7-RATE', 'R7-SCHEMA', 'R7-PAUSE', 'R7-CANCEL', 'R7-REPLAY', 'R7-LEASE', 'R7-ROLLBACK']);
    expect(report.scenarios.every((item) => item.status === 'passed')).toBe(true);
    expect(report.lessonBoundaries).toEqual([1, 8, 9, 16, 17, 24, 25, 32]);
    expect(report.supportedTargets).toEqual(['en', 'fr']);
    expect(report.crossLanguageLeakage).toBe(false);
    expect(report.contentHashes).toHaveLength(2);
    expect(report.contentHashes.every((hash) => /^[a-f0-9]{64}$/.test(hash))).toBe(true);
    expect(new Set(report.contentHashes).size).toBe(2);
    const evidence = Object.fromEntries(report.scenarios.map((item) => [item.id, item.evidence]));
    expect(evidence['R7-PARTIAL']).toMatchObject({ executedUnits: 3, persistedSuccesses: 2, partialStateProved: true });
    expect(evidence['R7-RATE']).toMatchObject({ classification: 'provider_rate_limit', attempts: 3, retryCap: 3, backoffMs: [100, 200], boundedRetryProved: true });
    expect(evidence['R7-SCHEMA']).toMatchObject({ attempts: 2, repairedToValid: true, maxRepairs: 2 });
    expect(evidence['R7-PAUSE']).toMatchObject({ paused: 'paused', resumed: 'queued', providerCalls: 1, noDuplicateProviderWork: true });
    expect(evidence['R7-CANCEL']).toMatchObject({ lateProviderResultProduced: true, lateCommitAccepted: false, discardedLateResult: true });
    expect(evidence['R7-LEASE']).toMatchObject({ expiredLeaseRecovered: true, oldCanCommit: false, newCanCommit: true });
    expect(evidence['R7-ROLLBACK']).toMatchObject({ restoredPriorRelease: true, draftsUnchanged: true });
  });
});
