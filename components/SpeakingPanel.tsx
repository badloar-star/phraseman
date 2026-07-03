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
import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File } from 'expo-file-system';
import * as Speech from 'expo-speech';

import { LOUD_PLAYBACK_AUDIO_MODE } from '../app/audio_playback_mode';
import { VoiceEqualizer, type VoiceEqualizerRef } from '../app/voice_equalizer';
import {
  PLAN_PRONUNCIATION_PASS_THRESHOLD,
  scorePlanPronunciationTranscript,
} from '../app/personal_plan_pronunciation_scoring_client';
import {
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
  type SpeakingHint,
} from '../app/speaking_score_bands';
import {
  buildSpokenWordReport,
  firstSoundHint,
  type SpokenWordEntry,
} from '../app/speaking_word_report';
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
import SpeakingScoreRing from './SpeakingScoreRing';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useRecordStartCue } from '../hooks/use-record-start-cue';
import { isSpeechRecognitionAvailable } from '../app/personal_plan_speech_module';

// Вернуть аудио-сессию в «громкое воспроизведение». Распознавание переводит её
// в запись (playAndRecord) — без сброса всё, что играет после (эталон, «Моя
// запись», mp3 в уроках), выходит тихим/через разговорный динамик или молчит.
function restoreLoudPlaybackMode(): void {
  void setAudioModeAsync(LOUD_PLAYBACK_AUDIO_MODE).catch(() => undefined);
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
 *  - вердикт полосой (Отлично/Хорошо/Почти/Пока нечётко) + ОДНА конкретная
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
}

