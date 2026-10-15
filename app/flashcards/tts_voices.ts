/**
 * cards-2.0 (E10): список TTS-голосов устройства (один раз, с кэшем) и их читаемые имена — для экрана выбора голоса и
 * строки «Голос озвучки» в Настройках обучения. Идентификаторы голосов НЕ хардкодятся — только Speech.getAvailableVoicesAsync().
 *
 * зачем (Ревизор 15.10, пачка 2.65): цепочки фолбэков и resolveVoiceForLang удалены — у них не было ни одного вызывающего.
 * Голос карточки на самом деле выбирает use-audio → resolveCardDeviceVoice (card_tts_audio.ts): нет голоса языка — без озвучки.
 */

import { getDevVoices } from '../dev_cards_state';
import { isTechnicalVoiceName, technicalVoiceDisplayName } from './voice_display_name';

/** Подмножество Speech.Voice, достаточное для выбора (quality — enum или строка). */
export type FcVoiceLike = {
  identifier: string;
  name?: string;
  quality?: string;
  language: string;
};

// ── Кэш getAvailableVoicesAsync ──────────────────────────────────────────────

let voicesCache: FcVoiceLike[] | null = null;
let voicesInflight: Promise<FcVoiceLike[]> | null = null;

/** Web: onvoiceschanged может не стрельнуть (headless) — промис зависает; страхуемся. */
const VOICES_TIMEOUT_MS = 2000;

/** Синхронный взгляд на кэш: экран выбора голоса открывается готовым списком без кадра загрузки (аудит cards-gaps-states). null — ещё не спрашивали. */
export function peekVoicesCache(): FcVoiceLike[] | null {
  return voicesCache;
}

/**
 * Один запрос списка голосов на жизнь приложения (кэш). Ошибка → [] (вызывающий решает сам: озвучка карточки — resolveCardDeviceVoice).
 * Таймаут → [] БЕЗ записи в кэш: медленный ответ системы не должен навсегда оставить список пустым (только «Системный (авто)»).
 */
export function getVoicesOnce(): Promise<FcVoiceLike[]> {
  // зачем (координатор 12.10, cards-gap-036/038): dev `voices=demo|none` — список голосов как на образце вместо голосов эмулятора; кэш не трогаем.
  const devVoices = getDevVoices();
  if (devVoices) {
    console.warn(`[DEV-STATE] voices: список подменён n=${devVoices.length}`); // guard-ok: dev-ветка
    return Promise.resolve([...devVoices]);
  }
  if (voicesCache) {
    console.log(`[VOICE-NAME] voices:source ${JSON.stringify({ source: 'cache', count: voicesCache.length })}`);
    return Promise.resolve(voicesCache);
  }
  if (voicesInflight) return voicesInflight;
  voicesInflight = (async () => {
    try {
      const Speech = require('expo-speech') as typeof import('expo-speech');
      const timeout = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), VOICES_TIMEOUT_MS),
      );
      const list = await Promise.race([
        Speech.getAvailableVoicesAsync() as Promise<FcVoiceLike[]>,
        timeout,
      ]);
      if (list === null) {
        // зачем: таймаут — не итог, список мог просто задержаться; не кэшируем пустоту, следующий вход спросит ещё раз
        console.warn('[TTS-VOICES] список голосов не пришёл за', VOICES_TIMEOUT_MS, 'мс — отдаю [] без кэша'); // guard-ok: ранний выход пишет причину
        voicesInflight = null;
        return [];
      }
      voicesCache = Array.isArray(list) ? list : [];
      console.log(`[VOICE-NAME] voices:source ${JSON.stringify({ source: 'expo-speech', count: voicesCache.length, sample: voicesCache.slice(0, 3).map((v) => ({ id: v.identifier, name: v.name ?? null, language: v.language, quality: v.quality ?? null })) })}`);
    } catch (error) {
      console.warn('[TTS-VOICES] getAvailableVoicesAsync упал —', error instanceof Error ? error.message : String(error)); // guard-ok: лог причины в catch
      voicesCache = [];
    }
    voicesInflight = null;
    return voicesCache ?? [];
  })();
  return voicesInflight;
}

const voiceNameLogged = new Set<string>();

/** Читаемое имя: «Samantha» без служебных суффиксов (Enhanced)/(Premium).
 *  зачем: одно правило имени для экрана выбора голоса и строки «Голос озвучки (EN)» в Настройках обучения.
 *  зачем (settings-gap-034, координатор 12.10): Android отдаёт в name технический id («en-au-x-aua-local») — такой голос
 *  подписывается «English (Australia) · 2» на языке интерфейса; uiLang и список голосов (для номера) необязательны. */
export function voiceTitle(
  v: FcVoiceLike,
  uiLang?: string,
  voices?: readonly FcVoiceLike[],
  options?: Readonly<{ compact?: boolean }>,
): string {
  const compact = options?.compact === true;
  const name = (v.name ?? '').trim();
  const technical = isTechnicalVoiceName(name, v.identifier);
  let branch: string;
  let title: string;
  if (name && !technical) {
    branch = 'human_name';
    title = name.replace(/\s*\((enhanced|premium)\)\s*/i, '').trim() || name;
  } else if (technical && (name || /^[a-z]{2,3}[-_]/i.test(v.identifier))) {
    branch = 'technical_id_formatted';
    title = technicalVoiceDisplayName(v, uiLang, voices, compact);
  } else {
    // iOS-идентификатор вида com.apple.voice.compact.en-US.Samantha без имени — последний сегмент
    branch = 'identifier_tail';
    const parts = v.identifier.split('.');
    title = parts[parts.length - 1] || v.identifier;
  }
  const logKey = `${v.identifier}|${compact ? 'compact' : 'full'}`;
  if (!voiceNameLogged.has(logKey)) {
    voiceNameLogged.add(logKey);
    console.log(`[VOICE-NAME] ${JSON.stringify({ identifier: v.identifier, name: v.name ?? null, language: v.language, quality: v.quality ?? null, branch, title, compact, uiLang: uiLang ?? null, listSize: voices?.length ?? null })}`);
  }
  return title;
}

/** Только для юнит-тестов: сброс кэша модульного состояния. */
export function __resetTtsVoicesForTests(): void {
  voicesCache = null;
  voicesInflight = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
