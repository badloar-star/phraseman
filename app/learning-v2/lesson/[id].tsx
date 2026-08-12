import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, FlatList, Image, InteractionManager, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
  SlideInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { getStableId } from '../../../app/stable_id';
import {
  ensureLearningV2CompletionBackgroundSchedulerInstalled,
  enterLearningV2InteractiveSurface,
} from '../../../app/learning_v2_completion_background_scheduler';
import {
  cancelPreparedLearningV2SessionNetworkIntent,
  captureLearningV2SessionNetworkIntentFrameReleaseTarget,
  prepareLearningV2SessionNetworkIntent,
  releaseLearningV2SessionNetworkIntentAfterExitFrame,
  releaseLearningV2SessionNetworkIntentAfterResultFrame,
} from '../../../app/learning_v2_session_network_quiet';
import { parseLearningV2SessionResultRouteParams } from '../../../app/learning_v2_session_result_handoff';
import { ensureAccountGeneration, isCurrentAccountGeneration, subscribeAccountGeneration, withAccountTransitionLock } from '../../../app/account_generation';
import {
  hydrateCurrentLearningV2WalletBalance,
  peekCurrentLearningV2WalletBalance,
  subscribeLearningV2WalletBalance,
} from '../../../app/learning_v2_wallet_balance_store';
import { WALLET_SUBUNITS_PER_STAR } from '../../../modules/learning-v2/contracts/wallet';
import { useIsScreenFocused } from '../../../hooks/use_is_screen_focused';
import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import { safeRouterBack } from '../../../app/navigation_back';
import { lesson1MapInputFromProgress } from '../../../modules/learning-v2/map/lesson1_map_progress_adapter';
import { buildLessonMapModel, type LessonMapNode } from '../../../modules/learning-v2/map/lesson_map_model';
import { createLesson1LocalProgressStore } from '../../../modules/learning-v2/progress/lesson1_local_progress';
import {
  deriveLocalOfflineProgressAccountScopeHash,
  LOCAL_OFFLINE_PROGRESS_GENERATION,
} from '../../../modules/learning-v2/progress/progress_account_scope';
import { createRequiredSessionLocalCommitCoordinator } from '../../../modules/learning-v2/progress/required_session_local_commit';
import { getLesson1SourcePayload, warmLesson1SessionRuntime } from '../../../modules/learning-v2/runtime/lesson1_session_runtime';

const SESSION_IDS = ['understand', 'use', 'master'].flatMap(zone =>
  [1, 2, 3, 4].map(index => `lesson-1-${zone}-${index}`),
);
const fallbackModel = buildLessonMapModel({ lessonId: 1, completedSessionIds: [], currentSessionId: SESSION_IDS[0] });

const EPISODE_TITLES = Object.freeze([
  'Hello, I’m…', 'Who’s this? What’s that?', 'My people, my things', 'What I like and want',
  'My ordinary day', 'When and how often?', 'Can you help me?', 'First day here',
  'My home and neighborhood', 'At the shop', 'What’s happening now?', 'Yesterday: where and what',
  'My weekend story', 'I don’t feel well', 'Let’s make a plan', 'Weekend with a friend',
  'At the station or airport', 'Checking in', 'A meal that works for me', 'Which one is better?',
  'Have you ever…?', 'Rules and permission', 'Keep the conversation going', 'Travel day goes wrong',
  'My work or study day', 'What happened while…?', 'Solve a service problem', 'If this happens…',
  'The person or place I mean', 'Messages and what people said', 'My story and next step', 'One independent day',
] as const);

const COURSE_CHAPTERS = Object.freeze([
  { ordinal: 1, title: 'Я могу начать разговор', subtitle: 'Знакомство, люди, желания и первые просьбы', accent: '#6FD6FF' },
  { ordinal: 2, title: 'Моя повседневная жизнь', subtitle: 'Дом, покупки, планы и события', accent: '#A78BFA' },
  { ordinal: 3, title: 'Я справляюсь в поездке', subtitle: 'Транспорт, отель, еда и живое общение', accent: '#F8C65C' },
  { ordinal: 4, title: 'Я говорю самостоятельно', subtitle: 'Работа, истории, проблемы и решения', accent: '#8EE65A' },
] as const);

