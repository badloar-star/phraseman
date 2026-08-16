import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Crypto from "expo-crypto";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
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
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import ReportErrorButton from "../components/ReportErrorButton";
import SaveToCardsButton from "../components/SaveToCardsButton";
import { useLang } from "../components/LangContext";
import { useStudyTarget } from "../components/StudyTargetContext";
import { useTheme } from "../components/ThemeContext";
import { hapticError, hapticSuccess, hapticTap } from "../hooks/use-haptics";
import {
  markCardSaved,
  readSavedCardsFirstRun,
  shouldPulseSaveButton,
} from "./saved_cards_first_run";
import { useLearningV2LocalHoldToTalkV1 } from "../hooks/use_learning_v2_local_hold_to_talk_v1";
import { useManagedSpokenAudioPlayer } from "../hooks/use_managed_spoken_audio_player";
import { createLearningV2CourseLocalProgressStoreV1 } from "../modules/learning-v2/progress/course_local_progress_v1";
import { deriveLocalOfflineProgressAccountScopeHash } from "../modules/learning-v2/progress/progress_account_scope";
import {
  createLearningV2CourseSessionDeviceRunV1,
  evaluateLearningV2CourseSessionDeviceInteractionV1,
  getLearningV2CourseSessionAuxiliaryEntryV1,
  getLearningV2CourseSessionDeviceRunSummaryV1,
  getLearningV2CourseSessionPracticeInteractionV1,
  materializeLearningV2CourseSessionCompletedSummaryV1,
  type LearningV2CourseSessionDeviceRunHandleV1,
  type LearningV2CourseSessionInteractionCompletionV1,
} from "../modules/learning-v2/runtime/course_session_device_run_v1";
import type { V2LocalEvaluatorResponseV1 } from "../modules/learning-v2/runtime/local_evaluator_capsule_v1";
import { learningV2CourseSessionVoiceResponseV1 } from "../modules/learning-v2/runtime/course_session_voice_response_v1";
import { getStableId } from "./stable_id";
import { safeRouterBack } from "./navigation_back";
import {
  prepareCurrentLearningV2CourseSessionV3,
  resolveLearningV2CourseSessionReadyMaterialV3,
  type LearningV2CourseReleasedSessionCurrentLocatorV3,
  type LearningV2CourseReleasedSessionMaterialV3,
  type LearningV2CourseSessionReadyHandleV3,
} from "./learning_v2_course_released_session_client_v3";
import { createLearningV2CourseSessionCompletedSpoolV1 } from "./learning_v2_course_session_completed_spool_v1";
import {
  resolveLearningV2CourseSessionFullPhraseAudioV1,
  resolveLearningV2CourseSessionSelectableAudioV1,
  type LearningV2CourseSessionAudioPreloadHandleV1,
} from "./learning_v2_course_session_audio_preload_v1";
import { saveLearningV2CourseSessionPhraseToCardsV1 } from "./learning_v2_course_session_save_card_v1";
import { adaptLearningV2DirectSessionIntroV1 } from "./learning_v2_direct_session_intro_adapter_v1";
import LearningV2SessionIntro from "./learning_v2_session_intro";
import { learningV2SessionCopy } from "./learning_v2_session_copy";
import { useStableSafeAreaInsets } from "./stable_safe_area_metrics";

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