type SpeechModule = {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
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
  onFillAnswer,
  onClose,
  previewStatus,
  previewScore,
  previewHoldMode,
}: SpeakingPanelProps) {
  const isPreview = previewStatus != null;
  // In preview mode the native speech module is never touched, so permission
  // prompts and recognition stay inert while the visual state is inspected.
  const speech = useMemo(() => (isPreview ? null : loadSpeechModule()), [isPreview]);
  const { playRecordStart } = useRecordStartCue();
  const [status, setStatus] = useState<SpeakingPanelStatus>(previewStatus ?? 'idle');
  const [transcript, setTranscript] = useState('');
  // Пословная карта попытки (чисто/нечётко/пропущено) — показывается после
  // КАЖДОЙ оценённой попытки, и на passed, и на failed.
  const [wordReport, setWordReport] = useState<SpokenWordEntry[] | null>(null);
  // Одна конкретная подсказка «что тянет балл вниз» (самая важная проблема).
  const [hint, setHint] = useState<SpeakingHint | null>(null);
  // uri сохранённой записи попытки (событие audioend) — питает «Мою запись»
  // и контрольный прогон без подсказки цели.
  const recordingUriRef = useRef<string | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  // Плеер повтора своей записи; пересоздаётся на каждый тап, гасится на анмаунте.
  const replayPlayerRef = useRef<AudioPlayer | null>(null);
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
  const mountedRef = useRef(true);
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
    async (uri: string): Promise<number | null> => {
      // Уровень B: сначала нейро-судья (whisper на устройстве) — он одинаков
      // на всех OEM и полностью офлайн. Недоступен/не успел → системный движок.
      const neural = await judgeWithNeuralEngine({ wavUri: uri, targetText });
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
          resolve(value);
        };
        // Файловое распознавание короткой фразы обычно укладывается в ~1-2с;
        // 3.5с — потолок, дальше отдаём результат без поправки.
        const timer = setTimeout(() => {
          try {
            neutralEngine.abort();
          } catch {
            /* no-op */
          }
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
    ) => {
      if (!mountedRef.current) return;
      const biased = scorePlanPronunciationTranscript({ targetText, transcript: text, segments });
      const { score: honestScore, flagged } = applyControlScore(biased.score, control);
      const passed = honestScore >= biased.threshold;
      const report = buildSpokenWordReport({ targetText, transcript: text, segments });
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
    [targetText, onPass],
  );

  const finishAttempt = useCallback(
    async (
      finalTranscript: string,
      segments?: ReadonlyArray<{ segment?: string; confidence?: number }>,
    ) => {
      if (!mountedRef.current) return;
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
        setStatus('no_speech');
        hapticError();
        restoreLoudPlaybackMode();
        return;
      }
      // Честность: тот же звук — нейтральному движку без подсказки. Балл не
      // может превышать его вердикт больше, чем на допуск (speaking_honesty_check).
      let control: number | null = null;
      if (!isPreview) {
        const uri = await waitForRecordingUri(700);
        if (uri) control = await runControlPass(uri);
      }
      applyScoredResult(text, segments, control);
    },
    [clearWatchdog, cleanupListeners, isPreview, waitForRecordingUri, runControlPass, applyScoredResult],
  );

  const stopListening = useCallback(() => {
    clearWatchdog();
    try {
      speech?.stop();
    } catch {
      /* no-op */
    }
  }, [speech, clearWatchdog]);

  const startListening = useCallback(async () => {
    if (isPreview) return; // mic is inert while previewing a fixed status
    if (!speech) {
      setStatus('unavailable');
      return;
    }
    if (!isSpeechRecognitionAvailable(speech)) {
      setStatus('unavailable');
      return;
    }
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
    try {
      const permission = await speech.requestPermissionsAsync();
      if (!mountedRef.current) return;
      if (!permission?.granted) {
        setStatus('denied');
        return;
      }
    } catch {
      if (mountedRef.current) setStatus('denied');
      return;
    }

    cleanupListeners();
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

    const resultSub = speech.addListener('result', (event: any) => {
      // Первый результат = движок точно жив (на редких OEM 'start' не эмитится,
      // а сразу приходит result) — на всякий случай тоже снимаем watchdog.
      clearWatchdog();
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
      clearWatchdog();
    });
    const endSub = speech.addListener('end', () => {
      // Скорим по самому полному варианту, а не по последнему обрывку.
      void finishAttempt(best || latest, bestSegments);
    });
    const errorSub = speech.addListener('error', () => {
      clearWatchdog();
      if (mountedRef.current) {
        const final = best || latest;
        if (final) void finishAttempt(final, bestSegments);
        else setStatus('no_speech');
      }
    });
    const noMatchSub = speech.addListener('nomatch', () => {
      clearWatchdog();
      if (mountedRef.current) setStatus('no_speech');
    });
    // uri сохранённой записи попытки: питает «Мою запись» и контрольный прогон.
    const audioEndSub = speech.addListener('audioend', (event: any) => {
      const uri = typeof event?.uri === 'string' && event.uri.length > 0 ? event.uri : null;
      recordingUriRef.current = uri;
      if (mountedRef.current) setRecordingUri(uri);
    });
    // Live volume -> equalizer, pushed IMPERATIVELY (no setState → no re-render
    // of the modal on every sample). The equalizer derives loudness + tone tilt.
    const volumeSub = speech.addListener('volumechange', (event: any) => {
      if (!mountedRef.current) return;
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
      audioEndSub,
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
    if (!mountedRef.current) return;

    try {
      setStatus('listening');
      // Watchdog: если за 7с движок не пришлёт НИ start, НИ первого result —
      // считаем его зависшим (типичная Android-беда: сервис принял start(), но
      // молчит). Прерываем и показываем «stalled» с кнопкой «Повторить», а не
      // оставляем юзера в вечном спиннере. Снимается любым событием жизни выше.
      clearWatchdog();
      watchdogRef.current = setTimeout(() => {
        watchdogRef.current = null;
        if (!mountedRef.current) return;
        try {
          speech.abort();
        } catch {
          /* no-op */
        }
        cleanupListeners();
        setStatus('stalled');
        hapticError();
        restoreLoudPlaybackMode();
      }, 7000);
      speech.start(
        buildSpeakingStartOptions({
          lang: recognitionLocale,
          targetText,
          interimResults: true,
          volumeMeter: true,
          onDevice,
          // Файл записи нужен ИМЕННО здесь: «Моя запись» + контрольный прогон.
          persistRecording: true,
        }),
      );
      // Mic is live now -> canonical "recording started" cue (sound + haptic).
      playRecordStart();
    } catch {
      clearWatchdog();
      if (mountedRef.current) setStatus('unavailable');
    }
  }, [isPreview, speech, recognitionLocale, targetText, cleanupListeners, finishAttempt, playRecordStart, clearWatchdog]);

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
  // true = мы в hold-режиме И модель готова: кнопка работает как push-to-talk.
  // ПОВЕДЕНЧЕСКИЙ флаг: реальная запись/распознавание. В превью всегда false
  // (holdSupported требует !isPreview) — микрофон не трогается.
  const holdMode = holdSupported && holdModelReady;
  // ДИСПЛЕЙНЫЙ флаг: как ВЫГЛЯДИТ панель. В превью отражает previewHoldMode (dev-
  // проп админ-лаборатории), чтобы android-вид «Зажми и говори» был виден с iPhone
  // БЕЗ реального микрофона. Вне превью совпадает с holdMode.
  const holdModeView = isPreview ? previewHoldMode === true : holdMode;

  const startHold = useCallback(() => {
    if (!holdMode) return;
    if (holdRecRef.current) return; // уже держим
    holdFinishingRef.current = false;
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
    setStatus('listening');
    hapticTap();
    holdRecRef.current = startHoldRecording();
  }, [holdMode]);

  const endHold = useCallback(async () => {
    const rec = holdRecRef.current;
    if (!rec) return;
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
    if (!mountedRef.current) {
      deleteHoldRecording(wavUri);
      return;
    }
    if (!wavUri) {
      // Ничего не записалось (слишком коротко / сбой записи) — не 0%, а «не расслышал».
      setStatus('no_speech');
      hapticError();
      return;
    }
    const verdict = await judgeWithNeuralEngine({
      wavUri,
      targetText,
      locale: recognitionLocale,
    });
    // Файл записи больше не нужен — реплей на hold-пути не используется.
    deleteHoldRecording(wavUri);
    if (!mountedRef.current) return;
    const text = (verdict?.transcript ?? '').trim();
    if (!text) {
      setStatus('no_speech');
      hapticError();
      return;
    }
    // whisper — уже НЕЙТРАЛЬНЫЙ движок (не знает цели), поэтому его же балл идёт
    // как контрольный: honesty-поправка не даёт biasing «подарить» зачёт.
    applyScoredResult(text, undefined, verdict?.controlScore ?? null);
  }, [targetText, recognitionLocale, applyScoredResult]);

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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearWatchdog();
      cleanupListeners();
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
  }, [speech, cleanupListeners, clearWatchdog]);

  // Модель whisper не смогла подготовиться (нет сети при первом запуске) —
  // откатываемся на системный путь, чтобы юзер не застрял на «идёт подготовка».
  const [holdModelFailed, setHoldModelFailed] = useState(false);

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
      else setHoldModelFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [isPreview, recognitionLocale]);

  // Автостарт СИСТЕМНОГО пути: панель монтируется по нажатию «Устно». В hold-
  // режиме (Android + whisper) НЕ автостартуем — юзер сам зажимает кнопку. В
  // preview микрофон инертен. Пока модель качается — ждём (статус «подготовка»);
  // если подготовка ПРОВАЛИЛАСЬ — откатываемся на системный автостарт.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (isPreview) return;
    if (autoStartedRef.current) return;
    // На Android с рабочим hold-режимом системный путь не нужен вовсе.
    if (holdSupported && !holdModelFailed) return;
    autoStartedRef.current = true;
    void startListening();
  }, [isPreview, holdSupported, holdModelFailed, startListening]);

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
    // Сначала «громкое воспроизведение»: после распознавания сессия всё ещё в
    // записи, и без сброса запись играла бы тихо через разговорный динамик.
    void setAudioModeAsync(LOUD_PLAYBACK_AUDIO_MODE)
      .catch(() => undefined)
      .finally(() => {
        try {
          const player = createAudioPlayer(recordingUri);
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

  // «Эталон»: системный TTS произносит целевую фразу. У панели нет доступа к
  // студийным клипам урока (хосты разные), а TTS покрывает любую фразу.
  const playReference = useCallback(() => {
    hapticTap();
    try {
      replayPlayerRef.current?.pause();
    } catch {
      /* no-op */
    }
    // Та же гигиена, что и у «Моей записи»: сначала громкий режим, потом TTS —
    // иначе эталон после попытки звучит еле слышно и обрывается.
    void setAudioModeAsync(LOUD_PLAYBACK_AUDIO_MODE)
      .catch(() => undefined)
      .finally(() => {
        try {
          Speech.stop();
          Speech.speak(targetText, { language: recognitionLocale });
        } catch {
          /* no-op */
        }
      });
  }, [targetText, recognitionLocale]);

  const listening = status === 'listening';
  const showResult = status === 'passed' || status === 'failed';
  const isBlocked = status === 'denied' || status === 'unavailable';
  // На успехе фраза засчитана — микрофон больше не нужен (иначе юзер «застревает»
  // на экране с микрофоном и «Сказать ещё раз», не понимая, что уже готово).
  // Вместо микрофона показываем явную кнопку «Готово», которая закрывает панель.
  const passed = status === 'passed';
  const passThreshold = PLAN_PRONUNCIATION_PASS_THRESHOLD;
  const warnColor = theme.warn ?? WARN_COLOR_FALLBACK;
  const band = score != null ? speakingBand(score, passThreshold) : null;
  const hintLine = hint ? speakingHintText(hint, lang) : null;
  // Android hold-режим поддержан, но модель whisper ещё качается (и не провалилась)
  // — кнопка ждёт, статус честно объясняет паузу вместо тихого зависания.
  const preparingModel = holdSupported && !holdModelReady && !holdModelFailed;
  // ДИСПЛЕЙНЫЙ флаг «идёт подготовка». В превью — по previewHoldMode === 'preparing'
  // (взаимоисключимо с holdModeView === true, поэтому оба вида — готовую кнопку и
  // состояние подготовки — можно посмотреть в лаборатории отдельно). Вне превью =
  // поведенческий preparingModel.
  const preparingModelView = isPreview ? previewHoldMode === 'preparing' : preparingModel;

  const statusLine = (() => {
    if (preparingModelView && (status === 'idle' || status === 'requesting')) {
      return L(lang, {
        ru: 'Готовим распознавание… это разово',
        uk: 'Готуємо розпізнавання… це одноразово',
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
          ru: 'Нажми на микрофон и произнеси фразу',
          uk: 'Натисни на мікрофон і вимов фразу',
          es: 'Toca el micrófono y di la frase',
          'pt-BR': 'Toque no microfone e diga a frase',
          vi: 'Nhấn vào micrô và nói cụm từ',
          id: 'Ketuk mikrofon dan ucapkan frasa',
          tr: 'Mikrofona dokun ve ifadeyi söyle',
          pl: 'Dotknij mikrofonu i wypowiedz frazę',
        });
      case 'requesting':
        return L(lang, { ru: 'Готовимся слушать…', uk: 'Готуємось слухати…', es: 'Preparando…', 'pt-BR': 'Preparando…', vi: 'Đang chuẩn bị nghe…', id: 'Menyiapkan…', tr: 'Dinlemeye hazırlanıyor…', pl: 'Przygotowuję słuchanie…' });
      case 'listening':
        return holdModeView
          ? L(lang, {
              ru: 'Говори… отпусти, когда закончишь',
              uk: 'Говори… відпусти, коли закінчиш',
              es: 'Habla… suelta al terminar',
              'pt-BR': 'Fale… solte ao terminar',
              vi: 'Hãy nói… thả ra khi xong',
              id: 'Bicara… lepas saat selesai',
              tr: 'Konuş… bitince bırak',
              pl: 'Mów… puść, gdy skończysz',
            })
          : L(lang, { ru: 'Слушаю… говори', uk: 'Слухаю… говори', es: 'Escuchando… habla', 'pt-BR': 'Escutando… fale', vi: 'Đang nghe… hãy nói', id: 'Mendengarkan… bicara', tr: 'Dinliyorum… konuş', pl: 'Słucham… mów' });
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

  const micDisabled =
    status === 'requesting' || status === 'scoring' || status === 'unavailable' || preparingModelView;

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
              фраза раскрывается ЦЕЛИКОМ как пословная карта попытки:
              зелёный — чисто, жёлтый — нечётко, красный — не прозвучало. */}
          <View style={styles.phraseWrap} accessibilityRole="text">
            {tokens.map((tok, i) => {
              const entry =
                showResult && wordReport && wordReport.length === tokens.length
                  ? wordReport[i]
                  : null;
              const reveal = matched[i] || status === 'passed' || entry != null;
              // Маска по буквам: каждая буква/цифра → «_», пунктуация остаётся.
              const masked = tok.replace(/[\p{L}\p{N}]/gu, '_');
              const color = entry
                ? entry.status === 'clean'
                  ? theme.correct
                  : entry.status === 'fuzzy'
                  ? warnColor
                  : theme.wrong
                : reveal
                ? theme.correct
                : theme.textMuted;
              return (
                <Text
                  key={`spk-tok-${i}`}
                  style={[
                    styles.phraseWord,
                    {
                      color,
                      opacity: reveal ? 1 : 0.6,
                      letterSpacing: reveal ? 0 : 2,
                    },
                  ]}
                >
                  {reveal ? tok : masked}
                  {i < tokens.length - 1 ? ' ' : ''}
                </Text>
              );
            })}
          </View>

          {/* While recording: live equalizer. After scoring: the result ring
              takes its place (Rosetta-style, percent in the center). */}
          <View style={styles.waveWrap}>
            {showResult && score != null ? (
              <View
                style={styles.ringWrap}
                accessibilityRole="text"
                accessibilityLabel={L(lang, {
                  ru: `Результат ${score} процентов из ${passThreshold} нужных, ${status === 'passed' ? 'засчитано' : 'не засчитано'}`,
                  uk: `Результат ${score} відсотків із ${passThreshold} потрібних, ${status === 'passed' ? 'зараховано' : 'не зараховано'}`,
                  es: `Resultado ${score} por ciento de ${passThreshold} necesarios, ${status === 'passed' ? 'aprobado' : 'no aprobado'}`,
                  'pt-BR': `Resultado ${score} por cento de ${passThreshold} necessários, ${status === 'passed' ? 'aprovado' : 'não aprovado'}`,
                  vi: `Kết quả ${score} phần trăm trên ${passThreshold} cần thiết, ${status === 'passed' ? 'đã đạt' : 'chưa đạt'}`,
                  id: `Hasil ${score} persen dari ${passThreshold} yang diperlukan, ${status === 'passed' ? 'lulus' : 'belum lulus'}`,
                  tr: `Sonuç gerekli ${passThreshold} üzerinden yüzde ${score}, ${status === 'passed' ? 'geçti' : 'geçmedi'}`,
                  pl: `Wynik ${score} procent z wymaganych ${passThreshold}, ${status === 'passed' ? 'zaliczone' : 'niezaliczone'}`,
                })}
              >
                <SpeakingScoreRing
                  score={score}
                  color={status === 'passed' ? theme.correct : theme.wrong}
                  trackColor={theme.border}
                  textColor={theme.textPrimary}
                  innerBg={theme.card}
                  animate={!isPreview}
                />
                <Text style={[styles.ringTarget, { color: theme.textMuted }]}>
                  {L(lang, {
                    ru: `нужно ${passThreshold}%`,
                    uk: `потрібно ${passThreshold}%`,
                    es: `se necesita ${passThreshold}%`,
                    'pt-BR': `precisa de ${passThreshold}%`,
                    vi: `cần ${passThreshold}%`,
                    id: `butuh ${passThreshold}%`,
                    tr: `%${passThreshold} gerekli`,
                    pl: `potrzeba ${passThreshold}%`,
                  })}
                </Text>
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

          {/* Status line / band verdict. После оценки вместо сырого статуса —
              полоса (Отлично / Хорошо / Почти / Пока нечётко). */}
          <Text
            style={[
              styles.status,
              {
                color:
                  status === 'passed'
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
              Символы фонем языконезависимы — одна строка на все локали. */}
          {showResult && soundHint && (
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

          {/* «Послушай себя» ↔ эталон: сравнение на слух сильнее любого процента. */}
          {showResult && (
            <View style={styles.listenRow}>
              {recordingUri != null && (
                <Pressable
                  onPress={playMyRecording}
                  accessibilityRole="button"
                  style={[styles.listenBtn, { borderColor: theme.border }]}
                >
                  <Ionicons name="play" size={16} color={theme.accent} />
                  <Text style={[styles.listenText, { color: theme.textPrimary }]}>
                    {L(lang, { ru: 'Моя запись', uk: 'Мій запис', es: 'Mi grabación', 'pt-BR': 'Minha gravação', vi: 'Bản ghi của tôi', id: 'Rekamanku', tr: 'Kaydım', pl: 'Moje nagranie' })}
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={playReference}
                accessibilityRole="button"
                style={[styles.listenBtn, { borderColor: theme.border }]}
              >
                <Ionicons name="volume-high" size={16} color={theme.accent} />
                <Text style={[styles.listenText, { color: theme.textPrimary }]}>
                  {L(lang, { ru: 'Эталон', uk: 'Зразок', es: 'Modelo', 'pt-BR': 'Modelo', vi: 'Bản mẫu', id: 'Contoh', tr: 'Örnek', pl: 'Wzór' })}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Mic button — hidden when blocked (denied/unavailable) or already
              passed: there the mic can't help / isn't needed, so a clear action
              button takes its place.

              Two interaction models:
              • holdMode (Android + whisper): PUSH-TO-TALK. Hold to record, release
                to score. No system endpointer → no instant "closed by itself".
              • otherwise (iOS / fallback): tap-to-start / tap-to-stop, engine
                auto-endpoints (unchanged behaviour). */}
          {!isBlocked && !passed && (
            <Pressable
              // Дисплейный флаг: КАК выглядит кнопка (push-to-talk vs tap). В превью
              // он отражает previewHoldMode, но обработчики инертны — startHold сам
              // перепроверяет ПОВЕДЕНЧЕСКИЙ holdMode (false в превью) и выходит,
              // startListening выходит по isPreview. Микрофон в превью не трогается.
              {...(holdModeView
                ? {
                    onPressIn: startHold,
                    onPressOut: () => {
                      void endHold();
                    },
                  }
                : { onPress: listening ? stopListening : startListening })}
              disabled={micDisabled}
              accessibilityRole="button"
              accessibilityLabel={
                holdModeView
                  ? L(lang, { ru: 'Зажми и говори', uk: 'Затисни й говори', es: 'Mantén pulsado y habla', 'pt-BR': 'Segure e fale', vi: 'Nhấn giữ và nói', id: 'Tekan tahan dan bicara', tr: 'Basılı tut ve konuş', pl: 'Przytrzymaj i mów' })
                  : listening
                  ? L(lang, { ru: 'Остановить запись', uk: 'Зупинити запис', es: 'Detener', 'pt-BR': 'Parar gravação', vi: 'Dừng ghi âm', id: 'Hentikan rekaman', tr: 'Kaydı durdur', pl: 'Zatrzymaj nagrywanie' })
                  : L(lang, { ru: 'Начать говорить', uk: 'Почати говорити', es: 'Empezar a hablar', 'pt-BR': 'Começar a falar', vi: 'Bắt đầu nói', id: 'Mulai bicara', tr: 'Konuşmaya başla', pl: 'Zacznij mówić' })
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
    borderWidth: 1,
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
  listenRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  listenText: { fontSize: 13, fontWeight: '600' },
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
