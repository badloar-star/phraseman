import {
  loadHistoricalTournamentSignatures,
  type TournamentSemanticHistoryAdapter,
} from './tournament_semantic_history';
import { TOURNAMENT_SEMANTIC_PROMPTS } from './tournament_semantic_review';

const approvalIdentity = {
  reviewContractVersion: TOURNAMENT_SEMANTIC_PROMPTS.contractVersion,
  promptSetSha256: TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256,
  primaryModel: 'gpt-4.1-mini',
  adversarialModel: 'gpt-4.1',
};

describe('loadHistoricalTournamentSignatures', () => {
  it('loads bounded ready-generation pages plus reusable approvals and collapses duplicates', async () => {
    let barrierReads = 0;
    const adapter: TournamentSemanticHistoryAdapter = {
      async readBarrier() { barrierReads += 1; return { state: 'ready', generation: 'v10', revision: 4 }; },
      async readTaskSignaturePage(input) {
        return input.cursor === null
          ? { signatures: ['a'.repeat(64), 'b'.repeat(64), 'bad'], nextCursor: 'page-2' }
          : { signatures: ['b'.repeat(64), 'c'.repeat(64)], nextCursor: null };
      },
      async readApprovalSignaturePage() {
        return { signatures: ['c'.repeat(64), 'd'.repeat(64)], nextCursor: null };
      },
    };
    const result = await loadHistoricalTournamentSignatures(adapter, {
      state: 'ready', generation: 'v10', revision: 4,
    }, approvalIdentity);
    expect([...result.signatures].sort()).toEqual(['a', 'b', 'c', 'd'].map((x) => x.repeat(64)));
    expect(result.malformed).toBe(1);
    expect(barrierReads).toBe(1);
  });

  it('fails closed when the ready generation drifts during pagination', async () => {
    const adapter: TournamentSemanticHistoryAdapter = {
      async readBarrier() { return { state: 'ready', generation: 'v11-other', revision: 5 }; },
      async readTaskSignaturePage() { return { signatures: [], nextCursor: null }; },
      async readApprovalSignaturePage() { return { signatures: [], nextCursor: null }; },
    };
    await expect(loadHistoricalTournamentSignatures(adapter, {
      state: 'ready', generation: 'v10', revision: 4,
    }, approvalIdentity)).rejects.toThrow('semantic_history_generation_drift');
  });

  it('rejects an oversized adapter page instead of loading it into memory', async () => {
    const adapter: TournamentSemanticHistoryAdapter = {
      async readBarrier() { return { state: 'ready', generation: 'v10', revision: 4 }; },
      async readTaskSignaturePage() { return { signatures: Array(501).fill('a'.repeat(64)), nextCursor: null }; },
      async readApprovalSignaturePage() { return { signatures: [], nextCursor: null }; },
    };
    await expect(loadHistoricalTournamentSignatures(adapter, {
      state: 'ready', generation: 'v10', revision: 4,
    }, approvalIdentity)).rejects.toThrow('semantic_history_page_invalid');
  });
});