const SESSION_ZONE_META = Object.freeze({
  understand: { label: 'ПОНЯТЬ', icon: 'sparkles' },
  use: { label: 'ПРИМЕНИТЬ', icon: 'chatbubble-ellipses' },
  master: { label: 'ЗАКРЕПИТЬ', icon: 'star' },
} satisfies Record<LessonMapNode['zoneId'], { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }>);

const EPISODE_ICONS = Object.freeze([
  'chatbubble-ellipses',
  'headset',
  'layers',
  'mic',
  'flash',
  'sparkles',
] satisfies readonly React.ComponentProps<typeof Ionicons>['name'][]);

const MAP_ART = Object.freeze({
  guide: require('../../../assets/images/learning_v2_map/phraseman-map-guide-v1.webp'),
  chest: require('../../../assets/images/learning_v2_map/phraseman-map-chest-v1.webp'),
  sign: require('../../../assets/images/learning_v2_map/phraseman-map-sign-v1.webp'),
  exam: require('../../../assets/images/learning_v2_map/phraseman-map-exam-v1.webp'),
});

// A compact repeating wave makes the course feel like one continuous path,
// while chapter cards and exams still split it into understandable sectors.
const PATH_WAVE = Object.freeze([0, -38, -72, -90, -72, -34, 18, 62, 88, 66, 26, -20] as const);
const pathOffsetAt = (pathIndex: number): number => PATH_WAVE[pathIndex % PATH_WAVE.length];

function mapDecorationAt(pathIndex: number): { source: ImageSourcePropType; side: 'left' | 'right' } | null {
  if (pathIndex === 3) return { source: MAP_ART.guide, side: 'right' };
  if (pathIndex === 8) return { source: MAP_ART.chest, side: 'left' };
  if (pathIndex === 15) return { source: MAP_ART.sign, side: 'right' };
  if (pathIndex === 23) return { source: MAP_ART.exam, side: 'left' };
  return null;
}

type CourseRoadNode = Readonly<{
  kind: 'episode' | 'checkpoint';
  id: string;
  ordinal: number;
  chapterOrdinal: number;
  title: string;
  xOffset: number;
  accent: string;
}>;

type CourseRoadItem =
  | Readonly<{ kind: 'zone'; id: string; title: string }>
  | Readonly<{ kind: 'session'; id: string; node: LessonMapNode }>
  | Readonly<{ kind: 'chapter'; id: string; chapter: (typeof COURSE_CHAPTERS)[number] }>
  | CourseRoadNode;

const FUTURE_COURSE_ROAD = Object.freeze(Array.from({ length: 31 }, (_, index): CourseRoadItem => {
  const ordinal = index + 2;
  const chapterOrdinal = Math.ceil(ordinal / 8);
  const chapter = COURSE_CHAPTERS[chapterOrdinal - 1];
  const checkpoint = ordinal % 8 === 0;
  return Object.freeze({
    kind: checkpoint ? 'checkpoint' : 'episode',
    id: `episode-${ordinal}`,
    ordinal,
    chapterOrdinal,
    title: EPISODE_TITLES[ordinal - 1],
    xOffset: [-68, -18, 68, 20][ordinal % 4],
    accent: chapter.accent,
  } satisfies CourseRoadNode);
}));

function buildCourseRoadItems(model: ReturnType<typeof buildLessonMapModel>): readonly CourseRoadItem[] {
  const items: CourseRoadItem[] = [];
  for (const zone of model.zones) {
    items.push({ kind: 'zone', id: `zone-${zone.id}`, title: zone.title });
    for (const node of zone.nodes) items.push({ kind: 'session', id: node.id, node });
  }
  for (const item of FUTURE_COURSE_ROAD) {
    if (item.kind !== 'episode' && item.kind !== 'checkpoint') continue;
    if (item.ordinal === 9 || item.ordinal === 17 || item.ordinal === 25) {
      const chapter = COURSE_CHAPTERS[item.chapterOrdinal - 1];
      items.push({ kind: 'chapter', id: `chapter-${item.chapterOrdinal}`, chapter });
    }
    items.push(item);
  }
  return Object.freeze(items);
}

