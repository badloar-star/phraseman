import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import Ionicons from "@expo/vector-icons/Ionicons";
import RuneGlyph from "../../../components/RuneGlyph";
import { runeWord } from "../../../constants/runes";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AppState,
  FlatList,
  Image,
  InteractionManager,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { getStableId } from "../../../app/stable_id";
import { useLang } from "../../../components/LangContext";
import { useStudyTarget } from "../../../components/StudyTargetContext";
import { useTheme } from "../../../components/ThemeContext";
import EnergyCostBadge from "../../../components/EnergyCostBadge";
import { usePremium } from "../../../components/PremiumContext";
import MistakePracticeLoopNode from "../../../components/mistake-practice/MistakePracticeLoopNode";
import { trackMistakePracticeEvent } from "../../../app/mistake_practice_analytics";
import { loadLearningV2MistakeLoopCount } from "../../../app/learning_v2_mistake_loop_runtime";
import {
  ensureLearningV2CompletionBackgroundSchedulerInstalled,
  enterLearningV2InteractiveSurface,
} from "../../../app/learning_v2_completion_background_scheduler";
import {
  cancelPreparedLearningV2SessionNetworkIntent,
  captureLearningV2SessionNetworkIntentFrameReleaseTarget,
  prepareLearningV2SessionNetworkIntent,
  releaseLearningV2SessionNetworkIntentAfterExitFrame,
  releaseLearningV2SessionNetworkIntentAfterResultFrame,
} from "../../../app/learning_v2_session_network_quiet";
import { parseLearningV2SessionResultRouteParams } from "../../../app/learning_v2_session_result_handoff";
import {
  ensureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  withAccountTransitionLock,
} from "../../../app/account_generation";
import {
  hydrateCurrentLearningV2WalletBalance,
  peekCurrentLearningV2WalletBalance,
  subscribeLearningV2WalletBalance,
} from "../../../app/learning_v2_wallet_balance_store";
import { WALLET_SUBUNITS_PER_STAR } from "../../../modules/learning-v2/contracts/wallet";
import { useIsScreenFocused } from "../../../hooks/use_is_screen_focused";
import { useStableSafeAreaInsets } from "../../../app/stable_safe_area_metrics";
import { safeRouterBack } from "../../../app/navigation_back";
import { lesson1MapInputFromProgress } from "../../../modules/learning-v2/map/lesson1_map_progress_adapter";
import {
  buildLessonMapModel,
  type LessonMapNode,
} from "../../../modules/learning-v2/map/lesson_map_model";
import { createLesson1LocalProgressStore } from "../../../modules/learning-v2/progress/lesson1_local_progress";
import {
  deriveLocalOfflineProgressAccountScopeHash,
  LOCAL_OFFLINE_PROGRESS_GENERATION,
} from "../../../modules/learning-v2/progress/progress_account_scope";
import { createRequiredSessionLocalCommitCoordinator } from "../../../modules/learning-v2/progress/required_session_local_commit";
import { warmLesson1SessionRuntime } from "../../../modules/learning-v2/runtime/lesson1_session_runtime";
import { preloadCurrentLearningV2ActivityAudioSessionV1 } from "../../../app/learning_v2_activity_audio_preload_v1";
import { preloadCurrentLearningV2ActivityReleasedSessionV1 } from "../../../app/learning_v2_activity_released_session_client_v1";
import { prepareCurrentLearningV2CourseSessionV3 } from "../../../app/learning_v2_course_released_session_client_v3";
import { parseLearningV2ActivityAuxiliaryRouteScopeV1 } from "../../../app/use_learning_v2_activity_auxiliary_session_v1";
import { lessonNamesForStudyTarget } from "../../../app/lesson_titles_for_study_target";
import {
      LEARNING_V2_COURSE_LESSON_COUNT_V1,
      LEARNING_V2_LESSON_CHAPTER_COUNT_V1,
      LEARNING_V2_LESSON_SESSION_COUNT_V1,
      learningV2CourseLessonIdV1,
      learningV2CourseSessionIdV1,
  learningV2CourseSessionRoleV1,
} from "../../../modules/learning-v2/content/course_topology_v1";

const SESSION_IDS = ["understand", "use", "master"].flatMap((zone) =>
  [1, 2, 3, 4].map((index) => `lesson-1-${zone}-${index}`),
);
const LESSON_CHAPTERS = Object.freeze(
  Array.from({ length: LEARNING_V2_LESSON_CHAPTER_COUNT_V1 }, (_, index) => ({
    ordinal: index + 1,
    title: `Глава ${index + 1}`,
    subtitle: `Сессии ${index * 8 + 1}–${(index + 1) * 8}`,
  })),
);

const SESSION_ZONE_META = Object.freeze({
  understand: { label: "ПОНЯТЬ", icon: "sparkles" },
  use: { label: "ПРИМЕНИТЬ", icon: "chatbubble-ellipses" },
  master: { label: "ЗАКРЕПИТЬ", icon: "star" },
} satisfies Record<
  LessonMapNode["zoneId"],
  { label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }
>);

const EPISODE_ICONS = Object.freeze([
  "chatbubble-ellipses",
  "headset",
  "layers",
  "mic",
  "flash",
  "sparkles",
] satisfies readonly React.ComponentProps<typeof Ionicons>["name"][]);

const MAP_ART = Object.freeze({
  guide: require("../../../assets/images/learning_v2_map/phraseman-map-guide-v1.webp"),
  chest: require("../../../assets/images/learning_v2_map/phraseman-map-chest-v1.webp"),
  sign: require("../../../assets/images/learning_v2_map/phraseman-map-sign-v1.webp"),
  exam: require("../../../assets/images/learning_v2_map/phraseman-map-exam-v1.webp"),
});

// A compact repeating wave makes the course feel like one continuous path.
const PATH_WAVE = Object.freeze([
  0, -38, -72, -90, -72, -34, 18, 62, 88, 66, 26, -20,
] as const);
const pathOffsetAt = (pathIndex: number): number =>
  PATH_WAVE[pathIndex % PATH_WAVE.length];

