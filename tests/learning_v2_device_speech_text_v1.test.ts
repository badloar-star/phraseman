import {
  resolveLearningV2CourseSessionDeviceSpeechTextV1,
  resolveLearningV2CourseSessionSelectableDeviceSpeechTextV1,
} from '../modules/learning-v2/runtime/course_session_device_speech_text_v1';

const interaction = (modePayload: unknown, responseOptions: readonly { responseId: string; text: string }[] = []) => ({
  interactionId: 'lesson-01:session:02:i02',
  modePayload,
  responseOptions,
} as never);

describe('Learning V2 device speech text', () => {
  it('speaks the exact reference transcript for listening tasks', () => {
    expect(resolveLearningV2CourseSessionDeviceSpeechTextV1(interaction({
      family: 'listen_choose',
      referenceAudio: { transcript: 'I am sad.' },
    }), 'different fallback')).toBe('I am sad.');
  });

  it('uses the exact canonical target for task families without a reference transcript', () => {
    expect(resolveLearningV2CourseSessionDeviceSpeechTextV1(
      interaction({ family: 'phrase_builder' }),
      '  I am sad.  ',
    )).toBe('I am sad.');
  });

  it('speaks the exact selected target option and rejects unknown ids', () => {
    const task = interaction({ family: 'sound_contrast' }, [
      { responseId: 'sad', text: 'sad' },
      { responseId: 'said', text: 'said' },
    ]);
    expect(resolveLearningV2CourseSessionSelectableDeviceSpeechTextV1(task, 'sad')).toBe('sad');
    expect(resolveLearningV2CourseSessionSelectableDeviceSpeechTextV1(task, 'missing')).toBeNull();
  });
});
