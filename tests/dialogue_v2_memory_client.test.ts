/* eslint-disable import/first */
const mockGetApp = jest.fn(() => ({ name: 'app' }));
const mockGetFunctions = jest.fn(() => ({ region: 'us-central1' }));
const mockCallableRun = jest.fn();
const mockHttpsCallable = jest.fn(() => mockCallableRun);
const mockInitAppCheck = jest.fn(async () => undefined);

jest.mock('@react-native-firebase/app', () => ({ getApp: mockGetApp }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: mockGetFunctions,
  httpsCallable: mockHttpsCallable,
}));
jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: mockInitAppCheck,
}));

import {
  clearDialogueV2Memory,
  DialogueV2MemoryManagementError,
  DialogueV2MemoryResumeError,
  resumeDialogueV2Memory,
  viewDialogueV2Memory,
} from '../app/dialogue_v2_memory_client';

const validResponse = Object.freeze({
  ok: true,
  sharedSummary: {
    strengths: ['clear_requests'],
    focusAreas: ['word_order'],
    completedObjectives: 2,
  },
  scenarioCheckpoint: {
    nextObjectiveIndex: 2,
    completedObjectiveIds: ['ask_time', 'confirm_plan'],
    personaState: { mia: 'warm', leo: 'busy' },
  },
});

describe('Dialogue V2 memory resume Firebase client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCallableRun.mockResolvedValue({ data: validResponse });
  });

  it('initializes App Check and sends exactly the safe selection to the deployed callable', async () => {
    await expect(resumeDialogueV2Memory({ studyTarget: 'de', scenarioId: 'social_01' }))
      .resolves.toEqual(validResponse);

    expect(mockInitAppCheck).toHaveBeenCalledTimes(1);
    expect(mockGetFunctions).toHaveBeenCalledWith({ name: 'app' }, 'us-central1');
    expect(mockHttpsCallable).toHaveBeenCalledWith({ region: 'us-central1' }, 'dialogueV2MemoryResume');
    expect(mockCallableRun).toHaveBeenCalledWith({ studyTarget: 'de', scenarioId: 'social_01' });
    expect(mockInitAppCheck.mock.invocationCallOrder[0])
      .toBeLessThan(mockHttpsCallable.mock.invocationCallOrder[0]);
  });

  it('does not call Firebase for a selection with fields outside studyTarget and scenarioId', async () => {
    await expect(resumeDialogueV2Memory({
      studyTarget: 'de',
      scenarioId: 'social_01',
      transcript: 'never sent',
    } as never)).resolves.toBeNull();

    expect(mockInitAppCheck).not.toHaveBeenCalled();
    expect(mockCallableRun).not.toHaveBeenCalled();
  });

  it('returns null instead of exposing an unexpected callable response', async () => {
    mockCallableRun.mockResolvedValue({
      data: {
        ...validResponse,
        transcript: 'must never cross this client boundary',
      },
    });

    await expect(resumeDialogueV2Memory({ studyTarget: 'es', scenarioId: 'work_03' }))
      .resolves.toBeNull();
  });

  it('throws only a safe error when the callable rejects the resume request', async () => {
    mockCallableRun.mockRejectedValue(new Error('permission-denied: account-specific server detail'));

    await expect(resumeDialogueV2Memory({ studyTarget: 'fr', scenarioId: 'travel_05' }))
      .rejects.toEqual(new DialogueV2MemoryResumeError('memory_resume_unavailable'));
  });
});

describe('Dialogue V2 Plus memory management Firebase client', () => {
  const managementView = Object.freeze({
    ok: true,
    studyTarget: 'de',
    sharedSummary: {
      scenarioId: 'social_01',
      strengths: ['social_01_goal_1'],
      focusAreas: ['social_01_goal_2'],
      completedObjectives: 1,
    },
    scenarioCheckpoints: Object.freeze([{
      scenarioId: 'social_01',
      nextObjectiveIndex: 1,
      completedObjectiveIds: ['social_01_goal_1'],
      personaState: { host: 'warm' },
    }]),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('views one exact language through the dedicated callable', async () => {
    mockCallableRun.mockResolvedValue({ data: managementView });

    await expect(viewDialogueV2Memory({ studyTarget: 'de' })).resolves.toEqual(managementView);

    expect(mockInitAppCheck).toHaveBeenCalledTimes(1);
    expect(mockHttpsCallable).toHaveBeenCalledWith(
      { region: 'us-central1' },
      'dialogueV2MemoryView',
    );
    expect(mockCallableRun).toHaveBeenCalledWith({ studyTarget: 'de' });
  });

  it('clears one exact language through the dedicated callable', async () => {
    mockCallableRun.mockResolvedValue({
      data: { ok: true, studyTarget: 'fr', cleared: true, deletedDocuments: 77 },
    });

    await expect(clearDialogueV2Memory({ studyTarget: 'fr' })).resolves.toEqual({
      ok: true,
      studyTarget: 'fr',
      cleared: true,
      deletedDocuments: 77,
    });

    expect(mockHttpsCallable).toHaveBeenCalledWith(
      { region: 'us-central1' },
      'dialogueV2MemoryClear',
    );
    expect(mockCallableRun).toHaveBeenCalledWith({ studyTarget: 'fr' });
  });

  it('does not call Firebase for authority, path, scenario or payload fields', async () => {
    for (const selection of [
      { studyTarget: 'de', stableAccountId: 'victim' },
      { studyTarget: 'de', path: 'users/victim/dialogue_v2_memory' },
      { studyTarget: 'de', scenarioId: 'social_01' },
      { studyTarget: 'de', summary: { strengths: ['forged'] } },
      { studyTarget: 'it' },
    ]) {
      await expect(viewDialogueV2Memory(selection as never)).resolves.toBeNull();
      await expect(clearDialogueV2Memory(selection as never)).resolves.toBeNull();
    }
    expect(mockInitAppCheck).not.toHaveBeenCalled();
    expect(mockCallableRun).not.toHaveBeenCalled();
  });

  it('rejects any response carrying transcript, storage paths or unknown fields', async () => {
    for (const data of [
      { ...managementView, transcript: 'private' },
      { ...managementView, storagePath: 'users/victim' },
      {
        ...managementView,
        scenarioCheckpoints: [{
          ...managementView.scenarioCheckpoints[0],
          transcript: 'private',
        }],
      },
    ]) {
      mockCallableRun.mockResolvedValueOnce({ data });
      await expect(viewDialogueV2Memory({ studyTarget: 'de' })).resolves.toBeNull();
    }
  });

  it('throws only a safe management error for callable failures', async () => {
    mockCallableRun.mockRejectedValue(new Error('permission-denied: account-specific detail'));

    await expect(viewDialogueV2Memory({ studyTarget: 'es' }))
      .rejects.toEqual(new DialogueV2MemoryManagementError());
    await expect(clearDialogueV2Memory({ studyTarget: 'es' }))
      .rejects.toEqual(new DialogueV2MemoryManagementError());
  });
});
