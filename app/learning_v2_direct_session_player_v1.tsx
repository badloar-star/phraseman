import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Crypto from "expo-crypto";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  SlideInRight,
  SlideOutLeft,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import LearningV2AnswerChoice from "../components/LearningV2AnswerChoice";
import LearningV2NewWordEncounterOverlay, {
  type LearningV2WindowPointV1,
} from "../components/learning-v2/LearningV2NewWordEncounterOverlay";
import LearningV2WordPocketOverlayV1 from "../components/learning-v2/LearningV2WordPocketOverlayV1";
import LearningV2SessionFinale from "../components/LearningV2SessionFinale";
import LearningV2RuneFlight, {
  type LearningV2RuneFlightPoint,
} from "../components/LearningV2RuneFlight";
import ReportErrorButton from "../components/ReportErrorButton";
import SessionAttemptsHud from "../components/session_attempts/SessionAttemptsHud";
import { useLang } from "../components/LangContext";
import { useStudyTarget } from "../components/StudyTargetContext";
import { useTheme } from "../components/ThemeContext";
import { useEnergy, useEnergySessionIntent } from "../components/EnergyContext";
import { hapticError, hapticSuccess, hapticTap } from "../hooks/use-haptics";
import { useAudio } from "../hooks/use-audio";
import { useLearningV2LocalHoldToTalkV1 } from "../hooks/use_learning_v2_local_hold_to_talk_v1";
import { useLearningV2UnlockedLessonWordsV1 } from "../hooks/use_learning_v2_unlocked_lesson_words_v1";
import { useManagedSpokenAudioPlayer } from "../hooks/use_managed_spoken_audio_player";
import { useSessionAttempts } from "../hooks/useSessionAttempts";
import { useSessionAttemptAutoReset } from "../hooks/useSessionAttemptAutoReset";
import { SESSION_ATTEMPTS_MOTION } from "../constants/motionHybrid";
import { createLearningV2CourseLocalProgressStoreV1 } from "../modules/learning-v2/progress/course_local_progress_v1";
import { deriveLocalOfflineProgressAccountScopeHash } from "../modules/learning-v2/progress/progress_account_scope";
import { deriveLearningV2EconomicAccountScopeHash } from "../modules/learning-v2/progress/economic_account_scope";
import {
  createLearningV2SessionRuneRewardCompositeV1,
  resolveLearningV2SessionRuneRewardPublicationTokenV1,
} from "../modules/learning-v2/progress/learning_session_rune_reward_composite_v1";
import {
  createLearningV2CourseSessionDeviceRunV1,
  evaluateLearningV2CourseSessionDeviceInteractionV1,
  getLearningV2CourseSessionAuxiliaryEntryV1,
  getLearningV2CourseSessionDeviceRunSummaryV1,
  getLearningV2CourseSessionNewWordEncountersV1,
  getLearningV2CourseSessionPracticeInteractionV1,
  materializeLearningV2CourseSessionCompletedSummaryV1,
  type LearningV2CourseSessionDeviceRunHandleV1,
  type LearningV2CourseSessionInteractionCompletionV1,
} from "../modules/learning-v2/runtime/course_session_device_run_v1";
import type { V2LocalEvaluatorResponseV1 } from "../modules/learning-v2/runtime/local_evaluator_capsule_v1";
import { learningV2CourseSessionVoiceResponseV1 } from "../modules/learning-v2/runtime/course_session_voice_response_v1";
import { getStableId } from "./stable_id";
import { captureAccountGeneration } from "./account_generation";
import { captureCurrentAccountObjectiveAttempt } from "./mistake_practice_capture";
import { safeRouterBack } from "./navigation_back";
import { VoiceEqualizer } from "./voice_equalizer";
import {
  prepareCurrentLearningV2CourseSessionV3,
  resolveLearningV2CourseSessionReadyMaterialV3,
  type LearningV2CourseReleasedSessionCurrentLocatorV3,
  type LearningV2CourseReleasedSessionMaterialV3,
  type LearningV2CourseSessionReadyHandleV3,
} from "./learning_v2_course_released_session_client_v3";
import { createLearningV2CourseSessionCompletedSpoolV1 } from "./learning_v2_course_session_completed_spool_v1";
import {
  learningV2SessionStars,
  recordLearningV2SessionStarResult,
} from "./learning_v2_session_star_results_store";
import {
  createLearningV2InteractionRuneAwardLedgerV1,
  learningV2InteractionRuneAwardV1,
} from "./learning_v2_interaction_rune_award_v1";
import { commitLearningV2SessionRuneRewardCompositeV1 } from "./learning_v2_owner_repository_runtime";
import {
  createLearningV2PreviewSpeechGenerationGuardV1,
  learningV2PreviewSpeechWatchdogMsV1,
} from "./learning_v2_preview_speech_watchdog_v1";
import {
  learningV2SessionAbandonEvent,
  learningV2SessionCompleteEvent,
  learningV2SessionStartEvent,
  learningV2TaskResultEvent,
  type LearningV2ActivityFamilyCode,
  type LearningV2SessionKindCode,
} from "../modules/learning-v2/telemetry";
import { trackLearningV2Telemetry } from "./learning_v2_telemetry";
import {
  resolveLearningV2CourseSessionFullPhraseAudioV1,
  resolveLearningV2CourseSessionSelectableAudioV1,
  type LearningV2CourseSessionAudioPreloadHandleV1,
} from "./learning_v2_course_session_audio_preload_v1";
import { adaptLearningV2DirectSessionIntroV1 } from "./learning_v2_direct_session_intro_adapter_v1";
import LearningV2SessionIntro from "./learning_v2_session_intro";
import LearningV2CheckpointSeal from "../components/LearningV2CheckpointSeal";
import LearningV2CheckpointOutcome, {
  type LearningV2CheckpointSkillRow,
} from "../components/LearningV2CheckpointOutcome";
import { learningV2CheckpointCopy } from "./learning_v2_checkpoint_copy";
import { learningV2CourseSessionRoleV1 } from "../modules/learning-v2/content/course_topology_v1";
import { learningV2SessionCopy } from "./learning_v2_session_copy";
import type {
  LearningV2NewWordAudioStateV1,
  LearningV2NewWordSaveStateV1,
} from "./learning_v2_new_word_encounter_copy";
import {
  createLearningV2InterleavedNewWordFlowV1,
  reduceLearningV2InterleavedNewWordFlowV1,
  type LearningV2InterleavedNewWordFlowEventV1,
  type LearningV2InterleavedNewWordFlowStateV1,
} from "./learning_v2_interleaved_new_word_flow_v1";
import {
  isLearningV2NewWordEncounterSavedV1,
  removeLearningV2NewWordEncounterFromCardsV1,
  saveLearningV2NewWordEncounterToCardsV1,
} from "./learning_v2_new_word_encounter_save_v1";
import { useStableSafeAreaInsets } from "./stable_safe_area_metrics";
import { triLang } from "../constants/i18n";
// зачем: владелец одобрил 6 активных отдельных режимов упражнений (docs/v2/mockups/
// index.html) вместо одной универсальной карточки. Роутер подменяет ТОЛЬКО
// слой представления (MODE_ICONS + промпт + ответы) — evaluate/finish/advance
// ниже не трогаются (тесты грепают этот файл по литеральным маркерам).
import {
  isLearningV2ModeRoutedV1,
  LearningV2ModeRouterV1,
} from "../modules/learning-v2/modes/mode_router_v1";
import { learningV2RuneAccessibilityLabelV1 } from "../modules/learning-v2/modes/mode_copy_v1";
import type {
  LearningV2ModePhaseV1,
  LearningV2ReferenceAudioStateV1,
} from "../modules/learning-v2/modes/mode_contract_v1";
import ScriptedRepeatCompareModeV1 from "../modules/learning-v2/modes/scripted_repeat_compare_mode_v1";
import {
  buildLearningV2AuthoringDevicePreviewV1,
  buildLearningV2DevUnlockedDraftDevicePreviewV1,
  resolveLearningV2AuthoringPreviewSpeechTextV1,
  type LearningV2AuthoringDevicePreviewV1,
} from "../modules/learning-v2/preview/authoring_device_preview_v1";
import { stableShuffleLearningV2OptionsV1 } from "../modules/learning-v2/runtime/stable_option_shuffle_v1";
import {
  markLearningV2AuthoringPreviewWordUnlockedV1,
  markLearningV2LessonWordUnlockedV1,
  type LearningV2UnlockedLessonWordV1,
} from "./learning_v2_unlocked_lesson_words_v1";
import { DebugLogger } from './debug-logger';

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const MODE_ICONS = Object.freeze({
  phrase_builder: "construct-outline",
  listen_choose: "headset-outline",
  sound_contrast: "pulse-outline",
  listen_build_dictation: "ear-outline",
  context_gap_grammar: "text-outline",
  speed_match: "flash-outline",
  scripted_repeat_compare: "mic-outline",
} as const satisfies Record<
  string,
  React.ComponentProps<typeof Ionicons>["name"]
>);

type ResultState = "idle" | "correct";
type LearningV2AnsweredUiSnapshotV1 = Readonly<{
  selectedChoiceId: string | null;
  orderedIds: readonly string[];
  transcript: string;
}>;

const learningV2ShowsVoiceFooterV1 = (practice: { readonly family: string }) => {
  const showVoiceFooter = practice.family === "scripted_repeat_compare";
  return showVoiceFooter;
};

/**
 * Вид занятия для телеметрии — выводится из координаты, а не из содержания.
 * По карте курса: 8/16/24/32/40/48 — проверки глав, 56 — итоговый экзамен.
 * Точный педагогический SessionKind живёт в контенте; здесь нужен только
 * безопасный код для воронки.
 */
function telemetrySessionKind(ordinal: number): LearningV2SessionKindCode {
  if (ordinal === 56) return "final_exam";
  if (ordinal % 8 === 0) return "checkpoint";
  return "phrases";
}

function exactOrdinal(value: string, max: number): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= max
    ? parsed
    : null;
}

function locatorFromParams(
  input: Readonly<{
    environment: string;
    targetLanguage: string;
    studyTarget: string;
    learnerSourceLocale: string;
    seasonId: string;
    lessonOrdinal: number;
    sessionOrdinal: number;
  }>,
): LearningV2CourseReleasedSessionCurrentLocatorV3 | null {
  if (
    !(["lab", "staging", "production"] as const).includes(
      input.environment as never,
    )
  )
    return null;
  if (!input.seasonId) return null;
  return Object.freeze({
    environment: input.environment as "lab" | "staging" | "production",
    targetLanguage: input.targetLanguage,
    studyTarget: input.studyTarget,
    learnerSourceLocale: input.learnerSourceLocale,
    seasonId: input.seasonId,
    lessonOrdinal: input.lessonOrdinal,
    sessionOrdinal: input.sessionOrdinal,
  });
}

function runFrom(
  locator: LearningV2CourseReleasedSessionCurrentLocatorV3,
  material:
    | LearningV2CourseReleasedSessionMaterialV3
    | LearningV2AuthoringDevicePreviewV1,
): LearningV2CourseSessionDeviceRunHandleV1 {
  return createLearningV2CourseSessionDeviceRunV1({
    environment: locator.environment,
    targetLanguage: locator.targetLanguage,
    studyTarget: locator.studyTarget,
    learnerSourceLocale: locator.learnerSourceLocale,
    seasonId: locator.seasonId,
    releaseId: material.releaseId,
    activeRootFingerprint: material.activeRootFingerprint,
    activeHeadFingerprint: material.activeHeadFingerprint,
    lessonId: material.lessonId,
    lessonOrdinal: material.lessonOrdinal,
    courseSessionId: material.courseSessionId,
    sessionOrdinal: material.sessionOrdinal,
    packageFingerprint: material.packageFingerprint,
    childSetFingerprint: material.childSetFingerprint,
    introChild: material.introChild,
    learnerChild: material.learnerChild,
    evaluatorCapsuleChild: material.evaluatorCapsuleChild,
    auxiliaryChild: material.auxiliaryChild,
  });
}

