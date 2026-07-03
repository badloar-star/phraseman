import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
// ════════════════════════════════════════════════════════════════════════════
// ПРАВИЛО UX (важно, действует во ВСЁМ этом экране):
// Разбор ответа («почему так» / «разберём спокойно» / подтверждение) показывается
// ИНЛАЙН прямо на экране — плашкой в пустоте по центру, под фразой, как teaching
// note в обычном уроке (см. компонент PlanExerciseFeedbackInline). НИКАКИХ отдельных
// всплывающих модалов для разбора ответа быть НЕ должно: модал = «двойной контейнер»
// и закрывает экран. Любой НОВЫЙ режим упражнения с вариантами на экране обязан
// добавить себя в `usesOptionFeedback` и рендерить разбор инлайн, а НЕ модалом.
// Единственный оставшийся модал — это «Задание закрыто» (конец задания), он НЕ про
// разбор ответа. Старый PlanExerciseFeedbackModal оставлен только как fallback для
// режимов без места на экране и постепенно выпиливается — не использовать в новом коде.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, type TextStyle, type ViewStyle } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { File } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { safeRouterBack } from './navigation_back';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useTheme } from '../components/ThemeContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { monoIcon, MONO_ICON } from '../constants/monoIcon';
import { awardPlanTaskCompletion } from './personal_plan_xp';
import AiMistakeCard from '../components/AiMistakeCard';
import { useMistakeExplain } from './use_mistake_explain';
import { useAudio } from '../hooks/use-audio';
import {
  scorePlanPronunciationTranscript,
  PLAN_PRONUNCIATION_PASS_THRESHOLD,
  PLAN_PRONUNCIATION_SCORING_VERSION,
  type PlanPronunciationScoringResult,
} from './personal_plan_pronunciation_scoring_client';
import { isSpeechRecognitionAvailable, loadPlanSpeechModule } from './personal_plan_speech_module';
import { isSpeakingEnabled } from './remote_flags';
import { useCorrectSound } from '../hooks/use-correct-sound';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useRecordStartCue } from '../hooks/use-record-start-cue';
import { VoiceEqualizer } from './voice_equalizer';
import { speakingTargetTokens, speakingMatchedFlags } from './speaking_word_match';
import { buildSpeakingStartOptions } from './speaking_recognition_options';
import { TranscriptAccumulator } from './speaking_transcript_accumulator';
import SpeakingScoreRing from '../components/SpeakingScoreRing';
import DuoPressable from '../components/DuoPressable';
import { useWordFlash } from '../hooks/use-word-flash';
import type { PersonalPlanId } from './personal_plan_catalog';
import { hasBundledCompatibilityPlanContentDay } from './plan_content_readiness';
import ReportErrorButton from '../components/ReportErrorButton';
import { getPersonalPlanMissingWordItems } from './personal_plan_missing_word_items';
import { getPersonalPlanChooseNaturalPhraseItems } from './personal_plan_choose_natural_phrase_items';
import { getPersonalPlanListenChooseItems, type PersonalPlanListenChooseItem } from './personal_plan_listen_choose_items';
import { getPersonalPlanListenBuildItems, type PersonalPlanListenBuildItem } from './personal_plan_listen_build_items';
import { getPersonalPlanPronunciationRepeatItems } from './personal_plan_pronunciation_repeat_items';
import { getPersonalPlanPhraseRecallItems, type PersonalPlanPhraseRecallItem } from './personal_plan_phrase_recall_items';
import { buildPlanListeningPlaybackSource } from './personal_plan_listening_playback_contract';
import { LOUD_PLAYBACK_AUDIO_MODE } from './audio_playback_mode';
import { getPersonalPlanRuntimeAudioAssetModule } from './personal_plan_runtime_audio_asset_modules';
import { getPlanAudioUrl } from './plan_audio_url_map.generated';
import {
  buildPlanPronunciationAttemptPayload,
  buildPlanPronunciationRecordingContract,
} from './personal_plan_pronunciation_recording_contract';
import { markPersonalPlanTaskCompleted } from './personal_plan_progress';
import {
  readPlanTaskProgress,
  savePlanTaskProgress,
  clearPlanTaskProgress,
} from './personal_plan_task_progress';
import { resolveNextPlanTask } from './personal_plan_next_task';
import { openPersonalPlanTask } from './personal_plan_navigation';
import { startPlanExerciseSession } from './personal_plan_exercise_session';
import { submitAndStorePlanExerciseAnswer } from './personal_plan_exercise_submission_store';
import { createPlanRecoveryDefaultHandlers } from './personal_plan_recovery_default_handlers';
import type { PlanExerciseBlock, PlanExerciseType } from './personal_plan_engine_contracts';
import { planExerciseRendererContractForType, type PlanExerciseVisualShell } from './personal_plan_exercise_renderer_contracts';
import { evaluateRecallAnswer } from './review_evaluator';
import BouncyScrollView from '../components/BouncyScrollView';
import TopFadeMask from '../components/TopFadeMask';

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function splitIds(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function isPersonalPlanListenChooseItem(item: unknown): item is PersonalPlanListenChooseItem {
  return (
    item !== null
    && typeof item === 'object'
    && 'audioReady' in item
    && 'correctAnswer' in item
    && 'options' in item
  );
}

function isPersonalPlanListenBuildItem(item: unknown): item is PersonalPlanListenBuildItem {
  return (
    item !== null
    && typeof item === 'object'
    && 'audioReady' in item
    && 'correctAnswer' in item
    && 'wordOptions' in item
    && 'targetWords' in item
  );
}

function normalizePlanAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/[.!?]+$/g, '').replace(/\s+/g, ' ');
}

// Одна строка во всех активных языках интерфейса (RU / UK / ES).
// Старый авто-разбор «Почему так» (planExerciseExplanation + типы LocalizedText/
// RawTeachingNote/localizedFromNote) удалён: на неверном ответе теперь ИИ-разбор
// (AiMistakeCard), на верном — короткое «Верно!». Генерёжка больше не нужна.

type PlanExerciseModeChrome = {
  title: string;
  titleEs: string;
  instruction: string;
  instructionEs: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  visualShell: PlanExerciseVisualShell;
};

function fallbackVisualShell(type: PlanExerciseType): PlanExerciseVisualShell {
  return {
    role: type === 'plan_pronunciation_repeat' ? 'voice_self_check' : 'precision_gap',
    iconName: type === 'plan_pronunciation_repeat' ? 'mic-outline' : 'create-outline',
    primaryActionSize: 'large',
    feedbackSurface: 'liquid_panel',
    usesThemeAccentOnly: true,
  };
}

function chromeForExerciseType(type: PlanExerciseType): PlanExerciseModeChrome {
  const visualShell = planExerciseRendererContractForType(type)?.visualShell ?? fallbackVisualShell(type);
  const iconName = visualShell.iconName as React.ComponentProps<typeof Ionicons>['name'];
  switch (type) {
    case 'plan_listen_choose':
      return {
        title: 'На слух',
        titleEs: 'De oído',
        instruction: 'Сначала слушай, потом выбирай смысл. Без угадайки по виду фразы.',
        instructionEs: 'Escucha primero y luego elige el significado. Sin adivinar por la forma de la frase.',
        iconName,
        visualShell,
      };
    case 'plan_listen_build':
      return {
        title: 'Собери на слух',
        titleEs: 'Ordena de oído',
        instruction: 'Послушай фразу и собери ее по порядку. Слова не подсвечиваются.',
        instructionEs: 'Escucha la frase y ordénala. Las palabras no se resaltan.',
        iconName,
        visualShell,
      };
    case 'plan_pronunciation_repeat':
      return {
        title: 'Повтори вслух',
        titleEs: 'Repite en voz alta',
        instruction: 'Запиши короткую фразу, послушай себя и только потом засчитывай.',
        instructionEs: 'Graba una frase corta, escúchate y solo después márcala como hecha.',
        iconName,
        visualShell,
      };
    case 'plan_phrase_recall':
      return {
        title: 'Вспомни фразу',
        titleEs: 'Recuerda la frase',
        instruction: 'Без подсказок: достаем фразу из памяти, а не узнаем ее глазами.',
        instructionEs: 'Sin pistas: recupera la frase de memoria, no la reconozcas con los ojos.',
        iconName,
        visualShell,
      };
    case 'plan_choose_natural_phrase':
      return {
        title: 'Выбери фразу',
        titleEs: 'Elige la frase',
        instruction: 'Ищи живой вариант, который нормально звучит в разговоре.',
        instructionEs: 'Busca la opción viva que suena normal en conversación.',
        iconName,
        visualShell,
      };
    case 'plan_phrase_build':
      return {
        title: 'Собери фразу',
        titleEs: 'Construye la frase',
        instruction: 'Фраза маршрута собирается как обычный урок, но под цель дня.',
        instructionEs: 'La frase de la ruta se arma como una lección normal, pero para el objetivo del día.',
        iconName,
        visualShell,
      };
    case 'plan_missing_word':
    default:
      return {
        title: 'Вставь слово',
        titleEs: 'Completa la palabra',
        instruction: 'Заполни один точный пропуск. Варианты должны отличаться по смыслу.',
        instructionEs: 'Rellena un único hueco exacto. Las opciones deben distinguirse por sentido.',
        iconName,
        visualShell,
      };
  }
}

