import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';

import {
  MAX_VOICE_FINALIZE_OUTBOX_TTL_MS,
  clearMaxFinalizeOutbox,
  listPendingMaxFinalize,
  putMaxFinalizeEnvelope,
} from '../app/max_voice_finalize_outbox';
import type { MaxVoiceFinalizeDraftV1 } from '../app/max_voice_finalize_types';

const root = process.cwd();

function draft(
  overrides: Partial<MaxVoiceFinalizeDraftV1> = {},
): MaxVoiceFinalizeDraftV1 {
  return {
    version: 1,
    sessionId: 'session-1',
    request: {
      history: [
        { role: 'assistant', text: 'Hi! What would you like to practise?' },
        { role: 'user', text: 'I want to practise introductions.' },
      ],
      durationSec: 42,
      speechSec: 15,
      format: 'tutor',
      scenarioId: 'coffee',
      cefr: 'A1',
      interfaceLang: 'ru',
      endReason: 'completed',
      goalId: 'introductions',
      phraseResults: [{ text: 'Nice to meet you', result: 'pass' }],
      tutorEvidence: {
        nextTopic: 'Ordering coffee',
        homeworkItems: [{ text: 'Nice to meet you', meaning: 'Приятно познакомиться' }],
        languagePreference: 'Use Russian only for short explanations',
        safetyFlags: [],
      },
    },
    ...overrides,
  };
}

describe('MAX finalization outbox', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('writes an account-scoped envelope before review navigation', async () => {
    await putMaxFinalizeEnvelope('account-A', draft({ sessionId: 's1' }), 1_000);

    expect(await listPendingMaxFinalize('account-A', 1_001)).toEqual([
      expect.objectContaining({
        accountKey: 'account-A',
        sessionId: 's1',
        createdAtMs: 1_000,
        expiresAtMs: 1_000 + MAX_VOICE_FINALIZE_OUTBOX_TTL_MS,
        attempts: 0,
        nextAttemptAtMs: 1_000,
      }),
    ]);
  });

  it('does not leak envelopes between accounts and expires them after 24 hours', async () => {
    await putMaxFinalizeEnvelope('account-A', draft({ sessionId: 's1' }), 1_000);

    expect(await listPendingMaxFinalize('account-B', 1_001)).toEqual([]);
    expect(await listPendingMaxFinalize(
      'account-A',
      1_000 + MAX_VOICE_FINALIZE_OUTBOX_TTL_MS + 1,
    )).toEqual([]);
  });

  it('purges pending transcripts on account exit', async () => {
    await putMaxFinalizeEnvelope('account-A', draft({ sessionId: 's1' }), 1_000);
    await clearMaxFinalizeOutbox('account-A');

    expect(await listPendingMaxFinalize('account-A', 1_001)).toEqual([]);
  });

  it('replaces the same session idempotently without duplicating it', async () => {
    await putMaxFinalizeEnvelope('account-A', draft({ sessionId: 's1' }), 1_000);
    await putMaxFinalizeEnvelope('account-A', draft({ sessionId: 's1' }), 2_000);

    const pending = await listPendingMaxFinalize('account-A', 2_001);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toEqual(expect.objectContaining({ sessionId: 's1', createdAtMs: 2_000 }));
  });

  it('rejects unbounded or oversized transcript content instead of silently truncating it', async () => {
    await expect(putMaxFinalizeEnvelope('account-A', draft({
      request: { ...draft().request, history: Array.from({ length: 81 }, () => ({ role: 'user' as const, text: 'hello' })) },
    }), 1_000)).rejects.toThrow('max_finalize_history_too_large');

    await expect(putMaxFinalizeEnvelope('account-A', draft({
      request: { ...draft().request, history: [{ role: 'user', text: 'x'.repeat(1_001) }] },
    }), 1_000)).rejects.toThrow('max_finalize_turn_too_large');

    await expect(putMaxFinalizeEnvelope('account-A', draft({
      request: {
        ...draft().request,
        tutorEvidence: {
          ...draft().request.tutorEvidence,
          homeworkItems: Array.from({ length: 7 }, (_, index) => ({ text: `item-${index}`, meaning: 'meaning' })),
        },
      },
    }), 1_000)).rejects.toThrow('max_finalize_homework_too_large');

    await expect(putMaxFinalizeEnvelope('account-A', draft({
      request: {
        ...draft().request,
        history: Array.from({ length: 80 }, () => ({ role: 'user' as const, text: '🙂'.repeat(1_000) })),
      },
    }), 1_000)).rejects.toThrow('max_finalize_payload_too_large');
  });

  it('accepts lesson-outcome fields and rejects malformed ones', async () => {
    // зачем: аудит 2026-08-22 — goalProgress/sceneOutcome поехали в finalize,
    // сервер по ним двигает goalMastery и заполняет receipt.goal.
    await putMaxFinalizeEnvelope('account-A', draft({
      sessionId: 's-goal',
      request: {
        ...draft().request,
        sceneOutcome: 'done',
        goalProgress: { goalId: 'a1_greet', mastery: 3, evidence: 'scene', sceneId: 'a1_one' },
      },
    }), 1_000);
    expect(await listPendingMaxFinalize('account-A', 1_001)).toEqual([
      expect.objectContaining({ sessionId: 's-goal' }),
    ]);

    await expect(putMaxFinalizeEnvelope('account-A', draft({
      request: { ...draft().request, sceneOutcome: 'victory' as never },
    }), 1_000)).rejects.toThrow('max_finalize_scene_outcome_invalid');

    await expect(putMaxFinalizeEnvelope('account-A', draft({
      request: { ...draft().request, goalProgress: { goalId: 'a1_greet', mastery: 7 } },
    }), 1_000)).rejects.toThrow('max_finalize_goal_progress_invalid');

    await expect(putMaxFinalizeEnvelope('account-A', draft({
      request: { ...draft().request, goalProgress: { goalId: 'a1_greet', mastery: 2, evidence: 'guess' as never } },
    }), 1_000)).rejects.toThrow('max_finalize_goal_progress_invalid');
  });

  it('persists before review navigation and explicitly clears the prior owner on identity exit', () => {
    const session = fs.readFileSync(path.join(root, 'app', 'max_call_session.tsx'), 'utf8');
    const auth = fs.readFileSync(path.join(root, 'app', 'auth_provider.ts'), 'utf8');
    const putIndex = session.indexOf('await putMaxFinalizeEnvelope(');
    const reviewIndex = session.indexOf("pathname: '/max_voice_review'");

    expect(putIndex).toBeGreaterThan(-1);
    expect(reviewIndex).toBeGreaterThan(putIndex);
    expect(auth).toContain('clearMaxFinalizeOutbox(switchOwnerStableId)');
    expect(auth).toContain('clearMaxFinalizeOutbox(pendingDeleteStableId)');
    expect(auth).toContain('clearMaxVoiceReviewReceipts(switchOwnerStableId)');
    expect(auth).toContain('clearMaxVoiceReviewReceipts(pendingDeleteStableId)');
  });
});
