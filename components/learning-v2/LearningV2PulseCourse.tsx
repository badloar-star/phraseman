import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, FlatList, ScrollView, StyleSheet, Text, View, type ViewToken } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { cancelAnimation, Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';
import { LearningV2MapNode } from '../LearningV2MapNode';
import PressableHybrid from '../PressableHybrid';
import { triLang, type Lang } from '../../constants/i18n';
import { horizonsCopy } from './horizons/copy';
import { buildLearningV2CourseAccordionMapFromPreparedProgressV1, type LearningV2PreparedAccordionProgressV1, type LearningV2AccordionSessionStateV1, type LearningV2CourseAccordionRowV1 } from '../../modules/learning-v2/map/course_accordion_map_model_v1';
import { learningV2CourseSessionIdV1 } from '../../modules/learning-v2/content/course_topology_v1';
import { LEARNING_V2_OWNER_LAYOUT as L } from './learningV2OwnerLayout';
import { isPulseLessonMapAvailable, isPulseLessonWorkInProgress, pulseCourseSectionForLesson, pulseMapGeometry, pulseMapOffsetX, PULSE_COURSE_SECTIONS } from './learningV2PulseGeometry';

export interface LearningV2PulseLessonCardRenderProps {
  readonly title: string;
  readonly ordinal: number;
  readonly completedSessionCount: number;
  readonly isCurrent: boolean;
  readonly isAvailable: boolean;
  readonly isInProgress: boolean;
  readonly onPress: () => void;
}

interface Props {
  titles: readonly string[];
  lang: Lang;
  scopeKey: string;
  preparedProgress: LearningV2PreparedAccordionProgressV1;
  currentSessionId: string | null;
  completedSessionIds: readonly string[];
  stars: Readonly<Record<string, 0 | 1 | 2 | 3>>;
  active: boolean;
  reducedMotion: boolean;
  devUnlockAll: boolean;
  bottomPadding: number;
  topPadding?: number;
  legacyLessonsLabel: string;
  onLegacyLessons: () => void;
  onExpandedLesson: (lesson: number | null) => void;
  onUnavailableLessonPress: (lesson: number) => void;
  onLockedLessonPress: (lesson: number) => void;
  isSessionMaterialAvailable?: (lesson: number, session: number) => boolean;
  onSessionPress: (lesson: number, session: number, state: LearningV2AccordionSessionStateV1) => void;
  onVisibleSessionsSettled?: (
    lesson: number,
    sessions: readonly Readonly<{
      sessionOrdinal: number;
      state: LearningV2AccordionSessionStateV1;
    }>[],
  ) => void;
  onSessionCompleted?: (point: { x: number; y: number }) => void;
  navigationControl?: React.ReactNode;
  headerAccessory?: React.ReactNode;
  renderLessonCard?: (props: LearningV2PulseLessonCardRenderProps) => React.ReactNode;
}
type SessionRow = Extract<LearningV2CourseAccordionRowV1, { kind: 'session' }>;
const LearningV2AnimatedRoutePath = Animated.createAnimatedComponent(Path);

function LearningV2PulseRouteSegment({
  d,
  progress,
  stroke,
}: Readonly<{ d: string; progress: SharedValue<number>; stroke: string }>) {
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: 900 * (1 - progress.value),
  }));
  return (
    <LearningV2AnimatedRoutePath
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={7}
      strokeLinecap="round"
      strokeDasharray="900 900"
      animatedProps={animatedProps}
    />
  );
}

function LearningV2PulseMapEntryRow({
  children,
  progress,
  distanceFromCurrent,
  reducedMotion,
}: Readonly<{
  children: React.ReactNode;
  progress: SharedValue<number>;
  distanceFromCurrent: number;
  reducedMotion: boolean;
}>) {
  const entryStyle = useAnimatedStyle(() => {
    if (reducedMotion) return { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] };
    const delay = Math.min(distanceFromCurrent, 5) * 0.09;
    const localProgress = Math.max(0, Math.min(1, (progress.value - delay) / (1 - delay)));
    return {
      opacity: localProgress,
      transform: [
        { translateY: (1 - localProgress) * 18 },
        { scale: 0.76 + localProgress * 0.24 },
      ],
    };
  }, [distanceFromCurrent, reducedMotion]);

  return <Animated.View style={entryStyle}>{children}</Animated.View>;
}

