import {
  planDialogueV2BotVoice,
} from '../shared/dialogue_v2_bot_voice_policy';

const base = {
  nowMs: Date.UTC(2026, 8, 26, 12, 0, 0),
  target: 'en' as const,
  personaVoiceMode: 'optional_prepared_voice' as const,
  preparedAudio: null,
  responseText: 'That sounds good to me.',
  responseKind: 'milestone' as const,
  botVoiceRepliesToday: 0,
  botVoiceReplyDayKey: '2026-09-26',
  isGroupFollowUp: false,
};

describe('Dialogue V2 bot voice policy', () => {
  test('never synthesizes or queues work on demand when no prepared local asset exists', () => {
    expect(planDialogueV2BotVoice(base)).toEqual({
      kind: 'text_only',
      reason: 'prepared_audio_missing',
    });
  });

  test('plays only a prepared asset whose exact reply text matches the actual reply', () => {
    expect(planDialogueV2BotVoice({
      ...base,
      preparedAudio: { target: 'en', replyText: base.responseText, localUri: 'file:///cache/prepared.wav' },
    })).toEqual({ kind: 'play_prepared', localUri: 'file:///cache/prepared.wav' });
  });

  test('does not attach an audio file prepared for different words', () => {
    expect(planDialogueV2BotVoice({
      ...base,
      preparedAudio: { target: 'en', replyText: 'Different reply', localUri: 'file:///cache/wrong.wav' },
    })).toEqual({ kind: 'text_only', reason: 'prepared_reply_mismatch' });
    expect(planDialogueV2BotVoice({
      ...base,
      preparedAudio: { target: 'en', replyText: 'that sounds good to me.', localUri: 'file:///cache/wrong-case.wav' },
    })).toEqual({ kind: 'text_only', reason: 'prepared_reply_mismatch' });
  });

  test('does not play an otherwise matching asset prepared for another language contour', () => {
    expect(planDialogueV2BotVoice({
      ...base,
      preparedAudio: { target: 'es', replyText: base.responseText, localUri: 'file:///cache/spanish.wav' },
    })).toEqual({ kind: 'text_only', reason: 'prepared_target_mismatch' });
  });

  test('caps voice replies at one per calendar day and never voices a group follow-up', () => {
    expect(planDialogueV2BotVoice({ ...base, botVoiceRepliesToday: 1 })).toEqual({ kind: 'text_only', reason: 'daily_cap_reached' });
    expect(planDialogueV2BotVoice({ ...base, isGroupFollowUp: true })).toEqual({ kind: 'text_only', reason: 'group_follow_up' });
    expect(planDialogueV2BotVoice({ ...base, botVoiceRepliesToday: -1 })).toEqual({ kind: 'text_only', reason: 'daily_cap_reached' });
    expect(planDialogueV2BotVoice({ ...base, botVoiceRepliesToday: 0.5 })).toEqual({ kind: 'text_only', reason: 'daily_cap_reached' });
    expect(planDialogueV2BotVoice({ ...base, botVoiceReplyDayKey: '2026-09-25' })).toEqual({ kind: 'text_only', reason: 'calendar_day_unverified' });
  });

  test('keeps ordinary and text-only personas silent in voice', () => {
    expect(planDialogueV2BotVoice({ ...base, responseKind: 'answer' })).toEqual({ kind: 'text_only', reason: 'ordinary_reply' });
    expect(planDialogueV2BotVoice({ ...base, personaVoiceMode: 'text_only' })).toEqual({ kind: 'text_only', reason: 'persona_text_only' });
  });
});
