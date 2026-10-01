jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn() }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(),
}));

// Jest hoists dependency mocks above this import at runtime.
// eslint-disable-next-line import/first
import { normalizePremiumDialogReviewCallableResponse } from '../app/ai_dialog_client';

const objectiveIds = ['open', 'clarify', 'propose', 'agree', 'confirm', 'close'] as const;
const messageIds = ['u-1', 'u-2', 'u-3', 'u-4', 'u-5', 'u-6'] as const;

const feedback = {
  overallAssessment: 'You kept the group moving, clarified the choice, and closed the plan politely.',
  nextStep: 'Next time, add one short reason before your proposal.',
  speakerPersonaId: 'maya',
  objectiveResults: objectiveIds.map((objectiveId, index) => ({
    objectiveId,
    status: index === 2 ? 'not_met' : 'met',
    evidenceMessageIds: [messageIds[index]],
  })),
  evidenceMessageIds: ['u-1', 'u-4'],
  languageNote: {
    sourceMessageId: 'u-3',
    corrected: 'Could we meet at seven instead?',
    reason: 'This wording is a little more natural for a friendly plan.',
  },
};

const v2CallableResponse = {
  ok: true,
  v2Completion: {
    feedback,
    context: { objectiveIds, personaIds: ['maya'], userMessageIds: messageIds },
    objectiveLabels: {
      open: 'Open the group chat', clarify: 'Clarify the plan', propose: 'Make a proposal',
      agree: 'Reach agreement', confirm: 'Confirm the details', close: 'Close politely',
    },
    personaNames: { maya: 'Maya' },
    userMessages: {
      'u-1': 'Hi everyone!', 'u-2': 'What time works for you?', 'u-3': 'Could we meet at seven?',
      'u-4': 'That works for me.', 'u-5': 'Great, I will book it.', 'u-6': 'See you there!',
    },
    evidenceNote: 'Message from this conversation.',
  },
};

describe('V2 terminal review callable integration', () => {
  test('normalizes a server-provided V2 debrief into the verdict review rendered by the live session', () => {
    const review = normalizePremiumDialogReviewCallableResponse(v2CallableResponse);

    expect(review).toMatchObject({
      ok: true,
      assessment: feedback.overallAssessment,
      tip: feedback.nextStep,
      objectiveResults: expect.arrayContaining([
        expect.objectContaining({ objectiveId: 'open', status: 'met', label: 'Open the group chat' }),
        expect.objectContaining({ objectiveId: 'propose', status: 'not_met', label: 'Make a proposal' }),
      ]),
    });
    expect(review?.objectiveResults).toHaveLength(6);
    expect(review?.evidence).toEqual([
      { learnerTurn: 'Hi everyone!', note: 'Message from this conversation.' },
      { learnerTurn: 'That works for me.', note: 'Message from this conversation.' },
    ]);
  });

  test('rejects an invalid V2 debrief so the live session preserves its honest fallback', () => {
    expect(normalizePremiumDialogReviewCallableResponse({
      ...v2CallableResponse,
      v2Completion: {
        ...v2CallableResponse.v2Completion,
        feedback: { ...feedback, evidenceMessageIds: ['not-an-accepted-message'] },
      },
    })).toBeNull();
  });

  test('projects an exact V2 memory receipt only alongside a valid V2 debrief', () => {
    const review = normalizePremiumDialogReviewCallableResponse({
      ...v2CallableResponse,
      v2Memory: {
        sharedMemoryStored: true,
        scenarioCheckpointStored: true,
      },
    });

    expect(review?.v2Memory).toEqual({
      sharedMemoryStored: true,
      scenarioCheckpointStored: true,
    });
  });

  test.each([
    { sharedMemoryStored: true },
    { sharedMemoryStored: true, scenarioCheckpointStored: undefined },
    { sharedMemoryStored: true, scenarioCheckpointStored: 'yes' },
    { sharedMemoryStored: true, scenarioCheckpointStored: false, extra: true },
  ])('fails closed for a malformed V2 memory receipt: %j', (v2Memory) => {
    expect(normalizePremiumDialogReviewCallableResponse({
      ...v2CallableResponse,
      v2Memory,
    })).toBeNull();
  });

  test('does not accept a V2 memory receipt on the legacy review envelope', () => {
    expect(normalizePremiumDialogReviewCallableResponse({
      ok: true,
      praise: 'Nice work.',
      tip: 'Keep going.',
      corrections: [],
      v2Memory: { sharedMemoryStored: true, scenarioCheckpointStored: true },
    })).toBeNull();
  });

  test('does not treat an explicitly present undefined V2 memory receipt as absent', () => {
    expect(normalizePremiumDialogReviewCallableResponse({
      ...v2CallableResponse,
      v2Memory: undefined,
    })).toBeNull();
    expect(normalizePremiumDialogReviewCallableResponse({
      ok: true,
      praise: 'Nice work.',
      tip: 'Keep going.',
      corrections: [],
      v2Memory: undefined,
    })).toBeNull();
  });
});