function Node({
  node,
  pathIndex,
  decoration,
  onPress,
}: {
  node: LessonMapNode;
  pathIndex: number;
  decoration: ReturnType<typeof mapDecorationAt>;
  onPress: (node: LessonMapNode) => void;
}) {
  const reducedMotion = useReducedMotion();
  const halo = useSharedValue(node.state === 'current' ? 0.7 : 0);
  // зачем: AppState один ловит только сворачивание всего приложения, а не уход
  // с этой карты урока на другой экран внутри приложения (freezeOnBlur глушит
  // рендер, но не сам withRepeat) — добавлен useIsScreenFocused по эталону
  // components/AvatarAura.tsx, иначе гало крутится в фоне и греет телефон.
  const isFocused = useIsScreenFocused();
  useEffect(() => {
    if (node.state !== 'current' || reducedMotion || !isFocused) { halo.value = node.state === 'current' && isFocused ? 0.7 : 0; return; }
    const update = () => {
      halo.value = AppState.currentState === 'active'
        ? withRepeat(withSequence(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }), withTiming(.55, { duration: 1200, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System })), -1, false)
        : 0;
    };
    update(); const subscription = AppState.addEventListener('change', update);
    return () => { subscription.remove(); halo.value = 0; };
  }, [halo, node.state, reducedMotion, isFocused]);
  const haloStyle = useAnimatedStyle(() => ({ opacity: halo.value, transform: [{ scale: 1 + halo.value * .14 }] }));
  const size = node.state === 'current' ? 84 : node.state === 'next' ? 64 : node.state === 'completed' ? 58 : 58;
  const xOffset = pathOffsetAt(pathIndex);
  const locked = node.state === 'locked';
  const zoneMeta = SESSION_ZONE_META[node.zoneId];
  const accessibleState = node.state === 'completed' ? 'пройдена' : node.state === 'current' ? 'текущая' : node.state === 'next' ? 'следующая' : 'заблокирована';
  const entrance = reducedMotion
    ? FadeInDown.duration(1)
    : FadeInDown.delay((node.order - 1) * 40).duration(320).easing(Easing.bezier(.38, .70, .125, 1));
  return <Animated.View entering={entrance} style={styles.nodeLane}>
    {decoration && <Image accessibilityElementsHidden source={decoration.source} resizeMode="contain" style={[styles.mapDecoration, decoration.side === 'left' ? styles.mapDecorationLeft : styles.mapDecorationRight]} />}
    <View style={{ transform: [{ translateX: xOffset }] }}>
    {node.state === 'current' && <Animated.View pointerEvents="none" style={[styles.halo, { width: size, height: size, borderRadius: size / 2 }, haloStyle]} />}
    <Pressable accessibilityRole="button" accessibilityLabel={`${zoneMeta.label.toLocaleLowerCase('ru')}, сессия ${node.order}, ${accessibleState}`} accessibilityHint={locked ? 'Сначала завершите предыдущую сессию' : 'Открыть сведения о сессии'} onPress={() => onPress(node)} style={({ pressed }) => [styles.node, { width: size, height: size, borderRadius: size / 2 }, styles[`node_${node.state}`], pressed && !locked && styles.nodePressed]}>
      {locked
        ? <Ionicons name="lock-closed" size={20} color="#777D88" />
        : node.state === 'completed'
          ? <Ionicons name="checkmark" size={28} color="#07110A" />
          : <Ionicons name={node.state === 'current' ? 'star' : zoneMeta.icon} size={node.state === 'current' ? 34 : 25} color={node.state === 'current' ? '#17120A' : '#F7F9FB'} />}
      {!locked && node.state !== 'completed' && <View style={[styles.nodeOrderBadge, node.state === 'current' && styles.nodeOrderBadgeCurrent]}><Text style={[styles.nodeOrderText, node.state === 'current' && styles.nodeOrderTextCurrent]}>{node.order}</Text></View>}
    </Pressable>
    </View>
  </Animated.View>;
}

