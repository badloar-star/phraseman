import { auditPhrasePosCoverage, buildPosCoverageAuditFailure } from '../app/phrase_analytics';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));

describe('pre-release POS content audit', () => {
  it('resolves every lesson token to a stable user-facing POS category', () => {
    const audit = auditPhrasePosCoverage();
    expect(audit.totalTokens).toBeGreaterThan(0);

    if (!audit.releaseReady) {
      throw new Error(buildPosCoverageAuditFailure(audit));
    }

    expect(audit.resolvedPct).toBe(100);
    expect(audit.unresolvedTokens).toBe(0);
    expect(audit.unknownSourceTokens).toBe(0);
    expect(audit.lowConfidenceTokens).toBe(0);
  });
});
