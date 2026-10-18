import React, { memo, useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Circle } from "react-native-svg";
import PressableHybrid from "../PressableHybrid";
import { lv2Alpha, lv2CardStyle, useLv2Glass, type Lv2Glass } from "./LearningV2Glass";
import type { Lang } from "../../constants/i18n";
import { COURSE_LEVELS, COURSE_LEVEL_RANGES, getCourseLevelForLesson, type CourseLevel } from "../../app/course_levels";

/**
 * Список «Все уроки» V2 — по эталону learning-v2.html, блок 1.6 (`lessonsList()` / `lrow()`).
 *
 * зачем (вердикт Макетов 92b1349d8, learning-v2-007; решение координатора 18.10): экран рисовал строки старого каталога «Обучение» (стеклянная карточка `.lc`: бирюзовые «УРОК N» с процентом
 * и полоса у текущей), без чипов уровней и с лишними значками в шапке. Эталон: ряд чипов A1–B2 (фильтр по уровню курса) и справа плашка «Классический курс» (бывш. «Обучение», слово
 * владельца 17.10), строки — мелкая метка «A1 · 01 · Текущий», название, справа кольцо прогресса / замок / ключ, закрытые приглушены. Нажатия, замки, прогресс и переход в урок —
 * те же функции, что и были (приходят пропсами): здесь меняется только вид. Подписи переносятся, не обрезаются и не ужимаются по размеру шрифта.
 */
export type AllLessonsRow = Readonly<{
  ordinal: number;
  title: string;
  completedCount: number;
  isCurrent: boolean;
  isAvailable: boolean;
  isInProgress: boolean;
}>;

type Props = Readonly<{
  lang: Lang;
  rows: readonly AllLessonsRow[];
  /** Занятий в уроке — знаменатель кольца прогресса. */
  sessionsPerLesson: number;
  /** Урок, на котором стоит человек: его уровень открыт первым. */
  selectedOrdinal: number;
  legacyLabel: string;
  onLegacy: () => void;
  onOpenLesson: (ordinal: number) => void;
  onLockedLesson: (ordinal: number) => void;
  bottomPadding: number;
}>;

// ⚠ ЖДУТ УТВЕРЖДЕНИЯ ПЕРЕВОДЧИКА (10). зачем (координатор 18.10): метка текущего урока на 9 языках; слова предложил Дизайн, коммит разрешён координатором с пометкой; при расхождении заменить здесь одну строку, сторож проверяет только наличие всех 9 языков
const CURRENT_WORD: Record<Lang, string> = {
  ru: "Текущий", uk: "Поточний", en: "Current", es: "Actual", "pt-BR": "Atual", vi: "Đang học", id: "Saat ini", tr: "Şu anki", pl: "Bieżąca", // зачем (переводчик 18.10): tr «Güncel» = «актуальный», vi «Hiện tại» = «настоящее время»
};

const RING_R = 18;
const RING_LEN = 2 * Math.PI * RING_R;

/** Кольцо прогресса 44 (эталон `ringSvg`: трек 4, дуга 4, круглые концы, старт сверху). Готово — галочка. */
const ProgressRing = memo(function ProgressRing({ pct, done, g }: Readonly<{ pct: number; done: boolean; g: Lv2Glass }>) {
  const arc = Math.max(0, Math.min(1, pct)) * RING_LEN;
  return (
    <View style={styles.ring} accessibilityElementsHidden importantForAccessibility="no">
      <Svg width={44} height={44} viewBox="0 0 44 44" style={StyleSheet.absoluteFill}>
        <Circle cx={22} cy={22} r={RING_R} stroke={lv2Alpha(g.text, 0.16)} strokeWidth={4} fill="none" />
        {arc > 0 ? (
          <Circle cx={22} cy={22} r={RING_R} stroke={g.text} strokeWidth={4} fill="none" strokeDasharray={`${arc} ${RING_LEN}`} strokeLinecap="round" rotation={-90} originX={22} originY={22} />
        ) : null}
      </Svg>
      {done ? <Ionicons name="checkmark" size={20} color={g.text} /> : null}
    </View>
  );
});

type RowProps = Readonly<{
  row: AllLessonsRow;
  level: CourseLevel;
  pct: number;
  currentWord: string;
  g: Lv2Glass;
  onPress: (row: AllLessonsRow) => void;
}>;

const LessonRow = memo(function LessonRow({ row, level, pct, currentWord, g, onPress }: RowProps) {
  const locked = !row.isAvailable;
  const dim = locked || row.isInProgress;
  const meta = `${level} · ${String(row.ordinal).padStart(2, "0")}${row.isCurrent ? ` · ${currentWord}` : ""}`;
  const handle = useCallback(() => onPress(row), [onPress, row]);
  return (
    <PressableHybrid
      variant="card"
      testID={`learning-v2-all-lessons-row-${row.ordinal}`}
      accessibilityLabel={`${meta}. ${row.title}`}
      accessibilityState={{ disabled: locked }}
      onPress={handle}
      style={[lv2CardStyle(g, 14), dim ? styles.dim : null]}
      contentStyle={styles.rowContent}
    >
      <View style={styles.rowCopy}>
        {/* зачем ([BLEND-AUDIT] 18.10): у закрытой/готовящейся строки opacity 0,62 на всю строку — приглушённый mutedText под ним падал до 2,65:1; метка и значки берут g.text (под 0,62 ≥ 5,08:1), строка остаётся отличимой от открытой (название 2,51:1 к открытому) */}
        <Text style={[styles.rowMeta, { color: row.isCurrent || dim ? g.text : g.mutedText }]}>{meta}</Text>
        <Text style={[styles.rowTitle, { color: g.text }]}>{row.title}</Text>
      </View>
      {locked ? <Ionicons name="lock-closed" size={22} color={g.text} />
        : row.isInProgress ? <Ionicons name="construct-outline" size={22} color={g.text} />
        : <ProgressRing pct={pct} done={pct >= 1} g={g} />}
      <Ionicons name="chevron-forward" size={20} color={dim ? g.text : g.secondary} />
    </PressableHybrid>
  );
});

