import AsyncStorage from "@react-native-async-storage/async-storage";
import { actionToastTri, emitAppEvent } from "./events";
import { isAttemptsStopEffect, isAttemptsInputBlocked } from "./session_attempts/session_attempts_stop";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Crypto from "expo-crypto";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { usePremium } from "../components/PremiumContext";
import {
  VOICE_LIMIT_PAYWALL_CONTEXT,
  recordVoiceDailyAttempt,
  useVoiceDailyAllowance,
  voiceDailyAllowanceGate,
} from "./voice_daily_allowance";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
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
import LearningV2PracticeViewport from "../components/learning-v2/LearningV2PracticeViewport";
import HorizonSessionResult, {
  type HorizonResultFacts,
  type HorizonResultSkill,
} from '../components/learning-v2/horizons/HorizonSessionResult';
import type { HorizonMistakeReviewItem } from '../components/learning-v2/horizons/HorizonMistakeReview';
import { WALLET_SUBUNITS_PER_STAR } from '../modules/learning-v2/contracts/wallet';
import { applySuperSundayRuneMultiplier } from '../modules/economy/super_sunday_runes';
import CoinRewardFlight, {
  type CoinRewardFlightPoint,
} from "../components/rewards/CoinRewardFlight";
import { HOME_RUNE_ICON_SOURCE } from "../components/home/homeRuneAsset";
import EnergyBar from "../components/EnergyBar";
import ReportErrorButton from "../components/ReportErrorButton";
import SessionAttemptsHud from "../components/session_attempts/SessionAttemptsHud";
import SpeakingPanel, {
  buildSpeakingPanelTheme,
  type SpeakingPanelStatus,
  type SpeakingVerdictReason,
} from "../components/SpeakingPanel";
import SpeakingInlineResultStars from "../components/SpeakingInlineResultStars";
import SpeechFailBlock from "../components/speech/SpeechFailBlock";
import { starsForScore } from "../components/SpeakingScoreStars";
import SpeakHoldButton from "./flashcards/SpeakHoldButton";
import { useLang } from "../components/LangContext";
import { useStudyTarget } from "../components/StudyTargetContext";
import { useTheme } from "../components/ThemeContext";
import { Lv2Cta, Lv2Explain, lv2Alpha, lv2CardStyle, useLv2Glass } from "../components/learning-v2/LearningV2Glass";
import {
  speechUnavailableOnDeviceText,
  useSpeechUnavailableOnDevice,
} from "./speech_device_availability";
import {
  learningV2DeviceSkippedVoiceCompletionV1,
  learningV2StarEligibleCompletionsV1,
} from "./learning_v2_device_voice_skip_v1";
import { useEnergy, useEnergySessionIntent } from "../components/EnergyContext";
import { hapticError, hapticSuccess, hapticTap } from "../hooks/use-haptics";
import { useAudio } from "../hooks/use-audio";
import { useLearningV2UnlockedLessonWordsV1 } from "../hooks/use_learning_v2_unlocked_lesson_words_v1";
import { useManagedSpokenAudioPlayer } from "../hooks/use_managed_spoken_audio_player";
import { useSessionAttempts } from "../hooks/useSessionAttempts";
import { useSessionAttemptAutoReset } from "../hooks/useSessionAttemptAutoReset";
import { SESSION_ATTEMPTS_MOTION } from "../constants/motionHybrid";
import { createLearningV2CourseLocalProgressStoreV1 } from "../modules/learning-v2/progress/course_local_progress_v1";
import { retryLearningV2LocalCompletionV1 } from "../modules/learning-v2/progress/local_completion_retry_v1";
import { deriveLocalOfflineProgressAccountScopeHash } from "../modules/learning-v2/progress/progress_account_scope";
import { deriveLearningV2EconomicAccountScopeHash } from "../modules/learning-v2/progress/economic_account_scope";
import { studySpeechLocale } from "./study_speech_locale";
// зачем (координатор 11.10, замер после 8a4d86225: манифест factory_native 425 мс всё ещё на первом кадре Главной):
// этот модуль V2 тянет factory_native_course_v1 → манифест. Нужен только при наградах за сессию — вычисляем лениво.
type RuneRewardCompositeV1Module = typeof import("../modules/learning-v2/progress/learning_session_rune_reward_composite_v1");
const runeRewardCompositeV1 = (): RuneRewardCompositeV1Module =>
  require("../modules/learning-v2/progress/learning_session_rune_reward_composite_v1") as RuneRewardCompositeV1Module;
const createLearningV2SessionRuneRewardCompositeV1 = ((...args) =>
  runeRewardCompositeV1().createLearningV2SessionRuneRewardCompositeV1(...args)) as RuneRewardCompositeV1Module["createLearningV2SessionRuneRewardCompositeV1"];
const resolveLearningV2SessionRuneRewardPublicationTokenV1 = ((...args) =>
  runeRewardCompositeV1().resolveLearningV2SessionRuneRewardPublicationTokenV1(...args)) as RuneRewardCompositeV1Module["resolveLearningV2SessionRuneRewardPublicationTokenV1"];
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
import { learningV2ScriptedRepeatAnswerBearingContentRevealedV1 } from "../modules/learning-v2/contracts/mode_native_payload_v1";
import { learningV2CourseSessionVoiceResponseV1 } from "../modules/learning-v2/runtime/course_session_voice_response_v1";
import { getStableId } from "./stable_id";
import { captureAccountGeneration } from "./account_generation";
import { captureCurrentAccountObjectiveAttempt } from "./mistake_practice_capture";
import { markNextNavigationAsReplace, safeRouterBack } from "./navigation_back";
import { SPEECH_PRONUNCIATION_PASS_THRESHOLD } from "./pronunciation_scoring_client";
import { measureLearningV2RuneFlightWithRetryV1 } from "./learning_v2_rune_flight_measure_v1";
import {
  resolveLearningV2Session1VoiceDevJumpV1,
  runLearningV2Session1VoiceDevJumpV1,
} from "./learning_v2_session1_voice_dev_jump_v1";
import type {
  LearningV2CourseReleasedSessionCurrentLocatorV3,
  LearningV2CourseReleasedSessionMaterialV3,
  LearningV2CourseSessionReadyHandleV3,
} from "./learning_v2_course_released_session_client_v3";
// зачем (координатор 11.10, холодный старт): этот файл роутер в dev вычисляет на старте как маршрут, и статический
// импорт клиента курса тянул на первый кадр Главной манифест factory_native (~0,6 с), хотя Learning V2 в первом
// выпуске скрыт. Клиент вычисляется лениво — при первом вызове, то есть при открытии сессии. Вызовы ниже прежние.
type ReleasedSessionClientV3 = typeof import("./learning_v2_course_released_session_client_v3");
const releasedSessionClientV3 = (): ReleasedSessionClientV3 =>
  require("./learning_v2_course_released_session_client_v3") as ReleasedSessionClientV3;
const previewLearningV2CourseSessionMaterialV3 = ((...args) =>
  releasedSessionClientV3().previewLearningV2CourseSessionMaterialV3(...args)) as ReleasedSessionClientV3["previewLearningV2CourseSessionMaterialV3"];
const consumeLearningV2CourseSessionReadyHandoffV3 = ((...args) =>
  releasedSessionClientV3().consumeLearningV2CourseSessionReadyHandoffV3(...args)) as ReleasedSessionClientV3["consumeLearningV2CourseSessionReadyHandoffV3"];
const peekLearningV2CourseSessionReadyHandoffKeysV3 = ((...args) =>
  releasedSessionClientV3().peekLearningV2CourseSessionReadyHandoffKeysV3(...args)) as ReleasedSessionClientV3["peekLearningV2CourseSessionReadyHandoffKeysV3"];
const resolveLearningV2CourseSessionReadyMaterialV3 = ((...args) =>
  releasedSessionClientV3().resolveLearningV2CourseSessionReadyMaterialV3(...args)) as ReleasedSessionClientV3["resolveLearningV2CourseSessionReadyMaterialV3"];
import { createLearningV2CourseSessionCompletedSpoolV1 } from "./learning_v2_course_session_completed_spool_v1";
import {
  learningV2SessionStars,
  recordLearningV2SessionStarResult,
} from "./learning_v2_session_star_results_store";
import { learningV2SessionUnlocksNextV1 } from "./learning_v2_session_unlock_policy_v1";
import {
  createLearningV2InteractionRuneAwardLedgerV1,
  learningV2InteractionRuneAwardV1,
} from "./learning_v2_interaction_rune_award_v1";
import { noAndroidOutline } from "../constants/androidGlow";
import {
  commitLearningV2SessionRuneRewardCompositeV1,
  recoverPendingLearningV2SessionRuneRewardIntentsV1,
} from "./learning_v2_owner_repository_runtime";
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
  resolveLearningV2CourseSessionSupplementalAudioV1,
  type LearningV2CourseSessionAudioPreloadHandleV1,
} from "./learning_v2_course_session_audio_preload_v1";
import { adaptLearningV2DirectSessionIntroV1 } from "./learning_v2_direct_session_intro_adapter_v1";
import { resolvePreparedLearningV2FactoryWordAudioV1 } from "./learning_v2_lesson_audio_pack_v1";
import LearningV2SessionIntro from "./learning_v2_session_intro";
import LearningV2VoiceHeadsupSheet from "../components/learning-v2/LearningV2VoiceHeadsupSheet";
import {
  countLearningV2VoiceTasksV1,
  decideLearningV2VoiceHeadsupV1,
  logLearningV2VoiceHeadsupV1,
  markLearningV2VoiceHeadsupShownV1,
  wasLearningV2VoiceHeadsupShownV1,
} from "./learning_v2_voice_headsup_v1";
import { LearningV2FirstQuestionShownReporter } from "../hooks/learningV2FirstQuestionEnergy";
import { learningV2CheckpointCopy } from "./learning_v2_checkpoint_copy";
import {
  learningV2CourseSessionIdV1,
  learningV2CourseSessionRoleV1,
} from "../modules/learning-v2/content/course_topology_v1";
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
import {
  resolveLearningV2ModeFeedbackV1,
  type LearningV2ModeLearnerFeedbackV1,
} from "../modules/learning-v2/modes/mode_feedback_v1";
import ScriptedRepeatCompareModeV1 from "../modules/learning-v2/modes/scripted_repeat_compare_mode_v1";
import { resolveLearningV2CourseSessionDeviceSpeechTextV1 } from "../modules/learning-v2/runtime/course_session_device_speech_text_v1";
import { stableShuffleLearningV2OptionsV1 } from "../modules/learning-v2/runtime/stable_option_shuffle_v1";
import {
  markLearningV2AuthoringPreviewWordUnlockedV1,
  markLearningV2LessonWordUnlockedV1,
  type LearningV2UnlockedLessonWordV1,
} from "./learning_v2_unlocked_lesson_words_v1";
import { DebugLogger } from './debug-logger';
import { recordTodayTaskActivity } from '../modules/today-tasks/today_tasks_store';
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее
import type { LearningV2FactoryNativeNewWordEncounterV1 } from "../modules/learning-v2/content/factory_native/factory_native_course_v1";
import { factoryNativeLearningV2AvailabilityV1 } from "../modules/learning-v2/content/factory_native/factory_native_catalog_v1";
import { sanitizeLearningV2LearnerPromptV1 } from "../modules/learning-v2/content/learner_prompt_hygiene_v1";
import type { LearningV2CourseSessionWordEncounterPresentationV1 } from "../modules/learning-v2/runtime/course_session_word_encounter_presentation_v1";
import { resolveLearningV2SessionRouteCoordinatesV1 } from "./learning_v2_session_route_coordinates_v1";
import { isPulseLessonAuthored } from "../components/learning-v2/learningV2PulseGeometry";
import { useLineScale } from "../hooks/useLineScale";
import { KitGlassLayer } from "../components/v2/KitLiquidGlass";
import { actionBoxShadow, nestedBoxShadow } from "../components/v2/ShadowSurface";
import { LearningV2SessionUnavailable, learningV2SessionUnavailableDefaultHint } from "../components/learning-v2/LearningV2SessionUnavailable";

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
const FACTORY_NATIVE_SESSION_IDS = new Set(
  factoryNativeLearningV2AvailabilityV1().sessions.map((row) => row.courseSessionId),
);

// The DEV route name is retained for its presentation-only unlock contract,
// while its material now comes from the same admitted Factory Native release
// as the real player. The retired authoring preview never enters app code.
function buildLearningV2DevUnlockedDraftDevicePreviewV1(
  locator: LearningV2CourseReleasedSessionCurrentLocatorV3,
): LearningV2CourseReleasedSessionMaterialV3 | null {
  return previewLearningV2CourseSessionMaterialV3(locator);
}

function wordEncounterPresentationId(
  encounter: LearningV2CourseSessionWordEncounterPresentationV1 | LearningV2FactoryNativeNewWordEncounterV1,
): string {
  return encounter.encounterId ?? encounter.lexicalItemId;
}

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

type LearningV2VoiceUiStatus =
  | "idle"
  | "requesting"
  | "listening"
  | "finishing"
  | "permission_denied"
  | "local_recognition_unavailable"
  | "error";

