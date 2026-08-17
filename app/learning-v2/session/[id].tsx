import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Crypto from "expo-crypto";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { LinearGradient } from "../../../components/SafeLinearGradient";
import ReportErrorButton from "../../../components/ReportErrorButton";
import { useLang } from "../../../components/LangContext";
import { useStudyTarget } from "../../../components/StudyTargetContext";
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
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  ensureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from "../../../app/account_generation";
import {
  ensureLearningV2CompletionBackgroundSchedulerInstalled,
  enterLearningV2InteractiveSurface,
} from "../../../app/learning_v2_completion_background_scheduler";
import {
  learningV2Lesson1AudioSource,
  learningV2Lesson1FamilyUsesAudio,
} from "../../../app/learning_v2_lesson1_audio_assets";
import { buildLearningV2SessionResultRouteParams } from "../../../app/learning_v2_session_result_handoff";
import { learningV2SessionCopy } from "../../../app/learning_v2_session_copy";
import {
  captureLearningV2SessionNetworkIntentFrameReleaseTarget,
  claimLearningV2SessionNetworkIntent,
  markLearningV2SessionExitPending,
  markLearningV2SessionResultPending,
  releaseLearningV2SessionNetworkIntentAfterExitFrame,
  waitForLearningV2SessionNetworkIntent,
  type LearningV2SessionNetworkIntent,
} from "../../../app/learning_v2_session_network_quiet";
import { getStableId } from "../../../app/stable_id";
import { useStableSafeAreaInsets } from "../../../app/stable_safe_area_metrics";
import LearningV2SessionIntro from "../../../app/learning_v2_session_intro";
import LearningV2DirectSessionPlayerV1 from "../../../app/learning_v2_direct_session_player_v1";
import {
  parseLearningV2ActivityAuxiliaryRouteScopeV1,
  useLearningV2ActivityAuxiliarySessionV1,
} from "../../../app/use_learning_v2_activity_auxiliary_session_v1";
import { useLearningV2ActivityActionSessionV1 } from "../../../app/use_learning_v2_activity_action_session_v1";
import { useLearningV2ActivityAudioSessionV1 } from "../../../app/use_learning_v2_activity_audio_session_v1";
import { useLearningV2ActivityLocalAudioPlaybackV1 } from "../../../app/use_learning_v2_activity_local_audio_playback_v1";
import { useLearningV2ActivityReleasedSessionV1 } from "../../../app/use_learning_v2_activity_released_session_v1";
import {
  hapticError,
  hapticSuccess,
  hapticTap,
} from "../../../hooks/use-haptics";
import { useRuntimeActive } from "../../../hooks/use_runtime_active";
import { projectRequiredTaskStars } from "../../../modules/learning-v2/contracts/course_economy";
import {
  claimSpokenAudio,
  type SpokenAudioClaim,
  whenSpokenAudioReady,
} from "../../../modules/audio/audio_runtime_arbiter";
import { createLesson1LocalProgressStore } from "../../../modules/learning-v2/progress/lesson1_local_progress";
import {
  deriveLocalOfflineProgressAccountScopeHash,
  LOCAL_OFFLINE_PROGRESS_GENERATION,
} from "../../../modules/learning-v2/progress/progress_account_scope";
import { materializeLearningV2ActivityReleasedSessionCompletionV1 } from "../../../modules/learning-v2/progress/activity_released_session_completion_v1";
import { createLearningV2ActivityReleasedSessionCompletionSpoolV1 } from "../../../modules/learning-v2/progress/activity_released_session_completion_spool_v1";
import {
  materializeRequiredSessionCompletionEnvelope,
  type RequiredSessionTaskCompletionInputV3,
} from "../../../modules/learning-v2/progress/required_session_completion_envelope";
import { createRequiredSessionLocalCommitCoordinator } from "../../../modules/learning-v2/progress/required_session_local_commit";
import { getLesson1SessionRuntime } from "../../../modules/learning-v2/runtime/lesson1_session_runtime";
import {
  evaluateLearningV2ActivityReleasedSessionTaskV1,
  getLearningV2ActivityReleasedSessionRuntimeSummaryV1,
  getLearningV2ActivityReleasedSessionTaskV1,
  type LearningV2ActivityReleasedSessionRuntimeHandleV1,
} from "../../../modules/learning-v2/runtime/activity_released_session_package_v1";

const SESSION_IDS = ["understand", "use", "master"].flatMap((zone) =>
  [1, 2, 3, 4].map((index) => `lesson-1-${zone}-${index}`),
);
const MODE_META = {
  listen_choose: {
    icon: "headset-outline",
    accent: "#6FD6FF",
  },
  sound_contrast: {
    icon: "pulse-outline",
    accent: "#A78BFA",
  },
  speed_match: {
    icon: "flash-outline",
    accent: "#F8C65C",
  },
  phrase_builder: {
    icon: "construct-outline",
    accent: "#8EE65A",
  },
  listen_build_dictation: {
    icon: "ear-outline",
    accent: "#5EEAD4",
  },
  context_gap_grammar: {
    icon: "text-outline",
    accent: "#FB7185",
  },
  scripted_repeat_compare: {
    icon: "mic-outline",
    accent: "#F472B6",
  },
} as const;

type ResultState = "idle" | "correct" | "wrong";
type ModeKey = keyof typeof MODE_META;
type SessionStarBreakdown = Readonly<{
  totalStars: number;
  perfect: number;
  recovered: number;
  supported: number;
  skipped: number;
}>;
const EMPTY_STAR_BREAKDOWN: SessionStarBreakdown = Object.freeze({
  totalStars: 0,
  perfect: 0,
  recovered: 0,
  supported: 0,
  skipped: 0,
});
const summarizeSessionStars = (
  completions: Iterable<RequiredSessionTaskCompletionInputV3>,
): SessionStarBreakdown => {
  let totalStars = 0;
  let perfect = 0;
  let recovered = 0;
  let supported = 0;
  let skipped = 0;
  for (const completion of completions) {
    const stars = projectRequiredTaskStars(completion).stars;
    totalStars += stars;
    if (stars === 3) perfect += 1;
    else if (stars === 2) recovered += 1;
    else if (stars === 1) supported += 1;
    else skipped += 1;
  }
  return Object.freeze({ totalStars, perfect, recovered, supported, skipped });
};
const normalize = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}' ]+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
const LOCAL_AUDIO_START_WATCHDOG_MS = 2_000;

