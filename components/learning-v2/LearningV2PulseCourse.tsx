import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, FlatList, ScrollView, StyleSheet, Text, View, type ViewToken } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';
import { LearningV2MapNode } from '../LearningV2MapNode';
import PressableHybrid from '../PressableHybrid';
import { triLang, type Lang } from '../../constants/i18n';
import { horizonsCopy } from './horizons/copy';
import { buildLearningV2CourseAccordionMapFromPreparedProgressV1, type LearningV2PreparedAccordionProgressV1, type LearningV2AccordionSessionStateV1, type LearningV2CourseAccordionRowV1 } from '../../modules/learning-v2/map/course_accordion_map_model_v1';
import { learningV2CourseSessionIdV1 } from '../../modules/learning-v2/content/course_topology_v1';
import { LEARNING_V2_OWNER_LAYOUT as L } from './learningV2OwnerLayout';
import { isPulseLessonAuthored, isPulseLessonAvailable, pulseCourseSectionForLesson, pulseMapGeometry, pulseMapOffsetX, PULSE_COURSE_SECTIONS } from './learningV2PulseGeometry';

export interface LearningV2PulseLessonCardRenderProps {
  readonly title: string;
  readonly ordinal: number;
  readonly completedSessionCount: number;
  readonly isCurrent: boolean;
  readonly isAvailable: boolean;
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
  onSessionCompleted?: (point: { x: number; y: number }) => void;
  onDictionary: () => void;
  dictionaryControl?: React.ReactNode;
  navigationControl?: React.ReactNode;
  headerAccessory?: React.ReactNode;
  renderLessonCard?: (props: LearningV2PulseLessonCardRenderProps) => React.ReactNode;
}
type SessionRow = Extract<LearningV2CourseAccordionRowV1, { kind: 'session' }>;

