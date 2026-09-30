import {
  buildDialogueVoiceAttachment,
  describeDialogueVoiceMessage,
} from '../app/dialogue_voice_message';

describe('dialogue voice message attachment', () => {
  test('attaches the local recording only to the transcript it captured', () => {
    expect(buildDialogueVoiceAttachment({
      uri: 'file:///cache/dialogue-voice.wav',
      transcript: ' Could we make it seven instead? ',
    }, 'Could we make it seven instead?')).toEqual({
      uri: 'file:///cache/dialogue-voice.wav',
      transcript: 'Could we make it seven instead?',
    });
  });

  test('never attaches a recording after the learner has edited the draft', () => {
    expect(buildDialogueVoiceAttachment({
      uri: 'file:///cache/dialogue-voice.wav',
      transcript: 'Could we make it seven instead?',
    }, 'Could we make it eight instead?')).toBeNull();
  });

  test('never attaches a recording when only its internal whitespace differs', () => {
    expect(buildDialogueVoiceAttachment({
      uri: 'file:///cache/dialogue-voice.wav',
      transcript: 'Guten Tag!',
    }, 'Guten   Tag!')).toBeNull();
  });

  test('attaches after the same NFC, CRLF and trimming canonicalization as a submitted turn', () => {
    expect(buildDialogueVoiceAttachment({
      uri: 'file:///cache/dialogue-voice.wav',
      transcript: '  Cafe\u0301\r\nnoch  ',
    }, 'Café\nnoch')).toEqual({
      uri: 'file:///cache/dialogue-voice.wav',
      transcript: 'Café\nnoch',
    });
  });

  test('rejects non-local or empty recording references', () => {
    expect(buildDialogueVoiceAttachment({ uri: 'https://example.com/voice.wav', transcript: 'Hello' }, 'Hello')).toBeNull();
    expect(buildDialogueVoiceAttachment({ uri: 'file:///cache/dialogue-voice.wav', transcript: '   ' }, 'Hello')).toBeNull();
  });

  test('labels an audio bubble without exposing its internal transcript', () => {
    expect(describeDialogueVoiceMessage('ru')).toEqual({ label: 'Голосовое сообщение', action: 'Воспроизвести голосовое сообщение' });
  });
});
