import { useCallback, useEffect, useRef } from 'react';
import { speechStudyLanguageOf, STUDY_SPEECH_LOCALE } from '../app/study_speech_locale';
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { getUserSettingsSnapshot, normalizeSpeechRate } from '../app/user_settings_store';
import type * as PhraseAudioPlayer from './phrase_audio_player';
import { voicePlaybackPolicy } from '../modules/audio/voice_playback_policy';
import {
  claimSpokenAudio,
  whenSpokenAudioReady,
  type SpokenAudioClaim,
} from '../modules/audio/audio_runtime_arbiter';
import { phraseAudioClipStartTimeoutMs } from '../modules/audio/phrase_audio_timing';
import { peekEnVoiceId, peekVoiceIdForLocale } from '../app/flashcards/voice_prefs';
import {
  cardTtsLanguageFromSpeechLocale,
  isCardTtsKnownMissing,
  markCardTtsMissing,
  notifyCardVoiceUnavailable,
  resolveCardDeviceVoice,
  resolveCardTtsTarget,
  type CardTtsLanguage,
} from '../app/flashcards/card_tts_audio';
import { getVoicesOnce } from '../app/flashcards/tts_voices';
import { getNetStatus } from '../app/net_status';
import { noteSwallowedHandler } from '../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

export function preloadAudio() {}
export function preloadSound(_text: string) {}

let phraseAudioPlayerModulePromise: Promise<typeof PhraseAudioPlayer> | null = null;

function loadPhraseAudioPlayer(): Promise<typeof PhraseAudioPlayer> {
  phraseAudioPlayerModulePromise ??= import('./phrase_audio_player');
  return phraseAudioPlayerModulePromise;
}

function stopPhraseAudioIfLoaded(): void {
  if (!phraseAudioPlayerModulePromise) return;
  void phraseAudioPlayerModulePromise
    .then(({ stopPhraseAudio }) => stopPhraseAudio())
    .catch(noteSwallowedHandler('use-audio:promise_1'));
}

export type SpeakOpts = {
  pitch?: number;
  language?: string;
  voice?: string;
  /** Optional pronunciation-only text; the visible lesson text stays unchanged. */
  speechText?: string;
  /**
   * cards-2.0 (E13): явный идентификатор голоса (voice picker preview).
   * Без него для en-* подставляется выбранный юзером голос из fc_voice_prefs_v1;
   * uk/ru/es автодетект языка не трогаем — голос применяется только к en.
   */
  voiceId?: string | null;
  /**
   * Dialogues opt in only after a capability receipt selected this exact native
   * voice. Strict callers must never fall back to the device default language.
   */
  strictVoice?: boolean;
  /**
   * D128: это текст карточки. Сначала клип OpenAI на языке карточки
   * (app/flashcards/card_tts_audio.ts); без клипа — голос устройства ТОЛЬКО
   * точного языка, иначе «Голос недоступен» и onError('card_voice_unavailable').
   */
  cardAudio?: boolean;
  /** Skip every prerecorded/corpus route and speak through the device engine. */
  systemTtsOnly?: boolean;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (e: Error) => void;
  /**
   * Граница слова в речи голоса телефона (iOS willSpeakRange, Android onRangeStart): позиция в произносимом тексте и его длина.
   * зачем (владелец 22.10, кольцо кнопки звука «строго по длине аудио»): по границам слов кольцо идёт в темп настоящей речи.
   * Приходит не на всех движках — вызывающий обязан работать и без него.
   */
  onBoundary?: (event: Readonly<{ charIndex: number; charLength: number; textLength: number }>) => void;
};

const UK_MARKERS = /[іїєґІЇЄҐ]/;
const CYRILLIC_RE = /[\u0400-\u04FF]/;
const LATIN_LETTER_RE = /[a-zA-ZÀ-ÖØ-öø-ÿĀ-ž]/;
const STOP_SETTLE_MS = Platform.OS === 'android' ? 80 : 20;
// зачем: TestFlight 115 держал здесь iOS 3500мс при внутреннем download-timeout
// 4500мс и таком же 3500мс watchdog запуска плеера. Внешний fallback отменял
// исправный холодный MP3 раньше доставки/старта и включал системного робота.
// Значение покрывает обе стадии плюс смену audio session и выводится из общего
// timing-контракта, поэтому три таймера больше не могут разъехаться.
const CLIP_START_TIMEOUT_MS = phraseAudioClipStartTimeoutMs(Platform.OS);
type SpeechOptions = NonNullable<Parameters<typeof Speech.speak>[1]>;

