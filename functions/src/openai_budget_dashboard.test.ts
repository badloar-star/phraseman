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

describe('openAiBudgetDashboard card TTS rows (D128)', () => {
  it('counts card_tts_billing by stored estimate, not chat token prices', () => {
    const row = usageFromDoc('card_tts_billing', 'Озвучка карточек (TTS)', voiceSnap({
      operation: 'card_tts', model: 'gpt-4o-mini-tts', characters: 2000, estCostUsd: 0.03, createdAtMs: 1,
    }));
    expect(row.costUsd).toBe(0.03);
    expect(row.inputTokens).toBe(2000);
    expect(row.uid).toBe('');
  });
});

describe('budget missing-price truth', () => {
  it('does not price an unknown model as nano', () => {
    expect(usageFromDoc('premium_dialog_billing','chat',voiceSnap({model:'unknown-model',promptTokens:1000000})).costUsd).toBeNull();
  });
  it('does not show unpriced admin speech as free', () => {
    expect(usageFromDoc('ai_operation_billing','admin',voiceSnap({model:'tts-1',inputChars:1000})).costUsd).toBeNull();
  });
  it('requires an actual stored speech estimate', () => {
    expect(usageFromDoc('card_tts_billing','tts',voiceSnap({model:'tts',characters:1000})).costUsd).toBeNull();
  });
  it('preserves a recorded estimate including a genuine zero', () => {
    expect(usageFromDoc('ai_operation_billing','admin',voiceSnap({model:'unknown',estCostUsd:0,promptTokens:1})).costUsd).toBe(0);
  });
});

import { aggregate, openAiBudgetSafeGetDocs } from './openai_budget_dashboard';
import * as admin from 'firebase-admin';
describe('budget period and retrieval contract',()=>{
  it('adapts the legacy received timestamp',()=>{
    expect(usageFromDoc('weekly_review_billing','weekly',voiceSnap({receivedAtMs:12345})).createdAtMs).toBe(12345);
  });
  it('paginates and queries the real legacy date field',async()=>{
    const docs=Array.from({length:501},(_,i)=>voiceSnap({model:'gpt-4.1-mini',createdAtMs:i+1}));
    const q:any={where:jest.fn(),orderBy:jest.fn(),limit:jest.fn(),startAfter:jest.fn(),count:jest.fn(()=>({get:async()=>({data:()=>({count:501})})})),get:jest.fn().mockResolvedValueOnce({docs:docs.slice(0,500),size:500,empty:false}).mockResolvedValueOnce({docs:docs.slice(500),size:1,empty:false})};
    for(const method of ['where','orderBy','limit','startAfter'])q[method].mockReturnValue(q);
    (admin.firestore as unknown as jest.Mock).mockReturnValue({collection:()=>q});
    const result=await openAiBudgetSafeGetDocs('weekly_review_billing',1,1000);
    expect(q.where).toHaveBeenCalledWith('receivedAtMs','>=',1);
    expect(q.where).toHaveBeenCalledWith('receivedAtMs','<=',1000);
    expect(q.startAfter).toHaveBeenCalledTimes(1);
    expect(result.docs).toHaveLength(501);
    expect(result.truncated).toBe(false);
  });
  it('series and total cover the same UTC dates and expose unknown costs',()=>{
    const now=Date.parse('2026-10-24T12:00:00Z');
    const row=usageFromDoc('premium_dialog_billing','chat',voiceSnap({model:'unknown',createdAtMs:now}));
    const result=aggregate([row],1,now);
    expect(result.series.map(x=>x.date)).toEqual(['2026-10-24']);
    expect(result.totals.unpricedCalls).toBe(1);
    expect(result.series.reduce((sum,x)=>sum+x.calls,0)).toBe(result.totals.calls);
  });
});
