import { createHmac } from 'node:crypto';

import type { DialogueV2LanguagePack } from '../../shared/dialogue_v2_language_pack_contract';
import {
  DialogueV2SessionCompletionError,
  executeDialogueV2SessionCompletion,
} from './dialogue_v2_session_completion_core';

const AUTH_UID = 'auth-a';
const STABLE_ID = 'stable-a';
const SECRET = 'session-secret-with-at-least-thirty-two-bytes';
const NOW = 2_000_000;

function ownerBinding(): string {
  const hmac = createHmac('sha256', SECRET);
  hmac.update('dialogue-v2-owner.v1');
  hmac.update('\u0000');
  hmac.update(AUTH_UID);
  hmac.update('\u0000');
  hmac.update(STABLE_ID);
  return hmac.digest('hex');
}

const packet = {
  studyTarget: 'en',
  packVersion: 'dialogues_v2_2026_09_26',
  packSha256: 'a'.repeat(64),
  catalogueSha256: 'b'.repeat(64),
  reviewReceiptSha256: 'c'.repeat(64),
  scenario: {
    id: 'social_01',
    cefr: 'A1',
    personas: [{
      id: 'mia', displayName: 'Mia', replyStyle: 'warm', voiceMode: 'text_only', styleNote: 'Warm and concise.',
      mood: 'open', correctionStyle: 'gentle',
    }],
    objectives: Array.from({ length: 6 }, (_, index) => ({
      id: `objective_0${index + 1}`,
      label: `Step ${index + 1}`,
    })),
    groupReplyPolicy: { minReplies: 1, maxReplies: 1 },
  },
} as unknown as DialogueV2LanguagePack;

function storedSession(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    sessionId: 'd2s_abcdefghijklmnopqrstuvwxyz123456',
    ownerBinding: ownerBinding(),
    studyTarget: 'en',
    scenarioId: 'social_01',
    createdAtMs: NOW - 60_000,
    expiresAtMs: NOW + 60_000,
    revision: 2,
    turns: [
      {
        turnId: 'd2t_abcdefghijklmnop',
        userText: 'I would like to introduce myself.',
        assistantReplies: [{ personaId: 'mia', text: 'Nice to meet you!' }],
      },
      {
        turnId: 'd2t_qrstuvwxyzabcdef',
        userText: 'I work nearby and enjoy this group.',
        assistantReplies: [{ personaId: 'mia', text: 'That sounds great.' }],
      },
    ],
    receipts: [],
    ...overrides,
  };
}

function request(data: unknown = {
  sessionId: 'd2s_abcdefghijklmnopqrstuvwxyz123456',
  studyTarget: 'en',
  scenarioId: 'social_01',
  interfaceLang: 'en',
}) {
  return { auth: { uid: AUTH_UID }, data };
}

function dependencies(session: unknown = storedSession()) {
  return {
    nowMs: () => NOW,
    sessionOwnerSecret: SECRET,
    resolveStableAccountId: jest.fn(async () => STABLE_ID),
    resolveReleasedPacket: jest.fn(async () => packet),
    readSession: jest.fn(async () => session),
    generateAssessment: jest.fn(async (_input: unknown) => JSON.stringify({
      overallAssessment: 'You kept the exchange moving and responded clearly to your partner throughout this conversation.',
      nextStep: 'Add one more concrete detail in your next reply.',
      languageNote: null,
      objectiveResults: packet.scenario.objectives.map((objective, index) => ({
        objectiveId: objective.id,
        status: index < 2 ? 'met' : 'not_met',
        evidenceMessageIds: [index === 1 ? 'd2t_qrstuvwxyzabcdef' : 'd2t_abcdefghijklmnop'],
      })),
    })),
  };
}