function safeSpeechStop() {
  try {
    Speech.stop();
  } catch (error: unknown) {
    // Немой catch запрещён (владелец): неостановленный синтезатор продолжает
    // говорить поверх следующей фразы — и это выглядит как «звук сломался».
    console.warn('[SPEECH] stop_failed', // guard-ok: проглоченная ошибка обязана писать причину
      error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  }
}

function retrySpeechWithoutVoice(
  text: string,
  options: SpeechOptions,
  onError?: (e: Error) => void,
) {
  try {
    Speech.speak(text, {
      ...options,
      voice: undefined,
      onError,
    });
  } catch (e) {
    onError?.(e instanceof Error ? e : new Error(String(e)));
  }
}

/**
 * ISO 639-2 «no linguistic content». зачем (D127): карточки набора «без языка»
 * (столицы, формулы) не озвучиваются. Один маркер из inferExpoSpeechLanguage
 * глушит ВСЕ места озвучки карточек сразу — в т.ч. экраны, которые сами не
 * знают про такие наборы. speak() с этим языком выходит молча (с логом).
 */
export const SILENT_SPEECH_LANGUAGE = 'zxx';

export function inferExpoSpeechLanguage(
  text: string,
  contentLangHint?: string,
): string {
  if (contentLangHint === 'none') return SILENT_SPEECH_LANGUAGE;
  const s = text.trim();
  if (!s) return 'en-US';
  if (UK_MARKERS.test(s)) return 'uk-UA';
  let nCyr = 0;
  let nLat = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (CYRILLIC_RE.test(ch)) nCyr += 1;
    else if (LATIN_LETTER_RE.test(ch)) nLat += 1;
  }
  if (nCyr >= 1 && nCyr >= nLat) return contentLangHint === 'uk' ? 'uk-UA' : 'ru-RU';
  if (nLat >= 1 && nCyr === 0) {
    // зачем (R49/R57, 15.10): одна таблица языков речи на всё приложение (app/study_speech_locale.ts) — микрофоны и озвучка
    // не расходятся. Итальянский (D130) и прочие — оттуда; подсказка 'es-MX'/'ES' тоже понимается.
    return STUDY_SPEECH_LOCALE[speechStudyLanguageOf(contentLangHint) ?? 'en'];
  }
  return 'en-US';
}

export function speechLocaleToShortLabel(locale: string): string {
  const x = locale.trim().toLowerCase();
  if (x.startsWith('uk')) return 'UK';
  if (x.startsWith('ru')) return 'RU';
  if (x.startsWith('es')) return 'ES';
  if (x.startsWith('fr')) return 'FR';
  if (x.startsWith('de')) return 'DE';
  if (x.startsWith('it')) return 'IT';
  return 'EN';
}