function mapDecorationAt(
  pathIndex: number,
): { source: ImageSourcePropType; side: "left" | "right" } | null {
  if (pathIndex === 3) return { source: MAP_ART.guide, side: "right" };
  if (pathIndex === 8) return { source: MAP_ART.chest, side: "left" };
  if (pathIndex === 15) return { source: MAP_ART.sign, side: "right" };
  if (pathIndex === 23) return { source: MAP_ART.exam, side: "left" };
  return null;
}

type LockedSessionRoadNode = Readonly<{
  kind: "locked_session" | "checkpoint";
  id: string;
  ordinal: number;
  chapterOrdinal: number;
  title: string;
  xOffset: number;
}>;

type CourseRoadItem =
  | Readonly<{ kind: "session"; id: string; node: LessonMapNode }>
  | Readonly<{
      kind: "chapter";
      id: string;
      chapter: (typeof LESSON_CHAPTERS)[number];
    }>
  | LockedSessionRoadNode;

function buildLessonRoadItems(
  model: ReturnType<typeof buildLessonMapModel>,
  lessonOrdinal: number,
): readonly CourseRoadItem[] {
  const liveNodes = new Map(
    model.zones.flatMap((zone) => zone.nodes).map((node) => [node.order, node]),
  );
  const items: CourseRoadItem[] = [];
  for (
    let ordinal = 1;
    ordinal <= LEARNING_V2_LESSON_SESSION_COUNT_V1;
    ordinal += 1
  ) {
    const chapterOrdinal = Math.ceil(ordinal / 8);
    const chapter = LESSON_CHAPTERS[chapterOrdinal - 1];
    if ((ordinal - 1) % 8 === 0) {
      items.push({
        kind: "chapter",
        id: `lesson-${lessonOrdinal}-chapter-${chapterOrdinal}`,
        chapter,
      });
    }
    const liveNode = liveNodes.get(ordinal);
    if (liveNode) {
      items.push({ kind: "session", id: liveNode.id, node: liveNode });
      continue;
    }
    const role = learningV2CourseSessionRoleV1(ordinal);
    const checkpoint = role === "chapter_checkpoint" || role === "final_exam";
    items.push(
      Object.freeze({
        kind: checkpoint ? "checkpoint" : "locked_session",
        id: `lesson-${lessonOrdinal}-session-${ordinal}`,
        ordinal,
        chapterOrdinal,
        title:
          role === "final_exam"
            ? "Итоговый экзамен"
            : role === "chapter_checkpoint"
              ? "Проверка главы"
              : `Сессия ${ordinal}`,
        xOffset: [-68, -18, 68, 20][ordinal % 4],
      } satisfies LockedSessionRoadNode),
    );
  }
  return Object.freeze(items);
}

function sessionOutcomeText(sessionOrdinal: number): string {
  if (sessionOrdinal <= 4) {
    return "Ты поймёшь, как am, is и are превращают отдельные слова в законченную фразу.";
  }
  if (sessionOrdinal <= 8) {
    return "Ты научишься собирать простые фразы с глаголом to be.";
  }
  return "Ты сможешь без подсказки применять am, is и are в разговоре.";
}

function sessionOutcomeTitle(sessionOrdinal: number): string {
  if (sessionOrdinal <= 4) return "Что ты поймёшь";
  if (sessionOrdinal <= 8) return "Чему научишься";
  return "Что сможешь делать";
}

