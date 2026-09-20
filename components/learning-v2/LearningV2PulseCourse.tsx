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
import { learningV2ChapterSceneV1, learningV2LessonArcV1, learningV2SessionTitleV1 } from '../../modules/learning-v2/content/session_titles_v1.generated';
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
type LessonRow = Extract<LearningV2CourseAccordionRowV1, { kind: 'lesson' }>;
/** Строка сплошной карты: занятие или плашка урока между уроками. */
type ChapterRow = Extract<LearningV2CourseAccordionRowV1, { kind: 'chapter' }>;
type MapRow = SessionRow | LessonRow | ChapterRow;
/**
 * Подпись под кружком карты. Имя занятия берём только там, где оно реально
 * написано (уроки 1–3 плана курса, 168 занятий) и только для русского
 * интерфейса: переводов названий пока нет, а показывать русский текст в
 * английском UI нельзя. Для остального — номер занятия, без выдумок.
 */
function pulseSessionTitle(
  lang: Lang,
  lessonOrdinal: number,
  sessionOrdinal: number,
  role: SessionRow['role'],
  c: ReturnType<typeof horizonsCopy>,
): string {
  if (role === 'final_exam' || role === 'chapter_checkpoint') {
    return triLang(lang, {
      ru: 'Проверка главы', uk: 'Перевірка розділу', en: 'Chapter checkpoint',
      es: 'Repaso del capítulo', 'pt-BR': 'Revisão do capítulo', vi: 'Kiểm tra chương',
      id: 'Cek bab', tr: 'Bölüm kontrolü', pl: 'Sprawdzian rozdziału',
    });
  }
  const authored = lang === 'ru' ? learningV2SessionTitleV1(lessonOrdinal, sessionOrdinal) : null;
  return authored ?? `${c.session} ${sessionOrdinal}`;
}

/**
 * Плашка главы на карте. Владелец 20.09: «плашки должны быть ПЛАШКАМИ на
 * карте, а не просто текстом», «текст отцентрирован и красиво подан, очень
 * красиво и премиально».
 *
 * Подача: карточка с собственной подложкой, номер главы тонкой разрядкой над
 * названием, всё по центру. Разделяем тоном и скруглением, без обводки
 * контейнера (закон владельца).
 */
function LearningV2PulseCourseChapterHead({
  row,
  height,
  lang,
}: Readonly<{ row: ChapterRow; height: number; lang: Lang }>) {
  const { theme: t } = useTheme();
  // Сцены глав написаны по-русски; в другом интерфейсе показываем диапазон
  // занятий, а не русский текст.
  const scene = lang === 'ru' ? learningV2ChapterSceneV1(row.lessonOrdinal, row.chapterOrdinal) : null;
  const first = (row.chapterOrdinal - 1) * 8 + 1;
  const last = row.chapterOrdinal * 8;
  return (
    <View
      testID={`learning-v2-pulse-chapter-${row.lessonOrdinal}-${row.chapterOrdinal}`}
      style={[styles.chapterRow, { height }]}
    >
      <View style={[styles.chapterCard, { backgroundColor: t.bgCard }]}>
        <Text style={[styles.chapterNum, { color: t.accent }]}>
          {triLang(lang, {
            ru: 'ГЛАВА', uk: 'РОЗДІЛ', en: 'CHAPTER', es: 'CAPÍTULO', 'pt-BR': 'CAPÍTULO',
            vi: 'CHƯƠNG', id: 'BAB', tr: 'BÖLÜM', pl: 'ROZDZIAŁ',
          })} {row.chapterOrdinal}
        </Text>
        <Text style={[styles.chapterTitle, { color: t.textPrimary }]}>
          {scene ?? `${triLang(lang, {
            ru: 'Занятия', uk: 'Заняття', en: 'Sessions', es: 'Sesiones', 'pt-BR': 'Sessões',
            vi: 'Buổi', id: 'Sesi', tr: 'Oturumlar', pl: 'Zajęcia',
          })} ${first}–${last}`}
        </Text>
      </View>
    </View>
  );
}

