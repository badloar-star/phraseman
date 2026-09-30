import type { DialogueV2StudyTarget } from './dialogue_v2_language_pack_contract';

/**
 * A locally prepared bot voice response. This policy never generates audio:
 * the caller may only play a matching file already present on-device.
 */
export type DialogueV2PreparedBotVoice = Readonly<{
  /** Language contour used to prepare the voice asset. */
  target: DialogueV2StudyTarget;
  /** Exact reply text used to create this local audio asset. */
  replyText: string;
  localUri: string;
}>;

export type DialogueV2BotVoicePlan =
  | Readonly<{ kind: 'text_only'; reason: 'persona_text_only' | 'group_follow_up' | 'daily_cap_reached' | 'calendar_day_unverified' | 'ordinary_reply' | 'prepared_target_mismatch' | 'prepared_reply_mismatch' | 'prepared_audio_invalid' | 'prepared_audio_missing' | 'empty_reply' }>
  | Readonly<{ kind: 'play_prepared'; localUri: string }>;

export type DialogueV2BotVoicePlanInput = Readonly<{
  nowMs: number;
  target: DialogueV2StudyTarget;
  personaVoiceMode: 'text_only' | 'optional_prepared_voice';
  preparedAudio: DialogueV2PreparedBotVoice | null;
  responseText: string;
  responseKind: 'answer' | 'milestone' | 'celebration' | 'closing';
  botVoiceRepliesToday: number;
  /** UTC day key issued with the authoritative daily voice-reply counter. */
  botVoiceReplyDayKey: string;
  isGroupFollowUp: boolean;
}>;

const VOICE_WORTHY_KINDS = new Set<DialogueV2BotVoicePlanInput['responseKind']>([
  'milestone',
  'celebration',
  'closing',
]);

function utcDayKey(nowMs: number): string | null {
  if (!Number.isSafeInteger(nowMs)) return null;
  const date = new Date(nowMs);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * Decides whether a reply remains text or can play a matching pre-existing
 * local file. It deliberately has no request-time or background preparation
 * result: creating audio belongs to offline content delivery, not a dialogue.
 *
 * This is an eligibility selector, not the daily quota authority. Before a
 * runtime may act on `play_prepared`, its server path must atomically reserve
 * the UTC-day slot and then pass the resulting authoritative state here.
 */
export function planDialogueV2BotVoice(input: DialogueV2BotVoicePlanInput): DialogueV2BotVoicePlan {
  if (!input.responseText.trim()) return { kind: 'text_only', reason: 'empty_reply' };
  if (input.personaVoiceMode !== 'optional_prepared_voice') return { kind: 'text_only', reason: 'persona_text_only' };
  if (input.isGroupFollowUp) return { kind: 'text_only', reason: 'group_follow_up' };
  if (!Number.isSafeInteger(input.botVoiceRepliesToday) || input.botVoiceRepliesToday < 0 || input.botVoiceRepliesToday >= 1) {
    return { kind: 'text_only', reason: 'daily_cap_reached' };
  }
  if (utcDayKey(input.nowMs) !== input.botVoiceReplyDayKey) return { kind: 'text_only', reason: 'calendar_day_unverified' };
  if (!VOICE_WORTHY_KINDS.has(input.responseKind)) return { kind: 'text_only', reason: 'ordinary_reply' };

  if (input.preparedAudio) {
    if (input.preparedAudio.target !== input.target) return { kind: 'text_only', reason: 'prepared_target_mismatch' };
    if (input.preparedAudio.replyText !== input.responseText) return { kind: 'text_only', reason: 'prepared_reply_mismatch' };
    if (!input.preparedAudio.localUri.startsWith('file://')) return { kind: 'text_only', reason: 'prepared_audio_invalid' };
    return { kind: 'play_prepared', localUri: input.preparedAudio.localUri };
  }
  return { kind: 'text_only', reason: 'prepared_audio_missing' };
}
