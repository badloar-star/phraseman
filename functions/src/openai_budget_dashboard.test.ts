jest.mock('firebase-admin', () => ({ firestore: jest.fn() }));
jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: class HttpsError extends Error {},
  onCall: (_options: unknown, handler: unknown) => handler,
}));
jest.mock('./callable_options', () => ({ ENFORCE_APP_CHECK: false }));

import { usageFromDoc } from './openai_budget_dashboard';

function voiceSnap(data: Record<string, unknown>) {
  return { id: 'voice-1', data: () => data } as FirebaseFirestore.QueryDocumentSnapshot;
}

describe('openAiBudgetDashboard MAX voice rows', () => {
  it('uses the stored all-in estimate and split token directions', () => {
    const row = usageFromDoc('voice_call_billing', 'MAX voice', voiceSnap({
      model: 'gpt-realtime-2.1-mini',
      audioInputTokens: 100,
      audioOutputTokens: 200,
      cachedTokens: 20,
      textInputTokens: 30,
      textOutputTokens: 40,
      textTokens: 70,
      estCostUsd: 0.1234,
      priceTableDate: '2026-08-21',
      createdAtMs: 123,
      uid: 'stable-1',
    }));

    expect(row).toMatchObject({
      inputTokens: 150,
      outputTokens: 240,
      totalTokens: 390,
      costUsd: 0.1234,
    });
  });

  it('corrects only the legacy unsplit text-price delta on top of stored all-in cost', () => {
    const row = usageFromDoc('voice_call_billing', 'MAX voice', voiceSnap({
      audioInputTokens: 10,
      audioOutputTokens: 20,
      cachedTokens: 5,
      textTokens: 1_000_000,
      estCostUsd: 0.02,
      priceTableDate: '2026-08-13',
      createdAtMs: 123,
    }));

    expect(row).toMatchObject({
      inputTokens: 15,
      outputTokens: 1_000_020,
      totalTokens: 1_000_035,
    });
    // Stored legacy cost already includes $0.60/M. Add only $2.40 - $0.60.
    expect(row.costUsd).toBeCloseTo(1.82, 10);
  });

  it('does not alter current split-price rows even when compatible total has a remainder', () => {
    const row = usageFromDoc('voice_call_billing', 'MAX voice', voiceSnap({
      textInputTokens: 30,
      textOutputTokens: 40,
      textTokens: 100,
      estCostUsd: 0.5,
      priceTableDate: '2026-08-21',
      createdAtMs: 123,
    }));

    expect(row.costUsd).toBe(0.5);
  });
});
