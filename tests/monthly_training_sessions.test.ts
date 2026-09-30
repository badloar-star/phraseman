import { createMonthlyTrainingSessionAccess, MONTHLY_TRAINING_SESSION_LIMIT } from '../app/monthly_training_sessions';
import type { AccountGenerationToken } from '../app/account_generation';

const token = Object.freeze({ generation: 1, stableId: 'account-a', phase: 'active' }) as AccountGenerationToken;

function harness(nowMs = Date.parse('2026-03-31T22:00:00.000Z')) {
  const values = new Map<string, string>();
  let now = nowMs;
  const access = createMonthlyTrainingSessionAccess({
    now: () => now,
    timeZone: () => 'UTC',
    isCurrentAccount: () => true,
    storage: {
      getItem: async (key: string) => values.get(key) ?? null,
      setItem: async (key: string, value: string) => { values.set(key, value); },
    },
  });
  return { access, setNow: (value: number) => { now = value; } };
}

describe('monthly card training sessions', () => {
  test('shares thirty free starts across card training and speaking with idempotent session starts', async () => {
    const h = harness();
    const modes = ['swipe', 'blitz', 'recall', 'speaking'] as const;
    for (let index = 0; index < MONTHLY_TRAINING_SESSION_LIMIT; index += 1) {
      await expect(h.access.consume({ token, receiptId: `start-${index}`, mode: modes[index % modes.length] }))
        .resolves.toMatchObject({ status: 'allowed', used: index + 1, limit: 30 });
    }
    await expect(h.access.consume({ token, receiptId: 'start-4', mode: 'speaking' }))
      .resolves.toMatchObject({ status: 'allowed', used: 30, bypass: 'idempotent' });
    await expect(h.access.consume({ token, receiptId: 'start-31', mode: 'speaking' }))
      .resolves.toMatchObject({ status: 'exhausted', used: 30, limit: 30 });
  });

  test('resets at the next local calendar month without premium or server state', async () => {
    const h = harness();
    await h.access.consume({ token, receiptId: 'march', mode: 'speaking' });
    h.setNow(Date.parse('2026-04-01T00:00:00.000Z'));
    await expect(h.access.preview({ token })).resolves.toMatchObject({
      status: 'allowed', used: 0, limit: 30, period: '2026-04',
    });
  });
});
