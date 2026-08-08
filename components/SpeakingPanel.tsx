import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { File } from 'expo-file-system';
import * as Speech from 'expo-speech';

import { LOUD_PLAYBACK_AUDIO_MODE, SPEAKING_RECORDING_AUDIO_MODE } from '../app/audio_playback_mode';
import { setManagedAudioMode } from '../app/audio_session_coordinator';
import { voicePlaybackPolicy } from '../modules/audio/voice_playback_policy';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { VoiceEqualizer, type VoiceEqualizerRef } from '../app/voice_equalizer';
import {
  PLAN_PRONUNCIATION_PASS_THRESHOLD,
  scorePlanPronunciationTranscript,
} from '../app/personal_plan_pronunciation_scoring_client';
import {
  normalizeSpokenWord,
  speakingMatchedFlags,
  speakingTargetTokens,
} from '../app/speaking_word_match';
import {
  buildControlRecognitionOptions,
  buildSpeakingStartOptions,
} from '../app/speaking_recognition_options';
import { applyControlScore } from '../app/speaking_honesty_check';
import {
  buildSpeakingHint,
  speakingBand,
  speakingBandLabel,
  speakingHintText,
  type SpeakingBand,
  type SpeakingHint,
} from '../app/speaking_score_bands';
import {
  buildSpokenWordReport,
  firstSoundHint,
  maskSpokenWordKeepInitial,
  type SpokenWordEntry,
} from '../app/speaking_word_report';
import {
  judgeSingleWord,
  isDrillableStatus,
  effectivePhraseScore,
  type WordDrillVerdict,
} from '../app/speaking_word_drill';
import {
  initWordDrillState,
  openWord,
  closeWord,
  markWordClean,
  type WordDrillState,
} from '../app/speaking_word_drill_state';
import {
  ensureNeuralModel,
  isNeuralJudgeSupported,
  isNeuralModelReady,
  judgeWithNeuralEngine,
} from '../app/speaking_neural_judge';
import {
  deleteHoldRecording,
  isHoldRecordingSupported,
  startHoldRecording,
  type HoldRecording,
} from '../app/speaking_hold_recorder';
import { TranscriptAccumulator } from '../app/speaking_transcript_accumulator';
import {
  analyzeProsody,
  expectedStressPosition,
  stressFeedback,
  type LoudnessSample,
} from '../app/speaking_prosody';
import SpeakingScoreStars from './SpeakingScoreStars';
import {
  STAR_COUNT,
  starsForScore,
} from '../app/speaking_score_stars';
import { useSpeakingInlineMetrics } from './SpeakingInlineSlot';
import { WordDrillCard } from './WordDrillCard';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useRecordStartCue } from '../hooks/use-record-start-cue';
import { useNoSpeechCue } from '../hooks/use-no-speech-cue';
import {
  isSpeechRecognitionAvailable,
  requestSpeechPermissionForHold,
  type HoldPermissionResult,
} from '../app/personal_plan_speech_module';

// Вернуть аудио-сессию в «громкое воспроизведение». Распознавание переводит её
// в запись (playAndRecord) — без сброса всё, что играет после (эталон, «Моя
// запись», mp3 в уроках), выходит тихим/через разговорный динамик или молчит.
function restoreLoudPlaybackMode(): void {
  void setManagedAudioMode(LOUD_PLAYBACK_AUDIO_MODE).catch(() => undefined);
}

// Запись попытки живёт до следующей попытки/закрытия панели — дальше это мусор,
// копящийся в кэше (wav на каждую попытку каждого юзера).
function deleteRecordingFile(uri: string | null): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    /* файл могли уже убрать/переместить — не критично */
  }
}

/**
 * SpeakingPanel — premium "say it out loud" practice surface.
 *
 * Self-contained: owns mic permission, on-device speech recognition, the live
 * waveform, word-by-word highlighting and scoring. Drop it anywhere (lesson /
 * quiz / trainer / personal plan) and it manages its own lifecycle. The host
 * only supplies the target phrase and is told when the attempt passes.
 *
 * Оценка честная и конкретная (всё локально, без платных серверов):
 *  - после КАЖДОЙ попытки — пословная карта: зелёный чисто / жёлтый нечётко /
 *    красный не прозвучало (speaking_word_report);
 *  - короткий поддерживающий вердикт по уровню оценки + ОДНА конкретная
 *    подсказка, что тянет балл вниз (speaking_score_bands);
 *  - контрольный прогон: сохранённое аудио попытки распознаётся повторно БЕЗ
 *    подсказки цели; балл не может превышать вердикт нейтрального движка
 *    больше чем на допуск (speaking_honesty_check) — biasing не «дарит» зачёт;
 *  - «Моя запись» ↔ «Эталон»: сравнение своей записи с TTS-эталоном на слух.
 *
 * Premium gating is the host's job: only render this when the user tapped the
 * "Устно" button AND has premium. Free users get routed to the paywall by the
 * host before this ever mounts.
 */

export type SpeakingPanelStatus =
  | 'idle'
  | 'requesting'
  | 'listening'
  | 'scoring'
  | 'passed'
  | 'failed'
  | 'no_speech'
  | 'denied'
  | 'unavailable'
  // Android: движок принял start(), но так и не начал слушать (сервис завис /
  // холодный старт / нет языковой модели). Watchdog выводит из вечного спиннера
  // «Готовимся слушать…» в понятную ошибку с кнопкой «Повторить».
  | 'stalled';

export interface SpeakingPanelTheme {
  bg: string;
  card: string;
  textPrimary: string;
  textSecond: string;
  textMuted: string;
  accent: string;
  correct: string;
  wrong: string;
  border: string;
  /** Текст/иконка на залитых accent/correct кнопках (в моно-теме accent белый → нужен тёмный текст). */
  onAccent: string;
  /** Цвет «нечётко» в пословной карте (жёлтый). Опционален — есть фолбэк. */
  warn?: string;
}

/** Фолбэк «нечёткого» жёлтого: янтарь читается и на тёмных, и на светлых темах. */
const WARN_COLOR_FALLBACK = '#E6A23C';
const INLINE_GOOD_COLOR = '#F2C94C';
const INLINE_ALMOST_COLOR = '#F2994A';

export function inlineSpeakingResultColor(
  band: SpeakingBand,
  theme: Pick<SpeakingPanelTheme, 'correct' | 'wrong'>,
): string {
  if (band === 'excellent') return theme.correct;
  if (band === 'good') return INLINE_GOOD_COLOR;
  if (band === 'almost') return INLINE_ALMOST_COLOR;
  return theme.wrong;
}

/** Subset of the app theme that the speaking panel needs. */
export interface SpeakingPanelThemeSource {
  bgPrimary: string;
  bgCard: string;
  textPrimary: string;
  textSecond: string;
  textMuted: string;
  accent: string;
  correct: string;
  wrong: string;
  border: string;
  correctText: string;
}

/**
 * Canonical mapping from the app theme to a SpeakingPanelTheme.
 * Single source of truth so every host (lessons / quizzes / trainer / QA lab)
 * builds the panel theme identically instead of duplicating the object.
 */
export function buildSpeakingPanelTheme(t: SpeakingPanelThemeSource): SpeakingPanelTheme {
  return {
    bg: t.bgPrimary,
    card: t.bgCard,
    textPrimary: t.textPrimary,
    textSecond: t.textSecond,
    textMuted: t.textMuted,
    accent: t.accent,
    correct: t.correct,
    wrong: t.wrong,
    border: t.border,
    onAccent: t.correctText,
  };
}

export interface SpeakingPanelProps {
  /** Canonical target phrase the user must say (English). */
  targetText: string;
  /** UI language for the labels. */
  lang: string;
  theme: SpeakingPanelTheme;
  /** BCP-47 recognition locale. Defaults to en-US (study target is English). */
  recognitionLocale?: string;
  /** Called when the spoken attempt reaches the pass threshold. */
  onPass?: (result: { score: number; transcript: string }) => void;
  /** Called after every scored attempt, including a failed pronunciation. */
  onScore?: (result: { score: number; passed: boolean }) => void;
  /**
   * Called on «Готово» after a passing attempt with the phrase to drop into the
   * lesson's answer field (so the user can then press «Проверить»). The host
   * decides what to fill; we pass the canonical target text (clean, guaranteed
   * to pass the lesson check) rather than the raw transcript.
   */
  onFillAnswer?: (text: string) => void;
  /** Called when the user closes the panel. */
  onClose: () => void;
  /**
   * DEV/QA only. When set, the panel mounts in this status and the mic is
   * inert (no permission request, no native speech module) so every visual
   * state can be inspected from the in-app admin lab. Has no effect in normal
   * use — production hosts never pass it.
   */
  previewStatus?: SpeakingPanelStatus;
  /** DEV/QA only. Fixed score shown for the passed/failed preview states. */
  previewScore?: number;
  /**
   * DEV/QA only. Force the Android "press-and-hold" LOOK while previewing from
   * any platform (so the admin lab can show the hold button / hold status texts
   * from an iPhone). Visual only — the mic and whisper stay inert in preview;
   * this never arms recording. `'preparing'` shows the one-time model-download
   * state. Ignored outside preview (production hosts never pass it).
   */
  previewHoldMode?: boolean | 'preparing';
  /** Embedded in an exercise's fixed reserved slot; never opens a Modal. */
  presentation?: 'modal' | 'inline';
  /** Controlled by the host's existing press-and-hold voice button. */
  holdActive?: boolean;
}

type SpeechModule = {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  getPermissionsAsync?: () => Promise<{ granted: boolean }>;
  start: (opts: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  addListener: (event: string, cb: (payload: any) => void) => { remove?: () => void } | undefined;
  supportsOnDeviceRecognition?: () => boolean | Promise<boolean>;
  isRecognitionAvailable?: () => boolean;
};

// expo-speech-recognition is a native module; require lazily so the panel can
// degrade gracefully (status 'unavailable') if the dev build lacks it.
function loadSpeechModule(): SpeechModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-speech-recognition');
    const native = mod?.ExpoSpeechRecognitionModule ?? null;
    if (!native || typeof native.addListener !== 'function' || typeof native.start !== 'function') {
      return null;
    }
    return native as SpeechModule;
  } catch {
    return null;
  }
}

const L = (lang: string, map: Record<string, string>): string =>
  map[lang] ?? map.ru ?? Object.values(map)[0] ?? '';