function FutureCourseNode({
  node,
  pathIndex,
  decoration,
  onPress,
}: {
  node: CourseRoadNode;
  pathIndex: number;
  decoration: ReturnType<typeof mapDecorationAt>;
  onPress: (node: CourseRoadNode) => void;
}) {
  const isCheckpoint = node.kind === 'checkpoint';
  const xOffset = pathOffsetAt(pathIndex);
  const showLabel = isCheckpoint;
  const episodeIcon = EPISODE_ICONS[(node.ordinal - 1) % EPISODE_ICONS.length];
  return <View style={styles.futureNodeLane}>
    {decoration && <Image accessibilityElementsHidden source={decoration.source} resizeMode="contain" style={[styles.mapDecoration, decoration.side === 'left' ? styles.mapDecorationLeft : styles.mapDecorationRight]} />}
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isCheckpoint ? 'Экзамен' : 'Эпизод'} ${node.ordinal}: ${node.title}, заблокирован`}
      accessibilityHint="Сначала завершите предыдущие эпизоды"
      onPress={() => onPress(node)}
      style={({ pressed }) => [styles.futureNodeRow, { transform: [{ translateX: xOffset }] }, pressed && styles.nodePressed]}
    >
      <View style={[isCheckpoint ? styles.examNode : styles.episodeNode, { borderColor: `${node.accent}70` }]}>
        <Ionicons name={isCheckpoint ? 'trophy' : episodeIcon} size={isCheckpoint ? 29 : 24} color={isCheckpoint ? node.accent : '#7D8794'} />
        {!isCheckpoint && <View style={styles.episodeNumberBadge}><Text style={styles.episodeNumber}>{node.ordinal}</Text></View>}
      </View>
      {showLabel && <View style={[styles.futureNodeLabel, xOffset > 0 ? styles.futureNodeLabelLeft : styles.futureNodeLabelRight]}>
        <Text style={[styles.futureNodeEyebrow, { color: node.accent }]}>{isCheckpoint ? `ЭКЗАМЕН · ${node.ordinal}` : `ЭПИЗОД ${node.ordinal}`}</Text>
        <Text style={styles.futureNodeTitle}>{node.title}</Text>
      </View>}
    </Pressable>
  </View>;
}

export default function LearningV2LessonMap() {
  const router = useRouter(); const insets = useStableSafeAreaInsets();
  const params = useLocalSearchParams<{
    id?: string;
    resultSessionId?: string | string[];
    resultStars?: string | string[];
  }>();
  const { id } = params;
  const systemReducedMotion = useReducedMotion();
  const [model, setModel] = useState(fallbackModel);
  const [selected, setSelected] = useState<LessonMapNode | CourseRoadNode | 'dictionary' | 'theory' | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [localRecoveryReady, setLocalRecoveryReady] = useState(false);
  const [localRecoveryOutcome, setLocalRecoveryOutcome] = useState<'pending' | 'success' | 'failure'>('pending');
  const [walletBalance, setWalletBalance] = useState(peekCurrentLearningV2WalletBalance);
  const [payload] = useState(getLesson1SourcePayload);
  const isMapFocused = useIsScreenFocused();
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
    return parsed && SESSION_IDS.includes(parsed.localSessionId) ? parsed : null;
  }, [params.resultSessionId, params.resultStars]);
  const roadItems = useMemo(() => buildCourseRoadItems(model), [model]);
  const pathIndexByItemId = useMemo(() => {
    const indexById = new Map<string, number>();
    let pathIndex = 0;
    for (const item of roadItems) {
      if (item.kind === 'session' || item.kind === 'episode' || item.kind === 'checkpoint') {
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
    const refresh = () => setWalletBalance(peekCurrentLearningV2WalletBalance());
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
  useEffect(() => { void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion); }, []);
  useEffect(() => {
    if (id && id !== '1') return;
    const task = InteractionManager.runAfterInteractions(warmLesson1SessionRuntime);
    return () => task.cancel();
  }, [id]);
  useEffect(() => {
    if ((id && id !== '1') || !isMapFocused) {
      setLocalRecoveryReady(false);
      setLocalRecoveryOutcome('pending');
      return;
    }
    setLocalRecoveryReady(false);
    setLocalRecoveryOutcome('pending');
    let cancelled = false;
    void (async () => {
      const state = await withAccountTransitionLock(async () => {
        const stableId = await getStableId(); const token = ensureAccountGeneration(stableId);
        const accountScopeHash = deriveLocalOfflineProgressAccountScopeHash(stableId);
        const guard = (scope: { stableId: string | null }) => isCurrentAccountGeneration(token, scope.stableId);
        const scope = { stableId, accountScopeHash, seasonId: 'learning-v2', studyTarget: 'en', learnerSourceLocale: 'ru', generation: LOCAL_OFFLINE_PROGRESS_GENERATION };
        const store = createLesson1LocalProgressStore(AsyncStorage, guard, SESSION_IDS);
        await createRequiredSessionLocalCommitCoordinator(AsyncStorage, guard, SESSION_IDS).recover(scope);
        return store.load(scope);
      });
      if (!cancelled) {
        setModel(buildLessonMapModel(lesson1MapInputFromProgress(state)));
        setLocalRecoveryReady(true);
        setLocalRecoveryOutcome('success');
      }
    })().catch(() => {
      if (!cancelled) {
        // Preserve the final map geometry and release the global quiet owner only
        // after that fallback has painted. The durable local journal remains for
        // a later recovery; no completion transport is woken on this path.
        setLocalRecoveryReady(true);
        setLocalRecoveryOutcome('failure');
      }
    });
    return () => { cancelled = true; };
  }, [id, isMapFocused]);
  useEffect(() => {
    if ((id && id !== '1') || !isMapFocused || !localRecoveryReady ||
      localRecoveryOutcome === 'pending') return;
    let cancelled = false;
    let firstFrame = 0;
    let secondFrame = 0;
    const exitTarget = captureLearningV2SessionNetworkIntentFrameReleaseTarget('exit');
    const resultTarget = captureLearningV2SessionNetworkIntentFrameReleaseTarget('result');
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
      requestAnimationFrame(() => requestAnimationFrame(() => {
        releaseLearningV2SessionNetworkIntentAfterExitFrame(exitTarget);
        releaseLearningV2SessionNetworkIntentAfterResultFrame(resultTarget);
      }));
    };
  }, [id, isMapFocused, localRecoveryOutcome, localRecoveryReady]);
  useEffect(() => () => cancelPreparedLearningV2SessionNetworkIntent(), []);
  const completeCount = model.zones.flatMap(zone => zone.nodes).filter(node => node.state === 'completed').length;
  const walletStars = walletBalance === null
    ? null
    : walletBalance.balanceSubunits / WALLET_SUBUNITS_PER_STAR;
  const walletStarsLabel = walletStars === null
    ? '—'
    : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(walletStars);
  const selectNode = (node: LessonMapNode) => {
    navigationLatchRef.current = false;
    if (node.state === 'locked' || node.state === 'next') {
      cancelPreparedLearningV2SessionNetworkIntent();
      setSelected(node);
      return;
    }
    // SESSION_INTENT starts before the sheet animation so normal quiescence is
    // hidden inside an already-requested local interaction, never a loader.
    prepareLearningV2SessionNetworkIntent(node.id);
    setSelected(node);
  };
  const selectCourseNode = (node: CourseRoadNode) => {
    navigationLatchRef.current = false;
    cancelPreparedLearningV2SessionNetworkIntent();
    setSelected(node);
  };
  const dismissSheet = () => {
    navigationLatchRef.current = false;
    cancelPreparedLearningV2SessionNetworkIntent();
    setSelected(null);
  };
  const selectedCourseNode = typeof selected === 'object' && selected !== null && 'kind' in selected ? selected : null;
  const selectedSession = typeof selected === 'object' && selected !== null && !('kind' in selected) ? selected : null;
  return <View style={styles.screen}>
    <FlatList
      data={roadItems}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      decelerationRate="fast"
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 104 }]}
      ListHeaderComponent={<>
        <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Назад" hitSlop={10} onPress={() => safeRouterBack(router, '/lessons_list')} style={styles.headerButton}><Ionicons name="chevron-back" size={24} color="#F4F6F8" /></Pressable><Animated.View accessibilityRole="text" accessibilityLiveRegion="polite" accessibilityLabel={walletStars === null ? 'Подтверждённый баланс звёзд ещё не создан' : `Подтверждённый баланс: ${walletStarsLabel} звёзд`} style={[styles.wallet, walletPulseStyle]}><Ionicons name="star" size={16} color="#F5C84C" /><Text style={styles.walletText}>{walletStarsLabel}</Text></Animated.View></View>
        <View style={styles.courseIdentity}>
          <View style={styles.courseIdentityCopy}>
            <Text style={styles.eyebrow}>АНГЛИЙСКИЙ · A1</Text>
            <Text style={styles.title}>Путь к свободной речи</Text>
            <Text style={styles.canDo}>4 сектора · 32 эпизода · уроки и экзамены</Text>
          </View>
          <View accessibilityLabel="Тридцать два эпизода" style={styles.courseCount}><Text style={styles.courseCountValue}>32</Text><Text style={styles.courseCountLabel}>ЭПИЗОДА</Text></View>
        </View>
        {returnReward && <Animated.View
          entering={systemReducedMotion ? FadeInDown.duration(1) : FadeInDown.duration(280).easing(Easing.out(Easing.cubic))}
          accessible
          accessibilityLabel={`Результат сессии сохранён. ${returnReward.provisionalStars} из ${returnReward.maxStars} звёзд качества. Общий баланс обновляется отдельно.`}
          accessibilityLiveRegion="polite"
          style={styles.returnReward}
        >
          <View importantForAccessibility="no-hide-descendants" style={styles.returnRewardIcon}>
            <Ionicons name={returnReward.provisionalStars > 0 ? 'star' : 'star-outline'} size={25} color="#07110A" />
          </View>
          <View style={styles.returnRewardCopy}>
            <Text style={styles.returnRewardEyebrow}>РЕЗУЛЬТАТ СЕССИИ СОХРАНЁН</Text>
            <Text style={styles.returnRewardTitle}>{returnReward.provisionalStars} из {returnReward.maxStars} звёзд качества</Text>
            <Text style={styles.returnRewardNote}>Общий баланс обновляется отдельно</Text>
          </View>
        </Animated.View>}
        <View style={styles.tools}><Pressable accessibilityRole="button" accessibilityLabel="Открыть словарь первого эпизода" onPress={() => { cancelPreparedLearningV2SessionNetworkIntent(); setSelected('dictionary'); }} style={styles.tool}><Ionicons name="book-outline" size={18} color="#D9E2EC" /><Text style={styles.toolText}>Словарь · {payload.vocabulary.length}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Открыть теорию первого эпизода" onPress={() => { cancelPreparedLearningV2SessionNetworkIntent(); setSelected('theory'); }} style={styles.tool}><Ionicons name="bulb-outline" size={18} color="#D9E2EC" /><Text style={styles.toolText}>Теория</Text></Pressable></View>
        <View style={[styles.chapterCard, { borderColor: `${COURSE_CHAPTERS[0].accent}66` }]}>
          <View style={styles.chapterTopline}><Text style={[styles.chapterEyebrow, { color: COURSE_CHAPTERS[0].accent }]}>СЕКТОР 1 · ЭПИЗОД 1</Text><View style={styles.chapterProgressPill}><Ionicons name="star" size={12} color="#F5C84C" /><Text style={styles.chapterProgressText}>{completeCount}/12</Text></View></View>
          <Text style={styles.chapterTitle}>Hello, I’m…</Text>
          <Text style={styles.chapterSubtitle}>Представься и начни простой разговор</Text>
          <View accessibilityLabel={`Пройдено ${completeCount} из 12`} style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(completeCount / 12 * 100)}%` }]} /></View>
        </View>
      </>}
      renderItem={({ item }) => {
        if (item.kind === 'zone') return <Text style={styles.zone}>{item.title}</Text>;
        if (item.kind === 'session') {
          const pathIndex = pathIndexByItemId.get(item.id) ?? 0;
          return <Node
            node={item.node}
            pathIndex={pathIndex}
            decoration={mapDecorationAt(pathIndex)}
            onPress={selectNode}
          />;
        }
        if (item.kind === 'chapter') return <View style={[styles.chapterCard, styles.futureChapterCard, { borderColor: `${item.chapter.accent}55` }]}>
          <Text style={[styles.chapterEyebrow, { color: item.chapter.accent }]}>СЕКТОР {item.chapter.ordinal} · ЭПИЗОДЫ {(item.chapter.ordinal - 1) * 8 + 1}–{item.chapter.ordinal * 8}</Text>
          <Text style={styles.chapterTitle}>{item.chapter.title}</Text>
          <Text style={styles.chapterSubtitle}>{item.chapter.subtitle}</Text>
        </View>;
        const pathIndex = pathIndexByItemId.get(item.id) ?? 0;
        return <FutureCourseNode
          node={item}
          pathIndex={pathIndex}
          decoration={mapDecorationAt(pathIndex)}
          onPress={selectCourseNode}
        />;
      }}
    />
    {selected && <Animated.View entering={reducedMotion ? SlideInDown.duration(1) : SlideInDown.duration(320).easing(Easing.bezier(.38, .70, .125, 1))} accessibilityViewIsModal style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}><View style={styles.grabber} />
      {selected === 'dictionary' ? <><Text style={styles.sheetTitle}>Словарь эпизода</Text><Text style={styles.sheetText}>{payload.vocabulary.slice(0, 8).map(word => word.surface).join(' · ')}</Text></> : selected === 'theory' ? <><Text style={styles.sheetTitle}>Интро и теория</Text><Text style={styles.sheetText}>Короткое объяснение, примеры и три вопроса перед практикой.</Text></> : selectedCourseNode ? <><Text style={styles.sheetTitle}>{selectedCourseNode.kind === 'checkpoint' ? 'Экзамен' : 'Эпизод'} {selectedCourseNode.ordinal}</Text><Text style={styles.sheetText}>{selectedCourseNode.title}. Откроется после прохождения предыдущего пути.</Text></> : selectedSession ? <><Text style={styles.sheetTitle}>Сессия {selectedSession.order}</Text><Text style={styles.sheetText}>{selectedSession.state === 'locked' || selectedSession.state === 'next' ? 'Сначала спокойно заверши предыдущую сессию.' : selectedSession.state === 'completed' ? 'Сессия пройдена. Можно улучшить результат и собрать больше звёзд.' : '12 заданий · до 36 звёзд'}</Text></> : null}
      <Pressable accessibilityRole="button" onPress={() => {
        if (selectedSession && (selectedSession.state === 'current' || selectedSession.state === 'completed')) {
          if (navigationLatchRef.current) return;
          navigationLatchRef.current = true;
          try {
            router.push({ pathname: '/learning-v2/session/[id]', params: {
              id: selectedSession.id,
              runKind: selectedSession.state === 'completed' ? 'repeat' : 'initial',
            } } as never);
          } catch (error) {
            navigationLatchRef.current = false;
            cancelPreparedLearningV2SessionNetworkIntent(selectedSession.id);
            throw error;
          }
          return;
        }
        dismissSheet();
      }} style={styles.sheetCta}><Text style={styles.sheetCtaText}>{selectedSession?.state === 'current' ? 'Начать' : selectedSession?.state === 'completed' ? 'Повторить' : 'Понятно'}</Text></Pressable></Animated.View>}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#12161C' },
  scroll: { paddingHorizontal: 18 },
  header: { height: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#202833' },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#202833', paddingHorizontal: 12, height: 36, borderRadius: 18 },
  walletText: { color: '#F4F6F8', fontWeight: '800' },
  courseIdentity: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 },
  courseIdentityCopy: { flex: 1 },
  eyebrow: { color: '#7E8A99', fontSize: 10.5, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#F7F9FB', fontSize: 27, lineHeight: 32, fontWeight: '900', marginTop: 3 },
  canDo: { color: '#9BA7B5', fontSize: 12.5, lineHeight: 18, marginTop: 4, fontWeight: '700' },
  courseCount: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1C242E', borderWidth: 1, borderColor: '#303B48' },
  courseCountValue: { color: '#F7F9FB', fontSize: 22, lineHeight: 24, fontWeight: '900' },
  courseCountLabel: { color: '#758292', fontSize: 7.5, lineHeight: 10, fontWeight: '900', letterSpacing: .7 },
  returnReward: { minHeight: 78, borderRadius: 22, marginTop: 18, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#2C2819', borderWidth: 1, borderColor: '#6B5726' },
  returnRewardIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD75A' },
  returnRewardCopy: { flex: 1 },
  returnRewardEyebrow: { color: '#C7B777', fontSize: 9.5, lineHeight: 14, letterSpacing: 1.25, fontWeight: '900' },
  returnRewardTitle: { color: '#FFF2B5', fontSize: 16, lineHeight: 21, fontWeight: '900', marginTop: 1 },
  returnRewardNote: { color: '#9F956F', fontSize: 11, lineHeight: 16, fontWeight: '700', marginTop: 1 },
  tools: { flexDirection: 'row', gap: 10, marginTop: 18 },
  tool: { backgroundColor: '#1C242E', borderRadius: 16, paddingHorizontal: 14, height: 44, flexDirection: 'row', alignItems: 'center', gap: 7 },
  toolText: { color: '#D9E2EC', fontWeight: '700', fontSize: 13 },
  chapterCard: { marginTop: 18, borderRadius: 22, backgroundColor: '#1B2430', borderWidth: 1, paddingHorizontal: 17, paddingVertical: 15 },
  futureChapterCard: { marginTop: 24, marginBottom: 8 },
  chapterTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  chapterProgressPill: { height: 26, borderRadius: 13, paddingHorizontal: 9, backgroundColor: '#2A2B29', flexDirection: 'row', alignItems: 'center', gap: 4 },
  chapterProgressText: { color: '#F2DF9A', fontSize: 11, fontWeight: '900' },
  chapterEyebrow: { fontSize: 11, lineHeight: 16, fontWeight: '900', letterSpacing: 1.7 },
  chapterTitle: { color: '#F7F9FB', fontSize: 20, lineHeight: 25, fontWeight: '900', marginTop: 4 },
  chapterSubtitle: { color: '#98A6B5', fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: 3 },
  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: '#303A46', marginTop: 12 },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#6FD6FF' },
  zone: { alignSelf: 'center', color: '#A9B3BF', backgroundColor: '#1B222B', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.6, marginTop: 10, marginBottom: 2 },
  nodeLane: { height: 74, alignItems: 'center', justifyContent: 'center' },
  node: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderBottomWidth: 6 },
  node_completed: { backgroundColor: '#8EE65A', borderColor: '#B9F58C' },
  node_current: { backgroundColor: '#F5C84C', borderColor: '#FFE28A' },
  node_next: { backgroundColor: '#516DFF', borderColor: '#8BA2FF' },
  node_locked: { backgroundColor: '#252C35', borderColor: '#39424D' },
  nodePressed: { opacity: .82 },
  nodeNumber: { color: '#F7F9FB', fontWeight: '900', fontSize: 22 },
  nodeNumberCurrent: { color: '#17120A', fontSize: 28 },
  nodeOrderBadge: { position: 'absolute', right: -6, bottom: -4, minWidth: 21, height: 21, paddingHorizontal: 4, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#17202A', borderWidth: 2, borderColor: '#8BA2FF' },
  nodeOrderBadgeCurrent: { backgroundColor: '#17120A', borderColor: '#FFE28A' },
  nodeOrderText: { color: '#F7F9FB', fontSize: 9, fontWeight: '900' },
  nodeOrderTextCurrent: { color: '#FFE28A' },
  halo: { position: 'absolute', backgroundColor: '#F5C84C' },
  futureNodeLane: { height: 74, alignItems: 'center', justifyContent: 'center' },
  futureNodeRow: { minHeight: 72, width: 220, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  episodeNode: { width: 60, height: 60, borderRadius: 23, backgroundColor: '#242C36', borderWidth: 2, borderBottomWidth: 6, alignItems: 'center', justifyContent: 'center' },
  examNode: { width: 74, height: 74, borderRadius: 25, backgroundColor: '#292A2B', borderWidth: 2, borderBottomWidth: 7, alignItems: 'center', justifyContent: 'center' },
  episodeNumberBadge: { position: 'absolute', right: -5, bottom: -4, minWidth: 21, height: 21, paddingHorizontal: 4, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#151B22', borderWidth: 2, borderColor: '#3B4653' },
  episodeNumber: { color: '#A3ADBA', fontSize: 9, fontWeight: '900' },
  futureNodeLabel: { position: 'absolute', width: 150 },
  futureNodeLabelLeft: { right: 144, alignItems: 'flex-end' },
  futureNodeLabelRight: { left: 144, alignItems: 'flex-start' },
  futureNodeEyebrow: { fontSize: 9.5, lineHeight: 14, letterSpacing: 1.2, fontWeight: '900' },
  futureNodeTitle: { color: '#B7C1CC', fontSize: 13, lineHeight: 17, fontWeight: '700', marginTop: 2 },
  mapDecoration: { position: 'absolute', width: 82, height: 82, zIndex: 2 },
  mapDecorationLeft: { left: 0 },
  mapDecorationRight: { right: 0 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#202833', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 14, paddingHorizontal: 22 },
  grabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#647182', alignSelf: 'center' },
  sheetTitle: { color: '#F7F9FB', fontSize: 22, fontWeight: '900', marginTop: 20 },
  sheetText: { color: '#B4BEC9', lineHeight: 20, marginTop: 8, minHeight: 52 },
  sheetCta: { height: 56, borderRadius: 20, backgroundColor: '#8EE65A', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  sheetCtaText: { color: '#07110A', fontWeight: '900', fontSize: 16 },
});
