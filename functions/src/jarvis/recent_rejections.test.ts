import { filterOutRecentlyRejected, rejectionTopicKey, REJECTION_MEMORY_MS } from './recent_rejections';
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

  test('a rejection survives the counter moving inside the same finding', () => {
    // зачем: владелец 2026-08-15 — «пишет одно и то же» и «не учится».
    // Причина класса: ключ отказа, посчитанный от текста с живым числом,
    // назавтра меняется вместе со счётчиком — и вчерашнее «нет» забывается.
    // Ключ обязан адресовать ВОПРОС, а не сегодняшнее значение счётчика.
    const yesterday = decision({ finding: '125 писем без ответа' } as Partial<Decision>);
    const today = decision({ finding: '126 писем без ответа' } as Partial<Decision>);

    const kept = filterOutRecentlyRejected({
      decisions: [today],
      hashOf: rejectionTopicKey,
      rejectedHashes: new Map([[rejectionTopicKey(yesterday), NOW - 60_000]]),
      nowMs: NOW,
    });

    expect(kept).toHaveLength(0);
  });

  test('a different question is still delivered, numbers notwithstanding', () => {
    // зачем: устойчивость к числам не должна превращаться в глухоту —
    // другая проблема того же департамента обязана дойти.
    const rejected = decision({ finding: '125 писем без ответа' } as Partial<Decision>);
    const other = decision({
      finding: '3 платежа зависли',
      recommendation: 'Проверить вебхук',
    } as Partial<Decision>);

    const kept = filterOutRecentlyRejected({
      decisions: [other],
      hashOf: rejectionTopicKey,
      rejectedHashes: new Map([[rejectionTopicKey(rejected), NOW - 60_000]]),
      nowMs: NOW,
    });

    expect(kept).toHaveLength(1);
  });
});