/**
 * Плашка урока на карте — разворот между уроками. Владелец 20.09: «плашки с
 * главами, плашки с уроками», «всё по центру, красиво и премиально».
 *
 * Подача: карточка с подложкой, сверху номер урока разрядкой, под ним крупное
 * название темы, затем арка урока и счёт пройденного. Всё по центру.
 */
function LearningV2PulseCourseLessonPlate({
  row,
  title,
  height,
  lang,
  completedSessionIds,
}: Readonly<{
  row: LessonRow;
  title: string;
  height: number;
  lang: Lang;
  completedSessionIds: ReadonlySet<string>;
}>) {
  const { theme: t } = useTheme();
  // Арка урока — одна строка о том, про что этот урок. Только по-русски:
  // переводов арок пока нет, русский текст в чужом интерфейсе недопустим.
  const arc = lang === 'ru' ? learningV2LessonArcV1(row.lessonOrdinal) : null;
  let done = 0;
  for (let ordinal = 1; ordinal <= 56; ordinal += 1) {
    if (completedSessionIds.has(learningV2CourseSessionIdV1(row.lessonOrdinal, ordinal))) done += 1;
  }
  return (
    <View
      testID={`learning-v2-pulse-lesson-plate-${row.lessonOrdinal}`}
      style={[styles.plateRow, { height }]}
    >
      <View style={[styles.plateCard, { backgroundColor: t.bgCard }]}>
        <Text style={[styles.plateKicker, { color: t.accent }]}>
          {triLang(lang, {
            ru: 'УРОК', uk: 'УРОК', en: 'LESSON', es: 'LECCIÓN', 'pt-BR': 'LIÇÃO',
            vi: 'BÀI', id: 'PELAJARAN', tr: 'DERS', pl: 'LEKCJA',
          })} {row.lessonOrdinal}
        </Text>
        <Text style={[styles.plateTitle, { color: t.textPrimary }]}>{title}</Text>
        {arc ? <Text style={[styles.plateArc, { color: t.textSecond }]}>{arc}</Text> : null}
        <View style={[styles.plateCount, { backgroundColor: t.bgSurface2 }]}>
          <Text style={[styles.plateCountText, { color: t.textSecond }]}>{done} / 56</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Сколько строк вокруг текущей получают вступительную анимацию.
 * Остальные рисуются сразу и статично: на карте из 1824 строк анимировать
 * всё — значит гарантированно лагать. Сторожится тестом.
 */
const ENTRY_ANIMATED_ROWS = 8;

/** Плашка урока — разворот между уроками, как в утверждённом макете. */
const LESSON_PLATE_HEIGHT = 300;
/** Плашка главы: номер главы и сцена. */
const CHAPTER_HEAD_HEIGHT = 118;

const LearningV2AnimatedRoutePath = Animated.createAnimatedComponent(Path);

function LearningV2PulseRouteSegment({
  d,
  progress,
  stroke,
  animated,
}: Readonly<{ d: string; progress: SharedValue<number>; stroke: string; animated: boolean }>) {
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: 900 * (1 - progress.value),
  }));
  // зачем: анимированный SVG-путь на КАЖДОЙ строке — постоянная работа на
  // UI-треде. При 56 строках незаметно, при 1824 карта «тормозит невероятно»
  // (владелец 20.09). Анимируем только отрезки рядом с текущим занятием,
  // остальные рисуем обычным Path без подписки на shared value.
  if (!animated) {
    return (
      <Path d={d} fill="none" stroke={stroke} strokeWidth={7} strokeLinecap="round" />
    );
  }
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
  // зачем: карта стала сплошной (1824 строки). Анимированная обёртка на
  // КАЖДОЙ строке — это вспышка при входе (все строки стартуют с opacity 0)
  // и пересчёт стилей в каждом кадре прокрутки. Владелец 20.09: «карта
  // тормозит невероятно, экран при входе моргает».
  // Вступление оставляем ТОЛЬКО ближайшим к текущему занятию строкам; всё
  // остальное — обычный View без анимации и без стоимости на UI-треде.
  const entryStyle = useAnimatedStyle(() => {
    const delay = Math.min(distanceFromCurrent, 5) * 0.09;
    const localProgress = Math.max(0, Math.min(1, (progress.value - delay) / (1 - delay)));
    return {
      opacity: localProgress,
      transform: [
        { translateY: (1 - localProgress) * 18 },
        { scale: 0.76 + localProgress * 0.24 },
      ],
    };
  }, [distanceFromCurrent]);

  if (reducedMotion || distanceFromCurrent > ENTRY_ANIMATED_ROWS) {
    return <View>{children}</View>;
  }
  return <Animated.View style={entryStyle}>{children}</Animated.View>;
}

