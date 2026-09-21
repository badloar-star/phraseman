import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { BackHandler, FlatList, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewToken } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { cancelAnimation, Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';
import { LinearGradient } from '../SafeLinearGradient';
import { withAlpha } from '../../app/flashcards/pill_tabbar_chrome';
import { LearningV2MapNode } from '../LearningV2MapNode';
import PressableHybrid from '../PressableHybrid';
import { triLang, type Lang } from '../../constants/i18n';
import { horizonsCopy } from './horizons/copy';
import { buildLearningV2CourseAccordionMapFromPreparedProgressV1, type LearningV2PreparedAccordionProgressV1, type LearningV2AccordionSessionStateV1, type LearningV2CourseAccordionRowV1 } from '../../modules/learning-v2/map/course_accordion_map_model_v1';
import { learningV2CourseSessionIdV1 } from '../../modules/learning-v2/content/course_topology_v1';
import { learningV2LessonArcV1 } from '../../modules/learning-v2/content/session_titles_v1.generated';
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
/** Высота кнопки «Все уроки» в плавающем футере карты (styles.mapFooterButton). */
const MAP_FOOTER_BUTTON_HEIGHT = 56;
/**
 * Воздух между последним видимым кружком и кнопкой «Все уроки».
 *
 * зачем: владелец 21.09 — «чтобы при открытии ничего не обрезалось».
 * 28px убрали наползание на кнопку, но нижний кружок всё равно резался
 * краем видимой области (замер на эмуляторе). Кружок 101px: чтобы он либо
 * влезал целиком, либо честно уходил за край, воздуха нужно не меньше его
 * половины. 56 = половина кружка + запас на цоколь и тень.
 */
const MAP_FOOTER_AIR = 56;
/**
 * Затухание инерции карты.
 *
 * зачем: владелец 21.09 — «нельзя было вот так пальцем очень быстро
 * скроллить, но при том чтобы не ощущалось что есть ограничение, он плавный,
 * мягкий и приятный». Карта сплошная (2048 строк, 32 урока по 56 занятий),
 * и на дефолтной инерции один резкий взмах уносил её на десятки экранов —
 * человек терял место и не понимал, где он.
 *
 * Гасим ТОЛЬКО полёт ПОСЛЕ отпускания пальца. Под пальцем карта по-прежнему
 * идёт один в один за жестом: ограничивать движение под пальцем нельзя —
 * это читается как «экран тормозит», а не как «плавно» (решение владельца
 * 21.09, вариант «палец свободен»).
 *
 * 0.97 вместо дефолтных ~0.998. Первая попытка (0.985) владельца не
 * устроила 21.09: «оно всё равно ускоряется если скроллить быстро и
 * продолжительно и не успевает прорисоваться». Причина: на длинном быстром
 * жесте скорость набирает САМ жест, и мягкого затухания не хватает, чтобы
 * погасить её до того, как строки перестанут успевать рисоваться.
 * При 0.97 инерция сохраняется целиком, но гаснет примерно за один экран —
 * карта не успевает разогнаться до скорости, на которой видна пустота.
 * Строкового 'fast' не берём: на iOS это 0.99, нам нужно одно и то же
 * ощущение на обеих платформах.
 *
 * Рядом ставим bounces + alwaysBounceVertical + overScrollMode="always" —
 * тот же набор, что у списка старых уроков в app/(tabs)/lessons.tsx. Край
 * карты отвечает мягкой пружиной, а не жёстким стопом: без этого затухание
 * читалось бы как «упёрся в стену». На Android пружину включает именно
 * overScrollMode, одного alwaysBounceVertical там мало.
 */
const MAP_DECELERATION_RATE = 0.97;
/**
 * Высота тающей полосы у верхнего и нижнего края карты.
 *
 * зачем: владелец 21.09 — «чтобы оно блурилось, а не был такой жёсткий край»,
 * «чтобы поле карты было больше». Карта теперь идёт ПОД шапкой и под панелью
 * «Все уроки», а на кромках растворяется в фоне: кружок тает, а не режется
 * линейкой.
 *
 * Почему НЕ живой блюр (expo-blur / BlurView). На Android BlurView подписан на
 * pre-draw и пересчитывает снапшот подложки КАЖДЫЙ кадр, пока под ним что-то
 * движется, — а под полосой едут 2048 строк. Это прямо возвращает жалобу
 * владельца 21.09 «при быстром скролле не успевает прорисоваться», ради
 * которой правили decelerationRate, windowSize и первую партию рендера
 * (открытие 7,5 с → 191 мс). Затухание альфы — статический слой, который при
 * прокрутке не перерисовывается вовсе. На полосе в половину кружка блюр и
 * растворение визуально неразличимы, а цена кадра отличается на порядок.
 * Тот же приём уже принят в проекте: components/TopFadeMask.tsx.
 *
 * 56 = половина кружка (101/2 ≈ 50) + запас на гало (оно раздувается до
 * scale 1.14). Меньше 48 — кружок «щёлкает» из резкости в ничто, видна
 * кромка. Больше 72 — полоса перестаёт быть тонкой (владелец выбрал
 * «тонкая полоса») и начинает съедать содержимое.
 */
const MAP_EDGE_FADE_HEIGHT = 56;
type SessionRow = Extract<LearningV2CourseAccordionRowV1, { kind: 'session' }>;
type LessonRow = Extract<LearningV2CourseAccordionRowV1, { kind: 'lesson' }>;
/** Строка сплошной карты: занятие или плашка урока между уроками. */
type ChapterRow = Extract<LearningV2CourseAccordionRowV1, { kind: 'chapter' }>;
type MapRow = SessionRow | LessonRow | ChapterRow;
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
  return (
    <View
      testID={`learning-v2-pulse-chapter-${row.lessonOrdinal}-${row.chapterOrdinal}`}
      style={[styles.chapterRow, { height }]}
    >
      <View style={[styles.chapterCard, { backgroundColor: t.bgCard }]}>
        {/* зачем: владелец 20.09 — «вместо названий глав просто лучше
            пронумеруй их». Сцену главы больше не показываем. */}
        <Text style={[styles.chapterTitle, { color: t.textPrimary }]}>
          {triLang(lang, {
            ru: 'Глава', uk: 'Розділ', en: 'Chapter', es: 'Capítulo', 'pt-BR': 'Capítulo',
            vi: 'Chương', id: 'Bab', tr: 'Bölüm', pl: 'Rozdział',
          })} {row.chapterOrdinal}
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
/** Одна строка «Глава N» — высокой плашке больше неоткуда взяться. */
const CHAPTER_HEAD_HEIGHT = 84;



/**
 * Анимированная обёртка строки. Существует ТОЛЬКО для строк рядом с текущей.
 *
 * зачем: раньше useAnimatedStyle стоял ДО раннего выхода — правила хуков
 * заставляли его выполняться для ВСЕХ строк окна, включая далёкие и при
 * reducedMotion. Пропускался только Animated.View, а маппер Reanimated всё
 * равно создавался и рвался на каждой переработке строки. Это и была причина,
 * по которой прошлая «оптимизация» не дала эффекта (аудит 20.09).
 */
function LearningV2PulseMapEntryAnimated({
  children,
  progress,
  distanceFromCurrent,
}: Readonly<{
  children: React.ReactNode;
  progress: SharedValue<number>;
  distanceFromCurrent: number;
}>) {
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
  return <Animated.View style={entryStyle}>{children}</Animated.View>;
}

const LearningV2PulseMapEntryAnimatedMemo = React.memo(LearningV2PulseMapEntryAnimated);

/**
 * Крошечное хранилище «что сейчас видно на карте».
 *
 * зачем: раньше прокрутка писала это в useState самого экрана. Любая смена
 * урока или ухода текущего узла за край перерисовывала ВЕСЬ компонент, а с
 * ним инлайновый renderItem — FlatList считал его новым и заново рисовал все
 * видимые строки. Чем глубже прокрутка, тем чаще менялся урок: отсюда
 * «пролистнул до третьего урока — всё начало лагать» (владелец 20.09).
 * Теперь на эти значения подписаны только шапка и кнопка, список не трогается.
 */
function createMapViewStoreV1() {
  let lessonOrdinal: number | null = null;
  let currentOffscreen = false;
  const listeners = new Set<() => void>();
  const emit = () => { for (const l of listeners) l(); };
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getLesson: () => lessonOrdinal,
    getOffscreen: () => currentOffscreen,
    setLesson(next: number | null) {
      if (next === lessonOrdinal) return;
      lessonOrdinal = next;
      emit();
    },
    setOffscreen(next: boolean) {
      if (next === currentOffscreen) return;
      currentOffscreen = next;
      emit();
    },
  };
}
type MapViewStore = ReturnType<typeof createMapViewStoreV1>;

/** Ключ строки карты: вынесен, чтобы ссылка не менялась между рендерами. */
const mapRowKeyV1 = (row: MapRow) => row.id;

/**
 * Порог видимости строки. Без конфига RN зовёт onViewableItemsChanged на
 * каждом кадре прокрутки и пересобирает массивы видимых элементов —
 * заметная работа на длинном списке. 50% и минимум 120мс между замерами.
 */
const MAP_VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 50,
  minimumViewTime: 120,
} as const;