export default function LearningV2PulseCourse(props: Props) {
  const { theme: t } = useTheme();
  const c = horizonsCopy(props.lang);
  const currentStatusLabel = triLang(props.lang, {
    ru: 'Текущая', uk: 'Поточна', en: 'Current', es: 'Actual',
    'pt-BR': 'Atual', vi: 'Hiện tại', id: 'Saat ini', tr: 'Geçerli', pl: 'Bieżąca',
  });
  const [lesson, setLesson] = useState<number | null>(null);
  const [viewport, setViewport] = useState({ width: 390, height: 0 });
  const mapRef = useRef<FlatList<SessionRow>>(null);
  const visibleSessionRowsRef = useRef<readonly SessionRow[]>([]);
  const visibleSessionsSettledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeLessonRef = useRef<number | null>(null);
  const visibleSessionsSettledRef = useRef(props.onVisibleSessionsSettled);
  activeLessonRef.current = lesson;
  visibleSessionsSettledRef.current = props.onVisibleSessionsSettled;
  const onViewableItemsChangedRef = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<SessionRow>[] }) => {
      visibleSessionRowsRef.current = viewableItems
        .filter((item) => item.isViewable && item.item)
        .map((item) => item.item);
    },
  );
  const centered = useRef('');
  const mapEntry = useSharedValue(1);
  const current = /^lesson-(\d+):session:(\d+)$/.exec(props.currentSessionId ?? '');
  const currentLesson = Number(current?.[1] ?? 1);
  const currentSection = pulseCourseSectionForLesson(currentLesson);
  const [selectedLevel, setSelectedLevel] = useState(currentSection.label);
  const selectedSection = PULSE_COURSE_SECTIONS.find(section => section.label === selectedLevel) ?? currentSection;
  const rows = useMemo(() => buildLearningV2CourseAccordionMapFromPreparedProgressV1({
    projectionScopeKey: props.scopeKey, expandedLessonOrdinal: lesson, preparedProgress: props.preparedProgress,
  }).rows.filter((row): row is SessionRow => row.kind === 'session'), [lesson, props.preparedProgress, props.scopeKey]);
  const target = rows.find(row => row.state === 'current')?.sessionOrdinal ?? 1;
  const currentRowIndex = Math.max(0, rows.findIndex(row => row.sessionOrdinal === target));
  const geometry = pulseMapGeometry(viewport.height, target);
  const courses = useMemo(() => props.titles
    .map((title, i) => ({ title, ordinal: i + 1 }))
    .filter(item => item.ordinal >= selectedSection.first && item.ordinal <= selectedSection.last),
  [props.titles, selectedSection.first, selectedSection.last]);
  const completed = useMemo(() => new Set(props.completedSessionIds), [props.completedSessionIds]);
  const { onExpandedLesson } = props;
  const back = useCallback(() => { setLesson(null); onExpandedLesson(null); centered.current = ''; }, [onExpandedLesson]);
  useEffect(() => { setSelectedLevel(currentSection.label); }, [currentSection.label, props.scopeKey]);
  useEffect(() => {
    if (!props.active || lesson === null) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => sub.remove();
  }, [back, lesson, props.active]);
  const centerCurrent = useCallback(() => {
    if (!viewport.height || lesson === null) return;
    const key = `${lesson}:${target}:${viewport.height}`;
    if (centered.current === key) return;
    mapRef.current?.scrollToOffset({ offset: pulseMapGeometry(viewport.height, target).offset, animated: false });
    centered.current = key;
  }, [lesson, target, viewport.height]);
  const reportVisibleSessionsSettled = useCallback(() => {
    const activeLesson = activeLessonRef.current;
    if (activeLesson === null) return;
    visibleSessionsSettledRef.current?.(
      activeLesson,
      visibleSessionRowsRef.current.map((row) => ({
        sessionOrdinal: row.sessionOrdinal,
        state: row.state,
      })),
    );
  }, []);
  const cancelVisibleSessionsSettledAfterDrag = useCallback(() => {
    if (visibleSessionsSettledTimerRef.current === null) return;
    clearTimeout(visibleSessionsSettledTimerRef.current);
    visibleSessionsSettledTimerRef.current = null;
  }, []);
  const scheduleVisibleSessionsSettledAfterDrag = useCallback(() => {
    cancelVisibleSessionsSettledAfterDrag();
    // A fling emits drag-end before momentum begins. Give native momentum one
    // frame to start and cancel this fallback; a drag without momentum reports
    // only after the list has visibly settled.
    visibleSessionsSettledTimerRef.current = setTimeout(() => {
      visibleSessionsSettledTimerRef.current = null;
      reportVisibleSessionsSettled();
    }, 80);
  }, [cancelVisibleSessionsSettledAfterDrag, reportVisibleSessionsSettled]);
  const handleMomentumScrollEnd = useCallback(() => {
    cancelVisibleSessionsSettledAfterDrag();
    reportVisibleSessionsSettled();
  }, [cancelVisibleSessionsSettledAfterDrag, reportVisibleSessionsSettled]);
  useEffect(() => cancelVisibleSessionsSettledAfterDrag, [cancelVisibleSessionsSettledAfterDrag]);
  useEffect(() => {
    let settledFrame: number | null = null;
    const centerFrame = requestAnimationFrame(() => {
      centerCurrent();
      // The initial centering is non-animated, so native momentum callbacks do
      // not fire. Report its now-visible rows on the following frame.
      settledFrame = requestAnimationFrame(reportVisibleSessionsSettled);
    });
    return () => {
      cancelAnimationFrame(centerFrame);
      if (settledFrame !== null) cancelAnimationFrame(settledFrame);
    };
  }, [centerCurrent, reportVisibleSessionsSettled]);
  useEffect(() => {
    cancelAnimation(mapEntry);
    if (lesson === null || props.reducedMotion) {
      mapEntry.value = 1;
      return;
    }
    mapEntry.value = 0;
    const id = requestAnimationFrame(() => {
      mapEntry.value = withTiming(1, { duration: 580, easing: Easing.out(Easing.cubic) });
    });
    return () => cancelAnimationFrame(id);
  }, [lesson, mapEntry, props.reducedMotion]);
  const mapEntryStyle = useAnimatedStyle(() => ({
    opacity: mapEntry.value,
    transform: [
      { translateY: (1 - mapEntry.value) * 24 },
      { scale: 0.985 + mapEntry.value * 0.015 },
    ],
  }));
  return <View testID="learning-v2-pulse-course" style={[styles.root, { backgroundColor: t.bgPrimary, paddingTop: props.topPadding ?? 0 }]}>
    <View style={[styles.header, lesson !== null ? styles.mapHeader : null]}>
      <View style={styles.headerRow}>
        {lesson !== null ? <PressableHybrid variant="icon" accessibilityLabel={c.back} onPress={back} style={[styles.iconButton, { backgroundColor: t.bgCard }]} contentStyle={styles.iconButtonContent}><Ionicons name="chevron-back" size={24} color={t.textPrimary} /></PressableHybrid> : props.navigationControl}
        {lesson === null ? <Text style={[styles.headerTitle, { color: t.textPrimary }]}>{c.all}</Text> : <View style={styles.headerSpacer} />}
        {props.headerAccessory}
      </View>
      {lesson !== null ? (
        <Text style={[styles.mapHeaderTitle, { color: t.textPrimary }]}>
          {props.titles[lesson - 1]}
        </Text>
      ) : null}
    </View>
    {lesson === null ? <>
      <View style={styles.sectionsRow}>
        <ScrollView
          horizontal
          testID="learning-v2-level-rail"
          showsHorizontalScrollIndicator={false}
          style={styles.levelRail}
          contentContainerStyle={styles.sections}
        >
          {PULSE_COURSE_SECTIONS.map(section => (
            <PressableHybrid
              key={section.label}
              testID={`learning-v2-level-${section.label}`}
              accessibilityRole="tab"
              accessibilityLabel={section.label}
              accessibilityState={{ selected: selectedLevel === section.label }}
              onPress={() => setSelectedLevel(section.label)}
              variant="chip"
              style={[styles.section, { backgroundColor: selectedLevel === section.label ? t.accent : t.bgCard }]}
              contentStyle={styles.sectionContent}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: selectedLevel === section.label ? t.correctText : t.textPrimary }}>{section.label}</Text>
            </PressableHybrid>
          ))}
        </ScrollView>
        <PressableHybrid
          testID="learning-v2-open-legacy-lessons"
          accessibilityLabel={props.legacyLessonsLabel}
          onPress={props.onLegacyLessons}
          variant="chip"
          style={[styles.section, styles.utilitySection, { backgroundColor: t.bgCard }]}
          contentStyle={[styles.sectionContent, styles.utilitySectionContent]}
        >
          <Ionicons name="albums-outline" size={16} color={t.textPrimary} />
          <Text style={[styles.utilitySectionText, { color: t.textPrimary }]}>{props.legacyLessonsLabel}</Text>
        </PressableHybrid>
      </View>
      <FlatList key={selectedLevel} testID="learning-v2-pulse-lesson-list" data={courses} keyExtractor={item => String(item.ordinal)} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: props.renderLessonCard ? 0 : L.lessons.pagePadding, paddingBottom: props.bottomPadding }} renderItem={({ item }) => {
        const count = Array.from({ length: 56 }, (_, i) => learningV2CourseSessionIdV1(item.ordinal, i + 1)).filter(id => completed.has(id)).length;
        const isCurrent = item.ordinal === currentLesson;
        const isAvailable = isPulseLessonMapAvailable(item.ordinal);
        const materialSessionIds = new Set(
          Array.from({ length: 56 }, (_, index) => learningV2CourseSessionIdV1(item.ordinal, index + 1))
            .filter((_, index) => props.isSessionMaterialAvailable?.(item.ordinal, index + 1) ?? true),
        );
        const isInProgress = isPulseLessonWorkInProgress(item.ordinal, materialSessionIds);
        const openLesson = () => {
          if (!isAvailable) {
            props.onUnavailableLessonPress(item.ordinal);
            return;
          }
          centered.current = '';
          setLesson(item.ordinal);
          props.onExpandedLesson(item.ordinal);
        };
        if (props.renderLessonCard) {
          return <View testID={`learning-v2-pulse-lesson-${item.ordinal}`}>{props.renderLessonCard({ title: item.title, ordinal: item.ordinal, completedSessionCount: count, isCurrent: isCurrent && isAvailable, isAvailable, isInProgress, onPress: openLesson })}</View>;
        }
        return <PressableHybrid variant="card" testID={`learning-v2-pulse-lesson-${item.ordinal}`} accessibilityLabel={`${item.title}, ${isAvailable ? `${Math.round(count / 56 * 100)}%` : c.locked}`} onPress={openLesson} style={[styles.lesson, { backgroundColor: !isAvailable || isInProgress ? t.bgSurface2 : t.bgCard, opacity: isAvailable ? (isInProgress ? .88 : 1) : .62 }]} contentStyle={styles.lessonContent}>
          <View style={styles.lessonCopy}><Text style={[styles.lessonMeta, { color: isCurrent && isAvailable ? t.accent : t.textMuted }]}>{pulseCourseSectionForLesson(item.ordinal).label} · {String(item.ordinal).padStart(2, '0')}{isCurrent && isAvailable ? ` · ${c.available}` : ''}</Text><Text style={[styles.lessonTitle, { color: t.textPrimary }]}>{item.title}</Text></View>
          <View accessible={false} style={styles.ring}>{isInProgress ? <Ionicons name="construct-outline" size={24} color={t.textMuted} style={styles.workIcon} /> : <><Svg width={48} height={48} viewBox="0 0 48 48"><Circle cx="24" cy="24" r="20" stroke={t.bgSurface2} strokeWidth="5" fill="none" /><Circle cx="24" cy="24" r="20" stroke={t.accent} strokeWidth="5" fill="none" strokeDasharray={`${count / 56 * 125.66} 125.66`} strokeLinecap="round" rotation="-90" origin="24,24" /></Svg>{count === 56 ? <Ionicons name="checkmark" size={21} color={t.accent} style={styles.ringCheck} /> : null}</>}</View>
        </PressableHybrid>;
      }} />
    </> : <Animated.View testID="learning-v2-pulse-map-entry" style={[styles.mapContainer, mapEntryStyle]} onLayout={e => setViewport(e.nativeEvent.layout)}>
      <FlatList ref={mapRef} testID="learning-v2-pulse-map" data={rows} keyExtractor={row => row.id} contentContainerStyle={{ paddingVertical: geometry.padding }} getItemLayout={(_, index) => ({ length: geometry.step, offset: geometry.padding + geometry.step * index, index })} onContentSizeChange={centerCurrent} onViewableItemsChanged={onViewableItemsChangedRef.current} onMomentumScrollBegin={cancelVisibleSessionsSettledAfterDrag} onMomentumScrollEnd={handleMomentumScrollEnd} onScrollEndDrag={scheduleVisibleSessionsSettledAfterDrag} initialNumToRender={8} maxToRenderPerBatch={6} updateCellsBatchingPeriod={32} windowSize={5} removeClippedSubviews showsVerticalScrollIndicator={false} renderItem={({ item: row, index }) => {
        const x = viewport.width / 2 + pulseMapOffsetX(index, viewport.width);
        const nextX = viewport.width / 2 + pulseMapOffsetX(index + 1, viewport.width);
        const ready = row.state === 'current' || row.state === 'completed';
        const hasMaterial = props.isSessionMaterialAvailable?.(lesson, row.sessionOrdinal) ?? true;
        const devReady = props.devUnlockAll && !ready && hasMaterial;
        const available = hasMaterial && (ready || devReady);
        const nodeColor = available ? t.accent : t.bgSurface2;
        const ink = available ? t.correctText : t.textMuted;
        const completedStars = row.state === 'completed'
          ? Math.max(1, props.stars[row.id] ?? 1)
          : 0;
        const completedStarsLabel = completedStars > 0
          ? triLang(props.lang, {
              ru: `Результат: ${completedStars} из 3 звёзд`,
              uk: `Результат: ${completedStars} з 3 зірок`,
              en: `Result: ${completedStars} of 3 stars`,
              es: `Resultado: ${completedStars} de 3 estrellas`,
              'pt-BR': `Resultado: ${completedStars} de 3 estrelas`,
              vi: `Kết quả: ${completedStars} trên 3 sao`,
              id: `Hasil: ${completedStars} dari 3 bintang`,
              tr: `Sonuç: 3 yıldızdan ${completedStars}`,
              pl: `Wynik: ${completedStars} z 3 gwiazdek`,
            })
          : '';
        const statusLabel = !hasMaterial
          ? c.locked
          : row.state === 'completed'
            ? c.complete
            : row.state === 'current'
              ? currentStatusLabel
              : available
                ? c.available
                : c.locked;
        return <LearningV2PulseMapEntryRow
          progress={mapEntry}
          distanceFromCurrent={Math.abs(index - currentRowIndex)}
          reducedMotion={props.reducedMotion}
        >
          <View style={{ height: geometry.step, alignItems: 'center', justifyContent: 'center' }}>
          {index < rows.length - 1 ? <Svg pointerEvents="none" width={viewport.width} height={geometry.step * 2} style={{ position: 'absolute', top: geometry.step / 2, left: 0 }}><LearningV2PulseRouteSegment d={`M ${x} 0 C ${x} 64 ${nextX} 64 ${nextX} ${geometry.step}`} progress={mapEntry} stroke={t.bgSurface2} /></Svg> : null}
          <View style={[styles.nodeCluster, { transform: [{ translateX: pulseMapOffsetX(index, viewport.width) }] }]}>
              <LearningV2MapNode testID={`learning-v2-pulse-session-${row.sessionOrdinal}`} state={row.state} width={geometry.nodeSize} height={geometry.nodeSize} radius={geometry.nodeSize / 2} faceColor={nodeColor} haloColor={t.accent} accessible active={props.active} reduceMotion={props.reducedMotion} accessibilityLabel={`${c.chapter} ${row.chapterOrdinal}, ${c.session} ${row.sessionOrdinal}, ${statusLabel}${completedStarsLabel ? `, ${completedStarsLabel}` : ''}`} onPress={() => props.onSessionPress(lesson, row.sessionOrdinal, row.state)} onCompletedTransition={props.onSessionCompleted}>
                <View pointerEvents="none" style={styles.nodeFace}><Ionicons testID={`learning-v2-pulse-session-icon-${row.sessionOrdinal}`} name={!hasMaterial ? 'construct-outline' : row.state === 'completed' ? 'checkmark' : available && (row.role === 'final_exam' || row.role === 'chapter_checkpoint') ? 'trophy' : available ? 'play' : 'lock-closed'} size={31} color={ink} /><Text style={{ color: ink, fontSize: 13, fontWeight: '700' }}>{row.sessionOrdinal}</Text></View>
              </LearningV2MapNode>
              {completedStars > 0 ? <View testID={`learning-v2-pulse-session-${row.sessionOrdinal}-stars`} pointerEvents="none" accessible={false} style={[styles.sessionStars, { backgroundColor: t.bgCard, borderColor: t.gold }]}>{Array.from({ length: completedStars }, (_, starIndex) => <Ionicons key={starIndex} name="star" size={14} color={t.gold} />)}</View> : null}
          </View>
          </View>
        </LearningV2PulseMapEntryRow>;
      }} />
    </Animated.View>}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: 12, justifyContent: 'center' },
  mapHeader: { paddingTop: 4, paddingBottom: 8, gap: 6 },
  headerRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerSpacer: { flex: 1 },
  headerTitle: { flex: 1, minWidth: 0, fontSize: L.map.headingSize, lineHeight: 23, fontWeight: '700', paddingVertical: 10 },
  mapHeaderTitle: { paddingHorizontal: 4, fontSize: L.map.headingSize, lineHeight: 23, fontWeight: '700' },
  iconButton: { width: 48, height: 48, borderRadius: 18 },
  iconButtonContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingBottom: 12 },
  levelRail: { flex: 1, minWidth: 0 },
  sections: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  section: { alignSelf: 'center', flexGrow: 0, flexShrink: 0, minWidth: 54, minHeight: 44, borderRadius: 15 },
  sectionContent: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 7, justifyContent: 'center', alignItems: 'center' },
  utilitySection: { flexShrink: 1, maxWidth: 160 },
  utilitySectionContent: { flexDirection: 'row', gap: 6, paddingHorizontal: 12 },
  utilitySectionText: { flexShrink: 1, fontSize: 14, lineHeight: 19, fontWeight: '700', textAlign: 'center' },
  lesson: { minHeight: 106, borderRadius: L.lessons.cardRadius, marginBottom: L.lessons.cardGap },
  lessonContent: { minHeight: 106, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  lessonCopy: { flex: 1 },
  lessonMeta: { fontSize: 11, lineHeight: 16, fontWeight: '700', marginBottom: 7 },
  lessonTitle: { fontSize: L.lessons.headingSize, lineHeight: 23, fontWeight: '700' },
  ring: { width: 48, height: 48 },
  ringCheck: { position: 'absolute', left: 14, top: 14 },
  workIcon: { position: 'absolute', left: 12, top: 12 },
  mapContainer: { flex: 1, overflow: 'hidden' },
  nodeCluster: { alignItems: 'center', justifyContent: 'center' },
  nodeFace: { alignItems: 'center', justifyContent: 'center', gap: 5 },
  sessionStars: {
    position: 'absolute',
    bottom: -16,
    minHeight: 24,
    minWidth: 30,
    paddingHorizontal: 7,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