function PlanGradientButton({
  label,
  accent,
  actionText,
  onPress,
  disabled,
  style,
}: {
  label: string;
  accent: string;
  actionText: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.primaryButton,
        { borderColor: accent + '55', shadowColor: accent, opacity: disabled ? 0.45 : 1 },
        style,
      ]}
    >
      <LinearGradient
        colors={disabled ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)'] : [accent, accent + 'BB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryButtonGradient}
      >
        <Text style={[styles.primaryButtonText, { color: disabled ? actionText + '66' : actionText }]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function PlanListenChooseAudioButton({
  item,
  accent,
  actionText,
  mutedText,
}: {
  item: PersonalPlanListenChooseItem | PersonalPlanListenBuildItem;
  accent: string;
  actionText: string;
  mutedText: string;
}) {
  const playback = useMemo(() => buildPlanListeningPlaybackSource(item), [item]);
  const source = playback.source === 'in_app_audio' ? playback.playerSource : null;
  const player = useAudioPlayer(source, playback.source === 'in_app_audio' ? playback.options : undefined);
  const status = useAudioPlayerStatus(player);
  const disabled = playback.source !== 'in_app_audio';
  const isPlaying = Boolean(status?.playing);
  const isBuffering = Boolean(status?.isBuffering);
  const label = disabled ? 'Аудио готовится' : isBuffering ? 'Загрузка' : isPlaying ? 'Слушаю' : 'Слушать';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={disabled ? 'Аудио готовится' : 'Слушать фразу'}
      activeOpacity={0.82}
      disabled={disabled}
      onPress={() => {
        hapticTap();
        if (playback.source !== 'in_app_audio') return;
        void (async () => {
          try {
            await setAudioModeAsync(playback.audioMode);
          } catch {
            // Playback still tries; the mode call is best-effort on edge runtimes.
          }
          try {
            if (player.playing) {
              player.pause();
              return;
            }
            try {
              player.volume = 1;
            } catch {
              // Some runtimes may not expose a writable volume property.
            }
            await player.seekTo(0);
            player.play();
          } catch {
            // No TTS fallback here: this control must remain MP3-only.
          }
        })();
      }}
      style={[
        styles.primaryButton,
        { borderColor: accent + '55', shadowColor: disabled ? '#000000' : accent, opacity: disabled ? 0.6 : 1 },
      ]}
    >
      <LinearGradient
        colors={disabled ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)'] : [accent, accent + 'BB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryButtonGradient}
      >
        <Text style={[styles.primaryButtonText, { color: disabled ? mutedText : actionText }]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function PronunciationSpeakButton({
  enabled,
  listening,
  accent,
  actionText,
  onPress,
}: {
  enabled: boolean;
  listening: boolean;
  accent: string;
  actionText: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={listening ? 'Остановить' : 'Сказать фразу'}
      accessibilityState={{ disabled: !enabled }}
      activeOpacity={0.84}
      disabled={!enabled}
      onPress={onPress}
      style={[
        styles.recorderButton,
        {
          backgroundColor: listening ? '#FF4A55' : accent,
          borderColor: listening ? '#FF4A55' : accent,
          opacity: enabled ? 1 : 0.5,
        },
      ]}
    >
      <Ionicons
        name={listening ? 'stop-circle-outline' : 'mic-outline'}
        size={18}
        color={listening ? '#130406' : actionText}
        style={{ marginRight: 8 }}
      />
      <Text style={[styles.recorderButtonText, { color: listening ? '#130406' : actionText }]}>
        {listening ? 'Слушаю — говори' : 'Сказать фразу'}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * On-device pronunciation check. Flow: listen to the target phrase (TTS), then speak it.
 * expo-speech-recognition (speechModule) transcribes locally — no paid service, no server.
 * scorePlanPronunciationTranscript compares the transcript to the target and the learner
 * passes at PLAN_PRONUNCIATION_PASS_THRESHOLD (word coverage, fuzzy-matched so
 * fluent/run-together speech isn't penalized). We never score accent.
 */
type PronunciationBlock = 'denied' | 'unavailable' | null;

// Вернуть аудио-сессию в «громкое воспроизведение» после распознавания: без
// сброса весь звук после микрофона (mp3 фраз, озвучка ответов) играет тихо
// через разговорный динамик или не играет вовсе.
function restoreLoudPlaybackMode(): void {
  void setAudioModeAsync(LOUD_PLAYBACK_AUDIO_MODE).catch(() => undefined);
}

function deleteTransientSpeechRecordingFile(uri: string | null): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Best-effort cache hygiene only.
  }
}

function PlanPronunciationRecorder({
  accent,
  actionText,
  mutedText,
  targetText,
  audioUri,
  onScored,
  onScoringChange,
  onBlocked,
}: {
  accent: string;
  actionText: string;
  mutedText: string;
  targetText: string;
  /** Approved MP3 phrase audio. Android may fall back to TTS only when the MP3 player stays silent. */
  audioUri?: string;
  onScored: (result: PlanPronunciationScoringResult) => void;
  onScoringChange: (scoring: boolean) => void;
  /** Speech can't run here (no recognizer / mic denied) → host lets the user advance. */
  onBlocked: (blocked: PronunciationBlock) => void;
}) {
  const { speak: speakFallbackAudio, stop: stopAudio } = useAudio();
  const { playCorrect } = useCorrectSound();
  // Тема нужна, чтобы кольцо результата (SpeakingScoreRing) выглядело ТОЧНО как в
  // уроках «Устно» (SpeakingPanel): тот же цвет трека/текста/центра и pass/fail-цвета.
  const { theme: ringTheme } = useTheme();
  // MP3-плеер целевой фразы (тот же ассет, что и в «На слух»). Грузим только если
  // есть uri. Сначала пробуем серверный URL (стримится+кэшируется expo-audio, не
  // в бандле); если его ещё нет в карте — фолбэк на вшитый ассет, иначе по uri.
  const targetAudioPlayerSource = useMemo(() => {
    if (!audioUri) return null;
    const remoteUrl = getPlanAudioUrl(audioUri);
    if (remoteUrl) return remoteUrl;
    const assetModule = getPersonalPlanRuntimeAudioAssetModule(audioUri);
    return assetModule ? { assetId: assetModule } : audioUri;
  }, [audioUri]);
  const targetAudioPlayer = useAudioPlayer(targetAudioPlayerSource, targetAudioPlayerSource ? { downloadFirst: false, updateInterval: 250 } : undefined);
  const targetAudioStatus = useAudioPlayerStatus(targetAudioPlayer);
  const targetAudioStatusRef = useRef(targetAudioStatus);
  useEffect(() => {
    targetAudioStatusRef.current = targetAudioStatus;
  }, [targetAudioStatus]);
  const targetPlaybackDoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetPlaybackFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTargetPlaybackTimers = useCallback(() => {
    if (targetPlaybackDoneTimerRef.current != null) {
      clearTimeout(targetPlaybackDoneTimerRef.current);
      targetPlaybackDoneTimerRef.current = null;
    }
    if (targetPlaybackFallbackTimerRef.current != null) {
      clearTimeout(targetPlaybackFallbackTimerRef.current);
      targetPlaybackFallbackTimerRef.current = null;
    }
  }, []);
  const { playRecordStart } = useRecordStartCue();
  // Guarded native module: null on a binary/device without the recognizer, OR
  // when the remote kill-switch turns speaking off app-wide. Resolved once so the
  // whole exercise degrades (escape path) instead of crashing on mount.
  const speechModule = useMemo(() => (isSpeakingEnabled() ? loadPlanSpeechModule() : null), []);
  const [pronunciationHeardTarget, setPronunciationHeardTarget] = useState(false);
  const [pronunciationSpeakingTarget, setPronunciationSpeakingTarget] = useState(false);
  const [pronunciationListening, setPronunciationListening] = useState(false);
  // VoiceEqualizer ref: push volume samples imperatively (no setState → no re-render).
  const equalizerRef = useRef<import('./voice_equalizer').VoiceEqualizerRef>(null);
  // Live transcript for karaoke-style reveal (как в уроках «Устно»): фраза скрыта
  // чёрточками, слово открывается когда юзер его правильно произнёс.
  const [transcript, setTranscript] = useState('');
  const tokens = useMemo(() => speakingTargetTokens(targetText), [targetText]);
  const matched = useMemo(() => speakingMatchedFlags(targetText, transcript), [targetText, transcript]);
  const [pronunciationScoringLocal, setPronunciationScoringLocal] = useState(false);
  const [pronunciationScore, setPronunciationScore] = useState<PlanPronunciationScoringResult | null>(null);
  const [blocked, setBlockedLocal] = useState<PronunciationBlock>(null);
  const finishTargetPlayback = useCallback(() => {
    clearTargetPlaybackTimers();
    setPronunciationSpeakingTarget(false);
    setPronunciationHeardTarget(true);
  }, [clearTargetPlaybackTimers]);
  // «Заглох»: Android-сервис принял start(), но не подал НИ одного признака жизни
  // (ни start, ни result, ни error). Не блокирует кнопку — юзер пробует ещё раз.
  const [pronunciationStalled, setPronunciationStalled] = useState(false);
  // Watchdog против молчащего распознавателя (как в SpeakingPanel): взводится на
  // start(), снимается первым событием жизни движка; иначе через 7с гасит попытку.
  const recognizerWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishAttemptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearRecognizerWatchdog = useCallback(() => {
    if (recognizerWatchdogRef.current != null) {
      clearTimeout(recognizerWatchdogRef.current);
      recognizerWatchdogRef.current = null;
    }
  }, []);
  const clearFinishAttemptTimer = useCallback(() => {
    if (finishAttemptTimerRef.current != null) {
      clearTimeout(finishAttemptTimerRef.current);
      finishAttemptTimerRef.current = null;
    }
  }, []);
  const targetTextRef = useRef(targetText);
  targetTextRef.current = targetText;
  // Best (highest-scoring) transcript accumulated across all alternatives of all
  // result events for the current attempt, plus a guard so a result+end pair
  // doesn't double-score. Reset at the start of every attempt.
  const bestTranscriptRef = useRef('');
  const bestScoreRef = useRef(-1);
  const bestConfidenceRef = useRef<number | undefined>(undefined);
  const bestSegmentsRef = useRef<ReadonlyArray<{ segment?: string; confidence?: number }> | undefined>(undefined);
  const scoredRef = useRef(false);
  // Union of all words heard this attempt — reassembles fast segmented speech so
  // it isn't scored as "only the last word". See TranscriptAccumulator.
  const accRef = useRef(new TranscriptAccumulator());
  const pronunciationScoring = pronunciationScoringLocal;

  const setPronunciationScoring = useCallback((scoring: boolean) => {
    setPronunciationScoringLocal(scoring);
    onScoringChange(scoring);
  }, [onScoringChange]);

  const setBlocked = useCallback((next: PronunciationBlock) => {
    setBlockedLocal(next);
    onBlocked(next);
  }, [onBlocked]);

  // Reset state when the practiced phrase changes. The device-unavailable block
  // is sticky (it can't change between phrases); a denied block resets so the
  // user gets a fresh chance after granting permission in Settings.
  useEffect(() => {
    clearTargetPlaybackTimers();
    clearFinishAttemptTimer();
    setPronunciationHeardTarget(false);
    setPronunciationSpeakingTarget(false);
    setPronunciationListening(false);
    setPronunciationScoring(false);
    setPronunciationScore(null);
    setTranscript('');
    // Clear per-attempt accumulators so a previous phrase's best can't leak in.
    bestTranscriptRef.current = '';
    bestScoreRef.current = -1;
    bestConfidenceRef.current = undefined;
    bestSegmentsRef.current = undefined;
    accRef.current.reset();
    scoredRef.current = false;
    setPronunciationStalled(false);
    setBlocked(speechModule ? null : 'unavailable');
  }, [targetText, setPronunciationScoring, setBlocked, speechModule, clearTargetPlaybackTimers, clearFinishAttemptTimer]);

  useEffect(() => () => {
    clearTargetPlaybackTimers();
    clearFinishAttemptTimer();
  }, [clearTargetPlaybackTimers, clearFinishAttemptTimer]);

  // Recognition result → score it locally and report up.
  useEffect(() => {
    if (!speechModule) return undefined; // no recognizer: nothing to listen to

    // Consider every alternative of every result event, keeping the one that
    // scores highest against the target. The engine often puts the correct
    // phrase in alternative #2/#3, or sends a short final fragment after a fuller
    // interim — so we pick the BEST match, not results[0] or the last fragment.
    const considerAlternatives = (
      alternatives: Array<{ transcript?: string; confidence?: number; segments?: ReadonlyArray<{ segment?: string; confidence?: number }> }>,
    ) => {
      for (const alt of alternatives) {
        const t = String(alt?.transcript ?? '').trim();
        if (!t) continue;
        const s = scorePlanPronunciationTranscript({
          targetText: targetTextRef.current,
          transcript: t,
          segments: alt?.segments,
        }).score;
        if (s > bestScoreRef.current) {
          bestScoreRef.current = s;
          bestTranscriptRef.current = t;
          bestConfidenceRef.current = typeof alt?.confidence === 'number' ? alt.confidence : undefined;
          // segments live only on results[0] per the package; capture when present.
          bestSegmentsRef.current = Array.isArray(alt?.segments) ? alt.segments : undefined;
        }
      }
    };

    // Score the accumulated best transcript exactly once per attempt.
    const finishAttempt = () => {
      clearFinishAttemptTimer();
      // Попытка закончилась (любым исходом) — сессия больше не «запись».
      restoreLoudPlaybackMode();
      if (scoredRef.current) return;
      setPronunciationListening(false);
      setPronunciationScoring(false);
      equalizerRef.current?.setSample(0);
      const heard = bestTranscriptRef.current;
      if (!heard) return; // nothing usable — leave state reset, no 0% punishment
      scoredRef.current = true;
      const result = scorePlanPronunciationTranscript({
        targetText: targetTextRef.current,
        transcript: heard,
        recognitionConfidence: bestConfidenceRef.current,
        segments: bestSegmentsRef.current,
      });
      setPronunciationScore(result);
      onScored(result);
      if (result.passed) {
        hapticSuccess();
        playCorrect();
      } else hapticError();
    };

    const scheduleFinishAttempt = () => {
      clearFinishAttemptTimer();
      const delayMs = Platform.OS === 'android' ? 900 : 0;
      if (delayMs <= 0) {
        finishAttempt();
        return;
      }
      // Android segmented sessions can emit a final result for only part of the
      // phrase, then send the tail as another final result. Wait briefly for it.
      finishAttemptTimerRef.current = setTimeout(finishAttempt, delayMs);
    };

    const applyResult = (event: { results?: { transcript?: string; confidence?: number }[]; isFinal?: boolean }) => {
      // Первый результат = движок точно жив (на редких OEM 'start' не эмитится).
      clearRecognizerWatchdog();
      clearFinishAttemptTimer();
      const alternatives = Array.isArray(event?.results) ? event.results : [];
      considerAlternatives(alternatives);
      // Накопить объединение слов из ТОП-гипотезы и тоже скорить — иначе быструю
      // сегментированную речь нейтива засчитывает «только последнее слово».
      const top = (alternatives[0]?.transcript ?? '').trim();
      accRef.current.add(top);
      const union = accRef.current.union();
      if (union) considerAlternatives([{ transcript: union }]);
      // Живая подсветка по union: загоревшееся слово не гаснет на хвостовом interim.
      const reveal = union || top;
      if (reveal) setTranscript(reveal);
      // Score only on the final result; interim just feeds the reveal + best-pick.
      if (event?.isFinal === false) return;
      scheduleFinishAttempt();
    };

    // Любой признак жизни движка снимает watchdog «заглохшего» распознавателя.
    const startSub = speechModule.addListener('start', () => {
      clearRecognizerWatchdog();
    });
    const resultSub = speechModule.addListener('result', applyResult);
    const noMatchSub = speechModule.addListener('nomatch', () => {
      clearRecognizerWatchdog();
      restoreLoudPlaybackMode();
      if (bestTranscriptRef.current) {
        scheduleFinishAttempt();
        return;
      }
      setPronunciationListening(false);
      setPronunciationScoring(false);
    });
    // `end` is the backstop: if the engine ended without a final `result` event
    // (early silence cut-off), still score whatever best we captured.
    const endSub = speechModule.addListener('end', () => {
      clearRecognizerWatchdog();
      finishAttempt();
      setPronunciationListening(false);
      equalizerRef.current?.setSample(0);
    });
    const errorSub = speechModule.addListener('error', () => {
      clearRecognizerWatchdog();
      restoreLoudPlaybackMode();
      // On error, salvage the best transcript if we have one, else just reset.
      if (bestTranscriptRef.current) finishAttempt();
      setPronunciationListening(false);
      setPronunciationScoring(false);
      equalizerRef.current?.setSample(0);
    });
    // Live volume → equalizer imperatively (no setState → no re-render during recording).
    const volumeSub = speechModule.addListener('volumechange', (event: any) => {
      equalizerRef.current?.setSample(Number(event?.value));
    });
    const audioEndSub = speechModule.addListener('audioend', (event: any) => {
      const uri = typeof event?.uri === 'string' && event.uri.length > 0 ? event.uri : null;
      deleteTransientSpeechRecordingFile(uri);
    });

    return () => {
      clearRecognizerWatchdog();
      clearFinishAttemptTimer();
      startSub?.remove?.();
      resultSub?.remove?.();
      noMatchSub?.remove?.();
      endSub?.remove?.();
      errorSub?.remove?.();
      volumeSub?.remove?.();
      audioEndSub?.remove?.();
      try {
        // stop() flushes a final result; abort() would discard a live attempt.
        speechModule.stop();
      } catch {
        // recognizer may be unavailable in some builds — safe to ignore on unmount
      }
      restoreLoudPlaybackMode();
    };
  }, [onScored, speechModule, playCorrect, clearRecognizerWatchdog, clearFinishAttemptTimer]);

  const listenPronunciationTarget = useCallback(() => {
    hapticTap();
    clearTargetPlaybackTimers();
    stopAudio();
    setPronunciationSpeakingTarget(true);

    const playFallbackAudio = () => {
      clearTargetPlaybackTimers();
      targetPlaybackDoneTimerRef.current = setTimeout(
        finishTargetPlayback,
        Math.min(6000, Math.max(1300, targetText.length * 55 + 650)),
      );
      speakFallbackAudio(targetText, 0.86, {
        language: 'en-US',
        voice: '',
        onDone: finishTargetPlayback,
        onStopped: finishTargetPlayback,
        onError: finishTargetPlayback,
      });
    };

    if (targetAudioPlayerSource) {
      void (async () => {
        try {
          await setAudioModeAsync(LOUD_PLAYBACK_AUDIO_MODE);
        } catch {
          // Playback still tries; the mode call is best-effort on edge runtimes.
        }
        try {
          try {
            targetAudioPlayer.volume = 1;
          } catch {
            // Some runtimes may not expose a writable volume property.
          }
          await targetAudioPlayer.seekTo(0);
          targetAudioPlayer.play();
          if (Platform.OS === 'android') {
            targetPlaybackFallbackTimerRef.current = setTimeout(() => {
              const status = targetAudioStatusRef.current as { currentTime?: number; didJustFinish?: boolean } | null | undefined;
              // Android can report the player as "playing" while the remote clip is
              // still silent/buffered. Only real timeline progress proves audio started.
              const currentTime = Math.max(
                typeof targetAudioPlayer.currentTime === 'number' ? targetAudioPlayer.currentTime : 0,
                typeof status?.currentTime === 'number' ? status.currentTime : 0,
              );
              const started = currentTime > 0.05 || status?.didJustFinish === true;
              if (started) return;
              try {
                targetAudioPlayer.pause();
              } catch {
                // The player may already be stopped on some Android runtimes.
              }
              playFallbackAudio();
            }, 1400);
          }
          // Снимаем «звучит…» к концу клипа: длительность известна из статуса, иначе
          // мягкий потолок. Кнопка повтора разблокируется, юзер слышит живой голос.
          const durationMs = Math.round(((targetAudioPlayer.duration || 0) * 1000)) || 2600;
          targetPlaybackDoneTimerRef.current = setTimeout(
            finishTargetPlayback,
            Math.min(6000, Math.max(900, durationMs + 150)),
          );
        } catch {
          if (Platform.OS === 'android') playFallbackAudio();
          else setPronunciationSpeakingTarget(false);
        }
      })();
      return;
    }

    if (Platform.OS === 'android') playFallbackAudio();
    else {
      // No approved MP3 source on iOS: do not substitute a system TTS voice.
      setPronunciationSpeakingTarget(false);
      setPronunciationHeardTarget(true);
    }
  }, [
    clearTargetPlaybackTimers,
    finishTargetPlayback,
    speakFallbackAudio,
    stopAudio,
    targetAudioPlayer,
    targetAudioPlayerSource,
    targetText,
  ]);

  const startSpeaking = useCallback(async () => {
    hapticTap();
    clearTargetPlaybackTimers();
    setPronunciationSpeakingTarget(false);
    stopAudio();
    if (targetAudioPlayerSource) { try { targetAudioPlayer.pause(); } catch { /* плеер мог быть не готов */ } }
    setPronunciationScore(null);
    setPronunciationStalled(false);
    if (!speechModule) {
      setBlocked('unavailable');
      return;
    }
    if (!isSpeechRecognitionAvailable(speechModule)) {
      setBlocked('unavailable');
      return;
    }
    try {
      const permission = await speechModule.requestPermissionsAsync();
      if (!permission?.granted) {
        setPronunciationListening(false);
        setPronunciationScoring(false);
        setBlocked('denied');
        hapticError();
        return;
      }
      setBlocked(null);
      // Reset per-attempt accumulators BEFORE the mic goes live.
      bestTranscriptRef.current = '';
      bestScoreRef.current = -1;
      bestConfidenceRef.current = undefined;
      bestSegmentsRef.current = undefined;
      accRef.current.reset();
      scoredRef.current = false;
      equalizerRef.current?.setSample(0);
      // Hand the audio session from playback ("Послушать") to capture BEFORE
      // starting recognition, so iOS doesn't drop the first ~300ms of speech.
      try {
        const contract = buildPlanPronunciationRecordingContract();
        await setAudioModeAsync(contract.audioMode);
      } catch {
        // Some runtimes may reject the record-mode switch; recognition still tries.
      }
      // Prefer the offline on-device recognizer when the device supports it.
      let onDevice = false;
      try {
        onDevice = (await speechModule.supportsOnDeviceRecognition?.()) === true;
      } catch {
        onDevice = false;
      }
      // On Android, an audio cue can steal audio focus or smear the first word
      // while the recognizer is warming up. Haptic tap + red state are enough.
      if (Platform.OS !== 'android') playRecordStart();
      setPronunciationListening(true);
      setPronunciationScoring(true);
      setTranscript('');
      // Watchdog (как в SpeakingPanel): если за 7с движок не пришлёт НИ start,
      // НИ result, НИ error — Android-сервис завис. Гасим попытку и просим
      // повторить, вместо вечного «Слушаю — говори».
      clearRecognizerWatchdog();
      recognizerWatchdogRef.current = setTimeout(() => {
        recognizerWatchdogRef.current = null;
        try {
          speechModule.abort();
        } catch {
          /* сервис мог умереть — не мешаем */
        }
        setPronunciationListening(false);
        setPronunciationScoring(false);
        equalizerRef.current?.setSample(0);
        setPronunciationStalled(true);
        hapticError();
        restoreLoudPlaybackMode();
      }, 7000);
      speechModule.start(
        buildSpeakingStartOptions({
          lang: 'en-US',
          targetText: targetTextRef.current,
          interimResults: true,
          volumeMeter: true,
          onDevice,
          // Android needs the library's AudioRecord/EXTRA_AUDIO_SOURCE path to
          // avoid instant no-match/end. The transient wav is deleted on audioend.
          persistRecording: Platform.OS === 'android',
        }),
      );
    } catch {
      clearRecognizerWatchdog();
      setPronunciationListening(false);
      setPronunciationScoring(false);
      restoreLoudPlaybackMode();
    }
  }, [
    clearRecognizerWatchdog,
    clearTargetPlaybackTimers,
    stopAudio,
    speechModule,
    setBlocked,
    playRecordStart,
    targetAudioPlayer,
    targetAudioPlayerSource,
  ]);

  const stopSpeaking = useCallback(() => {
    try {
      speechModule?.stop();
    } catch {
      // end/error listener will settle state
    }
  }, [speechModule]);

  const openMicSettings = useCallback(() => {
    hapticTap();
    Linking.openSettings().catch(() => {
      // some platforms/contexts can't open settings — harmless
    });
  }, []);

  const scoreColor = blocked
    ? mutedText
    : pronunciationScore?.passed
    ? '#3FD68C'
    : pronunciationScore
    ? '#FF6E78'
    : mutedText;
  const statusHint = blocked === 'unavailable'
    ? '\u042d\u0442\u043e \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u043e \u043d\u0435 \u0443\u043c\u0435\u0435\u0442 \u0440\u0430\u0441\u043f\u043e\u0437\u043d\u0430\u0432\u0430\u0442\u044c \u0440\u0435\u0447\u044c. \u041c\u043e\u0436\u0435\u0448\u044c \u043f\u0440\u043e\u0441\u0442\u043e \u043f\u0440\u043e\u0433\u043e\u0432\u043e\u0440\u0438\u0442\u044c \u0444\u0440\u0430\u0437\u0443 \u0432\u0441\u043b\u0443\u0445 \u0438 \u0438\u0434\u0442\u0438 \u0434\u0430\u043b\u044c\u0448\u0435.'
    : blocked === 'denied'
    ? '\u041d\u0443\u0436\u0435\u043d \u0434\u043e\u0441\u0442\u0443\u043f \u043a \u043c\u0438\u043a\u0440\u043e\u0444\u043e\u043d\u0443. \u0420\u0430\u0437\u0440\u0435\u0448\u0438 \u0435\u0433\u043e \u0432 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430\u0445 \u2014 \u0438\u043b\u0438 \u043f\u0440\u043e\u0433\u043e\u0432\u043e\u0440\u0438 \u0444\u0440\u0430\u0437\u0443 \u0432\u0441\u043b\u0443\u0445 \u0438 \u0438\u0434\u0438 \u0434\u0430\u043b\u044c\u0448\u0435.'
    : pronunciationStalled
    ? '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c \u043c\u0438\u043a\u0440\u043e\u0444\u043e\u043d. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439 \u0435\u0449\u0451 \u0440\u0430\u0437'
    : pronunciationListening
    ? '\u0421\u043b\u0443\u0448\u0430\u044e\u2026 \u0433\u043e\u0432\u043e\u0440\u0438'
    : pronunciationScoring
    ? '\u041f\u0440\u043e\u0432\u0435\u0440\u044f\u044e\u2026'
    : pronunciationScore
    ? pronunciationScore.passed
      ? `Засчитано: ${pronunciationScore.score}% ✓`
      : `Услышал: «${pronunciationScore.transcript}» — ${pronunciationScore.score}%. Нужно ${PLAN_PRONUNCIATION_PASS_THRESHOLD}%.`
    : pronunciationHeardTarget
    ? 'Теперь скажи фразу вслух.'
    : 'Скажи фразу вслух. Можешь сначала послушать — но это не обязательно.';

  const listenDisabled = pronunciationSpeakingTarget || pronunciationListening;
  const showRing = Boolean(pronunciationScore) && !pronunciationListening && !pronunciationScoring;
  return (
    <View style={styles.recorderStack}>
      {/* Фраза СКРЫТА за чёрточками по буквам (как в уроках «Устно») — юзер не видит
          ответ заранее. Слово «загорается» только когда он его правильно произнёс.
          На зачёте показываем фразу целиком. */}
      <View style={styles.recorderPhraseWrap} accessibilityRole="text">
        {tokens.map((tok, i) => {
          const reveal = matched[i] || pronunciationScore?.passed;
          const maskedTok = tok.replace(/[\p{L}\p{N}]/gu, '_');
          return (
            <Text
              key={`plan-spk-tok-${i}`}
              style={[
                styles.recorderPhraseWord,
                { color: reveal ? accent : mutedText, opacity: reveal ? 1 : 0.6, letterSpacing: reveal ? 0 : 2 },
              ]}
            >
              {reveal ? tok : maskedTok}{i < tokens.length - 1 ? ' ' : ''}
            </Text>
          );
        })}
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Послушать фразу"
        activeOpacity={0.84}
        disabled={listenDisabled}
        onPress={() => listenPronunciationTarget()}
        style={[
          styles.recorderButton,
          {
            backgroundColor: accent + '1A',
            borderColor: accent + '55',
            opacity: listenDisabled ? 0.6 : 1,
          },
        ]}
      >
        <Ionicons name="volume-high-outline" size={18} color={accent} style={{ marginRight: 8 }} />
        <Text style={[styles.recorderButtonText, { color: accent }]}>
          {pronunciationSpeakingTarget ? 'Звучит фраза…' : 'Послушать фразу'}
        </Text>
      </TouchableOpacity>

      {blocked !== 'unavailable' && (
        <PronunciationSpeakButton
          // Прослушивание фразы — НЕ обязательно: юзер может произнести сразу, если хочет.
          // Единственное ограничение — нельзя говорить, ПОКА звучит фраза (микрофон поймал бы
          // озвучку), поэтому блокируем только на время проигрывания target-аудио.
          enabled={!pronunciationSpeakingTarget}
          listening={pronunciationListening}
          accent={accent}
          actionText={actionText}
          onPress={() => (pronunciationListening ? stopSpeaking() : void startSpeaking())}
        />
      )}

      {/* Тот же фидбэк, что в уроках: пока слушает — живой эквалайзер; после оценки —
          кольцо-результат с процентом по центру. */}
      {showRing ? (
        <View style={styles.recorderRingWrap}>
          <SpeakingScoreRing
            score={pronunciationScore!.score}
            color={pronunciationScore!.passed ? ringTheme.correct : ringTheme.wrong}
            trackColor={ringTheme.border}
            textColor={ringTheme.textPrimary}
            innerBg={ringTheme.bgCard}
          />
          <Text style={[styles.recorderRingTarget, { color: mutedText }]}>
            нужно {PLAN_PRONUNCIATION_PASS_THRESHOLD}%
          </Text>
        </View>
      ) : pronunciationListening ? (
        <View style={styles.recorderEqualizer}>
          <VoiceEqualizer
            ref={equalizerRef}
            active={pronunciationListening}
            color={accent}
            idleColor={mutedText}
          />
        </View>
      ) : null}

      <Text style={[styles.recorderStatus, { color: scoreColor }]}>{statusHint}</Text>

      {blocked === 'denied' && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Открыть настройки"
          activeOpacity={0.84}
          onPress={openMicSettings}
          style={[styles.recorderButton, { backgroundColor: accent + '1A', borderColor: accent + '55', marginTop: 4 }]}
        >
          <Text style={[styles.recorderButtonText, { color: accent }]}>Открыть настройки</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}


// Прогресс «как в уроках»: ячейки со статусом (пройдено/текущая/впереди),
// скользящая стрелка ▼ над текущей ячейкой и счётчик N/N справа.
function PlanExerciseProgressRail({
  correct,
  current,
  target,
  accent,
  mutedColor,
  correctColor,
  trackColor,
}: {
  correct: number;
  current: number;
  target: number;
  accent: string;
  mutedColor: string;
  correctColor: string;
  trackColor: string;
}) {
  const cellCount = Math.max(1, target);
  const displayCell = Math.min(Math.max(0, current), cellCount - 1);
  const [barWidth, setBarWidth] = useState(0);
  const arrowAnim = useRef(new Animated.Value(0)).current;
  const prevCell = useRef(displayCell);

  useEffect(() => {
    if (barWidth === 0) return;
    const cellW = (barWidth - (cellCount - 1) * 4) / cellCount;
    const targetX = displayCell * (cellW + 4);
    const isBack = displayCell < prevCell.current;
    prevCell.current = displayCell;
    Animated.spring(arrowAnim, {
      toValue: targetX,
      useNativeDriver: true,
      tension: isBack ? 280 : 140,
      friction: isBack ? 10 : 12,
    }).start();
  }, [displayCell, barWidth, cellCount, arrowAnim]);

  return (
    <View style={styles.progressRailRow}>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`Прогресс задания: ${correct} из ${target}`}
        style={styles.progressRailTrack}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {barWidth > 0 ? (
          <View style={styles.progressArrowRow}>
            <Animated.View style={{ position: 'absolute', top: 0, transform: [{ translateX: arrowAnim }] }}>
              <Text
                style={{
                  color: correctColor,
                  fontSize: 8,
                  lineHeight: 10,
                  textAlign: 'center',
                  width: (barWidth - (cellCount - 1) * 4) / cellCount,
                }}
              >
                ▼
              </Text>
            </Animated.View>
          </View>
        ) : null}
        <View style={styles.progressCellsRow}>
          {Array.from({ length: cellCount }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressCell,
                {
                  backgroundColor: i < correct
                    ? correctColor
                    : i === displayCell
                    ? 'rgba(255,255,255,0.85)'
                    : trackColor,
                },
              ]}
            />
          ))}
        </View>
      </View>
      <Text style={[styles.progressCounter, { color: mutedColor }]}>{displayCell + 1}/{cellCount}</Text>
    </View>
  );
}

type PlanExerciseFeedbackTone = 'success' | 'error' | 'info' | 'blocked';

function feedbackIconForTone(tone: PlanExerciseFeedbackTone): React.ComponentProps<typeof Ionicons>['name'] {
  if (tone === 'success') return 'checkmark';
  if (tone === 'error') return 'refresh';
  if (tone === 'blocked') return 'lock-closed-outline';
  return 'sparkles-outline';
}

function PlanExerciseFeedbackSurface({
  tone,
  title,
  body,
  accent,
  actionText,
  mutedText,
  surfaceColor,
  actionLabel,
  onAction,
  children,
}: {
  tone: PlanExerciseFeedbackTone;
  title: string;
  body: string;
  accent: string;
  actionText: string;
  mutedText: string;
  surfaceColor: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: React.ReactNode;
}) {
  const { themeMode } = useTheme();
  const isSuccess = tone === 'success';
  const isError = tone === 'error';
  const toneColor = isError ? '#FF8A92' : accent;
  const borderColor = isError ? '#FF6E7866' : accent + '66';
  const buttonColor = isSuccess ? accent : surfaceColor;
  const buttonTextColor = isSuccess ? actionText : tone === 'blocked' ? mutedText : toneColor;

  return (
    <View style={[styles.feedbackSurface, { borderColor, backgroundColor: surfaceColor, shadowColor: toneColor }]}>
      <View style={styles.feedbackHeader}>
        <View style={[styles.feedbackIcon, { borderColor, backgroundColor: toneColor + '16' }]}>
          <Ionicons name={feedbackIconForTone(tone)} size={20} color={monoIcon(themeMode, toneColor, isError ? MONO_ICON.muted : MONO_ICON.light)} />
        </View>
        <Text style={[styles.feedbackTitle, { color: toneColor }]}>{title}</Text>
      </View>
      <Text style={[styles.feedbackBody, { color: mutedText }]}>{body}</Text>
      {children}
      {actionLabel && onAction ? (
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={onAction}
          style={[styles.primaryButton, { borderColor, shadowColor: toneColor }]}
        >
          <LinearGradient
            colors={isSuccess ? [accent, accent + 'BB'] : isError ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButtonGradient}
          >
            <Text style={[styles.primaryButtonText, { color: buttonTextColor }]}>{actionLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ⚠️ DEPRECATED для разбора ответа. Это всплывающий модал = «двойной контейнер» поверх
// экрана. По правилу (см. шапку файла) разбор ответа ВЕЗДЕ должен быть ИНЛАЙН на экране
// (PlanExerciseFeedbackInline), а не модалом. Оставлен ТОЛЬКО как временный fallback для
// режимов без места на экране (вспомни фразу / собери на слух) и для модала «Задание
// закрыто». НЕ использовать для нового режима с вариантами — добавляй его в
// `usesOptionFeedback` и рендерь разбор инлайн.
function PlanExerciseFeedbackModal({
  visible,
  tone,
  title,
  body,
  accent,
  actionText,
  mutedText,
  surfaceColor,
  actionLabel,
  onAction,
  children,
}: {
  visible: boolean;
  tone: PlanExerciseFeedbackTone;
  title: string;
  body: string;
  accent: string;
  actionText: string;
  mutedText: string;
  surfaceColor: string;
  actionLabel: string;
  onAction: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onAction}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <PlanExerciseFeedbackSurface
            tone={tone}
            title={title}
            body={body}
            accent={accent}
            actionText={actionText}
            mutedText={mutedText}
            surfaceColor={surfaceColor}
            actionLabel={actionLabel}
            onAction={onAction}
          >
            {children}
          </PlanExerciseFeedbackSurface>
        </View>
      </View>
    </Modal>
  );
}

// Инлайн-плашка обратной связи (без модала и без двойного контейнера).
// Показывается в пустоте по центру, под английским текстом — как teaching note
// в обычном уроке. Сюда же ляжет ИИ-объяснение, когда оно подгрузится.
function PlanExerciseFeedbackInline({
  tone,
  title,
  body,
  accent,
  actionText,
  mutedText,
  surfaceColor,
  textPrimaryColor,
  actionLabel,
  onAction,
  loading,
  hideBody,
  children,
}: {
  tone: PlanExerciseFeedbackTone;
  title: string;
  body: string;
  accent: string;
  actionText: string;
  mutedText: string;
  surfaceColor: string;
  textPrimaryColor: string;
  actionLabel: string;
  onAction: () => void;
  loading?: boolean;
  /**
   * Скрыть «плашку» подтверждения (заголовок + тело-текст), оставив только эхо
   * правильного ответа (children) и кнопку действия. Для верного ответа в плане
   * убрали «Так звучит естественно» — нужна только кнопка «Дальше».
   */
  hideBody?: boolean;
  children?: React.ReactNode;
}) {
  const { themeMode } = useTheme();
  const isSuccess = tone === 'success';
  const isError = tone === 'error';
  const toneColor = isError ? '#FF8A92' : accent;
  const borderColor = isError ? '#FF6E7866' : accent + '55';
  const buttonTextColor = isSuccess ? actionText : toneColor;

  // ВЕРНЫЙ ОТВЕТ без тела и без эха ответа = на экране нужна ТОЛЬКО кнопка «Дальше».
  // Тогда не оборачиваем её в плашку (это был «контейнер вокруг контейнера»), а
  // показываем большую объёмную 3D-кнопку — как CTA на интро-скринах урока.
  const showBareCta = isSuccess && hideBody && !loading && !children;
  if (showBareCta) {
    return (
      <DuoPressable
        accessibilityLabel={actionLabel}
        onPress={onAction}
        gradientColors={[accent, accent + 'BB']}
        gradientStart={{ x: 0, y: 0 }}
        gradientEnd={{ x: 1, y: 1 }}
        edgeColor={accent + '99'}
        edgeHeight={7}
        style={styles.bareCtaSurface}
      >
        <Text style={[styles.bareCtaText, { color: actionText }]}>{actionLabel}</Text>
        <View style={styles.bareCtaIcon}>
          <Ionicons name="arrow-forward" size={18} color={actionText} />
        </View>
      </DuoPressable>
    );
  }

  return (
    <View style={[styles.inlineFeedback, { borderLeftColor: toneColor, backgroundColor: surfaceColor }]}>
      {!hideBody && (
        <View style={styles.inlineFeedbackHeader}>
          <Ionicons name={feedbackIconForTone(tone)} size={18} color={monoIcon(themeMode, toneColor, isError ? MONO_ICON.muted : MONO_ICON.light)} />
          <Text style={[styles.inlineFeedbackTitle, { color: toneColor }]}>{title}</Text>
        </View>
      )}
      {!hideBody && (
        loading ? (
          <View style={styles.inlineFeedbackLoading}>
            <ActivityIndicator size="small" color={toneColor} />
            <Text style={[styles.inlineFeedbackBody, { color: mutedText }]}>{body}</Text>
          </View>
        ) : (
          <Text style={[styles.inlineFeedbackBody, { color: textPrimaryColor }]}>{body}</Text>
        )
      )}
      {children}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onAction}
        style={[styles.inlineFeedbackButton, { borderColor, backgroundColor: isSuccess ? accent : 'transparent' }]}
      >
        <Text style={[styles.inlineFeedbackButtonText, { color: buttonTextColor }]}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function PersonalPlanExerciseScreen() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const { playCorrect } = useCorrectSound();
  const fadeScrollY = useRef(new Animated.Value(0)).current;
  const handleExerciseScroll = useCallback((e: any) => {
    fadeScrollY.setValue(e?.nativeEvent?.contentOffset?.y ?? 0);
  }, [fadeScrollY]);
  const params = useLocalSearchParams();
  const { theme: t, themeMode, f } = useTheme();
  const { studyTarget } = useStudyTarget();
  const { lang } = useLang();
  const isGold = themeMode === 'gold';
  const accent = isGold ? '#FFE8A8' : t.accent;
  const actionText = isGold ? '#1B1205' : '#08110C';
  const rendererType = firstParam(params.rendererType);
  const planId = firstParam(params.planId) as PersonalPlanId;
  const planInstanceId = firstParam(params.planInstanceId);
  const planTaskId = firstParam(params.planTaskId);
  const lessonId = firstParam(params.lessonId);
  const dayIndex = Number(firstParam(params.planDayIndex) || 1);
  const requiredCorrect = Math.max(1, Number(firstParam(params.requiredCorrect) || 1));
  const contentUnitIds = useMemo(() => splitIds(firstParam(params.contentUnitIds)), [params.contentUnitIds]);
  const routeTaskKey = useMemo(() => [
    planInstanceId,
    planTaskId,
    rendererType,
    lessonId,
    contentUnitIds.join('|'),
    String(requiredCorrect),
  ].join('::'), [contentUnitIds, lessonId, planInstanceId, planTaskId, rendererType, requiredCorrect]);
  const [index, setIndex] = useState(0);
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  // Идёт авто-переход на следующее задание (replace) — подавляем финал-модал дня,
  // чтобы он не мелькнул между завершением и навигацией.
  const [advancing, setAdvancing] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [buildWords, setBuildWords] = useState<string[]>([]);
  const [recallItems, setRecallItems] = useState<PersonalPlanPhraseRecallItem[]>([]);
  const [pronunciationScore, setPronunciationScore] = useState<PlanPronunciationScoringResult | null>(null);
  const [pronunciationScoring, setPronunciationScoring] = useState(false);
  // Set when the recorder can't run speech here (no recognizer / mic denied) so
  // a free in-plan exercise is never a dead end — the user can still advance.
  const [pronunciationBlocked, setPronunciationBlocked] = useState<PronunciationBlock>(null);
  const { flashKey, flash } = useWordFlash();
  const isMissingWordMode = rendererType === 'plan_missing_word';
  const isChoiceMode = rendererType === 'plan_choose_natural_phrase';
  const isListeningMode = rendererType === 'plan_listen_choose';
  const isListenBuildMode = rendererType === 'plan_listen_build';
  const isPronunciationMode = rendererType === 'plan_pronunciation_repeat';
  const isRecallMode = rendererType === 'plan_phrase_recall';
  const isPhraseBuildMode = rendererType === 'plan_phrase_build';
  // Режимы с экранными вариантами-ответами (плитки) показывают разбор ИНЛАЙН (плашка под
  // вариантами), а НЕ модалом: choose / вставь слово / на слух. У них есть место на экране.
  // ⚠️ ПРАВИЛО (см. шапку файла): разбор ВЕЗДЕ должен быть инлайн, без отдельных модалов.
  // Добавляешь новый режим с вариантами — ДОБАВЬ его сюда (тогда разбор пойдёт в плашку, а
  // модал автоматически отключится через `!usesOptionFeedback` ниже). Модал — это «двойной
  // контейнер» поверх экрана, его быть не должно.
  const usesOptionFeedback = isChoiceMode || isMissingWordMode || isListeningMode;
  const currentExerciseType = (
    isRecallMode
      ? 'plan_phrase_recall'
      : isPronunciationMode
        ? 'plan_pronunciation_repeat'
        : isListenBuildMode
          ? 'plan_listen_build'
          : isListeningMode
            ? 'plan_listen_choose'
            : isChoiceMode
              ? 'plan_choose_natural_phrase'
              : isPhraseBuildMode
                ? 'plan_phrase_build'
                : 'plan_missing_word'
  ) as PlanExerciseType;
  const chrome = useMemo(() => chromeForExerciseType(currentExerciseType), [currentExerciseType]);
  const chromeTitle = lang === 'es' ? chrome.titleEs : chrome.title;
  const handlePronunciationScored = useCallback((result: PlanPronunciationScoringResult) => {
    setPronunciationScore(result);
  }, []);

  useEffect(() => {
    if (!isRecallMode) {
      setRecallItems([]);
      return undefined;
    }

    let alive = true;
    void getPersonalPlanPhraseRecallItems({ planInstanceId, lessonId, contentUnitIds })
      .then((nextItems) => {
        if (alive) setRecallItems(nextItems);
      })
      .catch(() => {
        if (alive) setRecallItems([]);
      });

    return () => {
      alive = false;
    };
  }, [contentUnitIds, isRecallMode, lessonId, planInstanceId]);

  const items = useMemo(() => {
    if (isRecallMode) return recallItems;
    if (isMissingWordMode) return getPersonalPlanMissingWordItems({ lessonId, contentUnitIds });
    if (isChoiceMode) return getPersonalPlanChooseNaturalPhraseItems({ lessonId, contentUnitIds });
    if (isListeningMode) return getPersonalPlanListenChooseItems({ lessonId, contentUnitIds });
    if (isListenBuildMode) return getPersonalPlanListenBuildItems({ lessonId, contentUnitIds });
    if (isPronunciationMode) return getPersonalPlanPronunciationRepeatItems({ lessonId, contentUnitIds });
    return getPersonalPlanMissingWordItems({ lessonId, contentUnitIds });
  }, [contentUnitIds, isChoiceMode, isListenBuildMode, isListeningMode, isMissingWordMode, isPronunciationMode, isRecallMode, lessonId, recallItems]);

  const block = useMemo<PlanExerciseBlock>(() => ({
    id: planTaskId || `${rendererType || 'plan_exercise'}_${lessonId}`,
    planId,
    dayIndex,
    type: currentExerciseType,
    title: chrome.title,
    titleEs: chrome.titleEs,
    contentUnitIds,
    estimatedMinutes: isListeningMode || isListenBuildMode || isChoiceMode ? 4 : 3,
    requiredFor: [5, 10, 15, 20],
    prerequisiteLessonIds: [1],
    progressPolicy: isPronunciationMode ? 'completion_only' : 'correct_only',
    recoveryPolicy: isPronunciationMode ? 'none' : 'return_wrong_to_recall',
  }), [chrome.title, chrome.titleEs, contentUnitIds, currentExerciseType, dayIndex, isChoiceMode, isListenBuildMode, isListeningMode, isPronunciationMode, lessonId, planId, planTaskId, rendererType]);

  const session = useMemo(() => (
    startPlanExerciseSession(block, { planInstanceId }).session
  ), [block, planInstanceId]);
  const recoveryWrite = useMemo(() => ({
    mode: 'apply' as const,
    handlers: createPlanRecoveryDefaultHandlers({ studyTarget }),
  }), [studyTarget]);

  // Resume посреди задания: однажды, когда вопросы загружены, восстанавливаем
  // позицию (индекс текущего вопроса + уже верно отвеченные). Сам незавершённый
  // вопрос проходится заново — это безопасно. Флаг гарантирует разовое
  // применение, чтобы не затирать живой прогресс пользователя.
  const resumeAppliedRef = useRef(false);
  const activeTaskKeyRef = useRef(routeTaskKey);
  useEffect(() => {
    if (activeTaskKeyRef.current === routeTaskKey) return;
    activeTaskKeyRef.current = routeTaskKey;
    resumeAppliedRef.current = false;
    setIndex(0);
    setCorrectIds([]);
    setSelected(null);
    setLastResult(null);
    setSaving(false);
    setCompleted(false);
    setAdvancing(false);
    setTypedAnswer('');
    setBuildWords([]);
    setPronunciationScore(null);
    setPronunciationScoring(false);
    setPronunciationBlocked(null);
  }, [routeTaskKey]);

  useEffect(() => {
    if (resumeAppliedRef.current) return;
    if (!planTaskId || items.length === 0 || completed) return;
    resumeAppliedRef.current = true;
    let alive = true;
    void readPlanTaskProgress(planInstanceId, planTaskId)
      .then((saved) => {
        if (!alive || !saved) return;
        const validIds = new Set(items.map((it) => it.id));
        const restoredCorrect = saved.correctIds.filter((id) => validIds.has(id));
        const restoredIndex = Math.min(Math.max(0, saved.index), items.length - 1);
        if (restoredCorrect.length > 0) setCorrectIds(restoredCorrect);
        if (restoredIndex > 0) setIndex(restoredIndex);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [completed, items, planInstanceId, planTaskId]);

  const item = items[index];
  const choiceOptions = item && 'options' in item ? item.options : [];
  // Авто-раскладка дистракторов (эталон урока): короткие варианты → сетка 2 кол., длинные → список на всю ширину.
  const useGridOptions = choiceOptions.length > 0 && choiceOptions.every((opt: string) => opt.trim().length <= 14);
  const currentCorrectAnswer = item && 'correctAnswer' in item ? item.correctAnswer : '';
  const targetCorrect = Math.min(requiredCorrect, items.length || requiredCorrect);
  const progressRailCurrent = lastResult === 'correct'
    ? Math.max(0, correctIds.length - 1)
    : correctIds.length;
  const done = !advancing && (completed || (correctIds.length >= targetCorrect && items.length > 0 && !lastResult));
  const listeningBlocked = (isListeningMode || isListenBuildMode) && item && 'audioReady' in item && !item.audioReady;
  const modeReady = (isMissingWordMode || isChoiceMode || isListeningMode || isListenBuildMode || isPronunciationMode || isRecallMode || isPhraseBuildMode) && Boolean(session) && !listeningBlocked;

  // ── ИИ-разбор ошибки (как в уроках): инлайн-плашка + «Объяснить проще» ──
  // Показываем ТОЛЬКО при неверном ответе. Целевой ответ/выбор/промпт берём по
  // режиму. Заменяет старый авто-текст «Почему так».
  const mistakeTargetAnswer = (item && 'targetText' in item)
    ? (item.targetText ?? '')
    : (currentCorrectAnswer ?? '');
  const mistakeUserAnswer = (selected ?? '').trim();
  const mistakePrompt = (item && 'promptRu' in item ? item.promptRu : '') ?? '';
  const mistakePhraseId = item && 'id' in item ? String(item.id) : '';
  // CF explainMistake требует lessonId в диапазоне 1..999. Кэш-ключ (mistakeHash)
  // считается по targetAnswer+userAnswer+lang и от lessonId НЕ зависит, поэтому
  // берём реальный урок плана, если он валиден, иначе безопасный fallback 1.
  const parsedPlanLessonId = Number(lessonId);
  const mistakeLessonId = Number.isInteger(parsedPlanLessonId) && parsedPlanLessonId >= 1 && parsedPlanLessonId <= 999
    ? parsedPlanLessonId
    : 1;
  const mistakeActive = lastResult === 'wrong' && Boolean(mistakeTargetAnswer) && Boolean(mistakeUserAnswer);
  const mistakeExplain = useMistakeExplain({
    active: mistakeActive,
    phraseKey: `${mistakePhraseId}:${lastResult ?? ''}:${mistakeUserAnswer}`,
    lessonId: mistakeLessonId,
    phraseId: mistakePhraseId,
    studyTarget,
    interfaceLang: lang,
    prompt: mistakePrompt,
    userAnswer: mistakeUserAnswer,
    targetAnswer: mistakeTargetAnswer,
  });
  // Заголовок ВЕРНОГО ответа — всегда «Верно!». Старый авто-заголовок «Почему этот
  // вариант» (explanation.title) убран — генерёжка «Почему так» больше не нужна.
  const resultModalTitle = useMemo(() => triLang(lang, { ru: 'Верно!', uk: 'Правильно!', es: '¡Correcto!', 'pt-BR': 'Certo!', vi: 'Chính xác!', id: 'Benar!', tr: 'Doğru!', pl: 'Dobrze!' }), [lang]);
  // Для НЕВЕРНОГО ответа объяснение должно относиться к ВЫБРАННОМУ варианту,
  // а не к правильному (иначе «выбрал I'm fine — объясняет I'm good»). Пока ИИ-
  // объяснение конкретного дистрактора не подгрузилось (Stage C), показываем
  // связный текст, который называет и выбор, и правильный ответ.
  const wrongSelectedBody = useMemo(() => {
    const picked = (selected ?? '').trim();
    const right = (currentCorrectAnswer ?? '').trim();
    if (picked && right) {
      return triLang(lang, {
        ru: `«${picked}» не подходит здесь. По смыслу нужен вариант «${right}».`,
        uk: `«${picked}» тут не підходить. За змістом потрібен варіант «${right}».`,
        es: `«${picked}» no encaja aquí. Por significado, la opción correcta es «${right}».`,
        'pt-BR': `«${picked}» não encaixa aqui. Pelo sentido, a opção certa é «${right}».`,
        vi: `«${picked}» không hợp ở đây. Theo nghĩa, đáp án đúng là «${right}».`,
        id: `«${picked}» tidak cocok di sini. Berdasarkan makna, jawaban yang benar adalah «${right}».`,
        tr: `«${picked}» burada uymuyor. Anlam olarak doğru seçenek «${right}».`,
        pl: `«${picked}» tu nie pasuje. Sensownie poprawna opcja to «${right}».`,
      });
    }
    return triLang(lang, {
      ru: 'Попробуй ещё раз спокойно: промах уйдёт в повторение.',
      uk: 'Спробуй ще раз спокійно: промах піде в повторення.',
      es: 'Inténtalo de nuevo con calma: el error volverá en el repaso.',
      'pt-BR': 'Tente de novo com calma: o erro voltará na revisão.',
      vi: 'Hãy thử lại bình tĩnh: lỗi này sẽ quay lại trong phần ôn tập.',
      id: 'Coba lagi dengan tenang: kesalahan ini akan masuk ke pengulangan.',
      tr: 'Sakin şekilde tekrar dene: hata tekrar çalışmaya dönecek.',
      pl: 'Spróbuj jeszcze raz spokojnie: błąd wróci do powtórki.',
    });
  }, [selected, currentCorrectAnswer, lang]);
  // Текст короткой плашки при ВЕРНОМ ответе — короткое нейтральное подтверждение.
  // Старый авто-текст «Почему так» (explanation.correct: «важно выбрать не
  // красивость...») убран. На неверном — ИИ-разбор, не этот текст.
  const staticBody = useMemo(() => lastResult === 'correct'
    ? triLang(lang, { ru: 'Так звучит естественно.', uk: 'Так звучить природно.', es: 'Así suena natural.', 'pt-BR': 'Soa natural assim.', vi: 'Nghe tự nhiên như vậy.', id: 'Terdengar alami begitu.', tr: 'Böyle doğal geliyor.', pl: 'Tak brzmi naturalnie.' })
    : wrongSelectedBody, [lastResult, lang, wrongSelectedBody]);

  // Разбор/объяснение для не-option режимов (вспомни фразу / собери на слух / собери
  // фразу) — ИНЛАЙН прямо под фразой, БЕЗ всплывающего модала (раньше модал висел в
  // пустоте по центру). Рендерится внутри скролла под вопросом.
  const nonOptionInlineFeedback = !usesOptionFeedback && lastResult ? (
    lastResult === 'correct' ? (
      <View style={styles.inlineFeedbackHost}>
        <PlanExerciseFeedbackInline
          tone="success"
          title={resultModalTitle}
          body={staticBody}
          hideBody
          actionLabel={triLang(lang, { ru: 'Дальше', uk: 'Далі', es: 'Siguiente', 'pt-BR': 'Avançar', vi: 'Tiếp', id: 'Lanjut', tr: 'Devam', pl: 'Dalej' })}
          onAction={() => void next()}
          accent={accent}
          actionText={actionText}
          mutedText={t.textMuted}
          surfaceColor={t.bgCard}
          textPrimaryColor={t.textPrimary}
          loading={false}
        >
          {isRecallMode && item && 'targetText' in item ? (
            <Text style={[styles.recallAnswer, { color: accent }]}>{item.targetText}</Text>
          ) : null}
        </PlanExerciseFeedbackInline>
      </View>
    ) : lastResult === 'wrong' ? (
      <View style={styles.inlineFeedbackHost}>
        <AiMistakeCard
          lang={lang}
          state={mistakeExplain.aiMistakeState}
          explanation={mistakeExplain.aiMistakeText}
          remaining={mistakeExplain.aiMistakeRemaining}
          onExplain={mistakeExplain.explain}
          targetAnswer={mistakeTargetAnswer}
          userAnswer={mistakeUserAnswer}
        />
        <TouchableOpacity
          onPress={() => void next()}
          activeOpacity={0.85}
          style={[styles.retryAfterMistake, { borderColor: accent }]}
        >
          <Text style={{ color: accent, fontWeight: '700' }}>
            {triLang(lang, { ru: 'Попробовать ещё раз', uk: 'Спробувати ще раз', es: 'Intentar de nuevo', 'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj jeszcze raz' })}
          </Text>
        </TouchableOpacity>
      </View>
    ) : null
  ) : null;

  const submit = async (answer: string) => {
    if (!item || !session || saving || done) return;
    if (!('correctAnswer' in item)) return;
    const isCorrect = answer === item.correctAnswer;
    setSaving(true);
    setSelected(answer);
    setLastResult(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      hapticSuccess();
      playCorrect();
    } else hapticError();

    await submitAndStorePlanExerciseAnswer(session, {
      result: isCorrect ? 'correct' : 'wrong',
      contentUnitId: item.id,
      expectedAnswer: item.correctAnswer,
      selectedAnswer: answer,
      grammarTags: item.grammarTags,
      vocabularyTags: item.vocabularyTags,
      mistakeTags: isCorrect ? [] : [isListeningMode ? 'listen_choose' : isChoiceMode ? 'choose_natural_phrase' : 'missing_word'],
    }, {
      recoveryWrite,
    }).catch(() => undefined);

    if (isCorrect) {
      setCorrectIds((current) => current.includes(item.id) ? current : [...current, item.id]);
    }
    setSaving(false);
  };

  const submitListenBuild = async () => {
    if (!item || !session || saving || done || !isListenBuildMode || !isPersonalPlanListenBuildItem(item)) return;
    const answer = buildWords.join(' ');
    const isCorrect = normalizePlanAnswer(answer) === normalizePlanAnswer(item.correctAnswer);
    setSaving(true);
    setSelected(answer);
    setLastResult(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      hapticSuccess();
      playCorrect();
    } else hapticError();

    await submitAndStorePlanExerciseAnswer(session, {
      result: isCorrect ? 'correct' : 'wrong',
      contentUnitId: item.id,
      expectedAnswer: item.correctAnswer,
      selectedAnswer: answer,
      grammarTags: item.grammarTags,
      vocabularyTags: item.vocabularyTags,
      mistakeTags: isCorrect ? [] : ['listen_build'],
    }, {
      recoveryWrite,
    }).catch(() => undefined);

    if (isCorrect) {
      setCorrectIds((current) => current.includes(item.id) ? current : [...current, item.id]);
    }
    setSaving(false);
  };

  const submitRecall = async () => {
    if (!item || !session || saving || done || !isRecallMode || !('targetText' in item)) return;
    const evaluation = evaluateRecallAnswer(typedAnswer, item.targetText);
    const isCorrect = evaluation.ok;
    setSaving(true);
    setSelected(typedAnswer.trim());
    setLastResult(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      hapticSuccess();
      playCorrect();
    } else hapticError();

    await submitAndStorePlanExerciseAnswer(session, {
      result: isCorrect ? 'correct' : 'wrong',
      contentUnitId: ('contentUnitId' in item ? item.contentUnitId : undefined) ?? item.id.replace(/^(recall|fallback):/, ''),
      expectedAnswer: item.targetText,
      selectedAnswer: typedAnswer,
      grammarTags: item.grammarTags,
      vocabularyTags: item.vocabularyTags,
      mistakeTags: isCorrect ? [] : ['plan_phrase_recall'],
    }, {
      recoveryWrite,
    }).catch(() => undefined);

    if (isCorrect) {
      setCorrectIds((current) => current.includes(item.id) ? current : [...current, item.id]);
    }
    setSaving(false);
  };

  // Завершение всего задания: отметить выполненным, начислить XP, стереть resume
  // и СРАЗУ открыть следующее задание дня (без модала «Задание закрыто»). Если
  // следующего нет — оставляем экран, чтобы показался финал дня (done-плашка).
  const finishTaskAndAdvance = async (practicedPhraseIds: string[]) => {
    // Подавляем финал-модал дня на время вычисления/перехода — иначе он мелькнёт.
    setAdvancing(true);

    // КРИТИЧЕСКИЙ ПУТЬ перехода = только «отметить задание выполненным» →
    // «вычислить следующее задание». Всё остальное — best-effort side-effects,
    // которые по дизайну НЕ должны задерживать смену экрана (иначе на медленном
    // диске/сети последний правильный ответ выглядит как зависание перед
    // переходом). markCompleted держим в await ПЕРЕД resolveNextPlanTask, потому
    // что resolveNextPlanTask читает completed-флаги (хотя текущее задание он и
    // так исключает по id — но так следующий заход на план увидит его закрытым).
    await markPersonalPlanTaskCompleted({
      taskId: planTaskId,
      planId,
      planInstanceId,
      studyTarget,
      dayIndex,
    }).catch(() => undefined);

    // XP/streak/leaderboard/lifetime-статистика — в ФОН. Эти ошибки и так
    // глотаются («stats must never block the learner's progress»), а внутри —
    // 5+ обращений к AsyncStorage и сетевой registerXP. Держать их в await
    // означало бы тормозить переход на сотни мс — пускаем не блокируя экран.
    // Передаём САМИ id отработанных фраз (item.id === id фразы): lifetime-метрика
    // phrases_learned дедуплицируется по плану, поэтому одна фраза дня в разных
    // заданиях/бонус-заданиях не раздувает «выучено».
    void awardPlanTaskCompletion({
      lang,
      studyTarget,
      practicedPhraseIds,
      phrasesPracticed: practicedPhraseIds.length,
      planInstanceId,
      planTaskId,
    }).catch(() => undefined);
    // resume этому заданию больше не нужен — оно закрыто. Тоже в фон: его
    // отсутствие не влияет на выбор следующего задания.
    void clearPlanTaskProgress(planInstanceId, planTaskId).catch(() => undefined);

    const nextTask = await resolveNextPlanTask({ completedTaskId: planTaskId, studyTarget }).catch(() => null);
    if (nextTask) {
      // Свап текущего экрана на следующее задание: «назад» из него ведёт в меню
      // плана, а не в только что закрытое задание. advancing оставляем true —
      // экран всё равно уходит, мелькание финал-модала исключено.
      openPersonalPlanTask(router, nextTask.plan, nextTask.day, nextTask.task, nextTask.planInstanceId, 'replace');
      return;
    }
    // Заданий дня больше нет — показываем финал дня на этом экране.
    setAdvancing(false);
    setCompleted(true);
  };

  const next = async () => {
    if (!item) return;
    if (lastResult === 'wrong') {
      setSelected(null);
      setTypedAnswer('');
      setBuildWords([]);
      setLastResult(null);
      return;
    }

    const nextCorrectIds = [...new Set([...correctIds, item.id])];
    const nextIndex = index + 1;
    setSelected(null);
    setTypedAnswer('');
    setBuildWords([]);
    setPronunciationScore(null);
    setLastResult(null);

    if (nextIndex < items.length && nextCorrectIds.length < targetCorrect) {
      setIndex(nextIndex);
      // Пошагово сохраняем позицию: выход посреди задания вернёт на этот вопрос.
      void savePlanTaskProgress(planInstanceId, planTaskId, { index: nextIndex, correctIds: nextCorrectIds });
      return;
    }

    await finishTaskAndAdvance(nextCorrectIds);
  };

  const completePronunciation = async () => {
    if (!item || !session || saving || done || !('targetText' in item)) return;
    // Normal path: completion is gated on a real on-device score that reached the
    // pass threshold. Escape hatch: when speech genuinely can't run here (no
    // recognizer on the device, or the user declined mic access), we let the
    // learner advance without a score — a free in-plan exercise must never trap
    // them. We record that honestly (passed:false, the real provider state).
    const speechBlocked = pronunciationBlocked != null;
    const scored = pronunciationScore;
    if (!speechBlocked && (!scored || !scored.passed)) return;
    setSaving(true);
    // ВАЖНО: НЕ играем здесь playCorrect() повторно. Звук «правильно» уже
    // прозвучал в момент оценки (PlanPronunciationRecorder.finishAttempt при
    // result.passed). Дубль на этом «Готово/дальше»-переходе давал двойной звук:
    // один при зачёте фразы, второй при переходе на следующую. Оставляем только
    // тактильный отклик на само нажатие.
    hapticSuccess();

    await submitAndStorePlanExerciseAnswer(session, {
      result: 'completed',
      contentUnitId: item.id,
      expectedAnswer: item.targetText,
      selectedAnswer: scored?.transcript ?? '',
      grammarTags: item.grammarTags,
      vocabularyTags: item.vocabularyTags,
      mistakeTags: [],
      payload: buildPlanPronunciationAttemptPayload({
        durationMs: 1,
        userPlayedRecording: false,
        transcript: scored?.transcript ?? '',
        score: scored?.score ?? 0,
        passed: scored?.passed ?? false,
        provider: 'device_speech_recognition',
        scoringVersion: scored?.scoringVersion ?? PLAN_PRONUNCIATION_SCORING_VERSION,
        recognitionConfidence: scored?.recognitionConfidence ?? 0,
      }),
    }, {
      recoveryWrite,
    }).catch(() => undefined);

    const nextCorrectIds = [...new Set([...correctIds, item.id])];
    setCorrectIds(nextCorrectIds);
    const nextIndex = index + 1;

    if (nextIndex < items.length && nextCorrectIds.length < targetCorrect) {
      setIndex(nextIndex);
      setPronunciationScore(null);
      // Пошагово сохраняем позицию: выход посреди задания вернёт на этот вопрос.
      void savePlanTaskProgress(planInstanceId, planTaskId, { index: nextIndex, correctIds: nextCorrectIds });
      setSaving(false);
      return;
    }

    await finishTaskAndAdvance(nextCorrectIds);
    setSaving(false);
  };

  return (
    <View style={[styles.safe, { backgroundColor: t.bgPrimary, paddingTop: insets.top }]}>
      <LinearGradient colors={isGold ? ['#171008', '#090704'] : t.bgGradient} style={styles.fill}>
        {/* Тот же верхний фейд под safe-area, что на главной/в личном плане. */}
        <TopFadeMask scrollY={fadeScrollY} zIndex={2} />
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => safeRouterBack(router, '/personal_plan')}
            accessibilityRole="button"
            accessibilityLabel="Назад"
            style={[styles.back, { backgroundColor: t.bgCard, borderColor: t.border }]}
          >
            <Ionicons name="chevron-back" size={18} color={t.textPrimary} />
            <Text numberOfLines={1} style={[styles.backText, { color: t.textPrimary, fontSize: f.bodyLg }]}>{chromeTitle}</Text>
          </TouchableOpacity>
          <View style={styles.headerStats}>
            <Text style={[styles.statText, { color: t.correct, fontSize: f.label }]}>●{correctIds.length}</Text>
            <Text style={[styles.statText, { color: t.textMuted, fontSize: f.label }]}>/{targetCorrect}</Text>
            {hasBundledCompatibilityPlanContentDay(planId, dayIndex) ? (
              <ReportErrorButton
                variant="icon-flag"
                screen="personal_plan_exercise"
                dataId={`${planId}_day_${dayIndex}_${item?.id ?? 'unit'}`}
                dataText={`${chromeTitle} · ${currentExerciseType}`}
                style={styles.reportFlag}
              />
            ) : null}
          </View>
        </View>
        <PlanExerciseProgressRail
          correct={correctIds.length}
          current={progressRailCurrent}
          target={targetCorrect}
          accent={accent}
          mutedColor={t.textMuted}
          correctColor={t.correct}
          trackColor={t.bgSurface2 ?? 'rgba(255,255,255,0.10)'}
        />

        <BouncyScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} onScroll={handleExerciseScroll} scrollEventThrottle={16}>
          {!item || !modeReady ? (
            <PlanExerciseFeedbackSurface
              tone="blocked"
              title={listeningBlocked ? 'Аудио ещё не подключено' : 'Режим пока не готов'}
              body={listeningBlocked
                ? 'Это задание появится, когда для фраз будет утвержденный звук. Пока не засчитываем его и не притворяемся, что слушание готово.'
                : 'Это задание не открылось: не хватает данных для упражнения.'}
              accent={accent}
              actionText={actionText}
              mutedText={t.textMuted}
              surfaceColor={t.bgCard}
            />
          ) : done ? (
            <View style={styles.doneSpacer} />
          ) : isRecallMode && 'targetText' in item ? (
            <>
              <View style={styles.questionBlock}>
                <Text style={[styles.prompt, { color: t.textMuted }]}>{triLang(lang, {
                  ru: 'Вспомни фразу без подсказок.',
                  uk: 'Пригадай фразу без підказок.',
                  es: 'Recuerda la frase sin pistas.',
                  'pt-BR': 'Lembre-se da frase sem dicas.',
                  vi: 'Nhớ lại cụm từ mà không cần gợi ý.',
                  id: 'Ingat frasa tanpa petunjuk.',
                  tr: 'İpucu olmadan ifadeyi hatırla.',
                  pl: 'Przypomnij sobie frazę bez podpowiedzi.',
                })}</Text>
                <Text style={[styles.english, { color: t.textPrimary }]}>{item.promptRu}</Text>
                <TextInput
                  value={typedAnswer}
                  onChangeText={setTypedAnswer}
                  editable={!lastResult && !saving}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Введи по-английски"
                  placeholderTextColor={t.textMuted}
                  style={[styles.recallInput, { color: t.textSecond, borderBottomColor: lastResult === 'wrong' ? t.wrong : t.border }]}
                  returnKeyType="done"
                  onSubmitEditing={() => void submitRecall()}
                />
              </View>

              {!lastResult ? (
                <PlanGradientButton
                  label="Проверить"
                  accent={accent}
                  actionText={actionText}
                  disabled={saving || typedAnswer.trim().length === 0}
                  onPress={() => void submitRecall()}
                  style={{ marginTop: 18 }}
                />
              ) : null}
            </>
          ) : isListenBuildMode && isPersonalPlanListenBuildItem(item) ? (
            <>
              <View style={styles.questionBlock}>
                <Text style={[styles.prompt, { color: t.textMuted }]}>{triLang(lang, {
                  ru: 'Сначала слушай, потом собирай фразу по порядку.',
                  uk: 'Спершу слухай, потім збирай фразу по порядку.',
                  es: 'Primero escucha, luego ordena la frase.',
                  'pt-BR': 'Primeiro escute, depois monte a frase na ordem.',
                  vi: 'Nghe trước, sau đó sắp xếp cụm từ theo thứ tự.',
                  id: 'Dengarkan dulu, lalu susun frasa sesuai urutan.',
                  tr: 'Önce dinle, sonra ifadeyi sırayla diz.',
                  pl: 'Najpierw słuchaj, potem ułóż frazę po kolei.',
                })}</Text>
                <PlanListenChooseAudioButton
                  item={item}
                  accent={accent}
                  actionText={actionText}
                  mutedText={t.textMuted}
                />
                <View
                  accessibilityLabel="Поле собранной фразы"
                  style={[styles.listenBuildAnswerBox, { borderColor: t.border, backgroundColor: t.bgCard }]}
                >
                  {buildWords.length > 0 ? buildWords.map((word, wordIndex) => (
                    <TouchableOpacity
                      key={`built-${word}-${wordIndex}`}
                      activeOpacity={0.78}
                      accessibilityRole="button"
                      accessibilityLabel={`Убрать слово: ${word}`}
                      disabled={Boolean(lastResult) || saving}
                      onPress={() => {
                        hapticTap();
                        setBuildWords((current) => current.filter((_, index) => index !== wordIndex));
                      }}
                      style={[styles.listenBuildAnswerChip, { borderColor: t.border, backgroundColor: t.bgSurface2 }]}
                    >
                      <Text style={[styles.listenBuildAnswerText, { color: t.textPrimary }]}>{word}</Text>
                    </TouchableOpacity>
                  )) : (
                    <Text style={[styles.listenBuildPlaceholder, { color: t.textMuted }]}>Слова появятся здесь</Text>
                  )}
                </View>
              </View>

              <View style={[styles.wordBank, { borderColor: t.border, backgroundColor: t.bgCard }]}>
                {item.wordOptions.map((word: string, wordIndex: number) => {
                  const usedCount = buildWords.filter((value) => value === word).length;
                  const availableCount = item.wordOptions.filter((value) => value === word).length;
                  const disabled = Boolean(lastResult) || saving || usedCount >= availableCount || buildWords.length >= item.targetWords.length;
                  const tileKey = `${wordIndex}`;
                  const on = flashKey === tileKey;
                  return (
                    <DuoPressable
                      key={`${word}:${wordIndex}`}
                      accessibilityLabel={`Добавить слово: ${word}`}
                      withHaptic={false}
                      disabled={disabled}
                      edgeHeight={5}
                      edgeColor={on ? accent : 'rgba(0,0,0,0.30)'}
                      style={[
                        styles.wordTile,
                        {
                          backgroundColor: on ? accent : t.bgCard,
                          borderColor: on ? accent : t.border,
                          borderWidth: on ? 1.5 : 1.5,
                          opacity: disabled ? 0.42 : 1,
                        },
                      ]}
                      onPress={() => {
                        flash(tileKey);
                        requestAnimationFrame(() => { void hapticTap(); });
                        setBuildWords((current) => [...current, word]);
                      }}
                    >
                      <Text style={[styles.wordTileText, { color: on ? (t.correctText ?? '#fff') : t.textPrimary, fontWeight: on ? '700' : '700' }]}>{word}</Text>
                    </DuoPressable>
                  );
                })}
              </View>

              {!lastResult ? (
                <View style={styles.rowActions}>
                  <TouchableOpacity
                    activeOpacity={0.82}
                    accessibilityRole="button"
                    accessibilityLabel="Убрать последнее слово"
                    disabled={buildWords.length === 0 || saving}
                    onPress={() => setBuildWords((current) => current.slice(0, -1))}
                    style={[styles.secondaryButton, { borderColor: t.border, backgroundColor: t.bgCard }]}
                  >
                    <Text style={[styles.secondaryButtonText, { color: buildWords.length > 0 ? t.textPrimary : t.textMuted }]}>Назад</Text>
                  </TouchableOpacity>
                  <PlanGradientButton
                    label="Проверить"
                    accent={accent}
                    actionText={actionText}
                    disabled={saving || buildWords.length !== item.targetWords.length}
                    onPress={() => void submitListenBuild()}
                    style={{ flex: 1 }}
                  />
                </View>
              ) : null}
            </>
          ) : isPronunciationMode && 'targetText' in item && 'completionLabel' in item ? (
            <>
              <View style={styles.questionBlock}>
                {/* Английский ответ НЕ показываем — он скрыт чёрточками внутри рекордера
                    и открывается по словам при правильном произношении (как в уроках). */}
                <Text style={[styles.panelText, { color: t.textMuted }]}>{item.promptRu}</Text>
              </View>

              <PlanPronunciationRecorder
                accent={accent}
                actionText={actionText}
                mutedText={t.textMuted}
                targetText={item.targetText}
                audioUri={item.audioReady ? item.audioUri : undefined}
                onScored={handlePronunciationScored}
                onScoringChange={setPronunciationScoring}
                onBlocked={setPronunciationBlocked}
              />

              {/* Кнопку «Дальше/Продолжить» показываем ТОЛЬКО когда есть что
                  нажимать: фраза засчитана (passed) ИЛИ движок недоступен и юзеру
                  дан escape-путь «Продолжить». Пока зачёта нет, раньше тут висел
                  пустой задизейбленный контейнер (тёмный прямоугольник без видимой
                  кнопки) — он не нужен, не рендерим его вовсе. */}
              {(pronunciationBlocked != null || pronunciationScore?.passed === true) && (
                <PlanGradientButton
                  label={pronunciationBlocked ? 'Продолжить' : item.completionLabel}
                  accent={accent}
                  actionText={actionText}
                  disabled={saving || pronunciationScoring}
                  onPress={() => void completePronunciation()}
                  style={{ marginTop: 18 }}
                />
              )}
            </>
          ) : (
            <>
              <View style={styles.questionBlock}>
                <Text style={[styles.prompt, { color: t.textMuted }]}>
                  {isListeningMode
                    ? triLang(lang, {
                        ru: 'Сначала послушай фразу, потом выбери смысл.',
                        uk: 'Спершу послухай фразу, потім обери зміст.',
                        es: 'Primero escucha la frase, luego elige el significado.',
                        'pt-BR': 'Primeiro escute a frase, depois escolha o significado.',
                        vi: 'Nghe cụm từ trước, sau đó chọn nghĩa.',
                        id: 'Dengarkan frasa dulu, lalu pilih maknanya.',
                        tr: 'Önce ifadeyi dinle, sonra anlamını seç.',
                        pl: 'Najpierw posłuchaj frazy, potem wybierz znaczenie.',
                      })
                    : isChoiceMode
                    ? `${triLang(lang, {
                        ru: 'Смысл',
                        uk: 'Зміст',
                        es: 'Significado',
                        'pt-BR': 'Significado',
                        vi: 'Nghĩa',
                        id: 'Makna',
                        tr: 'Anlam',
                        pl: 'Znaczenie',
                      })}: ${item.promptRu}`
                    : item.promptRu}
                </Text>
                <Text style={[styles.english, isChoiceMode ? styles.choiceInstruction : null, { color: t.textPrimary }]}>
                  {isListeningMode
                    ? triLang(lang, { ru: 'На слух', uk: 'На слух', es: 'De oído', 'pt-BR': 'De ouvido', vi: 'Theo âm thanh', id: 'Dengan mendengar', tr: 'Kulaktan', pl: 'Ze słuchu' })
                    : isChoiceMode
                    ? triLang(lang, {
                        ru: 'Нажми лучший вариант ниже',
                        uk: 'Натисни найкращий варіант нижче',
                        es: 'Toca la mejor opción abajo',
                        'pt-BR': 'Toque na melhor opção abaixo',
                        vi: 'Chạm vào lựa chọn tốt nhất bên dưới',
                        id: 'Ketuk pilihan terbaik di bawah',
                        tr: 'Aşağıdaki en iyi seçeneğe dokun',
                        pl: 'Dotknij najlepszej opcji poniżej',
                      })
                    : 'displayEnglish' in item
                    ? String(item.displayEnglish)
                    : triLang(lang, {
                        ru: 'Выбери подходящую фразу',
                        uk: 'Обери відповідну фразу',
                        es: 'Elige la frase adecuada',
                        'pt-BR': 'Escolha a frase adequada',
                        vi: 'Chọn cụm từ phù hợp',
                        id: 'Pilih frasa yang sesuai',
                        tr: 'Uygun ifadeyi seç',
                        pl: 'Wybierz odpowiednią frazę',
                      })}
                </Text>
                {isListeningMode && isPersonalPlanListenChooseItem(item) ? (
                  <PlanListenChooseAudioButton
                    item={item}
                    accent={accent}
                    actionText={actionText}
                    mutedText={t.textMuted}
                  />
                ) : null}
                {false && isListeningMode && isPersonalPlanListenChooseItem(item) ? (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={() => {
                      hapticTap();
                    }}
                    style={[styles.primaryButton, { backgroundColor: accent }]}
                  >
                    <Text style={[styles.primaryButtonText, { color: actionText }]}>Слушать</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Фидбэк ответа. ВЕРНЫЙ → короткая плашка «Дальше». НЕВЕРНЫЙ → ИИ-разбор
                  ошибки ИНЛАЙН (как в уроках): AiMistakeCard + «Объяснить проще» (модал
                  ниже). Старый авто-текст «Почему так» убран. */}
              {lastResult === 'correct' && usesOptionFeedback ? (
                <View style={styles.inlineFeedbackHost}>
                  <PlanExerciseFeedbackInline
                    tone="success"
                    title={resultModalTitle}
                    body={staticBody}
                    hideBody
                    actionLabel={triLang(lang, { ru: 'Дальше', uk: 'Далі', es: 'Siguiente', 'pt-BR': 'Avançar', vi: 'Tiếp', id: 'Lanjut', tr: 'Devam', pl: 'Dalej' })}
                    onAction={() => void next()}
                    accent={accent}
                    actionText={actionText}
                    mutedText={t.textMuted}
                    surfaceColor={t.bgCard}
                    textPrimaryColor={t.textPrimary}
                    loading={false}
                  />
                </View>
              ) : lastResult === 'wrong' && usesOptionFeedback ? (
                <View style={styles.inlineFeedbackHost}>
                  <AiMistakeCard
                    lang={lang}
                    state={mistakeExplain.aiMistakeState}
                    explanation={mistakeExplain.aiMistakeText}
                    remaining={mistakeExplain.aiMistakeRemaining}
                    onExplain={mistakeExplain.explain}
                    targetAnswer={mistakeTargetAnswer}
                    userAnswer={mistakeUserAnswer}
                  />
                  <TouchableOpacity
                    onPress={() => void next()}
                    activeOpacity={0.85}
                    style={[styles.retryAfterMistake, { borderColor: accent }]}
                  >
                    <Text style={{ color: accent, fontWeight: '700' }}>
                      {triLang(lang, { ru: 'Попробовать ещё раз', uk: 'Спробувати ще раз', es: 'Intentar de nuevo', 'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj jeszcze raz' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.optionsSpacer} />
              )}

              <View style={useGridOptions ? styles.optionsGrid : styles.options}>
                {choiceOptions.map((option: string) => {
                  const isSelected = selected === option;
                  const isCorrect = option === currentCorrectAnswer;
                  const isWrong = lastResult && isSelected && !isCorrect;
                  const isRight = lastResult && isSelected && isCorrect;
                  const on = flashKey === option;
                  const borderColor = isRight
                    ? t.correct
                    : isWrong
                    ? t.wrong
                    : on
                    ? accent
                    : isSelected
                    ? accent
                    : t.border;
                  const bgColor = isRight
                    ? t.correctBg
                    : isWrong
                    ? t.wrongBg
                    : on
                    ? accent
                    : t.bgCard;
                  const textColor = isRight
                    ? t.correct
                    : isWrong
                    ? t.wrong
                    : on
                    ? (t.correctText ?? '#fff')
                    : t.textPrimary;
                  return (
                    <DuoPressable
                      key={option}
                      accessibilityLabel={`Выбрать ответ: ${option}`}
                      withHaptic={false}
                      disabled={Boolean(lastResult) || saving}
                      edgeHeight={5}
                      edgeColor={on ? accent : 'rgba(0,0,0,0.30)'}
                      wrapStyle={useGridOptions ? styles.optionGridWrap : undefined}
                      style={[
                        useGridOptions ? styles.optionGridSurface : styles.option,
                        { backgroundColor: bgColor, borderColor, borderWidth: on ? 1.5 : (useGridOptions ? 0.5 : 1) },
                      ]}
                      onPress={() => {
                        flash(option);
                        // Результат (success/error) даёт submit — отдельный tap убран.
                        void submit(option);
                      }}
                    >
                      <Text
                        style={[
                          useGridOptions ? styles.optionGridText : styles.optionText,
                          { color: textColor, fontWeight: on ? '700' : (useGridOptions ? '500' : '600') },
                        ]}
                        numberOfLines={useGridOptions ? 1 : undefined}
                      >
                        {option}
                      </Text>
                    </DuoPressable>
                  );
                })}
              </View>

              {lastResult ? <View style={styles.doneSpacer} /> : null}
            </>
          )}

          {/* Инлайн-разбор для не-option режимов — внутри скролла, прямо под фразой
              (вместо модала в пустоте). Для option-режимов разбор рендерится выше. */}
          {nonOptionInlineFeedback}
        </BouncyScrollView>
        {/* Финал ДНЯ. После каждого ОБЫЧНОГО задания модала больше нет — сразу
            открывается следующее задание (finishTaskAndAdvance → replace). Этот
            экран показывается ТОЛЬКО когда заданий дня больше не осталось.
            TODO: заменить на экран «День пройден» с коротким ИИ-разбором ошибок. */}
        <PlanExerciseFeedbackModal
          visible={done}
          tone="success"
          title={triLang(lang, { ru: 'День пройден', uk: 'День пройдено', es: 'Día completado', 'pt-BR': 'Dia concluído', vi: 'Hoàn thành ngày', id: 'Hari selesai', tr: 'Gün tamamlandı', pl: 'Dzień ukończony' })}
          body={triLang(lang, { ru: 'Все вызовы на сегодня выполнены. Возвращайся завтра за новой порцией.', uk: 'Усі виклики на сьогодні виконано. Повертайся завтра по нову порцію.', es: 'Has completado todas las tareas de hoy. Vuelve mañana por más.', 'pt-BR': 'Você concluiu todas as tarefas de hoje. Volte amanhã para mais.', vi: 'Bạn đã hoàn thành mọi nhiệm vụ hôm nay. Quay lại vào ngày mai nhé.', id: 'Semua tugas hari ini selesai. Kembali besok untuk lanjut.', tr: 'Bugünkü tüm görevleri tamamladın. Yarın yenileri için geri dön.', pl: 'Ukończono wszystkie dzisiejsze zadania. Wróć jutro po więcej.' })}
          actionLabel={triLang(lang, { ru: 'К плану', uk: 'До плану', es: 'Al plan', 'pt-BR': 'Ao plano', vi: 'Về kế hoạch', id: 'Ke rencana', tr: 'Plana dön', pl: 'Do planu' })}
          onAction={() => safeRouterBack(router, '/personal_plan')}
          accent={accent}
          actionText={actionText}
          mutedText={t.textMuted}
          surfaceColor={t.bgCard}
        />
      </LinearGradient>
    </View>
  );
}

type PersonalPlanExerciseStyles = {
  safe: ViewStyle;
  fill: ViewStyle;
  modalBackdrop: ViewStyle;
  modalSheet: ViewStyle;
  header: ViewStyle;
  back: ViewStyle;
  backText: TextStyle;
  headerStats: ViewStyle;
  statText: TextStyle;
  reportFlag: ViewStyle;
  headerCopy: ViewStyle;
  headerModeIcon: ViewStyle;
  kicker: TextStyle;
  h1: TextStyle;
  progress: TextStyle;
  progressRail: ViewStyle;
  progressRailRow: ViewStyle;
  progressRailTrack: ViewStyle;
  progressArrowRow: ViewStyle;
  progressCellsRow: ViewStyle;
  progressCounter: TextStyle;
  progressCell: ViewStyle;
  scroll: ViewStyle;
  questionBlock: ViewStyle;
  footer: ViewStyle;
  footerButton: ViewStyle;
  footerLabel: TextStyle;
  panel: ViewStyle;
  panelTitle: TextStyle;
  panelText: TextStyle;
  phraseCard: ViewStyle;
  modeRow: ViewStyle;
  modeIcon: ViewStyle;
  modeCopy: ViewStyle;
  modeEyebrow: TextStyle;
  modeHint: TextStyle;
  liquidRail: ViewStyle;
  prompt: TextStyle;
  english: TextStyle;
  choiceInstruction: TextStyle;
  listenBuildAnswerBox: ViewStyle;
  listenBuildAnswerChip: ViewStyle;
  listenBuildAnswerText: TextStyle;
  listenBuildPlaceholder: TextStyle;
  wordBank: ViewStyle;
  wordTile: ViewStyle;
  wordTileText: TextStyle;
  options: ViewStyle;
  optionsSpacer: ViewStyle;
  optionsGrid: ViewStyle;
  option: ViewStyle;
  optionText: TextStyle;
  optionGrid: ViewStyle;
  optionGridWrap: ViewStyle;
  optionGridSurface: ViewStyle;
  optionGridText: TextStyle;
  explain: ViewStyle;
  explainTitle: TextStyle;
  explainText: TextStyle;
  feedbackSurface: ViewStyle;
  feedbackHeader: ViewStyle;
  feedbackIcon: ViewStyle;
  feedbackTitle: TextStyle;
  feedbackBody: TextStyle;
  inlineFeedbackHost: ViewStyle;
  retryAfterMistake: ViewStyle;
  inlineFeedback: ViewStyle;
  inlineFeedbackHeader: ViewStyle;
  inlineFeedbackTitle: TextStyle;
  inlineFeedbackBody: TextStyle;
  inlineFeedbackLoading: ViewStyle;
  inlineFeedbackButton: ViewStyle;
  inlineFeedbackButtonText: TextStyle;
  doneSpacer: ViewStyle;
  recorderStack: ViewStyle;
  recorderHintRow: ViewStyle;
  recorderHintText: TextStyle;
  recorderButton: ViewStyle;
  recorderButtonText: TextStyle;
  recorderEqualizer: ViewStyle;
  recorderStatus: TextStyle;
  recorderPhraseWrap: ViewStyle;
  recorderPhraseWord: TextStyle;
  recorderRingWrap: ViewStyle;
  recorderRingTarget: TextStyle;
  recallInput: TextStyle;
  recallAnswer: TextStyle;
  rowActions: ViewStyle;
  secondaryButton: ViewStyle;
  secondaryButtonText: TextStyle;
  primaryButton: ViewStyle;
  primaryButtonGradient: ViewStyle;
  primaryButtonText: TextStyle;
  bareCtaSurface: ViewStyle;
  bareCtaText: TextStyle;
  bareCtaIcon: ViewStyle;
  optionBadge: ViewStyle;
  optionBadgeText: TextStyle;
};

const styles = StyleSheet.create<PersonalPlanExerciseStyles>({
  safe: { flex: 1 },
  fill: { flex: 1 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalSheet: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '70%',
    borderRadius: 20,
    borderWidth: 0.5,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  backText: { fontWeight: '600', flexShrink: 1 },
  headerStats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  statText: { fontWeight: '700' },
  reportFlag: { marginLeft: 10, paddingHorizontal: 4 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerModeIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { fontSize: 11, lineHeight: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0 },
  h1: { fontSize: 27, lineHeight: 32, fontWeight: '700' },
  progress: { fontSize: 20, lineHeight: 25, fontWeight: '700' },
  progressRail: {
    flexDirection: 'row',
    gap: 2,
    marginHorizontal: 14,
    marginBottom: 8,
  },
  progressRailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 8,
  },
  progressRailTrack: { flex: 1, flexDirection: 'column', gap: 2 },
  progressArrowRow: { height: 10, position: 'relative' },
  progressCellsRow: { flexDirection: 'row', gap: 4 },
  progressCounter: { fontSize: 12, minWidth: 34, textAlign: 'right', fontWeight: '600' },
  progressCell: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  scroll: { padding: 16, paddingBottom: 34, flexGrow: 1 },
  questionBlock: { gap: 14, paddingTop: 8, paddingBottom: 4 },
  optionsSpacer: { flex: 1, minHeight: 12 },
  footer: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderTopWidth: 0.5,
  },
  footerButton: { flex: 1, alignItems: 'center' },
  footerLabel: { marginTop: 4 },
  panel: {
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 22,
    gap: 14,
    elevation: 6,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
  },
  panelTitle: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  panelText: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  phraseCard: {
    borderRadius: 30,
    borderWidth: 1.5,
    padding: 20,
    minHeight: 196,
    justifyContent: 'center',
    gap: 16,
    elevation: 10,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.26,
    shadowRadius: 26,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modeIcon: {
    width: 52,
    height: 52,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  modeCopy: { flex: 1, minWidth: 0, gap: 3 },
  modeEyebrow: { fontSize: 12, lineHeight: 15, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0 },
  modeHint: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  liquidRail: { height: 2, borderRadius: 2, opacity: 0.72 },
  prompt: { fontSize: 16, lineHeight: 22, fontWeight: '500', textAlign: 'center' },
  english: { fontSize: 27, lineHeight: 31, fontWeight: '700', textAlign: 'center' },
  choiceInstruction: { fontSize: 22, lineHeight: 28 },
  listenBuildAnswerBox: {
    minHeight: 92,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  listenBuildAnswerChip: {
    minHeight: 42,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listenBuildAnswerText: { fontSize: 18, lineHeight: 23, fontWeight: '700' },
  listenBuildPlaceholder: { fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  wordBank: {
    marginTop: 18,
    borderRadius: 24,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  wordTile: {
    minHeight: 50,
    borderRadius: 17,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordTileText: { fontSize: 18, lineHeight: 23, fontWeight: '700' },
  options: { marginTop: 18, gap: 10 },
  optionsGrid: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  explain: {
    marginTop: 18,
    borderRadius: 26,
    borderWidth: 1.5,
    padding: 18,
    gap: 12,
    elevation: 5,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
  },
  explainTitle: { fontSize: 18, lineHeight: 23, fontWeight: '700' },
  explainText: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  feedbackSurface: {
    marginTop: 0,
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    elevation: 12,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  feedbackIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackTitle: { flex: 1, fontSize: 19, lineHeight: 24, fontWeight: '700' },
  feedbackBody: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  inlineFeedbackHost: { flex: 1, minHeight: 12, justifyContent: 'center', paddingVertical: 16 },
  retryAfterMistake: { marginTop: 12, alignSelf: 'center', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 11 },
  inlineFeedback: {
    width: '100%',
    borderRadius: 14,
    borderLeftWidth: 3,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  inlineFeedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineFeedbackTitle: { flex: 1, fontSize: 16, lineHeight: 20, fontWeight: '800' },
  inlineFeedbackBody: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  inlineFeedbackLoading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inlineFeedbackButton: {
    marginTop: 2,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  inlineFeedbackButtonText: { fontSize: 15, fontWeight: '800' },
  doneSpacer: { minHeight: 18 },
  recorderStack: {
    marginTop: 18,
    gap: 12,
  },
  recorderHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
  },
  recorderHintText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  recorderButton: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  recorderButtonText: { fontSize: 16, fontWeight: '800' },
  recorderEqualizer: { alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  recorderStatus: { fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center', paddingHorizontal: 4 },
  recorderPhraseWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 14 },
  recorderPhraseWord: { fontSize: 22, lineHeight: 30, fontWeight: '600' },
  recorderRingWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  recorderRingTarget: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  recallInput: {
    minHeight: 60,
    borderBottomWidth: 1,
    paddingHorizontal: 4,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    textAlign: 'center',
  },
  recallAnswer: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  rowActions: { marginTop: 18, flexDirection: 'row', gap: 10 },
  secondaryButton: {
    minHeight: 72,
    minWidth: 104,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  primaryButton: {
    minHeight: 72,
    borderRadius: 22,
    borderWidth: 1.5,
    elevation: 5,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  primaryButtonGradient: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
    overflow: 'hidden',
  },
  primaryButtonText: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  // Голая объёмная CTA «Дальше» (как на интро-скринах урока): большая, без рамок
  // и без плашки-контейнера. Объём даёт DuoPressable (нижняя цветная кромка).
  bareCtaSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 64,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  bareCtaText: { fontSize: 18, lineHeight: 22, fontWeight: '800', letterSpacing: 0.4 },
  bareCtaIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  optionBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  optionBadgeText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  option: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    justifyContent: 'center',
  },
  optionText: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  optionGrid: {
    width: '48%',
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionGridWrap: {
    width: '48%',
    marginBottom: 10,
  },
  optionGridSurface: {
    borderRadius: 12,
    borderWidth: 0.5,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  optionGridText: { fontSize: 20, lineHeight: 25, fontWeight: '500', textAlign: 'center' },
});
