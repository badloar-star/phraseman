const mockCallable = jest.fn();
const mockHttpsCallable = jest.fn(() => mockCallable);
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: mockHttpsCallable,
}));

// eslint-disable-next-line import/first
import { completeDialogueV2Session } from '../app/dialogue_v2_completion_client';

const completion = {
  feedback: {
    overallAssessment: 'A detailed partner assessment based on the conversation.',
    nextStep: 'Add one concrete detail next time.',
    speakerPersonaId: 'mia',
    objectiveResults: Array.from({ length: 6 }, (_, index) => ({
      objectiveId: `objective_0${index + 1}`,
      status: index < 2 ? 'met' : 'not_met',
      evidenceMessageIds: ['d2t_abcdefghijklmnop'],
    })),
    evidenceMessageIds: ['d2t_abcdefghijklmnop'],
    languageNote: null,
  },
  context: {
    objectiveIds: Array.from({ length: 6 }, (_, index) => `objective_0${index + 1}`),
    personaIds: ['mia'],
    userMessageIds: ['d2t_abcdefghijklmnop'],
  },
  objectiveLabels: Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`objective_0${index + 1}`, `Step ${index + 1}`])),
  personaNames: { mia: 'Mia' },
  userMessages: { d2t_abcdefghijklmnop: 'I would like to join the group.' },
  evidenceNote: 'Message from this conversation.',
};

describe('Dialogue V2 completion client', () => {
  beforeEach(() => jest.clearAllMocks());

  test('sends only the terminal selection and accepts the strict server debrief', async () => {
    mockCallable.mockResolvedValueOnce({ data: {
      ok: true,
      v2Completion: completion,
      v2Memory: { sharedMemoryStored: true, scenarioCheckpointStored: false },
      replayed: false,
    } });
    const result = await completeDialogueV2Session({
      sessionId: 'd2s_abcdefghijklmnopqrstuvwxyz123456',
      studyTarget: 'en',
      scenarioId: 'social_01',
      interfaceLang: 'en',
    });
    // аудит «пропала сеть» 13.10: свой потолок вызова итога (сервер — до 60 с)
    expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'dialogueV2SessionComplete', { timeout: 45_000 });
    expect(mockCallable).toHaveBeenCalledWith({
      sessionId: 'd2s_abcdefghijklmnopqrstuvwxyz123456', studyTarget: 'en', scenarioId: 'social_01', interfaceLang: 'en',
    });
    expect(result).toMatchObject({ review: { assessment: completion.feedback.overallAssessment, speakerName: 'Mia' }, replayed: false });
  });

  test('rejects malformed response and never accepts client transcript fields', async () => {
    expect(await completeDialogueV2Session({
      sessionId: 'd2s_abcdefghijklmnopqrstuvwxyz123456', studyTarget: 'en', scenarioId: 'social_01', interfaceLang: 'en', history: [],
    } as never)).toBeNull();
    mockCallable.mockResolvedValueOnce({ data: { ok: true, v2Completion: completion, v2Memory: {}, replayed: false } });
    await expect(completeDialogueV2Session({
      sessionId: 'd2s_abcdefghijklmnopqrstuvwxyz123456', studyTarget: 'en', scenarioId: 'social_01', interfaceLang: 'en',
    })).rejects.toThrow('dialogue_v2_completion_unavailable');
  });

  test('does not hide a 60-second terminal lease behind ineffective sub-second retries', async () => {
    mockCallable.mockRejectedValueOnce({ code: 'functions/aborted' });
    await expect(completeDialogueV2Session({
      sessionId: 'd2s_abcdefghijklmnopqrstuvwxyz123456',
      studyTarget: 'en',
      scenarioId: 'social_01',
      interfaceLang: 'en',
    })).rejects.toThrow('dialogue_v2_completion_unavailable');
    expect(mockCallable).toHaveBeenCalledTimes(1);
  });

  test('does not retry authorization or malformed-response failures', async () => {
    mockCallable.mockRejectedValueOnce({ code: 'functions/permission-denied' });
    await expect(completeDialogueV2Session({
      sessionId: 'd2s_abcdefghijklmnopqrstuvwxyz123456', studyTarget: 'en', scenarioId: 'social_01', interfaceLang: 'en',
    })).rejects.toThrow('dialogue_v2_completion_unavailable');
    expect(mockCallable).toHaveBeenCalledTimes(1);
  });
});
