import type { DialogueStudyTarget } from './dialogue_language_registry';

/** Exact locale is a release boundary: `es-MX` is not proof for `es-ES`. */
export const DIALOGUE_EXACT_SPEECH_LOCALE: Readonly<Record<DialogueStudyTarget, string>> = Object.freeze({
  en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE',
});

export type DialogueVoiceInventoryItem = Readonly<{ identifier: string; language: string }>;
export type DialogueVoiceCapabilityReason =
  | 'inventory_unverified'
  | 'exact_voice_missing'
  | 'ios_target_proof_missing';

export type DialogueVoiceCapability = Readonly<{
  available: boolean;
  locale: string;
  voiceId: string | null;
  reason: DialogueVoiceCapabilityReason | null;
}>;

/**
 * A voice list is evidence, not a hint.  In particular, never let Expo select
 * its default voice after an unavailable exact target voice.
 */
export function resolveDialogueVoiceCapability(input: Readonly<{
  target: DialogueStudyTarget;
  platform: 'android' | 'ios' | 'web';
  voices?: readonly DialogueVoiceInventoryItem[];
  inventoryError?: boolean;
  inventoryTimedOut?: boolean;
  /** Physical/runtime receipt; non-EN iOS cannot be assumed from the list. */
  iosTargetSpecificProof?: boolean;
}>): DialogueVoiceCapability {
  const locale = DIALOGUE_EXACT_SPEECH_LOCALE[input.target];
  const verified = !input.inventoryError && !input.inventoryTimedOut && Array.isArray(input.voices) && input.voices.length > 0;
  if (!verified) return { available: false, locale, voiceId: null, reason: 'inventory_unverified' };
  if (input.platform === 'ios' && input.target !== 'en' && input.iosTargetSpecificProof !== true) {
    return { available: false, locale, voiceId: null, reason: 'ios_target_proof_missing' };
  }
  const exact = input.voices!.find((voice) => voice.language === locale && voice.identifier.trim().length > 0);
  return exact
    ? { available: true, locale, voiceId: exact.identifier, reason: null }
    : { available: false, locale, voiceId: null, reason: 'exact_voice_missing' };
}

export type DialogueAsrCapabilityReason =
  | 'inventory_unverified'
  | 'android_api_unsupported'
  | 'exact_locale_missing'
  | 'service_mismatch';

export function resolveDialogueAsrCapability(input: Readonly<{
  target: DialogueStudyTarget;
  platform: 'android' | 'ios' | 'web';
  androidApiLevel?: number;
  locales?: readonly string[];
  inventoryServiceId?: string | null;
  startServiceId?: string | null;
}>): Readonly<{ available: boolean; locale: string; reason: DialogueAsrCapabilityReason | null }> {
  const locale = DIALOGUE_EXACT_SPEECH_LOCALE[input.target];
  const decide = (
    available: boolean,
    reason: DialogueAsrCapabilityReason | null,
    branch: string,
  ): Readonly<{ available: boolean; locale: string; reason: DialogueAsrCapabilityReason | null }> => {
    console.log('[DIALOG-MIC]', JSON.stringify({
      branch, available, reason, target: input.target, platform: input.platform,
      androidApiLevel: input.androidApiLevel ?? null, localeCount: Array.isArray(input.locales) ? input.locales.length : null,
      hasInventoryService: Boolean(input.inventoryServiceId),
    })); // guard-ok: каждое решение о микрофоне диалога, без идентификаторов
    return { available, locale, reason };
  };
  // зачем (владелец 21.10, B3 / репорт №12 «в диалоге пишет недоступно, а в уроках записывает»): запрета по версии
  // Android (≤ 12) больше нет — уроки на тех же телефонах распознают речь (use_learning_v2_local_hold_to_talk_v1
  // проверяет только наличие модуля). Реальный сбой после старта показывает своё сообщение, поле текста есть всегда.
  // зачем: iOS не отдаёт список локалей распознавания (getSupportedLocales там
  // пустой), но системный распознаватель есть всегда. Требовать от него список
  // как доказательство — значит отказывать ВСЕМ пользователям iPhone, что и
  // случилось: экран Диалогов писал «недоступен на этом устройстве» при живом
  // микрофоне в остальных разделах (владелец, 21.09).
  if (input.platform === 'ios') {
    if (!input.inventoryServiceId) return decide(false, 'inventory_unverified', 'ios_no_service');
    return decide(true, null, 'ios_system_recognizer');
  }
  // зачем (21.10): на Android ≤ 12 список языков распознавателя обычно пуст (API появился в Android 13) — это не
  // доказательство отсутствия, а отсутствие доказательства. Пробуем, как уроки; отказ — только по явному списку ниже.
  if (!Array.isArray(input.locales) || input.locales.length === 0 || !input.inventoryServiceId) {
    return decide(true, null, 'android_inventory_unverified_try_like_lessons');
  }
  if (input.startServiceId !== input.inventoryServiceId) return decide(false, 'service_mismatch', 'android_service_mismatch');
  // Android отдаёт локали то через дефис, то через подчёркивание (en-US / en_US),
  // иногда без региона — сравниваем нормализованно, а не строкой в строку.
  const want = locale.toLowerCase().replace(/_/g, '-');
  const wantLang = want.split('-')[0];
  const normalized = input.locales.map((l) => String(l).toLowerCase().replace(/_/g, '-'));
  const matched = normalized.includes(want) || normalized.some((l) => l === wantLang || l.startsWith(`${wantLang}-`));
  return matched
    ? decide(true, null, 'android_locale_listed')
    : decide(false, 'exact_locale_missing', 'android_locale_not_in_list');
}

/** Generation token used by hooks to discard inventory results after teardown. */
export function createDialogueVoiceAttemptGuard(): Readonly<{ begin: () => number; cancel: () => void; isCurrent: (ticket: number) => boolean }> {
  let generation = 0;
  return {
    begin: () => ++generation,
    cancel: () => { generation += 1; },
    isCurrent: (ticket) => ticket === generation,
  };
}