function Node({
  node,
  pathIndex,
  decoration,
  onPress,
  theme,
}: {
  node: LessonMapNode;
  pathIndex: number;
  decoration: ReturnType<typeof mapDecorationAt>;
  onPress: (node: LessonMapNode) => void;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const reducedMotion = useReducedMotion();
  const halo = useSharedValue(node.state === "current" ? 0.7 : 0);
  // зачем: AppState один ловит только сворачивание всего приложения, а не уход
  // с этой карты урока на другой экран внутри приложения (freezeOnBlur глушит
  // рендер, но не сам withRepeat) — добавлен useIsScreenFocused по эталону
  // components/AvatarAura.tsx, иначе гало крутится в фоне и греет телефон.
  const isFocused = useIsScreenFocused();
  useEffect(() => {
    if (node.state !== "current" || reducedMotion || !isFocused) {
      halo.value = node.state === "current" && isFocused ? 0.7 : 0;
      return;
    }
    const update = () => {
      halo.value =
        AppState.currentState === "active"
          ? withRepeat(
              withSequence(
                withTiming(1, {
                  duration: 1200,
                  easing: Easing.inOut(Easing.ease),
                  reduceMotion: ReduceMotion.System,
                }),
                withTiming(0.55, {
                  duration: 1200,
                  easing: Easing.inOut(Easing.ease),
                  reduceMotion: ReduceMotion.System,
                }),
              ),
              -1,
              false,
            )
          : 0;
    };
    update();
    const subscription = AppState.addEventListener("change", update);
    return () => {
      subscription.remove();
      halo.value = 0;
    };
  }, [halo, node.state, reducedMotion, isFocused]);
  const haloStyle = useAnimatedStyle(() => ({
    opacity: halo.value,
    transform: [{ scale: 1 + halo.value * 0.14 }],
  }));
  const size =
    node.state === "current"
      ? 84
      : node.state === "next"
        ? 64
        : node.state === "completed"
          ? 58
          : 58;
  const xOffset = pathOffsetAt(pathIndex);
  const locked = node.state === "locked";
  const zoneMeta = SESSION_ZONE_META[node.zoneId];
  const accessibleState =
    node.state === "completed"
      ? "пройдена"
      : node.state === "current"
        ? "текущая"
        : node.state === "next"
          ? "следующая"
          : "заблокирована";
  const entrance = reducedMotion
    ? FadeInDown.duration(1)
    : FadeInDown.delay((node.order - 1) * 40)
        .duration(320)
        .easing(Easing.bezier(0.38, 0.7, 0.125, 1));
  return (
    <Animated.View entering={entrance} style={styles.nodeLane}>
      {decoration && (
        <Image
          accessibilityElementsHidden
          source={decoration.source}
          resizeMode="contain"
          style={[
            styles.mapDecoration,
            decoration.side === "left"
              ? styles.mapDecorationLeft
              : styles.mapDecorationRight,
          ]}
        />
      )}
      <View style={{ transform: [{ translateX: xOffset }] }}>
        {node.state === "current" && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.halo,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: theme.accent,
              },
              haloStyle,
            ]}
          />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${zoneMeta.label.toLocaleLowerCase("ru")}, сессия ${node.order}, ${accessibleState}`}
          accessibilityHint={
            locked
              ? "Сначала завершите предыдущую сессию"
              : "Открыть сведения о сессии"
          }
          onPress={() => onPress(node)}
          style={({ pressed }) => [
            styles.node,
            { width: size, height: size, borderRadius: size / 2 },
            styles[`node_${node.state}`],
            node.state === "current" && {
              backgroundColor: theme.accent,
              borderColor: theme.borderHighlight,
            },
            node.state === "completed" && {
              backgroundColor: theme.correct,
              borderColor: theme.borderHighlight,
            },
            (node.state === "locked" || node.state === "next") && {
              backgroundColor: theme.bgSurface2,
              borderColor: theme.border,
            },
            pressed && !locked && styles.nodePressed,
          ]}
        >
          {locked ? (
            <Ionicons name="lock-closed" size={20} color={theme.textMuted} />
          ) : node.state === "completed" ? (
            <Ionicons name="checkmark" size={28} color={theme.correctText} />
          ) : (
            <Ionicons
              name={node.state === "current" ? "star" : zoneMeta.icon}
              size={node.state === "current" ? 34 : 25}
              color={
                node.state === "current" ? theme.correctText : theme.textPrimary
              }
            />
          )}
          {!locked && node.state !== "completed" && (
            <View
              style={[
                styles.nodeOrderBadge,
                node.state === "current" && styles.nodeOrderBadgeCurrent,
              ]}
            >
              <Text
                style={[
                  styles.nodeOrderText,
                  { color: theme.textPrimary },
                  node.state === "current" && styles.nodeOrderTextCurrent,
                  node.state === "current" && { color: theme.correctText },
                ]}
              >
                {node.order}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}

function FutureCourseNode({
  node,
  pathIndex,
  decoration,
  onPress,
  theme,
}: {
  node: LockedSessionRoadNode;
  pathIndex: number;
  decoration: ReturnType<typeof mapDecorationAt>;
  onPress: (node: LockedSessionRoadNode) => void;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const isCheckpoint = node.kind === "checkpoint";
  const xOffset = pathOffsetAt(pathIndex);
  const showLabel = isCheckpoint;
  const episodeIcon = EPISODE_ICONS[(node.ordinal - 1) % EPISODE_ICONS.length];
  return (
    <View style={styles.futureNodeLane}>
      {decoration && (
        <Image
          accessibilityElementsHidden
          source={decoration.source}
          resizeMode="contain"
          style={[
            styles.mapDecoration,
            decoration.side === "left"
              ? styles.mapDecorationLeft
              : styles.mapDecorationRight,
          ]}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${isCheckpoint ? "Проверка" : "Сессия"}: ${node.title}, пока закрыта`}
        accessibilityHint="Сначала завершите предыдущие шаги"
        onPress={() => onPress(node)}
        style={({ pressed }) => [
          styles.futureNodeRow,
          { transform: [{ translateX: xOffset }] },
          pressed && styles.nodePressed,
        ]}
      >
        <View
          style={[
            isCheckpoint ? styles.examNode : styles.episodeNode,
            {
              backgroundColor: theme.bgSurface2,
              borderColor: theme.border,
            },
          ]}
        >
          <Ionicons
            name={isCheckpoint ? "trophy" : episodeIcon}
            size={isCheckpoint ? 29 : 24}
            color={isCheckpoint ? theme.gold : theme.textMuted}
          />
          {!isCheckpoint && (
            <View style={styles.episodeNumberBadge}>
              <Text style={styles.episodeNumber}>{node.ordinal}</Text>
            </View>
          )}
        </View>
        {showLabel && (
          <View
            style={[
              styles.futureNodeLabel,
              xOffset > 0
                ? styles.futureNodeLabelLeft
                : styles.futureNodeLabelRight,
            ]}
          >
            <Text style={[styles.futureNodeEyebrow, { color: theme.accent }]}>
              {isCheckpoint ? "ПРОВЕРКА" : "СЛЕДУЮЩАЯ ТЕМА"}
            </Text>
            <Text style={[styles.futureNodeTitle, { color: theme.textMuted }]}>
              {node.title}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

function LessonMapSheet({
  visible,
  onClose,
  bottomInset,
  children,
}: Readonly<{
  visible: boolean;
  onClose: () => void;
  bottomInset: number;
  children: React.ReactNode;
}>) {
  const { theme: t } = useTheme();
  const { height: viewportHeight } = useWindowDimensions();
  const dragY = useSharedValue(0);
  useEffect(() => {
    if (visible) dragY.value = 0;
  }, [dragY, visible]);
  const closeFromGesture = React.useCallback(() => onClose(), [onClose]);
  const swipeDistance = useMemo(
    () => Math.max(480, viewportHeight * 0.6),
    [viewportHeight],
  );
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(10)
        .failOffsetX([-32, 32])
        .onUpdate((event) => {
          "worklet";
          dragY.value =
            event.translationY < 0
              ? event.translationY * 0.12
              : event.translationY;
        })
        .onEnd((event) => {
          "worklet";
          if (dragY.value > 88 || event.velocityY > 900) {
            dragY.value = withTiming(
              swipeDistance,
              { duration: 240 },
              (finished) => {
                if (finished) runOnJS(closeFromGesture)();
              },
            );
          } else {
            dragY.value = withSpring(0, { damping: 22, stiffness: 300 });
          }
        }),
    [closeFromGesture, dragY, swipeDistance],
  );
  const animatedSheet = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value }],
  }));
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.sheetModalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть окно"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.sheetBackdrop} />
        </Pressable>
        <View pointerEvents="box-none" style={styles.sheetModalAlign}>
          <GestureDetector gesture={gesture}>
            <Animated.View
              accessibilityViewIsModal
              style={[
                styles.sheet,
                {
                  paddingBottom: bottomInset + 18,
                  backgroundColor: t.bgCard,
                },
                animatedSheet,
              ]}
            >
              <View
                style={[styles.grabber, { backgroundColor: t.textGhost }]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Закрыть"
                hitSlop={8}
                onPress={onClose}
                style={({ pressed }) => [
                  styles.sheetClose,
                  { backgroundColor: t.bgSurface2 },
                  pressed && styles.nodePressed,
                ]}
              >
                <Ionicons name="close" size={23} color={t.textPrimary} />
              </Pressable>
              {children}
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

export default function LearningV2LessonMap() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const params = useLocalSearchParams<{
    id?: string;
    resultSessionId?: string | string[];
    resultStars?: string | string[];
    releaseEnvironment?: string | string[];
    releaseSeasonId?: string | string[];
    releaseEpisodeId?: string | string[];
  }>();
  const { id } = params;
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { hasPremiumAccess } = usePremium();
  const { theme: t, f } = useTheme();
  const parsedLessonOrdinal = Math.trunc(Number(id ?? 1));
  const lessonOrdinal = Number.isFinite(parsedLessonOrdinal)
    ? Math.max(
        1,
        Math.min(LEARNING_V2_COURSE_LESSON_COUNT_V1, parsedLessonOrdinal),
      )
    : 1;
  const lessonTitle =
    lessonNamesForStudyTarget(lang, studyTarget)[lessonOrdinal - 1] ??
    `Урок ${lessonOrdinal}`;
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
  const systemReducedMotion = useReducedMotion();
  const [model, setModel] = useState(() =>
    buildLessonMapModel({
      lessonId: lessonOrdinal,
      completedSessionIds: [],
      currentSessionId: lessonOrdinal === 1 ? SESSION_IDS[0] : undefined,
      available: lessonOrdinal === 1,
    }),
  );
  const [selected, setSelected] = useState<
    LessonMapNode | LockedSessionRoadNode | null
  >(null);
  const [localRecoveryReady, setLocalRecoveryReady] = useState(false);
  const [localRecoveryOutcome, setLocalRecoveryOutcome] = useState<
    "pending" | "success" | "failure"
  >("pending");
  const [walletBalance, setWalletBalance] = useState(
    peekCurrentLearningV2WalletBalance,
  );
  const [mistakeLoopCount, setMistakeLoopCount] = useState(0);
  const mistakeLessonId = learningV2CourseLessonIdV1(lessonOrdinal);
  const isMapFocused = useIsScreenFocused();

  useEffect(() => {
    if (!isMapFocused || (studyTarget !== "en" && studyTarget !== "fr")) {
      if (studyTarget !== "en" && studyTarget !== "fr") setMistakeLoopCount(0);
      return;
    }
    let cancelled = false;
    void (async () => {
      const count = await loadLearningV2MistakeLoopCount({
        studyTarget,
        lessonId: mistakeLessonId,
      });
      if (!cancelled && count !== null) {
        setMistakeLoopCount(count);
        if (count >= 5) {
          trackMistakePracticeEvent('mistake_practice_loop_available', {
            study_target: studyTarget,
            entry_source: 'learning_v2',
            lesson_id: mistakeLessonId,
            ready_count: count,
            plus_access: hasPremiumAccess,
          });
        }
      }
    })().catch(() => {
      if (!cancelled) setMistakeLoopCount(0);
    });
    return () => {
      cancelled = true;
    };
  }, [hasPremiumAccess, isMapFocused, mistakeLessonId, params.resultSessionId, studyTarget]);
  const navigationLatchRef = useRef(false);
  const previousWalletFingerprintRef = useRef<string | null>(null);
  const walletPulse = useSharedValue(1);
  const walletPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: walletPulse.value }],
  }));
  const returnReward = useMemo(() => {
    const parsed = parseLearningV2SessionResultRouteParams({
      resultSessionId: params.resultSessionId,
      resultStars: params.resultStars,
    });
    return parsed && SESSION_IDS.includes(parsed.localSessionId)
      ? parsed
      : null;
  }, [params.resultSessionId, params.resultStars]);
  const roadItems = useMemo(
    () => buildLessonRoadItems(model, lessonOrdinal),
    [lessonOrdinal, model],
  );
  const pathIndexByItemId = useMemo(() => {
    const indexById = new Map<string, number>();
    let pathIndex = 0;
    for (const item of roadItems) {
      if (
        item.kind === "session" ||
        item.kind === "locked_session" ||
        item.kind === "checkpoint"
      ) {
        indexById.set(item.id, pathIndex);
        pathIndex += 1;
      }
    }
    return indexById;
  }, [roadItems]);
  useLayoutEffect(() => {
    ensureLearningV2CompletionBackgroundSchedulerInstalled();
    if (!isMapFocused) return;
    return enterLearningV2InteractiveSurface();
  }, [isMapFocused]);
  useEffect(() => {
    const refresh = () =>
      setWalletBalance(peekCurrentLearningV2WalletBalance());
    const unsubscribeBalance = subscribeLearningV2WalletBalance(refresh);
    const accountSubscription = subscribeAccountGeneration(refresh);
    refresh();
    return () => {
      unsubscribeBalance();
      accountSubscription.remove();
    };
  }, []);
  useEffect(() => {
    if (!isMapFocused) return;
    void hydrateCurrentLearningV2WalletBalance().catch(() => {});
  }, [isMapFocused]);
  useEffect(() => {
    const next = walletBalance?.walletStateFingerprint ?? null;
    const previous = previousWalletFingerprintRef.current;
    previousWalletFingerprintRef.current = next;
    if (!next || !previous || next === previous || systemReducedMotion) return;
    walletPulse.value = withSequence(
      withTiming(1.16, { duration: 140, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
    );
  }, [systemReducedMotion, walletBalance?.walletStateFingerprint, walletPulse]);
  useEffect(() => {
    if (!auxiliaryScope || !isMapFocused) return;
    const currentSession = model.zones
      .flatMap((zone) => zone.nodes)
      .find((node) => node.state === "current");
    if (!currentSession) return;
    const sessionOrdinal = SESSION_IDS.indexOf(currentSession.id) + 1;
    if (sessionOrdinal < 1) return;
    // Preload the next runnable session while the map is idle. Once the learner
    // opens it, the session claims network-quiet and consumes only this verified
    // cache row. Completed repeats already have their earlier LKG.
    void preloadCurrentLearningV2ActivityReleasedSessionV1({
      ...auxiliaryScope,
      studyTarget,
      learnerSourceLocale: lang,
      sessionOrdinal,
    }).catch(() => undefined);
    void preloadCurrentLearningV2ActivityAudioSessionV1({
      ...auxiliaryScope,
      studyTarget,
      learnerSourceLocale: lang,
      sessionOrdinal,
    }).catch(() => undefined);
    // зачем ВРЕМЕННО откачено на одну сессию вперёд, а не весь урок (владелец,
    // 2026-08-27, «stable identity unavailable» при запуске сессии на боевом
    // устройстве): фоновая загрузка всего урока (все 56 по порядку) стала
    // бить облачную функцию до 55 раз на каждый вход в карту — для сессий,
    // которых ещё нет на сервере. Ошибки там глотаются молча, но нельзя
    // честно исключить побочный эффект на серверную проверку личности без
    // аудита серверного кода. Владелец попросил откатить именно фоновую
    // загрузку, пока причина не прояснится — сам prefetchLearningV2Lesson-
    // InBackgroundV1 (app/learning_v2_lesson_background_prefetch_v1.ts) не
    // удалён, просто не вызывается здесь; вернуть одним включением обратно,
    // когда подтвердится, что дело не в нём.
    void prepareCurrentLearningV2CourseSessionV3({
      locator: {
        environment: "production",
        targetLanguage: studyTarget,
        studyTarget,
        learnerSourceLocale: lang,
        seasonId: "learning-v2",
        lessonOrdinal,
        sessionOrdinal,
      },
      sessionRunId: Crypto.randomUUID(),
    }).catch(() => undefined);
  }, [auxiliaryScope, isMapFocused, lang, lessonOrdinal, model, studyTarget]);
  useEffect(() => {
    if (lessonOrdinal !== 1) return;
    const task = InteractionManager.runAfterInteractions(
      warmLesson1SessionRuntime,
    );
    return () => task.cancel();
  }, [lessonOrdinal]);
  useEffect(() => {
    if (lessonOrdinal !== 1 || !isMapFocused) {
      setLocalRecoveryReady(false);
      setLocalRecoveryOutcome("pending");
      if (lessonOrdinal !== 1) {
        setModel(
          buildLessonMapModel({
            lessonId: lessonOrdinal,
            completedSessionIds: [],
            available: false,
          }),
        );
      }
      return;
    }
    setLocalRecoveryReady(false);
    setLocalRecoveryOutcome("pending");
    let cancelled = false;
    void (async () => {
      const state = await withAccountTransitionLock(async () => {
        const stableId = await getStableId();
        const token = ensureAccountGeneration(stableId);
        const accountScopeHash =
          deriveLocalOfflineProgressAccountScopeHash(stableId);
        const guard = (scope: { stableId: string | null }) =>
          isCurrentAccountGeneration(token, scope.stableId);
        const scope = {
          stableId,
          accountScopeHash,
          seasonId: "learning-v2",
          studyTarget: "en",
          learnerSourceLocale: "ru",
          generation: LOCAL_OFFLINE_PROGRESS_GENERATION,
        };
        const store = createLesson1LocalProgressStore(
          AsyncStorage,
          guard,
          SESSION_IDS,
        );
        await createRequiredSessionLocalCommitCoordinator(
          AsyncStorage,
          guard,
          SESSION_IDS,
        ).recover(scope);
        return store.load(scope);
      });
      if (!cancelled) {
        setModel(buildLessonMapModel(lesson1MapInputFromProgress(state)));
        setLocalRecoveryReady(true);
        setLocalRecoveryOutcome("success");
      }
    })().catch(() => {
      if (!cancelled) {
        // Preserve the final map geometry and release the global quiet owner only
        // after that fallback has painted. The durable local journal remains for
        // a later recovery; no completion transport is woken on this path.
        setLocalRecoveryReady(true);
        setLocalRecoveryOutcome("failure");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isMapFocused, lessonOrdinal]);
  useEffect(() => {
    if (
      lessonOrdinal !== 1 ||
      !isMapFocused ||
      !localRecoveryReady ||
      localRecoveryOutcome === "pending"
    )
      return;
    let cancelled = false;
    let firstFrame = 0;
    let secondFrame = 0;
    const exitTarget =
      captureLearningV2SessionNetworkIntentFrameReleaseTarget("exit");
    const resultTarget =
      captureLearningV2SessionNetworkIntentFrameReleaseTarget("result");
    const task = InteractionManager.runAfterInteractions(() => {
      firstFrame = requestAnimationFrame(() => {
        if (cancelled) return;
        secondFrame = requestAnimationFrame(() => {
          if (cancelled) return;
          // RESULT_VISIBLE: one complete paint occurred between the two frame
          // callbacks. Network admission reopens only after this boundary.
          releaseLearningV2SessionNetworkIntentAfterExitFrame(exitTarget);
          releaseLearningV2SessionNetworkIntentAfterResultFrame(resultTarget);
        });
      });
    });
    return () => {
      cancelled = true;
      task.cancel();
      if (firstFrame) cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
      // If this destination disappears before its acknowledgement, transfer the
      // release to the next painted destination instead of leaking forever.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          releaseLearningV2SessionNetworkIntentAfterExitFrame(exitTarget);
          releaseLearningV2SessionNetworkIntentAfterResultFrame(resultTarget);
        }),
      );
    };
  }, [isMapFocused, lessonOrdinal, localRecoveryOutcome, localRecoveryReady]);
  useEffect(() => () => cancelPreparedLearningV2SessionNetworkIntent(), []);
  const completeCount = model.zones
    .flatMap((zone) => zone.nodes)
    .filter((node) => node.state === "completed").length;
  const walletStars =
    walletBalance === null
      ? null
      : walletBalance.balanceSubunits / WALLET_SUBUNITS_PER_STAR;
  const walletStarsLabel =
    walletStars === null
      ? "—"
      : new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(
          walletStars,
        );
  const selectNode = (node: LessonMapNode) => {
    navigationLatchRef.current = false;
    if (node.state === "locked" || node.state === "next") {
      cancelPreparedLearningV2SessionNetworkIntent();
      setSelected(node);
      return;
    }
    // SESSION_INTENT starts before the sheet animation so normal quiescence is
    // hidden inside an already-requested local interaction, never a loader.
    // Auxiliary descriptor transport is deliberately NOT started here: the
    // current runnable node was already preloaded by the idle map effect above.
    prepareLearningV2SessionNetworkIntent(node.id);
    setSelected(node);
  };
  const selectCourseNode = (node: LockedSessionRoadNode) => {
    navigationLatchRef.current = false;
    cancelPreparedLearningV2SessionNetworkIntent();
    setSelected(node);
  };
  const dismissSheet = React.useCallback(() => {
    navigationLatchRef.current = false;
    cancelPreparedLearningV2SessionNetworkIntent();
    setSelected(null);
  }, []);
  const selectedCourseNode =
    typeof selected === "object" && selected !== null && "kind" in selected
      ? selected
      : null;
  const selectedSession =
    typeof selected === "object" && selected !== null && !("kind" in selected)
      ? selected
      : null;
  // зачем: обе кнопки листа («Начать» и «Пропустить теорию») ведут на один и
  // тот же экран сессии, разница только в параметре skipTheory — вынесено в
  // одну функцию, чтобы не дублировать защиту от повторного нажатия.
  const enterSelectedSession = (skipTheory: boolean) => {
    if (
      !selectedSession ||
      (selectedSession.state !== "current" &&
        selectedSession.state !== "completed")
    ) {
      dismissSheet();
      return;
    }
    if (navigationLatchRef.current) return;
    navigationLatchRef.current = true;
    setSelected(null);
    try {
      requestAnimationFrame(() => {
        router.push({
          pathname: "/learning-v2/session/[id]",
          params: {
            id: learningV2CourseSessionIdV1(
              lessonOrdinal,
              selectedSession.order,
            ),
            runtimeMode: "direct_v1",
            lessonOrdinal: String(lessonOrdinal),
            sessionOrdinal: String(selectedSession.order),
            runKind:
              selectedSession.state === "completed" ? "repeat" : "initial",
            ...(__DEV__ &&
            studyTarget === "en" &&
            lessonOrdinal === 1 &&
            selectedSession.order === 1
              ? {
                  previewMode: "authoring_v1",
                  previewOrigin: "course",
                }
              : {}),
            ...(skipTheory ? { skipTheory: "1" } : {}),
            ...(auxiliaryScope
              ? {
                  releaseEnvironment: auxiliaryScope.environment,
                  releaseSeasonId: auxiliaryScope.seasonId,
                }
              : {}),
          },
        } as never);
      });
    } catch (error) {
      navigationLatchRef.current = false;
      cancelPreparedLearningV2SessionNetworkIntent(selectedSession.id);
      throw error;
    }
  };
  return (
    <View style={[styles.screen, { backgroundColor: t.bgPrimary }]}>
      <FlatList
        data={roadItems}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 104 },
        ]}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Назад"
                hitSlop={10}
                onPress={() => safeRouterBack(router, "/learning-v2/course")}
                style={[styles.headerButton, { backgroundColor: t.bgCard }]}
              >
                <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
              </Pressable>
              <Animated.View
                accessibilityRole="text"
                accessibilityLiveRegion="polite"
                accessibilityLabel={
                  walletStars === null
                    ? "Подтверждённый баланс рун ещё не создан"
                    : `Подтверждённый баланс: ${walletStarsLabel} ${runeWord("ru", Math.round(walletStars))}`
                }
                style={[
                  styles.wallet,
                  { backgroundColor: t.bgCard },
                  walletPulseStyle,
                ]}
              >
                <RuneGlyph size={16} color={t.gold} />
                <Text style={[styles.walletText, { color: t.textPrimary }]}>
                  {walletStarsLabel}
                </Text>
              </Animated.View>
            </View>
            <View style={styles.courseIdentity}>
              <View style={styles.courseIdentityCopy}>
                <Text style={[styles.eyebrow, { color: t.textMuted }]}>
                  УРОК {lessonOrdinal} · 56 СЕССИЙ
                </Text>
                <Text
                  style={[
                    styles.title,
                    {
                      color: t.textPrimary,
                      fontSize: f.h1,
                      lineHeight: f.h1 + 5,
                    },
                  ]}
                >
                  {lessonTitle}
                </Text>
              </View>
            </View>
            {returnReward && (
              <Animated.View
                entering={
                  systemReducedMotion
                    ? FadeInDown.duration(1)
                    : FadeInDown.duration(280).easing(Easing.out(Easing.cubic))
                }
                accessible
                accessibilityLabel={`Результат сессии сохранён. ${returnReward.provisionalStars} из ${returnReward.maxStars} звёзд качества. Общий баланс обновляется отдельно.`}
                accessibilityLiveRegion="polite"
                style={[
                  styles.returnReward,
                  { backgroundColor: t.bgCard, borderColor: t.border },
                ]}
              >
                <View
                  importantForAccessibility="no-hide-descendants"
                  style={[styles.returnRewardIcon, { backgroundColor: t.gold }]}
                >
                  <Ionicons
                    name={
                      returnReward.provisionalStars > 0
                        ? "star"
                        : "star-outline"
                    }
                    size={25}
                    color={t.textOnGold}
                  />
                </View>
                <View style={styles.returnRewardCopy}>
                  <Text
                    style={[styles.returnRewardEyebrow, { color: t.textMuted }]}
                  >
                    РЕЗУЛЬТАТ СЕССИИ СОХРАНЁН
                  </Text>
                  <Text
                    style={[styles.returnRewardTitle, { color: t.textPrimary }]}
                  >
                    {returnReward.provisionalStars} из {returnReward.maxStars}{" "}
                    звёзд качества
                  </Text>
                  <Text
                    style={[styles.returnRewardNote, { color: t.textMuted }]}
                  >
                    Общий баланс обновляется отдельно
                  </Text>
                </View>
              </Animated.View>
            )}
            <View
              style={[
                styles.chapterCard,
                { backgroundColor: t.bgCard, borderColor: t.border },
              ]}
            >
              <View style={styles.chapterTopline}>
                <Text style={[styles.chapterEyebrow, { color: t.accent }]}>
                  КАРТА УРОКА
                </Text>
                <View
                  style={[
                    styles.chapterProgressPill,
                    { backgroundColor: t.bgSurface },
                  ]}
                >
                  <Ionicons name="star" size={12} color={t.gold} />
                  <Text
                    style={[
                      styles.chapterProgressText,
                      { color: t.textPrimary },
                    ]}
                  >
                    {completeCount}/{LEARNING_V2_LESSON_SESSION_COUNT_V1}
                  </Text>
                </View>
              </View>
              <Text style={[styles.chapterTitle, { color: t.textPrimary }]}>
                Урок {lessonOrdinal}
              </Text>
              <Text style={[styles.chapterSubtitle, { color: t.textMuted }]}>
                {LEARNING_V2_LESSON_CHAPTER_COUNT_V1} глав ·{" "}
                {LEARNING_V2_LESSON_SESSION_COUNT_V1} сессий
              </Text>
              <View
                accessibilityLabel={`Пройдено ${completeCount} из ${LEARNING_V2_LESSON_SESSION_COUNT_V1}`}
                style={[
                  styles.progressTrack,
                  { backgroundColor: t.bgSurface2 },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: t.accent },
                    {
                      width: `${Math.round((completeCount / LEARNING_V2_LESSON_SESSION_COUNT_V1) * 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
            {mistakeLoopCount >= 5 ? (
              <MistakePracticeLoopNode
                count={mistakeLoopCount}
                locked={!hasPremiumAccess}
                onPress={() => {
                  if (!hasPremiumAccess) {
                    router.push({ pathname: "/premium_modal", params: { context: 'mistake_practice' } } as never);
                    return;
                  }
                  trackMistakePracticeEvent('mistake_practice_loop_started', {
                    study_target: studyTarget,
                    entry_source: 'learning_v2',
                    lesson_id: mistakeLessonId,
                    ready_count: mistakeLoopCount,
                    plus_access: true,
                  });
                  router.push({
                    pathname: '/mistake_practice_session',
                    params: { length: '5', lessonId: mistakeLessonId },
                  } as never);
                }}
              />
            ) : null}
          </>
        }
        renderItem={({ item }) => {
          if (item.kind === "session") {
            const pathIndex = pathIndexByItemId.get(item.id) ?? 0;
            return (
              <Node
                node={item.node}
                pathIndex={pathIndex}
                decoration={mapDecorationAt(pathIndex)}
                onPress={selectNode}
                theme={t}
              />
            );
          }
          if (item.kind === "chapter")
            return (
              <View
                style={[
                  styles.chapterCard,
                  styles.futureChapterCard,
                  { backgroundColor: t.bgCard, borderColor: t.border },
                ]}
              >
                <Text style={[styles.chapterTitle, { color: t.textPrimary }]}>
                  {item.chapter.title}
                </Text>
                <Text style={[styles.chapterSubtitle, { color: t.textMuted }]}>
                  {item.chapter.subtitle}
                </Text>
              </View>
            );
          const pathIndex = pathIndexByItemId.get(item.id) ?? 0;
          return (
            <FutureCourseNode
              node={item}
              pathIndex={pathIndex}
              decoration={mapDecorationAt(pathIndex)}
              onPress={selectCourseNode}
              theme={t}
            />
          );
        }}
      />
      <LessonMapSheet
        visible={selected !== null}
        onClose={dismissSheet}
        bottomInset={insets.bottom}
      >
        {selectedCourseNode ? (
          <>
            <Text style={[styles.sheetTitle, { color: t.textPrimary }]}>
              {selectedCourseNode.kind === "checkpoint"
                ? "Проверка"
                : `Сессия ${selectedCourseNode.ordinal}`}
            </Text>
            <Text style={[styles.sheetText, { color: t.textMuted }]}>
              {selectedCourseNode.title}. Сначала завершите предыдущую сессию.
            </Text>
          </>
        ) : selectedSession ? (
          <>
            <Text style={[styles.sheetTitle, { color: t.textPrimary }]}>
              {sessionOutcomeTitle(selectedSession.order)}
            </Text>
            <Text style={[styles.sheetText, { color: t.textMuted }]}>
              {selectedSession.state === "locked" ||
              selectedSession.state === "next"
                ? "Сначала спокойно заверши предыдущую сессию."
                : selectedSession.state === "completed"
                  ? "Сессия пройдена. Можно улучшить результат и собрать больше звёзд."
                  : sessionOutcomeText(selectedSession.order)}
            </Text>
          </>
        ) : null}
        <View style={styles.sheetCtaWrap}>
          <Pressable
            accessibilityRole="button"
            onPress={() => enterSelectedSession(false)}
            style={[styles.sheetCta, { backgroundColor: t.accent }]}
          >
            <Text style={[styles.sheetCtaText, { color: t.correctText }]}>
              {selectedSession?.state === "current"
                ? "Начать"
                : selectedSession?.state === "completed"
                  ? "Повторить"
                  : "Закрыть"}
            </Text>
          </Pressable>
          {/* Цена входа видна до нажатия. На «Понятно» (сессия заблокирована)
              бейджа нет — там ничего не спишется. */}
          {selectedSession?.state === "current" || selectedSession?.state === "completed" ? (
            <EnergyCostBadge testID="learning-v2-map-energy-cost" />
          ) : null}
        </View>
        {/* зачем: владелец — «начать» уже есть, второй кнопкой текстом ниже
            даём пропустить теорию для новой (ещё не пройденной) сессии.
            Пропуск не изобретает новый экран: слоты 1-3 из 12 просто не
            начисляются, практика идёт сразу с 4-го (см. session/[id].tsx). */}
        {selectedSession?.state === "current" && (
          <Pressable
            accessibilityRole="button"
            onPress={() => enterSelectedSession(true)}
            style={styles.sheetSkipTouch}
          >
            <Text style={[styles.sheetSkipText, { color: t.textMuted }]}>
              Пропустить теорию
            </Text>
            <EnergyCostBadge testID="learning-v2-skip-theory-energy-cost" />
          </Pressable>
        )}
      </LessonMapSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#12161C" },
  scroll: { paddingHorizontal: 18 },
  header: {
    height: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#202833",
  },
  wallet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#202833",
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
  },
  walletText: { color: "#F4F6F8", fontWeight: "800" },
  courseIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 14,
  },
  courseIdentityCopy: { flex: 1 },
  eyebrow: {
    color: "#7E8A99",
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 1.8,
  },
  title: {
    color: "#F7F9FB",
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "900",
    marginTop: 3,
  },
  returnReward: {
    minHeight: 78,
    borderRadius: 22,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#2C2819",
    borderWidth: 1,
    borderColor: "#6B5726",
  },
  returnRewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD75A",
  },
  returnRewardCopy: { flex: 1 },
  returnRewardEyebrow: {
    color: "#C7B777",
    fontSize: 9.5,
    lineHeight: 14,
    letterSpacing: 1.25,
    fontWeight: "900",
  },
  returnRewardTitle: {
    color: "#FFF2B5",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
    marginTop: 1,
  },
  returnRewardNote: {
    color: "#9F956F",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
    marginTop: 1,
  },
  chapterCard: {
    marginTop: 18,
    borderRadius: 22,
    backgroundColor: "#1B2430",
    borderWidth: 1,
    paddingHorizontal: 17,
    paddingVertical: 15,
  },
  futureChapterCard: { marginTop: 24, marginBottom: 8 },
  chapterTopline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  chapterProgressPill: {
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 9,
    backgroundColor: "#2A2B29",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chapterProgressText: { color: "#F2DF9A", fontSize: 11, fontWeight: "900" },
  chapterEyebrow: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "900",
    letterSpacing: 1.7,
  },
  chapterTitle: {
    color: "#F7F9FB",
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900",
    marginTop: 4,
  },
  chapterSubtitle: {
    color: "#98A6B5",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    marginTop: 3,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "#303A46",
    marginTop: 12,
  },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: "#6FD6FF" },
  zone: {
    alignSelf: "center",
    color: "#A9B3BF",
    backgroundColor: "#1B222B",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginTop: 10,
    marginBottom: 2,
  },
  nodeLane: { height: 74, alignItems: "center", justifyContent: "center" },
  node: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderBottomWidth: 6,
  },
  node_completed: { backgroundColor: "#8EE65A", borderColor: "#B9F58C" },
  node_current: { backgroundColor: "#F5C84C", borderColor: "#FFE28A" },
  node_next: { backgroundColor: "#516DFF", borderColor: "#8BA2FF" },
  node_locked: { backgroundColor: "#252C35", borderColor: "#39424D" },
  nodePressed: { opacity: 0.82 },
  nodeNumber: { color: "#F7F9FB", fontWeight: "900", fontSize: 22 },
  nodeNumberCurrent: { color: "#17120A", fontSize: 28 },
  nodeOrderBadge: {
    position: "absolute",
    right: -6,
    bottom: -4,
    minWidth: 21,
    height: 21,
    paddingHorizontal: 4,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#17202A",
    borderWidth: 2,
    borderColor: "#8BA2FF",
  },
  nodeOrderBadgeCurrent: { backgroundColor: "#17120A", borderColor: "#FFE28A" },
  nodeOrderText: { color: "#F7F9FB", fontSize: 9, fontWeight: "900" },
  nodeOrderTextCurrent: { color: "#FFE28A" },
  halo: { position: "absolute", backgroundColor: "#F5C84C" },
  futureNodeLane: {
    height: 74,
    alignItems: "center",
    justifyContent: "center",
  },
  futureNodeRow: {
    minHeight: 72,
    width: 220,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  episodeNode: {
    width: 60,
    height: 60,
    borderRadius: 23,
    backgroundColor: "#242C36",
    borderWidth: 2,
    borderBottomWidth: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  examNode: {
    width: 74,
    height: 74,
    borderRadius: 25,
    backgroundColor: "#292A2B",
    borderWidth: 2,
    borderBottomWidth: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  episodeNumberBadge: {
    position: "absolute",
    right: -5,
    bottom: -4,
    minWidth: 21,
    height: 21,
    paddingHorizontal: 4,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#151B22",
    borderWidth: 2,
    borderColor: "#3B4653",
  },
  episodeNumber: { color: "#A3ADBA", fontSize: 9, fontWeight: "900" },
  futureNodeLabel: { position: "absolute", width: 150 },
  futureNodeLabelLeft: { right: 144, alignItems: "flex-end" },
  futureNodeLabelRight: { left: 144, alignItems: "flex-start" },
  futureNodeEyebrow: {
    fontSize: 9.5,
    lineHeight: 14,
    letterSpacing: 1.2,
    fontWeight: "900",
  },
  futureNodeTitle: {
    color: "#B7C1CC",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 2,
  },
  mapDecoration: { position: "absolute", width: 82, height: 82, zIndex: 2 },
  mapDecorationLeft: { left: 0 },
  mapDecorationRight: { right: 0 },
  sheetModalRoot: { flex: 1 },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  sheetModalAlign: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    width: "100%",
    backgroundColor: "#202833",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 14,
    paddingHorizontal: 22,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#647182",
    alignSelf: "center",
  },
  sheetClose: {
    position: "absolute",
    right: 16,
    top: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2B3542",
    zIndex: 2,
  },
  sheetTitle: {
    color: "#F7F9FB",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 20,
  },
  sheetText: { color: "#B4BEC9", lineHeight: 20, marginTop: 8, minHeight: 52 },
  // Якорь для углового бейджа «−1 ⚡».
  sheetCtaWrap: { position: "relative" },
  sheetCta: {
    height: 56,
    borderRadius: 20,
    backgroundColor: "#8EE65A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  sheetCtaText: { color: "#07110A", fontWeight: "900", fontSize: 16 },
  // Текстовая кнопка ниже основной — не притворяется CTA: без заливки и тени.
  sheetSkipTouch: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  sheetSkipText: { fontWeight: "700", fontSize: 14 },
});
