import { useTheme } from "../../ThemeContext";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BackHandler,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Path } from "react-native-svg";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { Lang } from "../../../constants/i18n";
import {
  buildLearningV2CourseAccordionMapFromPreparedProgressV1,
  type LearningV2PreparedAccordionProgressV1,
  type LearningV2AccordionSessionStateV1,
} from "../../../modules/learning-v2/map/course_accordion_map_model_v1";
import { learningV2CourseSessionIdV1 } from "../../../modules/learning-v2/content/course_topology_v1";
import { LearningV2MapNode } from "../../LearningV2MapNode";
import { HorizonArtwork } from "./HorizonArtwork";
import {
  HORIZON_ROUTES,
  horizonChapter,
  horizonPalette,
  horizonRoutePath,
} from "./model";
import { horizonsCopy } from "./copy";

type Props = Readonly<{
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
  onExpandedLesson: (lesson: number | null) => void;
  onSessionPress: (
    lesson: number,
    session: number,
    state: LearningV2AccordionSessionStateV1,
  ) => void;
  onSessionCompleted: (point: { x: number; y: number }) => void;
  onDictionary: () => void;
  dictionaryControl?: React.ReactNode;
  navigationControl?: React.ReactNode;
  topPadding?: number;
}>;

export default function LearningV2Horizons(props: Props) {
  const {
    titles,
    lang,
    scopeKey,
    preparedProgress,
    currentSessionId,
    completedSessionIds,
    stars,
    active,
    reducedMotion,
    devUnlockAll,
    bottomPadding,
    onExpandedLesson,
    onSessionPress,
    onSessionCompleted,
    onDictionary,
  } = props;
  const c = horizonsCopy(lang);
  const current = /^lesson-(\d+):session:(\d+)$/.exec(currentSessionId ?? "");
  const currentLesson = Number(current?.[1] ?? 1);
  const currentSession = Number(current?.[2] ?? 1);
  const [lesson, setLesson] = useState(currentLesson);
  const [mapOpen, setMapOpen] = useState(false);
  const [chapter, setChapter] = useState(horizonChapter(currentSession));
  const [indexOpen, setIndexOpen] = useState(false);
  const [indexLevel, setIndexLevel] = useState(0);
  const [portalOpen, setPortalOpen] = useState(false);
  const [entranceKey, setEntranceKey] = useState(0);
  const [height, setHeight] = useState(600);
  const touched = useRef(false);
  const { width } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(width);
  const mapWidth = Math.min(containerWidth, 480);
  const { theme: t } = useTheme();
  const p = horizonPalette(lesson, t);
  const progress = useSharedValue(1);
  const carousel = useSharedValue(1);
  const rows = useMemo(
    () =>
      buildLearningV2CourseAccordionMapFromPreparedProgressV1({
        projectionScopeKey: scopeKey,
        expandedLessonOrdinal: lesson,
        preparedProgress,
      }).rows.filter((row) => row.kind === "session"),
    [lesson, preparedProgress, scopeKey],
  );
  const chapterRows = rows.filter((row) => row.chapterOrdinal === chapter);
  const completed = rows.filter((row) => row.state === "completed").length;
  const currentRow = rows.find((row) => row.state === "current");
  const available =
    rows.find((row) => row.state === "current") ??
    rows.find((row) => row.state === "completed");
  const back = useCallback(() => {
    setMapOpen(false);
    setPortalOpen(false);
    onExpandedLesson(null);
  }, [onExpandedLesson]);
  useEffect(() => {
    if (!touched.current) setLesson(currentLesson);
  }, [currentLesson]);
  useEffect(() => {
    if (mapOpen && lesson === currentLesson)
      setChapter(horizonChapter(currentSession));
  }, [currentSession, currentLesson, lesson, mapOpen]);
  useEffect(() => {
    if (!active || !mapOpen) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      back();
      return true;
    });
    return () => sub.remove();
  }, [active, back, mapOpen]);
  useEffect(() => {
    cancelAnimation(progress);
    if (!portalOpen || reducedMotion || !active) {
      progress.value = 1;
      setPortalOpen(false);
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 1450,
      easing: Easing.bezier(0.64, 0, 0.23, 1),
    });
    const timer = setTimeout(() => setPortalOpen(false), 1450);
    return () => {
      clearTimeout(timer);
      cancelAnimation(progress);
    };
  }, [active, entranceKey, portalOpen, progress, reducedMotion]);
  useEffect(() => () => cancelAnimation(carousel), [carousel]);
  const passageStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.max(0, (progress.value - 0.55) / 0.45),
  }));
  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 7 }],
  }));
  const carouselStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + carousel.value * 0.6,
    transform: [{ translateX: (1 - carousel.value) * 32 }],
  }));
  const select = useCallback(
    (value: number) => {
      touched.current = true;
      setLesson(Math.max(1, Math.min(titles.length, value)));
      carousel.value = reducedMotion ? 1 : 0;
      carousel.value = reducedMotion
        ? 1
        : withTiming(1, {
            duration: 650,
            easing: Easing.out(Easing.cubic),
          });
    },
    [carousel, reducedMotion, titles.length],
  );
  const gestures = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) > 55) select(lesson + (g.dx < 0 ? 1 : -1));
        },
      }),
    [lesson, select],
  );
  const open = (ordinal = lesson) => {
    touched.current = true;
    setLesson(ordinal);
    setChapter(ordinal === currentLesson ? horizonChapter(currentSession) : 1);
    onExpandedLesson(ordinal);
    setMapOpen(true);
    setPortalOpen(!reducedMotion);
    setEntranceKey((key) => key + 1);
  };
  const openDictionary = () => {
    onExpandedLesson(lesson);
    onDictionary();
  };
  const resume = () => {
    open(currentLesson);
    if (currentSessionId)
      onSessionPress(currentLesson, currentSession, "current");
  };
  const button = (label: string, onPress: () => void, primary = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? p.accent : p.surface,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text
        style={[styles.buttonText, { color: primary ? t.correctText : p.accent }]}
      >
        {label}
      </Text>
      <Ionicons
        name="arrow-forward"
        size={19}
        color={primary ? t.correctText : p.accent}
      />
    </Pressable>
  );
  const utility = (
    label: string,
    icon: React.ComponentProps<typeof Ionicons>["name"],
    onPress: () => void,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.utility}
    >
      <Ionicons name={icon} size={17} color={p.accent} />
      <Text style={{ color: p.muted, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );

  return (
    <View
      testID="learning-v2-horizons"
      onLayout={(event) => {
        setHeight(event.nativeEvent.layout.height);
        setContainerWidth(event.nativeEvent.layout.width);
      }}
      style={[styles.root, { backgroundColor: p.bg, paddingTop: props.topPadding ?? 0 }]}
    >
      {mapOpen ? (
        <>
          <View style={styles.mapHeader}>
            {utility(c.back, "chevron-back", back)}
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: p.accent }]}>
                {c.world.toUpperCase()} {String(lesson).padStart(2, "0")}
              </Text>
              <Text style={[styles.mapTitle, { color: t.textPrimary }]}>
                {titles[lesson - 1]}
              </Text>
            </View>
            {props.dictionaryControl ??
              utility(c.words, "book-outline", openDictionary)}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chapters}
            contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }}
          >
            {Array.from({ length: 7 }, (_, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`${c.chapter} ${i + 1}`}
                accessibilityState={{ selected: chapter === i + 1 }}
                onPress={() => setChapter(i + 1)}
                style={[
                  styles.chapter,
                  { backgroundColor: chapter === i + 1 ? p.accent : p.surface },
                ]}
              >
                <Text
                  style={{
                    color: chapter === i + 1 ? t.correctText : p.muted,
                    fontWeight: "700",
                  }}
                >
                  {i + 1}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.mapCaption}>
            <Text style={[styles.eyebrow, { color: p.accent }]}>
              {c.chapter.toUpperCase()} {chapter} / 7
            </Text>
            <Text style={{ color: p.muted, fontSize: 11 }}>
              {chapterRows.filter((row) => row.state === "completed").length} /
              8
            </Text>
          </View>
          <ScrollView
            key={`${lesson}-${chapter}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ alignItems: "center" }}
          >
            <View style={{ width: mapWidth, height: 695 }}>
              <HorizonArtwork lesson={lesson} />
              <Svg
                pointerEvents="none"
                width={mapWidth}
                height={695}
                viewBox="0 0 390 695"
                preserveAspectRatio="none"
                style={StyleSheet.absoluteFill}
              >
                <Path
                  d={horizonRoutePath(chapter)}
                  fill="none"
                  stroke={p.edge}
                  strokeWidth={2}
                  strokeDasharray="3 8"
                />
                <Path
                  d={horizonRoutePath(
                    chapter,
                    chapterRows.filter(
                      (row) =>
                        row.state === "completed" || row.state === "current",
                    ).length,
                  )}
                  fill="none"
                  stroke={p.accent}
                  strokeOpacity={0.65}
                  strokeWidth={2}
                />
              </Svg>
              {chapterRows.map((row, i) => {
                const [x, y] = HORIZON_ROUTES[chapter - 1][i];
                const isCheckpoint =
                  row.role === "chapter_checkpoint" ||
                  row.role === "final_exam";
                const done = row.state === "completed";
                const accessible =
                  devUnlockAll || done || row.state === "current";
                const size = isCheckpoint
                  ? 66
                  : row.state === "current"
                    ? 68
                    : 55;
                const score =
                  stars[
                    learningV2CourseSessionIdV1(lesson, row.sessionOrdinal)
                  ];
                return (
                  <View
                    key={row.id}
                    style={{
                      position: "absolute",
                      left: (x / 390) * mapWidth - size / 2,
                      top: y - size / 2,
                      width: size,
                      alignItems: "center",
                    }}
                  >
                    <LearningV2MapNode
                      testID={`learning-v2-horizon-node-${row.sessionOrdinal}`}
                      state={row.state}
                      width={size}
                      height={size}
                      radius={isCheckpoint ? 22 : size / 2}
                      faceColor={
                        done || row.state === "current" ? p.accent : p.surface2
                      }
                      haloColor={row.state === "current" ? p.accent : undefined}
                      accessible={accessible}
                      active={active}
                      reduceMotion={reducedMotion}
                      accessibilityLabel={`${isCheckpoint ? c.chapter : c.session} ${row.sessionOrdinal}, ${done ? c.complete : accessible ? c.available : c.locked}${score === undefined ? "" : `, ${score}/3`}`}
                      onPress={() =>
                        onSessionPress(lesson, row.sessionOrdinal, row.state)
                      }
                      onCompletedTransition={onSessionCompleted}
                    >
                      <Ionicons
                        name={
                          isCheckpoint
                            ? "shield-checkmark-outline"
                            : done
                              ? "checkmark"
                              : row.state === "current"
                                ? "play"
                                : "lock-closed-outline"
                        }
                        size={isCheckpoint ? 29 : 23}
                        color={
                          done || row.state === "current" ? t.correctText : p.muted
                        }
                      />
                    </LearningV2MapNode>
                    <Text style={[styles.nodeLabel, { color: p.muted }]}>
                      {isCheckpoint
                        ? `${c.chapter} ${chapter}`
                        : String(row.sessionOrdinal).padStart(2, "0")}
                    </Text>
                    {done && !isCheckpoint && score !== undefined ? (
                      <View style={{ flexDirection: "row", gap: 2 }}>
                        {[0, 1, 2].map((star) => (
                          <Ionicons
                            key={star}
                            name={star < score ? "star" : "star-outline"}
                            size={10}
                            color={p.gold}
                          />
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </ScrollView>
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(16, bottomPadding) },
            ]}
          >
            {button(
              `${c.continue}${available ? ` · ${c.session.toLowerCase()} ${available.sessionOrdinal}` : ""}`,
              () =>
                available
                  ? onSessionPress(
                      lesson,
                      available.sessionOrdinal,
                      available.state,
                    )
                  : onSessionPress(lesson, 1, "locked"),
              true,
            )}
          </View>
        </>
      ) : (
        <>
          <View style={styles.topline}>
            {props.navigationControl}
            <Text style={[styles.heading, { color: t.textPrimary }]}>
              {c.title}
            </Text>
            {utility(c.all, "layers-outline", () => {
              setIndexLevel(Math.floor((lesson - 1) / 8));
              setIndexOpen(true);
            })}
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          >
            <View
              {...gestures.panHandlers}
              style={[
                styles.stage,
                { height: Math.max(190, Math.min(345, height - 245)) },
              ]}
            >
              <Pressable
                disabled={lesson === 1}
                accessibilityRole="button"
                accessibilityLabel={c.previous}
                onPress={() => select(lesson - 1)}
                style={[
                  styles.neighbor,
                  {
                    left: 0,
                    opacity: lesson === 1 ? 0.25 : 1,
                    backgroundColor: p.surface,
                  },
                ]}
              >
                <Ionicons name="chevron-back" color={p.accent} size={20} />
              </Pressable>
              <Animated.View style={[styles.portal, carouselStyle]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${c.enter}: ${titles[lesson - 1]}`}
                  onPress={() => open()}
                  style={{ flex: 1 }}
                >
                  <HorizonArtwork
                    lesson={lesson}
                    portal
                    active={active}
                    reducedMotion={reducedMotion}
                  />
                </Pressable>
              </Animated.View>
              <Pressable
                disabled={lesson === titles.length}
                accessibilityRole="button"
                accessibilityLabel={c.next}
                onPress={() => select(lesson + 1)}
                style={[
                  styles.neighbor,
                  {
                    right: 0,
                    opacity: lesson === titles.length ? 0.25 : 1,
                    backgroundColor: p.surface,
                  },
                ]}
              >
                <Ionicons name="chevron-forward" color={p.accent} size={20} />
              </Pressable>
            </View>
            <View style={styles.description}>
              <Text style={[styles.eyebrow, { color: p.accent }]}>
                {c.world.toUpperCase()} {String(lesson).padStart(2, "0")} ·{" "}
                {["A1", "A2", "A2+", "B1"][Math.floor((lesson - 1) / 8)]}
              </Text>
              <Text style={[styles.title, { color: t.textPrimary }]}>
                {titles[lesson - 1]}
              </Text>
              <View style={styles.bars}>
                {Array.from({ length: 7 }, (_, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 3,
                      backgroundColor:
                        completed >= (i + 1) * 8 ? p.accent : p.edge,
                    }}
                  />
                ))}
              </View>
              <View style={styles.mapCaption}>
                <Text style={{ color: p.muted, fontSize: 11 }}>
                  {completed} / 56 · {c.complete.toLowerCase()}
                </Text>
                <Text style={{ color: p.muted, fontSize: 11 }}>
                  {c.chapter} {horizonChapter(currentRow?.sessionOrdinal ?? 1)}{" "}
                  / 7
                </Text>
              </View>
            </View>
          </ScrollView>
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(14, bottomPadding) },
            ]}
          >
            {button(c.enter, () => open(), true)}
            <View style={styles.utilities}>
              {utility(c.continue, "play-outline", resume)}
              {utility(c.words, "book-outline", openDictionary)}
              {utility(c.path, "compass-outline", () => {
                setIndexLevel(Math.floor((currentLesson - 1) / 8));
                setIndexOpen(true);
              })}
            </View>
          </View>
        </>
      )}
      {portalOpen ? (
        <Animated.View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: p.bg,
              zIndex: 10,
              alignItems: "center",
              justifyContent: "center",
            },
            passageStyle,
          ]}
        >
          <Animated.View style={[{ width: 280, height: 330 }, zoomStyle]}>
            <HorizonArtwork lesson={lesson} portal />
          </Animated.View>
        </Animated.View>
      ) : null}
      <Modal
        visible={indexOpen}
        transparent
        animationType={reducedMotion ? "none" : "fade"}
        onRequestClose={() => setIndexOpen(false)}
      >
        <View style={styles.modal}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={c.back}
            onPress={() => setIndexOpen(false)}
            style={[StyleSheet.absoluteFill, { backgroundColor: "#0009" }]}
          />
          <View
            accessibilityViewIsModal
            style={[styles.index, { backgroundColor: p.bg }]}
          >
            <View style={styles.topline}>
              <Text style={[styles.heading, { color: t.textPrimary }]}>
                {c.all}
              </Text>
              {utility(c.back, "close", () => setIndexOpen(false))}
            </View>
            <View style={styles.levels}>
              {["A1", "A2", "A2+", "B1"].map((level, i) => (
                <Pressable
                  key={level}
                  accessibilityRole="button"
                  accessibilityState={{ selected: indexLevel === i }}
                  onPress={() => setIndexLevel(i)}
                  style={[
                    styles.chapter,
                    {
                      flex: 1,
                      backgroundColor: indexLevel === i ? p.accent : p.surface,
                    },
                  ]}
                >
                  <Text
                    style={{ color: indexLevel === i ? t.correctText : p.muted }}
                  >
                    {level}
                  </Text>
                </Pressable>
              ))}
            </View>
            <FlatList
              data={titles.slice(indexLevel * 8, indexLevel * 8 + 8)}
              keyExtractor={(_, i) => String(indexLevel * 8 + i)}
              renderItem={({ item, index }) => {
                const ordinal = indexLevel * 8 + index + 1;
                const done = completedSessionIds.filter((id) =>
                  id.startsWith(`lesson-${String(ordinal).padStart(2, "0")}:`),
                ).length;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${ordinal}. ${item}. ${done}/56`}
                    onPress={() => {
                      select(ordinal);
                      setIndexOpen(false);
                      setMapOpen(false);
                      onExpandedLesson(null);
                    }}
                    style={[styles.indexRow, { borderBottomColor: p.edge }]}
                  >
                    <Text
                      style={{
                        color: horizonPalette(ordinal, t).accent,
                        fontSize: 18,
                        minWidth: 34,
                      }}
                    >
                      {String(ordinal).padStart(2, "0")}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: t.textPrimary, fontSize: 15 }}>
                        {item}
                      </Text>
                      <Text
                        style={{ color: p.muted, fontSize: 11, marginTop: 5 }}
                      >
                        {done} / 56
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={p.accent}
                    />
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heading: { fontSize: 22, fontWeight: "700", letterSpacing: -0.8 },
  topline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  stage: { alignItems: "center", justifyContent: "center" },
  portal: { height: "100%", width: "78%", maxWidth: 290 },
  neighbor: {
    position: "absolute",
    width: 44,
    height: 70,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  description: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "700",
    textAlign: "center",
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
    letterSpacing: -1,
    textAlign: "center",
    marginVertical: 10,
  },
  bars: { flexDirection: "row", gap: 6, marginTop: 12 },
  footer: { paddingTop: 10, paddingHorizontal: 22 },
  button: {
    minHeight: 54,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "center",
  },
  utilities: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    marginTop: 4,
  },
  utility: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },
  chapters: { flexGrow: 0, maxHeight: 52, minHeight: 52 },
  chapter: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  mapCaption: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  nodeLabel: {
    width: 110,
    textAlign: "center",
    fontSize: 10,
    marginTop: 7,
    marginBottom: 3,
  },
  modal: { flex: 1, justifyContent: "center", padding: 18 },
  index: { maxHeight: "85%", borderRadius: 26, padding: 12 },
  levels: { flexDirection: "row", gap: 6, paddingVertical: 10 },
  indexRow: {
    minHeight: 72,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