type LearningV2VoiceAttemptResult = Readonly<{
  score: number;
  passed: boolean;
  transcript: string;
  /** Пропущенные слова цели от строгой проверки панели (экран «не засчитано»). */
  missingWords: readonly string[];
  /** Причина вердикта панели (R11): «не услышали слово» показываем только при 'missing_words' — иначе все слова сказаны. */
  reason: SpeakingVerdictReason;
}>;

function learningV2VoiceUiStatusFromSpeakingPanel(
  status: SpeakingPanelStatus,
): LearningV2VoiceUiStatus {
  if (status === "requesting") return "requesting";
  if (status === "listening") return "listening";
  if (status === "scoring") return "finishing";
  if (status === "denied") return "permission_denied";
  if (status === "unavailable") return "local_recognition_unavailable";
  if (status === "stalled" || status === "no_speech") return "error";
  return "idle";
}

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
  material: LearningV2CourseReleasedSessionMaterialV3,
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

// зачем (координатор 15.10, урок 1 V2 целиком s01–s56): немые catch плеера прятали причину — звук слова или фразы пропадал молча.
// Поведение прежнее (null/откат), но причина в журнале [V2-PLAYER]. Пересчёты useMemo пишут один раз на место и id, без потока строк.
const playerSwallowedOnce = new Set<string>();
function logPlayerSwallowed(where: string, id: string, error: unknown): void {
  const key = `${where}:${id}`;
  if (playerSwallowedOnce.has(key)) return;
  playerSwallowedOnce.add(key);
  console.warn("[V2-PLAYER] swallowed", JSON.stringify({ where, id, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: причина проглоченной ошибки
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
    skipIntro?: string | string[];
    runKind?: string | string[];
    sessionRunId?: string | string[];
    // зачем: карта передаёт этот параметр (lessons.tsx, router.push), и трасса
    // [V2-HANDOFF] его печатает, но в типе его не было — ошибка TS2339 жила в
    // диагностике моста и мешала точечной проверке типов этого файла.
    runtimeMode?: string | string[];
  }>();
  const previewMode = first(params.previewMode);
  const isDevUnlockedDraftPreview =
    __DEV__ && previewMode === "dev_unlocked_drafts_v1";
  const isAuthoringPreview = __DEV__ &&
    (previewMode === "authoring_v1" || isDevUnlockedDraftPreview);
  const isSessionRepeat = first(params.runKind) === "repeat";
  const previewReturnsToCourse = first(params.previewOrigin) === "course";
  const exitRoute = isAuthoringPreview && !previewReturnsToCourse
    ? "/learning_v2_authoring_preview"
    : "/learning-v2/course";
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { theme: t, f } = useTheme();
  // зачем (learning-v2.html): весь экран занятия красится токенами Liquid Glass активной
  // темы (`g`), а не разрозненными полями старой палитры; `t` остаётся только для
  // SpeakingPanel, чей общий тематический контракт живёт в другом модуле.
  const g = useLv2Glass();
  const heartsPill = useMemo(
    () => ({ fill: g.text, empty: lv2Alpha(g.text, 0.22), plate: g.opaqueControl }),
    [g.text, g.opaqueControl],
  );
  const insets = useStableSafeAreaInsets();
  const lh = useLineScale();
  const reducedMotion = useReducedMotion();
  const copy = useMemo(() => learningV2SessionCopy(lang), [lang]);
  const routedSessionRunId = first(params.sessionRunId);
  const sessionRunIdRef = useRef(routedSessionRunId || Crypto.randomUUID());
  const sessionExitRequestedRef = useRef(false);
  const exitLearningV2Session = useCallback(() => {
    if (sessionExitRequestedRef.current) return;
    sessionExitRequestedRef.current = true;
    // зачем (владелец 23.09): без этой пометки трекер «назад» клал карту
    // ПОВЕРХ записи занятия, а не вместо неё. Потом «назад» с карты возвращал
    // на протухший адрес занятия — мост уже прочитан, гейт энергии списывал
    // плату второй раз, человек видел «Сессия недоступна».
    markNextNavigationAsReplace();
    router.replace(exitRoute);
  }, [exitRoute, router]);
  const initialReadyHandleRef = useRef<
    LearningV2CourseSessionReadyHandleV3 | null | undefined
  >(undefined);
  if (initialReadyHandleRef.current === undefined) {
    const routedCourseSessionId = first(params.id);
    initialReadyHandleRef.current =
      routedCourseSessionId && routedSessionRunId
        ? consumeLearningV2CourseSessionReadyHandoffV3({
            courseSessionId: routedCourseSessionId,
            sessionRunId: routedSessionRunId,
          })
        : null;
    // зачем (владелец 21.09, экран «Сессия недоступна» вернулся): это ПЕРВОЕ
    // звено цепочки — мост карта→сессия. Без этого лога нельзя отличить «карта
    // не положила handoff» от «положила под другим ключом» и от «пришли вообще
    // без sessionRunId». Печатаем сами значения, а не факт их наличия.
    const handoffTrace = {
      routedCourseSessionId: routedCourseSessionId || null,
      routedSessionRunId: routedSessionRunId || null,
      askedBridge: Boolean(routedCourseSessionId && routedSessionRunId),
      got: Boolean(initialReadyHandleRef.current),
      stagedKeys: peekLearningV2CourseSessionReadyHandoffKeysV3(),
      runtimeMode: first(params.runtimeMode) || null,
      previewMode: first(params.previewMode) || null,
      previewOrigin: first(params.previewOrigin) || null,
      runKind: first(params.runKind) || null,
      lessonOrdinal: first(params.lessonOrdinal) || null,
      sessionOrdinal: first(params.sessionOrdinal) || null,
    };
    if (__DEV__) {
      console.log("[V2-HANDOFF] consume", JSON.stringify(handoffTrace)); // guard-ok: диагностика моста
    }
    // Провал моста обязан пережить перезапуск: владелец ловит это на телефоне.
    if (!initialReadyHandleRef.current && !isAuthoringPreview) {
      DebugLogger.error(
        "[V2-HANDOFF] missing",
        new Error(JSON.stringify(handoffTrace)),
        "warning",
      );
    }
  }
  const routeCoordinates = resolveLearningV2SessionRouteCoordinatesV1({
    id: first(params.id),
    lessonOrdinal: first(params.lessonOrdinal),
    sessionOrdinal: first(params.sessionOrdinal),
  });
  const lessonOrdinal = routeCoordinates?.lessonOrdinal ?? null;
  const sessionOrdinal = routeCoordinates?.sessionOrdinal ?? null;
  const routeCoordinatesInvalid = routeCoordinates === null;
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
  // зачем (владелец 2026-09-15, «потратил сердечки, вышел-зашёл — восстановились»):
  // в ключе стоял sessionRunIdRef — случайный UUID, новый при каждом входе и при
  // каждом перезапуске прерванного занятия. Он нужен для защиты наград от гонок
  // (см. restartInterruptedRun), но в ключе сердечек означал, что сохранённое
  // значение при возврате не находится и экран выдаёт 3/3. Занятие определяют
  // урок и номер сессии — как в маршруте learning-v2/session/[id].
  const attemptsSessionId = `learning-v2-direct:${lessonOrdinal ?? "unknown"}:${sessionOrdinal ?? "unknown"}`;
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
    LearningV2CourseReleasedSessionMaterialV3 | null
  >(() => {
    if (initialReadyHandleRef.current) {
      return resolveLearningV2CourseSessionReadyMaterialV3(
        initialReadyHandleRef.current,
      ).result.material;
    }
    if (isAuthoringPreview && locator) {
      return isDevUnlockedDraftPreview
        ? buildLearningV2DevUnlockedDraftDevicePreviewV1(locator)
        : previewLearningV2CourseSessionMaterialV3(locator);
    }
    return null;
  });
  // зачем (D47, владелец): раньше TTS телефона разрешался ТОЛЬКО в дев-превью
  // автора, а обычный ученик при отсутствующем локальном mp3 слышал тишину
  // (resolveFile просто возвращал null, см. course_session_audio_preload_v1.ts).
  // Теперь способов СКАЧАТЬ недостающую озвучку V2 не осталось вовсе — значит
  // единственная замена немому занятию это системный TTS, и он обязан работать
  // для всех, не только для автора. Клип по-прежнему в приоритете: TTS — это
  // ветка "нет локального файла", а не замена готовой озвучки.
  const allowsDeviceSpeech = true;
  const [readyHandle] =
    useState<LearningV2CourseSessionReadyHandleV3 | null>(
      initialReadyHandleRef.current ?? null,
    );
  const [, setLoadFailed] = useState(false);
  // зачем: причина падения загрузки, видимая только в дев-сборке — без неё
  // экран «Сессия недоступна» не отличает нет сети от нет релиза.
  const [loadFailureReason, setLoadFailureReason] = useState<string | null>(
    null,
  );
  const [loadRevision, setLoadRevision] = useState(0);
  useEffect(() => {
    if (!routeCoordinatesInvalid) return;
    setLoadFailed(true);
    setLoadFailureReason("learning_v2_session_route_coordinates_invalid");
  }, [routeCoordinatesInvalid]);
  const [introDone, setIntroDone] = useState(() => first(params.skipIntro) === "1");
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
  const [learnerFeedback, setLearnerFeedback] =
    useState<LearningV2ModeLearnerFeedbackV1 | null>(null);
  const [lastWrongResponseId, setLastWrongResponseId] = useState<string | null>(
    null,
  );
  const [orderedIds, setOrderedIds] = useState<readonly string[]>([]);
  const [transcript, setTranscript] = useState("");
  const [voiceAttemptResult, setVoiceAttemptResult] =
    useState<LearningV2VoiceAttemptResult | null>(null);
  const [voiceAttemptSubmitted, setVoiceAttemptSubmitted] = useState(false);
  const voiceCancelRef = useRef<() => void>(() => {});
  const [sessionRunes, setSessionRunes] = useState(0);
  // One timestamp seals the whole local-first composite and its immediate HUD.
  // It prevents a Sunday/Monday boundary from showing an amount that the
  // immutable receipt later cannot reproduce.
  const runeRewardEarnedAtMsRef = useRef(Date.now());
  const runeAwardLedgerRef = useRef(
    createLearningV2InteractionRuneAwardLedgerV1(),
  );
  const [runeFlight, setRuneFlight] = useState<Readonly<{
    key: number;
    count: 1 | 2 | 3 | 4 | 6;
    from: CoinRewardFlightPoint;
    to: CoinRewardFlightPoint;
  }> | null>(null);
  const runeCounterRef = useRef<View>(null);
  const runeFlightSequenceRef = useRef(0);
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
  // The receipt is shown after persistence; decorative motion never controls exit.
  const finaleFactsRef = useRef<HorizonResultFacts>({
    runes: 0,
    total: 0,
    firstTry: 0,
    elapsedMs: 0,
    credit: undefined,
  });
  const [finaleFacts, setFinaleFacts] = useState<HorizonResultFacts>(
    finaleFactsRef.current,
  );
  // зачем (владелец 2026-09-30, learning-v2.html → «Итог занятия»): итог показывает, на чём
  // человек споткнулся (тип задания, его ответ → верный) и на проверке главы — «Что вы теперь
  // умеете». Живёт только в памяти прогона: не durable, сбрасывается при перезапуске.
  const sessionMistakesRef = useRef<HorizonMistakeReviewItem[]>([]);
  const [finaleSkills, setFinaleSkills] = useState<readonly HorizonResultSkill[]>([]);
  const publishFinaleFacts = useCallback((nextFacts: HorizonResultFacts) => {
    finaleFactsRef.current = nextFacts;
    setFinaleFacts(nextFacts);
  }, []);

  useEffect(() => {
    if (isAuthoringPreview) return;
    const recoverRuneRewards = () => {
      void recoverPendingLearningV2SessionRuneRewardIntentsV1().catch(
        (error: unknown) => {
          DebugLogger.error(
            "learning_v2_direct_session_player_v1:rune_intent_recovery",
            error instanceof Error ? error : new Error(String(error)),
            "warning",
          );
        },
      );
    };
    recoverRuneRewards();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") recoverRuneRewards();
    });
    return () => subscription.remove();
  }, [isAuthoringPreview]);
  const [finaleStars, setFinaleStars] = useState<0 | 1 | 2 | 3 | null>(null);
  const [finaleRewardsSettled, setFinaleRewardsSettled] = useState(false);
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
  // зачем (§SPEECH-NA, владелец 04.10): голосовые задания, пропущенные потому,
  // что на устройстве нет распознавателя. Они честно уходят как "skipped", но
  // не считаются в звёздах занятия — человек не виноват, что телефон не слышит,
  // и занятие/серия/прогресс засчитываются так же, как у всех.
  const deviceSkippedVoiceIdsRef = useRef(new Set<string>());
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
    rate: number;
  }> | null>(null);
  const audioRequestIdRef = useRef(0);
  const [localAudioPlayback, setLocalAudioPlayback] = useState<Readonly<{
    requestId: number;
    state: Exclude<LearningV2ReferenceAudioStateV1, "unavailable">;
  }> | null>(null);
  const { speak: speakPreviewAudio, stop: stopPreviewAudio } = useAudio();
  // зачем (Ревизор 15.10, 🟡 к e6392a5a7): предпросмотр слова озвучивался зашитым en-US, а распознавание шло по языку курса —
  // испанское слово читалось английским голосом. Локаль курса считается ниже (voiceRecognitionLocale, после runSummary),
  // поэтому колбэк читает её через ref: в массив зависимостей объявленную ниже константу класть нельзя.
  const previewSpeechLocaleRef = useRef<string>(studySpeechLocale(studyTarget, "learning_v2_preview"));
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
    (fileUri: string | null | undefined, rate = 1) => {
      if (!fileUri) return;
      if (!Number.isFinite(rate) || rate < 0.5 || rate > 2) return;
      // expo-audio preserves the playing state across replace(). Pause and
      // release the old claim first so the replacement cannot auto-play at
      // the previous request's rate before the new request is admitted.
      managedAudio.stop();
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
      setAudioRequest({ fileUri, requestId, rate });
    },
    [managedAudio, stopPreviewAudio],
  );

  const speakPreviewText = useCallback(
    (text: string | null | undefined, key: string, rate?: number) => {
      const normalized = text?.trim();
      if (!allowsDeviceSpeech || !normalized) return;
      // зачем (D47): единственная точка входа TTS-фолбэка V2 — сюда попадают
      // и «нет клипа у практики», и «нет клипа у нового слова». Лог здесь
      // покрывает все случаи одним местом вместо дублирования на каждом вызове.
      // Персистентный след — DebugLogger (переживает перезапуск), console.log
      // только в деве ради живого наблюдения на устройстве разработчика.
      // зачем БЕЗ courseSessionId: run объявлен ниже по файлу (useMemo,
      // строка ~958) и НЕ входит в deps этого useCallback — считывать его
      // тут значило бы либо ловить устаревшее замыкание, либо (если добавить
      // в deps) пересоздавать колбэк на каждую смену run без нужды. `key`
      // (`practice:<interactionId>` / `new-word:<id>`) уже называет контекст.
      const ttsTrace = { key, reason: "no_local_audio_file" };
      if (__DEV__) {
        console.log("[V2-AUDIO-TTS]", JSON.stringify(ttsTrace)); // guard-ok: диагностика фолбэка на TTS
      }
      DebugLogger.warn("[V2-AUDIO-TTS]", JSON.stringify(ttsTrace));
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
        language: previewSpeechLocaleRef.current,
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
    [allowsDeviceSpeech, managedAudio, speakPreviewAudio],
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
    audioPlayer.setPlaybackRate(audioRequest.rate, "high");
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
  }, [audioPlayer, audioRequest, audioStatus.isLoaded, managedAudio]);

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
    if (initialReadyHandleRef.current) return;
    setLoadFailed(false);
    if (isAuthoringPreview) {
      try {
        const previewMaterial = isDevUnlockedDraftPreview
          ? buildLearningV2DevUnlockedDraftDevicePreviewV1(locator)
          : previewLearningV2CourseSessionMaterialV3(locator);
        if (!previewMaterial) {
          throw new Error("learning_v2_factory_native_session_unavailable");
        }
        setMaterial(previewMaterial);
      } catch (error: unknown) {
        setLoadFailed(true);
        setLoadFailureReason(
          error instanceof Error ? error.message : String(error),
        );
      }
      return;
    }
    // зачем (владелец 23.09, «сделай такое состояние НЕВОЗМОЖНЫМ»): здесь
    // экран показывал тупик «Сессия недоступна» с кнопкой «Повторить», у
    // которой НЕТ успешного исхода — повтор снова приводил ровно сюда.
    // Боевой материал готовит только карта, поэтому единственный полезный
    // ход — вернуть человека на карту, где один тап открывает занятие
    // заново. Флаг выхода заставляет рендер нарисовать пустой кадр в цвет
    // темы, поэтому ошибку человек не увидит.
    //
    // Немой уход запрещён: причина обязана пережить перезапуск, владелец
    // ловит это на телефоне.
    // зачем (решение координатора 15.10, бета-тест А4): единый префикс [V2-BRIDGE] для поиска — человек нажал «Начать» и молча оказывается на карте; причина и все значения моста в одной строке
    console.warn(
      "[V2-BRIDGE] bounce_to_map reason=learning_v2_session_ready_handoff_missing",
      JSON.stringify({ courseSessionId: first(params.id) ?? null, sessionRunId: routedSessionRunId || null, lessonOrdinal, sessionOrdinal }),
    ); // guard-ok: причина ухода называется всегда
    DebugLogger.error(
      "[V2-SESSION] handoff_missing",
      new Error(
        JSON.stringify({
          reason: "learning_v2_session_ready_handoff_missing",
          action: "bounce_to_map",
          courseSessionId: first(params.id) ?? null,
          sessionRunId: routedSessionRunId || null,
          lessonOrdinal,
          sessionOrdinal,
        }),
      ),
      "warning",
    );
    exitLearningV2Session();
  }, [
    exitLearningV2Session,
    isAuthoringPreview,
    isDevUnlockedDraftPreview,
    lang,
    lessonOrdinal,
    loadRevision,
    locator,
    params.id,
    routedSessionRunId,
    sessionOrdinal,
  ]);

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
  // Only English initial runs have the local client-authoritative interaction
  // composite. Repeats and other target languages are policy-priced by the
  // server completion flow, so showing per-interaction runes here would be an
  // unbacked promise; their UI waits for the authoritative receipt instead.
  const canEarnSessionRunes = !isAuthoringPreview && !isSessionRepeat &&
    runSummary?.targetLanguage === "en";
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
    () => material?.factoryWordEncounterQueues
      ? Object.values(material.factoryWordEncounterQueues).flat().sort((left, right) => left.orderWithinSession - right.orderWithinSession)
      : (run ? getLearningV2CourseSessionNewWordEncountersV1(run) : []),
    [material?.factoryWordEncounterQueues, run],
  );
  const newWordEncounterIds = useMemo(
    () => newWordEncounters.map(wordEncounterPresentationId),
    [newWordEncounters],
  );
  const newWordSpeechByLexicalItemId = useMemo(
    () =>
      Object.freeze(
        Object.fromEntries(
          newWordEncounters.map((encounter) => [
            wordEncounterPresentationId(encounter),
            encounter.save.targetText,
          ]),
        ),
      ) as Readonly<Record<string, string>>,
    [newWordEncounters],
  );
  const newWordAudioByLexicalItemId = useMemo(() => {
    const audioById: Record<string, string | null> = {};
    for (const encounter of newWordEncounters) {
      let fileUri: string | null = null;
      if (activeAudioPreload) {
        try {
          fileUri = resolveLearningV2CourseSessionSupplementalAudioV1({
            handle: activeAudioPreload,
            supplementalId: encounter.lexicalItemId,
          })?.fileUri ?? null;
        } catch (error: unknown) {
          logPlayerSwallowed("new_word_audio", encounter.lexicalItemId, error);
          fileUri = null;
        }
      }
      audioById[wordEncounterPresentationId(encounter)] = fileUri;
    }
    return Object.freeze(audioById);
  }, [activeAudioPreload, newWordEncounters]);
  const preparedWordAudioByText = useMemo(() => {
    const entries = unlockedWords.map((word) => {
      const normalized = word.encounter.save.targetText.normalize("NFKC").trim();
      let readyHandleUri: string | null = null;
      if (activeAudioPreload) {
        try {
          readyHandleUri = resolveLearningV2CourseSessionSupplementalAudioV1({
            handle: activeAudioPreload,
            supplementalId: word.lexicalItemId,
          })?.fileUri ?? null;
        } catch (error: unknown) {
          logPlayerSwallowed("unlocked_word_audio", word.lexicalItemId, error);
          readyHandleUri = null;
        }
      }
      return [
        normalized,
        readyHandleUri ?? resolvePreparedLearningV2FactoryWordAudioV1(normalized),
      ] as const;
    });
    return Object.freeze(Object.fromEntries(entries)) as Readonly<
      Record<string, string | null>
    >;
  }, [activeAudioPreload, unlockedWords]);

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
            wordEncounterPresentationId(encounter) === newWordFlow.encounterId,
        ) ?? null)
      : null;
  const currentNewWordAudioUri = currentNewWordEncounter
    ? (newWordAudioByLexicalItemId[wordEncounterPresentationId(currentNewWordEncounter)] ??
      null)
    : null;
  const currentNewWordAudioState: LearningV2NewWordAudioStateV1 =
    !currentNewWordAudioUri && !allowsDeviceSpeech
      ? "unavailable"
      : currentNewWordEncounter &&
          previewSpeechKey ===
            `new-word:${wordEncounterPresentationId(currentNewWordEncounter)}`
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
  const confirmCurrentNewWordPresented = useCallback(() => {
    if (!currentNewWordEncounter || newWordFlow.kind !== "presenting") return;
    const lexicalItemId = currentNewWordEncounter.lexicalItemId;
    if (presentedUnlockStartedRef.current.has(lexicalItemId)) return;
    presentedUnlockStartedRef.current.add(lexicalItemId);
    void markCurrentNewWordPresented().catch((error: unknown) => {
      console.warn("[V2-PLAYER] new_word_present_failed", JSON.stringify({ lexicalItemId, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: откат с причиной
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
    } catch (error: unknown) {
      console.warn("[V2-PLAYER] new_word_save_failed", JSON.stringify({ lexicalItemId, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: причина в журнале
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
  const learnerFacingPracticePrompt = practice
    ? sanitizeLearningV2LearnerPromptV1(practice.prompt)
    : "";
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
  const footerWordsA11yLabel = triLang(lang, {
    ru: `Карман слов, открыто ${unlockedWords.length}`,
    uk: `Кишеня слів, відкрито ${unlockedWords.length}`,
    en: `Word pocket, ${unlockedWords.length} unlocked`,
    es: `Bolsillo de palabras, ${unlockedWords.length} desbloqueadas`,
    "pt-BR": `Bolso de palavras, ${unlockedWords.length} desbloqueadas`,
    vi: `Túi từ, đã mở ${unlockedWords.length}`,
    id: `Kantong kata, ${unlockedWords.length} terbuka`,
    tr: `Kelime cebi, ${unlockedWords.length} kelime açık`,
    pl: `Kieszeń słów, odblokowano ${unlockedWords.length}`,
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
  const practiceFactoryEncounters = useMemo(
    () => practice ? material?.factoryWordEncounterQueues?.[practice.interactionId] : undefined,
    [material?.factoryWordEncounterQueues, practice],
  );
  const practiceEncounterIds = useMemo(
    () => (practiceFactoryEncounters ?? (auxiliary?.newWordEncounter ? [auxiliary.newWordEncounter] : []))
      .map(wordEncounterPresentationId),
    [auxiliary?.newWordEncounter, practiceFactoryEncounters],
  );
  const practiceEncounterKey = practiceEncounterIds.join("\u0000");
  const practiceActivated = introDone && newWordFlow.kind !== "presenting";
  const speechNa = useSpeechUnavailableOnDevice();
  const voiceSkipOnDevice =
    showVoiceFooter &&
    speechNa &&
    practiceActivated &&
    result !== "correct" &&
    sessionAttempts.state.phase === "active";
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
      encounterId: null,
      encounterIds: practiceEncounterIds.filter(
        (encounterId) => !unlockedWordIds.has(encounterId),
      ),
    });
  }, [
    dispatchNewWordEvent,
    introDone,
    practice,
    practiceEncounterKey,
    practiceEncounterIds,
    practiceFactoryEncounters,
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
    } catch (error: unknown) {
      logPlayerSwallowed("full_phrase_audio", practice.interactionId, error);
      return null;
    }
  }, [activeAudioPreload, practice]);
  const previewPracticeSpeechText = useMemo(
    () =>
      allowsDeviceSpeech && practice
        ? resolveLearningV2CourseSessionDeviceSpeechTextV1(practice)
        : null,
    [allowsDeviceSpeech, practice],
  );
  const previewPracticeSlowSpeechText = useMemo(() => {
    if (!allowsDeviceSpeech || !practice?.modePayload) return null;
    const payload = practice.modePayload;
    if (
      payload.family !== "listen_choose" &&
      payload.family !== "listen_build_dictation" &&
      payload.family !== "scripted_repeat_compare"
    )
      return null;
    return payload.slowReferenceAudio?.transcript.trim() || null;
  }, [allowsDeviceSpeech, practice]);
  const scriptedRepeatRevealPolicy =
    practice?.modePayload?.family === "scripted_repeat_compare"
      ? practice.modePayload.scriptedRepeatRevealPolicy
      : undefined;
  const practiceAnswerBearingContentRevealed =
    learningV2ScriptedRepeatAnswerBearingContentRevealedV1(
      scriptedRepeatRevealPolicy,
      voiceAttemptSubmitted || result === "correct",
    );
  const practiceReferenceAvailable =
    practiceAnswerBearingContentRevealed &&
    (fullPhraseAudio !== null || previewPracticeSpeechText !== null);
  const practiceSlowReferenceAvailable =
    practiceAnswerBearingContentRevealed &&
    (fullPhraseAudio !== null || previewPracticeSlowSpeechText !== null);
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
    if (fullPhraseAudio) {
      playLocalAudio(fullPhraseAudio.fileUri, 0.72);
      return;
    }
    if (!practice) return;
    speakPreviewText(
      previewPracticeSlowSpeechText,
      `practice:${practice.interactionId}:slow`,
      0.72,
    );
  }, [fullPhraseAudio, playLocalAudio, practice, previewPracticeSlowSpeechText, speakPreviewText]);

  const playSelectableAudio = useCallback(
    (selectableId: string) => {
      if (!practice) return;
      if (
        allowsDeviceSpeech &&
        practice.modePayload?.family === "sound_contrast"
      ) {
        const speechText = practice.responseOptions.find((entry) => entry.responseId === selectableId)?.text ?? null;
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
      allowsDeviceSpeech,
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
    setLearnerFeedback(null);
    setHintUsed(false);
    setSelectedChoiceId(null);
    setOrderedIds([]);
    setTranscript("");
    setVoiceAttemptResult(null);
    setVoiceAttemptSubmitted(false);
    voiceCancelRef.current();
  }, [managedAudio, stopPreviewAudio]);

  const restartInterruptedRun = useCallback(() => {
    managedAudio.stop();
    setAudioRequest(null);
    completionsRef.current.clear();
    answeredUiByInteractionRef.current.clear();
    sessionRunIdRef.current = Crypto.randomUUID();
    initialReadyHandleRef.current = null;
    sessionStartedAtRef.current = null;
    sessionStageRef.current = "intro";
    telemetryStartSentRef.current = false;
    setFinaleRewardsSettled(false);
    sessionMistakesRef.current = [];
    setFinaleSkills([]);
    publishFinaleFacts({
      runes: 0,
      total: 0,
      firstTry: 0,
      elapsedMs: 0,
      credit: undefined,
    });
    interruptedWhileBackgroundedRef.current = false;
    finishingRef.current = false;
    setIntroDone(false);
    setPracticeIndex(0);
    runeAwardLedgerRef.current.reset();
    runeRewardEarnedAtMsRef.current = Date.now();
    setSessionRunes(0);
    setRuneFlight(null);
    resetInteraction();
  }, [managedAudio, publishFinaleFacts, resetInteraction]);

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

  const settleSessionRuneAward = useCallback((count: 1 | 2 | 3 | 4 | 6) => {
    setSessionRunes((value) => value + count);
    if (reducedMotion) return;
    runeBump.value = withSequence(
      withTiming(1.28, { duration: 140 }),
      withTiming(1, { duration: 220 }),
    );
  }, [reducedMotion, runeBump]);

  const awardSessionRunes = useCallback((count: 1 | 2 | 3) => {
    if (!canEarnSessionRunes) return;
    const visibleCount = applySuperSundayRuneMultiplier(
      count,
      runeRewardEarnedAtMsRef.current,
    ) as 1 | 2 | 3 | 4 | 6;
    // Score state settles immediately. The flight is decorative and may never
    // hold up Continue or lose an award when a fast learner advances early.
    settleSessionRuneAward(visibleCount);
    if (reducedMotion) {
      return;
    }
    const flightKey = ++runeFlightSequenceRef.current;
    const awardRunId = sessionRunIdRef.current;
    measureLearningV2RuneFlightWithRetryV1({
      getOrigin: () => runeAwardOriginRef.current,
      getCounter: () => runeCounterRef.current,
      schedule: (callback) => { requestAnimationFrame(callback); },
      shouldContinue: () => (
        sessionRunIdRef.current === awardRunId &&
        runeFlightSequenceRef.current === flightKey
      ),
      onMeasured: ({ from, to }) => {
        setRuneFlight({
          key: flightKey,
          count: visibleCount,
          from,
          to,
        });
      },
    });
  }, [canEarnSessionRunes, reducedMotion, settleSessionRuneAward]);

  const evaluate = useCallback(
    (
      response: V2LocalEvaluatorResponseV1,
      options: Readonly<{ forcePedagogicalWrong?: boolean }> = {},
    ) => {
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
      // Pronunciation is judged by the shared Oral engine, while the capsule
      // judges transcript identity. A clearly heard but low-scoring attempt is
      // therefore a pedagogical error, never a technical/null response.
      const resultCode = options.forcePedagogicalWrong
        ? "provisional_wrong"
        : verdict.resultCode;
      const answerAttemptId = [
        "learning-v2-direct",
        sessionRunIdRef.current,
        practice.interactionId,
        attemptAnswerSequenceRef.current++,
      ].join(":");
      if (resultCode === "provisional_correct") {
        setLearnerFeedback(resolveLearningV2ModeFeedbackV1({
          interfaceLocale: lang,
          modePayload: practice.modePayload,
          outcome: "correct",
          selectedResponseId: response.kind === "choice_token" ? response.value : selectedChoiceId,
          orderedResponseIds: orderedIds,
        }));
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
      if (resultCode === "technical_invalid") {
        setLearnerFeedback(null);
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
      setLearnerFeedback(resolveLearningV2ModeFeedbackV1({
        interfaceLocale: lang,
        modePayload: practice.modePayload,
        outcome: "wrong",
        selectedResponseId: response.kind === "choice_token" ? response.value : selectedChoiceId,
        orderedResponseIds: orderedIds,
      }));
      const factorySemantic = material?.factoryPracticeSemantics?.[
        practice.interactionId
      ];
      const canonicalTarget = factorySemantic?.canonicalTarget ??
        auxiliary?.save.targetText ?? "";
      if (
        canonicalTarget &&
        !sessionMistakesRef.current.some((entry) => entry.id === practice.interactionId)
      ) {
        // Ответ ученика: для выбора — текст варианта, для текста/речи — сама строка.
        const givenText = response.kind === "choice_token"
          ? practice.responseOptions.find((option) => option.responseId === response.value)?.text ?? null
          : response.value;
        sessionMistakesRef.current = [
          ...sessionMistakesRef.current,
          {
            id: practice.interactionId,
            label: copy.modes[practice.family] ?? null,
            given: givenText && givenText !== canonicalTarget ? givenText : null,
            correct: canonicalTarget,
          },
        ];
      }
      const sourceMeaning = factorySemantic
        ? factorySemantic.reviewedMeaningByLocale?.[lang] ?? null
        : auxiliary?.save.meaningByLocale[lang] ?? null;
      if (
        !isAuthoringPreview &&
        auxiliary &&
        (studyTarget === "en" || studyTarget === "fr") &&
        canonicalTarget &&
        sourceMeaning
      ) {
        void captureCurrentAccountObjectiveAttempt({
          attemptId: `learning-v2:${sessionRunIdRef.current}:${practice.interactionId}:${attempts}`,
          studyTarget,
          verdict: "wrong",
          objective: true,
          content: {
            sourceKind: "learning_v2",
            sourceId: practice.interactionId,
            canonicalTarget,
            sourceMeaning,
            lessonId: material?.lessonId,
            tokens: canonicalTarget.split(/\s+/),
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
            expected: canonicalTarget,
          },
        }).catch(noteSwallowedHandler('learning_v2_direct_session_player_v1:useCallback.captureCurrentAccountObjectiveAttempt'));
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
      if (isAttemptsStopEffect(attemptEffect)) return;
    },
    [
      attempts,
      auxiliary,
      copy,
      hintUsed,
      isAuthoringPreview,
      lang,
      lessonOrdinal,
      material?.factoryPracticeSemantics,
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

  const [modeVoiceStatus, setModeVoiceStatus] =
    useState<LearningV2VoiceUiStatus>("idle");
  const [voiceHoldActive, setVoiceHoldActive] = useState(false);
  const [voicePanelEpoch, setVoicePanelEpoch] = useState(0);
  // зачем (решение владельца D194, 15.10, макет learning-v2-voice-limit.html): остаток дневных голосовых попыток (общий счётчик с голосом Диалогов, D165) на микрофоне всех голосовых заданий курса; гейт — до записи, списание — в момент старта записи
  const { accessResolved, hasPremiumAccess } = usePremium();
  const voiceAllowance = useVoiceDailyAllowance();
  const voiceLastStatusRef = useRef<LearningV2VoiceUiStatus>("idle");
  const voiceAttemptSeqRef = useRef(0);
  const openVoicePlus = useCallback(() => {
    console.log("[VOICE-LIMIT] course_v2: лимит исчерпан -> пейвол", VOICE_LIMIT_PAYWALL_CONTEXT); // guard-ok: ветка решения
    // литерал контекста нужен сторожу точек входа пейвола (tests/paywall_entry_callsite_registry_contract): значение то же, что VOICE_LIMIT_PAYWALL_CONTEXT
    router.push({ pathname: "/premium_modal", params: { context: "ai_voice_input", source: "learning_v2_course_voice" } } as never);
  }, [router]);
  // зачем (владелец 17.10, координатор): голосовых заданий больше, чем попыток у Free на сегодня — предупреждаем ДО первого
  // задания, поверх вступления, без сети, раз на запуск занятия. Решаем только пока идёт вступление: позже остаток падает от
  // собственных записей занятия, и окно посреди занятия было бы ложной тревогой. 'unknown' — молчим (app/learning_v2_voice_headsup_v1.ts).
  const voiceHeadsupTasks = useMemo(
    () => countLearningV2VoiceTasksV1(material?.learnerChild.interactions ?? []),
    [material],
  );
  const [voiceHeadsupOpen, setVoiceHeadsupOpen] = useState(false);
  const voiceHeadsupLoggedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!material || introDone) return;
    const runId = sessionRunIdRef.current;
    const result = decideLearningV2VoiceHeadsupV1({
      allowance: voiceAllowance,
      voiceTasks: voiceHeadsupTasks,
      alreadyShownForRun: wasLearningV2VoiceHeadsupShownV1(runId),
    });
    const logKey = `${runId}:${result.decision}:${result.remaining}`;
    if (voiceHeadsupLoggedRef.current !== logKey) {
      voiceHeadsupLoggedRef.current = logKey;
      logLearningV2VoiceHeadsupV1(result, { lessonOrdinal, sessionOrdinal, kind: voiceAllowance.kind });
    }
    if (result.decision !== "show") return;
    markLearningV2VoiceHeadsupShownV1(runId);
    setVoiceHeadsupOpen(true);
  }, [introDone, lessonOrdinal, material, sessionOrdinal, voiceAllowance, voiceHeadsupTasks]);
  const voiceHeadsupTryPlus = useCallback(() => {
    console.log("[VOICE-HEADSUP] tap: Попробовать Plus → пейвол"); // guard-ok: одна строка на тап
    setVoiceHeadsupOpen(false);
    openVoicePlus();
  }, [openVoicePlus]);
  const voiceHeadsupStartAnyway = useCallback(() => {
    console.log("[VOICE-HEADSUP] tap: Начать всё равно"); // guard-ok: одна строка на тап
    setVoiceHeadsupOpen(false);
  }, []);
  const voiceTargetText = practice
    ? material?.factoryPracticeSemantics?.[practice.interactionId]
        ?.canonicalTarget ?? auxiliary?.save.targetText ?? ""
    : "";
  // зачем (R49, 15.10): короткий код «es» вместо «es-ES» не гарантирует нужный распознаватель — точная локаль из общей таблицы.
  const voiceRecognitionLocale = studySpeechLocale(runSummary?.targetLanguage ?? studyTarget, "learning_v2");
  previewSpeechLocaleRef.current = voiceRecognitionLocale; // предпросмотр слова — тем же языком, что и распознавание
  const cancelVoiceCapture = useCallback(() => {
    setVoiceHoldActive(false);
    setModeVoiceStatus("idle");
    setVoicePanelEpoch((value) => value + 1);
  }, []);
  voiceCancelRef.current = cancelVoiceCapture;
  const voiceCaptureActive =
    modeVoiceStatus === "requesting" ||
    modeVoiceStatus === "listening";
  const voiceControlDisabled =
    voiceFooterDisabled || modeVoiceStatus === "finishing";
  // зачем (координатор 15.10, «не засчитано» по эталону Макетов 91eee157a, строгая проверка речи): при провале — фраза целиком с подсвеченными пропущенными словами и строкой «Не услышали слово «X» — скажи
  // фразу целиком»; пропущенные слова — из результата панели (`missingWords`). Пусто (слово не названо) — прежняя карточка «Ты сказал(а)».
  const voiceFailWords: readonly string[] =
    voiceAttemptResult && !voiceAttemptResult.passed && voiceTargetText && voiceAttemptResult.reason === "missing_words" ? voiceAttemptResult.missingWords : [];
  const voiceResultAccessibilityLabel = voiceAttemptResult
    ? (() => {
        const stars = starsForScore(
          voiceAttemptResult.score,
          SPEECH_PRONUNCIATION_PASS_THRESHOLD,
        );
        const verdict = voiceAttemptResult.passed
          ? triLang(lang, {
              ru: "засчитано", uk: "зараховано", en: "passed", es: "aprobado",
              "pt-BR": "aprovado", vi: "đã đạt", id: "lulus", tr: "geçti", pl: "zaliczone",
            })
          : triLang(lang, {
              ru: "попробуй ещё раз", uk: "спробуй ще раз", en: "try again", es: "inténtalo de nuevo",
              "pt-BR": "tente novamente", vi: "thử lại", id: "coba lagi", tr: "tekrar dene", pl: "spróbuj ponownie",
            });
        return triLang(lang, {
          ru: `${stars} из 3 звёзд, ${verdict}. Ты сказал(а): ${voiceAttemptResult.transcript}`,
          uk: `${stars} з 3 зірок, ${verdict}. Ти сказав(ла): ${voiceAttemptResult.transcript}`,
          en: `${stars} of 3 stars, ${verdict}. You said: ${voiceAttemptResult.transcript}`,
          es: `${stars} de 3 estrellas, ${verdict}. Dijiste: ${voiceAttemptResult.transcript}`,
          "pt-BR": `${stars} de 3 estrelas, ${verdict}. Você disse: ${voiceAttemptResult.transcript}`,
          vi: `${stars} trên 3 sao, ${verdict}. Bạn đã nói: ${voiceAttemptResult.transcript}`,
          id: `${stars} dari 3 bintang, ${verdict}. Kamu berkata: ${voiceAttemptResult.transcript}`,
          tr: `3 yıldızdan ${stars}, ${verdict}. Şunu söyledin: ${voiceAttemptResult.transcript}`,
          pl: `${stars} z 3 gwiazdek, ${verdict}. Powiedziano: ${voiceAttemptResult.transcript}`,
        });
      })()
    : undefined;
  const startVoiceHold = useCallback(() => {
    if (
      sessionAttempts.state.phase !== "active" ||
      !showVoiceFooter ||
      voiceControlDisabled
    ) return;
    // гейт после проверок доступности кнопки: в выключенном состоянии тап не должен открывать пейвол
    if (!voiceDailyAllowanceGate("course_v2", { accessResolved, hasPremiumAccess })) {
      openVoicePlus();
      return;
    }
    stopPreviewAudio();
    managedAudio.stop();
    setAudioRequest(null);
    setPreviewSpeechKey(null);
    setVoiceAttemptResult(null);
    void hapticTap();
    setVoiceHoldActive(true);
  }, [
    accessResolved,
    hasPremiumAccess,
    managedAudio,
    openVoicePlus,
    sessionAttempts.state.phase,
    showVoiceFooter,
    stopPreviewAudio,
    voiceControlDisabled,
  ]);
  const stopVoiceCapture = useCallback(() => {
    setVoiceHoldActive(false);
  }, []);
  const toggleVoiceFromAccessibility = useCallback(() => {
    if (voiceCaptureActive) {
      stopVoiceCapture();
      return;
    }
    startVoiceHold();
  }, [startVoiceHold, stopVoiceCapture, voiceCaptureActive]);
  const finish = useCallback(async () => {
    if (!run || finishing || finishingRef.current || !runSummary) return;
    finishingRef.current = true;
    setFinishing(true);
    setFinaleRewardsSettled(false);
    let earned: 0 | 1 | 2 | 3 = 0;
    // зачем (аудит кнопок R58 #40, 15.10): исключение ДО подсчёта звёзд давало «0 звёзд» без объяснения — человек думал, что провалил занятие
    let starsCounted = false;
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
      const starCompletions = learningV2StarEligibleCompletionsV1(
        completion.interactionCompletions,
        deviceSkippedVoiceIdsRef.current,
      );
      if (starCompletions.length !== completion.interactionCompletions.length)
        console.warn("[SPEECH-AVAIL] learning-v2 finish: voice tasks skipped on device excluded from stars", JSON.stringify({
          skipped: completion.interactionCompletions.length - starCompletions.length,
          total: completion.interactionCompletions.length,
        }));
      earned = learningV2SessionStars(starCompletions);
      starsCounted = true;
      const passedSession = learningV2SessionUnlocksNextV1(earned);
      if (isCheckpoint) {
        // «Что вы теперь умеете»: по типу задания — всё с первой попытки → «Закрепилось»,
        // иначе «Стоит повторить». «Провалено» не бывает by design.
        const byFamily = new Map<string, boolean>();
        for (let index = 0; index < runSummary.practiceInteractionCount; index += 1) {
          const interaction = getLearningV2CourseSessionPracticeInteractionV1(run, index);
          const entry = completionsRef.current.get(interaction.interactionId);
          const clean = entry?.disposition === "completed" &&
            entry.learnerAttempts <= 1 && !entry.hintUsed;
          byFamily.set(interaction.family, (byFamily.get(interaction.family) ?? true) && clean);
        }
        setFinaleSkills(
          [...byFamily.entries()].map(([family, confirmed]) => ({
            id: family,
            label: copy.modes[family] ?? copy.independent,
            confirmed,
          })),
        );
      }
      publishFinaleFacts({
        runes: sessionRunes,
        credit: canEarnSessionRunes ? "practice" : undefined,
        total: completion.interactionCompletions.length,
        firstTry: completion.interactionCompletions.filter(entry =>
          entry.disposition === "completed" && entry.learnerAttempts <= 1 && !entry.hintUsed
        ).length,
        elapsedMs: Math.max(0, Date.now() - (sessionStartedAtRef.current ?? Date.now())),
      });
      if (isAuthoringPreview) {
        // preview_only_no_learner_writes: the owner sees the real completion
        // scene, but no progress, stars, spool or telemetry is persisted.
        sessionStageRef.current = "finale";
        setFinaleStars(earned);
        return;
      }
      const accountToken = captureAccountGeneration();
      const stableId =
        accountToken.phase === "active" && accountToken.stableId
          ? accountToken.stableId
          : await getStableId();
      const accountScopeHash =
        deriveLocalOfflineProgressAccountScopeHash(stableId);
      if (passedSession) {
        const commitLocalProgress = async () => {
          await createLearningV2CourseLocalProgressStoreV1(AsyncStorage).complete(
            accountScopeHash,
            runSummary.courseSessionId,
          );
        };
        try {
          await commitLocalProgress();
        } catch (error: unknown) {
          DebugLogger.error(
            "learning_v2_direct_session_player_v1:local_progress_retry_scheduled",
            error instanceof Error ? error : new Error(String(error)),
            "warning",
          );
          void retryLearningV2LocalCompletionV1({
            commit: commitLocalProgress,
            onAttemptFailure: (retryError, attempt) => {
              DebugLogger.error(
                `learning_v2_direct_session_player_v1:local_progress_retry:${attempt}`,
                retryError instanceof Error
                  ? retryError
                  : new Error(String(retryError)),
                "warning",
              );
            },
          });
        }
      }
      // Local completion owns the next frame after the one-star gate. A
      // zero-star attempt reaches the same finale but leaves this node current.
      sessionStageRef.current = "finale";
      setFinaleStars(earned);
      // This is only the background synchronization journal. It never owns
      // completion, navigation or rewards and therefore never blocks the user.
      if (passedSession) {
        // зачем (D49, «Сегодня»): пройденная сессия Learning V2 = «Пройти урок».
        // Тот же ключ на повтор финала не засчитывается дважды (store идемпотентен).
        void recordTodayTaskActivity({
          kind: "lesson",
          unitKey: `v2:${runSummary?.targetLanguage ?? "unknown"}:${runSummary?.courseSessionId ?? "unknown"}`,
          source: "learning_v2_direct_session",
        });
        const appendCompletionForBackgroundSync = async () => {
          await createLearningV2CourseSessionCompletedSpoolV1(AsyncStorage).append(
            accountScopeHash,
            completion,
          );
        };
        void retryLearningV2LocalCompletionV1({
          commit: appendCompletionForBackgroundSync,
          onAttemptFailure: (error, attempt) => {
            DebugLogger.error(
              `learning_v2_direct_session_player_v1:completion_sync_spool:${attempt}`,
              error instanceof Error ? error : new Error(String(error)),
              "warning",
            );
          },
        });
      }
      if (runSummary.targetLanguage === "en" && canEarnSessionRunes) {
        try {
          if (!readyHandle)
            throw new Error("learning_v2_session_rune_reward_ready_evidence_missing");
          const publicationToken =
            resolveLearningV2SessionRuneRewardPublicationTokenV1(readyHandle);
          const runeReward = createLearningV2SessionRuneRewardCompositeV1({
            accountScopeHash: deriveLearningV2EconomicAccountScopeHash(stableId),
            run,
            completion,
            publicationToken: publicationToken,
            earnedAtMs: runeRewardEarnedAtMsRef.current,
          });
          const commitSessionRuneReward = () =>
            commitLearningV2SessionRuneRewardCompositeV1({
              candidate: runeReward,
              publicationToken: publicationToken,
            });
          try {
            // The runtime persists the verified intent before repository mount.
            // Its receipt enriches the finale but never owns navigation.
            const runeCommit = await commitSessionRuneReward();
            publishFinaleFacts({
              ...finaleFactsRef.current,
              runes: runeCommit.appliedReceipt.amountSubunits /
                WALLET_SUBUNITS_PER_STAR,
              credit: runeCommit.status === "applied" ? "credited" : "existing",
            });
          } catch (error: unknown) {
            DebugLogger.error(
              "learning_v2_direct_session_player_v1:rune_retry_scheduled",
              error instanceof Error ? error : new Error(String(error)),
              "warning",
            );
            void retryLearningV2LocalCompletionV1({
              commit: async () => {
                await commitSessionRuneReward();
              },
              onAttemptFailure: (retryError, attempt) => {
                DebugLogger.error(
                  `learning_v2_direct_session_player_v1:rune_retry:${attempt}`,
                  retryError instanceof Error
                    ? retryError
                    : new Error(String(retryError)),
                  "warning",
                );
              },
            });
          }
        } catch (error: unknown) {
          // Provenance/eligibility failures stay fail-closed and are never
          // converted into a retryable economic intent.
          DebugLogger.error(
            "learning_v2_direct_session_player_v1:rune_provenance",
            error instanceof Error ? error : new Error(String(error)),
            "warning",
          );
        }
      }
      // зачем (владелец, 22.08): звёзды 0–3 на пройденных узлах карты. Пишем в
      // ОТДЕЛЬНУЮ витрину, а не в канонический прогресс — тот объявляет
      // masteryAuthority: "none" и запечатан fingerprint'ом. Сбой записи здесь
      // не может помешать завершению сессии: функция глотает свои ошибки.
      await recordLearningV2SessionStarResult({
        accountScopeHash,
        courseSessionId: runSummary.courseSessionId,
        stars: earned,
      });
      // Progress is already saved; leaving the receipt never depends on its animation.
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
    } catch (error: unknown) {
      DebugLogger.error(
        "learning_v2_direct_session_player_v1:finish",
        error instanceof Error ? error : new Error(String(error)),
        "critical",
      );
      if (!starsCounted) {
        console.warn("[V2-FINISH] stars_not_counted", JSON.stringify({ reason: error instanceof Error ? error.message : String(error) })); // guard-ok: причина в журнале
        emitAppEvent("action_toast", actionToastTri("error", {
          ru: "Не получилось подсчитать звёзды. Пройди занятие ещё раз",
          uk: "Не вдалося порахувати зірки. Пройди заняття ще раз",
          en: "We couldn't count your stars. Please take the session again",
          es: "No pudimos contar tus estrellas. Haz la sesión otra vez",
          "pt-BR": "Não conseguimos contar suas estrelas. Faça a sessão de novo",
          vi: "Không tính được số sao. Hãy học lại buổi này",
          id: "Bintang tidak bisa dihitung. Ulangi sesi ini",
          tr: "Yıldızlar hesaplanamadı. Oturumu tekrar yap",
          pl: "Nie udało się policzyć gwiazdek. Przejdź zajęcia jeszcze raz",
        }));
      } else {
        // зачем (Ревизор 15.10, 🟡 к #40): звёзды уже засчитаны, но сбой при сохранении проходил молча — человек должен знать.
        // зачем (Ревизор 15.10, 🟡 к e85eb2ccb): «Проверь интернет» — только когда виновата сеть; локальный сбой (диск, данные) тот же совет
        // дал бы ложный след. Сеть узнаём по коду/тексту ошибки; всё прочее — нейтральное «не получилось сохранить результат».
        const reason = error instanceof Error ? error.message : String(error);
        const code = typeof (error as { code?: unknown } | null)?.code === "string" ? (error as { code: string }).code : "";
        const networkFailure = /network|offline|timeout|timed out|unavailable|fetch|internet|connection/i.test(`${code} ${reason}`);
        console.warn("[V2-FINISH] save_failed_after_stars", JSON.stringify({ reason, code: code || null, networkFailure })); // guard-ok: причина в журнале
        emitAppEvent("action_toast", actionToastTri("error", networkFailure ? {
          ru: "Не получилось сохранить. Проверь интернет",
          uk: "Не вдалося зберегти. Перевір інтернет",
          en: "We couldn't save. Check your connection",
          es: "No pudimos guardar. Revisa tu conexión",
          "pt-BR": "Não conseguimos salvar. Verifique sua conexão",
          vi: "Không lưu được. Hãy kiểm tra kết nối",
          id: "Gagal menyimpan. Periksa koneksimu",
          tr: "Kaydedilemedi. Bağlantını kontrol et",
          pl: "Nie udało się zapisać. Sprawdź połączenie",
        } : {
          ru: "Не получилось сохранить результат",
          uk: "Не вдалося зберегти результат",
          en: "We couldn't save your result",
          es: "No pudimos guardar tu resultado",
          "pt-BR": "Não conseguimos salvar seu resultado",
          vi: "Không lưu được kết quả",
          id: "Hasilmu gagal disimpan",
          tr: "Sonucun kaydedilemedi",
          pl: "Nie udało się zapisać wyniku",
        }));
      }
    } finally {
      // A completed learning interaction never turns into a save-error screen.
      // Local persistence retries and synchronization stay invisible/background.
      sessionStageRef.current = "finale";
      setFinaleRewardsSettled(true);
      setFinaleStars(earned);
      finishingRef.current = false;
      setFinishing(false);
    }
  }, [
    finishing,
    canEarnSessionRunes,
    sessionRunes,
    copy,
    isAuthoringPreview,
    isCheckpoint,
    isSessionRepeat,
    lang,
    material,
    publishFinaleFacts,
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

  const firstVoicePracticeIndex = resolveLearningV2Session1VoiceDevJumpV1({
    isDev: __DEV__,
    lessonOrdinal,
    sessionOrdinal,
    interactions: material?.learnerChild.interactions ?? [],
  });
  const canDevJumpToFirstVoicePractice =
    firstVoicePracticeIndex !== null;
  const jumpToFirstVoicePractice = useCallback(() => {
    runLearningV2Session1VoiceDevJumpV1(firstVoicePracticeIndex, {
      settleSkippedPrefix: (targetPracticeIndex) => {
        const skippedInteractionIds = [
          ...(material?.introChild.pages.map(
            (page) => page.question.interactionId,
          ) ?? []),
          ...(material?.learnerChild.interactions
            .slice(0, targetPracticeIndex)
            .map((interaction) => interaction.interactionId) ?? []),
        ];
        skippedInteractionIds.forEach((interactionId) => {
          if (completionsRef.current.has(interactionId)) return;
          completionsRef.current.set(interactionId, {
            interactionId,
            disposition: "skipped",
            learnerAttempts: 0,
            hintUsed: false,
          });
        });
      },
      enterPractice: () => {
        void hapticTap();
        sessionStageRef.current = "practice";
        setIntroDone(true);
      },
      showPracticeIndex,
    });
  }, [
    firstVoicePracticeIndex,
    material,
    showPracticeIndex,
  ]);
  const devJumpToVoiceButton = canDevJumpToFirstVoicePractice ? (
    <View
      pointerEvents="box-none"
      style={[
        styles.devJumpToVoiceDock,
        { bottom: insets.bottom + 86 },
      ]}
    >
      <Pressable
        testID="learning-v2-dev-jump-to-voice"
        accessibilityRole="button"
        accessibilityLabel="DEV: перейти к первому заданию Устно" /* i18n-ok: подпись dev-кнопки перехода к Устно, только тестовая сессия */
        accessibilityHint="Пропускает интро и предыдущие задания только в этой тестовой сессии" /* i18n-ok: подсказка dev-кнопки, только тестовая сессия */
        onPress={jumpToFirstVoicePractice}
        style={({ pressed }) => [
          styles.devJumpToVoiceButton,
          {
            backgroundColor: g.accent,
            boxShadow: actionBoxShadow(g),
            opacity: pressed ? 0.72 : 1,
          },
        ]}
      >
        <Ionicons name="mic" size={18} color={g.ctaInk} />
        <Text style={[styles.devJumpToVoiceText, { color: g.accentInk }]}>
          DEV · К УСТНО
          {/* i18n-ok: dev-кнопка перехода к Устно, только тестовая сессия */}
        </Text>
      </Pressable>
    </View>
  ) : null;

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

  // зачем (§SPEECH-NA): на устройстве без распознавателя голосовой шаг не
  // блокирует занятие — «Дальше» сразу доступна и закрывает шаг как пропущенный.
  const skipVoicePracticeOnDevice = useCallback(() => {
    if (!practice || !runSummary || !voiceSkipOnDevice || finishing) {
      console.warn("[SPEECH-AVAIL] learning-v2 skip: ignored", JSON.stringify({
        hasPractice: Boolean(practice), hasRun: Boolean(runSummary), voiceSkipOnDevice, finishing,
      }));
      return;
    }
    void hapticTap();
    completionsRef.current.set(
      practice.interactionId,
      learningV2DeviceSkippedVoiceCompletionV1(practice.interactionId),
    );
    deviceSkippedVoiceIdsRef.current.add(practice.interactionId);
    const isLast = practiceIndex + 1 >= runSummary.practiceInteractionCount;
    console.warn("[SPEECH-AVAIL] learning-v2 skip: voice task skipped on device", JSON.stringify({
      interactionId: practice.interactionId, practiceIndex, isLast,
    }));
    if (isLast) {
      void finish();
      return;
    }
    showPracticeIndex(practiceIndex + 1);
  }, [finish, finishing, practice, practiceIndex, runSummary, showPracticeIndex, voiceSkipOnDevice]);

  const resetLearningV2AfterSessionRuneForfeit = useCallback(() => {
    setShowAttemptsModal(false);
    setSessionRunes(0);
  }, []);

  // зачем (2026-09-03): без hydrated автосброс молча не запускался и экран
  // намертво замирал под блокировщиком ввода после трёх ошибок.
  useSessionAttemptAutoReset({
    phase: sessionAttempts.state.phase,
    hydrated: sessionAttempts.hydrated,
    hydrationTrusted: sessionAttempts.hydrationTrusted,
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
    // зачем: владелец 21.09 — «вышел из сессии (закрыл её) и написано этой
    // сессии больше недоступна — такого экрана не должно быть НИКОГДА».
    // exitLearningV2Session зовёт router.replace, но React успевает
    // отрендерить этот компонент ЕЩЁ РАЗ до размонтирования, а параметры
    // маршрута к тому моменту уже пусты → routeCoordinates === null → сюда.
    // Человек видел ошибку вместо выхода.
    // При запрошенном выходе рисуем пустой фон под цвет темы: экран всё
    // равно уходит в следующем кадре. Саму ветку НЕ удаляем — она нужна,
    // когда экран реально открыли с битым маршрутом.
    if (sessionExitRequestedRef.current) {
      if (__DEV__) {
        console.log(
          "[V2-SESSION] unavailable:suppressed_on_exit",
          JSON.stringify({
            reason: "exit_requested",
            hasLocator: Boolean(locator),
            lessonOrdinal,
            sessionOrdinal,
          }),
        );
      }
      return <View style={[styles.center, { backgroundColor: g.bg }]} />;
    }
    // Ранний выход обязан называть причину (правило «сперва логи»).
    if (__DEV__) {
      console.log(
        "[V2-SESSION] unavailable:shown",
        JSON.stringify({
          hasLocator: Boolean(locator),
          lessonOrdinal,
          sessionOrdinal,
          routeId: first(params.id) ?? null,
        }),
      );
    }
    // зачем (сверка с learning-v2.html unavailable, 05.10): вид — общий компонент: шапка с крестиком, пояснение,
    // маленькая «Назад». Решения и логи [V2-SESSION] выше не менялись.
    return (
      <LearningV2SessionUnavailable
        title={copy.unavailable}
        hint={learningV2SessionUnavailableDefaultHint(lang)}
        backLabel={footerBackLabel}
        closeLabel={copy.close}
        onBack={() => safeRouterBack(router, exitRoute)}
        onClose={exitLearningV2Session}
      />
    );
  }
  if (finaleStars !== null) {
    // Presentation mounts immediately; rewardsSettled keeps its details/CTA
    // inert until the local legacy reward/rune barrier publishes the final snapshot.
    return <HorizonSessionResult
      lesson={lessonOrdinal}
      sessionOrdinal={sessionOrdinal}
      sessionId={`${runSummary?.courseSessionId ?? `learning-v2:${lessonOrdinal}:${sessionOrdinal}`}:${sessionRunIdRef.current}`}
      kind={sessionRole === "final_exam"
        ? lessonOrdinal === 32 ? "final" : "lesson"
        : isCheckpoint ? "chapter" : "session"}
      stars={finaleStars}
      facts={finaleFacts}
      lang={lang}
      reducedMotion={reducedMotion}
      rewardsSettled={finaleRewardsSettled}
      preview={isAuthoringPreview}
      mistakes={sessionMistakesRef.current}
      mistakesTotal={sessionMistakesRef.current.length}
      onOpenAllMistakes={
        !isAuthoringPreview && (studyTarget === "en" || studyTarget === "fr")
          ? () => { router.push("/mistakes_hub" as never); }
          : undefined
      }
      skills={finaleSkills}
      nextLessonAvailable={lessonOrdinal !== null && lessonOrdinal < 32 &&
        isPulseLessonAuthored(lessonOrdinal + 1) &&
        FACTORY_NATIVE_SESSION_IDS.has(
          learningV2CourseSessionIdV1(lessonOrdinal + 1, 1),
        )}
      onContinue={() => { void hapticTap(); safeRouterBack(router, exitRoute); }}
    />;
  }
  if (
    (!readyHandle && !isAuthoringPreview) ||
    !run ||
    !runSummary ||
    !introScreens ||
    !introIds
  ) {
    // зачем: та же ловушка, что и выше (владелец 21.09, «такого экрана не
    // должно быть НИКОГДА»). При закрытии сессии run/runSummary обнуляются,
    // и последний кадр перед уходом показывал ошибку. Чинить надо ОБЕ
    // ветки: починка одной оставляла баг живым на втором пути.
    if (sessionExitRequestedRef.current) {
      if (__DEV__) {
        console.log(
          "[V2-SESSION] unavailable:suppressed_on_exit",
          JSON.stringify({
            reason: "exit_requested_run_gone",
            hasRun: Boolean(run),
            hasRunSummary: Boolean(runSummary),
          }),
        );
      }
      return <View style={[styles.center, { backgroundColor: g.bg }]} />;
    }
    // Ранний выход обязан называть причину (правило «сперва логи»).
    if (__DEV__) {
      console.log(
        "[V2-SESSION] unavailable:shown",
        JSON.stringify({
          reason: "run_not_ready",
          hasReadyHandle: Boolean(readyHandle),
          hasRun: Boolean(run),
          hasRunSummary: Boolean(runSummary),
          hasIntroScreens: Boolean(introScreens),
          loadFailureReason: loadFailureReason ?? null,
        }),
      );
    }
    return (
      <View style={styles.screen}>
        <LearningV2SessionUnavailable
          title={copy.unavailable}
          hint={learningV2SessionUnavailableDefaultHint(lang)}
          backLabel={footerBackLabel}
          closeLabel={copy.close}
          onBack={() => safeRouterBack(router, exitRoute)}
          onClose={exitLearningV2Session}
          devReason={loadFailureReason ?? null}
          retry={isAuthoringPreview ? { label: copy.retry, onPress: () => setLoadRevision((value) => value + 1) } : null}
        />
        {/* зачем (владелец 23.09): в боевом режиме у «Повторить» НЕ БЫЛО ни
            одного успешного исхода — повтор снова упирался в отсутствующий
            мост. Кнопка обещала то, чего механизм не умел. Боевой путь теперь
            вообще не доходит сюда (уходит на карту), а здесь повтор осмыслен
            только в авторском превью, где материал берётся из бандла —
            поэтому retry передаётся в вид только при isAuthoringPreview. */}
      </View>
    );
  }

  if (isCheckpoint && !checkpointEntryDone) {
    const chapter = Math.ceil((sessionOrdinal ?? 8) / 8);
    const isFinal = sessionRole === "final_exam";
    // зачем (learning-v2.html, checkEntry): вход в проверку главы / итоговый экзамен —
    // плитка 140 с кубком, заголовок 30/700, пояснение 17 и кнопка «Начать проверку» на токенах
    // темы. Прежний иллюстрированный «портал» уехал вместе со своей палитрой; сам вход и
    // порядок (setCheckpointEntryDone → practice) не менялись.
    // зачем (сверка с learning-v2.html checkEntry, 05.10): шапка .shd — крестик выхода, попытки и энергия (без
    // полосы прогресса); контент сверху в 96 от шапки, плитка 140 с кубком 26, пилюля «Подсказки выключены»,
    // кнопка «Начать проверку →» закреплена внизу (.fx). Раньше не было ни выхода, ни пилюли, всё стояло по центру.
    return (
      <View style={[styles.screen, { backgroundColor: g.bg }]}>
        <View style={[styles.checkpointHeader, { paddingTop: insets.top + 8 }]}>
          <Pressable
            testID="learning-v2-checkpoint-close"
            accessibilityRole="button"
            accessibilityLabel={copy.close}
            hitSlop={8}
            onPress={exitLearningV2Session}
            style={({ pressed }) => [
              styles.checkpointClose,
              { backgroundColor: g.buttonFill, boxShadow: nestedBoxShadow(g), opacity: pressed ? 0.72 : 1 },
            ]}
          >
            <KitGlassLayer radius={21} />
            <Ionicons name="close" size={20} color={g.text} />
          </Pressable>
          <View style={styles.screen} />
          <SessionAttemptsHud
            glassPill={heartsPill}
            remaining={sessionAttempts.state.remainingAttempts} attempts={sessionAttempts}
            locale={lang}
            testID="learning-v2-checkpoint-attempts"
          />
          {sessionAttempts.mistakeChargeActive ? null : <EnergyBar glass />}
        </View>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={[styles.checkpointBodyWrap, { paddingBottom: insets.bottom + 120 }]}
        >
          <View style={[styles.checkpointTile, { backgroundColor: g.opaqueCard, shadowColor: g.bg }]}>
            <Ionicons name={isFinal ? "trophy" : "trophy-outline"} size={26} color={g.text} />
          </View>
          <Text style={[styles.checkpointTitle, { color: g.text, lineHeight: lh(36) }]}>
            {isFinal
              ? checkpointCopy.finalTitle
              : checkpointCopy.entryTitle(chapter)}
          </Text>
          <Text style={[styles.checkpointBody, { color: g.secondary, lineHeight: lh(24) }]}>
            {isFinal ? checkpointCopy.finalBody : checkpointCopy.entryBody}
          </Text>
          <View testID="learning-v2-checkpoint-no-hints" style={[styles.checkpointPill, { backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) }]}>
            <Ionicons name="lock-closed" size={16} color={g.text} />
            <Text style={[styles.checkpointPillText, { color: g.text, lineHeight: lh(21) }]}>{checkpointCopy.noHints}</Text>
          </View>
        </ScrollView>
        <View style={[styles.checkpointFooter, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]} pointerEvents="box-none">
          <Lv2Cta
            accessibilityLabel={checkpointCopy.start}
            onPress={() => {
              sessionStageRef.current = "practice";
              setCheckpointEntryDone(true);
              setIntroDone(true);
            }}
            right={<Ionicons name="arrow-forward" size={20} color={g.accentInk} />}
          >
            {checkpointCopy.start}
          </Lv2Cta>
        </View>
      </View>
    );
  }

  const runeHud = (
    <Animated.View style={runeBumpStyle}>
      <View
        ref={runeCounterRef}
        collapsable={false}
        testID="learning-v2-session-runes"
        accessible
        accessibilityLabel={learningV2RuneAccessibilityLabelV1(lang, sessionRunes)}
        style={[styles.runeCounter, { backgroundColor: g.opaqueControl }]}
      >
        <Image
          source={HOME_RUNE_ICON_SOURCE}
          style={styles.runeAsset}
          contentFit="contain"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={[styles.runeCounterText, { color: g.text }]}>{sessionRunes}</Text>
      </View>
    </Animated.View>
  );
  const runeFlightOverlay = runeFlight ? (
    <CoinRewardFlight
      key={runeFlight.key}
      from={runeFlight.from}
      to={runeFlight.to}
      count={runeFlight.count}
      onDone={() => setRuneFlight((current) => current?.key === runeFlight.key ? null : current)}
    />
  ) : null;

  if (!introDone) {
    return (
      <View style={[styles.screen, { backgroundColor: g.bg }]}>
        <View
          style={styles.screen}
          pointerEvents={
            isAttemptsInputBlocked(sessionAttempts.state.phase)
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
            runeAwardOriginRef={runeAwardOriginRef}
            onQuestionComplete={(entry) => {
              const award = learningV2InteractionRuneAwardV1(entry);
              if (award === 0) return;
              const claimed = runeAwardLedgerRef.current.claim(entry.taskId, award);
              if (claimed !== 0) awardSessionRunes(claimed);
            }}
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
              if (isAttemptsStopEffect(attemptEffect)) return "wrong";
              return "wrong";
            }}
            resolveSecondWrongExplanation={(interactionId, choiceIndex, responseId) => {
              const auxiliaryEntry = getLearningV2CourseSessionAuxiliaryEntryV1(run, interactionId);
              return auxiliaryEntry.responseFeedbackById?.[
                responseId ?? `${interactionId.replace(/:q$/u, "")}:r${choiceIndex + 1}`
              ]?.[lang] ?? auxiliaryEntry.secondErrorExplanationByLocale[lang];
            }}
            resolveChoiceAnalysis={(interactionId, choiceIndex, responseId) => {
              const auxiliaryEntry = getLearningV2CourseSessionAuxiliaryEntryV1(run, interactionId);
              const resolvedResponseId = responseId ?? `${interactionId.replace(/:q$/u, "")}:r${choiceIndex + 1}`;
              const analysis = auxiliaryEntry.responseAnalysisById?.[resolvedResponseId]?.[lang];
              if (!analysis) return null;
              return {
                analysis,
                diagnostics: auxiliaryEntry.responseDiagnosticsById?.[resolvedResponseId] ?? null,
              };
            }}
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
            onBack={exitLearningV2Session}
            headerAccessory={
              <View style={styles.headerActions}>
              <SessionAttemptsHud
                glassPill={heartsPill}
                remaining={sessionAttempts.state.remainingAttempts} attempts={sessionAttempts}
                locale={lang}
                testID="learning-v2-intro-attempts"
              />
              {sessionAttempts.mistakeChargeActive ? null : <EnergyBar glass />}
              {/* зачем (координатор 15.10, макет learning-v2.html): в шапке ИНТРО только сердца и энергия — плашка монет отнимала место у подписи этапа («СМЫС»/«Л»). Монеты считаются как прежде (settleSessionRuneAward), видны в шапке заданий; без плашки не летит лишь декоративная монета. */}
              </View>
            }
          />
        </View>
        {devJumpToVoiceButton}
        {runeFlightOverlay}
        <LearningV2VoiceHeadsupSheet
          visible={voiceHeadsupOpen}
          lang={lang}
          voiceTasks={voiceHeadsupTasks}
          remaining={voiceAllowance.remaining ?? 0}
          onTryPlus={voiceHeadsupTryPlus}
          onStartAnyway={voiceHeadsupStartAnyway}
        />
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
    <View style={[styles.screen, { backgroundColor: g.bg }]}>
      {/* зачем: D72 — сюда доходим только когда первое задание на экране → сигнал гейту энергии. */}
      <LearningV2FirstQuestionShownReporter />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          testID="learning-v2-session-close"
          accessibilityRole="button"
          accessibilityLabel={copy.close}
          hitSlop={10}
          onPress={exitLearningV2Session}
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: g.buttonFill, opacity: pressed ? 0.72 : 1 },
          ]}
        >
          <Ionicons name="close" size={22} color={g.text} />
        </Pressable>
        <View style={styles.progressColumn}>
          <View
            style={[styles.progressTrack, { backgroundColor: g.opaqueControl }]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: g.accent,
                  width: `${Math.max(4, Math.round((progressOrdinal / totalInteractions) * 100))}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: g.secondary }]}>
            {progressOrdinal} / {totalInteractions}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <SessionAttemptsHud
            glassPill={heartsPill}
            remaining={sessionAttempts.state.remainingAttempts} attempts={sessionAttempts}
            locale={lang}
            testID="learning-v2-session-attempts"
          />
          {/* зачем (learning-v2.html, шапка занятия): пилюля энергии рядом с попытками; у Plus
              EnergyBar сам не рисуется («Plus — энергии нет»). Только показ, трата — в гейте. */}
          {sessionAttempts.mistakeChargeActive ? null : <EnergyBar glass />}
          {runeHud}
        </View>
      </View>
      <View
        testID="learning-v2-session-practice-interaction-gate"
        style={styles.screen}
        pointerEvents={
          practiceActivated &&
          !isAttemptsInputBlocked(sessionAttempts.state.phase)
            ? "auto"
            : "none"
        }
        importantForAccessibility={
          practiceActivated &&
          !isAttemptsInputBlocked(sessionAttempts.state.phase)
            ? "auto"
            : "no-hide-descendants"
        }
      >
        <LearningV2PracticeViewport>
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
                prompt={learnerFacingPracticePrompt}
                options={displayedResponseOptions}
                selectedChoiceId={selectedChoiceId}
                orderedResponseIds={orderedIds}
                wrongNudge={wrongNudge}
                reducedMotion={reducedMotion}
                resolved={result === "correct"}
                explanation={wrongExplanation}
                learnerFeedback={learnerFeedback}
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
            // явной веткой здесь же. Общий SpeakingPanel и крупная mic-кнопка
            // размещены сразу под заданием; footer больше не прячет главное
            // действие голосового режима.
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
                prompt={learnerFacingPracticePrompt}
                options={displayedResponseOptions}
                selectedChoiceId={selectedChoiceId}
                orderedResponseIds={orderedIds}
                wrongNudge={wrongNudge}
                reducedMotion={reducedMotion}
                resolved={result === "correct"}
                explanation={wrongExplanation}
                learnerFeedback={learnerFeedback}
                referenceAudioState={referenceAudioState}
                voiceStatus={modeVoiceStatus}
                transcript={transcript}
                instruction={practice.scriptedAlternate?.instruction ?? null}
                attemptSubmitted={
                  voiceAttemptSubmitted || result === "correct"
                }
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
                <View style={[styles.modeIcon, { backgroundColor: g.opaqueControl }]}>
                  <Ionicons
                    name={MODE_ICONS[practice.family]}
                    size={22}
                    color={g.cta}
                  />
                </View>
                <View style={styles.modeCopy}>
                  <Text style={[styles.modeTitle, { color: g.text }]}>
                    {copy.modes[practice.family] ?? copy.independent}
                  </Text>
                  <Text style={[styles.modeNote, { color: g.secondary }]}>
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
                  { color: g.text, fontSize: f.h2 },
                ]}
              >
                {learnerFacingPracticePrompt}
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
                      backgroundColor: g.buttonFill,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <Ionicons name="volume-high" size={21} color={g.cta} />
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
                              ? g.goodFill
                              : selected
                                ? g.opaqueControl
                                : g.opaqueCard,
                        },
                      ]}
                      textStyle={[styles.answerText, { color: g.text }]}
                    />
                  );
                })}

              {practice.inputMode === "ordered_tokens" && (
                <>
                  <View
                    style={[styles.assembled, { backgroundColor: g.opaqueCard }]}
                  >
                    <Text
                      style={[
                        styles.assembledText,
                        { color: selectedText ? g.text : g.secondary },
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
                              backgroundColor: g.opaqueCard,
                              opacity: used ? 0.3 : pressed ? 0.72 : 1,
                            },
                          ]}
                        >
                          <Text
                            style={[styles.chipText, { color: g.text }]}
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
                        color={g.secondary}
                      />
                      <Text style={[styles.undoText, { color: g.secondary }]}>
                        {triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
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
                          ? g.selected
                          : g.opaqueCard,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      modeVoiceStatus === "listening" ? "mic" : "mic-outline"
                    }
                    size={30}
                    color={g.cta}
                  />
                  <Text style={[styles.speechTitle, { color: g.text }]}>
                    {modeVoiceStatus === "listening"
                      ? copy.voiceSpeaking
                      : (practice.scriptedAlternate?.instruction ??
                        copy.startVoice)}
                  </Text>
                  <Text style={[styles.speechNote, { color: g.secondary }]}>
                    {copy.repeatPrivacy}
                  </Text>
                  <View style={styles.transcriptRow}>
                    <Text style={[styles.transcript, { color: g.text }]}>
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
              entering={
                reducedMotion
                  ? undefined
                  : FadeInDown.duration(200).easing(
                      Easing.bezier(0.23, 1, 0.32, 1).factory(),
                    )
              }
              style={styles.explanationWrap}
            >
              <Lv2Explain>{wrongExplanation}</Lv2Explain>
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
                { backgroundColor: g.opaqueControl },
              ]}
            >
              <Ionicons name="mic" size={18} color={g.cta} />
              <Text
                style={[styles.voiceTranscriptText, { color: g.text }]}
              >
                {transcript}
              </Text>
            </View>
          )}

          {/* зачем (learning-v2.html, rc «Микрофон недоступен» / «Голосовой ответ недоступен» /
              «Не удалось записать ответ»): три сообщения — карточка-пояснение `.expl` со
              значком; тексты и условия показа прежние (copy.voice*), меняется только вид. */}
          {modeVoiceStatus === "permission_denied" && (
            <Lv2Explain icon="mic-off-outline" style={styles.voiceStatus}>
              {copy.voicePermission}
            </Lv2Explain>
          )}
          {modeVoiceStatus === "local_recognition_unavailable" && (
            <Lv2Explain icon="cloud-offline-outline" style={styles.voiceStatus}>
              {copy.voiceUnavailable}
            </Lv2Explain>
          )}
          {modeVoiceStatus === "error" && (
            <Lv2Explain icon="bulb-outline" style={styles.voiceStatus}>
              {copy.voiceFailed}
            </Lv2Explain>
          )}
          {showVoiceFooter && speechNa ? (
            <Lv2Explain icon="mic-off-outline" style={styles.voiceStatus}>
              {speechUnavailableOnDeviceText(lang)}
            </Lv2Explain>
          ) : null}
          {showVoiceFooter && voiceTargetText ? (
            <View
              testID="learning-v2-speaking-surface"
              style={styles.speakingSurface}
            >
              {speechNa ? null : <SpeakingPanel
                key={`${practice.interactionId}:${voicePanelEpoch}`}
                targetText={voiceTargetText}
                lang={lang}
                theme={buildSpeakingPanelTheme(t)}
                recognitionLocale={voiceRecognitionLocale}
                presentation="inline"
                renderInlineSurface={
                  practiceAnswerBearingContentRevealed && !voiceAttemptResult
                }
                holdActive={voiceHoldActive}
                onStatusChange={(status) => {
                  const nextStatus = learningV2VoiceUiStatusFromSpeakingPanel(status);
                  // зачем (решение владельца D194, 15.10, макет learning-v2-voice-limit.html): попытка списывается в момент НАЧАЛА записи (первый 'listening'), не на тап: отказ микрофона и отмена до старта не списывают
                  if (nextStatus === "listening" && voiceLastStatusRef.current !== "listening") {
                    voiceAttemptSeqRef.current += 1;
                    recordVoiceDailyAttempt("course_v2", `${practice.interactionId}:${voicePanelEpoch}:${voiceAttemptSeqRef.current}`, { accessResolved, hasPremiumAccess });
                  }
                  voiceLastStatusRef.current = nextStatus;
                  setModeVoiceStatus(nextStatus);
                  if (nextStatus !== "requesting" && nextStatus !== "listening") {
                    // The panel can end a controlled hold without a physical
                    // press-out (first permission prompt, denial, unavailable,
                    // stalled, result). Release the host latch so the next
                    // TalkBack/VoiceOver activation creates a real false→true
                    // transition and starts a new attempt.
                    setVoiceHoldActive(false);
                  }
                }}
                onScore={({ score, passed, transcript: heard, missingWords, reason }) => {
                  if (!practice || !runSummary || !heard.trim()) return;
                  setSelectedChoiceId(null);
                  setOrderedIds([]);
                  setTranscript(heard);
                  setVoiceAttemptResult({ score, passed, transcript: heard, missingWords, reason });
                  setVoiceAttemptSubmitted(true);
                  evaluate(
                    learningV2CourseSessionVoiceResponseV1(
                      practice,
                      passed ? voiceTargetText : heard,
                      runSummary.targetLanguage,
                    ),
                    { forcePedagogicalWrong: !passed },
                  );
                }}
                onClose={cancelVoiceCapture}
              />}
              {voiceAttemptResult && voiceTargetText && voiceFailWords.length > 0 ? (
                <SpeechFailBlock
                  targetText={voiceTargetText}
                  missingWords={voiceFailWords}
                  lang={lang}
                  glass={g}
                  kicker={triLang(lang, {
                    ru: "Сказано", uk: "Сказано", en: "You said", es: "Dijiste", "pt-BR": "Você disse",
                    vi: "Bạn đã nói", id: "Kamu bilang", tr: "Söylediğin", pl: "Powiedziano",
                  })}
                  testID="learning-v2-speech-fail"
                />
              ) : voiceAttemptResult ? (
                <View
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={voiceResultAccessibilityLabel}
                  accessibilityLiveRegion="polite"
                  style={[
                    styles.voiceResultCard,
                    lv2CardStyle(g),
                    { borderColor: voiceAttemptResult.passed ? g.goodEdge : g.badEdge, borderWidth: StyleSheet.hairlineWidth }, // shadow-ok: кольцо исхода ответа (верно/неверно)
                  ]}
                >
                  <SpeakingInlineResultStars
                    result={voiceAttemptResult}
                    theme={buildSpeakingPanelTheme(t)}
                    testID="learning-v2-speaking-stars"
                  />
                  <Text style={[styles.voiceHeardLabel, { color: g.secondary }]}>
                    {triLang(lang, {
                      ru: "Ты сказал(а)", uk: "Ти сказав(ла)", en: "You said", es: "Dijiste",
                      "pt-BR": "Você disse", vi: "Bạn đã nói", id: "Kamu berkata", tr: "Şunu söyledin", pl: "Powiedziano",
                    })}
                  </Text>
                  <Text style={[styles.voiceHeardText, { color: g.text }]}>
                    {voiceAttemptResult.transcript}
                  </Text>
                </View>
              ) : null}
              <SpeakHoldButton
                accent={g.cta}
                listening={voiceCaptureActive}
                disabled={voiceControlDisabled}
                sessionAuthorized
                reduceMotion={reducedMotion}
                onHoldStart={startVoiceHold}
                onHoldEnd={stopVoiceCapture}
                onAccessibilityActivate={toggleVoiceFromAccessibility}
                label={voiceAllowance.kind === "limited" && voiceAllowance.exhausted
                  ? triLang(lang, {
                      ru: "Голос на сегодня закончился", uk: "Голос на сьогодні закінчився", en: "No voice attempts left today", es: "Hoy no quedan intentos de voz",
                      "pt-BR": "As tentativas de voz de hoje acabaram", vi: "Hôm nay đã hết lượt nói", id: "Percobaan suara hari ini habis", tr: "Bugünkü ses hakkın bitti", pl: "Na dziś koniec prób głosowych",
                    })
                  : voiceFailWords.length > 0
                    ? triLang(lang, {
                        ru: "Ещё раз", uk: "Ще раз", en: "Try again", es: "Otra vez", "pt-BR": "De novo",
                        vi: "Thử lại", id: "Coba lagi", tr: "Tekrar dene", pl: "Jeszcze raz",
                      })
                    : footerVoiceLabel}
                allowance={
                  voiceAllowance.kind === "limited" && voiceAllowance.remaining !== null
                    ? {
                        remaining: voiceAllowance.remaining,
                        onSpentPress: openVoicePlus,
                        colors: {
                          fill: g.ctaInk, ink: g.cta, ring: g.bg,
                          plusFill: g.cta, plusInk: g.ctaInk,
                          spentFill: g.opaqueControl, spentInk: g.secondary,
                        },
                      }
                    : undefined
                }
                testID="learning-v2-inline-hold-to-talk"
              />
            </View>
          ) : null}
        </LearningV2PracticeViewport>

        <View style={[styles.reportDock, { bottom: insets.bottom + 84 }]}>
          <ReportErrorButton
            screen="learning_v2_session"
            dataId={`${runSummary.courseSessionId}:${practice.interactionId}`}
            dataText={learnerFacingPracticePrompt}
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
              backgroundColor: g.bg,
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
              <Ionicons name="arrow-undo-outline" size={26} color={g.secondary} />
              <Text style={[styles.footerActionLabel, { color: g.secondary, fontSize: f.label }]}>
                {footerBackLabel}
              </Text>
            </Pressable>

            <Animated.View style={[styles.footerActionSlot, wordPocketBumpStyle]}>
              <View
                style={styles.footerActionTarget}
              >
              <Pressable
                testID="learning-v2-footer-word-pocket"
                accessibilityRole="button"
                accessibilityLabel={footerWordsA11yLabel}
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
                  <View
                    ref={wordPocketTargetRef}
                    collapsable={false}
                    testID="learning-v2-word-pocket-miniature"
                    pointerEvents="none"
                    style={styles.wordPocketMiniature}
                  >
                    <View style={[styles.wordPocketMiniBack, { backgroundColor: g.opaqueControl, borderColor: g.glassEdge }]} />{/* shadow-ok: миниатюра-иконка карточек в футере (арт 25×21), не контейнер */}
                    <View style={[styles.wordPocketMiniFace, { backgroundColor: g.opaqueCard, borderColor: g.glassEdge }]}>{/* shadow-ok: миниатюра-иконка карточек (арт), не контейнер */}
                      <Ionicons name="text-outline" size={14} color={g.text} />
                    </View>
                  </View>
                  {unlockedWords.length > 0 ? (
                    <View style={[styles.wordPocketBadge, { backgroundColor: g.accent }]}>
                      <Text style={[styles.wordPocketBadgeText, { color: g.accentInk }]}>
                        {unlockedWords.length}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.footerActionLabel, { color: g.secondary, fontSize: f.label }]}>
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
              disabled={(result !== "correct" && !voiceSkipOnDevice) || finishing}
              onPress={voiceSkipOnDevice ? skipVoicePracticeOnDevice : advance}
              style={({ pressed }) => [
                styles.footerAction,
                {
                  opacity:
                    (result !== "correct" && !voiceSkipOnDevice) || finishing
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
                color={result === "correct" || voiceSkipOnDevice ? g.text : g.secondary}
              />
              <Text
                style={[
                  styles.footerActionLabel,
                  {
                    color: result === "correct" || voiceSkipOnDevice ? g.text : g.secondary,
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
      {devJumpToVoiceButton}
      {wordPocketOpen ? (
        <LearningV2WordPocketOverlayV1
          words={unlockedWords}
          onClose={() => setWordPocketOpen(false)}
          onSpeak={(text) => {
            const normalized = text.normalize("NFKC").trim();
            // The lesson pack completes in the background and updates its
            // synchronous registry without forcing this large screen to
            // re-render. Re-read it on tap so an earlier memoized null can
            // never keep an already prepared word silent.
            const fileUri = preparedWordAudioByText[normalized]
              ?? resolvePreparedLearningV2FactoryWordAudioV1(normalized);
            if (fileUri) {
              playLocalAudio(fileUri);
              return;
            }
            speakPreviewText(normalized, `word-pocket:${normalized}`);
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
                wordEncounterPresentationId(encounter) ===
                wordEncounterPresentationId(currentNewWordEncounter),
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
          onPresented={confirmCurrentNewWordPresented}
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
                `new-word:${wordEncounterPresentationId(currentNewWordEncounter)}`,
              );
          }}
          measurePocketTarget={measureWordPocketTarget}
        />
      ) : null}
      {runeFlightOverlay}
    </View>
  );
}

const styles = StyleSheet.create({
  // Проверка главы: собственная типографика входа (макет 26).
  checkpointTile: {
    width: 140,
    height: 140,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    // «объёмная» нижняя кромка плитки макета (0 10px 0)
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 0,
    ...noAndroidOutline, // зачем: правило Android — elevation при скруглении без непрозрачного фона рисует квадрат; тень плитки не нужна на Android
  },
  checkpointTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    letterSpacing: -0.4,
    textAlign: "center",
    marginTop: 38,
  },
  checkpointBody: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
    textAlign: "center",
    marginTop: 12,
    maxWidth: 320,
  },
  // checkEntry: шапка .shd (8 под статус-баром, поля 20, gap 10), крестик .rb 42.
  checkpointHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, minHeight: 42 },
  checkpointClose: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  // padding 96px 10px 0 внутри полей страницы 20.
  checkpointBodyWrap: { alignItems: "center", paddingTop: 96, paddingHorizontal: 30 },
  // `.pill.s.ol`: 30, поля 13, gap 7, контур --line-2, margin-top 22.
  checkpointPill: {
    marginTop: 22,
    minHeight: 30,
    paddingHorizontal: 13,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  checkpointPillText: { fontSize: 16, fontWeight: "700" },
  // `.fx`: кнопка закреплена внизу, поля 20.
  checkpointFooter: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20 },
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
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
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
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  progressColumn: { flex: 1, gap: 5 },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 13, lineHeight: 17, fontWeight: "700", fontVariant: ["tabular-nums"] },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  devJumpToVoiceDock: {
    position: "absolute",
    left: 16,
    zIndex: 40,
  },
  devJumpToVoiceButton: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  devJumpToVoiceText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: 0.35,
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
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "700",
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
  modeTitle: { fontSize: 16, lineHeight: 21, fontWeight: "700" },
  modeNote: { fontSize: 13, lineHeight: 20, fontWeight: "700", marginTop: 2 },
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
  assembledText: { fontSize: 16, lineHeight: 24, fontWeight: "700" },
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
  undoText: { fontSize: 13, fontWeight: "700" },
  speechBox: {
    minHeight: 190,
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  speechTitle: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "700",
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
  explanationWrap: { marginTop: 18 },
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
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "700",
  },
  voiceStatus: { marginTop: 12 },
  speakingSurface: {
    width: "100%",
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
  },
  voiceResultCard: {
    width: "100%",
    minHeight: 92,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  voiceHeardLabel: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  voiceHeardText: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600",
    textAlign: "center",
  },
  footer: {
    flexShrink: 0,
    paddingHorizontal: 0,
    paddingTop: 6,
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
  wordPocketMiniature: { width: 30, height: 26, alignItems: "center", justifyContent: "center" },
  wordPocketMiniBack: { position: "absolute", width: 25, height: 21, borderWidth: 1 /* shadow-ok: арт-миниатюра */, borderRadius: 4, transform: [{ rotate: "-12deg" }, { translateX: -2 }] },
  wordPocketMiniFace: { width: 25, height: 21, borderWidth: 1 /* shadow-ok: арт-миниатюра */, borderBottomWidth: 3, borderRadius: 4, alignItems: "center", justifyContent: "center", transform: [{ rotate: "6deg" }] },
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
  wordPocketBadgeText: { fontSize: 13, lineHeight: 17, fontWeight: "700" },
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
  skipText: { fontSize: 13, fontWeight: "700" },
});
