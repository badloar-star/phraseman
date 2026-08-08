import { filterOutRecentlyRejected, REJECTION_MEMORY_MS } from './recent_rejections';
import type { Decision } from './decision';

const NOW = 1_800_000_000_000;

function decision(over: Partial<Decision> = {}): Decision {
  return {
    department: 'payments',
    finding: 'X заплатил, доступа нет',
    recommendation: 'Выдать вручную',
    ...over,
  } as unknown as Decision;
}

describe('Jarvis recent rejections — do not repeat advice just declined', () => {
  test('drops a decision whose exact hash was rejected recently', () => {
    const hash = 'abc123';
    const kept = filterOutRecentlyRejected({
      decisions: [decision()],
      hashOf: () => hash,
      rejectedHashes: new Map([[hash, NOW - 60_000]]),
      nowMs: NOW,
    });
    expect(kept).toHaveLength(0);
  });

  test('keeps a decision whose hash was never rejected', () => {
    const kept = filterOutRecentlyRejected({
      decisions: [decision()],
      hashOf: () => 'unrelated-hash',
      rejectedHashes: new Map([['other-hash', NOW - 60_000]]),
      nowMs: NOW,
    });
    expect(kept).toHaveLength(1);
  });

  test('a rejection old enough stops suppressing the same advice', () => {
    // зачем: "отклонил вчера" не значит "запрещено навсегда" — если проблема
    // никуда не делась, Джарвис обязан напомнить снова.
    const hash = 'abc123';
    const kept = filterOutRecentlyRejected({
      decisions: [decision()],
      hashOf: () => hash,
      rejectedHashes: new Map([[hash, NOW - REJECTION_MEMORY_MS - 1_000]]),
      nowMs: NOW,
    });
    expect(kept).toHaveLength(1);
  });

  test('different decisions with different hashes are judged independently', () => {
    const rejected = decision({ finding: 'A' } as Partial<Decision>);
    const fresh = decision({ finding: 'B' } as Partial<Decision>);
    const kept = filterOutRecentlyRejected({
      decisions: [rejected, fresh],
      hashOf: (d) => d.finding,
      rejectedHashes: new Map([['A', NOW - 1000]]),
      nowMs: NOW,
    });
    expect(kept).toHaveLength(1);
    expect(kept[0].finding).toBe('B');
  });

  test('an empty rejection map keeps everything', () => {
    const kept = filterOutRecentlyRejected({
      decisions: [decision(), decision({ finding: 'other' } as Partial<Decision>)],
      hashOf: (d) => d.finding,
      rejectedHashes: new Map(),
      nowMs: NOW,
    });
    expect(kept).toHaveLength(2);
  });

  test('the memory window is measured in days, not minutes', () => {
    expect(REJECTION_MEMORY_MS).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
  });
});