function LearningV2LegacySessionScreen() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const runtimeActive = useRuntimeActive();
  const params = useLocalSearchParams<{
    id?: string | string[];
    runKind?: string | string[];
    releaseEnvironment?: string | string[];
    releaseSeasonId?: string | string[];
    releaseEpisodeId?: string | string[];
  }>();
  const { lang } = useLang();
  const copy = useMemo(() => learningV2SessionCopy(lang), [lang]);
  const { studyTarget } = useStudyTarget();
  const sessionId = first(params.id);
  const isSessionRepeat = first(params.runKind) === "repeat";
  const ordinal = SESSION_IDS.indexOf(sessionId) + 1;
  const auxiliaryScope = useMemo(
    () =>
      parseLearningV2ActivityAuxiliaryRouteScopeV1({
        releaseEnvironment: params.releaseEnvironment,
        releaseSeasonId: params.releaseSeasonId,
        releaseEpisodeId: params.releaseEpisodeId,
      }),
    [
      params.releaseEnvironment,
      params.releaseEpisodeId,
      params.releaseSeasonId,
    ],
  );
  const auxiliaryLocator = useMemo(
    () =>
      auxiliaryScope && ordinal > 0
        ? Object.freeze({
            ...auxiliaryScope,
            studyTarget,
            learnerSourceLocale: lang,
            sessionOrdinal: ordinal,
          })
        : null,
    [auxiliaryScope, lang, ordinal, studyTarget],
  );
  const auxiliaryMount = useLearningV2ActivityAuxiliarySessionV1({
    scope: auxiliaryScope,
    studyTarget,
    learnerSourceLocale: lang,
    sessionOrdinal: ordinal,
    interfaceLocale: lang,
    active: ordinal > 0,
    // Active answers remain network-independent. The map preloads the exact
    // descriptor; the session may only hydrate the verified account LKG.
    allowNetwork: false,
  });
  const releasedSessionMount = useLearningV2ActivityReleasedSessionV1({
    scope: auxiliaryScope,
    studyTarget,
    learnerSourceLocale: lang,
    sessionOrdinal: ordinal,
    interfaceLocale: lang,
    active: ordinal > 0,
    // The lesson map owns all release networking and preloads both package and
    // audio. Answering inside the session remains fully local/offline.
    allowNetwork: false,
  });
  const [runtime] = useState(getLesson1SessionRuntime);
  const { payload, compiled } = runtime;
  const session = compiled.sessions[Math.max(0, ordinal - 1)];
  // Canonical slots 1–3 are answered inside the three intro pages. Practice
  // therefore starts at slot 4 and those tasks must never render twice.
  const [cardIndex, setCardIndex] = useState(3);
  const [introComplete, setIntroComplete] = useState(false);
  const [releasedRuntime, setReleasedRuntime] =
    useState<LearningV2ActivityReleasedSessionRuntimeHandleV1 | null>(null);
  const [result, setResult] = useState<ResultState>("idle");
  const [wrongExplanation, setWrongExplanation] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [correctResponseDisplay, setCorrectResponseDisplay] = useState<
    string | null
  >(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [attempts, setAttempts] = useState(1);
  const [finishing, setFinishing] = useState(false);
  const [displayedStars, setDisplayedStars] = useState(0);
  const [latestStarAward, setLatestStarAward] = useState<1 | 2 | 3>(3);
  const [completionStars, setCompletionStars] = useState(0);
  const [completionBreakdown, setCompletionBreakdown] =
    useState<SessionStarBreakdown>(EMPTY_STAR_BREAKDOWN);
  const [showCompletionCeremony, setShowCompletionCeremony] = useState(false);
  const sessionRunIdRef = useRef(Crypto.randomUUID());
  const taskCompletionsRef = useRef(
    new Map<string, RequiredSessionTaskCompletionInputV3>(),
  );
  const awardedCardIdsRef = useRef(new Set<string>());
  const sessionStarsRef = useRef(0);
  const transitionLatchRef = useRef(false);
  const finishingRef = useRef(false);
  const audioRequestEpochRef = useRef(0);
  const audioAttemptPendingRef = useRef(false);
  const audioPlaybackOwnedRef = useRef(false);
  const spokenAudioClaimRef = useRef<SpokenAudioClaim | null>(null);
  const audioWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const networkIntentRef = useRef<LearningV2SessionNetworkIntent | null>(null);
  const localCommitCompletedRef = useRef(false);
  const voiceLongPressRef = useRef(false);
  const progress = useSharedValue(4 / 12);
  const starFlight = useSharedValue(0);
  const starCounterScale = useSharedValue(1);
  const answerShake = useSharedValue(0);
  const ceremonyProgress = useSharedValue(0);
  const ceremonyHeroScale = useSharedValue(1);
  const card = session?.cards[cardIndex];
  const releasedPackageTask = releasedRuntime
    ? getLearningV2ActivityReleasedSessionTaskV1(releasedRuntime, cardIndex + 1)
    : null;
  const introTaskIds = useMemo(() => {
    if (!session) return null;
    const taskIdAt = (introIndex: number) =>
      releasedSessionMount.runtime
        ? getLearningV2ActivityReleasedSessionTaskV1(
            releasedSessionMount.runtime,
            introIndex + 1,
          ).taskId
        : session.cards[introIndex]?.cardId;
    return [taskIdAt(0), taskIdAt(1), taskIdAt(2)] as const;
  }, [releasedSessionMount.runtime, session]);
  const currentTaskId = releasedPackageTask?.taskId ?? card?.cardId ?? null;
  const itemById = useMemo(
    () =>
      new Map(payload.contentItems.map((item) => [item.contentItemId, item])),
    [payload],
  );
  const item = card ? itemById.get(card.contentItemId) : undefined;
  const localAudioSource = item
    ? learningV2Lesson1AudioSource(item.contentItemId)
    : null;
  const localAudioPlayer = useAudioPlayer(localAudioSource, {
    downloadFirst: false,
  });
  const localAudioStatus = useAudioPlayerStatus(localAudioPlayer);
  const [failedAudioCardId, setFailedAudioCardId] = useState<string | null>(
    null,
  );
  const mode = (releasedPackageTask?.family ??
    card?.family ??
    "phrase_builder") as ModeKey;
  const meta = MODE_META[mode] ?? MODE_META.phrase_builder;
  const legacyUsesLocalAudio = learningV2Lesson1FamilyUsesAudio(mode);
  const audioPlaybackFailed = failedAudioCardId === currentTaskId;
  const auxiliaryTask =
    releasedPackageTask || card
      ? (auxiliaryMount.runtime?.resolveTaskBySlot(cardIndex + 1) ?? null)
      : null;
  const releasedAuxiliaryTask =
    auxiliaryTask &&
    auxiliaryTask.action.taskId ===
      (releasedPackageTask?.taskId ?? card?.cardId) &&
    auxiliaryTask.action.activityId ===
      (releasedPackageTask?.activityId ?? card?.activityId)
      ? auxiliaryTask
      : null;
  const releasedEvaluatorTask = releasedPackageTask;
  const activityAudioSession = useLearningV2ActivityAudioSessionV1({
    locator: auxiliaryLocator,
    active: runtimeActive && releasedAuxiliaryTask !== null,
  });
  const releasedFullPhraseAudio = releasedAuxiliaryTask
    ? activityAudioSession.resolveFullPhrase(
        releasedAuxiliaryTask.action.taskId,
      )
    : null;
  const activityAudioPlayback = useLearningV2ActivityLocalAudioPlaybackV1({
    active: runtimeActive && releasedAuxiliaryTask !== null,
    taskId: releasedAuxiliaryTask?.action.taskId ?? null,
  });
  const usesLocalAudio = releasedPackageTask
    ? releasedPackageTask.learner.audioTargetIds.length > 0
    : legacyUsesLocalAudio;
  const audioUnavailable = releasedPackageTask
    ? releasedFullPhraseAudio === null
    : localAudioSource === null || audioPlaybackFailed;
  const auxiliaryActions = useLearningV2ActivityActionSessionV1({
    runtime: releasedAuxiliaryTask ? auxiliaryMount.runtime : null,
    task: releasedAuxiliaryTask,
    terminalState: result === "correct" ? "completed" : "not_terminal",
    reducedMotion,
    runtimeActive,
  });

  const saveReleasedPhrase = useCallback(async () => {
    const actionSession = auxiliaryActions.actionSession;
    if (!actionSession?.saveAvailable) return;
    const outcome = await actionSession.savePhrase();
    if (outcome.kind !== "save_result") return;
    setActionMessage(
      outcome.outcome === "added"
        ? copy.saveAdded
        : outcome.outcome === "duplicate"
          ? copy.saveDuplicate
          : copy.saveFailed,
    );
  }, [auxiliaryActions.actionSession, copy]);

  const controlReleasedVoice = useCallback(
    async (command: "start" | "stop", interaction: "tap" | "hold") => {
      const actionSession = auxiliaryActions.actionSession;
      if (!actionSession?.voiceAvailable) return;
      const outcome = await actionSession.controlVoice(command, interaction);
      if (outcome.kind !== "voice_result") return;
      if (outcome.outcome === "started") {
        setVoiceRecording(true);
        setActionMessage(copy.voiceSpeaking);
      } else {
        setVoiceRecording(false);
        setActionMessage(
          outcome.outcome === "permission_denied"
            ? copy.voicePermission
            : outcome.outcome === "unavailable"
              ? copy.voiceUnavailable
              : outcome.outcome === "stopped"
                ? copy.voiceStopped
                : copy.voiceFailed,
        );
      }
    },
    [auxiliaryActions.actionSession, copy],
  );

  const invalidateAudioAttempt = useCallback(() => {
    audioRequestEpochRef.current += 1;
    audioAttemptPendingRef.current = false;
    if (audioWatchdogRef.current !== null) {
      clearTimeout(audioWatchdogRef.current);
      audioWatchdogRef.current = null;
    }
  }, []);
  const confirmAudioPlaybackStarted = useCallback(() => {
    if (!audioAttemptPendingRef.current) return;
    audioAttemptPendingRef.current = false;
    if (audioWatchdogRef.current !== null) {
      clearTimeout(audioWatchdogRef.current);
      audioWatchdogRef.current = null;
    }
  }, []);
  const stopAudioAttempt = useCallback(() => {
    invalidateAudioAttempt();
    spokenAudioClaimRef.current?.release();
    spokenAudioClaimRef.current = null;
    audioPlaybackOwnedRef.current = false;
    try {
      localAudioPlayer.pause();
    } catch {
      /* released local player */
    }
  }, [invalidateAudioAttempt, localAudioPlayer]);

  useEffect(() => {
    progress.value = withTiming((cardIndex + 1) / 12, {
      duration: reducedMotion ? 1 : 260,
      reduceMotion: ReduceMotion.System,
    });
    transitionLatchRef.current = false;
    setActionMessage(null);
    setVoiceRecording(false);
    setCorrectResponseDisplay(null);
  }, [cardIndex, progress, reducedMotion]);
  useEffect(() => {
    stopAudioAttempt();
    return stopAudioAttempt;
  }, [card?.cardId, localAudioSource, stopAudioAttempt]);
  useEffect(() => {
    if (!audioAttemptPendingRef.current) return;
    // Only a playing status can be attributed safely to the current command.
    // didJustFinish may be a delayed event from the previous playback.
    if (!localAudioStatus.playing) return;
    confirmAudioPlaybackStarted();
  }, [confirmAudioPlaybackStarted, localAudioStatus.playing]);
  useEffect(() => {
    if (!localAudioStatus.didJustFinish) return;
    spokenAudioClaimRef.current?.release();
    spokenAudioClaimRef.current = null;
    audioPlaybackOwnedRef.current = false;
  }, [localAudioStatus.didJustFinish]);
  useLayoutEffect(() => {
    if (ordinal < 1) return;
    ensureLearningV2CompletionBackgroundSchedulerInstalled();
    const releaseInteractiveSurface = enterLearningV2InteractiveSurface();
    let intent: LearningV2SessionNetworkIntent;
    try {
      intent = claimLearningV2SessionNetworkIntent(sessionId);
    } catch (error) {
      releaseInteractiveSurface();
      throw error;
    }
    networkIntentRef.current = intent;
    // This wait is evidence/fencing only. It never gates local lesson controls.
    void waitForLearningV2SessionNetworkIntent(intent).catch(() => undefined);
    return () => {
      if (networkIntentRef.current !== intent) return;
      networkIntentRef.current = null;
      try {
        if (localCommitCompletedRef.current) {
          markLearningV2SessionResultPending(intent);
        } else {
          markLearningV2SessionExitPending(intent);
          const exitTarget =
            captureLearningV2SessionNetworkIntentFrameReleaseTarget("exit");
          // Two animation frames acknowledge a painted destination. If React
          // StrictMode immediately reacquires the same intent, owner=session and
          // this release becomes a harmless no-op.
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              releaseLearningV2SessionNetworkIntentAfterExitFrame(exitTarget);
            }),
          );
        }
      } catch {
        /* stale route cleanup */
      }
      releaseInteractiveSurface();
    };
  }, [ordinal, sessionId]);
  useEffect(() => {
    if (!session || ordinal < 1) return;
    taskCompletionsRef.current.clear();
    void withAccountTransitionLock(async () => {
      const stableId = await getStableId();
      const token = ensureAccountGeneration(stableId);
      const accountScopeHash =
        deriveLocalOfflineProgressAccountScopeHash(stableId);
      const store = createLesson1LocalProgressStore(
        AsyncStorage,
        (scope) => isCurrentAccountGeneration(token, scope.stableId),
        SESSION_IDS,
      );
      await store.applyResult(
        {
          stableId,
          accountScopeHash,
          seasonId: "learning-v2",
          studyTarget: "en",
          learnerSourceLocale: "ru",
          generation: LOCAL_OFFLINE_PROGRESS_GENERATION,
        },
        {
          operationId: `session-start-${sessionId}`,
          sessionId,
          status: "in_progress",
          awarded: { xp: 0, shards: 0 },
        },
      );
    }).catch(() => undefined);
  }, [ordinal, session, sessionId]);
  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));
  const starCounterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starCounterScale.value }],
  }));
  const answerShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: answerShake.value }],
  }));
  const flyingStarStyle = useAnimatedStyle(() => ({
    opacity: starFlight.value <= 0.02 || starFlight.value >= 1 ? 0 : 1,
    transform: [
      {
        translateX:
          -28 * starFlight.value - Math.sin(starFlight.value * Math.PI) * 52,
      },
      {
        translateY:
          -Math.max(520, windowHeight - insets.top - 210) * starFlight.value,
      },
      { rotate: `${starFlight.value * 360}deg` },
      { scale: 1.2 - starFlight.value * 0.65 },
    ],
  }));
  const ceremonyProgressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: ceremonyProgress.value }],
  }));
  const ceremonyHeroStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ceremonyHeroScale.value }],
  }));

  useEffect(() => {
    if (!showCompletionCeremony) {
      ceremonyProgress.value = 0;
      ceremonyHeroScale.value = 1;
      return;
    }
    const target = Math.max(0, Math.min(1, completionStars / 36));
    if (reducedMotion) {
      ceremonyProgress.value = target;
      ceremonyHeroScale.value = 1;
      return;
    }
    ceremonyProgress.value = 0;
    ceremonyProgress.value = withTiming(target, {
      duration: 720,
      reduceMotion: ReduceMotion.System,
    });
    ceremonyHeroScale.value = 0.82;
    ceremonyHeroScale.value = withSequence(
      withSpring(1.08, { damping: 8, stiffness: 220 }),
      withSpring(1, { damping: 13, stiffness: 180 }),
    );
  }, [
    ceremonyHeroScale,
    ceremonyProgress,
    completionStars,
    reducedMotion,
    showCompletionCeremony,
  ]);

  const commitDisplayedStars = useCallback(
    (_award: 1 | 2 | 3) => {
      if (reducedMotion) {
        starCounterScale.value = 1;
        return;
      }
      starCounterScale.value = withSequence(
        withSpring(1.24, { damping: 8, stiffness: 260 }),
        withSpring(1, { damping: 12, stiffness: 220 }),
      );
    },
    [reducedMotion, starCounterScale],
  );

  const playWrongAnswerMotion = useCallback(() => {
    if (reducedMotion) {
      answerShake.value = 0;
      return;
    }
    answerShake.value = withSequence(
      withTiming(-8, { duration: 45, reduceMotion: ReduceMotion.System }),
      withTiming(7, { duration: 55, reduceMotion: ReduceMotion.System }),
      withTiming(-5, { duration: 55, reduceMotion: ReduceMotion.System }),
      withTiming(3, { duration: 55, reduceMotion: ReduceMotion.System }),
      withTiming(0, { duration: 45, reduceMotion: ReduceMotion.System }),
    );
  }, [answerShake, reducedMotion]);

  const awardCurrentCardStars = useCallback(
    (cardId: string) => {
      if (awardedCardIdsRef.current.has(cardId)) return;
      const award = projectRequiredTaskStars({
        disposition: "completed",
        learnerAttempts: attempts,
        hintUsed,
      }).stars;
      if (award === 0) return;
      awardedCardIdsRef.current.add(cardId);
      sessionStarsRef.current += award;
      setDisplayedStars((value) => value + award);
      setLatestStarAward(award);
      if (reducedMotion) {
        commitDisplayedStars(award);
        return;
      }
      starFlight.value = 0.001;
      starFlight.value = withTiming(
        1,
        { duration: 440, reduceMotion: ReduceMotion.System },
        (finished) => {
          if (finished) runOnJS(commitDisplayedStars)(award);
        },
      );
    },
    [attempts, commitDisplayedStars, hintUsed, reducedMotion, starFlight],
  );
  const alternatives = useMemo(() => {
    if (releasedPackageTask) {
      return releasedPackageTask.learner.responseOptions.map(
        (option) => option.text,
      );
    }
    if (!item || !card) return [];
    const others = payload.contentItems.filter(
      (candidate) => candidate.contentItemId !== item.contentItemId,
    );
    if (mode === "listen_choose") {
      return [
        item.learnerMeanings[0]?.value,
        ...others
          .slice(cardIndex % 5, (cardIndex % 5) + 2)
          .map((entry) => entry.learnerMeanings[0]?.value),
      ].filter(Boolean) as string[];
    }
    if (mode === "context_gap_grammar") {
      const tokens = item.target.text
        .replace(/[?.!,]/g, "")
        .split(/\s+/)
        .filter(Boolean);
      const answer = tokens[Math.min(1, tokens.length - 1)] ?? item.target.text;
      return [answer, "do", "have"].filter(
        (value, index, values) => values.indexOf(value) === index,
      );
    }
    return [
      item.target.text,
      ...others
        .slice(cardIndex % 6, (cardIndex % 6) + 2)
        .map((entry) => entry.target.text),
    ];
  }, [card, cardIndex, item, mode, payload, releasedPackageTask]);
  const shuffledAlternatives = useMemo(
    () =>
      [...alternatives].sort(
        (a, b) =>
          `${cardIndex}-${a}`.localeCompare(`${cardIndex}-${b}`, "en") *
          (cardIndex % 2 === 0 ? 1 : -1),
      ),
    [alternatives, cardIndex],
  );
  const targetTokens = useMemo(
    () =>
      releasedPackageTask?.inputMode === "ordered_tokens"
        ? releasedPackageTask.learner.responseOptions.map(
            (option) => option.text,
          )
        : (item?.target.text
            .replace(/[?.!,]/g, "")
            .split(/\s+/)
            .filter(Boolean) ?? []),
    [item, releasedPackageTask],
  );
  const tileTokens = useMemo(() => {
    if (releasedPackageTask?.inputMode === "ordered_tokens") {
      return releasedPackageTask.learner.responseOptions.map((option) => ({
        key: option.responseId,
        text: option.text,
        responseId: option.responseId,
      }));
    }
    const released =
      releasedAuxiliaryTask?.action.family === "phrase_builder"
        ? releasedAuxiliaryTask.action.report.responseOptions
        : null;
    const releasedTexts = released?.map((option) => option.text) ?? [];
    const exactReleasedWords =
      released &&
      releasedTexts.every(
        (text) => text.trim() === text && !/\s/u.test(text),
      ) &&
      [...releasedTexts].map(normalize).sort().join("|") ===
        [...targetTokens].map(normalize).sort().join("|");
    const rows = exactReleasedWords
      ? released!.map((option) => ({
          key: option.responseId,
          text: option.text,
          responseId: option.responseId,
        }))
      : targetTokens.map((text, index) => ({
          key: `legacy-${index}:${text}`,
          text,
          responseId: null,
        }));
    return [...rows].sort(
      (a, b) =>
        `${a.key}-${cardIndex}`.localeCompare(`${b.key}-${cardIndex}`, "en") *
        (cardIndex % 2 === 0 ? -1 : 1),
    );
  }, [cardIndex, releasedAuxiliaryTask, releasedPackageTask, targetTokens]);

  const correctAnswer =
    mode === "listen_choose"
      ? (item?.learnerMeanings[0]?.value ?? "")
      : mode === "context_gap_grammar"
        ? (targetTokens[Math.min(1, targetTokens.length - 1)] ?? "")
        : (item?.target.text ?? "");
  const prompt =
    releasedPackageTask?.learner.prompt ??
    (mode === "listen_choose"
      ? copy.listenPrompt
      : mode === "context_gap_grammar"
        ? targetTokens
            .map((token, index) =>
              index === Math.min(1, targetTokens.length - 1) ? "____" : token,
            )
            .join(" ")
        : (item?.learnerMeanings[0]?.value ?? copy.chooseExactPhrase));
  const isBuilder = releasedPackageTask
    ? releasedPackageTask.inputMode === "ordered_tokens"
    : mode === "phrase_builder" || mode === "listen_build_dictation";
  const isRepeat = releasedPackageTask
    ? releasedPackageTask.inputMode === "scripted_speech"
    : mode === "scripted_repeat_compare";

  const playLocalAudio = () => {
    void hapticTap();
    if (releasedFullPhraseAudio !== null) {
      if (
        activityAudioPlayback.play(releasedFullPhraseAudio.fileUri) ===
        "unavailable"
      ) {
        void hapticError();
      }
      return;
    }
    if (localAudioSource === null || audioPlaybackFailed) {
      return;
    }
    invalidateAudioAttempt();
    try {
      localAudioPlayer.pause();
    } catch {
      /* stale hook player */
    }
    setFailedAudioCardId(null);
    const claim = claimSpokenAudio(stopAudioAttempt);
    if (!claim) return;
    spokenAudioClaimRef.current = claim;
    const requestEpoch = audioRequestEpochRef.current;
    audioAttemptPendingRef.current = true;
    audioWatchdogRef.current = setTimeout(() => {
      if (
        audioRequestEpochRef.current !== requestEpoch ||
        !audioAttemptPendingRef.current
      )
        return;
      stopAudioAttempt();
      setFailedAudioCardId(currentTaskId);
      void hapticError();
    }, LOCAL_AUDIO_START_WATCHDOG_MS);
    void whenSpokenAudioReady(claim)
      .then((audioReady) => {
        if (!audioReady || !claim.isCurrent()) {
          stopAudioAttempt();
          return;
        }
        return localAudioPlayer.seekTo(0);
      })
      .then(() => {
        if (
          !claim.isCurrent() ||
          audioRequestEpochRef.current !== requestEpoch ||
          !audioAttemptPendingRef.current
        )
          return;
        audioPlaybackOwnedRef.current = true;
        localAudioPlayer.play();
        // didJustFinish may be stale from the previous playback. Only an already
        // playing player can synchronously acknowledge this new replay.
        if (localAudioStatus.playing) {
          confirmAudioPlaybackStarted();
        }
      })
      .catch(() => {
        if (audioRequestEpochRef.current !== requestEpoch) return;
        stopAudioAttempt();
        setFailedAudioCardId(currentTaskId);
        void hapticError();
      });
  };

  const choose = (answer: string) => {
    if (result === "correct") return;
    void hapticTap();
    const releasedEvaluatorValue =
      releasedEvaluatorTask?.evaluatorInputKind === "choice_token"
        ? (releasedEvaluatorTask.learner.responseOptions.find(
            (option) => normalize(option.text) === normalize(answer),
          )?.responseId ?? answer)
        : answer;
    const releasedVerdict =
      releasedEvaluatorTask && releasedRuntime
        ? evaluateLearningV2ActivityReleasedSessionTaskV1({
            runtime: releasedRuntime,
            taskId: releasedEvaluatorTask.taskId,
            response: {
              kind: releasedEvaluatorTask.evaluatorInputKind,
              value: releasedEvaluatorValue,
            },
          })
        : null;
    // Feedback is final for the active interaction on this device. Answers are
    // never sent to a server for a second correct/wrong decision.
    //
    // зачем: technical_invalid — сбой ЗАХВАТА, а не ошибка ученика (микрофон без
    // разрешения, тишина, оценщик не смог посчитать). Контракт course_economy
    // прямо говорит: «Technical capture failures never increment it» про
    // learnerAttempts, и projectRequiredTaskStars возвращает для него
    // countsAsLearnerError:false + retryRequired:true. Раньше экран считал
    // ЛЮБОЙ не-provisional_correct ошибкой и отнимал звезду за чужой сбой —
    // на говорильной дорожке это било бы по каждому отказу микрофона.
    const captureFailed = releasedVerdict?.resultCode === "technical_invalid";
    if (captureFailed) {
      setWrongExplanation(copy.captureFailed);
      setResult("idle");
      void hapticError();
      return;
    }
    const answerCorrect = releasedVerdict
      ? releasedVerdict.resultCode === "provisional_correct"
      : normalize(answer) === normalize(correctAnswer);
    if (answerCorrect) {
      setCorrectResponseDisplay(answer);
      setWrongExplanation(null);
      setResult("correct");
      if (currentTaskId) awardCurrentCardStars(currentTaskId);
      void hapticSuccess();
    } else {
      const errorOrdinal = attempts;
      const releasedFeedback =
        auxiliaryActions.actionSession?.resolveWrongFeedback(errorOrdinal);
      setWrongExplanation(
        releasedFeedback?.explanation?.localizedText ??
          (errorOrdinal >= 2 ? copy.secondError : null),
      );
      setResult("wrong");
      setAttempts((value) => value + 1);
      playWrongAnswerMotion();
      void hapticError();
    }
  };
  const chooseTile = (tile: {
    key: string;
    text: string;
    responseId: string | null;
  }) => {
    if (result === "correct") return;
    const wasSelected = selected.includes(tile.key);
    setWrongExplanation(null);
    setResult("idle");
    setSelected((value) =>
      value.includes(tile.key)
        ? value.filter((entry) => entry !== tile.key)
        : [...value, tile.key],
    );
    if (!wasSelected && tile.responseId && releasedAuxiliaryTask) {
      const audio = activityAudioSession.resolveSelectable(
        releasedAuxiliaryTask.action.taskId,
        tile.responseId,
      );
      if (audio) activityAudioPlayback.play(audio.fileUri);
    }
    void hapticTap();
  };
  const checkBuilder = () => {
    const byKey = new Map(tileTokens.map((tile) => [tile.key, tile.text]));
    const answer = selected
      .map((key) => byKey.get(key) ?? "")
      .filter(Boolean)
      .join(" ");
    choose(answer);
  };
  const finish = async () => {
    if (finishingRef.current || !session) return;
    finishingRef.current = true;
    setFinishing(true);
    try {
      await withAccountTransitionLock(async () => {
        const stableId = await getStableId();
        const token = ensureAccountGeneration(stableId);
        const accountScopeHash =
          deriveLocalOfflineProgressAccountScopeHash(stableId);
        const scope = {
          stableId,
          accountScopeHash,
          seasonId: "learning-v2",
          studyTarget: "en",
          learnerSourceLocale: "ru",
          generation: LOCAL_OFFLINE_PROGRESS_GENERATION,
        };
        let committedReleasedCompletion = false;
        if (releasedRuntime) {
          const releasedSummary =
            getLearningV2ActivityReleasedSessionRuntimeSummaryV1(
              releasedRuntime,
            );
          const releasedTasks = Array.from({ length: 12 }, (_, index) =>
            getLearningV2ActivityReleasedSessionTaskV1(
              releasedRuntime,
              index + 1,
            ),
          );
          const releasedTaskResults = releasedTasks.map((releasedTask) =>
            taskCompletionsRef.current.get(releasedTask.taskId),
          );
          if (
            releasedTaskResults.every((candidate) => candidate !== undefined)
          ) {
            const releasedScope = {
              stableId,
              accountScopeHash,
              seasonId: releasedSummary.seasonId,
              studyTarget: releasedSummary.studyTarget,
              learnerSourceLocale: releasedSummary.learnerSourceLocale,
              generation: LOCAL_OFFLINE_PROGRESS_GENERATION,
            };
            const releasedCompletion =
              materializeLearningV2ActivityReleasedSessionCompletionV1({
                scope: releasedScope,
                runtime: releasedRuntime,
                localSessionId: sessionId,
                sessionRunId: sessionRunIdRef.current,
                taskResults: releasedTaskResults.map((candidate) => ({
                  taskId: candidate!.taskId,
                  disposition: candidate!.disposition,
                  learnerAttempts: candidate!.learnerAttempts,
                  hintUsed: candidate!.hintUsed,
                })),
              });
            // Only the completed-session summary is persisted for background
            // synchronization. Per-answer values and correctness decisions stay
            // on the device and are not part of the server transport.
            await createLearningV2ActivityReleasedSessionCompletionSpoolV1(
              AsyncStorage,
              (candidate) =>
                isCurrentAccountGeneration(token, candidate.stableId),
            ).append(releasedScope, releasedCompletion);
            committedReleasedCompletion = true;
          }
        }
        if (!committedReleasedCompletion) {
          const envelope = materializeRequiredSessionCompletionEnvelope({
            scope,
            episodeId: payload.episodeId,
            sessionSetId: runtime.sessionSetId,
            sessionSetHash: runtime.sessionSetHash,
            localSessionId: sessionId,
            sessionRunId: sessionRunIdRef.current,
            session,
            taskResults: session.cards.map((sessionCard) => {
              const completion = taskCompletionsRef.current.get(
                sessionCard.cardId,
              );
              if (!completion)
                throw new Error("required_session_completion_incomplete");
              return completion;
            }),
          });
          // Legacy fallback remains crash-safe, but an exact released run never
          // enters both transport paths and therefore cannot double-settle.
          await createRequiredSessionLocalCommitCoordinator(
            AsyncStorage,
            (candidate) =>
              isCurrentAccountGeneration(token, candidate.stableId),
            SESSION_IDS,
          ).commit(scope, envelope);
        }
      });
      void hapticSuccess();
      localCommitCompletedRef.current = true;
      const breakdown = summarizeSessionStars(
        taskCompletionsRef.current.values(),
      );
      setCompletionStars(breakdown.totalStars);
      setCompletionBreakdown(breakdown);
      setShowCompletionCeremony(true);
    } finally {
      finishingRef.current = false;
      transitionLatchRef.current = false;
      setFinishing(false);
    }
  };
  const next = () => {
    if (
      transitionLatchRef.current ||
      result !== "correct" ||
      (!releasedPackageTask && !card) ||
      !currentTaskId
    )
      return;
    transitionLatchRef.current = true;
    taskCompletionsRef.current.set(currentTaskId, {
      taskId: currentTaskId,
      disposition: "completed",
      learnerAttempts: attempts,
      hintUsed,
    });
    stopAudioAttempt();
    if (cardIndex === 11) {
      void finish();
      return;
    }
    setCardIndex((value) => value + 1);
    setWrongExplanation(null);
    setResult("idle");
    setSelected([]);
    setHintUsed(false);
    setAttempts(1);
  };
  const skip = () => {
    if (
      transitionLatchRef.current ||
      (!releasedPackageTask && !card) ||
      !currentTaskId ||
      finishingRef.current ||
      result === "correct"
    )
      return;
    transitionLatchRef.current = true;
    void hapticTap();
    taskCompletionsRef.current.set(currentTaskId, {
      taskId: currentTaskId,
      disposition: "skipped",
      learnerAttempts: Math.max(0, attempts - 1),
      hintUsed,
    });
    stopAudioAttempt();
    if (cardIndex === 11) {
      void finish();
      return;
    }
    setCardIndex((value) => value + 1);
    setWrongExplanation(null);
    setResult("idle");
    setSelected([]);
    setHintUsed(false);
    setAttempts(1);
  };

  if (
    !session ||
    ordinal < 1 ||
    !introTaskIds?.every(
      (taskId): taskId is string => typeof taskId === "string",
    ) ||
    (!releasedPackageTask && !item)
  ) {
    return (
      <View style={styles.screen}>
        <Text style={styles.error}>{copy.unavailable}</Text>
      </View>
    );
  }
  const closeSession = () => {
    stopAudioAttempt();
    router.replace("/learning-v2/course");
  };
  if (!introComplete && session && ordinal > 0) {
    return (
      <LearningV2SessionIntro
        introScreens={[...payload.introScreens]}
        lessonId={payload.lessonId}
        sessionOrdinal={ordinal}
        taskIds={introTaskIds as [string, string, string]}
        onBack={() => router.replace("/learning-v2/course")}
        onComplete={(introCompletions) => {
          for (const completion of introCompletions) {
            taskCompletionsRef.current.set(completion.taskId, completion);
            awardedCardIdsRef.current.add(completion.taskId);
          }
          const introStars = introCompletions.reduce(
            (total, completion) =>
              total + projectRequiredTaskStars(completion).stars,
            0,
          );
          sessionStarsRef.current += introStars;
          setDisplayedStars((value) => value + introStars);
          // The learner surface is immutable for the entire run. Only a
          // released runtime whose first three task IDs are the same IDs just
          // completed inside the intro may win. A release hydrated mid-intro
          // cannot switch the learner onto a different package.
          const candidateRuntime = releasedSessionMount.runtime;
          const candidateIntroTaskIds = candidateRuntime
            ? [1, 2, 3].map(
                (slot) =>
                  getLearningV2ActivityReleasedSessionTaskV1(
                    candidateRuntime,
                    slot,
                  ).taskId,
              )
            : [];
          const introMatchesCandidate =
            candidateIntroTaskIds.length === introCompletions.length &&
            introCompletions.every(
              (completion, index) =>
                completion.taskId === candidateIntroTaskIds[index],
            );
          setReleasedRuntime(introMatchesCandidate ? candidateRuntime : null);
          setCardIndex(3);
          setIntroComplete(true);
        }}
      />
    );
  }

  return (
    <LinearGradient
      colors={["#10151D", "#151B26", "#0E1219"]}
      style={styles.screen}
    >
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.close}
          hitSlop={10}
          onPressIn={() => void hapticTap()}
          onPress={closeSession}
          style={styles.iconButton}
        >
          <Ionicons name="close" size={24} color="#EAF0F6" />
        </Pressable>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
        <View
          accessibilityLabel={copy.cardProgress(cardIndex + 1)}
          style={styles.counter}
        >
          <Text style={styles.counterText}>{cardIndex + 1}</Text>
        </View>
        <Animated.View
          accessible
          accessibilityLabel={copy.starsProgress(displayedStars)}
          style={[styles.starCounter, starCounterStyle]}
        >
          <Ionicons name="star" size={17} color="#F8C84E" />
          <Text style={styles.starCounterText}>{displayedStars}</Text>
          <Text importantForAccessibility="no" style={styles.starCounterMax}>
            /36
          </Text>
        </Animated.View>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 230 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          key={`meta-${cardIndex}`}
          entering={
            reducedMotion
              ? FadeIn.duration(1)
              : FadeInDown.duration(240).reduceMotion(ReduceMotion.System)
          }
          style={styles.modeRow}
        >
          <View
            style={[
              styles.modeIcon,
              {
                backgroundColor: `${meta.accent}22`,
                borderColor: `${meta.accent}66`,
              },
            ]}
          >
            <Ionicons name={meta.icon} size={19} color={meta.accent} />
          </View>
          <View>
            <Text style={styles.modeLabel}>{copy.modes[mode]}</Text>
            <Text style={styles.modeSupport}>
              {(releasedPackageTask?.support ?? card?.support) === "none"
                ? copy.independent
                : copy.supportFades}
            </Text>
          </View>
        </Animated.View>
        <Animated.View
          key={`card-${cardIndex}`}
          entering={
            reducedMotion
              ? FadeIn.duration(1)
              : FadeInDown.duration(280).reduceMotion(ReduceMotion.System)
          }
          style={styles.heroCard}
        >
          {usesLocalAudio && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                audioUnavailable ? copy.showPhrase : copy.listenOffline
              }
              accessibilityHint={
                audioUnavailable
                  ? copy.audioUnavailableHint
                  : copy.audioOfflineHint
              }
              onPress={playLocalAudio}
              style={({ pressed }) => [
                styles.audioOrb,
                pressed && styles.pressed,
              ]}
            >
              <LinearGradient
                colors={[meta.accent, "#5872FF"]}
                style={styles.audioOrbGradient}
              >
                <Ionicons
                  name={audioUnavailable ? "eye-outline" : "volume-high"}
                  size={30}
                  color="#07110A"
                />
              </LinearGradient>
            </Pressable>
          )}
          {audioUnavailable && usesLocalAudio && (
            <View accessibilityLiveRegion="polite" style={styles.audioFallback}>
              <Text style={styles.audioFallbackMessage}>
                {localAudioSource === null
                  ? copy.localAudioUnavailable
                  : copy.localAudioFailed}
              </Text>
              <Text style={styles.supportText}>
                {releasedPackageTask?.learner.prompt ?? item?.target.text}
              </Text>
            </View>
          )}
          <Text style={styles.prompt}>{prompt}</Text>
          {!releasedPackageTask &&
            card?.support !== "none" &&
            mode !== "listen_choose" &&
            !(usesLocalAudio && audioUnavailable) && (
              <Text style={styles.supportText}>{item?.target.text}</Text>
            )}
          {isRepeat && (
            <View style={styles.repeatGuide}>
              <Text style={styles.repeatTarget}>
                {releasedPackageTask?.learner.prompt ?? item?.target.text}
              </Text>
              <Text style={styles.repeatMeaning}>
                {releasedPackageTask?.scriptedAlternate?.instruction ??
                  item?.learnerMeanings[0]?.value}
              </Text>
              <Text style={styles.repeatPrivacy}>{copy.repeatPrivacy}</Text>
            </View>
          )}
        </Animated.View>

        <Animated.View style={answerShakeStyle}>
          {isBuilder ? (
            <View style={styles.builderArea}>
              <View
                accessibilityLabel={copy.builtPhrase}
                style={styles.answerWell}
              >
                {selected.length === 0 ? (
                  <Text style={styles.answerPlaceholder}>{copy.tapWords}</Text>
                ) : (
                  selected.map((key) => (
                    <View key={key} style={styles.answerToken}>
                      <Text style={styles.answerTokenText}>
                        {tileTokens.find((tile) => tile.key === key)?.text ??
                          ""}
                      </Text>
                    </View>
                  ))
                )}
              </View>
              <View style={styles.tiles}>
                {tileTokens.map((tile) => {
                  const used = selected.includes(tile.key);
                  return (
                    <Pressable
                      key={tile.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: used }}
                      onPress={() => chooseTile(tile)}
                      style={({ pressed }) => [
                        styles.tile,
                        used && styles.tileUsed,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[styles.tileText, used && styles.tileTextUsed]}
                      >
                        {tile.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : isRepeat ? (
            <Pressable
              accessibilityRole="button"
              onPressIn={() => void hapticTap()}
              onPress={releasedPackageTask ? skip : () => choose(correctAnswer)}
              style={({ pressed }) => [
                styles.repeatButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="mic" size={22} color="#07110A" />
              <Text style={styles.repeatButtonText}>
                {releasedPackageTask
                  ? copy.repeatWithoutGrade
                  : copy.repeatedAloud}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.choices}>
              {shuffledAlternatives.map((answer, index) => (
                <Pressable
                  key={`${answer}-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={copy.answer(
                    String.fromCharCode(65 + index),
                    answer,
                  )}
                  accessibilityState={{
                    selected:
                      result === "correct" &&
                      normalize(answer) ===
                        normalize(correctResponseDisplay ?? correctAnswer),
                  }}
                  onPress={() => choose(answer)}
                  style={({ pressed }) => [
                    styles.choice,
                    result === "correct" &&
                      normalize(answer) ===
                        normalize(correctResponseDisplay ?? correctAnswer) &&
                      styles.choiceCorrect,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.choiceIndex}>
                    {String.fromCharCode(65 + index)}
                  </Text>
                  <Text style={styles.choiceText}>{answer}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
      {releasedAuxiliaryTask && (
        <View
          accessibilityLabel={copy.taskActions}
          style={[styles.compactActions, { bottom: insets.bottom + 184 }]}
        >
          <ReportErrorButton
            screen="learning_v2_activity_session"
            dataId={`${releasedAuxiliaryTask.action.taskId}:${releasedAuxiliaryTask.action.activityId}`}
            dataText={releasedAuxiliaryTask.action.report.prompt}
            userAnswer={selected
              .map(
                (key) =>
                  tileTokens.find((candidate) => candidate.key === key)?.text ??
                  "",
              )
              .filter(Boolean)
              .join(" ")}
            variant="icon-flag"
            accessibilityLabel={copy.reportTask}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.savePhrase}
            accessibilityState={{
              disabled: !auxiliaryActions.actionSession?.saveAvailable,
            }}
            disabled={!auxiliaryActions.actionSession?.saveAvailable}
            onPress={() => void saveReleasedPhrase()}
            style={({ pressed }) => [
              styles.compactActionButton,
              !auxiliaryActions.actionSession?.saveAvailable &&
                styles.compactActionDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="bookmark-outline" size={18} color="#DDE5EE" />
          </Pressable>
          {auxiliaryActions.actionSession?.voiceAvailable && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                voiceRecording ? copy.stopVoice : copy.startVoice
              }
              accessibilityState={{ selected: voiceRecording }}
              delayLongPress={260}
              onLongPress={() => {
                voiceLongPressRef.current = true;
                void controlReleasedVoice("start", "hold");
              }}
              onPressIn={() => {
                voiceLongPressRef.current = false;
              }}
              onPressOut={() => {
                if (voiceLongPressRef.current) {
                  void controlReleasedVoice("stop", "hold");
                }
              }}
              onPress={() => {
                if (voiceLongPressRef.current) {
                  voiceLongPressRef.current = false;
                  return;
                }
                void controlReleasedVoice(
                  voiceRecording ? "stop" : "start",
                  "tap",
                );
              }}
              style={({ pressed }) => [
                styles.compactActionButton,
                voiceRecording && styles.compactActionActive,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={voiceRecording ? "stop" : "mic-outline"}
                size={18}
                color={voiceRecording ? "#07110A" : "#DDE5EE"}
              />
            </Pressable>
          )}
        </View>
      )}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 14 }]}>
        {actionMessage && (
          <Text accessibilityLiveRegion="polite" style={styles.actionMessage}>
            {actionMessage}
          </Text>
        )}
        {result === "wrong" && wrongExplanation && (
          <Text accessibilityLiveRegion="polite" style={styles.feedbackWrong}>
            {wrongExplanation}
          </Text>
        )}
        {result === "correct" && (
          <Animated.View
            key={`reward-${cardIndex}-${latestStarAward}`}
            entering={
              reducedMotion
                ? FadeIn.duration(1)
                : FadeInDown.duration(240)
                    .springify()
                    .damping(16)
                    .reduceMotion(ReduceMotion.System)
            }
            accessible
            accessibilityLabel={copy.rewardLabel(latestStarAward)}
            accessibilityLiveRegion="polite"
            style={styles.rewardMoment}
          >
            <View
              importantForAccessibility="no-hide-descendants"
              style={styles.rewardStars}
            >
              {[1, 2, 3].map((position) => (
                <Animated.View
                  key={position}
                  entering={
                    reducedMotion
                      ? FadeIn.duration(1)
                      : FadeInDown.delay((position - 1) * 70)
                          .duration(220)
                          .reduceMotion(ReduceMotion.System)
                  }
                >
                  <Ionicons
                    name={position <= latestStarAward ? "star" : "star-outline"}
                    size={25}
                    color={position <= latestStarAward ? "#FFD75A" : "#596273"}
                  />
                </Animated.View>
              ))}
            </View>
            <View style={styles.rewardCopy}>
              <Text style={styles.feedbackCorrect}>
                {copy.quality[latestStarAward].title}! +{latestStarAward}{" "}
                {copy.starWord(latestStarAward)}
              </Text>
              <Text style={styles.rewardDetail}>
                {copy.quality[latestStarAward].detail}
              </Text>
            </View>
          </Animated.View>
        )}
        {result !== "correct" && (
          <View style={styles.assistRow}>
            {!hintUsed &&
            (!releasedPackageTask || releasedPackageTask.hintsAllowed > 0) ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.showHint}
                onPress={() => setHintUsed(true)}
                style={styles.hintButton}
              >
                <Ionicons name="bulb-outline" size={17} color="#ABB7C5" />
                <Text style={styles.hintText}>{copy.hint}</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.skipTask}
              accessibilityHint={copy.skipHint}
              accessibilityState={{ disabled: finishing, busy: finishing }}
              disabled={finishing}
              onPress={skip}
              style={({ pressed }) => [
                styles.skipButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.skipText}>{copy.skip}</Text>
            </Pressable>
          </View>
        )}
        {hintUsed &&
          result !== "correct" &&
          (!releasedPackageTask || releasedPackageTask.hintsAllowed > 0) && (
            <Text style={styles.hintReveal}>
              {item?.learnerMeanings[0]?.value ?? copy.hintFallback} ·{" "}
              {copy.attemptLabel(attempts)}
            </Text>
          )}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            disabled:
              finishing ||
              (!isBuilder && result !== "correct") ||
              (isBuilder && selected.length === 0),
            busy: finishing,
          }}
          disabled={
            finishing ||
            (!isBuilder && result !== "correct") ||
            (isBuilder && selected.length === 0)
          }
          onPressIn={() => void hapticTap()}
          onPress={isBuilder && result !== "correct" ? checkBuilder : next}
          style={({ pressed }) => [
            styles.cta,
            ((!isBuilder && result !== "correct") ||
              (isBuilder && selected.length === 0)) &&
              styles.ctaDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.ctaText}>
            {isBuilder && result !== "correct"
              ? copy.check
              : cardIndex === 11
                ? copy.finish
                : copy.next}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#07110A" />
        </Pressable>
      </View>
      <Animated.View
        pointerEvents="none"
        style={[styles.flyingStar, flyingStarStyle]}
      >
        <View style={styles.flyingStarGlow} />
        <Ionicons
          name="sparkles"
          size={18}
          color="#FFF1A8"
          style={styles.flyingStarTrailLeft}
        />
        <Ionicons
          name="star"
          size={15}
          color="#F8C84E"
          style={styles.flyingStarTrailRight}
        />
        <Ionicons name="star" size={46} color="#FFD75A" />
        <Text style={styles.flyingStarText}>+{latestStarAward}</Text>
      </Animated.View>
      {showCompletionCeremony && (
        <View
          accessibilityViewIsModal
          accessibilityLiveRegion="polite"
          style={styles.ceremonyBackdrop}
        >
          <Animated.View
            entering={
              reducedMotion
                ? FadeIn.duration(1)
                : FadeInDown.duration(420).springify().damping(15)
            }
            style={styles.ceremonyCard}
          >
            <ScrollView
              contentContainerStyle={styles.ceremonyContent}
              showsVerticalScrollIndicator={false}
              style={styles.ceremonyScroll}
            >
              <Text style={styles.ceremonyEyebrow}>
                {copy.tier(completionStars)}
              </Text>
              <Animated.View
                style={[styles.ceremonyStarHalo, ceremonyHeroStyle]}
              >
                <Animated.View
                  entering={
                    reducedMotion
                      ? FadeIn.duration(1)
                      : FadeIn.delay(160).duration(220)
                  }
                  style={styles.ceremonySparkTop}
                >
                  <Ionicons name="sparkles" size={22} color="#FFF0A8" />
                </Animated.View>
                <Animated.View
                  entering={
                    reducedMotion
                      ? FadeIn.duration(1)
                      : FadeIn.delay(240).duration(220)
                  }
                  style={styles.ceremonySparkLeft}
                >
                  <Ionicons name="star" size={15} color="#F8C84E" />
                </Animated.View>
                <Animated.View
                  entering={
                    reducedMotion
                      ? FadeIn.duration(1)
                      : FadeIn.delay(300).duration(220)
                  }
                  style={styles.ceremonySparkRight}
                >
                  <Ionicons name="star" size={12} color="#FFF4BD" />
                </Animated.View>
                <Ionicons name="star" size={76} color="#FFD75A" />
              </Animated.View>
              <Text style={styles.ceremonyTitle}>
                {copy.collected(completionStars)}
              </Text>
              <Text style={styles.ceremonyScore}>{copy.scorePossible}</Text>
              <View
                accessibilityLabel={copy.filled(completionStars)}
                style={styles.ceremonyProgressTrack}
              >
                <Animated.View
                  style={[styles.ceremonyProgressFill, ceremonyProgressStyle]}
                />
              </View>
              <View
                accessible
                accessibilityLabel={copy.breakdown(
                  completionBreakdown.perfect,
                  completionBreakdown.recovered,
                  completionBreakdown.supported,
                  completionBreakdown.skipped,
                )}
                style={styles.ceremonyBreakdown}
              >
                <View style={styles.ceremonyMetric}>
                  <View style={styles.ceremonyMetricValueRow}>
                    <Text style={styles.ceremonyMetricValue}>3</Text>
                    <Ionicons name="star" size={13} color="#FFD75A" />
                    <Text style={styles.ceremonyMetricValue}>
                      · {completionBreakdown.perfect}
                    </Text>
                  </View>
                  <Text style={styles.ceremonyMetricLabel}>{copy.perfect}</Text>
                </View>
                <View style={styles.ceremonyMetric}>
                  <View style={styles.ceremonyMetricValueRow}>
                    <Text style={styles.ceremonyMetricValue}>2</Text>
                    <Ionicons name="star" size={13} color="#FFD75A" />
                    <Text style={styles.ceremonyMetricValue}>
                      · {completionBreakdown.recovered}
                    </Text>
                  </View>
                  <Text style={styles.ceremonyMetricLabel}>
                    {copy.recovered}
                  </Text>
                </View>
                <View style={styles.ceremonyMetric}>
                  <View style={styles.ceremonyMetricValueRow}>
                    <Text style={styles.ceremonyMetricValue}>1</Text>
                    <Ionicons name="star" size={13} color="#FFD75A" />
                    <Text style={styles.ceremonyMetricValue}>
                      · {completionBreakdown.supported}
                    </Text>
                  </View>
                  <Text style={styles.ceremonyMetricLabel}>
                    {copy.supported}
                  </Text>
                </View>
                <View style={styles.ceremonyMetric}>
                  <View style={styles.ceremonyMetricValueRow}>
                    <Text style={styles.ceremonyMetricValue}>0</Text>
                    <Ionicons name="star-outline" size={13} color="#7B8492" />
                    <Text style={styles.ceremonyMetricValue}>
                      · {completionBreakdown.skipped}
                    </Text>
                  </View>
                  <Text style={styles.ceremonyMetricLabel}>{copy.skipped}</Text>
                </View>
              </View>
              <Text style={styles.ceremonyBody}>
                {completionStars === 36
                  ? copy.perfectBody
                  : copy.improveBody(36 - completionStars)}
              </Text>
              {isSessionRepeat && (
                <Text style={styles.ceremonyRepeatNote}>
                  {copy.repeatReward}
                </Text>
              )}
              <Text style={styles.ceremonyStorageNote}>{copy.stored}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.backToMap(completionStars)}
                onPressIn={() => void hapticTap()}
                onPress={() =>
                  router.replace({
                    pathname: "/learning-v2/course",
                    params: buildLearningV2SessionResultRouteParams({
                      localSessionId: sessionId,
                      provisionalStars: completionStars,
                    }),
                  } as never)
                }
                style={({ pressed }) => [
                  styles.ceremonyCta,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.ceremonyCtaText}>{copy.map}</Text>
                <Ionicons name="arrow-forward" size={20} color="#07110A" />
              </Pressable>
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </LinearGradient>
  );
}

export default function LearningV2SessionScreen() {
  const params = useLocalSearchParams<{
    runtimeMode?: string | string[];
  }>();
  if (first(params.runtimeMode) === "direct_v1")
    return <LearningV2DirectSessionPlayerV1 />;
  return <LearningV2LegacySessionScreen />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#10151D" },
  error: { color: "#F7F9FB", margin: 40, fontSize: 18 },
  top: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: "#202936",
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 8,
    backgroundColor: "#27313F",
    overflow: "hidden",
  },
  progressFill: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#8EE65A",
    transformOrigin: "left",
  },
  counter: {
    minWidth: 42,
    height: 34,
    borderRadius: 14,
    backgroundColor: "#202936",
    alignItems: "center",
    justifyContent: "center",
  },
  counterText: { color: "#E9EEF4", fontWeight: "900" },
  starCounter: {
    minWidth: 72,
    height: 38,
    borderRadius: 16,
    backgroundColor: "#2D2819",
    borderWidth: 1,
    borderColor: "#66562A",
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  starCounterText: { color: "#FFF1B8", fontWeight: "900", fontSize: 15 },
  starCounterMax: {
    color: "#9D8F5A",
    fontWeight: "800",
    fontSize: 10,
    marginTop: 3,
  },
  content: { paddingHorizontal: 18, paddingTop: 28 },
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  modeIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modeLabel: { color: "#F5F7FA", fontSize: 15, fontWeight: "900" },
  modeSupport: {
    color: "#7F8B99",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "600",
  },
  heroCard: {
    minHeight: 222,
    backgroundColor: "#1B2430",
    borderWidth: 1,
    borderColor: "#2C3949",
    borderRadius: 30,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  audioOrb: {
    width: 82,
    height: 82,
    borderRadius: 41,
    marginBottom: 22,
    shadowColor: "#6FD6FF",
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
  },
  audioOrbGradient: {
    flex: 1,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
  },
  prompt: {
    color: "#F8FAFC",
    fontSize: 24,
    lineHeight: 32,
    textAlign: "center",
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  supportText: {
    color: "#9BA8B8",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 14,
    fontWeight: "600",
  },
  audioFallback: { alignItems: "center", marginBottom: 4 },
  audioFallbackMessage: {
    color: "#F8C65C",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontWeight: "700",
  },
  repeatGuide: { marginTop: 18, alignItems: "center" },
  repeatTarget: {
    color: "#F7F9FB",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  repeatMeaning: { color: "#9EABB9", fontSize: 14, marginTop: 6 },
  repeatPrivacy: {
    color: "#728091",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 10,
    fontWeight: "600",
  },
  choices: { gap: 11, marginTop: 18 },
  choice: {
    minHeight: 62,
    borderRadius: 20,
    backgroundColor: "#1A222D",
    borderWidth: 1,
    borderColor: "#344151",
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  choiceCorrect: { backgroundColor: "#203A25", borderColor: "#8EE65A" },
  choiceIndex: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "#2A3543",
    color: "#BFC9D4",
    textAlign: "center",
    textAlignVertical: "center",
    lineHeight: 32,
    fontWeight: "900",
  },
  choiceText: {
    flex: 1,
    color: "#EDF2F7",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  },
  builderArea: { marginTop: 18, gap: 16 },
  answerWell: {
    minHeight: 78,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#3A4859",
    backgroundColor: "#121821",
    padding: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  answerPlaceholder: { color: "#6F7B89", fontWeight: "600", marginLeft: 4 },
  answerToken: {
    backgroundColor: "#31402D",
    borderColor: "#6FAE50",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  answerTokenText: { color: "#E9F7E2", fontWeight: "800" },
  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 9,
  },
  tile: {
    minHeight: 48,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: "#222C39",
    borderWidth: 1,
    borderColor: "#3D4A5B",
    justifyContent: "center",
  },
  tileUsed: { opacity: 0.28 },
  tileText: { color: "#F3F6F9", fontSize: 16, fontWeight: "800" },
  tileTextUsed: { color: "#83909E" },
  repeatButton: {
    marginTop: 18,
    minHeight: 60,
    borderRadius: 20,
    backgroundColor: "#F472B6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  repeatButtonText: { color: "#07110A", fontSize: 16, fontWeight: "900" },
  compactActions: {
    position: "absolute",
    right: 18,
    zIndex: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#354252",
    backgroundColor: "#111821E8",
  },
  compactActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#202A36",
  },
  compactActionActive: { backgroundColor: "#8EE65A" },
  compactActionDisabled: { opacity: 0.35 },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: "#121821F2",
    borderTopWidth: 1,
    borderTopColor: "#273341",
  },
  feedbackWrong: { color: "#FF9B9B", fontWeight: "700", marginBottom: 8 },
  actionMessage: {
    color: "#B8C4D1",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  feedbackCorrect: { color: "#FFF2B5", fontWeight: "900", fontSize: 15 },
  rewardMoment: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#6B5726",
    backgroundColor: "#2B2619",
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rewardStars: { flexDirection: "row", alignItems: "center", gap: 2 },
  rewardCopy: { flex: 1 },
  rewardDetail: {
    color: "#C7B777",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 1,
  },
  assistRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hintButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 4,
  },
  hintText: { color: "#ABB7C5", fontWeight: "700" },
  skipButton: { minHeight: 48, justifyContent: "center", paddingHorizontal: 8 },
  skipText: { color: "#AEB9C5", fontWeight: "800" },
  hintReveal: { color: "#AEB9C5", marginBottom: 8, fontWeight: "600" },
  cta: {
    height: 58,
    borderRadius: 20,
    backgroundColor: "#8EE65A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  ctaDisabled: { opacity: 0.35 },
  ctaText: { color: "#07110A", fontSize: 16, fontWeight: "900" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  flyingStar: {
    position: "absolute",
    right: 30,
    bottom: 132,
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 40,
  },
  flyingStarGlow: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F8C84E33",
    shadowColor: "#FFD75A",
    shadowOpacity: 0.9,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  flyingStarTrailLeft: {
    position: "absolute",
    left: -10,
    bottom: 4,
    transform: [{ rotate: "-18deg" }],
  },
  flyingStarTrailRight: {
    position: "absolute",
    right: -2,
    top: 1,
    transform: [{ rotate: "14deg" }],
  },
  flyingStarText: {
    position: "absolute",
    bottom: -2,
    right: -2,
    color: "#FFF6D1",
    fontSize: 18,
    fontWeight: "900",
    textShadowColor: "#5A4100",
    textShadowRadius: 5,
  },
  ceremonyBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 70,
    backgroundColor: "#090D13F2",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  ceremonyCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "90%",
    borderRadius: 32,
    backgroundColor: "#1B2430",
    borderWidth: 1,
    borderColor: "#3C4655",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 14,
  },
  ceremonyScroll: { width: "100%" },
  ceremonyContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: "center",
  },
  ceremonyEyebrow: {
    color: "#9BA8B8",
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 2,
    fontWeight: "900",
  },
  ceremonyStarHalo: {
    width: 132,
    height: 132,
    borderRadius: 66,
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8C84E18",
    borderWidth: 1,
    borderColor: "#F8C84E55",
    shadowColor: "#FFD75A",
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 8 },
  },
  ceremonySparkTop: { position: "absolute", top: -12, right: 8 },
  ceremonySparkLeft: { position: "absolute", left: -11, top: 42 },
  ceremonySparkRight: { position: "absolute", right: -7, bottom: 22 },
  ceremonyTitle: {
    color: "#FFF6D1",
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "900",
    marginTop: 18,
    letterSpacing: -0.8,
  },
  ceremonyScore: {
    color: "#B9A96A",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  ceremonyProgressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#303746",
    marginTop: 16,
  },
  ceremonyProgressFill: {
    width: "100%",
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#FFD75A",
    transformOrigin: "left",
  },
  ceremonyBreakdown: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 18,
  },
  ceremonyMetric: {
    width: "48%",
    minHeight: 62,
    borderRadius: 16,
    backgroundColor: "#141B24",
    borderWidth: 1,
    borderColor: "#303B49",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  ceremonyMetricValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  ceremonyMetricValue: {
    color: "#FFF0A8",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
  },
  ceremonyMetricLabel: {
    color: "#95A2B1",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  ceremonyBody: {
    color: "#D9E1E9",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 16,
  },
  ceremonyRepeatNote: {
    color: "#9EABB9",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    fontWeight: "700",
    marginTop: 8,
  },
  ceremonyStorageNote: {
    color: "#7F8B99",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
  ceremonyCta: {
    width: "100%",
    minHeight: 58,
    borderRadius: 20,
    backgroundColor: "#8EE65A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 24,
  },
  ceremonyCtaText: {
    color: "#07110A",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900",
  },
});