export function useAudio() {
  const lastTextRef = useRef('');
  const lastSpeakAtRef = useRef(0);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clipStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechGenerationRef = useRef(0);
  const speechClaimRef = useRef<SpokenAudioClaim | null>(null);

  const stopSystemSpeechNow = useCallback(() => {
    speechGenerationRef.current += 1;
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = null;
    if (clipStartTimerRef.current) clearTimeout(clipStartTimerRef.current);
    clipStartTimerRef.current = null;
    safeSpeechStop();
    speechClaimRef.current?.release();
    speechClaimRef.current = null;
  }, []);

  const stopVoiceNow = useCallback(() => {
    stopSystemSpeechNow();
    stopPhraseAudioIfLoaded();
  }, [stopSystemSpeechNow]);

  useEffect(() => {
    const unregisterVoiceStop = voicePlaybackPolicy.registerStop(stopVoiceNow);
    return () => {
      unregisterVoiceStop();
      stopVoiceNow();
      lastTextRef.current = '';
    };
  }, [stopVoiceNow]);

  const stop = useCallback(() => {
    stopVoiceNow();
    lastTextRef.current = '';
    lastSpeakAtRef.current = 0;
  }, [stopVoiceNow]);

  const speak = useCallback((text: string, rate?: number, opts?: SpeakOpts) => {
    const normalized = text?.trim();
    // зачем («Family», 04.10: «Не воспроизводится запись» со страницы набора): сперва логи — каждый немой ранний выход speak пишет причину.
    if (!normalized) {
      console.warn('[PACK-AUDIO] speak:skip empty_text', JSON.stringify({ cardAudio: !!opts?.cardAudio, language: opts?.language ?? null }));
      return;
    }
    if (opts?.language?.trim().toLowerCase() === SILENT_SPEECH_LANGUAGE) {
      console.log(`[PACK-LANG] speak:skip language="${SILENT_SPEECH_LANGUAGE}" — карточка набора без языка не озвучивается`);
      return;
    }
    const voicePolicyToken = voicePlaybackPolicy.captureStart();
    if (voicePolicyToken === null) {
      console.warn('[PACK-AUDIO] speak:skip voice_disabled — тумблер «Озвучивание» выключен', JSON.stringify({ cardAudio: !!opts?.cardAudio, chars: normalized.length }));
      return;
    }

    const spokenText = opts?.speechText?.trim() || normalized;

    const now = Date.now();
    const dedupeKey = `${normalized}\u0000${spokenText}`;
    if (dedupeKey === lastTextRef.current && now - lastSpeakAtRef.current < 220) {
      console.warn(`[WORD-AUDIO] speak:dedupe_skip text=${JSON.stringify(normalized.slice(0, 40))} sinceLastMs=${now - lastSpeakAtRef.current}`);
      return;
    }

    speechGenerationRef.current += 1;
    const generation = speechGenerationRef.current;
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = null;
    if (clipStartTimerRef.current) clearTimeout(clipStartTimerRef.current);
    clipStartTimerRef.current = null;
    safeSpeechStop();
    stopPhraseAudioIfLoaded();

    lastTextRef.current = dedupeKey;
    lastSpeakAtRef.current = now;
    // зачем (§126, «озвучка слов урока 9 заикается»): сперва логи. Один вызов speak должен дать РОВНО один голос — либо клип, либо системный.
    // Подозрение: пока клип грузится, таймер запуска отдаёт озвучку системному голосу, а клип потом всё равно стартует → два голоса подряд.
    console.warn(`[WORD-AUDIO] speak:enter gen=${generation} text=${JSON.stringify(normalized.slice(0, 40))}`);

    const settings = getUserSettingsSnapshot();
    // зачем: скорость применяется ТОЛЬКО к системному TTS. Готовые клипы озвучки
    // играют в оригинальной длине (решение владельца 2026-08-24) — им safeRate
    // не передаётся, см. playPhraseByText ниже и phrase_audio_player.ts.
    const safeRate = normalizeSpeechRate(rate ?? settings.speechRate);
    const language = opts?.language?.trim() || inferExpoSpeechLanguage(spokenText);
    // cards-2.0 (E13): voiceId — алиас voice для voice picker карточек. Явный
    // opts (в т.ч. null = «системный») всегда сильнее; иначе для en берём голос
    // из настроек, а если он не задан — выбранный в разделе карточек.
    const hasVoiceOverride =
      !!opts &&
      (Object.prototype.hasOwnProperty.call(opts, 'voice') ||
        Object.prototype.hasOwnProperty.call(opts, 'voiceId'));
    const settingsVoice = settings.speechVoiceId.trim();
    const requestedVoice = hasVoiceOverride
      ? (opts.voice ?? opts.voiceId ?? '').trim()
      // зачем (Ревизор 15.10): у es/fr/de/it теперь свой выбранный голос (voice_prefs, отдельный ключ); английский — как раньше
      : (language.toLowerCase().startsWith('en')
        ? settingsVoice || (peekEnVoiceId() ?? '').trim()
        : (peekVoiceIdForLocale(language) ?? '').trim());

    // Prefer the high-quality OpenAI "echo" clip when one exists for this exact
    // text, the language is English (clips are EN-only), and the caller did not
    // force a specific system voice. Falls back to expo-speech on any miss/error.
    if (opts?.strictVoice && !requestedVoice) {
      console.warn('[PACK-AUDIO] speak:skip strict_voice_missing', JSON.stringify({ language }));
      opts.onError?.(new Error('strict_dialogue_voice_missing'));
      return;
    }
    if (opts?.systemTtsOnly) {
      speakWithSystemTts();
      return;
    }
    const isEnglish = language.toLowerCase().startsWith('en');
    const canUseClip = isEnglish && !requestedVoice;
    // зачем: D128 — карточка звучит клипом OpenAI своего языка. Английская
    // карточка с явно выбранным системным голосом уважает выбор пользователя.
    const cardLanguage: CardTtsLanguage | null = opts?.cardAudio ? cardTtsLanguageFromSpeechLocale(language) : null;
    if (opts?.cardAudio) {
      console.log('[PACK-AUDIO] speak:route', JSON.stringify({ language, cardLanguage, requestedVoice: requestedVoice || null, path: cardLanguage && !(cardLanguage === 'en' && requestedVoice) ? 'card_clip' : 'default_voice' }));
      // Ревизор 15.10: чем реально звучит карточка — клип, выбранный голос языка или системный (одна строка на озвучку)
      console.log('[FC-TTS]', JSON.stringify({ lang: language, voice: requestedVoice || null, source: cardLanguage && !(cardLanguage === 'en' && requestedVoice) ? 'card_clip' : requestedVoice ? (hasVoiceOverride ? 'caller' : 'chosen') : 'system' })); // guard-ok: одна строка на озвучку карточки
    }
    if (cardLanguage && !(cardLanguage === 'en' && requestedVoice)) {
      void playCardAudio(cardLanguage);
      return;
    }
    runDefaultVoicePath();

    function isStale(): boolean {
      return speechGenerationRef.current !== generation || !voicePlaybackPolicy.canStart(voicePolicyToken);
    }

    async function playCardAudio(cardLang: CardTtsLanguage): Promise<void> {
      let target: Awaited<ReturnType<typeof resolveCardTtsTarget>> = null;
      try {
        target = await resolveCardTtsTarget(cardLang, spokenText);
      } catch (e: unknown) {
        console.warn('[CARD-TTS] target:hash_failed', JSON.stringify({ cardLang, error: e instanceof Error ? e.message : String(e) })); // guard-ok: проглоченная ошибка пишет причину
      }
      if (isStale()) return;
      if (!target) {
        console.log('[CARD-TTS] clip:skip no_target', JSON.stringify({ cardLang, chars: spokenText.length }));
      } else if (isCardTtsKnownMissing(target.key)) {
        console.log('[CARD-TTS] clip:skip known_missing', JSON.stringify({ cardLang, key: target.key }));
      } else {
        let fellBack = false;
        const fallback = (why: string) => {
          if (fellBack || isStale()) return;
          fellBack = true;
          console.log('[CARD-TTS] clip:fallback', JSON.stringify({ cardLang, key: target?.key, why }));
          void speakCardWithDevice(cardLang);
        };
        try {
          const { playCardClipUrl, hasPhraseAudio } = await loadPhraseAudioPlayer();
          if (isStale()) return;
          // Английская карточка, уже озвученная корпусом фраз (тот же голос echo):
          // играем его сразу, без лишнего запроса в Storage.
          if (cardLang === 'en' && hasPhraseAudio(normalized)) {
            console.log('[CARD-TTS] clip:use_phrase_corpus', JSON.stringify({ chars: normalized.length }));
            runDefaultVoicePath();
            return;
          }
          const played = await playCardClipUrl(target.cacheKey, target.url, {
            onStart: opts?.onStart,
            onDone: opts?.onDone,
            onError: () => fallback('player_error'),
          });
          if (played) return;
          // Промах запоминаем только при живой сети: офлайн клип мог просто не скачаться.
          if (getNetStatus() !== 'offline') markCardTtsMissing(target.key);
        } catch (e: unknown) {
          console.warn('[CARD-TTS] clip:play_failed', JSON.stringify({ cardLang, error: e instanceof Error ? e.message : String(e) })); // guard-ok: проглоченная ошибка пишет причину
        }
        if (isStale()) return;
        fallback('clip_missing');
        return;
      }
      await speakCardWithDevice(cardLang);
    }

    async function speakCardWithDevice(cardLang: CardTtsLanguage): Promise<void> {
      if (isStale()) return;
      if (cardLang === 'en') {
        // Английский: прежний путь (клип корпуса фраз → системный голос).
        runDefaultVoicePath();
        return;
      }
      let voices: Awaited<ReturnType<typeof getVoicesOnce>> = [];
      try {
        voices = await getVoicesOnce();
      } catch (e: unknown) {
        console.warn('[CARD-TTS] device:voices_failed', e instanceof Error ? e.message : String(e)); // guard-ok: проглоченная ошибка пишет причину
      }
      if (isStale()) return;
      const route = resolveCardDeviceVoice(cardLang, voices);
      if (!route.available) {
        notifyCardVoiceUnavailable(cardLang, route.reason);
        opts?.onError?.(new Error('card_voice_unavailable'));
        return;
      }
      console.log('[CARD-TTS] device:speak', JSON.stringify({ cardLang, locale: route.locale }));
      speakWithSystemTts(route.locale);
    }

    function runDefaultVoicePath() {
    if (canUseClip) {
      // Single fallback trigger: the promise resolves false on any failure
      // (including the internal catch that also reports onError), so we fall
      // back here exactly once and never double-speak.
      let fellBack = false;
      let clipStartTimer: ReturnType<typeof setTimeout> | null = null;
      const clearClipStartTimer = () => {
        if (clipStartTimer) clearTimeout(clipStartTimer);
        if (clipStartTimerRef.current === clipStartTimer) clipStartTimerRef.current = null;
        clipStartTimer = null;
      };
      const fallbackOnce = (reason: string) => {
        if (
          speechGenerationRef.current !== generation
          || !voicePlaybackPolicy.canStart(voicePolicyToken)
        ) {
          clearClipStartTimer();
          return;
        }
        if (fellBack) return;
        fellBack = true;
        console.warn(`[WORD-AUDIO] clip:fallback_to_system gen=${generation} reason=${reason} text=${JSON.stringify(normalized.slice(0, 40))}`);
        clearClipStartTimer();
        stopPhraseAudioIfLoaded();
        speakWithSystemTts();
      };
      clipStartTimer = setTimeout(() => fallbackOnce('start_timeout'), CLIP_START_TIMEOUT_MS);
      clipStartTimerRef.current = clipStartTimer;
      void loadPhraseAudioPlayer()
        .then(({ hasPhraseAudio, playPhraseByText }) => {
          if (
            fellBack
            || speechGenerationRef.current !== generation
            || !voicePlaybackPolicy.canStart(voicePolicyToken)
          ) return false;
          if (!hasPhraseAudio(normalized)) return false;
          return playPhraseByText(
            normalized,
            {
              onStart: () => {
                // fellBack=true здесь = ДВА ГОЛОСА: системный уже заговорил, а клип всё же стартовал
                console.warn(`[WORD-AUDIO] clip:onStart gen=${generation} fellBackAlready=${fellBack} text=${JSON.stringify(normalized.slice(0, 40))}`);
                clearClipStartTimer();
                opts?.onStart?.();
              },
              onDone: opts?.onDone,
              onError: () => fallbackOnce('player_error'),
            },
          );
        })
        .then((played) => {
          clearClipStartTimer();
          if (!played) fallbackOnce('not_played');
        })
        .catch((error: unknown) => fallbackOnce(`catch:${error instanceof Error ? error.message : String(error)}`));
      return;
    }

    speakWithSystemTts();
    }

    function speakWithSystemTts(localeOverride?: string) {
      if (
        speechGenerationRef.current !== generation
        || !voicePlaybackPolicy.canStart(voicePolicyToken)
      ) return;
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = setTimeout(() => {
        pendingTimerRef.current = null;
        if (
          speechGenerationRef.current !== generation
          || !voicePlaybackPolicy.canStart(voicePolicyToken)
        ) return;
        speechClaimRef.current?.release();
        const speechClaim = claimSpokenAudio(stopSystemSpeechNow, 'use-audio:system-tts');
        if (!speechClaim) {
          // зачем (2026-09-14): претензия на голос не выдаётся, пока аудиотракт
          // в режиме записи — озвучка молча пропадала (эхо эталона после
          // оценки). Пишем причину; сам отказ не ломает вызывающего.
          console.warn('[SPEAK-MIC] tts:skip', JSON.stringify({ reason: 'claim_refused_recording_active', text: spokenText })); // guard-ok: трасса владельца, только на отказе
          return;
        }
        speechClaimRef.current = speechClaim;
        const releaseSpeechClaim = () => {
          speechClaim.release();
          if (speechClaimRef.current === speechClaim) speechClaimRef.current = null;
        };
        void whenSpokenAudioReady(speechClaim).then((audioReady) => {
          if (
            !audioReady
            || speechGenerationRef.current !== generation
            || !voicePlaybackPolicy.canStart(voicePolicyToken)
          ) {
            if (!audioReady) console.warn('[SPEAK-MIC] tts:skip', JSON.stringify({ reason: 'audio_not_ready', text: spokenText })); // guard-ok: трасса владельца, только на отказе
            releaseSpeechClaim();
            return;
          }
          if (lastTextRef.current !== dedupeKey) {
            releaseSpeechClaim();
            return;
          }
          /**
           * Страховка завершения речи.
           *
           * зачем (жалобы «пропадает озвучка», аудит 2026-09-15): аренда голоса
           * освобождалась ИСКЛЮЧИТЕЛЬНО колбэками expo-speech. Если движок не
           * присылал ни одного (обрыв нативной сессии, отзыв фокуса, редкий
           * Android-баг), аренда висела вечно: озвучка по всему приложению
           * молчала, эффекты глушились как «идёт речь», лечил перезапуск.
           * Страховка спрашивает у движка ФАКТ (`isSpeakingAsync`), а не гадает
           * по длине текста: оценка «столько-то миллисекунд на символ» врёт при
           * замедленной речи и на длинных репликах диалога, и такая страховка
           * отбирала бы аренду у ЖИВОЙ озвучки — регресс вместо починки. Пока
           * движок отвечает «говорю», проверка откладывается; аренда снимается,
           * только когда речи фактически нет, а колбэк так и не пришёл. Отказ
           * опроса трактуем в пользу пользователя: считаем, что речь идёт, и
           * ждём дальше — худшее, что случится, это срабатывание общего
           * предохранителя аренды.
           */
          const SPEECH_PROBE_MS = 4_000;
          let speechGuard: ReturnType<typeof setTimeout> | null = null;
          let speechSettled = false;
          const armSpeechProbe = () => {
            speechGuard = setTimeout(() => {
              speechGuard = null;
              if (speechSettled) return;
              void Speech.isSpeakingAsync()
                .then((speaking) => {
                  if (speechSettled) return;
                  if (speaking) {
                    armSpeechProbe();
                    return;
                  }
                  console.warn('[AUDIO-LEASE] tts:completion-guard', JSON.stringify({
                    chars: spokenText.length,
                    reason: 'engine_idle_without_callback',
                  })); // guard-ok: срабатывание = движок молча бросил речь
                  speechSettled = true;
                  releaseSpeechClaim();
                })
                .catch((e: unknown) => {
                  console.warn('[AUDIO-LEASE] tts:probe-failed', JSON.stringify({
                    error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
                  })); // guard-ok: только отказ опроса
                  if (!speechSettled) armSpeechProbe();
                });
            }, SPEECH_PROBE_MS);
            // В React Native unref отсутствует — опциональный вызов это учитывает.
            (speechGuard as unknown as { unref?: () => void }).unref?.();
          };
          armSpeechProbe();
          const settleSpeech = () => {
            speechSettled = true;
            if (speechGuard != null) clearTimeout(speechGuard);
            speechGuard = null;
            releaseSpeechClaim();
          };
          const finalError = (e: Error) => {
            settleSpeech();
            opts?.onError?.(e);
          };
          const speechOptions: SpeechOptions = {
            language: localeOverride ?? language,
            ...(requestedVoice ? { voice: requestedVoice } : {}),
            rate: safeRate,
            pitch: opts?.pitch ?? 1,
            volume: 1,
            onStart: opts?.onStart,
            onDone: () => {
              settleSpeech();
              opts?.onDone?.();
            },
            onStopped: () => {
              settleSpeech();
              opts?.onStopped?.();
            },
            // зачем (кольцо звука): позиция — в произносимом тексте (spokenText), поэтому вместе с ней отдаём и его длину
            ...(opts?.onBoundary
              ? { onBoundary: (event: { charIndex: number; charLength: number }) => opts.onBoundary?.({ charIndex: event.charIndex, charLength: event.charLength, textLength: spokenText.length }) }
              : {}),
            onError: requestedVoice
              ? (e: Error) => {
                  if (!voicePlaybackPolicy.canStart(voicePolicyToken)) {
                    settleSpeech();
                    return;
                  }
                  if (opts?.strictVoice) {
                    finalError(e);
                    return;
                  }
                  retrySpeechWithoutVoice(spokenText, speechOptions, finalError);
                }
              : finalError,
            ...(Platform.OS === 'ios' ? { useApplicationAudioSession: false as const } : {}),
          };
          try {
            Speech.speak(spokenText, speechOptions);
          } catch (e) {
            if (requestedVoice) {
              if (opts?.strictVoice) {
                finalError(e instanceof Error ? e : new Error(String(e)));
                return;
              }
              if (voicePlaybackPolicy.canStart(voicePolicyToken)) {
                retrySpeechWithoutVoice(spokenText, speechOptions, finalError);
              } else {
                settleSpeech();
              }
            } else {
              finalError(e instanceof Error ? e : new Error(String(e)));
            }
          }
        });
      }, STOP_SETTLE_MS);
    }
  }, [stopSystemSpeechNow]);

  return { speak, stop };
}
