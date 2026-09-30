import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../ThemeContext";
import PressableHybrid from "../PressableHybrid";
import { triLang, type Lang } from "../../constants/i18n";
import {
  buildLearningV2CourseAccordionMapFromPreparedProgressV1,
  type LearningV2AccordionSessionStateV1,
  type LearningV2CourseAccordionRowV1,
  type LearningV2PreparedAccordionProgressV1,
} from "../../modules/learning-v2/map/course_accordion_map_model_v1";

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
  renderLessonCard?: (props: {
    readonly title: string;
    readonly ordinal: number;
    readonly completedSessionCount: number;
    readonly isCurrent: boolean;
    readonly isAvailable: boolean;
    readonly isInProgress: boolean;
    readonly onPress: () => void;
  }) => React.ReactNode;
}

type SessionRow = Extract<LearningV2CourseAccordionRowV1, { kind: "session" }>;

function currentLessonOrdinal(currentSessionId: string | null): number {
  const match = /^lesson-(\d+):session:\d+$/.exec(currentSessionId ?? "");
  return match ? Number(match[1]) : 1;
}

export default function LearningV2ChaptersCourse(props: Props) {
  const { theme: t } = useTheme();
  const [allLessonsOpen, setAllLessonsOpen] = useState(false);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const canonicalCurrentLessonOrdinal = currentLessonOrdinal(props.currentSessionId);
  const [selectedLessonOrdinal, setSelectedLessonOrdinal] = useState(canonicalCurrentLessonOrdinal);
  useEffect(() => {
    setSelectedLessonOrdinal(canonicalCurrentLessonOrdinal);
  }, [canonicalCurrentLessonOrdinal]);
  const { onSessionPress } = props;
  const rows = useMemo(
    () => buildLearningV2CourseAccordionMapFromPreparedProgressV1({
      projectionScopeKey: props.scopeKey,
      expandedLessonOrdinal: selectedLessonOrdinal,
      preparedProgress: props.preparedProgress,
    }).rows,
    [props.preparedProgress, props.scopeKey, selectedLessonOrdinal],
  );
  const lessonRows = useMemo(
    () => rows.filter((row) => row.lessonOrdinal === selectedLessonOrdinal),
    [rows, selectedLessonOrdinal],
  );
  const chapterRows = useMemo(
    () => lessonRows.filter((row) => row.kind === "chapter"),
    [lessonRows],
  );
  const sessionRows = useMemo(
    () => lessonRows.filter((row): row is SessionRow => row.kind === "session"),
    [lessonRows],
  );
  const completed = useMemo(() => new Set(props.completedSessionIds), [props.completedSessionIds]);
  const currentLessonTitle = props.titles[selectedLessonOrdinal - 1] ?? "";

  const toggleChapter = useCallback((chapterOrdinal: number) => {
    const next = expandedChapter === chapterOrdinal ? null : chapterOrdinal;
    setExpandedChapter(next);
    props.onExpandedLesson(next === null ? null : selectedLessonOrdinal);
    if (next !== null) {
      const visible = sessionRows
        .filter((row) => row.chapterOrdinal === next)
        .map((row) => ({ sessionOrdinal: row.sessionOrdinal, state: row.state }));
      props.onVisibleSessionsSettled?.(selectedLessonOrdinal, visible);
    }
  }, [expandedChapter, props, selectedLessonOrdinal, sessionRows]);

  const openLesson = useCallback((ordinal: number) => {
    setSelectedLessonOrdinal(ordinal);
    props.onExpandedLesson(ordinal);
    setExpandedChapter(null);
    setAllLessonsOpen(false);
  }, [props]);

  if (allLessonsOpen) {
    return <View testID="learning-v2-chapters-course" style={[styles.root, { backgroundColor: t.bgPrimary, paddingTop: props.topPadding ?? 0 }]}>
      <View style={styles.header}>
        <PressableHybrid variant="icon" accessibilityLabel={triLang(props.lang, { ru: "Назад", en: "Back", uk: "Назад", es: "Atrás", "pt-BR": "Voltar", vi: "Quay lại", id: "Kembali", tr: "Geri", pl: "Wstecz" })} onPress={() => setAllLessonsOpen(false)} style={[styles.iconButton, { backgroundColor: t.bgCard }]} contentStyle={styles.iconButtonContent}>
          <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
        </PressableHybrid>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>{triLang(props.lang, { ru: "Все уроки", en: "All lessons", uk: "Усі уроки", es: "Todas las lecciones", "pt-BR": "Todas as lições", vi: "Tất cả bài học", id: "Semua pelajaran", tr: "Tüm dersler", pl: "Wszystkie lekcje" })}</Text>
        {props.headerAccessory}
      </View>
      <ScrollView testID="learning-v2-all-lessons-list" contentContainerStyle={[styles.list, { paddingBottom: props.bottomPadding }]}>
        {props.titles.map((title, index) => {
          const ordinal = index + 1;
          const lessonSessions = rows.filter((row): row is SessionRow => row.kind === "session" && row.lessonOrdinal === ordinal);
          const completedSessionCount = lessonSessions.filter((row) => completed.has(row.id)).length;
          const cardProps = { title, ordinal, completedSessionCount, isCurrent: ordinal === selectedLessonOrdinal, isAvailable: true, isInProgress: false, onPress: () => openLesson(ordinal) };
          return <View key={ordinal} style={styles.lessonCard}>{props.renderLessonCard ? props.renderLessonCard(cardProps) : <PressableHybrid variant="card" accessibilityLabel={title} onPress={cardProps.onPress} style={[styles.fallbackLesson, { backgroundColor: t.bgCard }]} contentStyle={styles.fallbackLessonContent}><View style={styles.lessonCopy}><Text style={[styles.lessonMeta, { color: t.textMuted }]}>{ordinal} · {completedSessionCount}/56</Text><Text style={[styles.lessonTitle, { color: t.textPrimary }]}>{title}</Text></View><Ionicons name="chevron-forward" size={20} color={t.textMuted} /></PressableHybrid>}</View>;
        })}
        <PressableHybrid variant="chip" accessibilityLabel={props.legacyLessonsLabel} onPress={props.onLegacyLessons} style={[styles.legacyButton, { backgroundColor: t.bgSurface2 }]} contentStyle={styles.legacyButtonContent}><Text style={{ color: t.textPrimary }}>{props.legacyLessonsLabel}</Text></PressableHybrid>
      </ScrollView>
    </View>;
  }

  return <View testID="learning-v2-chapters-course" style={[styles.root, { backgroundColor: t.bgPrimary, paddingTop: props.topPadding ?? 0 }]}>
    <View style={styles.header}>
      {props.navigationControl}
      <View style={styles.titleBlock}><Text style={[styles.lessonKicker, { color: t.textMuted }]}>{triLang(props.lang, { ru: `Урок ${selectedLessonOrdinal}`, en: `Lesson ${selectedLessonOrdinal}`, uk: `Урок ${selectedLessonOrdinal}`, es: `Lección ${selectedLessonOrdinal}`, "pt-BR": `Lição ${selectedLessonOrdinal}`, vi: `Bài ${selectedLessonOrdinal}`, id: `Pelajaran ${selectedLessonOrdinal}`, tr: `Ders ${selectedLessonOrdinal}`, pl: `Lekcja ${selectedLessonOrdinal}` })}</Text><Text style={[styles.headerTitle, { color: t.textPrimary }]}>{currentLessonTitle}</Text></View>
      {props.headerAccessory}
    </View>
    <ScrollView contentContainerStyle={[styles.list, { paddingBottom: props.bottomPadding }]}>
      {chapterRows.map((chapter) => {
        const chapterSessions = sessionRows.filter((row) => row.chapterOrdinal === chapter.chapterOrdinal);
        const completedCount = chapterSessions.filter((row) => row.state === "completed").length;
        const isExpanded = expandedChapter === chapter.chapterOrdinal;
        return <View key={chapter.id} style={[styles.chapter, { backgroundColor: t.bgCard }]}>
          <PressableHybrid variant="card" testID={`learning-v2-chapter-${chapter.chapterOrdinal}`} accessibilityLabel={`${triLang(props.lang, { ru: "Глава", en: "Chapter", uk: "Розділ", es: "Capítulo", "pt-BR": "Capítulo", vi: "Chương", id: "Bab", tr: "Bölüm", pl: "Rozdział" })} ${chapter.chapterOrdinal}`} onPress={() => toggleChapter(chapter.chapterOrdinal)} style={styles.chapterPress} contentStyle={styles.chapterPressContent}>
            <View style={styles.chapterCopy}><Text style={[styles.chapterKicker, { color: t.accent }]}>{triLang(props.lang, { ru: `ГЛАВА ${chapter.chapterOrdinal}`, en: `CHAPTER ${chapter.chapterOrdinal}`, uk: `РОЗДІЛ ${chapter.chapterOrdinal}`, es: `CAPÍTULO ${chapter.chapterOrdinal}`, "pt-BR": `CAPÍTULO ${chapter.chapterOrdinal}`, vi: `CHƯƠNG ${chapter.chapterOrdinal}`, id: `BAB ${chapter.chapterOrdinal}`, tr: `BÖLÜM ${chapter.chapterOrdinal}`, pl: `ROZDZIAŁ ${chapter.chapterOrdinal}` })}</Text><Text style={[styles.chapterProgress, { color: t.textPrimary }]}>{completedCount}/8</Text></View>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={t.textMuted} />
          </PressableHybrid>
          {isExpanded ? <View style={styles.sessions}>{chapterSessions.map((row) => {
            const hasMaterial = props.isSessionMaterialAvailable?.(row.lessonOrdinal, row.sessionOrdinal) ?? true;
            const isCheckpoint = row.role === "chapter_checkpoint";
            const isExam = row.role === "final_exam";
            const icon = !hasMaterial ? "construct-outline" : row.state === "completed" ? "checkmark" : isCheckpoint || isExam ? "trophy" : row.state === "locked" ? "lock-closed" : "play";
            return <PressableHybrid key={row.id} variant="card" testID={`learning-v2-chapter-session-${row.sessionOrdinal}`} accessibilityLabel={`${row.sessionOrdinal}`} accessibilityState={{ disabled: !hasMaterial }} disabled={!hasMaterial} onPress={hasMaterial ? () => onSessionPress(row.lessonOrdinal, row.sessionOrdinal, row.state) : undefined} style={[styles.session, { backgroundColor: t.bgSurface2, opacity: hasMaterial ? 1 : 0.62 }]} contentStyle={styles.sessionContent}><View style={styles.sessionNumber}><Ionicons name={icon} size={17} color={t.accent} /></View><Text style={[styles.sessionLabel, { color: t.textPrimary }]}>{triLang(props.lang, { ru: `Сессия ${row.sessionOrdinal}`, en: `Session ${row.sessionOrdinal}`, uk: `Сесія ${row.sessionOrdinal}`, es: `Sesión ${row.sessionOrdinal}`, "pt-BR": `Sessão ${row.sessionOrdinal}`, vi: `Phiên ${row.sessionOrdinal}`, id: `Sesi ${row.sessionOrdinal}`, tr: `Oturum ${row.sessionOrdinal}`, pl: `Sesja ${row.sessionOrdinal}` })}</Text><Text style={[styles.sessionState, { color: t.textMuted }]}>{row.state}</Text></PressableHybrid>;
          })}</View> : null}
        </View>;
      })}
      <PressableHybrid variant="card" testID="learning-v2-all-lessons" accessibilityLabel={triLang(props.lang, { ru: "Все уроки", en: "All lessons", uk: "Усі уроки", es: "Todas las lecciones", "pt-BR": "Todas as lições", vi: "Tất cả bài học", id: "Semua pelajaran", tr: "Tüm dersler", pl: "Wszystkie lekcje" })} onPress={() => setAllLessonsOpen(true)} style={[styles.allLessons, { backgroundColor: t.bgSurface2 }]} contentStyle={styles.allLessonsContent}><Ionicons name="list-outline" size={20} color={t.textPrimary} /><Text style={[styles.allLessonsText, { color: t.textPrimary }]}>{triLang(props.lang, { ru: "Все уроки", en: "All lessons", uk: "Усі уроки", es: "Todas las lecciones", "pt-BR": "Todas as lições", vi: "Tất cả bài học", id: "Semua pelajaran", tr: "Tüm dersler", pl: "Wszystkie lekcje" })}</Text></PressableHybrid>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, header: { minHeight: 72, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 }, titleBlock: { flex: 1, minWidth: 0, flexShrink: 1 }, headerTitle: { flexShrink: 1, fontSize: 20, lineHeight: 25, fontWeight: "800" }, lessonKicker: { fontSize: 12, lineHeight: 16, fontWeight: "700" }, iconButton: { width: 48, height: 48, borderRadius: 18 }, iconButtonContent: { flex: 1, alignItems: "center", justifyContent: "center" }, list: { paddingHorizontal: 12, gap: 10 }, chapter: { borderRadius: 24, overflow: "hidden" }, chapterPress: { borderRadius: 24 }, chapterPressContent: { minHeight: 76, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, chapterCopy: { gap: 3 }, chapterKicker: { fontSize: 12, lineHeight: 16, letterSpacing: 1.2, fontWeight: "800" }, chapterProgress: { fontSize: 18, lineHeight: 23, fontWeight: "800" }, sessions: { paddingHorizontal: 10, paddingBottom: 10, gap: 8 }, session: { borderRadius: 18 }, sessionContent: { minHeight: 54, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 }, sessionNumber: { width: 28, alignItems: "center" }, sessionLabel: { flex: 1, fontSize: 15, fontWeight: "700" }, sessionState: { fontSize: 12, fontWeight: "700" }, allLessons: { borderRadius: 20, marginTop: 6 }, allLessonsContent: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, allLessonsText: { fontSize: 16, fontWeight: "800" }, lessonCard: { marginBottom: 2 }, fallbackLesson: { borderRadius: 20 }, fallbackLessonContent: { minHeight: 76, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 }, lessonCopy: { flex: 1 }, lessonMeta: { fontSize: 12, fontWeight: "700", marginBottom: 3 }, lessonTitle: { fontSize: 17, fontWeight: "800" }, legacyButton: { borderRadius: 18, marginTop: 6 }, legacyButtonContent: { minHeight: 48, alignItems: "center", justifyContent: "center" },
});