function PulseNode({ row, active, reducedMotion, children }: {
  row: SessionRow; active: boolean; reducedMotion: boolean; children: React.ReactNode;
}) {
  const lift = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(lift);
    lift.value = 0;
    if (active && !reducedMotion) {
      lift.value = withRepeat(withTiming(1, { duration: 1600 + row.sessionOrdinal * 23, easing: Easing.inOut(Easing.sin) }), -1, true);
    }
    return () => cancelAnimation(lift);
  }, [active, lift, reducedMotion, row.sessionOrdinal]);
  const motion = useAnimatedStyle(() => ({ transform: [{ translateY: -lift.value * 2 }] }));
  return <Animated.View style={motion}>{children}</Animated.View>;
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
  const [visibleSessions, setVisibleSessions] = useState<ReadonlySet<string>>(new Set());
  const mapRef = useRef<FlatList<SessionRow>>(null);
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
  useEffect(() => { const id = requestAnimationFrame(centerCurrent); return () => cancelAnimationFrame(id); }, [centerCurrent]);
  useEffect(() => {
    cancelAnimation(mapEntry);
    if (lesson === null || props.reducedMotion) {
      mapEntry.value = 1;
      return;
    }
    mapEntry.value = 0;
    const id = requestAnimationFrame(() => {
      mapEntry.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
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
  const viewability = useRef(({ viewableItems }: { viewableItems: ViewToken<SessionRow>[] }) => {
    setVisibleSessions(new Set(viewableItems.filter(item => item.isViewable).map(item => item.item.id)));
  }).current;

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
        const authored = isPulseLessonAuthored(item.ordinal);
        const isAvailable = isPulseLessonAvailable(item.ordinal, completed, props.devUnlockAll);
        const openLesson = () => {
          if (!isAvailable) {
            if (authored) props.onLockedLessonPress(item.ordinal);
            else props.onUnavailableLessonPress(item.ordinal);
            return;
          }
          centered.current = '';
          setLesson(item.ordinal);
          props.onExpandedLesson(item.ordinal);
        };
        if (props.renderLessonCard) {
          return <View testID={`learning-v2-pulse-lesson-${item.ordinal}`}>{props.renderLessonCard({ title: item.title, ordinal: item.ordinal, completedSessionCount: count, isCurrent: isCurrent && isAvailable, isAvailable, onPress: openLesson })}</View>;
        }
        return <PressableHybrid variant="card" testID={`learning-v2-pulse-lesson-${item.ordinal}`} accessibilityLabel={`${item.title}, ${isAvailable ? `${Math.round(count / 56 * 100)}%` : c.locked}`} onPress={openLesson} style={[styles.lesson, { backgroundColor: isAvailable ? t.bgCard : t.bgSurface2, opacity: isAvailable ? 1 : .62 }]} contentStyle={styles.lessonContent}>
          <View style={styles.lessonCopy}><Text style={[styles.lessonMeta, { color: isCurrent && isAvailable ? t.accent : t.textMuted }]}>{pulseCourseSectionForLesson(item.ordinal).label} · {String(item.ordinal).padStart(2, '0')}{isCurrent && isAvailable ? ` · ${c.available}` : ''}</Text><Text style={[styles.lessonTitle, { color: t.textPrimary }]}>{item.title}</Text></View>
          <View accessible={false} style={styles.ring}>{isAvailable ? <><Svg width={48} height={48} viewBox="0 0 48 48"><Circle cx="24" cy="24" r="20" stroke={t.bgSurface2} strokeWidth="5" fill="none" /><Circle cx="24" cy="24" r="20" stroke={t.accent} strokeWidth="5" fill="none" strokeDasharray={`${count / 56 * 125.66} 125.66`} strokeLinecap="round" rotation="-90" origin="24,24" /></Svg>{count === 56 ? <Ionicons name="checkmark" size={21} color={t.accent} style={styles.ringCheck} /> : null}</> : <Ionicons name="construct-outline" size={24} color={t.textMuted} style={styles.workIcon} />}</View>
        </PressableHybrid>;
      }} />
    </> : <Animated.View testID="learning-v2-pulse-map-entry" style={[styles.mapContainer, mapEntryStyle]} onLayout={e => setViewport(e.nativeEvent.layout)}>
      <FlatList ref={mapRef} testID="learning-v2-pulse-map" data={rows} keyExtractor={row => row.id} contentContainerStyle={{ paddingVertical: geometry.padding }} getItemLayout={(_, index) => ({ length: geometry.step, offset: geometry.padding + geometry.step * index, index })} onContentSizeChange={centerCurrent} initialNumToRender={8} windowSize={5} onViewableItemsChanged={viewability} viewabilityConfig={{ itemVisiblePercentThreshold: 1 }} showsVerticalScrollIndicator={false} renderItem={({ item: row, index }) => {
        const x = viewport.width / 2 + pulseMapOffsetX(index, viewport.width);
        const nextX = viewport.width / 2 + pulseMapOffsetX(index + 1, viewport.width);
        const ready = row.state === 'current' || row.state === 'completed';
        const hasMaterial = props.isSessionMaterialAvailable?.(lesson, row.sessionOrdinal) ?? true;
        const devReady = props.devUnlockAll && !ready && hasMaterial;
        const available = hasMaterial && (ready || devReady);
        const nodeColor = available ? t.accent : t.bgSurface2;
        const ink = available ? t.correctText : t.textMuted;
        const statusLabel = !hasMaterial
          ? c.locked
          : row.state === 'completed'
            ? c.complete
            : row.state === 'current'
              ? currentStatusLabel
              : available
                ? c.available
                : c.locked;
        return <View style={{ height: geometry.step, alignItems: 'center', justifyContent: 'center' }}>
          {index < rows.length - 1 ? <Svg pointerEvents="none" width={viewport.width} height={geometry.step * 2} style={{ position: 'absolute', top: geometry.step / 2, left: 0 }}><Path d={`M ${x} 0 C ${x} 64 ${nextX} 64 ${nextX} ${geometry.step}`} fill="none" stroke={t.bgSurface2} strokeWidth={7} strokeLinecap="round" /></Svg> : null}
          <View style={{ transform: [{ translateX: pulseMapOffsetX(index, viewport.width) }] }}>
            <PulseNode row={row} active={props.active && visibleSessions.has(row.id)} reducedMotion={props.reducedMotion}>
              <LearningV2MapNode testID={`learning-v2-pulse-session-${row.sessionOrdinal}`} state={row.state} width={geometry.nodeSize} height={geometry.nodeSize} radius={geometry.nodeSize / 2} faceColor={nodeColor} haloColor={t.accent} accessible active={props.active && visibleSessions.has(row.id)} reduceMotion={props.reducedMotion} accessibilityLabel={`${c.chapter} ${row.chapterOrdinal}, ${c.session} ${row.sessionOrdinal}, ${statusLabel}`} onPress={() => props.onSessionPress(lesson, row.sessionOrdinal, row.state)} onCompletedTransition={props.onSessionCompleted}>
                <View pointerEvents="none" style={styles.nodeFace}><Ionicons testID={`learning-v2-pulse-session-icon-${row.sessionOrdinal}`} name={!hasMaterial ? 'construct-outline' : row.state === 'completed' ? 'checkmark' : available && (row.role === 'final_exam' || row.role === 'chapter_checkpoint') ? 'trophy' : available ? 'play' : 'lock-closed'} size={31} color={ink} /><Text style={{ color: ink, fontSize: 13, fontWeight: '700' }}>{row.sessionOrdinal}</Text></View>
              </LearningV2MapNode>
            </PulseNode>
          </View>
          {(props.stars[row.id] ?? 0) > 0 ? <View style={{ position: 'absolute', right: Math.max(8, viewport.width / 2 - pulseMapOffsetX(index, viewport.width) - 91), flexDirection: 'row' }} accessibilityLabel={`${props.stars[row.id]} ★`}>{Array.from({ length: props.stars[row.id] ?? 0 }, (_, i) => <Ionicons key={i} name="star" size={12} color={t.gold} />)}</View> : null}
        </View>;
      }} />
      <View
        style={[
          styles.dictionary,
          // The tab bar overlays this route. Keep the pocket completely above
          // its visual and touch bounds on tall Android devices.
          { bottom: Math.max(88, Math.min(props.bottomPadding + 20, 124)) },
        ]}
      >
        {props.dictionaryControl ?? <PressableHybrid variant="icon" accessibilityLabel={c.words} onPress={props.onDictionary} style={[styles.iconButton, { backgroundColor: t.bgCard }]} contentStyle={styles.iconButtonContent}><Ionicons name="book-outline" color={t.textPrimary} size={24} /></PressableHybrid>}
      </View>
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
  nodeFace: { alignItems: 'center', justifyContent: 'center', gap: 5 },
  dictionary: { position: 'absolute', right: 14 },
});