/** Кнопка «к текущему занятию». Появляется, когда узел ушёл с экрана. */
const LearningV2PulseBackToCurrent = React.memo(function LearningV2PulseBackToCurrent({
  store, label, background, ink, onPress,
}: Readonly<{ store: MapViewStore; label: string; background: string; ink: string; onPress: () => void }>) {
  const offscreen = useSyncExternalStore(store.subscribe, store.getOffscreen, store.getOffscreen);
  if (!offscreen) return null;
  return (
    <PressableHybrid
      variant="card"
      testID="learning-v2-pulse-back-to-current"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.mapFooterNow, { backgroundColor: background }]}
      contentStyle={styles.mapFooterNowContent}
    >
      <Ionicons name="locate" size={22} color={ink} />
    </PressableHybrid>
  );
});

export default function LearningV2PulseCourse(props: Props) {
  const { theme: t } = useTheme();
  // horizonsCopy строит объект на 27 ключей: без мемо это новая ссылка
  // каждый рендер и срыв всех зависимостей ниже.
  const c = useMemo(() => horizonsCopy(props.lang), [props.lang]);
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
  // Прокрутка пишет СЮДА, а не в состояние экрана: список из 2048 строк
  // больше не перерисовывается при смене урока (корень лагов вглубь).
  const mapViewStore = useRef<MapViewStore>(createMapViewStoreV1()).current;
  const visibleLessonOrdinalRef = useRef<number | null>(null);
  const onViewableItemsChangedRef = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<MapRow>[] }) => {
      visibleSessionRowsRef.current = viewableItems
        .filter((item) => item.isViewable && item.item?.kind === 'session')
        .map((item) => item.item as SessionRow);
      const hasCurrent = viewableItems.some(
        (item) => item.isViewable && item.item?.kind === 'session' && item.item.state === 'current',
      );
      mapViewStore.setOffscreen(!hasCurrent);
      const first = viewableItems.find((item) => item.isViewable && item.item);
      const ordinal = first?.item?.lessonOrdinal ?? null;
      if (ordinal !== null) {
        visibleLessonOrdinalRef.current = ordinal;
        mapViewStore.setLesson(ordinal);
      }
    },
  );
  // [V2-OPEN] Монтирование карты. Лог остаётся НАВСЕГДА: второе монтирование
  // за один вход значит, что раздел открылся дважды — именно этот класс бага
  // владелец видел как «моргает и открывается снова» (20.09).
  useEffect(() => {
    if (!__DEV__) return;
    const t0 = (globalThis as { __v2OpenT0?: number }).__v2OpenT0;
    console.log(
      "[V2-OPEN] map:mount",
      JSON.stringify({ sinceTap: t0 ? Date.now() - t0 : null }),
    );
    return () => console.log("[V2-OPEN] map:unmount", JSON.stringify({ reason: "component_destroyed" }));
  }, []);
  const entryPlayed = useRef(false);
  const centeredOnce = useRef(false);
  // Резерв под плавающую кнопку «Все уроки»: высота кнопки + её собственный
  // нижний отступ (ровно как у styles.mapFooter) + воздух.
  //
  // зачем (владелец 21.09, ДВА захода): сначала «не хочу чтобы при открытии
  // край кружка обрезался» — тогда резерв стоял отступом САМОГО СПИСКА
  // (marginBottom), укорачивая видимую область, чтобы кружок не подлезал под
  // кнопку. Затем владелец попросил обратное: «опусти ниже и вверху тоже,
  // чтобы поле карты было больше» — карта обязана идти ПОД панелью, а кромку
  // прячет тающая полоса (MAP_EDGE_FADE_HEIGHT), а не укороченная область.
  // Поэтому резерв переехал в paddingBottom КОНТЕНТА: видимая область снова
  // во всю высоту контейнера, но последняя строка списка по-прежнему не
  // упирается в кнопку. marginBottom здесь больше НЕ ставим — он вернёт
  // жёсткий край, ради снятия которого и делалась эта правка.
  const mapFooterReserve =
    MAP_FOOTER_BUTTON_HEIGHT + Math.max(18, props.bottomPadding) + MAP_FOOTER_AIR;
  // зачем: ЗАМЕР 21.09 — между рендером разметки (4 мс) и монтированием карты
  // проходило 537 мс. React отдаёт разметку мгновенно, полсекунды уходит на
  // создание НАТИВНЫХ вьюх строк. Каждая строка дорогая: узел с 4 shared
  // values и 3 animated styles, SVG-дужка, две иконки.
  // windowSize={11} держал ~110 строк (шаг строки ~153px, экран ~10 строк),
  // initialNumToRender={12} создавал 12 сразу.
  //
  // Первая партия остаётся маленькой (6) — именно она решает скорость
  // ОТКРЫТИЯ раздела, и трогать её нельзя: это те самые 191 мс.
  // А вот окно 5 оказалось слишком узким для БЫСТРОЙ прокрутки: владелец
  // 21.09 — «не успевает прорисоваться». Окно отвечает за запас строк вокруг
  // экрана, а не за первый кадр, поэтому поднимаем его до 9 и возвращаем
  // партию 10 с периодом 16 мс: карта успевает достраиваться на ходу,
  // открытие при этом не замедляется (initialNumToRender не изменился).
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
  // findIndex по 2048 строк на каждый рендер — мемоизируем по самим строкам.
  const currentRowIndex = useMemo(
    () => Math.max(0, rows.findIndex(row => row.kind === 'session' && row.state === 'current')),
    [rows],
  );
  const currentRow = rows[currentRowIndex];
  const target = currentRow?.kind === 'session' ? currentRow.sessionOrdinal : 1;
  // зачем: раньше список был КОРОЧЕ контейнера на высоту футера (marginBottom),
  // и центрирование считалось от высоты списка — иначе узел уезжал вниз ровно
  // на высоту кнопки. Теперь карта идёт под панелью во всю высоту контейнера
  // (резерв переехал в paddingBottom контента), поэтому центрировать надо от
  // ПОЛНОЙ высоты. Оставить здесь вычитание — значит поднять текущий узел
  // вверх на ~130px и показать пустоту снизу.
  const mapViewportHeight = Math.max(0, viewport.height);
  // Высота плавающей шапки карты: safe-area + ряд кнопок (styles.headerRow
  // minHeight 52) + собственные отступы styles.mapHeader (4 сверху, 8 снизу).
  //
  // зачем: шапка ушла в absolute, значит она больше НЕ занимает места в потоке
  // и список стартует от самого верха экрана. Без этого отступа первый кружок
  // уезжает под кнопки «назад» и «523». Величина считается, а не меряется
  // onLayout: замер дал бы второй кадр с другой геометрией, а это ровно тот
  // баг «видно ДВА кадра», который уже чинили contentOffset'ом (20.09).
  const mapHeaderReserve = (props.topPadding ?? 0) + 4 + 52 + 8;
  // Начало координат прокрутки = весь верхний отступ контента.
  //
  // зачем: смещение строки считается в ЧЕТЫРЁХ местах (getItemLayout,
  // initialOffset, scrollToCurrent, jumpToLesson), и раньше каждое повторяло
  // `geometry.padding + offsets[i]` своей копией. Появился второй слагаемый
  // (резерв шапки) — и любая забытая копия промахнулась бы ровно на высоту
  // шапки. Держим ОДНО значение: разойтись больше нечему.
  const mapContentTop = geometry.padding + mapHeaderReserve;
  const geometry = pulseMapGeometry(mapViewportHeight, target);
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
      offset: mapContentTop + (layout.offsets[index] ?? 0),
      animated: false,
    });
  }, [mapContentTop, layout.offsets, rows]);
  // зачем: раньше позиция считалась как (sessionOrdinal - 1) * step —
  // смещение ВНУТРИ одного урока. На сплошной карте это всегда приводило бы
  // к уроку 1: у человека на уроке 5 текущее занятие лежит на сотни строк
  // ниже. Берём готовое смещение строки из карты высот.
  const scrollToCurrent = useCallback((animated: boolean) => {
    if (!viewport.height) {
      if (__DEV__) console.log('[V2-MAP] scrollToCurrent:skip', JSON.stringify({ reason: 'no_viewport_height' }));
      return;
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
    // зачем: владелец 20.09 — «плашка ГЛАВА 1 в кадр попадать не должна»,
    // затем «она обрезается и вообще не попадает полностью».
    // Замер: при lead=18 от главы (118px) снизу торчал огрызок ровно 18px.
    // Правило: либо главы не видно СОВСЕМ, либо она видна целиком. В начале
    // курса встаём ровно на занятие 1 — граница строки, огрызка не остаётся.
    const lead = atCourseStart ? 0 : mapViewportHeight * 0.4;
    mapRef.current?.scrollToOffset({
      // + mapContentTop: у contentContainer есть верхний отступ (центрирование
      // плюс резерв под плавающую шапку), и без него прокрутка встаёт ВЫШЕ
      // строки ровно на это значение — снизу торчал огрызок плашки главы
      // (владелец 20.09: «глава 1 обрезается»).
      offset: Math.max(0, mapContentTop + (layout.offsets[currentRowIndex] ?? 0) - lead),
      animated,
    });
  }, [currentRowIndex, mapContentTop, layout.offsets, mapViewportHeight, rows, viewport.height]);
  // Первичное наведение: ровно ОДИН раз за жизнь экрана.
  // зачем: висело на onContentSizeChange — а размер контента меняется каждый
  // раз, когда список дорисовывает строки при прокрутке. Владелец 20.09:
  // «если скроллит вниз, то оно просто отбрасывает назад вверх само». Ключ по
  // (индекс + высота) не спасал: любой из них меняется — и карту швыряет
  // обратно. Наводимся один раз и больше в прокрутку не вмешиваемся.
  // зачем: владелец 20.09 — «открывается, показывает в самом верху, затем
  // экран пропадает и показывает как надо». Причина: стартовой позиции у
  // списка не было вовсе — он рисовал первый кадр с нуля, и только потом
  // centerCurrent его сдвигал. Видно ДВА кадра. contentOffset ставит нужную
  // позицию СРАЗУ, до первой отрисовки: прыжка нет.
  const initialOffset = useMemo(() => {
    const atStart =
      rows[currentRowIndex]?.kind === 'session' &&
      (rows[currentRowIndex] as SessionRow).lessonOrdinal === 1 &&
      (rows[currentRowIndex] as SessionRow).chapterOrdinal === 1;
    const lead = atStart ? 0 : (mapViewportHeight || 700) * 0.4;
    return { x: 0, y: Math.max(0, mapContentTop + (layout.offsets[currentRowIndex] ?? 0) - lead) };
  }, [currentRowIndex, mapContentTop, layout.offsets, mapViewportHeight, rows, viewport.height]);
  const backToCurrent = useCallback(() => { scrollToCurrent(true); }, [scrollToCurrent]);
  const centerCurrent = useCallback(() => {
    if (!viewport.height || centeredOnce.current) return;
    centeredOnce.current = true;
    scrollToCurrent(false);
  }, [scrollToCurrent, viewport.height]);
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
      // зачем: 80мс срабатывало почти на каждое движение пальцем при листании
      // карты, а каждый отчёт запускает подготовку занятий. 400мс — это уже
      // «человек остановился и смотрит», а не промежуточный кадр флика.
    }, 400);
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
  // зачем: renderItem был инлайновым и пересоздавался на КАЖДЫЙ рендер —
  // FlatList считал его новым и заново рисовал все видимые строки. Вместе
  // с ре-рендерами от прокрутки это и давало «пролистнул до третьего урока
  // — начало лагать». Ссылка стабильна, пока не меняются сами данные.
  const getMapItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: layout.heights[index] ?? geometry.step,
      offset: mapContentTop + (layout.offsets[index] ?? 0),
      index,
    }),
    [mapContentTop, geometry.step, layout.heights, layout.offsets],
  );
  // зачем: в зависимостях useCallback стоял весь объект `props`, а его
  // идентичность меняется при КАЖДОМ рендере родителя — useCallback был
  // декоративным, FlatList считал renderItem новым и перестраивал все ~62
  // строки окна. Распаковываем ровно то, что используется (аудит 20.09).
  const { titles, lang, stars, active, reducedMotion, devUnlockAll,
    isSessionMaterialAvailable, onSessionPress, onSessionCompleted } = props;
  const renderMapRow = useCallback(({ item: row, index }: { item: MapRow; index: number }) => {
        // Плашка урока на пол-экрана: она разделяет уроки на сплошной карте.
        if (row.kind === 'lesson') {
          return <LearningV2PulseCourseLessonPlate
            row={row}
            title={titles[row.lessonOrdinal - 1] ?? ''}
            height={LESSON_PLATE_HEIGHT}
            lang={lang}
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
            lang={lang}
          />;
        }
        const nodeOffsetX = pulseMapOffsetX(index, viewport.width);
        const x = viewport.width / 2 + nodeOffsetX;
        const nextX = viewport.width / 2 + pulseMapOffsetX(index + 1, viewport.width);
        const ready = row.state === 'current' || row.state === 'completed';
        // На сплошной карте урок берём ИЗ СТРОКИ: переменная `lesson` теперь
        // означает только «какой урок открыт в шторке», а не что на экране.
        const rowLesson = row.lessonOrdinal;
        const hasMaterial = isSessionMaterialAvailable?.(rowLesson, row.sessionOrdinal) ?? true;
        const devReady = devUnlockAll && !ready && hasMaterial;
        const available = hasMaterial && (ready || devReady);
        const nodeColor = available ? t.accent : t.bgSurface2;
        const ink = available ? t.correctText : t.textMuted;
        const completedStars = row.state === 'completed'
          ? Math.max(1, stars[row.id] ?? 1)
          : 0;
        const completedStarsLabel = completedStars > 0
          ? triLang(lang, {
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
        // Далёкие строки и reducedMotion не создают хуков Reanimated вовсе:
        // обёртка с useAnimatedStyle монтируется только рядом с текущей.
        const distance = Math.abs(index - currentRowIndex);
        // зачем: ЗАМЕР НА ЭМУЛЯТОРЕ 20.09. SVG на каждой строке
        // ПОДОЗРЕВАЛСЯ в долгом открытии раздела, и я заменил его на
        // повёрнутый View. Замер опроверг гипотезу: быстрее не стало (7,5 с
        // против 5,7 с), а линии снова уехали мимо кружков — ровно тот же
        // дефект, из-за которого View откатывали в прошлый раз.
        // Настоящая причина найдена отдельно и уже устранена: подготовка
        // занятия и аудио стартовала ДО первого кадра карты (семь сборок
        // мусора подряд). Рендер строк стоит 0 мс — SVG здесь ни при чём.
        // НЕ МЕНЯТЬ на View: проверено дважды, оба раза ломает геометрию.
        const routeD = `M ${x} 0 C ${x} 64 ${nextX} 64 ${nextX} ${geometry.step}`;
        const body = (
          <View style={{ height: geometry.step, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 6 }}>
          {/* зачем: дужка между узлами. Попытка заменить SVG на повёрнутый
              View провалилась — палки уехали мимо кружков (владелец 20.09
              прислал скриншот). Поворот идёт вокруг центра блока, и концы
              отрезка не совпадают с центрами кружков. Возвращён рабочий SVG:
              он рисует кривую по точным координатам узлов. */}
          {index < rows.length - 1 ? (
            <Svg pointerEvents="none" width={viewport.width} height={geometry.step * 2} style={{ position: 'absolute', top: geometry.step / 2, left: 0 }}>
              <Path d={routeD} fill="none" stroke={t.bgSurface2} strokeOpacity={0.35} strokeWidth={7} strokeLinecap="round" />
            </Svg>
          ) : null}
          {/* зачем: владелец 21.09 — «названия уроков убирай, я уже говорил,
              вместо названий нумерация». Подписи были «абы какие, не
              интересные». Номер занятия уже написан ВНУТРИ кружка, поэтому
              подпись не несла новой информации и только мешала.
              Побочный выигрыш: минус текстовый узел на КАЖДОЙ строке и минус
              40px её высоты — при быстрой прокрутке карта успевает рисоваться
              («экран при быстром скролле не успевает рисоваться», 21.09). */}
          <View style={[styles.nodeCluster, { transform: [{ translateX: nodeOffsetX }] }]}>
              <LearningV2MapNode testID={`learning-v2-pulse-session-${row.sessionOrdinal}`} state={row.state} width={geometry.nodeSize} height={geometry.nodeSize} radius={geometry.nodeSize / 2} faceColor={nodeColor} haloColor={t.accent} accessible active={active} reduceMotion={reducedMotion} accessibilityLabel={`${c.chapter} ${row.chapterOrdinal}, ${c.session} ${row.sessionOrdinal}, ${statusLabel}${completedStarsLabel ? `, ${completedStarsLabel}` : ''}`} onPress={() => onSessionPress(rowLesson, row.sessionOrdinal, row.state)} onCompletedTransition={onSessionCompleted}>
                <View pointerEvents="none" style={styles.nodeFace}><Ionicons testID={`learning-v2-pulse-session-icon-${row.sessionOrdinal}`} name={!hasMaterial ? 'construct-outline' : row.state === 'completed' ? 'checkmark' : available && (row.role === 'final_exam' || row.role === 'chapter_checkpoint') ? 'trophy' : available ? 'play' : 'lock-closed'} size={31} color={ink} /><Text style={{ color: ink, fontSize: 13, fontWeight: '700' }}>{row.sessionOrdinal}</Text></View>
              </LearningV2MapNode>
              {completedStars > 0 ? <View testID={`learning-v2-pulse-session-${row.sessionOrdinal}-stars`} pointerEvents="none" accessible={false} style={[styles.sessionStars, { backgroundColor: t.bgCard, borderColor: t.gold }]}>{Array.from({ length: completedStars }, (_, starIndex) => <Ionicons key={starIndex} name="star" size={14} color={t.gold} />)}</View> : null}
          </View>
          </View>
        );
        if (reducedMotion || distance > ENTRY_ANIMATED_ROWS) return body;
        return (
          <LearningV2PulseMapEntryAnimatedMemo progress={mapEntry} distanceFromCurrent={distance}>
            {body}
          </LearningV2PulseMapEntryAnimatedMemo>
        );
  }, [active, c, completed, currentRowIndex, devUnlockAll, geometry.nodeSize, geometry.step, isSessionMaterialAvailable, lang, mapEntry, onSessionCompleted, onSessionPress, reducedMotion, rows.length, stars, t, titles, viewport.width]);

  // зачем: владелец 21.09 — «опусти ниже и вверху тоже, чтобы поле карты было
  // больше». На КАРТЕ шапка становится плавающей (absolute) и safe-area уходит
  // в неё саму: карта получает всю высоту контейнера и проезжает под шапкой,
  // а кромку прячет верхняя полоса растворения.
  // В режиме СПИСКА уроков всё остаётся как было — шапка в потоке, отступ на
  // корне: под ней идут чипы уровней и список, которым нужна честная высота.
  const mapTopPad = props.topPadding ?? 0;
  return <View testID="learning-v2-pulse-course" style={[styles.root, { backgroundColor: t.bgPrimary, paddingTop: lessonListOpen ? mapTopPad : 0 }]}>
    <View
      pointerEvents="box-none"
      style={[
        styles.header,
        lessonListOpen ? null : [styles.mapHeader, styles.mapHeaderFloating, { paddingTop: mapTopPad + 4 }],
      ]}
    >
      <View pointerEvents="box-none" style={styles.headerRow}>
        {lessonListOpen ? <PressableHybrid variant="icon" accessibilityLabel={c.back} onPress={back} style={[styles.iconButton, { backgroundColor: t.bgCard }]} contentStyle={styles.iconButtonContent}><Ionicons name="chevron-back" size={24} color={t.textPrimary} /></PressableHybrid> : props.navigationControl}
        {lessonListOpen ? <Text style={[styles.headerTitle, { color: t.textPrimary }]}>{c.all}</Text> : <View style={styles.headerSpacer} />}
        {props.headerAccessory}
      </View>
      {/* На сплошной карте шапка называет урок, который человек сейчас
          видит: он меняется при прокрутке, а не при выборе в списке. */}
      {/* зачем: заголовок урока, меняющийся при скролле, владелец не просил —
          убран по его прямому указанию 20.09. */}
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
      <FlatList ref={mapRef} testID="learning-v2-pulse-map" data={rows} keyExtractor={mapRowKeyV1} contentContainerStyle={{ paddingTop: geometry.padding + mapHeaderReserve, paddingBottom: geometry.padding + mapFooterReserve }} getItemLayout={getMapItemLayout} contentOffset={initialOffset} onContentSizeChange={centerCurrent} onViewableItemsChanged={onViewableItemsChangedRef.current} viewabilityConfig={MAP_VIEWABILITY_CONFIG} onMomentumScrollBegin={cancelVisibleSessionsSettledAfterDrag} onMomentumScrollEnd={handleMomentumScrollEnd} onScrollEndDrag={scheduleVisibleSessionsSettledAfterDrag} initialNumToRender={6} maxToRenderPerBatch={10} updateCellsBatchingPeriod={16} windowSize={9} removeClippedSubviews showsVerticalScrollIndicator={false} decelerationRate={MAP_DECELERATION_RATE} bounces alwaysBounceVertical overScrollMode="always" renderItem={renderMapRow} />
      {/* Тающие края. Карта проезжает под шапкой и под панелью, а кромку
          прячет затухание в цвет фона — кружок растворяется, а не режется
          (владелец 21.09). pointerEvents="none": полосы лежат ПОВЕРХ списка,
          и без этого они съели бы тап по верхним и нижним кружкам.
          Три точки вместо двух: у линейного градиента заметна «середина», а
          с ускоренным началом (0.58 на половине) переход читается как
          растворение, а не как полупрозрачная плёнка. */}
      <LinearGradient
        pointerEvents="none"
        testID="learning-v2-pulse-map-fade-top"
        colors={[t.bgPrimary, withAlpha(t.bgPrimary, 0.58), withAlpha(t.bgPrimary, 0)]}
        locations={[0, 0.5, 1]}
        style={[styles.mapEdgeFadeTop, { height: MAP_EDGE_FADE_HEIGHT + (props.topPadding ?? 0) }]}
      />
      <LinearGradient
        pointerEvents="none"
        testID="learning-v2-pulse-map-fade-bottom"
        colors={[withAlpha(t.bgPrimary, 0), withAlpha(t.bgPrimary, 0.58), t.bgPrimary]}
        locations={[0, 0.5, 1]}
        style={[styles.mapEdgeFadeBottom, { height: MAP_EDGE_FADE_HEIGHT + Math.max(18, props.bottomPadding) }]}
      />
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
        <LearningV2PulseBackToCurrent
          store={mapViewStore}
          label={currentStatusLabel}
          background={t.accent}
          ink={t.correctText}
          onPress={backToCurrent}
        />
      </View>
    </Animated.View>}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: 12, justifyContent: 'center' },
  mapHeader: { paddingTop: 4, paddingBottom: 8, gap: 6 },
  // Плавающая шапка карты: карта идёт ПОД ней (владелец 21.09 — «поле карты
  // должно быть больше»). zIndex=3 — выше полос растворения (они без zIndex,
  // то есть в обычном порядке потока), иначе верхняя полоса легла бы на
  // кнопки и притушила их. pointerEvents="box-none" на самой шапке: пустое
  // место между кнопками не должно перехватывать прокрутку карты.
  mapHeaderFloating: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 3, elevation: 3 },
  // Плавающая шапка карты: лежит ПОВЕРХ карты и полос растворения.
  // zIndex/elevation обязаны быть выше полос, иначе затухание накроет кнопки
  // и они станут блёклыми. pointerEvents="box-none" на контейнере — пустое
  // место шапки пропускает жест к карте, сами кнопки остаются кликабельными.
  mapHeaderFloating: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3, elevation: 3 },
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
  // Владелец 20.09: «текст название урока уменьши, он сильно большой».
  plateTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5, lineHeight: 25, textAlign: 'center' },
  plateArc: { fontSize: 15, fontWeight: '600', lineHeight: 21, marginTop: 14, textAlign: 'center' },
  plateCount: { marginTop: 20, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 16 },
  plateCountText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  // Полосы растворения у кромок карты. Лежат поверх списка, тач пропускают
  // (pointerEvents="none" на самих элементах), высота задаётся инлайном —
  // она зависит от safe-area конкретного телефона.
  mapEdgeFadeTop: { position: 'absolute', left: 0, right: 0, top: 0 },
  mapEdgeFadeBottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
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
  // Подпись сразу ПОД кружком и отцентрирована ПО КРУЖКУ, а не по экрану:
  // змейка уводит узел на ±71px, и растянутая на всю строку подпись выглядела
  // сдвинутой (владелец 20.09: «тексты должны быть ровно под кнопкой
  // отцентрированы»). Двигаем её тем же смещением, что и узел.
  // Ширина считается так, чтобы подпись НЕ вылезла за экран при крайнем
  // смещении змейки: width/2 + 82 <= 390/2 - 10 → width <= 206.
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
