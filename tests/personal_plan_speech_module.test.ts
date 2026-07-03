import {
  isSpeechRecognitionAvailable,
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
});