export default function LearningV2AllLessonsList(props: Props) {
  const g = useLv2Glass();
  const { rows, sessionsPerLesson, selectedOrdinal, onOpenLesson, onLockedLesson } = props;
  const [level, setLevel] = useState<CourseLevel>(() => getCourseLevelForLesson(selectedOrdinal));
  const currentWord = CURRENT_WORD[props.lang] ?? CURRENT_WORD.en;
  const levelHasRows = useMemo(() => {
    const present = new Set<CourseLevel>();
    for (const row of rows) present.add(getCourseLevelForLesson(row.ordinal));
    return present;
  }, [rows]);
  const visible = useMemo(() => {
    const [from, to] = COURSE_LEVEL_RANGES[level];
    return rows.filter((row) => row.ordinal >= from && row.ordinal <= to);
  }, [level, rows]);
  const handleRow = useCallback((row: AllLessonsRow) => {
    const locked = !row.isAvailable;
    const decision = locked ? "locked_hint" : "open";
    console.log("[ALL-LESSONS] tap", JSON.stringify({ id: row.ordinal, locked, inProgress: row.isInProgress, decision })); // guard-ok: одна строка на нажатие по уроку
    if (locked) onLockedLesson(row.ordinal);
    else onOpenLesson(row.ordinal);
  }, [onLockedLesson, onOpenLesson]);
  const renderItem = useCallback(({ item }: { item: AllLessonsRow }) => (
    <LessonRow row={item} level={level} pct={sessionsPerLesson > 0 ? item.completedCount / sessionsPerLesson : 0} currentWord={currentWord} g={g} onPress={handleRow} />
  ), [currentWord, g, handleRow, level, sessionsPerLesson]);
  const header = (
    <View style={styles.chips}>
      {COURSE_LEVELS.map((code) => {
        const selected = code === level;
        const empty = !levelHasRows.has(code);
        return (
          <PressableHybrid
            key={code}
            variant="chip"
            testID={`learning-v2-all-lessons-level-${code}`}
            accessibilityLabel={code}
            accessibilityState={{ selected, disabled: empty }}
            disabled={empty}
            onPress={() => setLevel(code)}
            style={[styles.chip, { backgroundColor: selected ? g.ctaFill : g.buttonFill }, empty ? styles.dim : null]}
            contentStyle={styles.chipContent}
          >
            <Text style={[styles.chipText, { color: selected ? g.ctaFillInk : g.text }]}>{code}</Text>
          </PressableHybrid>
        );
      })}
      <PressableHybrid
        variant="chip"
        testID="learning-v2-all-lessons-classic"
        accessibilityLabel={props.legacyLabel}
        onPress={props.onLegacy}
        style={[styles.chip, styles.classicChip, { backgroundColor: g.buttonFill }]}
        contentStyle={styles.chipContent}
      >
        <Ionicons name="albums-outline" size={16} color={g.text} />
        <Text style={[styles.chipText, styles.classicText, { color: g.text }]}>{props.legacyLabel}</Text>
      </PressableHybrid>
    </View>
  );
  return (
    <FlatList
      testID="learning-v2-all-lessons-list"
      data={visible}
      keyExtractor={(item) => String(item.ordinal)}
      renderItem={renderItem}
      ListHeaderComponent={header}
      contentContainerStyle={[styles.list, { paddingBottom: props.bottomPadding }]}
      ItemSeparatorComponent={Separator}
      initialNumToRender={10}
      windowSize={5}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

/** Подпись «Текущий» на 9 языках экспортируется для сторожа переводов. */
export const ALL_LESSONS_CURRENT_WORD = CURRENT_WORD;

const styles = StyleSheet.create({
  list: { paddingHorizontal: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 8, rowGap: 8, marginTop: 20, marginBottom: 18 },
  chip: { borderRadius: 15, minHeight: 30 },
  chipContent: { width: "auto", minHeight: 30, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  // зачем (D145, храповик typography_two_sizes): ниже заголовка текст только 16 и 13 — у эталона 15/17, у приложения шкала владельца 16/13
  chipText: { fontSize: 16, lineHeight: 21, fontWeight: "700" },
  classicChip: { marginLeft: "auto", flexShrink: 1, maxWidth: "100%" },
  classicText: { flexShrink: 1 },
  rowContent: { minHeight: 70, paddingVertical: 9, paddingLeft: 18, paddingRight: 16, flexDirection: "row", alignItems: "center", gap: 16 },
  rowCopy: { flex: 1, minWidth: 0 },
  rowMeta: { fontSize: 13, lineHeight: 17, fontWeight: "700", letterSpacing: 0.4 },
  rowTitle: { fontSize: 16, lineHeight: 21, fontWeight: "700", marginTop: 2 },
  ring: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  dim: { opacity: 0.62 },
  separator: { height: 12 },
});