export default function LearningV2DirectSessionPlayerV1() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string | string[];
    releaseEnvironment?: string | string[];
    releaseSeasonId?: string | string[];
    lessonOrdinal?: string | string[];
    sessionOrdinal?: string | string[];
    previewMode?: string | string[];
    previewOrigin?: string | string[];
  }>();
  const previewMode = first(params.previewMode);
  const isDevUnlockedDraftPreview =
    __DEV__ && previewMode === "dev_unlocked_drafts_v1";
  const isAuthoringPreview =
    __DEV__ &&
    (previewMode === "authoring_v1" || isDevUnlockedDraftPreview);
  const previewReturnsToCourse = first(params.previewOrigin) === "course";
  const exitRoute = isAuthoringPreview && !previewReturnsToCourse
    ? "/learning_v2_authoring_preview"
    : "/learning-v2/course";
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { theme: t, f } = useTheme();
  const insets = useStableSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const copy = useMemo(() => learningV2SessionCopy(lang), [lang]);
  const sessionRunIdRef = useRef(Crypto.randomUUID());
  const lessonOrdinal = exactOrdinal(first(params.lessonOrdinal), 32);
  const sessionOrdinal = exactOrdinal(first(params.sessionOrdinal), 56);
  const {
    energy,
    bonusEnergy,
    isUnlimited: energyUnlimited,
    energyReady,
    confirmSpendOne,
    acknowledgeSessionStart,
  } = useEnergy();
  const restartEnergyMountIdRef = useRef(Crypto.randomUUID());
  const [restartEnergyAttemptRevision, setRestartEnergyAttemptRevision] =
    useState(0);
  const restartEnergyIntent = useEnergySessionIntent(
    "learning_v2_session",
    `${lessonOrdinal ?? "unknown"}:${sessionOrdinal ?? "unknown"}`,
    `${restartEnergyMountIdRef.current}:${restartEnergyAttemptRevision}`,
  );
  const [restartEnergyBusy, setRestartEnergyBusy] = useState(false);
  const restartEnergyBusyRef = useRef(false);
  const attemptsAccountToken = useMemo(() => captureAccountGeneration(), []);
  const attemptsSessionId = `learning-v2-direct:${lessonOrdinal ?? "unknown"}:${sessionOrdinal ?? "unknown"}:${sessionRunIdRef.current}`;
  const sessionAttempts = useSessionAttempts({
    token: attemptsAccountToken,
    sessionId: attemptsSessionId,
    initialQuestionId: `${attemptsSessionId}:intro`,
    autoHydrate: !isAuthoringPreview,
    persistenceEnabled: !isAuthoringPreview,
  });
  const [showAttemptsModal, setShowAttemptsModal] = useState(false);
  const attemptAnswerSequenceRef = useRef(0);
  const attemptsModalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const locator = useMemo(
    () =>
      lessonOrdinal && sessionOrdinal
        ? locatorFromParams({
            environment: first(params.releaseEnvironment) || "production",
            targetLanguage: isAuthoringPreview ? "en" : studyTarget,
            studyTarget: isAuthoringPreview ? "en" : studyTarget,
            learnerSourceLocale: lang,
            seasonId: first(params.releaseSeasonId) || "learning-v2",
            lessonOrdinal,
            sessionOrdinal,
          })
        : null,
    [
      lang,
      lessonOrdinal,
      isAuthoringPreview,
      params.releaseEnvironment,
      params.releaseSeasonId,
      sessionOrdinal,
      studyTarget,
    ],
  );
  const [material, setMaterial] = useState<
    | LearningV2CourseReleasedSessionMaterialV3
    | LearningV2AuthoringDevicePreviewV1
    | null
  >(null);
  const [readyHandle, setReadyHandle] =
    useState<LearningV2CourseSessionReadyHandleV3 | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // зачем: причина падения загрузки, видимая только в дев-сборке — без неё
  // экран «Сессия недоступна» не отличает нет сети от нет релиза.
  const [loadFailureReason, setLoadFailureReason] = useState<string | null>(
    null,
  );
  const [loadRevision, setLoadRevision] = useState(0);
  const [introDone, setIntroDone] = useState(false);
  const [newWordFlow, setNewWordFlow] =
    useState<LearningV2InterleavedNewWordFlowStateV1>(() =>
      createLearningV2InterleavedNewWordFlowV1(),
    );
  const newWordFlowRef = useRef<LearningV2InterleavedNewWordFlowStateV1>(
    createLearningV2InterleavedNewWordFlowV1(),
  );
  const [newWordSaveStates, setNewWordSaveStates] = useState<
    Readonly<Record<string, LearningV2NewWordSaveStateV1>>
  >({});
  const newWordSaveBusyRef = useRef(new Set<string>());
  const [wordPocketOpen, setWordPocketOpen] = useState(false);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceAudioAutoplayToken, setPracticeAudioAutoplayToken] =
    useState(0);
  const [result, setResult] = useState<ResultState>("idle");
  const [attempts, setAttempts] = useState(1);
  const [wrongCount, setWrongCount] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [lastWrongResponseId, setLastWrongResponseId] = useState<string | null>(
    null,
  );
  const [orderedIds, setOrderedIds] = useState<readonly string[]>([]);
  const [transcript, setTranscript] = useState("");
  const voiceCancelRef = useRef<() => void>(() => {});
  const [sessionRunes, setSessionRunes] = useState(0);
  const runeAwardLedgerRef = useRef(
    createLearningV2InteractionRuneAwardLedgerV1(),
  );
  const [runeFlight, setRuneFlight] = useState<Readonly<{
    key: number;
    count: 1 | 2 | 3;
    from: LearningV2RuneFlightPoint;
    to: LearningV2RuneFlightPoint;
  }> | null>(null);
  const runeCounterRef = useRef<View>(null);
  const runeAwardOriginRef = useRef<View>(null);
  const runeBump = useSharedValue(1);
  const runeBumpStyle = useAnimatedStyle(() => ({
    transform: [{ scale: runeBump.value }],
  }));
  const wordPocketBump = useSharedValue(1);
  const wordPocketBumpStyle = useAnimatedStyle(() => ({
    transform: [{ scale: wordPocketBump.value }],
  }));
  const wordPocketTargetRef = useRef<View>(null);
  const measureWordPocketTarget = useCallback(
    () =>
      new Promise<LearningV2WindowPointV1 | null>((resolve) => {
        const target = wordPocketTargetRef.current;
        if (!target) {
          resolve(null);
          return;
        }
        target.measureInWindow((x, y, width, height) => {
          if (![x, y, width, height].every(Number.isFinite)) {
            resolve(null);
            return;
          }
          resolve({ x: x + width / 2, y: y + height / 2 });
        });
      }),
    [],
  );
  const [finishing, setFinishing] = useState(false);
  // зачем (аудит анимаций 22.08): сессия завершалась молча — сразу возврат на
  // карту. Теперь звёзды зажигаются по одной (<=700мс), и только потом уход.
  const [finaleStars, setFinaleStars] = useState<0 | 1 | 2 | 3 | null>(null);
  // зачем (техдолг Phase 12): до этого в курсе не было НИ ОДНОГО события —
  // после релиза мы бы не увидели, где люди бросают занятие. Отсчёт начинается
  // с первого готового кадра; длительность уходит грубым бакетом, не точным
  // таймлайном человека.
  // зачем (спека SB-14, макет 26): проверка главы — отдельный сценарий, а не
  // обычное занятие со значком. Роль берём из топологии курса, а не угадываем.
  const sessionRole =
    sessionOrdinal !== null
      ? learningV2CourseSessionRoleV1(sessionOrdinal)
      : null;
  const isCheckpoint =
    sessionRole === "chapter_checkpoint" || sessionRole === "final_exam";
  const checkpointCopy = useMemo(() => learningV2CheckpointCopy(lang), [lang]);
  const [checkpointEntryDone, setCheckpointEntryDone] = useState(false);
  const sessionStartedAtRef = useRef<number | null>(null);
  const sessionStageRef = useRef<"intro" | "practice" | "finale">("intro");
  const telemetryStartSentRef = useRef(false);
  const interruptedWhileBackgroundedRef = useRef(false);
  const finishingRef = useRef(false);
  const completionsRef = useRef(
    new Map<string, LearningV2CourseSessionInteractionCompletionV1>(),
  );
  const answeredUiByInteractionRef = useRef(
    new Map<string, LearningV2AnsweredUiSnapshotV1>(),
  );
  // зачем (аудит анимаций 22.08): спека разрешает только точечный
  // `wrong_option_nudge` самого неверного варианта, а не тряску всей зоны
  // ответов. Счётчик растёт на каждой ошибке; вариант с этим responseId
  // толкает сам себя, остальные не шевелятся.
  const [wrongNudge, setWrongNudge] = useState<{
    responseId: string | null;
    token: number;
  }>({ responseId: null, token: 0 });
  const [audioRequest, setAudioRequest] = useState<Readonly<{
    fileUri: string;
    requestId: number;
  }> | null>(null);
  const audioRequestIdRef = useRef(0);
  const [localAudioPlayback, setLocalAudioPlayback] = useState<Readonly<{
    requestId: number;
    state: Exclude<LearningV2ReferenceAudioStateV1, "unavailable">;
  }> | null>(null);
  const { speak: speakPreviewAudio, stop: stopPreviewAudio } = useAudio();
  const [previewSpeechKey, setPreviewSpeechKey] = useState<string | null>(null);
  const previewSpeechWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewSpeechGuardRef = useRef(
    createLearningV2PreviewSpeechGenerationGuardV1(),
  );
  // зачем (owner: "переключение сессий тормозит"): useAudioPlayerStatus
  // подписан на нативное событие playbackStatusUpdate, которое по дефолту
  // (updateInterval=500мс) тикает КАЖДЫЕ 500мс, пока идёт воспроизведение —
  // а автовоспроизведение эталонного произношения запускается почти на
  // каждой карточке. Каждый тик даёт setState в этом компоненте на 3200+
  // строк без единого React.memo внутри, то есть перерисовывает ВЕСЬ экран
  // (шапку, прогресс-бар, счётчик рун, активную карточку режима) 2 раза в
  // секунду поверх анимации входа/выхода карточки — это и есть источник
  // "подтормаживает". Ниже по файлу из audioStatus читаются только
  // isLoaded/playing/didJustFinish (см. использования audioStatus.*) —
  // currentTime/duration нигде не нужны, поэтому периодический тик не несёт
  // полезных данных. Поднимаем updateInterval до значения, недостижимого
  // за время одной фразы: событийные апдейты (onIsPlayingChanged,
  // onIsLoadingChanged, didJustFinish) по-прежнему приходят мгновенно из
  // нативных слушателей — они не зависят от таймера и не проседают.
  //
  // зачем (owner: "озвучка глохнет через 25-30 слов", 2026-08-28): раньше
  // источник useAudioPlayer менялся на каждое слово (audioRequest в deps),
  // и expo-audio пересоздавал нативный ExoPlayer на КАЖДОЕ слово —
  // node_modules/expo-audio/android AudioPlayer.kt sharedObjectDidRelease()
  // освобождает старый ExoPlayer АСИНХРОННО (mainQueue.launch, следующий
  // тик) и ref.release() там последним шагом: если что-то в цепочке кинет
  // исключение раньше, нативный декодер утекает навсегда. За ~25-30 слов
  // копится ровно столько утечек decoder-слотов, сколько нужно, чтобы
  // упереться в системный лимит Android — дальше звук глохнет до рестарта
  // приложения. Источник плеера теперь СТАБИЛЕН (null, создаётся один раз
  // за сессию) — сам ExoPlayer живёт весь урок, а переключение слова идёт
  // через player.replace() (тот же нативный объект, просто новый трек).
  const audioPlayer = useAudioPlayer(null, {
    downloadFirst: false,
    updateInterval: 60_000,
  });
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  useEffect(() => {
    if (!audioRequest) return;
    try {
      audioPlayer.replace({ uri: audioRequest.fileUri });
    } catch (e) {
      // Player already released on unmount; playFromStart below will no-op.
      DebugLogger.error('learning_v2_direct_session_player_v1:audioStatus', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }, [audioRequest, audioPlayer]);
  const managedAudio = useManagedSpokenAudioPlayer(
    audioPlayer,
    audioStatus.didJustFinish,
  );

  const playLocalAudio = useCallback(
    (fileUri: string | null | undefined) => {
      if (!fileUri) return;
      stopPreviewAudio();
      previewSpeechGuardRef.current.cancelCurrent();
      if (previewSpeechWatchdogRef.current !== null) {
        clearTimeout(previewSpeechWatchdogRef.current);
        previewSpeechWatchdogRef.current = null;
      }
      setPreviewSpeechKey(null);
      const requestId = audioRequestIdRef.current + 1;
      audioRequestIdRef.current = requestId;
      setLocalAudioPlayback({ requestId, state: "loading" });
      setAudioRequest({ fileUri, requestId });
    },
    [stopPreviewAudio],
  );

  const speakPreviewText = useCallback(
    (text: string | null | undefined, key: string, rate?: number) => {
      const normalized = text?.trim();
      if (!isAuthoringPreview || !normalized) return;
      managedAudio.stop();
      setAudioRequest(null);
      setLocalAudioPlayback(null);
      if (previewSpeechWatchdogRef.current !== null) {
        clearTimeout(previewSpeechWatchdogRef.current);
        previewSpeechWatchdogRef.current = null;
      }
      const request = previewSpeechGuardRef.current.begin(key);
      const clear = () => {
        if (!previewSpeechGuardRef.current.clear(request)) return;
        if (previewSpeechWatchdogRef.current !== null) {
          clearTimeout(previewSpeechWatchdogRef.current);
          previewSpeechWatchdogRef.current = null;
        }
        setPreviewSpeechKey((current) => (current === key ? null : current));
      };
      // Set the visible state before asking the global speech service to play.
      // Some system modals revoke audio focus without delivering onStopped;
      // this bounded watchdog always restores a tappable replay state.
      setPreviewSpeechKey(key);
      previewSpeechWatchdogRef.current = setTimeout(
        clear,
        learningV2PreviewSpeechWatchdogMsV1(normalized),
      );
      speakPreviewAudio(normalized, rate, {
        language: "en-US",
        onStart: () => {
          if (previewSpeechGuardRef.current.currentKey() === key) {
            setPreviewSpeechKey(key);
          }
        },
        onDone: clear,
        onStopped: clear,
        onError: clear,
      });
    },
    [isAuthoringPreview, managedAudio, speakPreviewAudio],
  );

  useEffect(
    () => () => {
      previewSpeechGuardRef.current.cancelCurrent();
      if (previewSpeechWatchdogRef.current !== null) {
        clearTimeout(previewSpeechWatchdogRef.current);
        previewSpeechWatchdogRef.current = null;
      }
    },
    [],
  );

  const stopAttemptMediaBeforeRecovery = useCallback(() => {
    voiceCancelRef.current();
    managedAudio.stop();
    stopPreviewAudio();
    previewSpeechGuardRef.current.cancelCurrent();
    if (previewSpeechWatchdogRef.current !== null) {
      clearTimeout(previewSpeechWatchdogRef.current);
      previewSpeechWatchdogRef.current = null;
    }
    setPreviewSpeechKey(null);
    setAudioRequest(null);
    setLocalAudioPlayback(null);
  }, [managedAudio, stopPreviewAudio]);

  useEffect(
    () => () => {
      if (attemptsModalTimerRef.current !== null) {
        clearTimeout(attemptsModalTimerRef.current);
        attemptsModalTimerRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    // The request can switch the hook player to another preloaded local URI.
    // Waiting for isLoaded prevents a one-shot seekTo(0) failure that otherwise
    // leaves the button visually active but silent until the next screen.
    if (!audioRequest || !audioStatus.isLoaded) return;
    let cancelled = false;
    void managedAudio.playFromStart().then((started) => {
      if (cancelled || started) return;
      setLocalAudioPlayback((current) =>
        current?.requestId === audioRequest.requestId
          ? { ...current, state: "error" }
          : current,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [audioRequest, audioStatus.isLoaded, managedAudio]);

  useEffect(() => {
    if (!audioRequest) return;
    setLocalAudioPlayback((current) => {
      if (!current || current.requestId !== audioRequest.requestId) return current;
      if (audioStatus.playing) return { ...current, state: "playing" };
      if (audioStatus.didJustFinish) return { ...current, state: "idle" };
      return current;
    });
  }, [audioRequest, audioStatus.didJustFinish, audioStatus.playing]);

  useEffect(() => {
    if (!locator) return;
    let cancelled = false;
    setLoadFailed(false);
    setReadyHandle(null);
    setMaterial(null);
    if (isAuthoringPreview) {
      try {
        setMaterial(
          isDevUnlockedDraftPreview
            ? buildLearningV2DevUnlockedDraftDevicePreviewV1(
                locator.sessionOrdinal,
                lang,
              )
            : buildLearningV2AuthoringDevicePreviewV1(
                locator.sessionOrdinal,
                lang,
              ),
        );
      } catch (error: unknown) {
        setLoadFailed(true);
        setLoadFailureReason(
          error instanceof Error ? error.message : String(error),
        );
      }
      return;
    }
    const requestedRunId = sessionRunIdRef.current;
    void prepareCurrentLearningV2CourseSessionV3({
      locator,
      sessionRunId: requestedRunId,
    })
      .then((handle) => {
        const ready = resolveLearningV2CourseSessionReadyMaterialV3(handle);
        if (!cancelled && sessionRunIdRef.current === requestedRunId) {
          setMaterial(ready.result.material);
          setReadyHandle(handle);
        }
      })
      .catch((error: unknown) => {
        // зачем: раньше причина падения выбрасывалась целиком, экран показывал
        // только «Сессия недоступна», и понять, что сломалось — сеть, релиз или
        // аудио — было нельзя ни владельцу, ни разработчику. Диагностику
        // показываем только в дев-сборке: боевому пользователю имя ошибки
        // ничего не говорит и только пугает.
        if (cancelled) return;
        setLoadFailed(true);
        if (__DEV__)
          setLoadFailureReason(
            error instanceof Error ? error.message : String(error),
          );
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthoringPreview, isDevUnlockedDraftPreview, lang, loadRevision, locator]);

  const audioPreload: LearningV2CourseSessionAudioPreloadHandleV1 | null =
    readyHandle
      ? resolveLearningV2CourseSessionReadyMaterialV3(readyHandle).audio
      : null;
  const activeAudioPreload = isAuthoringPreview ? null : audioPreload;

  const run = useMemo(
    () => (locator && material ? runFrom(locator, material) : null),
    [locator, material],
  );
  const runSummary = run
    ? getLearningV2CourseSessionDeviceRunSummaryV1(run)
    : null;
  const unlockedTargetLanguage = runSummary?.targetLanguage ?? null;
  const unlockedLessonOrdinal = runSummary?.lessonOrdinal ?? null;
  const unlockedWordScope = useMemo(
    () =>
      unlockedTargetLanguage && unlockedLessonOrdinal
        ? {
            targetLanguage: unlockedTargetLanguage,
            lessonOrdinal: unlockedLessonOrdinal,
          }
        : null,
    [unlockedLessonOrdinal, unlockedTargetLanguage],
  );
  const {
    words: unlockedWords,
    hydrated: unlockedWordsHydrated,
  } = useLearningV2UnlockedLessonWordsV1(unlockedWordScope, {
    includeAuthoringPreview: isAuthoringPreview,
  });
  const unlockedWordIds = useMemo(
    () => new Set(unlockedWords.map((word) => word.lexicalItemId)),
    [unlockedWords],
  );
  const previousUnlockedWordCountRef = useRef(0);
  useEffect(() => {
    if (
      unlockedWords.length <= 0 ||
      unlockedWords.length === previousUnlockedWordCountRef.current
    )
      return;
    previousUnlockedWordCountRef.current = unlockedWords.length;
    if (reducedMotion) return;
    wordPocketBump.value = withSequence(
      withTiming(1.22, { duration: 110 }),
      withTiming(1, { duration: 180 }),
    );
  }, [reducedMotion, unlockedWords.length, wordPocketBump]);
  const introScreens = useMemo(
    () => (run ? adaptLearningV2DirectSessionIntroV1(run) : null),
    [run],
  );
  const introIds = useMemo(
    () =>
      material
        ? (material.introChild.pages.map(
            (page) => page.question.interactionId,
          ) as [string, string, string])
        : null,
    [material],
  );
  const newWordEncounters = useMemo(
    () => (run ? getLearningV2CourseSessionNewWordEncountersV1(run) : []),
    [run],
  );
  const newWordEncounterIds = useMemo(
    () => newWordEncounters.map((encounter) => encounter.lexicalItemId),
    [newWordEncounters],
  );
  const newWordSpeechByLexicalItemId = useMemo(
    () =>
      Object.freeze(
        Object.fromEntries(
          newWordEncounters.map((encounter) => [
            encounter.lexicalItemId,
            encounter.save.targetText,
          ]),
        ),
      ) as Readonly<Record<string, string>>,
    [newWordEncounters],
  );
  const newWordAudioByLexicalItemId = useMemo(() => {
    const audioById: Record<string, string | null> = {};
    if (!run || !runSummary || !activeAudioPreload) return audioById;
    for (
      let index = 0;
      index < runSummary.practiceInteractionCount;
      index += 1
    ) {
      const interaction = getLearningV2CourseSessionPracticeInteractionV1(
        run,
        index,
      );
      const encounter = getLearningV2CourseSessionAuxiliaryEntryV1(
        run,
        interaction.interactionId,
      ).newWordEncounter;
      if (!encounter) continue;
      try {
        audioById[encounter.lexicalItemId] =
          resolveLearningV2CourseSessionFullPhraseAudioV1({
            handle: activeAudioPreload,
            interactionId: interaction.interactionId,
          })?.fileUri ?? null;
      } catch {
        audioById[encounter.lexicalItemId] = null;
      }
    }
    return Object.freeze(audioById);
  }, [activeAudioPreload, run, runSummary]);

  useEffect(() => {
    const next = createLearningV2InterleavedNewWordFlowV1();
    newWordFlowRef.current = next;
    setNewWordFlow(next);
    setNewWordSaveStates({});
    setWordPocketOpen(false);
  }, [newWordEncounterIds]);

  const dispatchNewWordEvent = useCallback(
    (event: LearningV2InterleavedNewWordFlowEventV1) => {
      const transition = reduceLearningV2InterleavedNewWordFlowV1(
        newWordFlowRef.current,
        event,
      );
      newWordFlowRef.current = transition.state;
      setNewWordFlow(transition.state);
      transition.effects.forEach((effect) => {
        if (effect === "stop_current_audio") {
          managedAudio.stop();
          setAudioRequest(null);
          return;
        }
        if (effect === "play_practice_audio_after_continue") {
          setPracticeAudioAutoplayToken((value) => value + 1);
          return;
        }
        if (effect !== "play_current_audio") return;
        if (transition.state.kind !== "presenting") return;
        const encounterId = transition.state.encounterId;
        const fileUri = newWordAudioByLexicalItemId[encounterId] ?? null;
        if (fileUri) playLocalAudio(fileUri);
        else
          speakPreviewText(
            newWordSpeechByLexicalItemId[encounterId],
            `new-word:${encounterId}`,
          );
      });
    },
    [
      managedAudio,
      newWordAudioByLexicalItemId,
      newWordSpeechByLexicalItemId,
      playLocalAudio,
      speakPreviewText,
    ],
  );

  const currentNewWordEncounter =
    newWordFlow.kind === "presenting"
      ? (newWordEncounters.find(
          (encounter) =>
            encounter.lexicalItemId === newWordFlow.encounterId,
        ) ?? null)
      : null;
  const currentNewWordAudioUri = currentNewWordEncounter
    ? (newWordAudioByLexicalItemId[currentNewWordEncounter.lexicalItemId] ??
      null)
    : null;
  const currentNewWordAudioState: LearningV2NewWordAudioStateV1 =
    !currentNewWordAudioUri && !isAuthoringPreview
      ? "unavailable"
      : currentNewWordEncounter &&
          previewSpeechKey ===
            `new-word:${currentNewWordEncounter.lexicalItemId}`
        ? "playing"
      : audioRequest?.fileUri === currentNewWordAudioUri && audioStatus.playing
        ? "playing"
        : "idle";
  const markCurrentNewWordPresented = useCallback(async () => {
    if (!currentNewWordEncounter || !runSummary) return;
    const unlocked: LearningV2UnlockedLessonWordV1 = {
      targetLanguage: runSummary.targetLanguage,
      lessonOrdinal: runSummary.lessonOrdinal,
      lexicalItemId: currentNewWordEncounter.lexicalItemId,
      sourceSessionOrdinal: runSummary.sessionOrdinal,
      firstEncounteredAt: new Date().toISOString(),
      encounter: currentNewWordEncounter,
    };
    if (isAuthoringPreview) {
      await markLearningV2AuthoringPreviewWordUnlockedV1(unlocked);
      return;
    }
    await markLearningV2LessonWordUnlockedV1(unlocked);
  }, [currentNewWordEncounter, isAuthoringPreview, runSummary]);
  const presentedUnlockStartedRef = useRef(new Set<string>());
  useEffect(() => {
    if (!currentNewWordEncounter || newWordFlow.kind !== "presenting") return;
    const lexicalItemId = currentNewWordEncounter.lexicalItemId;
    if (presentedUnlockStartedRef.current.has(lexicalItemId)) return;
    presentedUnlockStartedRef.current.add(lexicalItemId);
    void markCurrentNewWordPresented().catch(() => {
      presentedUnlockStartedRef.current.delete(lexicalItemId);
    });
  }, [currentNewWordEncounter, markCurrentNewWordPresented, newWordFlow.kind]);
  useEffect(() => {
    if (!currentNewWordEncounter) return;
    const lexicalItemId = currentNewWordEncounter.lexicalItemId;
    let cancelled = false;
    void isLearningV2NewWordEncounterSavedV1(currentNewWordEncounter).then(
      (saved) => {
        if (cancelled) return;
        setNewWordSaveStates((current) => ({
          ...current,
          [lexicalItemId]: saved ? "saved" : "not_saved",
        }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [currentNewWordEncounter]);

  const toggleCurrentNewWordSave = useCallback(async () => {
    if (!currentNewWordEncounter) return;
    const lexicalItemId = currentNewWordEncounter.lexicalItemId;
    if (newWordSaveBusyRef.current.has(lexicalItemId)) return;
    const currentState = newWordSaveStates[lexicalItemId] ?? "not_saved";
    if (currentState === "saving") return;
    newWordSaveBusyRef.current.add(lexicalItemId);
    void hapticTap();
    setNewWordSaveStates((current) => ({
      ...current,
      [lexicalItemId]: "saving",
    }));
    try {
      if (isAuthoringPreview) {
        setNewWordSaveStates((current) => ({
          ...current,
          [lexicalItemId]: currentState === "saved" ? "not_saved" : "saved",
        }));
        return;
      }
      if (currentState === "saved") {
        const outcome = await removeLearningV2NewWordEncounterFromCardsV1({
          encounter: currentNewWordEncounter,
        });
        setNewWordSaveStates((current) => ({
          ...current,
          [lexicalItemId]:
            outcome === "removed" || outcome === "absent" ? "not_saved" : "saved",
        }));
        return;
      }
      const outcome = await saveLearningV2NewWordEncounterToCardsV1({
        encounter: currentNewWordEncounter,
        interfaceLocale: lang,
      });
      setNewWordSaveStates((current) => ({
        ...current,
        [lexicalItemId]:
          outcome === "added" || outcome === "duplicate"
            ? "saved"
            : "save_failed",
      }));
    } catch {
      setNewWordSaveStates((current) => ({
        ...current,
        [lexicalItemId]: "save_failed",
      }));
    } finally {
      newWordSaveBusyRef.current.delete(lexicalItemId);
    }
  }, [currentNewWordEncounter, isAuthoringPreview, lang, newWordSaveStates]);
  const practice =
    run && runSummary && practiceIndex < runSummary.practiceInteractionCount
      ? getLearningV2CourseSessionPracticeInteractionV1(run, practiceIndex)
      : null;
  const auxiliary =
    run && practice
      ? getLearningV2CourseSessionAuxiliaryEntryV1(run, practice.interactionId)
      : null;
  const showVoiceFooter = practice
    ? learningV2ShowsVoiceFooterV1(practice)
    : false;
  const footerBackLabel = triLang(lang, {
    ru: "Назад", uk: "Назад", en: "Back", es: "Atrás",
    "pt-BR": "Voltar", vi: "Xem lại", id: "Kembali", tr: "Geri", pl: "Wstecz",
  });
  const footerVoiceLabel = triLang(lang, {
    ru: "Устно", uk: "Усно", en: "Speak", es: "Hablar",
    "pt-BR": "Falar", vi: "Nói", id: "Ucap", tr: "Sesli", pl: "Mów",
  });
  const footerWordsLabel = triLang(lang, {
    ru: "Слова", uk: "Слова", en: "Words", es: "Palabras",
    "pt-BR": "Palavras", vi: "Từ", id: "Kata", tr: "Kelimeler", pl: "Słowa",
  });
  const displayedResponseOptions = useMemo(
    () =>
      practice
        ? stableShuffleLearningV2OptionsV1(
            practice.interactionId,
            practice.responseOptions,
          )
        : [],
    [practice],
  );
  const practiceEncounterId =
    auxiliary?.newWordEncounter?.lexicalItemId ?? null;
  const practiceActivated = introDone && newWordFlow.kind !== "presenting";
  const voiceFooterDisabled =
    !practiceActivated ||
    auxiliary?.voice.available !== true ||
    result === "correct" ||
    sessionAttempts.state.phase !== "active";

  useEffect(() => {
    if (!practice?.interactionId) return;
    sessionAttempts.updateQuestion(practice.interactionId);
  }, [practice?.interactionId, sessionAttempts.updateQuestion]);

  // The blocking word card must win the first paint. A passive effect lets the
  // practice screen begin its entrance underneath the card; a layout effect
  // resolves the encounter before the frame is committed.
  useLayoutEffect(() => {
    if (!introDone || !practice) return;
    if (!unlockedWordsHydrated) return;
    dispatchNewWordEvent({
      kind: "practice_reached",
      encounterId:
        practiceEncounterId && unlockedWordIds.has(practiceEncounterId)
          ? null
          : practiceEncounterId,
    });
  }, [
    dispatchNewWordEvent,
    introDone,
    practice,
    practiceEncounterId,
    unlockedWordIds,
    unlockedWordsHydrated,
  ]);
  // зачем (SB-14): на проверке главы разбора после ошибки нет — он был бы
  // подсказкой. Человек видит итог в конце, а не по ходу.
  const wrongExplanation =
    !isCheckpoint && wrongCount >= 2 && auxiliary
      ? ((lastWrongResponseId
          ? auxiliary.responseFeedbackById?.[lastWrongResponseId]?.[lang]
          : null) ?? auxiliary.secondErrorExplanationByLocale[lang])
      : null;
  const progressOrdinal = introDone ? practiceIndex + 4 : 1;
  const totalInteractions = runSummary?.interactionCount ?? 10;
  const fullPhraseAudio = useMemo(() => {
    if (!activeAudioPreload || !practice) return null;
    try {
      return resolveLearningV2CourseSessionFullPhraseAudioV1({
        handle: activeAudioPreload,
        interactionId: practice.interactionId,
      });
    } catch {
      return null;
    }
  }, [activeAudioPreload, practice]);
  const previewPracticeSpeechText = useMemo(
    () =>
      isAuthoringPreview && practice
        ? resolveLearningV2AuthoringPreviewSpeechTextV1(practice)
        : null,
    [isAuthoringPreview, practice],
  );
  const previewPracticeSlowSpeechText = useMemo(() => {
    if (!isAuthoringPreview || !practice?.modePayload) return null;
    const payload = practice.modePayload;
    if (
      payload.family !== "listen_choose" &&
      payload.family !== "listen_build_dictation" &&
      payload.family !== "scripted_repeat_compare"
    )
      return null;
    return payload.slowReferenceAudio?.transcript.trim() || null;
  }, [isAuthoringPreview, practice]);
  const practiceReferenceAvailable =
    fullPhraseAudio !== null || previewPracticeSpeechText !== null;
  const practiceSlowReferenceAvailable =
    previewPracticeSlowSpeechText !== null;
  const practiceReferenceKey = practice
    ? `practice:${practice.interactionId}`
    : null;
  const referenceAudioState: LearningV2ReferenceAudioStateV1 =
    !practiceReferenceAvailable
      ? "unavailable"
      : fullPhraseAudio
        ? audioRequest?.fileUri === fullPhraseAudio.fileUri &&
          localAudioPlayback?.requestId === audioRequest.requestId
          ? localAudioPlayback.state
          : "idle"
        : practiceReferenceKey && previewSpeechKey === practiceReferenceKey
          ? "playing"
          : "idle";
  const playPracticeReferenceAudio = useCallback(() => {
    voiceCancelRef.current();
    if (fullPhraseAudio) {
      playLocalAudio(fullPhraseAudio.fileUri);
      return;
    }
    if (practice)
      speakPreviewText(
        previewPracticeSpeechText,
        `practice:${practice.interactionId}`,
      );
  }, [
    fullPhraseAudio,
    playLocalAudio,
    practice,
    previewPracticeSpeechText,
    speakPreviewText,
  ]);
  useEffect(() => {
    if (
      practiceAudioAutoplayToken <= 0 ||
      !practiceActivated ||
      !practiceReferenceAvailable
    )
      return;
    playPracticeReferenceAudio();
  }, [
    playPracticeReferenceAudio,
    practiceActivated,
    practiceAudioAutoplayToken,
    practiceReferenceAvailable,
  ]);
  const playPracticeSlowReferenceAudio = useCallback(() => {
    voiceCancelRef.current();
    if (!practice) return;
    speakPreviewText(
      previewPracticeSlowSpeechText,
      `practice:${practice.interactionId}:slow`,
      0.72,
    );
  }, [practice, previewPracticeSlowSpeechText, speakPreviewText]);

  const playSelectableAudio = useCallback(
    (selectableId: string) => {
      if (!practice) return;
      if (
        isAuthoringPreview &&
        practice.modePayload?.family === "sound_contrast"
      ) {
        const optionIndex = practice.modePayload.choiceFeedback.findIndex(
          (entry) => entry.responseId === selectableId,
        );
        const speechText =
          optionIndex === 0
            ? practice.modePayload.contrastA
            : optionIndex === 1
              ? practice.modePayload.contrastB
              : null;
        speakPreviewText(
          speechText,
          `practice:${practice.interactionId}:${selectableId}`,
        );
        return;
      }
      if (!activeAudioPreload) return;
      try {
        playLocalAudio(
          resolveLearningV2CourseSessionSelectableAudioV1({
            handle: activeAudioPreload,
            interactionId: practice.interactionId,
            selectableId,
          })?.fileUri,
        );
      } catch (e) {
      // The visible learner text remains usable if account-scoped audio was // invalidated during an account transition.
      DebugLogger.error('learning_v2_direct_session_player_v1:speechText', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    },
    [
      activeAudioPreload,
      isAuthoringPreview,
      playLocalAudio,
      practice,
      speakPreviewText,
    ],
  );

  const resetInteraction = useCallback(() => {
    managedAudio.stop();
    stopPreviewAudio();
    setPreviewSpeechKey(null);
    setAudioRequest(null);
    setResult("idle");
    setAttempts(1);
    setWrongCount(0);
    setLastWrongResponseId(null);
    setHintUsed(false);
    setSelectedChoiceId(null);
    setOrderedIds([]);
    setTranscript("");
    voiceCancelRef.current();
  }, [managedAudio, stopPreviewAudio]);

  const restartInterruptedRun = useCallback(() => {
    managedAudio.stop();
    setAudioRequest(null);
    completionsRef.current.clear();
    answeredUiByInteractionRef.current.clear();
    sessionRunIdRef.current = Crypto.randomUUID();
    sessionStartedAtRef.current = null;
    sessionStageRef.current = "intro";
    telemetryStartSentRef.current = false;
    interruptedWhileBackgroundedRef.current = false;
    finishingRef.current = false;
    setReadyHandle(null);
    setMaterial(null);
    setIntroDone(false);
    setPracticeIndex(0);
    runeAwardLedgerRef.current.reset();
    setSessionRunes(0);
    setRuneFlight(null);
    resetInteraction();
    setLoadRevision((value) => value + 1);
  }, [managedAudio, resetInteraction]);

  useEffect(() => {
    if (
      isAuthoringPreview ||
      telemetryStartSentRef.current ||
      !runSummary ||
      !lessonOrdinal ||
      !sessionOrdinal
    )
      return;
    telemetryStartSentRef.current = true;
    sessionStartedAtRef.current = Date.now();
    trackLearningV2Telemetry(
      learningV2SessionStartEvent({
        lessonOrdinal,
        sessionOrdinal,
        sessionKind: telemetrySessionKind(sessionOrdinal),
        studyTarget,
      }),
    );
  }, [isAuthoringPreview, lessonOrdinal, runSummary, sessionOrdinal, studyTarget]);

  // Незавершённое занятие при уходе с экрана — главный сигнал обрыва.
  useEffect(
    () => () => {
      if (
        isAuthoringPreview ||
        finishingRef.current ||
        !telemetryStartSentRef.current
      )
        return;
      if (!lessonOrdinal || !sessionOrdinal) return;
      trackLearningV2Telemetry(
        learningV2SessionAbandonEvent({
          lessonOrdinal,
          sessionOrdinal,
          sessionKind: telemetrySessionKind(sessionOrdinal),
          studyTarget,
          durationMs: Date.now() - (sessionStartedAtRef.current ?? Date.now()),
          stage: sessionStageRef.current,
        }),
      );
    },
    [isAuthoringPreview, lessonOrdinal, sessionOrdinal, studyTarget],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      // A Learning V2 run is deliberately not resumable after a real app
      // interruption. A transient `inactive` state alone is not enough: iOS
      // uses it for the microphone permission sheet, and that sheet must not
      // destroy the first hold-to-talk attempt. Closing the screen unmounts it;
      // entering background invalidates the partial run explicitly.
      if (nextState === "background" && !finishingRef.current) {
        interruptedWhileBackgroundedRef.current = true;
        return;
      }
      if (
        nextState === "active" &&
        interruptedWhileBackgroundedRef.current &&
        !finishingRef.current
      ) {
        interruptedWhileBackgroundedRef.current = false;
        restartInterruptedRun();
      }
    });
    return () => subscription.remove();
  }, [restartInterruptedRun]);

  const settleSessionRuneAward = useCallback((count: 1 | 2 | 3) => {
    setSessionRunes((value) => value + count);
    if (reducedMotion) return;
    runeBump.value = withSequence(
      withTiming(1.28, { duration: 140 }),
      withTiming(1, { duration: 220 }),
    );
  }, [reducedMotion, runeBump]);

  const awardSessionRunes = useCallback((count: 1 | 2 | 3) => {
    // Score state settles immediately. The flight is decorative and may never
    // hold up Continue or lose an award when a fast learner advances early.
    settleSessionRuneAward(count);
    if (reducedMotion) {
      return;
    }
    const origin = runeAwardOriginRef.current;
    const counter = runeCounterRef.current;
    if (!origin || !counter) {
      return;
    }
    origin.measureInWindow((fromX, fromY, fromWidth, fromHeight) => {
      counter.measureInWindow((toX, toY, toWidth, toHeight) => {
        setRuneFlight({
          key: Date.now(),
          count,
          from: { x: fromX + fromWidth / 2, y: fromY + fromHeight / 2 },
          to: { x: toX + toWidth / 2, y: toY + toHeight / 2 },
        });
      });
    });
  }, [reducedMotion, settleSessionRuneAward]);

  const evaluate = useCallback(
    (response: V2LocalEvaluatorResponseV1) => {
      if (
        !run ||
        !practice ||
        result === "correct" ||
        sessionAttempts.state.phase !== "active"
      )
        return;
      const verdict = evaluateLearningV2CourseSessionDeviceInteractionV1(
        run,
        practice.interactionId,
        response,
      );
      const answerAttemptId = [
        "learning-v2-direct",
        sessionRunIdRef.current,
        practice.interactionId,
        attemptAnswerSequenceRef.current++,
      ].join(":");
      if (verdict.resultCode === "provisional_correct") {
        sessionAttempts.registerVerdict({
          answerAttemptId,
          verdict: "correct",
        });
        completionsRef.current.set(practice.interactionId, {
          interactionId: practice.interactionId,
          disposition: "completed",
          learnerAttempts: attempts,
          hintUsed,
        });
        answeredUiByInteractionRef.current.set(practice.interactionId, {
          selectedChoiceId:
            response.kind === "choice_token"
              ? response.value
              : selectedChoiceId,
          orderedIds: [...orderedIds],
          transcript:
            response.kind === "transcript"
              ? (response.value ?? transcript)
              : transcript,
        });
        setResult("correct");
        const runeAward = learningV2InteractionRuneAwardV1({
          learnerAttempts: attempts,
          hintUsed,
        });
        // зачем !== 0 (2026-08-30): > 0 не сужает union 0|1|2|3.
        if (runeAward !== 0) {
          const claimedRuneAward = runeAwardLedgerRef.current.claim(
            practice.interactionId,
            // зачем каст (2026-08-30): значение не-const, narrowing из
            // if !== 0 не доносится до аргумента.
            runeAward as 1 | 2 | 3,
          );
          // зачем каст (2026-08-30): claim возвращает вложенные 1|2|3 или 0;
          // гвард > 0 исключает 0, тип доносим явно.
          if (claimedRuneAward > 0) awardSessionRunes(claimedRuneAward as 1 | 2 | 3);
        }
        if (!isAuthoringPreview && lessonOrdinal && sessionOrdinal)
          trackLearningV2Telemetry(
            learningV2TaskResultEvent({
              lessonOrdinal,
              sessionOrdinal,
              activityFamily: practice.family as LearningV2ActivityFamilyCode,
              outcome: "correct",
              attempts,
            }),
          );
        void hapticSuccess();
        return;
      }
      if (verdict.resultCode === "technical_invalid") {
        sessionAttempts.registerVerdict({
          answerAttemptId,
          verdict: "technical_error",
        });
        setSelectedChoiceId(null);
        setOrderedIds([]);
        setTranscript("");
        void hapticError();
        return;
      }
      const attemptEffect = sessionAttempts.registerVerdict({
        answerAttemptId,
        verdict: "pedagogical_wrong",
      });
      if (
        !isAuthoringPreview &&
        auxiliary &&
        (studyTarget === "en" || studyTarget === "fr") &&
        auxiliary.save.targetText
      ) {
        void captureCurrentAccountObjectiveAttempt({
          attemptId: `learning-v2:${sessionRunIdRef.current}:${practice.interactionId}:${attempts}`,
          studyTarget,
          verdict: "wrong",
          objective: true,
          content: {
            sourceKind: "learning_v2",
            sourceId: practice.interactionId,
            canonicalTarget: auxiliary.save.targetText,
            sourceMeaning: auxiliary.save.meaningByLocale[lang],
            lessonId: material?.lessonId,
            tokens: auxiliary.save.targetText.split(/\s+/),
            distractors: practice.responseOptions.map((option) => option.text),
          },
          facet: {
            kind:
              practice.inputMode === "ordered_tokens"
                ? "word_order"
                : practice.inputMode === "scripted_speech"
                  ? "pronunciation"
                  : practice.family === "listen_choose" ||
                      practice.family === "sound_contrast"
                    ? "listening"
                    : "form",
            expected: auxiliary.save.targetText,
          },
        }).catch(() => {});
      }
      setWrongCount((value) => value + 1);
      setLastWrongResponseId(
        practice.inputMode === "single_choice"
          ? selectedChoiceId
          : (orderedIds.find(
              (responseId) =>
                auxiliary?.responseFeedbackById?.[responseId] !== undefined,
            ) ?? null),
      );
      setAttempts((value) => Math.min(99, value + 1));
      setSelectedChoiceId(null);
      setOrderedIds([]);
      setTranscript("");
      if (!isAuthoringPreview && lessonOrdinal && sessionOrdinal)
        trackLearningV2Telemetry(
          learningV2TaskResultEvent({
            lessonOrdinal,
            sessionOrdinal,
            activityFamily: practice.family as LearningV2ActivityFamilyCode,
            outcome: "wrong",
            attempts,
          }),
        );
      void hapticError();
      if (!reducedMotion && practice.inputMode === "single_choice") {
        const wrongId = selectedChoiceId;
        if (wrongId)
          setWrongNudge((prev) => ({
            responseId: wrongId,
            token: prev.token + 1,
          }));
      }
      if (attemptEffect === "attempts_exhausted") return;
    },
    [
      attempts,
      auxiliary,
      hintUsed,
      isAuthoringPreview,
      lang,
      lessonOrdinal,
      material?.lessonId,
      orderedIds,
      practice,
      reducedMotion,
      result,
      run,
      awardSessionRunes,
      selectedChoiceId,
      sessionAttempts.registerVerdict,
      sessionAttempts.state.phase,
      sessionOrdinal,
      studyTarget,
      transcript,
    ],
  );

  const {
    status: modeVoiceStatus,
    start: startVoiceCapture,
    stop: stopVoiceCapture,
    cancel: cancelVoiceCapture,
  } = useLearningV2LocalHoldToTalkV1({
    enabled: showVoiceFooter && !voiceFooterDisabled,
    interactionId: practice?.interactionId ?? "no-practice-interaction",
    locale:
      runSummary?.targetLanguage === "en"
        ? "en-US"
        : (runSummary?.targetLanguage ?? studyTarget),
    targetText: auxiliary?.save.targetText ?? "",
    onTranscript: (value) => {
      setSelectedChoiceId(null);
      setOrderedIds([]);
      setTranscript(value);
    },
    onFinalTranscript: (heard) => {
      if (!practice || !runSummary) return;
      setSelectedChoiceId(null);
      setOrderedIds([]);
      setTranscript(heard);
      evaluate(
        learningV2CourseSessionVoiceResponseV1(
          practice,
          heard,
          runSummary.targetLanguage,
        ),
      );
    },
  });
  voiceCancelRef.current = cancelVoiceCapture;
  const voiceCaptureActive =
    modeVoiceStatus === "requesting" ||
    modeVoiceStatus === "listening" ||
    modeVoiceStatus === "finishing";
  const startVoiceHold = useCallback(() => {
    if (sessionAttempts.state.phase !== "active") return;
    stopPreviewAudio();
    managedAudio.stop();
    setAudioRequest(null);
    setPreviewSpeechKey(null);
    void hapticTap();
    void startVoiceCapture();
  }, [
    managedAudio,
    sessionAttempts.state.phase,
    startVoiceCapture,
    stopPreviewAudio,
  ]);
  const toggleVoiceFromAccessibility = useCallback(() => {
    if (voiceCaptureActive) {
      stopVoiceCapture();
      return;
    }
    startVoiceHold();
  }, [startVoiceHold, stopVoiceCapture, voiceCaptureActive]);
  const finish = useCallback(async () => {
    if (!run || finishing || !runSummary) return;
    finishingRef.current = true;
    setFinishing(true);
    try {
      const interactionCompletions = [
        ...material!.introChild.pages.map((page) =>
          completionsRef.current.get(page.question.interactionId),
        ),
        ...material!.learnerChild.interactions.map((entry) =>
          completionsRef.current.get(entry.interactionId),
        ),
      ];
      if (interactionCompletions.some((entry) => entry === undefined))
        throw new Error("learning_v2_direct_session_incomplete");
      const completion = materializeLearningV2CourseSessionCompletedSummaryV1({
        run,
        sessionRunId: sessionRunIdRef.current,
        interactionCompletions:
          interactionCompletions as LearningV2CourseSessionInteractionCompletionV1[],
      });
      const earned = learningV2SessionStars(completion.interactionCompletions);
      if (isAuthoringPreview) {
        // preview_only_no_learner_writes: the owner sees the real completion
        // scene, but no progress, stars, spool or telemetry is persisted.
        sessionStageRef.current = "finale";
        setFinaleStars(earned);
        return;
      }
      const stableId = await getStableId();
      const accountScopeHash =
        deriveLocalOfflineProgressAccountScopeHash(stableId);
      await createLearningV2CourseSessionCompletedSpoolV1(AsyncStorage).append(
        accountScopeHash,
        completion,
      );
      if (runSummary.targetLanguage === "en" &&
        runSummary.lessonOrdinal === 1 && runSummary.sessionOrdinal === 1) {
        if (!readyHandle)
          throw new Error("learning_v2_session_rune_reward_ready_evidence_missing");
        const publicationToken =
          resolveLearningV2SessionRuneRewardPublicationTokenV1(readyHandle);
        const runeReward = createLearningV2SessionRuneRewardCompositeV1({
          accountScopeHash: deriveLearningV2EconomicAccountScopeHash(stableId),
          run,
          completion,
          publicationToken: publicationToken,
        });
        // Economy commit is the completion barrier for session 1. A network
        // failure cannot roll it back because Owner Repository commits locally;
        // progress is not marked complete until the idempotent receipt exists.
        await commitLearningV2SessionRuneRewardCompositeV1({
          candidate: runeReward,
          publicationToken: publicationToken,
        });
      }
      await createLearningV2CourseLocalProgressStoreV1(AsyncStorage).complete(
        accountScopeHash,
        runSummary.courseSessionId,
      );
      // зачем (владелец, 22.08): звёзды 0–3 на пройденных узлах карты. Пишем в
      // ОТДЕЛЬНУЮ витрину, а не в канонический прогресс — тот объявляет
      // masteryAuthority: "none" и запечатан fingerprint'ом. Сбой записи здесь
      // не может помешать завершению сессии: функция глотает свои ошибки.
      await recordLearningV2SessionStarResult({
        accountScopeHash,
        courseSessionId: runSummary.courseSessionId,
        stars: earned,
      });
      // Сцена сама уводит на карту в onDone — прогресс уже сохранён, поэтому
      // выход по кнопке «назад» во время сцены ничего не теряет.
      sessionStageRef.current = "finale";
      trackLearningV2Telemetry(
        learningV2SessionCompleteEvent({
          lessonOrdinal: runSummary.lessonOrdinal,
          sessionOrdinal: runSummary.sessionOrdinal,
          sessionKind: telemetrySessionKind(runSummary.sessionOrdinal),
          studyTarget,
          durationMs: Date.now() - (sessionStartedAtRef.current ?? Date.now()),
          starsEarned: earned,
          correctCount: completion.interactionCompletions.length,
        }),
      );
      setFinaleStars(earned);
    } catch {
      finishingRef.current = false;
      setFinishing(false);
    }
  }, [
    finishing,
    isAuthoringPreview,
    material,
    readyHandle,
    run,
    runSummary,
    studyTarget,
  ]);

  const showPracticeIndex = useCallback(
    (nextIndex: number) => {
      if (!material) return;
      const bounded = Math.max(
        0,
        Math.min(nextIndex, material.learnerChild.interactions.length - 1),
      );
      const nextInteraction = material.learnerChild.interactions[bounded];
      setPracticeIndex(bounded);
      resetInteraction();
      if (
        nextInteraction &&
        completionsRef.current.has(nextInteraction.interactionId)
      ) {
        const answeredUi = answeredUiByInteractionRef.current.get(
          nextInteraction.interactionId,
        );
        if (answeredUi) {
          setSelectedChoiceId(answeredUi.selectedChoiceId);
          setOrderedIds(answeredUi.orderedIds);
          setTranscript(answeredUi.transcript);
        }
        setResult("correct");
      }
    },
    [material, resetInteraction],
  );

  const goBackOnePractice = useCallback(() => {
    if (practiceIndex <= 0) return;
    void hapticTap();
    showPracticeIndex(practiceIndex - 1);
  }, [practiceIndex, showPracticeIndex]);

  const advance = useCallback(() => {
    if (result !== "correct" || !runSummary) return;
    void hapticTap();
    if (practiceIndex + 1 >= runSummary.practiceInteractionCount) {
      void finish();
      return;
    }
    showPracticeIndex(practiceIndex + 1);
  }, [finish, practiceIndex, result, runSummary, showPracticeIndex]);

  const resetLearningV2AfterSessionRuneForfeit = useCallback(() => {
    setShowAttemptsModal(false);
    setSessionRunes(0);
  }, []);

  useSessionAttemptAutoReset({
    phase: sessionAttempts.state.phase,
    forfeitSessionRunes: () => { setSessionRunes(0); },
    restoreAttempts: sessionAttempts.restoreAfterSessionRuneForfeit,
    onRestored: resetLearningV2AfterSessionRuneForfeit,
  });

  const endExhaustedLearningV2Session = useCallback(() => {
    sessionAttempts.endAttemptsSession();
    setShowAttemptsModal(false);
    safeRouterBack(router, exitRoute);
  }, [exitRoute, router, sessionAttempts.endAttemptsSession]);

  const restartExhaustedLearningV2Session = useCallback(async () => {
    if (restartEnergyBusyRef.current) return;
    restartEnergyBusyRef.current = true;
    setRestartEnergyBusy(true);
    try {
      let energyResult: "spent" | "unlimited" = "unlimited";
      if (!isAuthoringPreview) {
        const result = await confirmSpendOne(restartEnergyIntent);
        if (result !== "spent" && result !== "unlimited") return;
        energyResult = result;
      }
      sessionAttempts.endAttemptsSession();
      setShowAttemptsModal(false);
      restartInterruptedRun();
      if (energyResult === "spent") {
        void acknowledgeSessionStart(restartEnergyIntent.operationId);
      }
      setRestartEnergyAttemptRevision((current) => current + 1);
    } finally {
      restartEnergyBusyRef.current = false;
      setRestartEnergyBusy(false);
    }
  }, [
    acknowledgeSessionStart,
    confirmSpendOne,
    isAuthoringPreview,
    restartEnergyIntent,
    restartInterruptedRun,
    sessionAttempts.endAttemptsSession,
  ]);

  if (!locator || !lessonOrdinal || !sessionOrdinal) {
    return (
      <View style={[styles.center, { backgroundColor: t.bgPrimary }]}>
        <Text style={[styles.errorText, { color: t.textPrimary }]}>
          {copy.unavailable}
        </Text>
        <Pressable
          testID="learning-v2-unavailable-back"
          accessibilityRole="button"
          accessibilityLabel={footerBackLabel}
          onPress={() => safeRouterBack(router, exitRoute)}
          style={({ pressed }) => [
            styles.retry,
            { backgroundColor: t.bgCard, opacity: pressed ? 0.72 : 1 },
          ]}
        >
          <Text style={[styles.retryText, { color: t.textPrimary }]}>
            {footerBackLabel}
          </Text>
        </Pressable>
      </View>
    );
  }
  if (finaleStars !== null && isCheckpoint) {
    // Проверка главы завершается умениями, а не оценкой: спека SB-14 прямо
    // запрещает красное «провалено» и снятие уже заработанного.
    const rows: LearningV2CheckpointSkillRow[] = [
      {
        id: "confirmed",
        label: checkpointCopy.confirmed,
        state: "confirmed" as const,
      },
      ...(finaleStars < 3
        ? [
            {
              id: "review",
              label: checkpointCopy.review,
              state: "review" as const,
            },
          ]
        : []),
    ];
    return (
      <View style={[styles.center, { backgroundColor: t.bgPrimary }]}>
        <LearningV2CheckpointSeal
          progress={1}
          ringColor={t.gold}
          trackColor={t.bgSurface2}
          faceColor={t.bgCard}
          glyphColor={t.gold}
          reduceMotion={reducedMotion}
          play
        />
        <Text style={[styles.checkpointTitle, { color: t.textPrimary }]}>
          {checkpointCopy.outcomeTitle}
        </Text>
        <View style={styles.checkpointRows}>
          <LearningV2CheckpointOutcome
            rows={rows}
            surfaceColor={t.bgSurface2}
            textColor={t.textPrimary}
            confirmedColor={t.correct}
            reviewColor={t.gold}
            reduceMotion={reducedMotion}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={checkpointCopy.done}
          onPress={() => {
            void hapticTap();
            safeRouterBack(router, exitRoute);
          }}
          style={({ pressed }) => [
            styles.checkpointCta,
            { backgroundColor: t.accent, opacity: pressed ? 0.86 : 1 },
          ]}
        >
          <Text style={[styles.checkpointCtaText, { color: t.correctText }]}>
            {checkpointCopy.done}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (finaleStars !== null) {
    // Празднование поверх пустого экрана сессии: прогресс и звёзды уже
    // записаны, сцена только показывает результат и уводит на карту.
    // зачем === 0 (2026-08-30): >= 1 не сужает литеральный union 0|1|2|3.
    const quality = finaleStars === 0 ? null : copy.quality[finaleStars as 1 | 2 | 3];
    return (
      <View style={[styles.center, { backgroundColor: t.bgPrimary }]}>
        <LearningV2SessionFinale
          stars={finaleStars}
          caption={quality ? quality.title : copy.supportFades}
          starColor={t.gold}
          mutedColor={t.textMuted}
          textColor={t.textPrimary}
          reduceMotion={reducedMotion}
          onDone={() => safeRouterBack(router, exitRoute)}
        />
      </View>
    );
  }
  if (
    (!readyHandle && !isAuthoringPreview) ||
    !run ||
    !runSummary ||
    !introScreens ||
    !introIds
  ) {
    if (!loadFailed) {
      return (
        <View style={[styles.screen, { backgroundColor: t.bgPrimary }]}>
          <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.close}
              hitSlop={10}
              onPress={() => safeRouterBack(router, exitRoute)}
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: t.bgCard, opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <Ionicons name="close" size={22} color={t.textPrimary} />
            </Pressable>
            <View style={styles.progressColumn}>
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: t.bgSurface2 },
                ]}
              />
            </View>
            <View style={styles.iconButton} />
          </View>
          <View style={styles.preparingContent}>
            <View
              accessibilityLiveRegion="polite"
              style={[styles.preparingCard, { backgroundColor: t.bgCard }]}
            >
              <ActivityIndicator color={t.accent} size="small" />
              <Text style={[styles.preparingText, { color: t.textPrimary }]}>
                {copy.preparing}
              </Text>
            </View>
            <View
              style={[
                styles.preparingLine,
                styles.preparingLineLong,
                { backgroundColor: t.bgSurface2 },
              ]}
            />
            <View
              style={[styles.preparingLine, { backgroundColor: t.bgSurface2 }]}
            />
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.center, { backgroundColor: t.bgPrimary }]}>
        <Ionicons name="cloud-offline-outline" size={34} color={t.textMuted} />
        <Text style={[styles.errorText, { color: t.textPrimary }]}>
          {copy.unavailable}
        </Text>
        {__DEV__ && loadFailureReason ? (
          <Text
            selectable
            style={[styles.devFailureReason, { color: t.textMuted }]}
          >
            {loadFailureReason}
          </Text>
        ) : null}
        <Pressable
          testID="learning-v2-unavailable-back"
          accessibilityRole="button"
          accessibilityLabel={footerBackLabel}
          onPress={() => safeRouterBack(router, exitRoute)}
          style={({ pressed }) => [
            styles.retry,
            { backgroundColor: t.bgCard, opacity: pressed ? 0.72 : 1 },
          ]}
        >
          <Text style={[styles.retryText, { color: t.textPrimary }]}>
            {footerBackLabel}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setLoadRevision((value) => value + 1)}
          style={({ pressed }) => [
            styles.retry,
            { backgroundColor: t.accent, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={[styles.retryText, { color: t.correctText }]}>
            {copy.retry}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (isCheckpoint && !checkpointEntryDone) {
    const chapter = Math.ceil((sessionOrdinal ?? 8) / 8);
    const isFinal = sessionRole === "final_exam";
    return (
      <View style={[styles.center, { backgroundColor: t.bgPrimary }]}>
        <LearningV2CheckpointSeal
          progress={1}
          ringColor={t.gold}
          trackColor={t.bgSurface2}
          faceColor={t.bgCard}
          glyphColor={t.gold}
          reduceMotion={reducedMotion}
          play
        />
        <Text style={[styles.checkpointTitle, { color: t.textPrimary }]}>
          {isFinal
            ? checkpointCopy.finalTitle
            : checkpointCopy.entryTitle(chapter)}
        </Text>
        <Text style={[styles.checkpointBody, { color: t.textMuted }]}>
          {isFinal ? checkpointCopy.finalBody : checkpointCopy.entryBody}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={checkpointCopy.start}
          onPress={() => {
            void hapticTap();
            sessionStageRef.current = "practice";
            setCheckpointEntryDone(true);
            setIntroDone(true);
          }}
          style={({ pressed }) => [
            styles.checkpointCta,
            { backgroundColor: t.accent, opacity: pressed ? 0.86 : 1 },
          ]}
        >
          <Text style={[styles.checkpointCtaText, { color: t.correctText }]}>
            {checkpointCopy.start}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!introDone) {
    return (
      <View style={[styles.screen, { backgroundColor: t.bgPrimary }]}>
        <View
          style={styles.screen}
          pointerEvents={
            sessionAttempts.state.phase === "awaiting_recovery"
              ? "none"
              : "auto"
          }
        >
          <LearningV2SessionIntro
            key={sessionRunIdRef.current}
            introScreens={introScreens}
            lessonId={lessonOrdinal}
            sessionOrdinal={sessionOrdinal}
            taskIds={introIds}
            evaluateChoice={({ interactionId, choiceText }) => {
              sessionAttempts.updateQuestion(interactionId);
              const verdict = evaluateLearningV2CourseSessionDeviceInteractionV1(
                run,
                interactionId,
                { kind: "text", value: choiceText },
              );
              const answerAttemptId = [
                "learning-v2-direct-intro",
                sessionRunIdRef.current,
                interactionId,
                attemptAnswerSequenceRef.current++,
              ].join(":");
              if (verdict.resultCode === "provisional_correct") {
                sessionAttempts.registerVerdict({
                  answerAttemptId,
                  verdict: "correct",
                });
                return "correct";
              }
              if (verdict.resultCode === "technical_invalid") {
                sessionAttempts.registerVerdict({
                  answerAttemptId,
                  verdict: "technical_error",
                });
                return "technical_invalid";
              }
              const attemptEffect = sessionAttempts.registerVerdict({
                answerAttemptId,
                verdict: "pedagogical_wrong",
              });
              if (attemptEffect === "attempts_exhausted") return "wrong";
              return "wrong";
            }}
            resolveSecondWrongExplanation={(interactionId) =>
              getLearningV2CourseSessionAuxiliaryEntryV1(run, interactionId)
                .secondErrorExplanationByLocale[lang]
            }
            onComplete={(introCompletions) => {
              introCompletions.forEach((entry) =>
                completionsRef.current.set(entry.taskId, {
                  interactionId: entry.taskId,
                  disposition: entry.disposition,
                  learnerAttempts: entry.learnerAttempts,
                  hintUsed: entry.hintUsed,
                }),
              );
              sessionStageRef.current = "practice";
              setIntroDone(true);
            }}
            onBack={() => safeRouterBack(router, exitRoute)}
            headerAccessory={
              <SessionAttemptsHud
                remaining={sessionAttempts.state.remainingAttempts}
                locale={lang}
                testID="learning-v2-intro-attempts"
              />
            }
          />
        </View>
      </View>
    );
  }

  if (!practice || !auxiliary) return null;
  const selectedText = practice.responseOptions
    .filter((entry) => orderedIds.includes(entry.responseId))
    .sort(
      (left, right) =>
        orderedIds.indexOf(left.responseId) -
        orderedIds.indexOf(right.responseId),
    )
    .map((entry) => entry.text)
    .join(" ");
  const response: V2LocalEvaluatorResponseV1 = transcript.trim()
    ? learningV2CourseSessionVoiceResponseV1(
        practice,
        transcript,
        runSummary.targetLanguage,
      )
    : practice.inputMode === "single_choice"
      ? { kind: "choice_token", value: selectedChoiceId }
      : practice.inputMode === "scripted_speech" ||
          practice.inputMode === "tap_record_compare"
        ? { kind: "transcript", value: transcript.trim() || null }
        : { kind: "text", value: selectedText || null };

  return (
    <View style={[styles.screen, { backgroundColor: t.bgPrimary }]}>
      <View
        style={styles.screen}
        pointerEvents={
          practiceActivated &&
          sessionAttempts.state.phase !== "awaiting_recovery"
            ? "auto"
            : "none"
        }
        importantForAccessibility={
          practiceActivated &&
          sessionAttempts.state.phase !== "awaiting_recovery"
            ? "auto"
            : "no-hide-descendants"
        }
      >
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.close}
            hitSlop={10}
            onPress={() => safeRouterBack(router, exitRoute)}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: t.bgCard, opacity: pressed ? 0.72 : 1 },
            ]}
          >
            <Ionicons name="close" size={22} color={t.textPrimary} />
          </Pressable>
          <View style={styles.progressColumn}>
            <View
              style={[styles.progressTrack, { backgroundColor: t.bgSurface2 }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: t.accent,
                    width: `${Math.max(4, Math.round((progressOrdinal / totalInteractions) * 100))}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: t.textMuted }]}>
              {progressOrdinal} / {totalInteractions}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <SessionAttemptsHud
              remaining={sessionAttempts.state.remainingAttempts}
              locale={lang}
              testID="learning-v2-session-attempts"
            />
            <Animated.View style={runeBumpStyle}>
              <View
                ref={runeCounterRef}
                collapsable={false}
                testID="learning-v2-session-runes"
                accessible
                accessibilityLabel={learningV2RuneAccessibilityLabelV1(lang, sessionRunes)}
                style={[styles.runeCounter, { backgroundColor: t.bgCard }]}
              >
                <Image
                  source={require("../assets/images/level-spin-rewards/stars_10.webp")}
                  style={styles.runeAsset}
                  contentFit="contain"
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <Text style={[styles.runeCounterText, { color: t.textPrimary }]}>
                  {sessionRunes}
                </Text>
              </View>
            </Animated.View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                insets.bottom + (result === "correct" || showVoiceFooter ? 148 : 36),
            },
          ]}
        >
          <View ref={runeAwardOriginRef} collapsable={false}>
          {isLearningV2ModeRoutedV1(practice.family) && practice.modePayload ? (
            // зачем: family уже имеет одобренный режим (docs/v2/mockups) —
            // рендерим его вместо старой универсальной карточки. Роутер
            // получает то же состояние/колбэки, что и старый блок ниже
            // (selectedChoiceId/orderedIds/evaluate остаются в player'е).
            <Animated.View
              key={`practice-${practiceIndex}-${practiceActivated ? "active" : "blocked"}`}
              style={practiceActivated ? undefined : styles.practiceBlocked}
              // зачем: переход к следующему заданию по каталогу активностей 04
              // (уход влево 110мс + приход справа 110мс, только transform/
              // opacity, суммарно 200-240мс) — не общий FadeInDown.
              entering={reducedMotion ? undefined : SlideInRight.duration(110)}
              exiting={reducedMotion ? undefined : SlideOutLeft.duration(110)}
            >
              <LearningV2ModeRouterV1
                family={practice.family}
                interfaceLocale={lang}
                modePayload={practice.modePayload}
                phase={
                  (result === "correct"
                    ? "success"
                    : wrongCount > 0
                      ? "needs_work"
                      : "idle") as LearningV2ModePhaseV1
                }
                prompt={practice.prompt}
                options={displayedResponseOptions}
                selectedChoiceId={selectedChoiceId}
                orderedResponseIds={orderedIds}
                wrongNudge={wrongNudge}
                reducedMotion={reducedMotion}
                resolved={result === "correct"}
                explanation={wrongExplanation}
                referenceAudioState={referenceAudioState}
                onPick={(responseId) => {
                  voiceCancelRef.current();
                  playSelectableAudio(responseId);
                  setTranscript("");
                  setSelectedChoiceId(responseId);
                  evaluate({ kind: "choice_token", value: responseId });
                }}
                onAppendToken={(responseId) => {
                  voiceCancelRef.current();
                  playSelectableAudio(responseId);
                  setTranscript("");
                  setOrderedIds((current) => [...current, responseId]);
                }}
                onUndoToken={() =>
                  setOrderedIds((current) => current.slice(0, -1))
                }
                onRemoveTokenAt={(index) =>
                  setOrderedIds((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                onPlaySelectableAudio={playSelectableAudio}
                onPlayFullPhraseAudio={
                  practiceReferenceAvailable
                    ? playPracticeReferenceAudio
                    : null
                }
                onPlaySlowPhraseAudio={
                  practiceSlowReferenceAvailable
                    ? playPracticeSlowReferenceAudio
                    : null
                }
                onModeNativeComplete={(responseId) =>
                  evaluate({ kind: "choice_token", value: responseId })
                }
                onToggleRecording={toggleVoiceFromAccessibility}
                onSubmit={() => evaluate(response)}
                canSubmit={
                  practice.inputMode === "single_choice"
                    ? selectedChoiceId !== null
                    : orderedIds.length > 0
                }
              />
            </Animated.View>
          ) : practice.family === "scripted_repeat_compare" && practice.modePayload ? (
            // зачем: голосовой режим не идёт через общий роутер (нужен
            // voiceStatus/transcript помимо общего контракта) — рендерится
            // явной веткой здесь же. Hold-to-talk жест и mic-кнопка в
            // ActionDock (ниже, вне этого блока) ОСТАЮТСЯ БЕЗ ИЗМЕНЕНИЙ —
            // этот компонент только заменяет внутреннее содержимое карточки.
            <Animated.View
              key={`practice-${practiceIndex}-${practiceActivated ? "active" : "blocked"}`}
              style={practiceActivated ? undefined : styles.practiceBlocked}
              // зачем: тот же переход B5 (каталог 04), что у остальных 6
              // режимов — не общий FadeInDown.
              entering={reducedMotion ? undefined : SlideInRight.duration(110)}
              exiting={reducedMotion ? undefined : SlideOutLeft.duration(110)}
            >
              <ScriptedRepeatCompareModeV1
                family={practice.family}
                interfaceLocale={lang}
                modePayload={practice.modePayload}
                phase={
                  (result === "correct"
                    ? "success"
                    : wrongCount > 0
                      ? "needs_work"
                      : "idle") as LearningV2ModePhaseV1
                }
                prompt={practice.prompt}
                options={displayedResponseOptions}
                selectedChoiceId={selectedChoiceId}
                orderedResponseIds={orderedIds}
                wrongNudge={wrongNudge}
                reducedMotion={reducedMotion}
                resolved={result === "correct"}
                explanation={wrongExplanation}
                referenceAudioState={referenceAudioState}
                voiceStatus={modeVoiceStatus}
                transcript={transcript}
                instruction={practice.scriptedAlternate?.instruction ?? null}
                onPick={() => {}}
                onAppendToken={() => {}}
                onUndoToken={() => {}}
                onRemoveTokenAt={() => {}}
                onPlaySelectableAudio={playSelectableAudio}
                onPlayFullPhraseAudio={
                  practiceReferenceAvailable
                    ? playPracticeReferenceAudio
                    : null
                }
                onPlaySlowPhraseAudio={
                  practiceSlowReferenceAvailable
                    ? playPracticeSlowReferenceAudio
                    : null
                }
                onModeNativeComplete={() => {}}
                onToggleRecording={() => {}}
                onSubmit={() => evaluate(response)}
                canSubmit={transcript.trim().length > 0}
              />
            </Animated.View>
          ) : (
            <>
              <View style={styles.modeRow}>
                <View style={[styles.modeIcon, { backgroundColor: t.bgSurface2 }]}>
                  <Ionicons
                    name={MODE_ICONS[practice.family]}
                    size={22}
                    color={t.accent}
                  />
                </View>
                <View style={styles.modeCopy}>
                  <Text style={[styles.modeTitle, { color: t.textPrimary }]}>
                    {copy.modes[practice.family] ?? copy.independent}
                  </Text>
                  <Text style={[styles.modeNote, { color: t.textMuted }]}>
                    {copy.supportFades}
                  </Text>
                </View>
              </View>

              {/* зачем (каталог активностей 04): переход к следующему заданию —
            уход влево 110мс + приход справа 110мс (B5), не мгновенная подмена
            и не общий FadeInDown. Ключ по индексу перезапускает вход/выход.
            Геометрия зоны не меняется — прыжка контента нет. */}
          <Animated.View
            key={`practice-${practiceIndex}-${practiceActivated ? "active" : "blocked"}`}
            style={practiceActivated ? undefined : styles.practiceBlocked}
            entering={reducedMotion ? undefined : SlideInRight.duration(110)}
            exiting={reducedMotion ? undefined : SlideOutLeft.duration(110)}
          >
            <View style={styles.promptRow}>
              <Text
                style={[
                  styles.prompt,
                  styles.promptText,
                  { color: t.textPrimary, fontSize: f.h2 },
                ]}
              >
                {practice.prompt}
              </Text>
              {fullPhraseAudio && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={copy.listenOffline}
                  accessibilityHint={copy.audioOfflineHint}
                  hitSlop={8}
                  onPress={() => {
                    voiceCancelRef.current();
                    playLocalAudio(fullPhraseAudio.fileUri);
                  }}
                  style={({ pressed }) => [
                    styles.audioButton,
                    {
                      backgroundColor: t.bgSurface2,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <Ionicons name="volume-high" size={21} color={t.accent} />
                </Pressable>
              )}
            </View>

            <Animated.View style={styles.answers}>
              {practice.inputMode === "single_choice" &&
                displayedResponseOptions.map((option) => {
                  const selected = selectedChoiceId === option.responseId;
                  return (
                    <LearningV2AnswerChoice
                      key={option.responseId}
                      label={option.text}
                      selected={selected}
                      nudgeToken={
                        wrongNudge.responseId === option.responseId
                          ? wrongNudge.token
                          : 0
                      }
                      disabled={result === "correct"}
                      reduceMotion={reducedMotion}
                      onPress={() => {
                        voiceCancelRef.current();
                        playSelectableAudio(option.responseId);
                        setTranscript("");
                        setSelectedChoiceId(option.responseId);
                        evaluate({
                          kind: "choice_token",
                          value: option.responseId,
                        });
                      }}
                      style={[
                        styles.answer,
                        {
                          // зачем: владелец запретил обводки контейнеров — верный
                          // ответ теперь виден заливкой, а не рамкой вокруг.
                          backgroundColor:
                            result === "correct" && selected
                              ? t.correctBg
                              : selected
                                ? t.bgSurface2
                                : t.bgCard,
                        },
                      ]}
                      textStyle={[styles.answerText, { color: t.textPrimary }]}
                    />
                  );
                })}

              {practice.inputMode === "ordered_tokens" && (
                <>
                  <View
                    style={[styles.assembled, { backgroundColor: t.bgCard }]}
                  >
                    <Text
                      style={[
                        styles.assembledText,
                        { color: selectedText ? t.textPrimary : t.textMuted },
                      ]}
                    >
                      {selectedText || copy.tapWords}
                    </Text>
                  </View>
                  <View style={styles.chips}>
                    {displayedResponseOptions.map((option) => {
                      const used = orderedIds.includes(option.responseId);
                      return (
                        <Pressable
                          key={option.responseId}
                          accessibilityRole="button"
                          accessibilityState={{ disabled: used }}
                          disabled={used || result === "correct"}
                          onPress={() => {
                            voiceCancelRef.current();
                            playSelectableAudio(option.responseId);
                            setTranscript("");
                            setOrderedIds((current) => [
                              ...current,
                              option.responseId,
                            ]);
                          }}
                          style={({ pressed }) => [
                            styles.chip,
                            {
                              backgroundColor: t.bgCard,
                              opacity: used ? 0.3 : pressed ? 0.72 : 1,
                            },
                          ]}
                        >
                          <Text
                            style={[styles.chipText, { color: t.textPrimary }]}
                          >
                            {option.text}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {orderedIds.length > 0 && result !== "correct" && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        setOrderedIds((current) => current.slice(0, -1))
                      }
                      style={styles.undo}
                    >
                      <Ionicons
                        name="arrow-undo"
                        size={18}
                        color={t.textMuted}
                      />
                      <Text style={[styles.undoText, { color: t.textMuted }]}>
                        Назад
                      </Text>
                    </Pressable>
                  )}
                </>
              )}

              {practice.inputMode === "scripted_speech" && (
                <View
                  style={[
                    styles.speechBox,
                    {
                      // Слушание уже читается по заливке — рамка была лишней.
                      backgroundColor:
                        modeVoiceStatus === "listening"
                          ? t.accentBg
                          : t.bgCard,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      modeVoiceStatus === "listening" ? "mic" : "mic-outline"
                    }
                    size={30}
                    color={t.accent}
                  />
                  <Text style={[styles.speechTitle, { color: t.textPrimary }]}>
                    {modeVoiceStatus === "listening"
                      ? copy.voiceSpeaking
                      : (practice.scriptedAlternate?.instruction ??
                        copy.startVoice)}
                  </Text>
                  <Text style={[styles.speechNote, { color: t.textMuted }]}>
                    {copy.repeatPrivacy}
                  </Text>
                  <View style={styles.transcriptRow}>
                    <Text style={[styles.transcript, { color: t.textPrimary }]}>
                      {transcript || "—"}
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>
          </Animated.View>

          {wrongExplanation && result !== "correct" && (
            // зачем (каталог активностей 04): панель разбора ошибки обязана
            // въезжать opacity + translateY 8 за 180-220мс, а не возникать
            // мгновенно. reduce motion оставляет финальный кадр.
            <Animated.View
              accessibilityLiveRegion="polite"
              entering={
                reducedMotion
                  ? undefined
                  : FadeInDown.duration(200).easing(
                      Easing.bezier(0.23, 1, 0.32, 1).factory(),
                    )
              }
              style={[styles.explanation, { backgroundColor: t.bgSurface2 }]}
            >
              <Ionicons name="bulb-outline" size={20} color={t.accent} />
              <Text style={[styles.explanationText, { color: t.textPrimary }]}>
                {wrongExplanation}
              </Text>
            </Animated.View>
          )}
            </>
          )}
          </View>

          {transcript &&
            practice.inputMode !== "scripted_speech" &&
            practice.inputMode !== "tap_record_compare" && (
            <View
              accessibilityLiveRegion="polite"
              style={[
                styles.voiceTranscript,
                { backgroundColor: t.bgSurface2 },
              ]}
            >
              <Ionicons name="mic" size={18} color={t.accent} />
              <Text
                style={[styles.voiceTranscriptText, { color: t.textPrimary }]}
              >
                {transcript}
              </Text>
            </View>
          )}

          {modeVoiceStatus === "permission_denied" && (
            <Text style={[styles.voiceStatus, { color: t.textMuted }]}>
              {copy.voicePermission}
            </Text>
          )}
          {modeVoiceStatus === "local_recognition_unavailable" && (
            <Text style={[styles.voiceStatus, { color: t.textMuted }]}>
              {copy.voiceUnavailable}
            </Text>
          )}
          {modeVoiceStatus === "error" && (
            <Text style={[styles.voiceStatus, { color: t.textMuted }]}>
              {copy.voiceFailed}
            </Text>
          )}
        </ScrollView>

        <View style={[styles.reportDock, { bottom: insets.bottom + 84 }]}>
          <ReportErrorButton
            screen="learning_v2_session"
            dataId={`${runSummary.courseSessionId}:${practice.interactionId}`}
            dataText={practice.prompt}
            userAnswer={
              practice.inputMode === "single_choice" || practice.inputMode === "pair_grid"
                ? practice.responseOptions.find(
                    (entry) => entry.responseId === selectedChoiceId,
                  )?.text
                : practice.inputMode === "scripted_speech" || practice.inputMode === "tap_record_compare"
                  ? transcript
                  : selectedText
            }
            variant="icon-flag"
            accessibilityLabel={copy.reportTask}
          />
        </View>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + 14,
              backgroundColor: t.bgPrimary,
              borderTopColor: t.border,
            },
          ]}
        >
          <View style={styles.footerControls}>
            <Pressable
              testID="learning-v2-footer-back"
              accessibilityRole="button"
              accessibilityLabel={footerBackLabel}
              disabled={practiceIndex <= 0}
              onPress={() => {
                void hapticTap();
                goBackOnePractice();
              }}
              style={({ pressed }) => [
                styles.footerAction,
                { opacity: practiceIndex <= 0 ? 0.3 : pressed ? 0.62 : 1 },
              ]}
            >
              <Ionicons name="arrow-undo-outline" size={26} color={t.textSecond} />
              <Text style={[styles.footerActionLabel, { color: t.textMuted, fontSize: f.label }]}>
                {footerBackLabel}
              </Text>
            </Pressable>

            {showVoiceFooter ? (
              <Pressable
                  testID="learning-v2-footer-hold-to-talk"
                  accessibilityRole="button"
                  accessibilityLabel={
                    voiceCaptureActive ? copy.stopVoice : copy.startVoice
                  }
                  accessibilityHint={copy.voiceSpeaking}
                  accessibilityActions={[
                    {
                      name: "activate",
                      label: voiceCaptureActive
                        ? copy.stopVoice
                        : copy.startVoice,
                    },
                  ]}
                  onAccessibilityAction={(event) => {
                    if (
                      !voiceFooterDisabled &&
                      event.nativeEvent.actionName === "activate"
                    )
                      toggleVoiceFromAccessibility();
                  }}
                  accessibilityState={{
                    disabled: voiceFooterDisabled,
                    selected: voiceCaptureActive,
                  }}
                  disabled={voiceFooterDisabled}
                  onPressIn={startVoiceHold}
                  onPressOut={stopVoiceCapture}
                  pressRetentionOffset={{ top: 40, right: 40, bottom: 40, left: 40 }}
                  style={({ pressed }) => [
                    styles.footerAction,
                    {
                      opacity:
                        voiceFooterDisabled
                          ? 0.3
                          : pressed
                            ? 0.62
                            : 1,
                    },
                  ]}
                >
                  {voiceCaptureActive ? (
                    <View pointerEvents="none" style={styles.footerMicEqualizer}>
                      <VoiceEqualizer
                        active
                        color={t.accent}
                        idleColor={t.textMuted}
                        owner="user"
                      />
                    </View>
                  ) : null}
                  <Ionicons
                    name="mic-outline"
                    size={26}
                    color={voiceCaptureActive ? t.wrong : t.textSecond}
                  />
                  <Text style={[styles.footerActionLabel, { color: t.textMuted, fontSize: f.label }]}>
                    {footerVoiceLabel}
                  </Text>
                </Pressable>
            ) : null}

            <Animated.View style={[styles.footerActionSlot, wordPocketBumpStyle]}>
              <View
                ref={wordPocketTargetRef}
                collapsable={false}
                style={styles.footerActionTarget}
              >
              <Pressable
                testID="learning-v2-footer-word-pocket"
                accessibilityRole="button"
                accessibilityLabel={`Карман слов, открыто ${unlockedWords.length}`}
                disabled={unlockedWords.length === 0}
                onPress={() => {
                  void hapticTap();
                  setWordPocketOpen(true);
                }}
                style={({ pressed }) => [
                  styles.footerAction,
                  { opacity: unlockedWords.length === 0 ? 0.3 : pressed ? 0.62 : 1 },
                ]}
              >
                <View style={styles.footerIconWrap}>
                  <Ionicons
                    name="albums-outline"
                    size={26}
                    color={unlockedWords.length > 0 ? t.accent : t.textMuted}
                  />
                  {unlockedWords.length > 0 ? (
                    <View style={[styles.wordPocketBadge, { backgroundColor: t.gold }]}>
                      <Text style={[styles.wordPocketBadgeText, { color: "#07110A" }]}>
                        {unlockedWords.length}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.footerActionLabel, { color: t.textMuted, fontSize: f.label }]}>
                  {footerWordsLabel}
                </Text>
              </Pressable>
              </View>
            </Animated.View>

            <Pressable
              testID="learning-v2-footer-next"
              accessibilityRole="button"
              accessibilityLabel={
                practiceIndex + 1 >= runSummary.practiceInteractionCount
                  ? copy.finish
                  : copy.next
              }
              disabled={result !== "correct" || finishing}
              onPress={advance}
              style={({ pressed }) => [
                styles.footerAction,
                {
                  opacity:
                    result !== "correct" || finishing
                      ? 0.3
                      : pressed
                        ? 0.62
                        : 1,
                },
              ]}
            >
              <Ionicons
                name="play-forward"
                size={26}
                color={result === "correct" ? t.correct : t.textMuted}
              />
              <Text
                style={[
                  styles.footerActionLabel,
                  {
                    color: result === "correct" ? t.correct : t.textMuted,
                    fontSize: f.label,
                  },
                ]}
              >
                {practiceIndex + 1 >= runSummary.practiceInteractionCount
                  ? copy.finish
                  : copy.next}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
      {wordPocketOpen ? (
        <LearningV2WordPocketOverlayV1
          words={unlockedWords}
          onClose={() => setWordPocketOpen(false)}
          onSpeak={(text, options) => {
            speakPreviewAudio(text, undefined, options);
          }}
        />
      ) : null}
      {currentNewWordEncounter && newWordFlow.kind === "presenting" ? (
        <LearningV2NewWordEncounterOverlay
          encounter={currentNewWordEncounter}
          locale={lang}
          position={
            newWordEncounters.findIndex(
              (encounter) =>
                encounter.lexicalItemId ===
                currentNewWordEncounter.lexicalItemId,
            ) + 1
          }
          total={newWordEncounters.length}
          saveState={
            newWordSaveStates[currentNewWordEncounter.lexicalItemId] ??
            "not_saved"
          }
          audioState={currentNewWordAudioState}
          onContinue={() => {
            void hapticTap();
            // The presentation effect is the primary unlock point. Repeating
            // the idempotent write here only retries a rare storage failure;
            // Continue never owns or delays the first unlock.
            void markCurrentNewWordPresented();
          }}
          onFlightComplete={() => {
            dispatchNewWordEvent({ kind: "continue" });
          }}
          onToggleSave={() => {
            void toggleCurrentNewWordSave();
          }}
          onPlayAudio={() => {
            dispatchNewWordEvent({ kind: "audio_pressed" });
            if (currentNewWordAudioUri) playLocalAudio(currentNewWordAudioUri);
            else
              speakPreviewText(
                currentNewWordEncounter.save.targetText,
                `new-word:${currentNewWordEncounter.lexicalItemId}`,
              );
          }}
          measurePocketTarget={measureWordPocketTarget}
        />
      ) : null}
      {runeFlight ? (
        <LearningV2RuneFlight
          key={runeFlight.key}
          from={runeFlight.from}
          to={runeFlight.to}
          count={runeFlight.count}
          onDone={() => {
            setRuneFlight(null);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Проверка главы: собственная типографика входа (макет 26).
  checkpointTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 22,
  },
  checkpointBody: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "400",
    textAlign: "center",
    marginTop: 10,
    maxWidth: 320,
  },
  checkpointCta: {
    marginTop: 26,
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  checkpointCtaText: { fontSize: 16, fontWeight: "700" },
  checkpointRows: { width: "100%", alignItems: "center", marginTop: 18 },
  screen: { flex: 1 },
  practiceBlocked: { opacity: 0 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 18,
  },
  errorText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  // зачем: техническая причина падения, видна только в дев-сборке. Тоном тише
  // заголовка и выделяется пальцем, чтобы можно было скопировать в отчёт.
  devFailureReason: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  retry: {
    minHeight: 48,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: { fontSize: 16, fontWeight: "900" },
  preparingContent: { paddingHorizontal: 20, paddingTop: 24, gap: 18 },
  preparingCard: {
    minHeight: 76,
    borderRadius: 20,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  preparingText: { flex: 1, fontSize: 16, lineHeight: 23, fontWeight: "800" },
  preparingLine: { width: "64%", height: 58, borderRadius: 18 },
  preparingLineLong: { width: "100%" },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  progressColumn: { flex: 1, gap: 5 },
  progressTrack: { height: 8, borderRadius: 5, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 5 },
  progressText: { fontSize: 11, lineHeight: 14, fontWeight: "800" },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  runeCounter: {
    minWidth: 48,
    minHeight: 36,
    paddingHorizontal: 9,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  runeCounterText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  runeAsset: { width: 18, height: 18 },
  content: { paddingHorizontal: 20, paddingTop: 24 },
  modeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  modeCopy: { flex: 1 },
  modeTitle: { fontSize: 15, lineHeight: 20, fontWeight: "900" },
  modeNote: { fontSize: 12, lineHeight: 18, fontWeight: "600", marginTop: 2 },
  promptRow: {
    marginTop: 28,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  prompt: { fontWeight: "900", lineHeight: 34 },
  promptText: { flex: 1 },
  audioButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  answers: { marginTop: 24, gap: 12 },
  answer: {
    minHeight: 58,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 15,
    justifyContent: "center",
  },
  answerText: { fontSize: 16, lineHeight: 23, fontWeight: "800" },
  assembled: {
    minHeight: 76,
    borderRadius: 19,
    paddingHorizontal: 17,
    paddingVertical: 18,
    justifyContent: "center",
  },
  assembledText: { fontSize: 18, lineHeight: 27, fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    minHeight: 48,
    borderRadius: 15,
    paddingHorizontal: 15,
    justifyContent: "center",
  },
  chipText: { fontSize: 16, fontWeight: "800" },
  undo: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 7,
    paddingRight: 10,
  },
  undoText: { fontSize: 14, fontWeight: "800" },
  speechBox: {
    minHeight: 190,
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  speechTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "900",
    marginTop: 12,
  },
  speechNote: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 6,
  },
  transcriptRow: { minHeight: 44, justifyContent: "center", marginTop: 12 },
  transcript: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "800",
    textAlign: "center",
  },
  explanation: {
    marginTop: 18,
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  explanationText: { flex: 1, fontSize: 14, lineHeight: 21, fontWeight: "700" },
  // зачем gap и alignItems (владелец, 2026-08-17): раньше кнопка сохранения с
  // длинным текстом растягивалась почти на всю ширину и обрезала соседнюю
  // «Ответить голосом» — теперь сохранение стало квадратной иконкой (48×48),
  // а «Ответить голосом» получает всё оставшееся место через flex: 1.
  actionRow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  compactAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  compactActionText: { fontSize: 13, fontWeight: "800" },
  voiceTranscript: {
    minHeight: 48,
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  voiceTranscriptText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
  },
  voiceStatus: {
    marginTop: 9,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 0,
    paddingTop: 14,
    borderTopWidth: 0.5,
  },
  reportDock: {
    position: "absolute",
    right: 16,
    zIndex: 20,
  },
  footerControls: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  footerActionSlot: { flex: 1 },
  footerActionTarget: { flex: 1 },
  footerAction: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  footerActionLabel: {
    marginTop: 4,
    lineHeight: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  footerIconWrap: { position: "relative" },
  footerMicEqualizer: {
    position: "absolute",
    bottom: 36,
    left: "50%",
    width: 140,
    marginLeft: -70,
    alignItems: "center",
  },
  wordPocketBadge: {
    position: "absolute",
    top: -5,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  wordPocketBadgeText: { fontSize: 10, lineHeight: 13, fontWeight: "900" },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  footerMicOnly: {
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  flexPrimary: { flex: 1 },
  primaryText: { fontSize: 16, fontWeight: "900" },
  skip: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 17,
  },
  skipText: { fontSize: 14, fontWeight: "800" },
});
