import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InteractionManager, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { lv2Alpha, lv2CardStyle, lv2NodePaint, useLv2Glass } from "./LearningV2Glass";
import { nestedBoxShadow } from "../v2/ShadowSurface";
// зачем: владелец 18.10 — без текстур, иконки как в Диалогах, но свои (плитка тоном текста 9 % и Ionicons, значки по смыслу главы)
import { learningV2ChapterIonIcon, learningV2LessonIonIcon } from "./icons/learningV2IonIcons";
import { glassTone } from "../dialogs/glass/glassTone";
import PressableHybrid from "../PressableHybrid";
import LearningV2MapNode from "../LearningV2MapNode";
import CoinRewardFlight, { type CoinRewardFlightPoint } from "../rewards/CoinRewardFlight";
import { triLang, type Lang } from "../../constants/i18n";
import { LEARNING_V2_LESSON_SESSION_COUNT_V1 } from "../../modules/learning-v2/content/course_topology_v1";
import {
  buildLearningV2CourseAccordionMapFromPreparedProgressV1,
  type LearningV2AccordionSessionStateV1,
  type LearningV2CourseAccordionRowV1,
  type LearningV2PreparedAccordionProgressV1,
} from "../../modules/learning-v2/map/course_accordion_map_model_v1";
import { noteBackArrived, noteBackDecision, noteBackTap } from "../../app/back_tap_probe";
import LearningV2AllLessonsList, { type AllLessonsRow } from "./LearningV2AllLessonsList";
import BackGlyph from '../v2/BackGlyph';
import { pickInitialLessonOrdinal } from "../../app/learning_v2_last_lesson";