export function SpeakingPanel({
  targetText,
  lang,
  theme,
  recognitionLocale = 'en-US',
  onPass,
  onScore,
  onFillAnswer,
  onClose,
  previewStatus,
  previewScore,
  previewHoldMode,
  presentation = 'modal',
  holdActive = false,
}: SpeakingPanelProps) {
  const inlineMetrics = useSpeakingInlineMetrics();
  const isPreview = previewStatus != null;
  // In preview mode the native speech module is never touched, so permission
  // prompts and recognition stay inert while the visual state is inspected.
  const speech = useMemo(() => (isPreview ? null : loadSpeechModule()), [isPreview]);
  // зачем: панель живёт внутри упражнения и при сворачивании приложения НЕ размонтируется —
  // нужен явный сигнал «приложение ушло в фон», чтобы отпустить микрофон (см. эффект ниже).
  const runtimeActive = useRuntimeActive();
  const runtimeActiveRef = useRef(runtimeActive);
  runtimeActiveRef.current = runtimeActive;
  const { playRecordStart } = useRecordStartCue();
  const { playNoSpeech } = useNoSpeechCue();
  const [status, setStatus] = useState<SpeakingPanelStatus>(previewStatus ?? 'idle');
  const statusRef = useRef<SpeakingPanelStatus>(previewStatus ?? 'idle');
  statusRef.current = status;
  const [transcript, setTranscript] = useState('');
  // Пословная карта попытки (чисто/нечётко/пропущено) — показывается после
  // КАЖДОЙ оценённой попытки, и на passed, и на failed.
  const [wordReport, setWordReport] = useState<SpokenWordEntry[] | null>(null);
  // Одна конкретная подсказка «что тянет балл вниз» (самая важная проблема).
  const [hint, setHint] = useState<SpeakingHint | null>(null);
  // Тренировка слов: какое слово карты открыто и какие уже «дочинены» до зелёного.
  const [drill, setDrill] = useState<WordDrillState>(() => initWordDrillState());
  // Локальные переопределения статуса слов после дрилла: index → 'clean'. Живут
  // поверх wordReport, чтобы «дочиненное» слово стало зелёным в карте, не
  // трогая исходный отчёт попытки.
  const [drillCleaned, setDrillCleaned] = useState<ReadonlySet<number>>(() => new Set<number>());
  // Состояние карточки открытого слова: готов / пишу / проверяю / вердикт.
  type WordCardPhase = 'idle' | 'requesting' | 'listening' | 'scoring' | 'clean' | 'fuzzy' | 'no_speech';
  const [wordPhase, setWordPhase] = useState<WordCardPhase>('idle');
  const wordPhaseRef = useRef<WordCardPhase>('idle');
  wordPhaseRef.current = wordPhase;
  const [wordVerdict, setWordVerdict] = useState<WordDrillVerdict | null>(null);
  // «Фраза идеальна»: показать раз, когда ВСЕ проблемные слова стали зелёными.
  const [phrasePerfect, setPhrasePerfect] = useState(false);
  // Одиночная запись слова живёт в своём наборе слушателей / hold-рекордере,
  // чтобы не пересекаться с фразовой сессией.
  const wordListenersRef = useRef<Array<{ remove?: () => void }>>([]);
  const wordWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordSystemPressActiveRef = useRef(false);
  const wordHoldRecRef = useRef<HoldRecording | null>(null);
  const wordFinishingRef = useRef(false);
  // Авто-переход: после «чисто» карточка сама открывает СЛЕДУЮЩЕЕ проблемное
  // слово (жёлтое/красное) и озвучивает его эталон. Таймер даёт увидеть «Чисто!»
  // и услышать салют перед прыжком; снимается при закрытии карточки/анмаунте/
  // ручном переключении, чтобы не открыть слово после ухода пользователя.
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref на «открыть слово и озвучить его эталон». Ref, а не прямой вызов, чтобы
  // markCleanedWord (объявлен выше по файлу) не зависел от speakWord/onTapWord
  // (объявлены ниже) и не тянул их в свои зависимости.
  const advanceToWordRef = useRef<((index: number) => void) | null>(null);
  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceRef.current != null) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
  }, []);
  // Гард: onPass по «фраза дотянута тренировкой до идеала» шлём хосту только раз
  // за попытку (иначе повторные пометки чистого слова дёрнули бы success ещё раз).
  const passedNotifiedRef = useRef(false);
  // uri сохранённой записи попытки (событие audioend) — питает «Мою запись»
  // и контрольный прогон без подсказки цели.
  const recordingUriRef = useRef<string | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  // Плеер повтора своей записи; пересоздаётся на каждый тап, гасится на анмаунте.
  const replayPlayerRef = useRef<AudioPlayer | null>(null);
  // Токен последнего запроса воспроизведения (эталон / слово / «Моя запись»).
  // Каждый тап инкрементирует его. Переключение аудиорежима асинхронно, поэтому
  // фактический speak()/play() отложен в .finally(); к этому моменту мог прилететь
  // новый тап. Сверяем токен — говорит/играет ТОЛЬКО последний запрос, промежуточные
  // тихо отваливаются. Без этого параллельные тапы перетасовывали stop/speak и
  // обрывали друг друга («ломали» озвучку).
  const playbackTokenRef = useRef(0);
  useEffect(() => voicePlaybackPolicy.registerStop(() => {
    playbackTokenRef.current += 1;
    try { Speech.stop(); } catch {}
  }), []);
  // Гард от двойного финиша: end и error могут прийти оба, а финиш теперь
  // асинхронный (контрольный прогон) — второй вызов запустил бы его дважды.
  const finishingRef = useRef(false);
  // Equalizer is driven IMPERATIVELY via a ref (setSample) so each ~250ms
  // volumechange sample does NOT re-render the whole modal — that re-render storm
  // was the source of the equalizer lag. Mirrors personal_plan_exercise.
  const equalizerRef = useRef<VoiceEqualizerRef>(null);
  const [score, setScore] = useState<number | null>(
    isPreview && (previewStatus === 'passed' || previewStatus === 'failed')
      ? previewScore ?? (previewStatus === 'passed' ? 97 : 45)
      : null,
  );
  const listenersRef = useRef<Array<{ remove?: () => void }>>([]);
  const audioEndSubRef = useRef<{ remove?: () => void } | null>(null);
  const mountedRef = useRef(true);
  const captureGenerationRef = useRef(0);
  const controlPassCancelRef = useRef<(() => void) | null>(null);
  const systemHoldPressActiveRef = useRef(false);
  // Watchdog: на Android нативный распознаватель может принять start(), но так и
  // не прислать НИ start, НИ result, НИ error (занятый/холодный сервис, нет
  // языковой модели). Без таймера экран навис бы навсегда на «Готовимся
  // слушать…». Таймер снимается, как только пришёл ЛЮБОЙ признак жизни движка.
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current != null) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);
  // Loudness contour for prosody (rhythm/stress) — collected from volumechange.
  const prosodySamplesRef = useRef<LoudnessSample[]>([]);
  const attemptStartRef = useRef(0);

  const tokens = useMemo(() => speakingTargetTokens(targetText), [targetText]);
  const matched = useMemo(
    () => speakingMatchedFlags(targetText, transcript),
    [targetText, transcript],
  );
  // Конкретный звук («/TH/ вместо /S/ в think») из пословной карты.
  const soundHint = useMemo(() => (wordReport ? firstSoundHint(wordReport) : null), [wordReport]);

  const cleanupListeners = useCallback(() => {
    listenersRef.current.forEach((sub) => sub?.remove?.());
    listenersRef.current = [];
  }, []);
  const cleanupAudioEndListener = useCallback(() => {
    audioEndSubRef.current?.remove?.();
    audioEndSubRef.current = null;
  }, []);

  // Ждём uri записи: audioend может прийти на долю секунды позже end. Ожидание
  // короткое, чтобы «Проверяю…» не подвисало, когда записи нет вовсе.
  const waitForRecordingUri = useCallback(async (maxMs: number): Promise<string | null> => {
    const startedAt = Date.now();
    while (!recordingUriRef.current && Date.now() - startedAt < maxMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return recordingUriRef.current;
  }, []);

  // Контрольный прогон честности: распознаём СОХРАНЁННОЕ аудио попытки БЕЗ
  // подсказки цели (никаких contextualStrings). Возвращает лучший балл
  // нейтрального движка против цели, или null когда прогон не дал пригодного
  // текста (ошибка/таймаут инфраструктуры — не вина говорящего, не штрафуем).
  const runControlPass = useCallback(
    async (uri: string, captureGeneration: number): Promise<number | null> => {
      // Уровень B: сначала нейро-судья (whisper на устройстве) — он одинаков
      // на всех OEM и полностью офлайн. Недоступен/не успел → системный движок.
      const neural = await judgeWithNeuralEngine({ wavUri: uri, targetText });
      if (!mountedRef.current || !runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) return null;
      if (neural) return neural.controlScore;
      if (!speech) return null;
      // Тот же нативный модуль в роли НЕЙТРАЛЬНОГО судьи. Живой старт с его
      // availability-check/watchdog уже отработал — здесь только файл.
      const neutralEngine = speech;
      return new Promise((resolve) => {
        let settled = false;
        let bestControl: number | null = null;
        const subs: Array<{ remove?: () => void } | undefined> = [];
        const settle = (value: number | null) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          subs.forEach((s) => s?.remove?.());
          if (controlPassCancelRef.current === cancel) controlPassCancelRef.current = null;
          resolve(value);
        };
        const cancel = () => {
          if (settled) return;
          try { neutralEngine.abort(); } catch { /* no-op */ }
          settle(null);
        };
        controlPassCancelRef.current?.();
        controlPassCancelRef.current = cancel;
        // Файловое распознавание короткой фразы обычно укладывается в ~1-2с;
        // 3.5с — потолок, дальше отдаём результат без поправки.
        const timer = setTimeout(() => {
          try {
            neutralEngine.abort();
          } catch {
            /* no-op */
          }
          // Контракт 28 июля: даже если нейтральный прогон завершился по таймауту,
          // уже услышанный им результат ОБЯЗАН участвовать в честной оценке.
          settle(bestControl);
        }, 3500);
        subs.push(
          neutralEngine.addListener('result', (event: any) => {
            const alternatives: Array<{ transcript?: string }> = Array.isArray(event?.results)
              ? event.results
              : [];
            for (const alt of alternatives) {
              const t = String(alt?.transcript ?? '').trim();
              if (!t) continue;
              const s = scorePlanPronunciationTranscript({ targetText, transcript: t }).score;
              if (bestControl == null || s > bestControl) bestControl = s;
            }
          }),
          neutralEngine.addListener('end', () => settle(bestControl)),
          neutralEngine.addListener('error', () => settle(bestControl)),
        );
        try {
          neutralEngine.start(buildControlRecognitionOptions({ lang: recognitionLocale, uri }));
        } catch {
          settle(null);
        }
      });
    },
    [speech, targetText, recognitionLocale],
  );

  // Общий хвост оценки: из транскрипта + (опц.) контрольного балла строит
  // пословную карту, подсказку, кольцо и статус passed/failed. Используется и
  // системным путём (iOS/фолбэк), и путём «зажми-говори» (Android, whisper).
  // `control` — балл нейтрального движка (whisper/системный) для честностной
  // поправки; null → без поправки.
  const applyScoredResult = useCallback(
    (
      text: string,
      segments: ReadonlyArray<{ segment?: string; confidence?: number }> | undefined,
      control: number | null,
      captureGeneration: number,
    ) => {
      if (!mountedRef.current || !runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) return;
      const biased = scorePlanPronunciationTranscript({ targetText, transcript: text, segments });
      const { score: honestScore, flagged } = applyControlScore(biased.score, control);
      const passed = honestScore >= biased.threshold;
      const report = buildSpokenWordReport({ targetText, transcript: text, segments });
      // Новая оценка попытки → сбрасываем прошлую тренировку слов начисто.
      clearAutoAdvance();
      setDrill(initWordDrillState());
      setDrillCleaned(new Set<number>());
      setWordPhase('idle');
      setWordVerdict(null);
      setPhrasePerfect(false);
      passedNotifiedRef.current = false;
      const prosody = analyzeProsody(prosodySamplesRef.current);
      const stress = stressFeedback(prosody, expectedStressPosition(targetText));
      setWordReport(report);
      setHint(
        buildSpeakingHint({
          report,
          honestyFlagged: flagged,
          stress,
          completeness: biased.breakdown?.completeness,
        }),
      );
      setScore(honestScore);
      onScore?.({ score: honestScore, passed });
      if (passed) {
        setStatus('passed');
        hapticSuccess();
        onPass?.({ score: honestScore, transcript: text });
      } else {
        setStatus('failed');
        hapticError();
      }
      restoreLoudPlaybackMode();
    },
    [targetText, onPass, onScore, clearAutoAdvance],
  );

  // ===== Тренировка слов: послушать / повторить / оценить ОДНО слово =====
  //
  // Слова карты (только жёлтые/красные) нажимаемы. Тап открывает карточку слова;
  // «Послушать» произносит слово (TTS), «Повторить» пишет короткую реплику на
  // одно слово и оценивает её через judgeSingleWord. При «чисто» слово в карте
  // зеленеет. Микрофон карточки и микрофон всей фразы не работают одновременно.

  const cleanupWordListeners = useCallback(() => {
    wordListenersRef.current.forEach((sub) => sub?.remove?.());
    wordListenersRef.current = [];
  }, []);
  const clearWordWatchdog = useCallback(() => {
    if (wordWatchdogRef.current != null) {
      clearTimeout(wordWatchdogRef.current);
      wordWatchdogRef.current = null;
    }
  }, []);

  // Индексы слов, которые ПОСЛЕ попытки были проблемными (жёлтый/красный) — по
  // ним ведётся драка за 100% и по ним считается «фраза идеальна».
  const problemIndices = useMemo(() => {
    if (!wordReport) return [] as number[];
    const out: number[] = [];
    wordReport.forEach((w, i) => {
      if (isDrillableStatus(w.status)) out.push(i);
    });
    return out;
  }, [wordReport]);

  // Слово стало чистым: помечаем в дрилл-стейте и в наложении цвета, при полном
  // закрытии всех проблемных слов — салют «фраза идеальна» (один раз).
  const markCleanedWord = useCallback(
    (index: number, captureGeneration: number) => {
      if (!mountedRef.current || !runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) return;
      setDrill((prev) => {
        if (captureGeneration !== captureGenerationRef.current) return prev;
        const next = markWordClean(prev, index);
        return next;
      });
      setDrillCleaned((prev) => {
        if (!mountedRef.current || !runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) return prev;
        if (prev.has(index)) return prev;
        const nextSet = new Set(prev);
        nextSet.add(index);
        // Проверяем «все проблемные закрыты» на СВЕЖЕМ наборе очищенных.
        const allDone =
          problemIndices.length > 0 && problemIndices.every((i) => nextSet.has(i));
        if (allDone) {
          setPhrasePerfect(true);
          hapticSuccess();
          // Фраза дотянута тренировкой до идеала: если попытка изначально НЕ была
          // засчитана, сообщаем хосту об успехе один раз (юзер реально произнёс
          // каждое слово чисто). Балл — канонический «отлично».
          if (status !== 'passed' && !passedNotifiedRef.current) {
            passedNotifiedRef.current = true;
            onPass?.({ score: Math.max(score ?? 0, 95), transcript: targetText });
          }
        } else {
          // Ещё есть незакрытые проблемные слова: карточка сама переходит к
          // следующему (по порядку фразы, начиная за только что дочиненным, с
          // «заворотом» к более ранним пропущенным) — открывает его и озвучивает
          // эталон, чтобы юзер сразу услышал, что повторять. Небольшая пауза даёт
          // увидеть «Чисто!» и услышать салют до прыжка.
          const remaining = problemIndices.filter((i) => !nextSet.has(i));
          const nextIndex =
            remaining.find((i) => i > index) ?? remaining[0] ?? null;
          if (nextIndex != null) {
            clearAutoAdvance();
            autoAdvanceRef.current = setTimeout(() => {
              autoAdvanceRef.current = null;
              if (!mountedRef.current || !runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) return;
              advanceToWordRef.current?.(nextIndex);
            }, 900);
          }
        }
        return nextSet;
      });
    },
    [problemIndices, status, score, onPass, targetText, clearAutoAdvance],
  );

  // «Послушать»: произносим ОДНО слово системным TTS (студийных клипов на одно
  // слово нет; TTS покрывает любое слово). Та же гигиена громкого режима, что и
  // у эталона фразы.
  const speakWord = useCallback(
    (word: string) => {
      hapticTap();
      const voicePolicyToken = voicePlaybackPolicy.captureStart();
      if (voicePolicyToken === null) return;
      // Токен + синхронный stop: быстрые повторные тапы по словам не перетасовывают
      // stop/speak и не обрывают друг друга — озвучивается только последнее слово.
      const token = ++playbackTokenRef.current;
      try {
        replayPlayerRef.current?.pause();
      } catch {
        /* no-op */
      }
      try {
        Speech.stop();
      } catch {
        /* no-op */
      }
      void setManagedAudioMode(LOUD_PLAYBACK_AUDIO_MODE)
        .catch(() => undefined)
        .finally(() => {
          if (
            playbackTokenRef.current !== token
            || !voicePlaybackPolicy.canStart(voicePolicyToken)
          ) return;
          try {
            Speech.stop();
            Speech.speak(word, { language: recognitionLocale });
          } catch {
            /* no-op */
          }
        });
    },
    [recognitionLocale],
  );

  // Общий хвост оценки одного слова: из услышанного текста строим вердикт и
  // применяем к карте. index — позиция слова в токенах/отчёте.
  const applyWordResult = useCallback(
    (index: number, heardTranscript: string, captureGeneration: number) => {
      if (!mountedRef.current || !runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) return;
      const target = tokens[index] ?? '';
      const heard = heardTranscript.trim();
      if (!heard) {
        setWordPhase('no_speech'); playNoSpeech();
        setWordVerdict(null);
        hapticError();
        restoreLoudPlaybackMode();
        return;
      }
      const verdict = judgeSingleWord({ target, heardTranscript: heard });
      setWordVerdict(verdict);
      if (verdict.status === 'clean') {
        setWordPhase('clean');
        hapticSuccess();
        markCleanedWord(index, captureGeneration);
      } else {
        setWordPhase('fuzzy');
        hapticError();
      }
      restoreLoudPlaybackMode();
    },
    [tokens, markCleanedWord],
  );

  // Запись+распознавание одного слова СИСТЕМНЫМ движком (iOS + Android-фолбэк).
  // Короткая самодостаточная сессия со своими слушателями — не пересекается с
  // фразовой. Слово biasing'уем на цель (одно слово в contextualStrings через
  // buildSpeakingStartOptions с targetText = слово).
  const recordWordSystem = useCallback(
    async (index: number) => {
      if (!speech) {
        setWordPhase('no_speech'); playNoSpeech();
        return;
      }
      const captureGeneration = ++captureGenerationRef.current;
      const isCurrentSession = () =>
        mountedRef.current && runtimeActiveRef.current && captureGeneration === captureGenerationRef.current;
      const target = tokens[index] ?? '';
      cleanupWordListeners();
      let best = '';
      let bestScore = -1;
      const consider = (candidate: string) => {
        const c = candidate.trim();
        if (!c) return;
        // Балл кандидата = фонетическая близость к целевому слову.
        const sim = judgeSingleWord({ target, heardTranscript: c }).status === 'clean' ? 2 : 1;
        const len = normalizeSpokenWord(c).length > 0 ? sim : 0;
        if (len > bestScore) {
          bestScore = len;
          best = c;
        }
      };
      let settled = false;
      // Watchdog по образцу фразового пути (7с): раньше тренировка слова была
      // ЕДИНСТВЕННЫМ путём распознавания без таймера — зависший Android-движок
      // оставлял вечный спиннер «слушаю».
      const settle = () => {
        if (!isCurrentSession()) return;
        if (settled) return;
        settled = true;
        clearWordWatchdog();
        cleanupWordListeners();
        applyWordResult(index, best, captureGeneration);
      };
      // cue играем один раз по первому признаку жизни движка ('start' ИЛИ 'result'
      // — на редких OEM 'start' не эмитится), а не сразу после speech.start()
      // (прогрев ~100-300мс терял начало слова).
      let cuePlayed = false;
      const playCueOnce = () => {
        if (!isCurrentSession()) return;
        if (cuePlayed) return;
        cuePlayed = true;
        playRecordStart();
      };
      const resultSub = speech.addListener('result', (event: any) => {
        if (!isCurrentSession()) return;
        clearWordWatchdog(); // признак жизни движка — таймер больше не нужен
        if (wordSystemPressActiveRef.current) {
          setWordPhase((current) => (current === 'requesting' ? 'listening' : current));
        }
        playCueOnce();
        const alts: Array<{ transcript?: string }> = Array.isArray(event?.results)
          ? event.results
          : [];
        for (const alt of alts) consider(String(alt?.transcript ?? ''));
      });
      const startSub = speech.addListener('start', () => {
        if (!isCurrentSession()) return;
        clearWordWatchdog();
        if (!wordSystemPressActiveRef.current) {
          try {
            speech.stop();
          } catch {
            /* no-op */
          }
          return;
        }
        setWordPhase('listening');
        playCueOnce();
      });
      const endSub = speech.addListener('end', () => settle());
      const errorSub = speech.addListener('error', () => settle());
      const noMatchSub = speech.addListener('nomatch', () => {
        if (isCurrentSession()) {
          settled = true;
          clearWordWatchdog();
          cleanupWordListeners();
          restoreLoudPlaybackMode();
          setWordPhase('no_speech'); playNoSpeech();
          setWordVerdict(null);
          hapticError();
        }
      });
      wordListenersRef.current = [resultSub, startSub, endSub, errorSub, noMatchSub].filter(
        Boolean,
      ) as Array<{ remove?: () => void }>;
      const permission = await requestSpeechPermissionForHold(speech);
      if (!mountedRef.current || !runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) return;
      if (permission === 'denied') {
        cleanupWordListeners();
        setWordPhase('no_speech'); playNoSpeech();
        return;
      }
      if (permission === 'granted_after_prompt') {
        wordSystemPressActiveRef.current = false;
        cleanupWordListeners();
        setWordPhase('idle');
        return;
      }
      if (!wordSystemPressActiveRef.current) {
        cleanupWordListeners();
        if (mountedRef.current) setWordPhase('idle');
        return;
      }
      let onDevice = false;
      try {
        onDevice = (await speech.supportsOnDeviceRecognition?.()) === true;
      } catch {
        onDevice = false;
      }
      if (!mountedRef.current || !runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) return;
      try {
        await setManagedAudioMode(SPEAKING_RECORDING_AUDIO_MODE).catch(() => undefined);
        if (!runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current || !wordSystemPressActiveRef.current) {
          cleanupWordListeners();
          setWordPhase('idle');
          restoreLoudPlaybackMode();
          return;
        }
        const watchdog = setTimeout(() => {
          if (wordWatchdogRef.current !== watchdog) return;
          wordWatchdogRef.current = null;
          if (!mountedRef.current || !runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) return;
          if (!isCurrentSession()) return;
          try {
            speech.abort();
          } catch {
            /* no-op */
          }
          settle(); // best='' -> честное «не расслышал» вместо вечного спиннера
        }, 7000);
        wordWatchdogRef.current = watchdog;
        speech.start(
          buildSpeakingStartOptions({
            lang: recognitionLocale,
            targetText: target,
            interimResults: true,
            volumeMeter: false,
            onDevice,
            holdToTalk: true,
            persistRecording: false,
          }),
        );
        // cue теперь в слушателе 'start' — играет, когда движок реально слушает.
      } catch {
        clearWordWatchdog();
        cleanupWordListeners();
        if (mountedRef.current) { setWordPhase('no_speech'); playNoSpeech(); }
      }
    },
    [speech, tokens, recognitionLocale, cleanupWordListeners, clearWordWatchdog, applyWordResult, playRecordStart],
  );

  const finishAttempt = useCallback(
    async (
      finalTranscript: string,
      segments?: ReadonlyArray<{ segment?: string; confidence?: number }>,
      captureGeneration?: number,
    ) => {
      if (captureGeneration == null || !mountedRef.current || !runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) return;
      if (finishingRef.current) return;
      finishingRef.current = true;
      clearWatchdog();
      // Слушатели живой сессии снимаем сразу: контрольный прогон переиспользует
      // события end/error, и старый end-слушатель зациклил бы финиш.
      cleanupListeners();
      const text = finalTranscript.trim();
      // Attempt finished -> the equalizer collapses itself when `active` turns
      // false (its own effect), so no per-sample reset needed here.
      setStatus('scoring');
      if (!text) {
        // Nothing recognized -> "didn't catch that", not a 0% failure.
        setStatus('no_speech'); playNoSpeech();
        hapticError();
        restoreLoudPlaybackMode();
        return;
      }
      // Честность: тот же звук — нейтральному движку без подсказки. Балл не
      // может превышать его вердикт больше, чем на допуск (speaking_honesty_check).
      let control: number | null = null;
      if (!isPreview) {
        const uri = await waitForRecordingUri(700);
        if (!runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) return;
        if (uri) control = await runControlPass(uri, captureGeneration);
      }
      if (!runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) return;
      applyScoredResult(text, segments, control, captureGeneration);
    },
    [clearWatchdog, cleanupListeners, isPreview, waitForRecordingUri, runControlPass, applyScoredResult],
  );

  const stopListening = useCallback(() => {
    systemHoldPressActiveRef.current = false;
    clearWatchdog();
    controlPassCancelRef.current?.();
    if (statusRef.current === 'requesting') {
      captureGenerationRef.current += 1;
      cleanupListeners();
      try {
        speech?.abort();
      } catch {
        /* no-op */
      }
      restoreLoudPlaybackMode();
      setStatus('idle');
      return;
    }
    if (statusRef.current === 'listening') setStatus('scoring');
    try {
      speech?.stop();
    } catch {
      /* no-op */
    }
  }, [speech, clearWatchdog, cleanupListeners]);

  const startListening = useCallback(async () => {
    if (!runtimeActiveRef.current) return;
    if (isPreview) return; // mic is inert while previewing a fixed status
    if (statusRef.current === 'requesting' || statusRef.current === 'listening' || statusRef.current === 'scoring') return;
    if (!speech) {
      setStatus('unavailable');
      return;
    }
    if (!isSpeechRecognitionAvailable(speech)) {
      setStatus('unavailable');
      return;
    }
    controlPassCancelRef.current?.();
    const captureGeneration = ++captureGenerationRef.current;
    const isCurrentSession = () =>
      mountedRef.current && runtimeActiveRef.current && captureGeneration === captureGenerationRef.current;
    hapticTap();
    // «Сказать ещё раз» может прилететь, пока играет эталон или «Моя запись» —
    // глушим их, чтобы микрофон не поймал хвост воспроизведения.
    try {
      replayPlayerRef.current?.pause();
    } catch {
      /* no-op */
    }
    try {
      Speech.stop();
    } catch {
      /* no-op */
    }
    setTranscript('');
    setScore(null);
    setWordReport(null);
    setHint(null);
    deleteRecordingFile(recordingUriRef.current);
    recordingUriRef.current = null;
    setRecordingUri(null);
    equalizerRef.current?.setSample(0);
    prosodySamplesRef.current = [];
    // Запись прошлой попытки больше не нужна (реплей и контрольный прогон
    // работают только с текущей) — убираем файл из кэша.
    deleteRecordingFile(recordingUriRef.current);
    recordingUriRef.current = null;
    setRecordingUri(null);
    finishingRef.current = false;
    attemptStartRef.current = Date.now();
    setStatus('requesting');
    const permission = await requestSpeechPermissionForHold(speech);
    if (!mountedRef.current || !runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) return;
    if (permission === 'denied') {
      setStatus('denied');
      return;
    }
    if (permission === 'granted_after_prompt') {
      systemHoldPressActiveRef.current = false;
      setStatus('idle');
      return;
    }
    if (!systemHoldPressActiveRef.current) {
      if (mountedRef.current) setStatus('idle');
      return;
    }

    cleanupListeners();
    cleanupAudioEndListener();
    let latest = '';
    // Лучший вариант за попытку = тот, что даёт МАКСИМАЛЬНЫЙ score против цели
    // среди ВСЕХ альтернатив (maxAlternatives) ВСЕХ result-событий. Движок часто
    // кладёт правильную фразу не в results[0], а в #2/#3; плюс при беглой речи
    // шлёт короткий финальный обрывок после более полного interim. Скоринг
    // дешёвый, поэтому считаем кандидатов на лету и держим лучший.
    let best = '';
    let bestScore = -1;
    let bestSegments: ReadonlyArray<{ segment?: string; confidence?: number }> | undefined;
    // Накопитель всех услышанных слов за попытку: при БЫСТРОЙ речи нейтива движок
    // сегментирует фразу и присылает обрывки, заменяющие друг друга ("I would" …
    // потом хвост "coffee please"). Объединение слов за всю попытку собирает
    // фразу целиком, иначе засчитывалось бы «только последнее слово».
    const acc = new TranscriptAccumulator();
    const considerBest = (
      candidate: string,
      segments?: ReadonlyArray<{ segment?: string; confidence?: number }>,
    ) => {
      const c = candidate.trim();
      if (!c) return;
      const s = scorePlanPronunciationTranscript({ targetText, transcript: c, segments }).score;
      if (s > bestScore) {
        bestScore = s;
        best = c;
        bestSegments = Array.isArray(segments) ? segments : undefined;
      }
    };

    // cue играем один раз по первому признаку жизни движка ('start' ИЛИ 'result'
    // — на редких OEM 'start' не эмитится), а не сразу после speech.start()
    // (прогрев ~100-300мс терял начало фразы).
    let cuePlayed = false;
    const playCueOnce = () => {
      if (!isCurrentSession()) return;
      if (cuePlayed) return;
      cuePlayed = true;
      playRecordStart();
    };
    const resultSub = speech.addListener('result', (event: any) => {
      if (!isCurrentSession()) return;
      // Первый результат = движок точно жив (на редких OEM 'start' не эмитится,
      // а сразу приходит result) — на всякий случай тоже снимаем watchdog.
      clearWatchdog();
      if (systemHoldPressActiveRef.current) {
        setStatus((current) => (current === 'requesting' ? 'listening' : current));
      }
      playCueOnce();
      const alternatives: Array<{ transcript?: string; segments?: ReadonlyArray<{ segment?: string; confidence?: number }> }> = Array.isArray(event?.results)
        ? event.results
        : [];
      for (const alt of alternatives) {
        const t = String(alt?.transcript ?? '').trim();
        // segments live only on results[0] per the package; pass when present.
        if (t) considerBest(t, Array.isArray(alt?.segments) ? alt.segments : undefined);
      }
      // Копим объединение слов ТОЛЬКО из топ-гипотезы (не из всех альтернатив —
      // иначе притащим слова из неверных вариантов). Union — ещё один кандидат
      // на скоринг (порядок слов сохраняется, поэтому orderAccuracy не страдает,
      // и перемешанная речь НЕ получит ложный проход).
      acc.add(String(alternatives[0]?.transcript ?? ''));
      const union = acc.union();
      if (union) considerBest(union);
      // Живая подсветка по union: слово, раз загоревшись, больше не гаснет, когда
      // следующий interim заменяет строку только хвостом.
      const next = union || String(alternatives[0]?.transcript ?? '').trim();
      if (next) {
        latest = next;
        if (mountedRef.current) setTranscript(next);
      }
    });
    // 'start' = движок реально начал слушать. Это сигнал, что зависания не было
    // — снимаем watchdog. (На Android именно отсутствие этого события в течение
    // нескольких секунд и означало вечное «Готовимся слушать…».)
    const startSub = speech.addListener('start', () => {
      if (!isCurrentSession()) return;
      clearWatchdog();
      if (!systemHoldPressActiveRef.current) {
        try {
          speech.stop();
        } catch {
          /* no-op */
        }
        return;
      }
      setStatus('listening');
      playCueOnce();
    });
    const endSub = speech.addListener('end', () => {
      if (!isCurrentSession()) return;
      // Скорим по самому полному варианту, а не по последнему обрывку.
      void finishAttempt(best || latest, bestSegments, captureGeneration);
    });
    const errorSub = speech.addListener('error', () => {
      if (!isCurrentSession()) return;
      clearWatchdog();
      if (mountedRef.current) {
        const final = best || latest;
        if (final) void finishAttempt(final, bestSegments, captureGeneration);
        else {
          restoreLoudPlaybackMode();
          setStatus('no_speech'); playNoSpeech();
        }
      }
    });
    const noMatchSub = speech.addListener('nomatch', () => {
      if (!isCurrentSession()) return;
      clearWatchdog();
      restoreLoudPlaybackMode();
      if (mountedRef.current) { setStatus('no_speech'); playNoSpeech(); }
    });
    // uri сохранённой записи попытки: питает «Мою запись» и контрольный прогон.
    audioEndSubRef.current = speech.addListener('audioend', (event: any) => {
      if (!isCurrentSession()) return;
      const uri = typeof event?.uri === 'string' && event.uri.length > 0 ? event.uri : null;
      if (!uri) return;
      recordingUriRef.current = uri;
      if (mountedRef.current) setRecordingUri(uri);
    }) ?? null;
    // Live volume -> equalizer, pushed IMPERATIVELY (no setState → no re-render
    // of the modal on every sample). The equalizer derives loudness + tone tilt.
    const volumeSub = speech.addListener('volumechange', (event: any) => {
      if (!isCurrentSession()) return;
      const value = Number(event?.value);
      equalizerRef.current?.setSample(value);
      // Collect the loudness contour for prosody (cap to keep memory bounded).
      if (prosodySamplesRef.current.length < 240) {
        prosodySamplesRef.current.push({ value, atMs: Date.now() - attemptStartRef.current });
      }
    });

    listenersRef.current = [
      startSub,
      resultSub,
      endSub,
      errorSub,
      noMatchSub,
      volumeSub,
    ].filter(Boolean) as Array<{ remove?: () => void }>;

    // Prefer the device's offline neural recognizer when available (iOS 17+,
    // Android 13+ with the AOSP model). Cleaner privacy, no network error class,
    // and biasing/formatting work. Falls back to platform default otherwise.
    let onDevice = false;
    try {
      onDevice = (await speech.supportsOnDeviceRecognition?.()) === true;
    } catch {
      onDevice = false;
    }
    if (!mountedRef.current || !runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) return;

    try {
      try {
        await setManagedAudioMode(SPEAKING_RECORDING_AUDIO_MODE);
      } catch {
        // Recognition can still work on runtimes that manage the native session
        // themselves; do not turn a mode-sync hiccup into a dead microphone.
      }
      if (!mountedRef.current || !runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) return;
      if (!systemHoldPressActiveRef.current) {
        cleanupListeners();
        restoreLoudPlaybackMode();
        setStatus('idle');
        return;
      }
      // Watchdog: если за 7с движок не пришлёт НИ start, НИ первого result —
      // считаем его зависшим (типичная Android-беда: сервис принял start(), но
      // молчит). Прерываем и показываем «stalled» с кнопкой «Повторить», а не
      // оставляем юзера в вечном спиннере. Снимается любым событием жизни выше.
      clearWatchdog();
      const watchdog = setTimeout(() => {
        if (watchdogRef.current !== watchdog) return;
        watchdogRef.current = null;
        if (!mountedRef.current || !runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) return;
        try {
          speech.abort();
        } catch {
          /* no-op */
        }
        cleanupListeners();
        // зачем: тот же класс бага, что при сворачивании — abort() рушит нативную
        // сессию, а подписка на 'audioend' переживала её и ловила событие в мёртвый
        // колбэк (EXC_BAD_ACCESS в мосту). Снимаем вместе с остальными.
        cleanupAudioEndListener();
        setStatus('stalled');
        hapticError();
        restoreLoudPlaybackMode();
      }, 7000);
      watchdogRef.current = watchdog;
      speech.start(
        buildSpeakingStartOptions({
          lang: recognitionLocale,
          targetText,
          interimResults: true,
          volumeMeter: true,
          onDevice,
          holdToTalk: !pcmHoldModeRef.current,
          // Файл записи нужен ИМЕННО здесь: «Моя запись» + контрольный прогон.
          persistRecording: true,
        }),
      );
      // cue перенесён в слушатель 'start' — играет по реальному старту движка,
      // а не сразу после speech.start() (иначе терялось начало фразы).
    } catch {
      clearWatchdog();
      cleanupListeners();
      restoreLoudPlaybackMode();
      if (mountedRef.current) setStatus('unavailable');
    }
  }, [isPreview, speech, recognitionLocale, targetText, cleanupListeners, cleanupAudioEndListener, finishAttempt, playRecordStart, clearWatchdog]);

  // ===== Android: «зажми и говори» → запись → whisper (в обход системного
  // распознавателя). На iOS системный движок надёжен и whisper выключен, поэтому
  // весь этот путь — только Android И только когда нативный рекордер И модель
  // whisper на месте; иначе откатываемся на системный путь (startListening). =====
  const holdSupported = useMemo(
    () => !isPreview && Platform.OS === 'android' && isHoldRecordingSupported() && isNeuralJudgeSupported(),
    [isPreview],
  );
  // Готовность модели проверяем в рантайме (могла ещё качаться): держим в стейте,
  // чтобы кнопка честно показывала «идёт подготовка», а не молча падала в фолбэк.
  const [holdModelReady, setHoldModelReady] = useState(false);
  const holdRecRef = useRef<HoldRecording | null>(null);
  const holdFinishingRef = useRef(false);
  // PCM-рекордер hold-пути НЕ запрашивает разрешение микрофона сам: без гранта
  // init/start «пишут» тишину, и каждая попытка кончается «не расслышал» —
  // мёртвая петля без единого системного диалога. Грант проверяем заранее
  // (без диалога), сам диалог показываем при первом зажатии.
  const holdMicGrantedRef = useRef(false);
  const holdPressActiveRef = useRef(false);
  const wordHoldPressActiveRef = useRef(false);

  const ensureHoldMicPermission = useCallback(async (): Promise<HoldPermissionResult> => {
    if (holdMicGrantedRef.current) return 'granted';
    if (!speech) return 'denied';
    const result = await requestSpeechPermissionForHold(speech);
    if (result !== 'denied') holdMicGrantedRef.current = true;
    return result;
  }, [speech]);
  // Единый speaking-контракт: на iOS push-to-talk использует системный
  // recognizer, на Android — PCM/whisper, когда модель готова.
  // ПОВЕДЕНЧЕСКИЙ флаг: реальная запись/распознавание. В превью всегда false
  // (holdSupported требует !isPreview) — микрофон не трогается.
  const pcmHoldMode = holdSupported && holdModelReady;
  const pcmHoldModeRef = useRef(false);
  pcmHoldModeRef.current = pcmHoldMode;
  const holdMode = !isPreview && !!speech;
  // ДИСПЛЕЙНЫЙ флаг: как ВЫГЛЯДИТ панель. В превью отражает previewHoldMode (dev-
  // проп админ-лаборатории), чтобы android-вид «Зажми и говори» был виден с iPhone
  // БЕЗ реального микрофона. Вне превью совпадает с holdMode.
  const holdModeView = isPreview ? previewHoldMode === true : holdMode;

  const startHold = useCallback(() => {
    if (!runtimeActiveRef.current) return;
    if (!holdMode) return;
    if (holdRecRef.current) return; // уже держим
    holdFinishingRef.current = false;
    holdPressActiveRef.current = true;
    const captureGeneration = ++captureGenerationRef.current;
    // Глушим эталон/реплей, чтобы микрофон не поймал хвост воспроизведения.
    try {
      replayPlayerRef.current?.pause();
    } catch {
      /* no-op */
    }
    try {
      Speech.stop();
    } catch {
      /* no-op */
    }
    setTranscript('');
    setScore(null);
    setWordReport(null);
    setHint(null);
    // «requesting» = мик прогревается; на «listening» + cue переходим только когда
    // пришёл первый реальный аудио-чанк (иначе первое слово терялось в cold-start
    // AudioRecord ~100-300мс). Захваченное до этого аудио рекордер сохраняет.
    setStatus('requesting');
    hapticTap();
    const onHoldFirstAudio = () => {
      if (!holdPressActiveRef.current || holdRecRef.current == null) return;
      setStatus('listening');
      playRecordStart();
    };
    const holdCaptureOptions = {
      onFirstAudio: onHoldFirstAudio,
      onLevel: (rawVolume: number) => equalizerRef.current?.setSample(rawVolume),
    };
    if (holdMicGrantedRef.current) {
      holdRecRef.current = startHoldRecording(holdCaptureOptions);
      return;
    }
    // Первого гранта ещё нет: показываем системный диалог вместо записи в тишину.
    void (async () => {
      const permission = await ensureHoldMicPermission();
      if (!mountedRef.current || !runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) return;
      if (permission === 'denied') {
        setStatus('denied'); // штатный blocked-UI с кнопкой «Открыть настройки»
        return;
      }
      if (permission === 'granted_after_prompt') {
        holdPressActiveRef.current = false;
        setStatus('idle');
        return;
      }
      // Диалог перехватил касание — палец уже отпущен: юзер зажмёт снова.
      if (!holdPressActiveRef.current) {
        setStatus('idle');
        return;
      }
      holdRecRef.current = startHoldRecording(holdCaptureOptions);
    })();
  }, [holdMode, ensureHoldMicPermission, playRecordStart]);

  const endHold = useCallback(async () => {
    const captureGeneration = captureGenerationRef.current;
    holdPressActiveRef.current = false;
    const rec = holdRecRef.current;
    if (!rec) {
      // Отпустили, пока ждали диалог разрешения — вернуть панель в исходное.
      setStatus((s) => (s === 'listening' || s === 'requesting' ? 'idle' : s));
      return;
    }
    if (holdFinishingRef.current) return;
    holdFinishingRef.current = true;
    holdRecRef.current = null;
    setStatus('scoring');
    let wavUri: string | null = null;
    try {
      wavUri = await rec.stop();
    } catch {
      wavUri = null;
    }
    if (!mountedRef.current || !runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) {
      deleteHoldRecording(wavUri);
      return;
    }
    if (!wavUri) {
      // Ничего не записалось (слишком коротко / сбой записи) — не 0%, а «не расслышал».
      setStatus('no_speech'); playNoSpeech();
      hapticError();
      return;
    }
    const verdict = await judgeWithNeuralEngine({
      wavUri,
      targetText,
      locale: recognitionLocale,
    });
    // Файл записи больше не нужен — реплей на hold-пути не используется.
    if (!mountedRef.current || !runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) return;
    recordingUriRef.current = wavUri;
    setRecordingUri(wavUri);
    const text = (verdict?.transcript ?? '').trim();
    if (!text) {
      setStatus('no_speech'); playNoSpeech();
      hapticError();
      return;
    }
    // whisper — уже НЕЙТРАЛЬНЫЙ движок (не знает цели), поэтому его же балл идёт
    // как контрольный: honesty-поправка не даёт biasing «подарить» зачёт.
    applyScoredResult(text, undefined, verdict?.controlScore ?? null, captureGeneration);
  }, [targetText, recognitionLocale, applyScoredResult]);

  // The exercise owns the press target, but recognition must follow the same
  // proven platform route as the original modal: iOS/system ASR; Android
  // PCM/Whisper when ready, with the existing system fallback unchanged.
  const previousInlineHoldRef = useRef(false);
  const inlineHoldRouteRef = useRef<'system' | 'pcm' | null>(null);
  useEffect(() => {
    if (presentation !== 'inline') return;
    const wasHolding = previousInlineHoldRef.current;
    previousInlineHoldRef.current = holdActive;
    if (holdActive && !wasHolding) {
      const route: 'system' | 'pcm' = Platform.OS !== 'ios' && pcmHoldMode ? 'pcm' : 'system';
      inlineHoldRouteRef.current = route;
      if (route === 'pcm') {
        startHold();
      } else {
        systemHoldPressActiveRef.current = true;
        void startListening();
      }
    }
    if (!holdActive && wasHolding) {
      const route = inlineHoldRouteRef.current;
      inlineHoldRouteRef.current = null;
      if (route === 'pcm') {
        void endHold();
      } else {
        stopListening();
      }
    }
  }, [presentation, holdActive, pcmHoldMode, startHold, endHold, startListening, stopListening]);

  // Hold-режим: «Сказать ещё раз» просто возвращает панель в исходное состояние —
  // юзер снова зажимает кнопку. (На системном пути ретрай перезапускает движок.)
  const resetForRetry = useCallback(() => {
    hapticTap();
    setTranscript('');
    setScore(null);
    setWordReport(null);
    setHint(null);
    setStatus('idle');
  }, []);

  // ===== Запись одного слова на Android-whisper (зажми-говори), в обход
  // системного распознавателя — тот же путь, что и для фразы =====
  const startWordHold = useCallback(
    (index: number) => {
      if (!runtimeActiveRef.current) return;
      if (!pcmHoldMode) return;
      if (wordHoldRecRef.current) return;
      clearAutoAdvance(); // юзер начал повторять — висящий авто-переход отменяем
      wordFinishingRef.current = false;
      wordHoldPressActiveRef.current = true;
      const captureGeneration = ++captureGenerationRef.current;
      try {
        replayPlayerRef.current?.pause();
      } catch {
        /* no-op */
      }
      try {
        Speech.stop();
      } catch {
        /* no-op */
      }
      // Держим 'idle' пока мик прогревается; на 'listening' + cue — только когда
      // пришёл первый реальный аудио-чанк (иначе терялось первое слово в cold-start).
      setWordVerdict(null);
      hapticTap();
      const onWordFirstAudio = () => {
        if (!wordHoldPressActiveRef.current || wordHoldRecRef.current == null) return;
        setWordPhase('listening');
        playRecordStart();
      };
      if (holdMicGrantedRef.current) {
        wordHoldRecRef.current = startHoldRecording({ onFirstAudio: onWordFirstAudio });
        return;
      }
      // Тот же гейт, что и у фразы: без гранта PCM-рекордер пишет тишину.
      void (async () => {
        const permission = await ensureHoldMicPermission();
        if (!mountedRef.current || !runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) return;
        if (permission === 'denied') {
          setWordPhase('no_speech'); playNoSpeech(); // как системный word-путь при отказе
          setWordVerdict(null);
          return;
        }
        if (permission === 'granted_after_prompt') {
          wordHoldPressActiveRef.current = false;
          setWordPhase('idle');
          return;
        }
        if (!wordHoldPressActiveRef.current) {
          setWordPhase('idle');
          return;
        }
        wordHoldRecRef.current = startHoldRecording({ onFirstAudio: onWordFirstAudio });
      })();
    },
    [pcmHoldMode, ensureHoldMicPermission, playRecordStart, clearAutoAdvance],
  );

  const endWordHold = useCallback(
    async (index: number) => {
      const captureGeneration = captureGenerationRef.current;
      wordHoldPressActiveRef.current = false;
      const rec = wordHoldRecRef.current;
      if (!rec) {
        // Отпустили, пока ждали диалог разрешения — вернуть карточку в исходное.
        setWordPhase((p) => (p === 'listening' ? 'idle' : p));
        return;
      }
      if (wordFinishingRef.current) return;
      wordFinishingRef.current = true;
      wordHoldRecRef.current = null;
      setWordPhase('scoring');
      let wavUri: string | null = null;
      try {
        wavUri = await rec.stop();
      } catch {
        wavUri = null;
      }
      if (!mountedRef.current || !runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) {
        deleteHoldRecording(wavUri);
        return;
      }
      if (!wavUri) {
        setWordPhase('no_speech'); playNoSpeech();
        setWordVerdict(null);
        hapticError();
        return;
      }
      const target = tokens[index] ?? '';
      const verdict = await judgeWithNeuralEngine({
        wavUri,
        targetText: target,
        locale: recognitionLocale,
      });
      deleteHoldRecording(wavUri);
      if (!mountedRef.current || !runtimeActiveRef.current || captureGeneration !== captureGenerationRef.current) return;
      applyWordResult(index, (verdict?.transcript ?? '').trim(), captureGeneration);
    },
    [tokens, recognitionLocale, applyWordResult],
  );

  // Единая точка начала системного push-to-talk для слова.
  const startWordAttempt = useCallback(
    (index: number) => {
      if (status === 'listening') return; // фразовый микрофон занят — взаимная блокировка
      clearAutoAdvance(); // юзер начал повторять — висящий авто-переход отменяем
      wordSystemPressActiveRef.current = true;
      setWordVerdict(null);
      setWordPhase('requesting');
      void recordWordSystem(index);
    },
    [status, recordWordSystem, clearAutoAdvance],
  );

  const endWordSystemAttempt = useCallback(() => {
    wordSystemPressActiveRef.current = false;
    if (wordPhaseRef.current === 'requesting') {
      captureGenerationRef.current += 1;
      cleanupWordListeners();
      try {
        speech?.abort();
      } catch {
        /* no-op */
      }
      restoreLoudPlaybackMode();
      setWordPhase('idle');
      return;
    }
    if (wordPhaseRef.current === 'listening') {
      setWordPhase('scoring');
      try {
        speech?.stop();
      } catch {
        /* no-op */
      }
    }
  }, [cleanupWordListeners, speech]);

  // Тап по слову карты: открыть карточку И СРАЗУ проиграть эталон слова. Каждый
  // тап (в т.ч. повторный по уже открытому слову) переигрывает звук — отдельная
  // кнопка «Послушать» больше не нужна. Закрытие — только крестиком в карточке.
  // Только жёлтые/красные слова (и ещё не «дочиненные») кликабельны — это
  // гарантирует вызывающий JSX.
  const onTapWord = useCallback(
    (index: number) => {
      // Ручной тап отменяет висящий авто-переход: пользователь сам выбрал слово.
      clearAutoAdvance();
      // Останавливаем незавершённую запись слова при переключении.
      try {
        wordHoldRecRef.current?.cancel();
      } catch {
        /* no-op */
      }
      wordHoldRecRef.current = null;
      cleanupWordListeners();
      setWordPhase('idle');
      setWordVerdict(null);
      setDrill((prev) => openWord(prev, index));
      // Проигрываем эталон слова (speakWord даёт свою тактильную отдачу и гигиену
      // громкого режима) — вместо отдельного hapticTap.
      const tok = tokens[index];
      if (tok) speakWord(tok);
    },
    [cleanupWordListeners, tokens, speakWord, clearAutoAdvance],
  );

  // Авто-переход к следующему слову после «чисто» = ровно тот же открыть+озвучить,
  // что и ручной тап. Держим в ref, чтобы markCleanedWord (выше) мог вызвать это,
  // не завися от onTapWord (ниже). Проверяем mounted и что карточка ещё открыта:
  // пользователь мог закрыть её или уйти за время паузы.
  useEffect(() => {
    advanceToWordRef.current = (index: number) => {
      if (!mountedRef.current) return;
      onTapWord(index);
    };
    return () => {
      advanceToWordRef.current = null;
    };
  }, [onTapWord]);

  const closeWordCard = useCallback(() => {
    clearAutoAdvance();
    wordSystemPressActiveRef.current = false;
    try {
      wordHoldRecRef.current?.cancel();
    } catch {
      /* no-op */
    }
    wordHoldRecRef.current = null;
    cleanupWordListeners();
    try {
      speech?.abort();
    } catch {
      /* no-op */
    }
    restoreLoudPlaybackMode();
    setWordPhase('idle');
    setWordVerdict(null);
    setDrill((prev) => closeWord(prev));
  }, [cleanupWordListeners, clearAutoAdvance, speech]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      captureGenerationRef.current += 1;
      playbackTokenRef.current += 1;
      clearWatchdog();
      controlPassCancelRef.current?.();
      clearWordWatchdog();
      clearAutoAdvance();
      cleanupListeners();
      cleanupAudioEndListener();
      try {
        speech?.abort();
      } catch {
        /* no-op */
      }
      // Незавершённая hold-запись при закрытии панели: отменяем, файл не пишем.
      try {
        holdRecRef.current?.cancel();
      } catch {
        /* no-op */
      }
      holdRecRef.current = null;
      // Тренировка слов: снимаем слушатели одиночного слова и отменяем его запись.
      wordListenersRef.current.forEach((sub) => sub?.remove?.());
      wordListenersRef.current = [];
      try {
        wordHoldRecRef.current?.cancel();
      } catch {
        /* no-op */
      }
      wordHoldRecRef.current = null;
      try {
        replayPlayerRef.current?.remove();
      } catch {
        /* no-op */
      }
      try {
        Speech.stop();
      } catch {
        /* no-op */
      }
      // Панель уходит: файл записи никому больше не нужен, сессию — в громкую.
      deleteRecordingFile(recordingUriRef.current);
      restoreLoudPlaybackMode();
    };
  }, [speech, cleanupListeners, cleanupAudioEndListener, clearWatchdog, clearWordWatchdog, clearAutoAdvance]);

  // зачем: свернуть приложение — НЕ то же самое, что закрыть панель. Размонтирования не
  // происходит, cleanup выше не срабатывает, и распознавание продолжало слушать микрофон в
  // фоне — сильнейший разряд батареи. Watchdog (7с) тут не помогает: он ловит МОЛЧАЩИЙ
  // движок, а живой микрофон для него исправен. Обрываем жёстко (abort/cancel), а не через
  // stopListening: тот при статусе 'listening' уводит в 'scoring', то есть запускает оценку
  // обрывка фразы уже в фоне. Возврат в приложение оставляем ручным — пользователь сам
  // нажмёт «говорить», молча возобновлять запись за него нельзя.
  // Speech capture lifecycle invariant: blur/background cancels every capture path,
  // invalidates async starts, stops capture playback, and never auto-resumes.
  useEffect(() => {
    if (isPreview) return;
    if (runtimeActive) return;
    const phraseCaptureWasActive = statusRef.current === 'requesting' || statusRef.current === 'listening' || statusRef.current === 'scoring';
    const wordCaptureWasActive = wordPhaseRef.current === 'requesting' || wordPhaseRef.current === 'listening' || wordPhaseRef.current === 'scoring';
    captureGenerationRef.current += 1;
    playbackTokenRef.current += 1;
    systemHoldPressActiveRef.current = false;
    holdPressActiveRef.current = false;
    wordSystemPressActiveRef.current = false;
    wordHoldPressActiveRef.current = false;
    holdFinishingRef.current = false;
    wordFinishingRef.current = false;
    clearWatchdog();
    controlPassCancelRef.current?.();
    clearWordWatchdog();
    clearAutoAdvance();
    cleanupListeners();
    // зачем: 'audioend' живёт в отдельном ref и снимался только при размонтировании.
    // При сворачивании приложения прямо во время речи он оставался подписанным, а
    // speech.abort() ниже рушил нативную сессию — модуль досылал событие в мёртвый
    // колбэк, и мост падал с EXC_BAD_ACCESS в convertNSStringToJSIString (краш на
    // 1.5.63: вложенные NSArray со строками из освобождённой памяти).
    cleanupAudioEndListener();
    cleanupWordListeners();
    try {
      speech?.abort();
    } catch {
      /* no-op */
    }
    try {
      holdRecRef.current?.cancel();
    } catch {
      /* no-op */
    }
    holdRecRef.current = null;
    try {
      wordHoldRecRef.current?.cancel();
    } catch {
      /* no-op */
    }
    wordHoldRecRef.current = null;
    try {
      replayPlayerRef.current?.pause();
    } catch {
      /* no-op */
    }
    try {
      Speech.stop();
    } catch {
      /* no-op */
    }
    // Сессия захвата больше не нужна — возвращаем громкое воспроизведение.
    restoreLoudPlaybackMode();
    equalizerRef.current?.setSample(0);
    if (mountedRef.current && phraseCaptureWasActive) setStatus('idle');
    if (mountedRef.current && wordCaptureWasActive) setWordPhase('idle');
  }, [runtimeActive, isPreview, speech, clearWatchdog, clearWordWatchdog, clearAutoAdvance, cleanupListeners, cleanupAudioEndListener, cleanupWordListeners]);

  // Модель whisper не смогла подготовиться (нет сети при первом запуске) —
  // откатываемся на системный путь, чтобы юзер не застрял на «идёт подготовка».

  // Предварительная проверка гранта микрофона для hold-режима — БЕЗ диалога.
  // Если разрешение уже выдано (онбординг/прошлый запуск), первое зажатие
  // начинает запись мгновенно, без асинхронного крюка.
  useEffect(() => {
    if (!holdSupported || !speech) return;
    let alive = true;
    speech.getPermissionsAsync?.()
      .then((perm) => {
        if (alive && perm?.granted === true) holdMicGrantedRef.current = true;
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [holdSupported, speech]);

  // Уровень B / основной движок Android: греем модель whisper при открытии панели
  // (качается один раз, в documentDirectory). Без пакета whisper.rn в бинаре или
  // без сети — тихий no-op. Когда модель готова, включаем hold-режим на Android.
  useEffect(() => {
    if (isPreview) return;
    if (!isNeuralJudgeSupported()) return;
    let alive = true;
    // Уже на диске? — сразу готовы (частый путь после первого раза).
    if (isNeuralModelReady(recognitionLocale)) {
      setHoldModelReady(true);
      return () => {
        alive = false;
      };
    }
    void ensureNeuralModel(recognitionLocale).then((ok) => {
      if (!alive) return;
      if (ok) setHoldModelReady(true);
    });
    return () => {
      alive = false;
    };
  }, [isPreview, recognitionLocale]);

  const handleClose = useCallback(() => {
    stopListening();
    try {
      speech?.abort();
    } catch {
      /* no-op */
    }
    // «Готово»/крестик глушат всё, что ещё звучит (эталон, «Моя запись»),
    // и возвращают громкую сессию хосту (уроку/тренажёру).
    try {
      replayPlayerRef.current?.pause();
    } catch {
      /* no-op */
    }
    try {
      Speech.stop();
    } catch {
      /* no-op */
    }
    restoreLoudPlaybackMode();
    onClose();
  }, [stopListening, speech, onClose]);

  const openAppSettings = useCallback(() => {
    hapticTap();
    Linking.openSettings().catch(() => {
      /* no-op: some platforms/contexts can't open settings */
    });
  }, []);

  // «Послушай себя»: воспроизводим сохранённую запись попытки (wav в кэше).
  const playMyRecording = useCallback(() => {
    if (!recordingUri) return;
    hapticTap();
    // Токен: пока переключается аудиорежим, повторный тап мог застолбить свой
    // запрос — тогда НЕ создаём ещё один плеер (иначе накапливались лишние плееры
    // и одновременно играло несколько записей).
    const token = ++playbackTokenRef.current;
    try {
      Speech.stop();
    } catch {
      /* no-op */
    }
    try {
      replayPlayerRef.current?.remove();
    } catch {
      /* no-op */
    }
    replayPlayerRef.current = null;
    // Сначала «громкое воспроизведение»: после распознавания сессия всё ещё в
    // записи, и без сброса запись играла бы тихо через разговорный динамик.
    void setManagedAudioMode(LOUD_PLAYBACK_AUDIO_MODE)
      .catch(() => undefined)
      .finally(() => {
        if (!mountedRef.current || !runtimeActiveRef.current || playbackTokenRef.current !== token) return;
        try {
          const player = createAudioPlayer(recordingUri);
          if (!mountedRef.current || !runtimeActiveRef.current || playbackTokenRef.current !== token) {
            try {
              player.remove();
            } catch {
              /* no-op */
            }
            return;
          }
          replayPlayerRef.current = player;
          try {
            player.volume = 1;
          } catch {
            /* no-op: runtime без настраиваемой громкости */
          }
          player.play();
        } catch {
          /* no-op: повтор не критичен — тихо пропускаем */
        }
      });
  }, [recordingUri]);

  const listening = status === 'listening';
  const showResult = status === 'passed' || status === 'failed';
  const isBlocked = status === 'denied' || status === 'unavailable';
  // На успехе фраза засчитана — микрофон больше не нужен (иначе юзер «застревает»
  // на экране с микрофоном и «Сказать ещё раз», не понимая, что уже готово).
  // Вместо микрофона показываем явную кнопку «Готово», которая закрывает панель.
  const passThreshold = PLAN_PRONUNCIATION_PASS_THRESHOLD;
  const warnColor = theme.warn ?? WARN_COLOR_FALLBACK;
  // Тренировка слов ДВИГАЕТ балл фразы: каждое дочиненное проблемное слово честно
  // поднимает результат от исходного к полному проходу; когда закрыты ВСЕ
  // проблемные слова — фраза звучит идеально (все слова чисто), балл дотягивается
  // до «отлично». Кольцо/процент/вердикт читают ИМЕННО этот эффективный балл.
  const effectiveScore = useMemo(() => {
    if (score == null) return score;
    const fixed = problemIndices.filter((i) => drillCleaned.has(i)).length;
    return effectivePhraseScore({
      baseScore: score,
      totalProblems: problemIndices.length,
      fixedProblems: fixed,
      passThreshold,
    });
  }, [score, problemIndices, drillCleaned, passThreshold]);
  // Фраза считается пройденной, когда эффективный балл дотянулся до порога —
  // будь то исходно, либо после тренировки слов.
  const effectivePassed = effectiveScore != null && effectiveScore >= passThreshold;
  const passed = effectivePassed;
  const band = effectiveScore != null ? speakingBand(effectiveScore, passThreshold) : null;
  const hintLine = hint && !effectivePassed ? speakingHintText(hint, lang) : null;
  // Подготовка Android PCM/whisper идёт в фоне и никогда не блокирует микрофон:
  // до готовности работает системный recognizer с тем же hold-жестом.
  const preparingModelView = isPreview && previewHoldMode === 'preparing';

  const statusLine = (() => {
    if (preparingModelView && (status === 'idle' || status === 'requesting')) {
      return L(lang, {
        ru: 'Готовим распознавание… нужно один раз',
        uk: 'Готуємо розпізнавання… потрібно один раз',
        es: 'Preparando el reconocimiento… solo una vez',
        'pt-BR': 'Preparando o reconhecimento… só uma vez',
        vi: 'Đang chuẩn bị nhận dạng… chỉ một lần',
        id: 'Menyiapkan pengenalan… sekali saja',
        tr: 'Tanıma hazırlanıyor… yalnızca bir kez',
        pl: 'Przygotowuję rozpoznawanie… tylko raz',
      });
    }
    switch (status) {
      case 'idle':
        return holdModeView
          ? L(lang, {
              ru: 'Зажми кнопку и говори, отпусти — проверю',
              uk: 'Затисни кнопку й говори, відпусти — перевірю',
              es: 'Mantén pulsado y habla, suelta y reviso',
              'pt-BR': 'Segure e fale, solte que eu verifico',
              vi: 'Nhấn giữ và nói, thả ra để kiểm tra',
              id: 'Tekan tahan dan bicara, lepas untuk diperiksa',
              tr: 'Basılı tut ve konuş, bırak kontrol edeyim',
              pl: 'Przytrzymaj i mów, puść — sprawdzę',
            })
          : L(lang, {
          ru: 'Зажми кнопку и говори, отпусти — проверю',
          uk: 'Затисни кнопку й говори, відпусти — перевірю',
          es: 'Mantén pulsado y habla, suelta y reviso',
          'pt-BR': 'Segure e fale, solte que eu verifico',
          vi: 'Nhấn giữ và nói, thả ra để kiểm tra',
          id: 'Tekan tahan dan bicara, lepas untuk diperiksa',
          tr: 'Basılı tut ve konuş, bırak kontrol edeyim',
          pl: 'Przytrzymaj i mów, puść — sprawdzę',
        });
      case 'requesting':
        return L(lang, { ru: 'Готовимся слушать…', uk: 'Готуємось слухати…', es: 'Preparando…', 'pt-BR': 'Preparando…', vi: 'Đang chuẩn bị nghe…', id: 'Menyiapkan…', tr: 'Dinlemeye hazırlanıyor…', pl: 'Przygotowuję słuchanie…' });
      case 'listening':
        return '';
      case 'scoring':
        return L(lang, { ru: 'Проверяю…', uk: 'Перевіряю…', es: 'Comprobando…', 'pt-BR': 'Verificando…', vi: 'Đang kiểm tra…', id: 'Memeriksa…', tr: 'Kontrol ediyorum…', pl: 'Sprawdzam…' });
      case 'passed':
        return L(lang, { ru: 'Отлично! Чисто сказано', uk: 'Чудово! Чітко сказано', es: '¡Genial! Bien dicho', 'pt-BR': 'Ótimo! Bem pronunciado', vi: 'Tuyệt! Nói rất rõ', id: 'Bagus! Diucapkan dengan jelas', tr: 'Harika! Temiz söyledin', pl: 'Świetnie! Powiedziane czysto' });
      case 'failed':
        return L(lang, { ru: 'Почти. Попробуй ещё раз', uk: 'Майже. Спробуй ще раз', es: 'Casi. Inténtalo otra vez', 'pt-BR': 'Quase. Tente de novo', vi: 'Gần đúng rồi. Thử lại nhé', id: 'Hampir. Coba lagi', tr: 'Neredeyse. Bir daha dene', pl: 'Prawie. Spróbuj jeszcze raz' });
      case 'no_speech':
        return L(lang, {
          ru: 'Не расслышал. Скажи чуть громче',
          uk: 'Не розчув. Скажи трохи гучніше',
          es: 'No te oí. Habla un poco más alto',
          'pt-BR': 'Não ouvi bem. Fale um pouco mais alto',
          vi: 'Không nghe rõ. Hãy nói to hơn một chút',
          id: 'Tidak terdengar. Ucapkan sedikit lebih keras',
          tr: 'Duyamadım. Biraz daha yüksek sesle söyle',
          pl: 'Nie dosłyszałem. Powiedz trochę głośniej',
        });
      case 'denied':
        return L(lang, {
          ru: 'Нужен доступ к микрофону',
          uk: 'Потрібен доступ до мікрофона',
          es: 'Se necesita el micrófono',
          'pt-BR': 'É preciso acesso ao microfone',
          vi: 'Cần quyền truy cập micrô',
          id: 'Perlu akses mikrofon',
          tr: 'Mikrofon izni gerekiyor',
          pl: 'Potrzebny jest dostęp do mikrofonu',
        });
      case 'unavailable':
        return L(lang, {
          ru: 'Это устройство не умеет распознавать речь. Остальные упражнения доступны',
          uk: 'Цей пристрій не вміє розпізнавати мовлення. Інші вправи доступні',
          es: 'Este dispositivo no reconoce voz. Los demás ejercicios están disponibles',
          'pt-BR': 'Este dispositivo não reconhece voz. Os outros exercícios estão disponíveis',
          vi: 'Thiết bị này không nhận dạng giọng nói. Các bài tập khác vẫn dùng được',
          id: 'Perangkat ini tidak bisa mengenali suara. Latihan lain tetap tersedia',
          tr: 'Bu cihaz konuşmayı tanıyamıyor. Diğer alıştırmalar kullanılabilir',
          pl: 'To urządzenie nie rozpoznaje mowy. Pozostałe ćwiczenia są dostępne',
        });
      case 'stalled':
        return L(lang, {
          ru: 'Не удалось запустить микрофон. Попробуй ещё раз',
          uk: 'Не вдалося запустити мікрофон. Спробуй ще раз',
          es: 'No se pudo iniciar el micrófono. Inténtalo de nuevo',
          'pt-BR': 'Não foi possível iniciar o microfone. Tente de novo',
          vi: 'Không khởi động được micrô. Hãy thử lại',
          id: 'Tidak bisa memulai mikrofon. Coba lagi',
          tr: 'Mikrofon başlatılamadı. Tekrar dene',
          pl: 'Nie udało się uruchomić mikrofonu. Spróbuj ponownie',
        });
      default:
        return '';
    }
  })();

  const micDisabled = status === 'scoring' || status === 'unavailable' || preparingModelView;

  // Открытое для тренировки слово (индекс + текст) — считаем один раз, чтобы
  // карточка и её обработчики работали с чистыми number/string.
  const openWordIndex = drill.openIndex;
  const openWordText =
    openWordIndex != null && openWordIndex >= 0 && openWordIndex < tokens.length
      ? tokens[openWordIndex]
      : null;

  if (presentation === 'inline') {
    const inlineScale = inlineMetrics.scale;
    const scaled = (base: number, floor: number) => Math.max(floor, Math.round(base * inlineScale));
    const isLive = status === 'requesting' || status === 'listening';
    const canOpenSettings = status === 'denied';
    return (
      <View
        testID="speaking-inline-card"
        pointerEvents={showResult || canOpenSettings ? 'auto' : 'none'}
        style={[
          styles.inlineCard,
          {
            backgroundColor: theme.card,
            borderRadius: scaled(18, 13),
            paddingHorizontal: scaled(14, 9),
            paddingVertical: scaled(6, 4),
            gap: scaled(4, 3),
          },
        ]}
        accessibilityLiveRegion="polite"
      >
        {!showResult && (
          <Text
            style={styles.inlineTokensText}
            maxFontSizeMultiplier={1.1}
          >
            {tokens.map((token, index) => {
              const settled = matched[index] === true;
              const text = settled ? token : token.replace(/[\p{L}\p{N}]/gu, '_');
              return (
                <Text
                  key={`inline-speaking-${index}`}
                  style={[
                    styles.inlineToken,
                    {
                      color: settled ? theme.correct : theme.textMuted,
                      fontSize: scaled(18, 13),
                      lineHeight: scaled(24, 17),
                      letterSpacing: settled ? 0 : scaled(2, 1),
                    },
                  ]}
                >
                  {index > 0 ? ' ' : ''}{text}
                </Text>
              );
            })}
          </Text>
        )}

        {isLive && (
          <VoiceEqualizer
            ref={equalizerRef}
            active={status === 'listening'}
            color={theme.accent}
            idleColor={theme.textMuted}
          />
        )}

        {status === 'scoring' && <ActivityIndicator color={theme.accent} />}

        {!showResult && (
          <Text
            maxFontSizeMultiplier={1.1}
            style={[
              styles.inlineStatus,
              {
                color: theme.textSecond,
                minHeight: scaled(18, 14),
                fontSize: scaled(12, 10),
                lineHeight: scaled(16, 13),
              },
            ]}
          >
            {statusLine}
          </Text>
        )}

        {canOpenSettings && (
          <Pressable
            onPress={openAppSettings}
            accessibilityRole="button"
            accessibilityLabel={L(lang, { ru: 'Открыть настройки', uk: 'Відкрити налаштування', es: 'Abrir ajustes', 'pt-BR': 'Abrir ajustes', vi: 'Mở cài đặt', id: 'Buka pengaturan', tr: 'Ayarları aç', pl: 'Otwórz ustawienia' })}
            style={[styles.inlineSettingsAction, { backgroundColor: theme.accent }]}
          >
            <Text style={{ color: theme.onAccent, fontWeight: '800' }}>
              {L(lang, { ru: 'Открыть настройки', uk: 'Відкрити налаштування', es: 'Abrir ajustes', 'pt-BR': 'Abrir ajustes', vi: 'Mở cài đặt', id: 'Buka pengaturan', tr: 'Ayarları aç', pl: 'Otwórz ustawienia' })}
            </Text>
          </Pressable>
        )}
        </View>
    );
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={handleClose} visible>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {L(lang, { ru: 'Скажи вслух', uk: 'Скажи вголос', es: 'Dilo en voz alta', 'pt-BR': 'Diga em voz alta', vi: 'Nói thành tiếng', id: 'Ucapkan keras-keras', tr: 'Yüksek sesle söyle', pl: 'Powiedz na głos' })}
            </Text>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={L(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}
            >
              <Ionicons name="close" size={24} color={theme.textMuted} />
            </Pressable>
          </View>

          {/* Целевая фраза СКРЫТА за чёрточками по буквам — юзер не видит ответ
              заранее (иначе нет смысла учиться). Слово «загорается» (становится
              читаемым) только когда юзер правильно его произнёс. После оценки
              фраза раскрывается как пословная карта попытки: зелёный — чисто,
              жёлтый — нечётко. КРАСНОЕ (не прозвучало) текстом НЕ раскрываем —
              только первая буква + маска, иначе со второй попытки эталон
              читается с экрана (анти-чит, фидбек бета-теста). Полностью красное
              слово открывают: проход фразы, живое совпадение в новой попытке
              или карточка тренировки слова. */}
          <View style={styles.phraseWrap} accessibilityRole="text">
            {tokens.map((tok, i) => {
              const entry =
                showResult && wordReport && wordReport.length === tokens.length
                  ? wordReport[i]
                  : null;
              // Слово «дочинено» тренировкой → показываем его чистым (зелёным),
              // даже если исходно было жёлтым/красным.
              const cleaned = drillCleaned.has(i);
              const effectiveStatus = entry
                ? cleaned
                  ? 'clean'
                  : entry.status
                : null;
              // Анти-чит: missed-слово не раскрываем — только первая буква.
              const missedMasked =
                effectiveStatus === 'missed' && !matched[i] && status !== 'passed';
              const reveal =
                (matched[i] || status === 'passed' || entry != null) && !missedMasked;
              // Маска по буквам: каждая буква/цифра → «_», пунктуация остаётся.
              const masked = missedMasked
                ? maskSpokenWordKeepInitial(tok)
                : tok.replace(/[\p{L}\p{N}]/gu, '_');
              // Тренируемо: показан результат, слово было проблемным и ещё не
              // закрыто. По таким словам можно нажать и открыть карточку.
              const drillable =
                showResult && entry != null && isDrillableStatus(entry.status) && !cleaned;
              const isOpen = drill.openIndex === i;
              const color = effectiveStatus
                ? effectiveStatus === 'clean'
                  ? theme.correct
                  : effectiveStatus === 'fuzzy'
                  ? warnColor
                  : theme.wrong
                : reveal
                ? theme.correct
                : theme.textMuted;
              const wordText = (
                <Text
                  style={[
                    styles.phraseWord,
                    {
                      color,
                      // Красная маска — полной яркости: это кликабельная цель
                      // «жми и тренируй», а не фоновая чёрточка.
                      opacity: reveal || missedMasked ? 1 : 0.6,
                      letterSpacing: reveal ? 0 : 2,
                    },
                  ]}
                >
                  {reveal ? tok : masked}
                  {i < tokens.length - 1 ? ' ' : ''}
                </Text>
              );
              if (!drillable) {
                return <React.Fragment key={`spk-tok-${i}`}>{wordText}</React.Fragment>;
              }
              // Тонкая подчёркивающая линия ЧУТЬ НИЖЕ слова (свой бордер, а не
              // textDecoration — тот жирный и перечёркивает низ букв). Отступ снизу
              // отводит линию от базовой линии, чтобы она не наезжала на буквы.
              return (
                <Pressable
                  key={`spk-tok-${i}`}
                  onPress={() => onTapWord(i)}
                  hitSlop={8}
                  style={[
                    styles.drillWord,
                    {
                      borderBottomColor: color,
                      borderBottomWidth: isOpen ? StyleSheet.hairlineWidth * 2 : StyleSheet.hairlineWidth,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={L(lang, {
                    ru: `Тренировать слово ${tok}`,
                    uk: `Тренувати слово ${tok}`,
                    es: `Practicar la palabra ${tok}`,
                    'pt-BR': `Praticar a palavra ${tok}`,
                    vi: `Luyện từ ${tok}`,
                    id: `Latih kata ${tok}`,
                    tr: `${tok} kelimesini çalış`,
                    pl: `Ćwicz słowo ${tok}`,
                  })}
                >
                  {wordText}
                </Pressable>
              );
            })}
          </View>

          {/* Карточка тренировки открытого слова: послушать / повторить / вердикт. */}
          {showResult && openWordIndex != null && openWordText != null && (
            <WordDrillCard
              word={openWordText}
              lang={lang}
              theme={theme}
              warnColor={warnColor}
              phase={wordPhase}
              verdict={wordVerdict}
              // При showResult фразовый микрофон уже не слушает — блокировки не нужно.
              micBusy={false}
              onHoldStart={() => {
                if (isPreview) return;
                if (pcmHoldMode) startWordHold(openWordIndex);
                else startWordAttempt(openWordIndex);
              }}
              onHoldEnd={() => {
                if (isPreview) return;
                if (pcmHoldMode) void endWordHold(openWordIndex);
                else endWordSystemAttempt();
              }}
              onPlayMine={recordingUri != null ? playMyRecording : undefined}
              onClose={closeWordCard}
            />
          )}

          {/* Все проблемные слова закрыты до зелёного — тёплая плашка. Кольцо и
              вердикт выше уже дотянуты до прохода (effectiveScore), эта строка —
              явное подтверждение «готово». */}
          {showResult && phrasePerfect && (
            <Text style={[styles.perfectLine, { color: theme.correct }]}>
              {L(lang, {
                ru: '✓ Фраза идеальна — все слова чисто',
                uk: '✓ Фраза ідеальна — усі слова чисто',
                es: '✓ Frase perfecta: todas las palabras limpias',
                'pt-BR': '✓ Frase perfeita — todas as palavras limpas',
                vi: '✓ Cụm từ hoàn hảo — mọi từ đều rõ',
                id: '✓ Frasa sempurna — semua kata jelas',
                tr: '✓ İfade kusursuz — tüm kelimeler temiz',
                pl: '✓ Fraza idealna — wszystkie słowa czysto',
              })}
            </Text>
          )}

          {/* While recording: live equalizer. After scoring: the result ring
              takes its place (Rosetta-style, percent in the center). */}
          <View style={styles.waveWrap}>
            {showResult && effectiveScore != null ? (
              <View
                style={styles.ringWrap}
                accessibilityRole="text"
                accessibilityLabel={L(lang, {
                  ru: `${starsForScore(effectiveScore, passThreshold)} из 3 звёзд, ${effectivePassed ? 'засчитано' : 'не засчитано'}`,
                  uk: `${starsForScore(effectiveScore, passThreshold)} з 3 зірок, ${effectivePassed ? 'зараховано' : 'не зараховано'}`,
                  es: `${starsForScore(effectiveScore, passThreshold)} de 3 estrellas, ${effectivePassed ? 'aprobado' : 'no aprobado'}`,
                  'pt-BR': `${starsForScore(effectiveScore, passThreshold)} de 3 estrelas, ${effectivePassed ? 'aprovado' : 'não aprovado'}`,
                  vi: `${starsForScore(effectiveScore, passThreshold)} trên 3 sao, ${effectivePassed ? 'đã đạt' : 'chưa đạt'}`,
                  id: `${starsForScore(effectiveScore, passThreshold)} dari 3 bintang, ${effectivePassed ? 'lulus' : 'belum lulus'}`,
                  tr: `3 yıldızdan ${starsForScore(effectiveScore, passThreshold)} yıldız, ${effectivePassed ? 'geçti' : 'geçmedi'}`,
                  pl: `${starsForScore(effectiveScore, passThreshold)} z 3 gwiazdek, ${effectivePassed ? 'zaliczone' : 'niezaliczone'}`,
                })}
              >
                <SpeakingScoreStars
                  score={effectiveScore}
                  passThreshold={passThreshold}
                  color={theme.accent}
                  emptyColor={theme.border}
                  animate={!isPreview}
                />
              </View>
            ) : (
              <VoiceEqualizer
                {...(isPreview ? {} : { ref: equalizerRef })}
                active={listening}
                color={theme.accent}
                idleColor={theme.border}
              />
            )}
          </View>

          {/* Status line / localized band verdict for the legacy modal surface. */}
          <Text
            style={[
              styles.status,
              {
                color:
                  (showResult && effectivePassed) || status === 'passed'
                    ? theme.correct
                    : status === 'failed' || status === 'denied' || status === 'unavailable' || status === 'stalled'
                    ? theme.wrong
                    : theme.textMuted,
              },
            ]}
          >
            {showResult && band ? speakingBandLabel(band, lang) : statusLine}
          </Text>

          {/* Одна конкретная подсказка: что именно тянет балл вниз. */}
          {showResult && hintLine && (
            <Text style={[styles.hintLine, { color: theme.textSecond }]}>{hintLine}</Text>
          )}

          {/* Конкретный звук внутри слова, когда его удалось запеленговать.
              Символы фонем языконезависимы — одна строка на все локали.
              Прячем, когда фраза уже дотянута тренировкой до прохода. */}
          {showResult && !effectivePassed && soundHint && (
            <Text style={[styles.diffSound, { color: theme.textMuted }]}>
              {L(lang, {
                ru: `звук /${soundHint.hint.expected}/ вместо /${soundHint.hint.said}/ в «${soundHint.word}»`,
                uk: `звук /${soundHint.hint.expected}/ замість /${soundHint.hint.said}/ у «${soundHint.word}»`,
                es: `sonido /${soundHint.hint.expected}/ en vez de /${soundHint.hint.said}/ en «${soundHint.word}»`,
                'pt-BR': `som /${soundHint.hint.expected}/ em vez de /${soundHint.hint.said}/ em «${soundHint.word}»`,
                vi: `âm /${soundHint.hint.expected}/ thay vì /${soundHint.hint.said}/ trong «${soundHint.word}»`,
                id: `bunyi /${soundHint.hint.expected}/ bukan /${soundHint.hint.said}/ pada «${soundHint.word}»`,
                tr: `«${soundHint.word}» sözcüğünde /${soundHint.hint.said}/ yerine /${soundHint.hint.expected}/`,
                pl: `dźwięk /${soundHint.hint.expected}/ zamiast /${soundHint.hint.said}/ w «${soundHint.word}»`,
              })}
            </Text>
          )}

          {/* Mic button — hidden when blocked (denied/unavailable) or already
              passed: there the mic can't help / isn't needed, so a clear action
              button takes its place.

              Real speaking mode uses one interaction model on both platforms:
              press-in starts, press-out finishes. */}
          {!isBlocked && !passed && (
            <Pressable
              // Дисплейный флаг: КАК выглядит кнопка (push-to-talk vs tap). В превью
              // он отражает previewHoldMode, но обработчики инертны — startHold сам
              // перепроверяет ПОВЕДЕНЧЕСКИЙ holdMode (false в превью) и выходит,
              // startListening выходит по isPreview. Микрофон в превью не трогается.
              {...(holdModeView
                ? {
                    onPressIn: () => {
                      if (Platform.OS === 'ios') {
                        systemHoldPressActiveRef.current = true;
                        void startListening();
                      } else if (pcmHoldMode) {
                        startHold();
                      } else {
                        systemHoldPressActiveRef.current = true;
                        void startListening();
                      }
                    },
                    onPressOut: () => {
                      if (Platform.OS === 'ios') {
                        stopListening();
                      } else if (pcmHoldMode) {
                        void endHold();
                      } else {
                        stopListening();
                      }
                    },
                  }
                : { onPress: listening ? stopListening : startListening })}
              disabled={micDisabled}
              accessibilityRole="button"
              accessibilityLabel={
                holdModeView
                  ? L(lang, { ru: 'Зажми и говори', uk: 'Затисни й говори', es: 'Mantén pulsado y habla', 'pt-BR': 'Segure e fale', vi: 'Nhấn giữ và nói', id: 'Tekan tahan dan bicara', tr: 'Basılı tut ve konuş', pl: 'Przytrzymaj i mów' })
                  : L(lang, { ru: 'Зажми и говори', uk: 'Затисни й говори', es: 'Mantén pulsado y habla', 'pt-BR': 'Segure e fale', vi: 'Nhấn giữ và nói', id: 'Tekan tahan dan bicara', tr: 'Basılı tut ve konuş', pl: 'Przytrzymaj i mów' })
              }
              accessibilityState={{ disabled: micDisabled, busy: status === 'requesting' || status === 'scoring' }}
              style={[
                styles.micBtn,
                {
                  backgroundColor: listening ? theme.wrong : theme.accent,
                  opacity: micDisabled ? 0.5 : 1,
                },
              ]}
            >
              {status === 'requesting' || status === 'scoring' ? (
                <ActivityIndicator color={theme.onAccent} />
              ) : (
                <Ionicons name={listening ? 'stop' : 'mic'} size={28} color={theme.onAccent} />
              )}
            </Pressable>
          )}

          {/* Passed -> прямой выход: фраза засчитана, явная кнопка «Готово»
              закрывает панель (раньше юзер застревал на микрофоне). «Сказать
              ещё раз» остаётся тихой вторичной ссылкой ниже. */}
          {passed && (
            <Pressable
              onPress={() => {
                // Кладём фразу в поле ответа урока, затем закрываем панель —
                // чтобы юзер сразу мог нажать «Проверить».
                onFillAnswer?.(targetText);
                handleClose();
              }}
              accessibilityRole="button"
              accessibilityLabel={L(lang, { ru: 'Готово', uk: 'Готово', es: 'Listo', 'pt-BR': 'Pronto', vi: 'Xong', id: 'Selesai', tr: 'Tamam', pl: 'Gotowe' })}
              style={[styles.actionBtn, { backgroundColor: theme.correct }]}
            >
              <Text style={[styles.actionBtnText, { color: theme.onAccent }]}>
                {L(lang, { ru: 'Готово', uk: 'Готово', es: 'Listo', 'pt-BR': 'Pronto', vi: 'Xong', id: 'Selesai', tr: 'Tamam', pl: 'Gotowe' })}
              </Text>
            </Pressable>
          )}

          {/* Retry after an attempt (pass / fail / nothing heard / stalled).
              В hold-режиме ретрай = сброс на idle (юзер снова зажимает кнопку);
              на системном пути — прямой перезапуск прослушивания. */}
          {(status === 'failed' || status === 'passed' || status === 'no_speech' || status === 'stalled') && (
            <Pressable onPress={holdModeView ? resetForRetry : startListening} hitSlop={8} style={styles.retry}>
              <Text style={[styles.retryText, { color: theme.accent }]}>
                {L(lang, { ru: 'Сказать ещё раз', uk: 'Сказати ще раз', es: 'Decir de nuevo', 'pt-BR': 'Dizer de novo', vi: 'Nói lại lần nữa', id: 'Ucapkan lagi', tr: 'Bir daha söyle', pl: 'Powiedz jeszcze raz' })}
              </Text>
            </Pressable>
          )}

          {/* Denied -> deep-link to system settings so the user can grant mic. */}
          {status === 'denied' && (
            <Pressable
              onPress={openAppSettings}
              accessibilityRole="button"
              style={[styles.actionBtn, { backgroundColor: theme.accent }]}
            >
              <Text style={[styles.actionBtnText, { color: theme.onAccent }]}>
                {L(lang, { ru: 'Открыть настройки', uk: 'Відкрити налаштування', es: 'Abrir ajustes', 'pt-BR': 'Abrir ajustes', vi: 'Mở cài đặt', id: 'Buka pengaturan', tr: 'Ayarları aç', pl: 'Otwórz ustawienia' })}
              </Text>
            </Pressable>
          )}

          {/* Unavailable -> not a dead end: a calm "Got it" closes the panel. */}
          {status === 'unavailable' && (
            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              style={[styles.actionBtn, { backgroundColor: theme.accent }]}
            >
              <Text style={[styles.actionBtnText, { color: theme.onAccent }]}>
                {L(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}
              </Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  inlineCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  inlineTokensText: { width: '100%', textAlign: 'center' },
  inlineToken: { fontSize: 18, lineHeight: 24, fontWeight: '800' },
  inlineStatus: { minHeight: 18, fontSize: 12, lineHeight: 16, fontWeight: '700', textAlign: 'center' },
  inlineSettingsAction: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 0,
    padding: 22,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700' },
  diffSound: { fontSize: 12, marginTop: -10, marginBottom: 10, textAlign: 'center' },
  hintLine: { fontSize: 13, textAlign: 'center', marginTop: -12, marginBottom: 12 },
  perfectLine: { fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 14 },
  // Подчёркиваемое (тренируемое) слово: тонкая линия чуть ниже букв. paddingBottom
  // отводит бордер от базовой линии, чтобы не перечёркивать хвосты букв (g, y, p).
  drillWord: { paddingBottom: 3 },
  phraseWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  phraseWord: { fontSize: 22, fontWeight: '600', lineHeight: 30 },
  waveWrap: { minHeight: 110, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
  ringTarget: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  status: { fontSize: 14, textAlign: 'center', marginBottom: 20, minHeight: 20 },
  micBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retry: { marginTop: 16 },
  retryText: { fontSize: 15, fontWeight: '600' },
  actionBtn: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    minWidth: 180,
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default SpeakingPanel;