export default function LearningV2DirectSessionPlayerV1() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string | string[];
    releaseEnvironment?: string | string[];
    releaseSeasonId?: string | string[];
    lessonOrdinal?: string | string[];
    sessionOrdinal?: string | string[];
  }>();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { theme: t, f } = useTheme();
  const insets = useStableSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const copy = useMemo(() => learningV2SessionCopy(lang), [lang]);
  const sessionRunIdRef = useRef(Crypto.randomUUID());
  const lessonOrdinal = exactOrdinal(first(params.lessonOrdinal), 32);
  const sessionOrdinal = exactOrdinal(first(params.sessionOrdinal), 56);
  const locator = useMemo(
    () =>
      lessonOrdinal && sessionOrdinal
        ? locatorFromParams({
            environment: first(params.releaseEnvironment) || "production",
            targetLanguage: studyTarget,
            studyTarget,
            learnerSourceLocale: lang,
            seasonId: first(params.releaseSeasonId) || "learning-v2",
            lessonOrdinal,
            sessionOrdinal,
          })
        : null,
    [
      lang,
      lessonOrdinal,
      params.releaseEnvironment,
      params.releaseSeasonId,
      sessionOrdinal,
      studyTarget,
    ],
  );
  const [material, setMaterial] =
    useState<LearningV2CourseReleasedSessionMaterialV3 | null>(null);
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
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [result, setResult] = useState<ResultState>("idle");
  const [attempts, setAttempts] = useState(1);
  const [wrongCount, setWrongCount] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [orderedIds, setOrderedIds] = useState<readonly string[]>([]);
  const [transcript, setTranscript] = useState("");
  const [savingPhrase, setSavingPhrase] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  // зачем: кнопка сохранения зовёт вниманием, пока человек ни разу ею не
  // пользовался. Читаем один раз при входе в сессию — это локальный флаг,
  // ни одного обращения к сети.
  const [savePulse, setSavePulse] = useState(false);
  const [savedThisCard, setSavedThisCard] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const interruptedWhileBackgroundedRef = useRef(false);
  const finishingRef = useRef(false);
  const completionsRef = useRef(
    new Map<string, LearningV2CourseSessionInteractionCompletionV1>(),
  );
  const answerShake = useSharedValue(0);
  const answerShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: answerShake.value }],
  }));
  const [audioRequest, setAudioRequest] = useState<Readonly<{
    fileUri: string;
    requestId: number;
  }> | null>(null);
  const audioPlayer = useAudioPlayer(
    audioRequest ? { uri: audioRequest.fileUri } : null,
    { downloadFirst: false },
  );
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  const managedAudio = useManagedSpokenAudioPlayer(
    audioPlayer,
    audioStatus.didJustFinish,
  );

  const playLocalAudio = useCallback((fileUri: string | null | undefined) => {
    if (!fileUri) return;
    setAudioRequest((current) => ({
      fileUri,
      requestId: (current?.requestId ?? 0) + 1,
    }));
  }, []);

  useEffect(() => {
    if (!audioRequest) return;
    void managedAudio.playFromStart();
  }, [audioRequest, managedAudio]);

  useEffect(() => {
    if (!locator) return;
    let cancelled = false;
    setLoadFailed(false);
    setReadyHandle(null);
    setMaterial(null);
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
  }, [loadRevision, locator]);

  const audioPreload: LearningV2CourseSessionAudioPreloadHandleV1 | null =
    readyHandle
      ? resolveLearningV2CourseSessionReadyMaterialV3(readyHandle).audio
      : null;

  const run = useMemo(
    () => (locator && material ? runFrom(locator, material) : null),
    [locator, material],
  );
  const runSummary = run
    ? getLearningV2CourseSessionDeviceRunSummaryV1(run)
    : null;
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
  const practice =
    run && runSummary && practiceIndex < runSummary.practiceInteractionCount
      ? getLearningV2CourseSessionPracticeInteractionV1(run, practiceIndex)
      : null;
  const auxiliary =
    run && practice
      ? getLearningV2CourseSessionAuxiliaryEntryV1(run, practice.interactionId)
      : null;
  const onLocalTranscript = useCallback((value: string) => {
    setSelectedChoiceId(null);
    setOrderedIds([]);
    setTranscript(value);
  }, []);
  const localVoice = useLearningV2LocalHoldToTalkV1({
    enabled: auxiliary?.voice.available === true && result !== "correct",
    interactionId: practice?.interactionId ?? "no-practice-interaction",
    locale: runSummary?.targetLanguage ?? studyTarget,
    onTranscript: onLocalTranscript,
  });
  const wrongExplanation =
    wrongCount >= 2 && auxiliary
      ? auxiliary.secondErrorExplanationByLocale[lang]
      : null;
  const progressOrdinal = introDone ? practiceIndex + 4 : 1;
  const totalInteractions = runSummary?.interactionCount ?? 10;
  const fullPhraseAudio = useMemo(() => {
    if (!audioPreload || !practice) return null;
    try {
      return resolveLearningV2CourseSessionFullPhraseAudioV1({
        handle: audioPreload,
        interactionId: practice.interactionId,
      });
    } catch {
      return null;
    }
  }, [audioPreload, practice]);

  const playSelectableAudio = useCallback(
    (selectableId: string) => {
      if (!audioPreload || !practice) return;
      try {
        playLocalAudio(
          resolveLearningV2CourseSessionSelectableAudioV1({
            handle: audioPreload,
            interactionId: practice.interactionId,
            selectableId,
          })?.fileUri,
        );
      } catch {
        // The visible learner text remains usable if account-scoped audio was
        // invalidated during an account transition.
      }
    },
    [audioPreload, playLocalAudio, practice],
  );

  const resetInteraction = useCallback(() => {
    managedAudio.stop();
    setAudioRequest(null);
    setResult("idle");
    setAttempts(1);
    setWrongCount(0);
    setHintUsed(false);
    setSelectedChoiceId(null);
    setOrderedIds([]);
    setTranscript("");
    setSavingPhrase(false);
    setSaveMessage(null);
    // зачем: отметка «сохранено» относится к конкретной карточке, а не к сессии —
    // на следующей кнопка снова должна быть готова к нажатию.
    setSavedThisCard(false);
  }, [managedAudio]);

  // зачем: пульс зовёт только того, кто ещё ни разу ничего не сохранял. Читаем
  // локальный флаг один раз при входе в сессию, без обращений к сети.
  useEffect(() => {
    let cancelled = false;
    void readSavedCardsFirstRun().then((state) => {
      if (!cancelled) setSavePulse(shouldPulseSaveButton(state));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const restartInterruptedRun = useCallback(() => {
    managedAudio.stop();
    setAudioRequest(null);
    completionsRef.current.clear();
    sessionRunIdRef.current = Crypto.randomUUID();
    setReadyHandle(null);
    setMaterial(null);
    setIntroDone(false);
    setPracticeIndex(0);
    resetInteraction();
    setLoadRevision((value) => value + 1);
  }, [managedAudio, resetInteraction]);

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

  const evaluate = useCallback(
    (response: V2LocalEvaluatorResponseV1) => {
      if (!run || !practice || result === "correct") return;
      const verdict = evaluateLearningV2CourseSessionDeviceInteractionV1(
        run,
        practice.interactionId,
        response,
      );
      if (verdict.resultCode === "provisional_correct") {
        completionsRef.current.set(practice.interactionId, {
          interactionId: practice.interactionId,
          disposition: "completed",
          learnerAttempts: attempts,
          hintUsed,
        });
        setResult("correct");
        void hapticSuccess();
        return;
      }
      setWrongCount((value) => value + 1);
      setAttempts((value) => Math.min(99, value + 1));
      setSelectedChoiceId(null);
      setOrderedIds([]);
      setTranscript("");
      void hapticError();
      if (!reducedMotion) {
        answerShake.value = withSequence(
          withTiming(-7, { duration: 45, reduceMotion: ReduceMotion.System }),
          withTiming(6, { duration: 55, reduceMotion: ReduceMotion.System }),
          withTiming(-4, { duration: 55, reduceMotion: ReduceMotion.System }),
          withTiming(0, { duration: 45, reduceMotion: ReduceMotion.System }),
        );
      }
    },
    [answerShake, attempts, hintUsed, practice, reducedMotion, result, run],
  );

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
      const stableId = await getStableId();
      const accountScopeHash =
        deriveLocalOfflineProgressAccountScopeHash(stableId);
      await createLearningV2CourseSessionCompletedSpoolV1(AsyncStorage).append(
        accountScopeHash,
        completion,
      );
      await createLearningV2CourseLocalProgressStoreV1(AsyncStorage).complete(
        accountScopeHash,
        runSummary.courseSessionId,
      );
      safeRouterBack(router, "/learning-v2/course");
    } catch {
      finishingRef.current = false;
      setFinishing(false);
    }
  }, [finishing, material, router, run, runSummary]);

  const advance = useCallback(() => {
    if (result !== "correct" || !runSummary) return;
    void hapticTap();
    if (practiceIndex + 1 >= runSummary.practiceInteractionCount) {
      void finish();
      return;
    }
    setPracticeIndex((value) => value + 1);
    resetInteraction();
  }, [finish, practiceIndex, resetInteraction, result, runSummary]);

  // зачем: раньше сохранение было заблокировано до правильного ответа, и человек
  // не мог отложить как раз то слово, которого не знает. Владелец потребовал
  // кнопку на каждой фразе, поэтому проверка на result здесь снята.
  const savePhrase = useCallback(async () => {
    if (!auxiliary || savingPhrase || savedThisCard) return;
    // Optimistic UI: карточка помечается сохранённой сразу, до ответа хранилища.
    setSavedThisCard(true);
    setSavingPhrase(true);
    const outcome = await saveLearningV2CourseSessionPhraseToCardsV1({
      save: auxiliary.save,
      interfaceLocale: lang,
    });
    if (outcome === "failed") {
      // Откат: возвращаем кнопку в исходное состояние и говорим почему.
      setSavedThisCard(false);
      setSaveMessage(copy.saveFailed);
      setSavingPhrase(false);
      return;
    }
    if (outcome === "duplicate") {
      setSaveMessage(copy.saveDuplicate);
      setSavingPhrase(false);
      return;
    }
    const { wasFirstEver } = await markCardSaved();
    // Самое первое сохранение объясняет, куда делась карточка; дальше — коротко.
    setSaveMessage(wasFirstEver ? copy.saveFirstEver : copy.saveAdded);
    if (wasFirstEver) setSavePulse(false);
    setSavingPhrase(false);
  }, [auxiliary, copy, lang, savedThisCard, savingPhrase]);

  if (!locator || !lessonOrdinal || !sessionOrdinal) {
    return (
      <View style={[styles.center, { backgroundColor: t.bgPrimary }]}>
        <Text style={[styles.errorText, { color: t.textPrimary }]}>
          {copy.unavailable}
        </Text>
      </View>
    );
  }
  if (!readyHandle || !run || !runSummary || !introScreens || !introIds) {
    if (!loadFailed) {
      return (
        <View style={[styles.screen, { backgroundColor: t.bgPrimary }]}>
          <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.close}
              hitSlop={10}
              onPress={() => safeRouterBack(router, "/learning-v2/course")}
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
              style={[
                styles.preparingCard,
                { backgroundColor: t.bgCard },
              ]}
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

  if (!introDone) {
    return (
      <LearningV2SessionIntro
        key={sessionRunIdRef.current}
        introScreens={introScreens}
        lessonId={lessonOrdinal}
        sessionOrdinal={sessionOrdinal}
        taskIds={introIds}
        evaluateChoice={({ interactionId, choiceText }) => {
          const verdict = evaluateLearningV2CourseSessionDeviceInteractionV1(
            run,
            interactionId,
            { kind: "text", value: choiceText },
          );
          return verdict.resultCode === "provisional_correct"
            ? "correct"
            : verdict.resultCode === "provisional_wrong"
              ? "wrong"
              : "technical_invalid";
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
          setIntroDone(true);
        }}
        onBack={() => safeRouterBack(router, "/learning-v2/course")}
      />
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
      : practice.inputMode === "scripted_speech"
        ? { kind: "transcript", value: transcript.trim() || null }
        : { kind: "text", value: selectedText || null };

  return (
    <View style={[styles.screen, { backgroundColor: t.bgPrimary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.close}
          hitSlop={10}
          onPress={() => safeRouterBack(router, "/learning-v2/course")}
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
        <ReportErrorButton
          screen="learning_v2_session"
          dataId={`${runSummary.courseSessionId}:${practice.interactionId}`}
          dataText={practice.prompt}
          userAnswer={
            practice.inputMode === "single_choice"
              ? practice.responseOptions.find(
                  (entry) => entry.responseId === selectedChoiceId,
                )?.text
              : practice.inputMode === "scripted_speech"
                ? transcript
                : selectedText
          }
          variant="icon-flag"
          accessibilityLabel={copy.reportTask}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 148 },
        ]}
      >
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
                localVoice.cancel();
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

        <Animated.View style={[styles.answers, answerShakeStyle]}>
          {practice.inputMode === "single_choice" &&
            practice.responseOptions.map((option) => {
              const selected = selectedChoiceId === option.responseId;
              return (
                <Pressable
                  key={option.responseId}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={option.text}
                  disabled={result === "correct"}
                  onPress={() => {
                    localVoice.cancel();
                    playSelectableAudio(option.responseId);
                    setTranscript("");
                    setSelectedChoiceId(option.responseId);
                    evaluate({
                      kind: "choice_token",
                      value: option.responseId,
                    });
                  }}
                  style={({ pressed }) => [
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
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.answerText, { color: t.textPrimary }]}>
                    {option.text}
                  </Text>
                </Pressable>
              );
            })}

          {practice.inputMode === "ordered_tokens" && (
            <>
              <View
                style={[
                  styles.assembled,
                  { backgroundColor: t.bgCard },
                ]}
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
                {practice.responseOptions.map((option) => {
                  const used = orderedIds.includes(option.responseId);
                  return (
                    <Pressable
                      key={option.responseId}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: used }}
                      disabled={used || result === "correct"}
                      onPress={() => {
                        localVoice.cancel();
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
                      <Text style={[styles.chipText, { color: t.textPrimary }]}>
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
                  <Ionicons name="arrow-undo" size={18} color={t.textMuted} />
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
                    localVoice.status === "listening" ? t.accentBg : t.bgCard,
                },
              ]}
            >
              <Ionicons
                name={localVoice.status === "listening" ? "mic" : "mic-outline"}
                size={30}
                color={t.accent}
              />
              <Text style={[styles.speechTitle, { color: t.textPrimary }]}>
                {localVoice.status === "listening"
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

        {wrongExplanation && result !== "correct" && (
          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.explanation,
              { backgroundColor: t.bgSurface2 },
            ]}
          >
            <Ionicons name="bulb-outline" size={20} color={t.accent} />
            <Text style={[styles.explanationText, { color: t.textPrimary }]}>
              {wrongExplanation}
            </Text>
          </View>
        )}

        <View style={styles.actionRow}>
          <SaveToCardsButton
            label={copy.savePhrase}
            savedLabel={copy.saveAdded}
            saved={savedThisCard}
            pulse={savePulse}
            disabled={!auxiliary}
            onSave={() => void savePhrase()}
            colors={{
              surface: t.bgCard,
              text: t.textPrimary,
              muted: t.textMuted,
              accent: t.accent,
            }}
            testID="learning-v2-save-phrase"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              localVoice.status === "listening"
                ? copy.stopVoice
                : copy.startVoice
            }
            accessibilityHint={copy.voiceSpeaking}
            accessibilityState={{
              disabled: auxiliary.voice.available !== true,
              selected: localVoice.status === "listening",
              busy:
                localVoice.status === "requesting" ||
                localVoice.status === "finishing",
            }}
            disabled={
              auxiliary.voice.available !== true || result === "correct"
            }
            onPressIn={() => {
              void hapticTap();
              void localVoice.start();
            }}
            onPressOut={localVoice.stop}
            style={({ pressed }) => [
              styles.compactAction,
              {
                backgroundColor:
                  localVoice.status === "listening" ? t.accent : t.bgCard,
                opacity:
                  auxiliary.voice.available !== true
                    ? 0.45
                    : pressed
                      ? 0.72
                      : 1,
              },
            ]}
          >
            <Ionicons
              name={localVoice.status === "listening" ? "mic" : "mic-outline"}
              size={20}
              color={
                localVoice.status === "listening"
                  ? t.correctText
                  : t.textPrimary
              }
            />
            <Text
              style={[
                styles.compactActionText,
                {
                  color:
                    localVoice.status === "listening"
                      ? t.correctText
                      : t.textPrimary,
                },
              ]}
            >
              {localVoice.status === "listening"
                ? copy.stopVoice
                : copy.startVoice}
            </Text>
          </Pressable>
        </View>

        {transcript && practice.inputMode !== "scripted_speech" && (
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

        {localVoice.status === "permission_denied" && (
          <Text style={[styles.voiceStatus, { color: t.textMuted }]}>
            {copy.voicePermission}
          </Text>
        )}
        {localVoice.status === "local_recognition_unavailable" && (
          <Text style={[styles.voiceStatus, { color: t.textMuted }]}>
            {copy.voiceUnavailable}
          </Text>
        )}
        {localVoice.status === "error" && (
          <Text style={[styles.voiceStatus, { color: t.textMuted }]}>
            {copy.voiceFailed}
          </Text>
        )}
        {saveMessage && (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.voiceStatus, { color: t.textMuted }]}
          >
            {saveMessage}
          </Text>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: t.bgPrimary,
          },
        ]}
      >
        {result === "correct" ? (
          <Pressable
            accessibilityRole="button"
            disabled={finishing}
            onPress={advance}
            style={({ pressed }) => [
              styles.primary,
              {
                backgroundColor: t.correct,
                opacity: pressed || finishing ? 0.78 : 1,
              },
            ]}
          >
            <Text style={[styles.primaryText, { color: t.correctText }]}>
              {practiceIndex + 1 >= runSummary.practiceInteractionCount
                ? copy.finish
                : copy.next}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.footerRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                completionsRef.current.set(practice.interactionId, {
                  interactionId: practice.interactionId,
                  disposition: "skipped",
                  learnerAttempts: attempts - 1,
                  hintUsed,
                });
                setResult("correct");
              }}
              style={({ pressed }) => [
                styles.skip,
                { opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <Text style={[styles.skipText, { color: t.textMuted }]}>
                {copy.skip}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={
                (practice.inputMode === "single_choice" &&
                  !selectedChoiceId &&
                  !transcript.trim()) ||
                (practice.inputMode === "ordered_tokens" &&
                  orderedIds.length === 0 &&
                  !transcript.trim()) ||
                (practice.inputMode === "scripted_speech" && !transcript.trim())
              }
              onPress={() => evaluate(response)}
              style={({ pressed }) => [
                styles.primary,
                styles.flexPrimary,
                {
                  backgroundColor: t.accent,
                  opacity:
                    pressed ||
                    (practice.inputMode === "single_choice" &&
                      !selectedChoiceId &&
                      !transcript.trim()) ||
                    (practice.inputMode === "ordered_tokens" &&
                      orderedIds.length === 0 &&
                      !transcript.trim()) ||
                    (practice.inputMode === "scripted_speech" &&
                      !transcript.trim())
                      ? 0.45
                      : 1,
                },
              ]}
            >
              <Text style={[styles.primaryText, { color: t.correctText }]}>
                {copy.check}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
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
  actionRow: { marginTop: 22, flexDirection: "row" },
  compactAction: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
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
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerRow: { flexDirection: "row", gap: 10 },
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