describe('Dialogue V2 terminal completion from server session', () => {
  test('builds a deterministic grounded debrief from the server-owned session only', async () => {
    const deps = dependencies();
    const first = await executeDialogueV2SessionCompletion(request(), deps);
    const second = await executeDialogueV2SessionCompletion(request(), deps);

    expect(second).toEqual(first);
    expect(first.feedback.speakerPersonaId).toBe('mia');
    expect(first.feedback.overallAssessment).toContain('exchange moving');
    expect(first.feedback.objectiveResults).toHaveLength(6);
    expect(first.feedback.objectiveResults.slice(0, 2)).toEqual([
      { objectiveId: 'objective_01', status: 'met', evidenceMessageIds: ['d2t_abcdefghijklmnop'] },
      { objectiveId: 'objective_02', status: 'met', evidenceMessageIds: ['d2t_qrstuvwxyzabcdef'] },
    ]);
    expect(first.feedback.objectiveResults.slice(2).every((item) => item.status === 'not_met')).toBe(true);
    expect(first.userMessages).toEqual({
      d2t_abcdefghijklmnop: 'I would like to introduce myself.',
      d2t_qrstuvwxyzabcdef: 'I work nearby and enjoy this group.',
    });
    expect(first.feedback.languageNote).toBeNull();
  });

  test('rejects client history, rank, persona or outcome authority fields', async () => {
    for (const [name, value] of [
      ['history', []], ['rank', 99], ['personaId', 'mia'], ['objectiveResults', []],
    ] as const) {
      await expect(executeDialogueV2SessionCompletion(request({
        sessionId: 'd2s_abcdefghijklmnopqrstuvwxyz123456',
        studyTarget: 'en',
        scenarioId: 'social_01',
        interfaceLang: 'en',
        [name]: value,
      }), dependencies())).rejects.toEqual(
        new DialogueV2SessionCompletionError('request_invalid'),
      );
    }
  });

  test('fails closed for another owner, selection mismatch, expiry and malformed oversized storage', async () => {
    await expect(executeDialogueV2SessionCompletion(request(), dependencies(storedSession({
      ownerBinding: 'a'.repeat(64),
    })))).rejects.toEqual(new DialogueV2SessionCompletionError('access_denied'));
    await expect(executeDialogueV2SessionCompletion(request(), dependencies(storedSession({
      scenarioId: 'social_02',
    })))).rejects.toEqual(new DialogueV2SessionCompletionError('selection_mismatch'));
    await expect(executeDialogueV2SessionCompletion(request(), dependencies(storedSession({
      expiresAtMs: NOW,
    })))).rejects.toEqual(new DialogueV2SessionCompletionError('session_expired'));
    await expect(executeDialogueV2SessionCompletion(request(), dependencies(storedSession({
      turns: Array.from({ length: 9 }, (_, index) => ({
        turnId: `d2t_abcdefghijklmn${String(index).padStart(2, '0')}`,
        userText: 'A sufficiently long learner message.',
        assistantReplies: [{ personaId: 'mia', text: 'Reply.' }],
      })),
    })))).rejects.toEqual(new DialogueV2SessionCompletionError('session_invalid'));
  });

  test('sends only the bounded current-session transcript and minimal immutable schema to the assessment provider', async () => {
    const deps = dependencies();
    await executeDialogueV2SessionCompletion(request(), deps);
    expect(deps.readSession).toHaveBeenCalledTimes(1);
    expect(deps.generateAssessment).toHaveBeenCalledTimes(1);
    const providerInput = deps.generateAssessment.mock.calls[0][0] as {
      systemPrompt: string;
      transcript: readonly unknown[];
    };
    expect(providerInput.transcript).toEqual([
      { messageId: 'd2t_abcdefghijklmnop', role: 'user', content: 'I would like to introduce myself.' },
      { role: 'assistant', content: 'Nice to meet you!' },
      { messageId: 'd2t_qrstuvwxyzabcdef', role: 'user', content: 'I work nearby and enjoy this group.' },
      { role: 'assistant', content: 'That sounds great.' },
    ]);
    expect(providerInput.systemPrompt).toContain('objective_01');
    expect(providerInput.systemPrompt).toContain('Step 1');
    expect(providerInput.systemPrompt).toContain('Warm and concise.');
    expect(providerInput.systemPrompt).toContain('Mia');
    const authority = providerInput.systemPrompt.split('SERVER_AUTHORIZED_ASSESSMENT_CONTEXT=')[1];
    expect(authority).not.toMatch(/rank|memory|checkpoint|briefing/i);
  });

  test('fails closed when the provider output is absent, malformed or cites another message', async () => {
    for (const output of [
      'not-json',
      JSON.stringify({ overallAssessment: 'Too short', nextStep: 'Next.', languageNote: null }),
      JSON.stringify({
        overallAssessment: 'A detailed assessment that is long enough for the terminal response.',
        nextStep: 'Try one more detail.',
        languageNote: { sourceMessageId: 'd2t_not_in_session_1234', corrected: 'A corrected sentence.', reason: 'This sounds more natural.' },
        objectiveResults: packet.scenario.objectives.map((objective) => ({
          objectiveId: objective.id,
          status: 'not_met',
          evidenceMessageIds: ['d2t_abcdefghijklmnop'],
        })),
      }),
      JSON.stringify({
        overallAssessment: 'A detailed assessment that is long enough for the terminal response.',
        nextStep: 'Try one more detail.',
        languageNote: null,
        objectiveResults: packet.scenario.objectives.map((objective, index) => ({
          objectiveId: index === 0 ? 'objective_outside_release' : objective.id,
          status: 'met',
          evidenceMessageIds: ['d2t_abcdefghijklmnop'],
        })),
      }),
    ]) {
      const deps = dependencies();
      deps.generateAssessment.mockResolvedValueOnce(output);
      await expect(executeDialogueV2SessionCompletion(request(), deps)).rejects.toEqual(
        new DialogueV2SessionCompletionError('completion_invalid'),
      );
    }
  });
});
