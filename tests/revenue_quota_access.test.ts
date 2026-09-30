import { createMonthlyTrainingSessionAccess, MONTHLY_TRAINING_SESSION_LIMIT } from '../app/monthly_training_sessions';
import type { AccountGenerationToken } from '../app/account_generation';

const token = Object.freeze({ generation: 4, stableId: 'account-a', phase: 'active' }) as AccountGenerationToken;

describe('monthly flashcard training quota access', () => {
  test('is a local free monthly allowance shared by speaking and card modes', async () => {
    const values = new Map<string, string>();
    const access = createMonthlyTrainingSessionAccess({
      now: () => Date.parse('2026-03-29T12:00:00.000Z'),
      timeZone: () => 'UTC',
      isCurrentAccount: () => true,
      storage: {
        getItem: async (key: string) => values.get(key) ?? null,
        setItem: async (key: string, value: string) => { values.set(key, value); },
      },
    });

    for (let index = 0; index < MONTHLY_TRAINING_SESSION_LIMIT; index += 1) {
      await expect(access.consume({
        token,
        receiptId: `session-${index}`,
        mode: index % 2 === 0 ? 'swipe' : 'speaking',
      })).resolves.toMatchObject({ status: 'allowed', used: index + 1, limit: 30 });
    }

    await expect(access.preview({ token })).resolves.toMatchObject({
      status: 'exhausted',
      used: 30,
      limit: 30,
      period: '2026-03',
    });
  });
});