interface Props {
  titles: readonly string[];
  lang: Lang;
  scopeKey: string;
  preparedProgress: LearningV2PreparedAccordionProgressV1;
  currentSessionId: string | null;
  /** Запомненный последний открытый урок (app/learning_v2_last_lesson); нет — урок первого незавершённого занятия. */
  preferredLessonOrdinal?: number | null;
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
  /** Куда летят монеты с пройденного узла (чип баланса в шапке). Нет — начало headerAccessory. */
  coinTargetRef?: React.RefObject<View | null>;
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

const REVEAL_EASE = Easing.bezier(0.23, 1, 0.32, 1);
/** Монет в полёте с узла — как в макете (три монеты по дуге 620 мс, каскад 90 мс). */
const NODE_FLIGHT_COINS = 3;
const NODE_SIZE = 64;

/**
 * Раскрытие карты (learning-v2.html, анимация «Раскрытие карты»): элемент поднимается на 6 px
 * из почти полной видимости (.88) за 150 мс, каскадом по индексу. Меняются только
 * opacity/transform — первый кадр уже в финальной геометрии, ничего не прыгает.
 * play=false (reduceMotion или повторный показ) — сразу финальный кадр.
 */
function Lv2Reveal({ index, play, style, children, onLayout }: Readonly<{
  index: number;
  play: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  onLayout?: (e: LayoutChangeEvent) => void;
}>) {
  const playOnMount = useRef(play).current;
  const progress = useSharedValue(playOnMount ? 0 : 1);
  useEffect(() => {
    if (!playOnMount) return;
    progress.value = withDelay(
      60 + Math.min(index, 6) * 24,
      withTiming(1, { duration: 150, easing: REVEAL_EASE }),
    );
  }, [index, playOnMount, progress]);
  const revealStyle = useAnimatedStyle(() => ({
    opacity: 0.88 + progress.value * 0.12,
    transform: [
      { translateY: (1 - progress.value) * 6 },
      { scale: 0.985 + progress.value * 0.015 },
    ],
  }));
  return <Animated.View onLayout={onLayout} style={[style, revealStyle]}>{children}</Animated.View>;
}

function currentLessonOrdinal(currentSessionId: string | null): number {
  const match = /^lesson-(\d+):session:\d+$/.exec(currentSessionId ?? "");
  return match ? Number(match[1]) : 1;
}

export default function LearningV2ChaptersCourse(props: Props) {
  // зачем (learning-v2.html, вариант «Главы»): карточки глав, узлы и «Все уроки» — на токенах
  // Liquid Glass активной темы; логика выбора урока и глав осталась прежней.
  const g = useLv2Glass();
  // зачем (владелец 2026-09-30, learning-v2.html «Анимации — живые»): у боевой карты «Главы»
  // появились вступительное раскрытие (один раз за жизнь экрана, как у карты А) и прохождение
  // узла: узел садится (1.08 → 1), следующий «выстреливает» (.7 → 1.1 → 1) с гало, монеты летят
  // с узла в чип баланса. Узлы рисует общий LearningV2MapNode — та же механика, что у карты А.
  const [introReveal] = useState(() => !props.reducedMotion);
  const [coinFlight, setCoinFlight] = useState<Readonly<{
    key: number;
    from: CoinRewardFlightPoint;
    to: CoinRewardFlightPoint;
  }> | null>(null);
  const flightSeqRef = useRef(0);
  const headerAccessoryRef = useRef<View>(null);
  const { coinTargetRef, onSessionCompleted, reducedMotion } = props;
  const handleNodeCompleted = useCallback((from: CoinRewardFlightPoint) => {
    onSessionCompleted?.(from);
    if (reducedMotion) return;
    const target = coinTargetRef?.current ?? headerAccessoryRef.current;
    if (!target) {
      if (__DEV__) console.log("[LV2-MAP-FLIGHT] skip: no_target");
      return;
    }
    target.measureInWindow((x, y, w, h) => {
      if (w <= 0 || h <= 0) {
        if (__DEV__) console.log("[LV2-MAP-FLIGHT] skip: target_not_laid_out", JSON.stringify({ w, h }));
        return;
      }
      flightSeqRef.current += 1;
      setCoinFlight({ key: flightSeqRef.current, from, to: { x: x + Math.min(w / 2, 18), y: y + h / 2 } });
    });
  }, [coinTargetRef, onSessionCompleted, reducedMotion]);
  const clearCoinFlight = useCallback(() => setCoinFlight(null), []);
  const [allLessonsOpen, setAllLessonsOpen] = useState(false);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const canonicalCurrentLessonOrdinal = currentLessonOrdinal(props.currentSessionId);
  const preferredLessonOrdinal = props.preferredLessonOrdinal ?? null;
  // зачем (поручение владельца через координатора 18.10: «всегда открывается урок 1»): первый кадр берёт запомненный урок, а не только урок первого незавершённого занятия
  const [requestedLessonOrdinal, setSelectedLessonOrdinal] = useState(() => {
    const choice = pickInitialLessonOrdinal({ remembered: preferredLessonOrdinal, canonical: canonicalCurrentLessonOrdinal, visibleOrdinals: null });
    console.log("[V2-LAST-LESSON] map:init", JSON.stringify({ remembered: preferredLessonOrdinal, canonical: canonicalCurrentLessonOrdinal, picked: choice.ordinal, branch: choice.branch, source: preferredLessonOrdinal === null ? "none_yet_or_empty" : "memory" })); // guard-ok: выбор урока при монтировании
    return choice.ordinal;
  });
  // человек сам выбрал урок на карте — позднее чтение диска и прогресс его выбор не переписывают, кроме продвижения текущего занятия
  const userChoseLessonRef = useRef(false);
  const canonicalSeenRef = useRef(canonicalCurrentLessonOrdinal);
  useEffect(() => {
    if (canonicalSeenRef.current === canonicalCurrentLessonOrdinal) return;
    console.log("[V2-LAST-LESSON] map:canonical_changed", JSON.stringify({ from: canonicalSeenRef.current, to: canonicalCurrentLessonOrdinal })); // guard-ok: ветка и значение
    canonicalSeenRef.current = canonicalCurrentLessonOrdinal;
    userChoseLessonRef.current = false;
    setSelectedLessonOrdinal(canonicalCurrentLessonOrdinal);
  }, [canonicalCurrentLessonOrdinal]);
  useEffect(() => {
    // запомненный урок пришёл с диска позже первого кадра (память была холодной) — применяем один раз, пока человек сам ничего не выбрал
    if (preferredLessonOrdinal === null || userChoseLessonRef.current) return;
    setSelectedLessonOrdinal((current) => {
      if (current === preferredLessonOrdinal) return current;
      console.log("[V2-LAST-LESSON] map:late_remembered", JSON.stringify({ from: current, to: preferredLessonOrdinal })); // guard-ok: ветка и значение
      return preferredLessonOrdinal;
    });
  }, [preferredLessonOrdinal]);
  // зачем (Сверка 21.10, Galaxy A04, «виснет в уроках»): таблицы озвучки (4 МБ) строились при ВХОДЕ в занятие и замирали UI.
  // Строим их заранее, после первого кадра карты и тишины взаимодействий; повтор бесплатен (lazyContent). Сбой не мешает карте.
  useEffect(() => {
    const timer = setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          (require("../../app/learning_v2_lesson_audio_pack_v1") as typeof import("../../app/learning_v2_lesson_audio_pack_v1")).warmLearningV2AudioTablesV1();
        } catch (error) {
          console.warn("[AUDIO-TABLES-WARM] map_failed", error instanceof Error ? error.message : String(error));
        }
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);
  const { onSessionPress, isSessionMaterialAvailable } = props;
  // зачем (владелец 11.10: «ТАМ ДОЛЖНО ПОКАЗЫВАТЬСЯ СТОЛЬКО СКОЛЬКО ДОСТУПНО»): занятия, которые не открываются, НЕ
  // рисуются вовсе (раньше — серый узел со «стройкой» и тупик «Сессия недоступна»). Урок без единого видимого занятия
  // не попадает в «Все уроки»; если текущий урок целиком скрыт — показываем последний урок, где занятия есть.
  const isSessionVisible = useCallback(
    (lessonOrdinal: number, sessionOrdinal: number) => isSessionMaterialAvailable?.(lessonOrdinal, sessionOrdinal) ?? true,
    [isSessionMaterialAvailable],
  );
  const visibleLessonOrdinals = useMemo(
    () => props.titles
      .map((_, index) => index + 1)
      .filter((ordinal) => Array.from({ length: LEARNING_V2_LESSON_SESSION_COUNT_V1 }, (_, index) => index + 1)
        .some((sessionOrdinal) => isSessionVisible(ordinal, sessionOrdinal))),
    [isSessionVisible, props.titles],
  );
  // зачем (18.10): запомненный урок мог стать скрытым (занятия сняты) — тогда урок первого незавершённого занятия, а уже потом последний видимый
  const selectedLessonOrdinal = visibleLessonOrdinals.includes(requestedLessonOrdinal)
    ? requestedLessonOrdinal
    : (visibleLessonOrdinals.includes(canonicalCurrentLessonOrdinal)
      ? canonicalCurrentLessonOrdinal
      : (visibleLessonOrdinals[visibleLessonOrdinals.length - 1] ?? requestedLessonOrdinal));
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
    () => lessonRows.filter((row): row is SessionRow => row.kind === "session" && isSessionVisible(row.lessonOrdinal, row.sessionOrdinal)),
    [isSessionVisible, lessonRows],
  );
  const completed = useMemo(() => new Set(props.completedSessionIds), [props.completedSessionIds]);
  // зачем (координатор 15.10, Сверка Б11: карты V2 на экране нет): смонтирована ли карта и что в ней — уроков видно,
  // строк собрано, занятий в выбранном уроке. Ноль здесь = карта есть, но пустая; нет строки mount = карта не рисовалась.
  // зачем (R08, Сверка: React нарисовал карту, а на экране список A1): onLayout приходит от НАТИВНОГО слоя — его нет = вид не смонтирован нативно
  // зачем (R08 🔴, 15.10): бесконечное гало текущего узла (повтор анимации на UI-потоке) стартовало в одном коммите с монтированием всей карты —
  // на новой архитектуре непрерывные коммиты Reanimated мешали выводу карты на экран, и интерфейс замирал до следующего касания.
  // До первой нативной раскладки карты узлы стоят в «без бесконечного движения» (гало статично), после неё пульс включается как раньше.
  const [nativeReady, setNativeReady] = useState(false);
  const logChaptersLayout = useCallback((e: { nativeEvent: { layout: { x: number; y: number; width: number; height: number } } }) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    console.log("[V2-MAP] chapters:layout", JSON.stringify({ x, y, width, height, allLessonsOpen }));
    setNativeReady(true);
  }, [allLessonsOpen]);
  // зачем (координатор 15.10, Сверка 🔴: на 97572a3e4 React рисует карту, нативно нет — chapters:layout=0): сперва логи [V2-MAP-LAYOUT].
  // onLayout КАЖДОГО уровня (корень, шапка, заголовок, скролл, содержимое, каждая глава) с размерами и мс от монтирования, число глав и
  // откуда данные. Нет строки уровня = он не выложен нативно; height=0 = выложен, но без высоты (контейнер 0 до измерения / скролл без размера).
  const layoutMountedAtRef = useRef(Date.now());
  const layoutCtxRef = useRef({ chapters: 0, sessions: 0, rows: 0, allLessonsOpen, nativeReady, introReveal: false, progressSource: "none" });
  const logLayout = useCallback((level: string) => (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    console.log("[V2-MAP-LAYOUT] onLayout", JSON.stringify({ level, x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height), zero: width === 0 || height === 0, sinceMountMs: Date.now() - layoutMountedAtRef.current, ...layoutCtxRef.current })); // guard-ok: зонд R08, по строке на раскладку уровня
  }, []);
  const logContentSize = useCallback((width: number, height: number) => {
    console.log("[V2-MAP-LAYOUT] scroll:contentSize", JSON.stringify({ width: Math.round(width), height: Math.round(height), zero: width === 0 || height === 0, sinceMountMs: Date.now() - layoutMountedAtRef.current, ...layoutCtxRef.current })); // guard-ok: зонд R08
  }, []);
  useEffect(() => {
    console.log("[V2-MAP] chapters:mount", JSON.stringify({ scopeKey: props.scopeKey, atMs: Date.now() }));
    return () => console.log("[V2-MAP] chapters:unmount", JSON.stringify({ scopeKey: props.scopeKey }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: только монтирование/размонтирование
  }, []);
  useEffect(() => {
    console.log("[V2-MAP] chapters:rows", JSON.stringify({ titles: props.titles.length, visibleLessons: visibleLessonOrdinals.length, selectedLessonOrdinal, rows: rows.length, lessonRows: lessonRows.length, chapters: chapterRows.length, sessions: sessionRows.length, allLessonsOpen, active: props.active }));
  }, [props.titles.length, visibleLessonOrdinals.length, selectedLessonOrdinal, rows.length, lessonRows.length, chapterRows.length, sessionRows.length, allLessonsOpen, props.active]);
  const currentLessonTitle = props.titles[selectedLessonOrdinal - 1] ?? "";
  const progressSource = `prepared:completed=${props.completedSessionIds.length}`; // зачем: откуда данные карты — подготовленный прогресс из вкладки Уроки (источник прогресса пишет [V2-MAP-LAYOUT] page)
  layoutCtxRef.current = { chapters: chapterRows.length, sessions: sessionRows.length, rows: rows.length, allLessonsOpen, nativeReady, introReveal, progressSource };
  useEffect(() => {
    // зачем (R08 [V2-MAP-LAYOUT]): что React отдал на рендер и на какой мс от монтирования — сверять с тем, пришёл ли onLayout
    console.log("[V2-MAP-LAYOUT] render", JSON.stringify({ sinceMountMs: Date.now() - layoutMountedAtRef.current, scopeKey: props.scopeKey, active: props.active, ...layoutCtxRef.current })); // guard-ok: по строке на смену данных карты
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: журнал на смену того, что видно в строке
  }, [chapterRows.length, sessionRows.length, rows.length, allLessonsOpen, nativeReady, progressSource, props.active, props.scopeKey]);

  const toggleChapter = useCallback((chapterOrdinal: number) => {
    userChoseLessonRef.current = true;
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
    userChoseLessonRef.current = true;
    console.log("[V2-LAST-LESSON] map:open_lesson", JSON.stringify({ ordinal })); // guard-ok: тап по уроку
    setSelectedLessonOrdinal(ordinal);
    props.onExpandedLesson(ordinal);
    setExpandedChapter(null);
    setAllLessonsOpen(false);
  }, [props]);

  // зачем (вердикт Макетов learning-v2-007, решение координатора 18.10): «Все уроки» рисуется по эталону 1.6 (строки lrow, чипы уровней), данные строк те же, что давал прежний цикл:
  // видимые уроки, число пройденных занятий, текущий урок; доступность по-прежнему «открыт» (замки уроков решаются на карте). Один проход по занятиям вместо фильтра на каждый урок.
  const allLessonRows = useMemo<readonly AllLessonsRow[]>(() => {
    const completedByLesson = new Map<number, number>();
    for (const row of rows) {
      if (row.kind === "session" && completed.has(row.id)) completedByLesson.set(row.lessonOrdinal, (completedByLesson.get(row.lessonOrdinal) ?? 0) + 1);
    }
    return visibleLessonOrdinals.map((ordinal) => ({
      ordinal,
      title: props.titles[ordinal - 1] ?? "",
      completedCount: completedByLesson.get(ordinal) ?? 0,
      isCurrent: ordinal === selectedLessonOrdinal,
      isAvailable: true,
      isInProgress: false,
    }));
  }, [completed, props.titles, rows, selectedLessonOrdinal, visibleLessonOrdinals]);

  // зачем ([BACK-BTN] 18.10, Сверка: на «Все уроки» метки не было): возврат на карту — тап → решение → кадры → «прибыли»; без тапа ничего не пишет
  useEffect(() => { if (!allLessonsOpen) noteBackArrived('v2_map', 'all_lessons_closed'); }, [allLessonsOpen]);

  if (allLessonsOpen) {
    // зачем (эталон 1.6): в шапке только «назад» и «Все уроки» (34/40), без значков монет и энергии; плашка «Классический курс» живёт в ряду чипов списка
    return <View testID="learning-v2-chapters-course" onLayout={logChaptersLayout} style={[styles.root, { backgroundColor: "transparent" /* зачем (владелец 18.10 «верх как на Главной»): своя заливка g.bg давала ступеньку под часами — под картой то же полотно, что под Главной */, paddingTop: props.topPadding ?? 0 }]}>
      <View style={styles.allLessonsHeader}>
        <PressableHybrid variant="icon" accessibilityLabel={triLang(props.lang, { ru: "Назад", en: "Back", uk: "Назад", es: "Atrás", "pt-BR": "Voltar", vi: "Quay lại", id: "Kembali", tr: "Geri", pl: "Wstecz" })} onPress={() => { noteBackTap('v2_all_lessons', 'header_back_button'); noteBackDecision('all_lessons → map'); setAllLessonsOpen(false); }} style={[styles.iconButton, { backgroundColor: g.opaqueCard }]} contentStyle={styles.iconButtonContent}>
          <BackGlyph size={24} color={g.text} />
        </PressableHybrid>
        <Text style={[styles.allLessonsTitle, { color: g.text }]}>{triLang(props.lang, { ru: "Все уроки", en: "All lessons", uk: "Усі уроки", es: "Todas las lecciones", "pt-BR": "Todas as lições", vi: "Tất cả bài học", id: "Semua pelajaran", tr: "Tüm dersler", pl: "Wszystkie lekcje" })}</Text>
      </View>
      <LearningV2AllLessonsList
        lang={props.lang}
        rows={allLessonRows}
        sessionsPerLesson={LEARNING_V2_LESSON_SESSION_COUNT_V1}
        selectedOrdinal={selectedLessonOrdinal}
        legacyLabel={props.legacyLessonsLabel}
        onLegacy={props.onLegacyLessons}
        onOpenLesson={openLesson}
        onLockedLesson={props.onLockedLessonPress}
        bottomPadding={props.bottomPadding}
      />
    </View>;
  }

  // зачем: владелец 18.10 — без текстур, иконки как в Диалогах, но свои: у урока и каждой главы свой значок Ionicons на плитке тоном текста
  const tileTone = glassTone(g.text, 0.09);
  return <View testID="learning-v2-chapters-course" onLayout={(e) => { logChaptersLayout(e); logLayout("root")(e); }} style={[styles.root, { backgroundColor: "transparent" /* зачем (владелец 18.10 «верх как на Главной»): своя заливка g.bg давала ступеньку под часами — под картой то же полотно, что под Главной */, paddingTop: props.topPadding ?? 0 }]}>
    {/* зачем (владелец 04.10, раунд 2 → вариант A «Два этажа»): строка 1 — «назад» + HUD (словарь, монеты, энергия);
        строка 2 — «Урок N» и тема 22px на всю ширину: длинная тема помещается в две строки и ничего не пересекает. */}
    <View style={styles.header} onLayout={logLayout("header")}>
      {props.navigationControl}
      <View style={styles.headerSpacer} />
      <View ref={headerAccessoryRef} collapsable={false}>{props.headerAccessory}</View>
    </View>
    <View style={styles.lessonTitleBlock} onLayout={logLayout("titleBlock")}>
      {/* зачем (владелец 17.10: «старые уроки — отдельной кнопочкой»): кнопка «Классический курс» — в строке «Урок N» справа; в шапке с «назад» и HUD (словарь, монеты, энергия) на 360 dp места нет. Заливка тоном, без обводки */}
      <View style={styles.kickerRow}>
      <Text style={[styles.lessonKicker, { color: g.secondary }]}>{triLang(props.lang, { ru: `Урок ${selectedLessonOrdinal}`, en: `Lesson ${selectedLessonOrdinal}`, uk: `Урок ${selectedLessonOrdinal}`, es: `Lección ${selectedLessonOrdinal}`, "pt-BR": `Lição ${selectedLessonOrdinal}`, vi: `Bài ${selectedLessonOrdinal}`, id: `Pelajaran ${selectedLessonOrdinal}`, tr: `Ders ${selectedLessonOrdinal}`, pl: `Lekcja ${selectedLessonOrdinal}` })}</Text>
      <PressableHybrid testID="learning-v2-open-classic-course" variant="chip" hitSlop={{ top: 4, bottom: 4 }} accessibilityLabel={props.legacyLessonsLabel} onPress={props.onLegacyLessons} style={[styles.classicChip, { backgroundColor: g.buttonFill }]} contentStyle={styles.classicChipContent}>
        <Ionicons name="library-outline" size={16} color={g.text} />
        <Text style={[styles.classicChipText, { color: g.text }]}>{props.legacyLessonsLabel}</Text>
      </PressableHybrid>
      </View>
      <View style={styles.lessonTitleRow}>
        <View style={[styles.lessonTile, { backgroundColor: tileTone }]} testID="learning-v2-lesson-icon"><Ionicons name={learningV2LessonIonIcon(selectedLessonOrdinal)} size={22} color={g.text} /></View>
        <Text accessibilityRole="header" style={[styles.lessonTitleWide, styles.lessonTitleFlex, { color: g.text }]}>{currentLessonTitle}</Text>
      </View>
    </View>
    <ScrollView onLayout={logLayout("scroll")} onContentSizeChange={logContentSize} contentContainerStyle={[styles.list, { paddingBottom: props.bottomPadding }]}>
      {chapterRows.map((chapter, chapterIndex) => {
        const chapterSessions = sessionRows.filter((row) => row.chapterOrdinal === chapter.chapterOrdinal);
        if (chapterSessions.length === 0) return null;
        const completedCount = chapterSessions.filter((row) => row.state === "completed").length;
        const isExpanded = expandedChapter === chapter.chapterOrdinal;
        const chapterState = chapterSessions.length > 0 && completedCount === chapterSessions.length
          ? "done"
          : chapterSessions.every((row) => row.state === "locked") ? "locked" : "open";
        const firstOrdinal = chapterSessions[0]?.sessionOrdinal ?? (chapter.chapterOrdinal - 1) * 8 + 1;
        const lastOrdinal = chapterSessions[chapterSessions.length - 1]?.sessionOrdinal ?? chapter.chapterOrdinal * 8;
        // зачем: владелец 18.10 — значок главы по её смыслу; замка на плитке нет — закрытая глава тем же значком цветом secondary
        const chapterIcon = learningV2ChapterIonIcon(selectedLessonOrdinal, chapter.chapterOrdinal);
        const sessionsWord = triLang(props.lang, { ru: "Эпизоды", en: "Episodes", uk: "Епізоди", es: "Episodios", "pt-BR": "Episódios", vi: "Tập", id: "Episode", tr: "Bölümler", pl: "Odcinki" });
        return <Lv2Reveal key={chapter.id} index={chapterIndex} play={introReveal} onLayout={logLayout(`chapter:${chapter.chapterOrdinal}`)} style={[styles.chapter, lv2CardStyle(g, 22)]}>
          <PressableHybrid variant="card" testID={`learning-v2-chapter-${chapter.chapterOrdinal}`} accessibilityLabel={`${triLang(props.lang, { ru: "Глава", en: "Chapter", uk: "Розділ", es: "Capítulo", "pt-BR": "Capítulo", vi: "Chương", id: "Bab", tr: "Ünite", pl: "Rozdział" })} ${chapter.chapterOrdinal}`} onPress={() => toggleChapter(chapter.chapterOrdinal)} style={styles.chapterPress} contentStyle={styles.chapterPressContent}>
            <View style={[styles.chapterTile, { backgroundColor: tileTone }]} testID={`learning-v2-chapter-icon-${chapter.chapterOrdinal}`}><Ionicons name={chapterIcon} size={26} color={chapterState === "locked" ? g.secondary : g.text} /></View>
            <View style={styles.chapterCopy}><Text style={[styles.chapterTitle, { color: chapterState === "locked" ? g.secondary : g.text }]}>{triLang(props.lang, { ru: "Глава", en: "Chapter", uk: "Розділ", es: "Capítulo", "pt-BR": "Capítulo", vi: "Chương", id: "Bab", tr: "Ünite", pl: "Rozdział" })} {chapter.chapterOrdinal}</Text><Text style={[styles.chapterSub, { color: g.secondary }]}>{sessionsWord} {firstOrdinal}–{lastOrdinal}</Text></View>
            <Text style={[styles.chapterFrac, { color: g.secondary }]}><Text style={[styles.chapterFracDone, { color: g.text }]}>{completedCount}</Text>/8</Text>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={g.secondary} />
          </PressableHybrid>
          {isExpanded ? <View style={styles.sessions}>{chapterSessions.map((row, sessionIndex) => {
            const hasMaterial = props.isSessionMaterialAvailable?.(row.lessonOrdinal, row.sessionOrdinal) ?? true;
            const isCheckpoint = row.role === "chapter_checkpoint";
            const isExam = row.role === "final_exam";
            // зачем (решение координатора 04.10): узлы — по learning-v2.html, «Занятие N» и «Проверка главы»; раунд 2 менял только шапку.
            const available = hasMaterial && (row.state === "current" || row.state === "completed");
            const paint = lv2NodePaint(g, row.state, available);
            const icon = !hasMaterial ? "construct-outline" : row.state === "completed" ? "checkmark" : isCheckpoint || isExam ? "trophy" : row.state === "locked" ? "lock-closed" : available ? "play" : "lock-closed";
            const stars = row.state === "completed" ? Math.max(1, props.stars[row.id] ?? 1) : 0;
            return <View key={row.id} style={[styles.session, { opacity: hasMaterial ? 1 : 0.62 }]}>
              <Lv2Reveal index={sessionIndex} play={!props.reducedMotion} style={styles.nodeWrap}>
                <LearningV2MapNode
                  testID={`learning-v2-chapter-session-${row.sessionOrdinal}`}
                  state={row.state}
                  width={NODE_SIZE}
                  height={NODE_SIZE}
                  radius={NODE_SIZE / 2}
                  faceColor={paint.face}
                  haloColor={row.state === "current" && available ? g.text : undefined}
                  accessible={available}
                  active={props.active}
                  reduceMotion={props.reducedMotion || !nativeReady}
                  accessibilityLabel={`${row.sessionOrdinal}`}
                  onPress={hasMaterial ? () => onSessionPress(row.lessonOrdinal, row.sessionOrdinal, row.state) : undefined}
                  disabled={!hasMaterial}
                  onCompletedTransition={handleNodeCompleted}
                >
                  <View style={styles.nodeInner}>
                    <Ionicons name={icon} size={24} color={paint.ink} />
                    <Text style={[styles.nodeNumber, { color: paint.ink }]}>{row.sessionOrdinal}</Text>
                  </View>
                </LearningV2MapNode>
                {stars > 0 ? <View pointerEvents="none" style={[styles.nodeStars, { backgroundColor: g.opaqueControl, boxShadow: nestedBoxShadow(g) }]}>{[0, 1, 2].map((starIndex) => <Ionicons key={starIndex} name="star" size={11} color={starIndex < stars ? g.text : lv2Alpha(g.text, 0.2)} />)}</View> : null}
              </Lv2Reveal>
              <Text style={[styles.sessionLabel, { color: row.state === "current" ? g.text : g.secondary, fontWeight: row.state === "current" ? "800" : "700" }]}>{isCheckpoint ? triLang(props.lang, { ru: "Проверка главы", en: "Chapter check", uk: "Перевірка розділу", es: "Repaso del capítulo", "pt-BR": "Revisão do capítulo", vi: "Kiểm tra chương", id: "Uji bab", tr: "Bölüm testi", pl: "Sprawdzian rozdziału" }) : triLang(props.lang, { ru: `Эпизод ${row.sessionOrdinal}`, en: `Episode ${row.sessionOrdinal}`, uk: `Епізод ${row.sessionOrdinal}`, es: `Episodio ${row.sessionOrdinal}`, "pt-BR": `Episódio ${row.sessionOrdinal}`, vi: `Tập ${row.sessionOrdinal}`, id: `Episode ${row.sessionOrdinal}`, tr: `Bölüm ${row.sessionOrdinal}`, pl: `Odcinek ${row.sessionOrdinal}` })}</Text>
            </View>;
          })}</View> : <View style={[styles.chapterTrack, { backgroundColor: g.opaqueControl }]}><View style={[styles.chapterTrackFill, { backgroundColor: g.accentGraphic /* зачем ([BLEND] 18.10): сырой accent в 10 светлых градиентных темах — 1,11:1 к дорожке; accentGraphic ≥ 5 (в тёмных равен accent) */, width: `${Math.round(completedCount / 8 * 100)}%` }]} /></View>}
        </Lv2Reveal>;
      })}
      <PressableHybrid variant="card" testID="learning-v2-all-lessons" accessibilityLabel={triLang(props.lang, { ru: "Все уроки", en: "All lessons", uk: "Усі уроки", es: "Todas las lecciones", "pt-BR": "Todas as lições", vi: "Tất cả bài học", id: "Semua pelajaran", tr: "Tüm dersler", pl: "Wszystkie lekcje" })} onPress={() => setAllLessonsOpen(true)} style={[styles.allLessons, { backgroundColor: g.buttonFill }]} contentStyle={styles.allLessonsContent}><Ionicons name="list-outline" size={20} color={g.text} /><Text style={[styles.allLessonsText, { color: g.text }]}>{triLang(props.lang, { ru: "Все уроки", en: "All lessons", uk: "Усі уроки", es: "Todas las lecciones", "pt-BR": "Todas as lições", vi: "Tất cả bài học", id: "Semua pelajaran", tr: "Tüm dersler", pl: "Wszystkie lekcje" })}</Text></PressableHybrid>
    </ScrollView>
    {coinFlight ? (
      <CoinRewardFlight
        key={coinFlight.key}
        from={coinFlight.from}
        to={coinFlight.to}
        count={NODE_FLIGHT_COINS}
        onDone={clearCoinFlight}
      />
    ) : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, header: { minHeight: 44, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 } /* зачем (round-2 C-A): строка «назад + HUD» 44, поля страницы 12 */, headerSpacer: { flex: 1 }, lessonTitleBlock: { paddingHorizontal: 12, marginTop: 8, paddingBottom: 14, gap: 2 }, lessonTitleWide: { fontSize: 22, lineHeight: 27, fontWeight: "700", letterSpacing: -0.2 }, titleBlock: { flex: 1, minWidth: 0, flexShrink: 1 }, headerTitle: { flexShrink: 1, fontSize: 20, lineHeight: 25, fontWeight: "700" }, allLessonsHeader: { minHeight: 48, marginTop: 6, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 14 }, allLessonsTitle: { flex: 1, minWidth: 0, fontSize: 34, lineHeight: 40, fontWeight: "700", letterSpacing: -0.5 }, lessonKicker: { fontSize: 13, lineHeight: 17, fontWeight: "700", flexShrink: 0 }, lessonTopic: { fontSize: 13, lineHeight: 17, fontWeight: "500", marginTop: 2 }, iconButton: { width: 48, height: 48, borderRadius: 24 }, iconButtonContent: { flex: 1, alignItems: "center", justifyContent: "center" }, list: { paddingHorizontal: 12, gap: 12 },
  chapter: { overflow: "hidden", paddingBottom: 6 },
  chapterPress: { borderRadius: 22 },
  chapterPressContent: { minHeight: 84, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 14 },
  // плитка как у мира Диалогов (DialogueV2CatalogueSection): 55, радиус 14; у заголовка урока — 46, радиус 12
  chapterTile: { width: 55, height: 55, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  lessonTile: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  lessonTitleRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  lessonTitleFlex: { flex: 1, minWidth: 0 },
  chapterCopy: { flex: 1, minWidth: 0, gap: 4 },
  chapterTitle: { fontSize: 19, lineHeight: 24, fontWeight: "700" },
  chapterSub: { fontSize: 16, lineHeight: 21 },
  // зачем (Сверка 18.10, шрифт 1,3: «0/8» → «0/»): счётчик главы не сжимается и имеет минимальную ширину под «0/8» при крупном шрифте
  chapterFrac: { fontSize: 13, lineHeight: 28, fontVariant: ["tabular-nums"], flexShrink: 0, minWidth: 56, textAlign: "right" }, chapterFracDone: { fontSize: 24, lineHeight: 28, fontWeight: "800" },
  chapterTrack: { height: 7, borderRadius: 4, marginTop: 2, marginBottom: 14, marginHorizontal: 20, overflow: "hidden" },
  chapterTrackFill: { height: "100%", borderRadius: 4 },
  sessions: { paddingHorizontal: 6, paddingBottom: 10, paddingTop: 6, flexDirection: "row", flexWrap: "wrap", rowGap: 18 },
  session: { width: "25%", minHeight: 96, paddingHorizontal: 2, alignItems: "center", justifyContent: "flex-start", gap: 8 },
  nodeWrap: { width: 64, height: 70, alignItems: "center" },
  nodeInner: { alignItems: "center", justifyContent: "center", gap: 1 },
  nodeNumber: { fontSize: 13, lineHeight: 16, fontWeight: "700" },
  nodeStars: { position: "absolute", bottom: -10, minHeight: 20, paddingHorizontal: 6, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 1 },
  sessionLabel: { width: 82, fontSize: 13, lineHeight: 17, textAlign: "center", marginTop: 10 },
  allLessons: { borderRadius: 28, marginTop: 6 }, allLessonsContent: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, allLessonsText: { fontSize: 16, fontWeight: "700" }, lessonCard: { marginBottom: 2 }, fallbackLesson: { borderRadius: 14 }, fallbackLessonContent: { minHeight: 76, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 }, lessonCopy: { flex: 1 }, lessonMeta: { fontSize: 13, fontWeight: "600", marginBottom: 2 }, lessonTitle: { fontSize: 16, fontWeight: "700" }, legacyButton: { borderRadius: 28, marginTop: 6 }, legacyButtonContent: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  // зачем (Сверка 18.10, светлая тема, шрифт 1,3: «Урок 1» → «Ур», плашка → «Классический»): подпись урока не сжимается (flexShrink 0), строка переносится, плашка может занять свою строку и сама переносит текст — без ужатия кегля
  kickerRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: 10, rowGap: 6, minHeight: 36 },
  classicChip: { flexShrink: 1, minWidth: 0, maxWidth: "100%", marginLeft: "auto", borderRadius: 18, alignSelf: "center" },
  classicChipContent: { width: "auto", minHeight: 36, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 6 },
  classicChipText: { flexShrink: 1, fontSize: 13, lineHeight: 17, fontWeight: "700" },
});