export default function LearningV2PulseCourse(props: Props) {
  const { theme: t } = useTheme();
  const c = horizonsCopy(props.lang);
  const currentStatusLabel = triLang(props.lang, {
    ru: 'Текущая', uk: 'Поточна', en: 'Current', es: 'Actual',
    'pt-BR': 'Atual', vi: 'Hiện tại', id: 'Saat ini', tr: 'Geçerli', pl: 'Bieżąca',
  });
  // зачем: раньше `lesson !== null` означало «урок раскрыт, показываем карту»,
  // а null — «показываем список уроков». Владелец 20.09 перевернул вход: карта
  // видна сразу, а список уроков открывается кнопкой в футере как навигация.
  // `lesson` остался как «на каком уроке стоит фокус карты» (нужен заголовку
  // и предпрогреву), а показом списка теперь управляет отдельный флаг.
  const [lesson, setLesson] = useState<number | null>(null);
  const [lessonListOpen, setLessonListOpen] = useState(false);
  const [viewport, setViewport] = useState({ width: 390, height: 0 });
  const mapRef = useRef<FlatList<MapRow>>(null);
  const visibleSessionRowsRef = useRef<readonly SessionRow[]>([]);
  const visibleSessionsSettledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeLessonRef = useRef<number | null>(null);
  const visibleSessionsSettledRef = useRef(props.onVisibleSessionsSettled);
  activeLessonRef.current = lesson;
  visibleSessionsSettledRef.current = props.onVisibleSessionsSettled;
  // зачем: шапка сплошной карты обязана называть урок, который человек видит
  // сейчас. Берём его из тех же видимых строк, что уже считает список, —
  // отдельного слушателя скролла заводить не нужно (лишняя работа в кадре).
  const [visibleLessonOrdinal, setVisibleLessonOrdinal] = useState<number | null>(null);
  const visibleLessonOrdinalRef = useRef<number | null>(null);
  const [currentOffscreen, setCurrentOffscreen] = useState(false);
  const currentOffscreenRef = useRef(false);
  const onViewableItemsChangedRef = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<MapRow>[] }) => {
      visibleSessionRowsRef.current = viewableItems
        .filter((item) => item.isViewable && item.item?.kind === 'session')
        .map((item) => item.item as SessionRow);
      // Виден ли текущий узел — от этого зависит кнопка «к текущему».
      // Пишем в состояние только на смене значения, не каждый кадр.
      const hasCurrent = viewableItems.some(
        (item) => item.isViewable && item.item?.kind === 'session' && item.item.state === 'current',
      );
      const offscreen = !hasCurrent;
      if (offscreen !== currentOffscreenRef.current) {
        currentOffscreenRef.current = offscreen;
        setCurrentOffscreen(offscreen);
      }
      const first = viewableItems.find((item) => item.isViewable && item.item);
      const ordinal = first?.item?.lessonOrdinal ?? null;
      // Пишем в состояние только на смене урока: иначе setState полетел бы
      // на каждый кадр прокрутки и карта начала бы подтормаживать.
      if (ordinal !== null && ordinal !== visibleLessonOrdinalRef.current) {
        visibleLessonOrdinalRef.current = ordinal;
        setVisibleLessonOrdinal(ordinal);
      }
    },
  );
  const centered = useRef('');
  const entryPlayed = useRef(false);
  const mapEntry = useSharedValue(1);
  const current = /^lesson-(\d+):session:(\d+)$/.exec(props.currentSessionId ?? '');
  const currentLesson = Number(current?.[1] ?? 1);
  const currentSection = pulseCourseSectionForLesson(currentLesson);
  const [selectedLevel, setSelectedLevel] = useState(currentSection.label);
  const selectedSection = PULSE_COURSE_SECTIONS.find(section => section.label === selectedLevel) ?? currentSection;
  // зачем: владелец 20.09 отменил двухуровневый вход «список уроков → карта
  // одного урока». Карта одна и сплошная: 56 занятий урока, плашка следующего
  // урока, снова 1..56 — и так до конца курса. Список уроков переехал в
  // шторку по кнопке и работает как прыжок, а не как раскрытие.
  // Модель теперь всегда отдаёт занятия всех 32 уроков, поэтому фильтр
  // оставляем, но expandedLessonOrdinal больше не управляет содержимым.
  const rows = useMemo(() => buildLearningV2CourseAccordionMapFromPreparedProgressV1({
    projectionScopeKey: props.scopeKey, expandedLessonOrdinal: lesson, preparedProgress: props.preparedProgress,
  }).rows,
  [lesson, props.preparedProgress, props.scopeKey]);
  const currentRowIndex = Math.max(0, rows.findIndex(row => row.kind === 'session' && row.state === 'current'));
  const currentRow = rows[currentRowIndex];
  const target = currentRow?.kind === 'session' ? currentRow.sessionOrdinal : 1;
  const geometry = pulseMapGeometry(viewport.height, target);
  // зачем: строки карты РАЗНОЙ высоты — плашка урока это разворот на
  // пол-экрана, заголовок главы ниже, занятие ещё ниже. Раньше getItemLayout
  // считал все строки одинаковыми (geometry.step), поэтому плашку пришлось
  // ужать до высоты занятия и она «была не такая». Считаем смещения
  // префиксными суммами один раз на изменение списка — прокрутка остаётся
  // точной, а строки получают свою настоящую высоту.
  const layout = useMemo(() => {
    const heights = new Array<number>(rows.length);
    const offsets = new Array<number>(rows.length);
    let acc = 0;
    for (let i = 0; i < rows.length; i += 1) {
      const kind = rows[i].kind;
      const h = kind === 'lesson' ? LESSON_PLATE_HEIGHT : kind === 'chapter' ? CHAPTER_HEAD_HEIGHT : geometry.step;
      heights[i] = h;
      offsets[i] = acc;
      acc += h;
    }
    // Трассировка карты: владелец воспроизводит — мы видим факты, а не гадаем.
    if (__DEV__) {
      console.log('[V2-MAP] layout', JSON.stringify({
        rows: rows.length,
        lessons: rows.filter(r => r.kind === 'lesson').length,
        chapters: rows.filter(r => r.kind === 'chapter').length,
        sessions: rows.filter(r => r.kind === 'session').length,
        totalHeight: acc,
        step: geometry.step,
        animatedRows: ENTRY_ANIMATED_ROWS,
      }));
    }
    return { heights, offsets, total: acc };
  }, [geometry.step, rows]);
  const courses = useMemo(() => props.titles
    .map((title, i) => ({ title, ordinal: i + 1 }))
    .filter(item => item.ordinal >= selectedSection.first && item.ordinal <= selectedSection.last),
  [props.titles, selectedSection.first, selectedSection.last]);
  const completed = useMemo(() => new Set(props.completedSessionIds), [props.completedSessionIds]);
  const { onExpandedLesson } = props;
  // Закрывает шторку со списком уроков и возвращает человека на карту.
  const back = useCallback(() => { setLessonListOpen(false); }, []);
  useEffect(() => { setSelectedLevel(currentSection.label); }, [currentSection.label, props.scopeKey]);
  useEffect(() => {
    if (!props.active || !lessonListOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => sub.remove();
  }, [back, lessonListOpen, props.active]);
  // зачем: прыжок к уроку из списка. Все строки карты одной высоты
  // (getItemLayout выше), поэтому позицию берём по индексу строки — это
  // надёжнее scrollToIndex на длинном списке и не роняет экран промахом.
  const jumpToLesson = useCallback((lessonOrdinal: number) => {
    const index = rows.findIndex(
      (row) => row.kind === 'lesson' && row.lessonOrdinal === lessonOrdinal,
    );
    if (index < 0) {
      // Ранний выход обязан называть причину (правило «сперва логи»).
      if (__DEV__) {
        console.log('[V2-MAP] jumpToLesson:skip', JSON.stringify({ lessonOrdinal, rows: rows.length }));
      }
      return;
    }
    mapRef.current?.scrollToOffset({
      offset: geometry.padding + (layout.offsets[index] ?? 0),
      animated: false,
    });
  }, [geometry.padding, layout.offsets, rows]);
  // зачем: раньше позиция считалась как (sessionOrdinal - 1) * step —
  // смещение ВНУТРИ одного урока. На сплошной карте это всегда приводило бы
  // к уроку 1: у человека на уроке 5 текущее занятие лежит на сотни строк
  // ниже. Берём готовое смещение строки из карты высот.
  const scrollToCurrent = useCallback((animated: boolean) => {
    if (!viewport.height) {
      if (__DEV__) console.log('[V2-MAP] scrollToCurrent:skip', JSON.stringify({ reason: 'no_viewport_height' }));
      return;
    }
    if (__DEV__) {
      console.log('[V2-MAP] scrollToCurrent', JSON.stringify({
        currentRowIndex,
        offset: Math.round(layout.offsets[currentRowIndex] ?? 0),
        animated,
      }));
    }
    // зачем: владелец 20.09 — «когда урок 1 сессия 1, она НЕ должна быть
    // посередине, она должна быть ВВЕРХУ». Раньше я жёстко центрировал любое
    // текущее занятие (0.4 высоты экрана) и этим обходил правило из
    // pulseMapGeometry. В самом начале курса над первым кружком ничего нет —
    // центрировать его значит показать пустой экран с одним кружком в середине.
    // Начало курса определяем по СМЫСЛУ, а не по индексу строки: первые
    // строки — плашка урока и глава, поэтому занятие 1 лежит на индексе 2
    // (лог с телефона: currentRowIndex=2, offset=476 — карта всё равно
    // уезжала вниз). Считаем началом любое занятие урока 1 главы 1.
    const currentSession = rows[currentRowIndex];
    const atCourseStart =
      currentSession?.kind === 'session' &&
      currentSession.lessonOrdinal === 1 &&
      currentSession.chapterOrdinal === 1;
    const lead = atCourseStart ? 0 : viewport.height * 0.4;
    mapRef.current?.scrollToOffset({
      offset: Math.max(0, (layout.offsets[currentRowIndex] ?? 0) - lead),
      animated,
    });
  }, [currentRowIndex, layout.offsets, rows, viewport.height]);
  // Первичное наведение: один раз на изменение позиции, без анимации.
  const centerCurrent = useCallback(() => {
    if (!viewport.height) return;
    const key = `${currentRowIndex}:${viewport.height}`;
    if (centered.current === key) return;
    scrollToCurrent(false);
    centered.current = key;
  }, [currentRowIndex, scrollToCurrent, viewport.height]);
  const reportVisibleSessionsSettled = useCallback(() => {
    // зачем: раньше урок брался из «раскрытого» (activeLessonRef). На сплошной
    // карте раскрытого урока нет, и предзагрузка аудио молча умерла бы —
    // ровно класс бага «механизм есть, а данных не дали». Берём урок из
    // фактически видимых строк.
    const activeLesson =
      visibleSessionRowsRef.current[0]?.lessonOrdinal ??
      visibleLessonOrdinalRef.current ??
      activeLessonRef.current;
    if (activeLesson === null || activeLesson === undefined) {
      if (__DEV__) {
        console.log('[V2-MAP] visibleSettled:skip', JSON.stringify({ reason: 'no_visible_lesson' }));
      }
      return;
    }
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
    // зачем: владелец 20.09 — «экран при входе моргает». Причина: mapEntry
    // сбрасывался в 0 при КАЖДОМ закрытии списка уроков, и вся карта заново
    // проявлялась из прозрачности — после каждого прыжка по уроку. Вступление
    // обязано сыграть один раз за жизнь экрана и больше не трогать карту.
    if (entryPlayed.current) return;
    entryPlayed.current = true;
    cancelAnimation(mapEntry);
    if (props.reducedMotion) {
      mapEntry.value = 1;
      return;
    }
    mapEntry.value = 0;
    const id = requestAnimationFrame(() => {
      mapEntry.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    });
    return () => cancelAnimationFrame(id);
  }, [mapEntry, props.reducedMotion]);
  const mapEntryStyle = useAnimatedStyle(() => ({
    opacity: mapEntry.value,
    transform: [
      { translateY: (1 - mapEntry.value) * 24 },
      { scale: 0.985 + mapEntry.value * 0.015 },
    ],
  }));
  return <View testID="learning-v2-pulse-course" style={[styles.root, { backgroundColor: t.bgPrimary, paddingTop: props.topPadding ?? 0 }]}>
    <View style={[styles.header, lessonListOpen ? null : styles.mapHeader]}>
      <View style={styles.headerRow}>
        {lessonListOpen ? <PressableHybrid variant="icon" accessibilityLabel={c.back} onPress={back} style={[styles.iconButton, { backgroundColor: t.bgCard }]} contentStyle={styles.iconButtonContent}><Ionicons name="chevron-back" size={24} color={t.textPrimary} /></PressableHybrid> : props.navigationControl}
        {lessonListOpen ? <Text style={[styles.headerTitle, { color: t.textPrimary }]}>{c.all}</Text> : <View style={styles.headerSpacer} />}
        {props.headerAccessory}
      </View>
      {/* На сплошной карте шапка называет урок, который человек сейчас
          видит: он меняется при прокрутке, а не при выборе в списке. */}
      {!lessonListOpen && visibleLessonOrdinal !== null ? (
        <Text style={[styles.mapHeaderTitle, { color: t.textPrimary }]}>
          {props.titles[visibleLessonOrdinal - 1]}
        </Text>
      ) : null}
    </View>
    {lessonListOpen ? <>
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
          // зачем: тап по уроку больше не «раскрывает» его, а ПРЫГАЕТ к нему
          // на сплошной карте и закрывает список. Карта из виду не уходит.
          centered.current = '';
          setLesson(item.ordinal);
          props.onExpandedLesson(item.ordinal);
          setLessonListOpen(false);
          jumpToLesson(item.ordinal);
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
      <FlatList ref={mapRef} testID="learning-v2-pulse-map" data={rows} keyExtractor={row => row.id} contentContainerStyle={{ paddingVertical: geometry.padding }} getItemLayout={(_, index) => ({ length: layout.heights[index] ?? geometry.step, offset: geometry.padding + (layout.offsets[index] ?? 0), index })} onContentSizeChange={centerCurrent} onViewableItemsChanged={onViewableItemsChangedRef.current} onMomentumScrollBegin={cancelVisibleSessionsSettledAfterDrag} onMomentumScrollEnd={handleMomentumScrollEnd} onScrollEndDrag={scheduleVisibleSessionsSettledAfterDrag} initialNumToRender={8} maxToRenderPerBatch={6} updateCellsBatchingPeriod={32} windowSize={5} removeClippedSubviews showsVerticalScrollIndicator={false} renderItem={({ item: row, index }) => {
        // Плашка урока на пол-экрана: она разделяет уроки на сплошной карте.
        if (row.kind === 'lesson') {
          return <LearningV2PulseCourseLessonPlate
            row={row}
            title={props.titles[row.lessonOrdinal - 1] ?? ''}
            height={LESSON_PLATE_HEIGHT}
            lang={props.lang}
            completedSessionIds={completed}
          />;
        }
        // зачем: владелец 20.09 — «разделения на главы ты не добавил».
        // Модель отдаёт строки глав, но прошлый фильтр их выбрасывал, и
        // 56 занятий шли сплошняком без деления на 7 глав.
        if (row.kind === 'chapter') {
          return <LearningV2PulseCourseChapterHead
            row={row}
            height={CHAPTER_HEAD_HEIGHT}
            lang={props.lang}
          />;
        }
        const nodeOffsetX = pulseMapOffsetX(index, viewport.width);
        const x = viewport.width / 2 + nodeOffsetX;
        const nextX = viewport.width / 2 + pulseMapOffsetX(index + 1, viewport.width);
        const ready = row.state === 'current' || row.state === 'completed';
        // На сплошной карте урок берём ИЗ СТРОКИ: переменная `lesson` теперь
        // означает только «какой урок открыт в шторке», а не что на экране.
        const rowLesson = row.lessonOrdinal;
        const hasMaterial = props.isSessionMaterialAvailable?.(rowLesson, row.sessionOrdinal) ?? true;
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
          <View style={{ height: geometry.step, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 6 }}>
          {index < rows.length - 1 ? <Svg pointerEvents="none" width={viewport.width} height={geometry.step * 2} style={{ position: 'absolute', top: geometry.step / 2, left: 0 }}><LearningV2PulseRouteSegment d={`M ${x} 0 C ${x} 64 ${nextX} 64 ${nextX} ${geometry.step}`} progress={mapEntry} stroke={t.bgSurface2} animated={Math.abs(index - currentRowIndex) <= ENTRY_ANIMATED_ROWS} /></Svg> : null}
          {/* зачем: владелец 20.09 — «тексты обрезаются экраном, делай их ПОД
              кнопками». Сбоку подпись не помещалась: змейка уводит кружок на
              ±71px от центра, и текст шириной 150 упирался в край экрана.
              Под кружком ширина не ограничена ничем, кроме самого экрана,
              поэтому название читается целиком при любом смещении.
              Подпись лежит в СТРОКЕ (ширина экрана), а не в nodeCluster —
              тот шириной ровно с кружок и обрезает всё за своими границами. */}
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.nodeLabel, { top: 6 + geometry.nodeSize + 6 }]}>
            <Text style={{ color: row.state === 'current' ? t.accent : row.state === 'completed' ? t.textPrimary : t.textMuted, fontSize: row.state === 'current' ? 13 : 12, lineHeight: row.state === 'current' ? 16 : 15, fontWeight: row.state === 'current' ? '800' : '700', textAlign: 'center' }}>
              {pulseSessionTitle(props.lang, rowLesson, row.sessionOrdinal, row.role, c)}
            </Text>
          </View>
          <View style={[styles.nodeCluster, { transform: [{ translateX: nodeOffsetX }] }]}>
              <LearningV2MapNode testID={`learning-v2-pulse-session-${row.sessionOrdinal}`} state={row.state} width={geometry.nodeSize} height={geometry.nodeSize} radius={geometry.nodeSize / 2} faceColor={nodeColor} haloColor={t.accent} accessible active={props.active} reduceMotion={props.reducedMotion} accessibilityLabel={`${c.chapter} ${row.chapterOrdinal}, ${c.session} ${row.sessionOrdinal}, ${statusLabel}${completedStarsLabel ? `, ${completedStarsLabel}` : ''}`} onPress={() => props.onSessionPress(rowLesson, row.sessionOrdinal, row.state)} onCompletedTransition={props.onSessionCompleted}>
                <View pointerEvents="none" style={styles.nodeFace}><Ionicons testID={`learning-v2-pulse-session-icon-${row.sessionOrdinal}`} name={!hasMaterial ? 'construct-outline' : row.state === 'completed' ? 'checkmark' : available && (row.role === 'final_exam' || row.role === 'chapter_checkpoint') ? 'trophy' : available ? 'play' : 'lock-closed'} size={31} color={ink} /><Text style={{ color: ink, fontSize: 13, fontWeight: '700' }}>{row.sessionOrdinal}</Text></View>
              </LearningV2MapNode>
              {completedStars > 0 ? <View testID={`learning-v2-pulse-session-${row.sessionOrdinal}-stars`} pointerEvents="none" accessible={false} style={[styles.sessionStars, { backgroundColor: t.bgCard, borderColor: t.gold }]}>{Array.from({ length: completedStars }, (_, starIndex) => <Ionicons key={starIndex} name="star" size={14} color={t.gold} />)}</View> : null}
          </View>
          </View>
        </LearningV2PulseMapEntryRow>;
      }} />
      {/* зачем: владелец 20.09 — «когда мы на карте, в футере есть кнопочка
          специальная, которая открывает список всех уроков». Карта под ней
          продолжает скроллиться: кнопка плавает, а не занимает место. */}
      <View pointerEvents="box-none" style={[styles.mapFooter, { paddingBottom: Math.max(18, props.bottomPadding) }]}>
        <PressableHybrid
          variant="card"
          testID="learning-v2-pulse-open-lesson-list"
          accessibilityLabel={c.all}
          onPress={() => setLessonListOpen(true)}
          style={[styles.mapFooterButton, { backgroundColor: t.bgCard }]}
          contentStyle={styles.mapFooterButtonContent}
        >
          <Ionicons name="list-outline" size={20} color={t.textPrimary} />
          <Text style={[styles.mapFooterText, { color: t.textPrimary }]}>{c.all}</Text>
        </PressableHybrid>
        {/* зачем: кнопка возврата к текущему занятию — была в утверждённом
            макете, в приложение я её не перенёс (владелец 20.09). Показываем
            только когда текущий узел ушёл с экрана: иначе она бесполезна и
            занимает место. */}
        {currentOffscreen ? (
          <PressableHybrid
            variant="card"
            testID="learning-v2-pulse-back-to-current"
            accessibilityLabel={currentStatusLabel}
            onPress={() => scrollToCurrent(true)}
            style={[styles.mapFooterNow, { backgroundColor: t.accent }]}
            contentStyle={styles.mapFooterNowContent}
          >
            <Ionicons name="locate" size={22} color={t.correctText} />
          </PressableHybrid>
        ) : null}
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
  // ---- Плашка главы: карточка на карте, текст по центру ----
  chapterRow: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  chapterCard: {
    width: '100%', borderRadius: 22, paddingVertical: 16, paddingHorizontal: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  chapterNum: { fontSize: 12, fontWeight: '800', letterSpacing: 1.6, marginBottom: 6, textAlign: 'center' },
  chapterTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.4, lineHeight: 25, textAlign: 'center' },

  // ---- Плашка урока: разворот между уроками, текст по центру ----
  plateRow: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  plateCard: {
    width: '100%', borderRadius: 30, paddingVertical: 34, paddingHorizontal: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  plateKicker: { fontSize: 13, fontWeight: '800', letterSpacing: 2.2, marginBottom: 14, textAlign: 'center' },
  plateTitle: { fontSize: 27, fontWeight: '900', letterSpacing: -0.9, lineHeight: 32, textAlign: 'center' },
  plateArc: { fontSize: 15, fontWeight: '600', lineHeight: 21, marginTop: 14, textAlign: 'center' },
  plateCount: { marginTop: 20, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 16 },
  plateCountText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  mapFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 11 },
  mapFooterButton: { borderRadius: 19, height: 56, flex: 1 },
  mapFooterNow: { borderRadius: 19, height: 56, width: 56 },
  mapFooterNowContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapFooterButtonContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  mapFooterText: { fontSize: 16, fontWeight: '800' },
  nodeCluster: { alignItems: 'center', justifyContent: 'center' },
  nodeFace: { alignItems: 'center', justifyContent: 'center', gap: 5 },
  // Подпись занятия сбоку от кружка. Ширина 150 подобрана под самые длинные
  // названия плана: текст переносится и читается целиком, без многоточия.
  // Подпись под кружком: прижата к низу строки, поля 16 от краёв экрана —
  // текст переносится и не обрезается ни при каком смещении змейки.
  // Подпись сразу под кружком: top = отступ строки + кружок + зазор.
  // Прижимать к низу строки нельзя — при двух строках текст наезжал на кружок.
  nodeLabel: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
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
