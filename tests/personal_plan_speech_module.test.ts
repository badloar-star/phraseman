import {
  isSpeechRecognitionAvailable,
  requestSpeechPermissionForHold,
  type PlanSpeechModule,
} from '../app/personal_plan_speech_module';

const baseSpeechModule: PlanSpeechModule = {
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
};

describe('personal plan speech module availability', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('treats a missing native module as unavailable', () => {
    expect(isSpeechRecognitionAvailable(null)).toBe(false);
  });

  it('allows older native modules without an availability probe', () => {
    expect(isSpeechRecognitionAvailable(baseSpeechModule)).toBe(true);
  });

  it('uses the native recognizer availability result when exposed', () => {
    expect(isSpeechRecognitionAvailable({
      ...baseSpeechModule,
      isRecognitionAvailable: () => true,
    })).toBe(true);

    expect(isSpeechRecognitionAvailable({
      ...baseSpeechModule,
      isRecognitionAvailable: () => false,
    })).toBe(false);
  });

  it('fails closed when the availability probe throws', () => {
    expect(isSpeechRecognitionAvailable({
      ...baseSpeechModule,
      isRecognitionAvailable: () => {
        throw new Error('native unavailable');
      },
    })).toBe(false);
  });

  it('distinguishes an existing grant from a grant obtained through a prompt', async () => {
    const alreadyGranted = {
      ...baseSpeechModule,
      getPermissionsAsync: jest.fn(async () => ({ granted: true })),
      requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
    };
    await expect(requestSpeechPermissionForHold(alreadyGranted)).resolves.toBe('granted');
    expect(alreadyGranted.requestPermissionsAsync).not.toHaveBeenCalled();

    const prompted = {
      ...baseSpeechModule,
      getPermissionsAsync: jest.fn(async () => ({ granted: false })),
      requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
    };
    await expect(requestSpeechPermissionForHold(prompted)).resolves.toBe('granted_after_prompt');
  });

  it('reports a denied hold permission without starting capture', async () => {
    const denied = {
      ...baseSpeechModule,
      getPermissionsAsync: jest.fn(async () => ({ granted: false })),
      requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
    };
    await expect(requestSpeechPermissionForHold(denied)).resolves.toBe('denied');
  });

  it('settles a stopped recognition attempt when native emits no terminal event', () => {
    jest.useFakeTimers();
    const speechRuntime = require('../app/personal_plan_speech_module');
    const scheduleSettlement = speechRuntime.schedulePlanSpeechStopSettlement;

    expect(scheduleSettlement).toEqual(expect.any(Function));
    if (typeof scheduleSettlement !== 'function') return;

    const timerRef = { current: null };
    const finishAttempt = jest.fn();
    scheduleSettlement(timerRef, finishAttempt);

    expect(finishAttempt).not.toHaveBeenCalled();
    jest.runOnlyPendingTimers();
    expect(finishAttempt).toHaveBeenCalledTimes(1);
    expect(timerRef.current).toBeNull();
  });
});
