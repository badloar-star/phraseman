import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Reanimated from 'react-native-reanimated';
import { Animated, Easing, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
import PersonalPlanSunsetNotice from '../components/PersonalPlanSunsetNotice';
import TopFadeMask from '../components/TopFadeMask';
import TapScale from '../components/TapScale';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useTheme } from '../components/ThemeContext';
import type { ThemeMode } from '../constants/theme';
import { useStudyTarget } from '../components/StudyTargetContext';
import { hapticTap } from '../hooks/use-haptics';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import {
  getPlanById,
  allTasksForDay,
  nextTaskAfterVisibleSlice,
  visibleTasksForMinutes,
  type PersonalPlanDefinition,
  type PersonalPlanId,
  type PlanDailyTask,
} from './personal_plan_catalog';
import { planTaskCompletionKey, readCompletedPlanTasks, type PersonalPlanCompletedTask } from './personal_plan_progress';
import { activeDayKeys, trailingStreak } from './personal_plan_stats';
import {
  getPlanDayLessonRecommendation,
  type PlanDayLessonRecommendation,
} from './plan_day_lesson_recommendation';
import {
  hasBundledCompatibilityPlanContentDay,
  hasBundledCompatibilityPlanContentTheoryEntry,
} from './plan_content_readiness';
import { ensurePlanContentPackReady } from './plan_content_remote_facade';
import { prefetchPlanContentDayWindow } from './plan_content_prefetch';
import ReportErrorButton from '../components/ReportErrorButton';
import { triLang, type Lang } from '../constants/i18n';
import { useLang } from '../components/LangContext';
import { awardPlanDayCompletionReward } from './personal_plan_day_reward';
import { loadPlanDayComparison, planDayComparisonLine, type PlanDayComparison } from './personal_plan_day_comparison';
import {
  buildPersonalPlanSnapshot,
  buildTodayPlanRuntime,
  isPersonalPlanFinished,
  readAnyPersonalPlanState,
  getCachedPersonalPlanState,
  advancePersonalPlanStateForToday,
  savePersonalPlanState,
  type PersonalPlanHomeSnapshot,
  type PersonalPlanState,
  type PlanDayRuntime,
} from './personal_plan_state';
import { openPersonalPlanTask, personalPlanTaskStartsPaidExercise } from './personal_plan_navigation';
import EnergyCostBadge from '../components/EnergyCostBadge';
import { getPersonalPlanTaskVisual } from './personal_plan_task_visuals';
import { resolvePersonalPlanFlashcardsReviewCount } from './personal_plan_flashcards_review_gate';
import { getMistakePracticeReadyCount } from './mistake_practice_insights';
import { ENABLE_DEV_TOOLS } from './config';
import { PERSONAL_PLAN_SUNSET_AT_MS, PERSONAL_PLAN_SUNSET_FALLBACK_ROUTE } from './personal_plan_sunset';
import { withPersonalPlanSunsetGuard } from './personal_plan_sunset_guard';
import {
  peekPersonalPlanSunsetEffectiveNow,
  readPersonalPlanSunsetEffectiveNow,
} from './personal_plan_sunset_clock';

import { noAndroidOutline } from '../constants/androidGlow';
import { OLIVE_RICH, OLIVE_GRADIENTS } from '../constants/oliveTheme';
type LoadedPlan = {
  plan: PersonalPlanDefinition;
  state: PersonalPlanState;
  runtime: PlanDayRuntime;
  snapshot: PersonalPlanHomeSnapshot;
  completedTasks: Record<string, PersonalPlanCompletedTask | unknown>;
  mistakePracticeReadyCount: number;
};

const INSTANT_PLAN_DUE_COUNT = 999;
const RING_SIZE = 90;
const RING_STROKE = 8;
const PERSONAL_PLAN_SUNSET_CLOCK_REFRESH_MS = 60_000;

// ─── PlanChrome ────────────────────────────────────────────────────────────
type PlanChrome = {
  bg: [string, string, string];
  card: [string, string];
  hero: [string, string];
  accent: string;
  accent2: string;
  accentSoft: string;
  border: string;
  text: string;
  muted: string;
  ghost: string;
  buttonText: string;
  taskSurface: string;
  /** Неактивная часть кольца прогресса (трек под акцентной дугой). */
  ringTrack: string;
};

/** "7", "7 и 9", "7, 9 и 12" — short human list of lesson numbers. */
function formatLessonList(lessonIds: readonly number[]): string {
  if (lessonIds.length === 0) return '';
  if (lessonIds.length === 1) return String(lessonIds[0]);
  const head = lessonIds.slice(0, -1).join(', ');
  return `${head} и ${lessonIds[lessonIds.length - 1]}`;
}

function resolvePlanChrome(themeMode: ThemeMode, t: ReturnType<typeof useTheme>['theme']): PlanChrome {
  const base: PlanChrome = {
    bg: [t.bgGradient[0], t.bgGradient[1], t.bgPrimary],
    card: [t.bgCard, t.bgPrimary],
    hero: [t.bgSurface2, t.bgPrimary],
    accent: t.accent,
    accent2: t.textSecond,
    accentSoft: t.accentBg,
    border: t.border,
    text: t.textPrimary,
    muted: t.textMuted,
    ghost: t.textGhost,
    buttonText: t.correctText,
    taskSurface: 'rgba(255,255,255,0.055)',
    ringTrack: 'rgba(255,255,255,0.08)',
  };

  if (false) return { ...base, bg: ['#343235', '#29292B', '#1E1E20'], card: ['#2D2D30', '#1F1F22'], hero: ['#313033', '#202023'], accent: '#F6C78E', accent2: '#FFE1B5', accentSoft: 'rgba(246,199,142,0.14)', border: 'rgba(246,199,142,0.22)', buttonText: '#21170C' };
  if (false) return { ...base, bg: ['#202020', '#101010', '#050505'], card: ['#232522', '#0B0C0A'], hero: ['#292B26', '#0C0D0A'], accent: '#C8FF00', accent2: '#A6FF5D', accentSoft: 'rgba(200,255,0,0.13)', border: 'rgba(200,255,0,0.24)', buttonText: '#182200' };
  if (themeMode === 'gold') return { ...base, bg: ['#171008', '#0B0804', '#030201'], card: ['#211A10', '#080604'], hero: ['#2B2110', '#080604'], accent: '#E8C46A', accent2: '#FFF0B8', accentSoft: 'rgba(232,196,106,0.15)', border: 'rgba(232,196,106,0.26)', muted: '#CBBE9A', buttonText: '#120B02', taskSurface: 'rgba(232,196,106,0.08)' };
  if (themeMode === 'olive') return { ...base, bg: [...OLIVE_GRADIENTS.screen] as [string, string, string], card: [OLIVE_RICH.raised, OLIVE_RICH.panel], hero: [OLIVE_RICH.surface, OLIVE_RICH.panel], accent: OLIVE_RICH.champagne, accent2: OLIVE_RICH.champagneLight, accentSoft: '#2A2818', border: 'transparent', text: OLIVE_RICH.ivory, muted: OLIVE_RICH.champagneLight, ghost: OLIVE_RICH.champagneLight, buttonText: OLIVE_RICH.piano, taskSurface: OLIVE_RICH.surface, ringTrack: OLIVE_RICH.raised };
  // зачем: ringTrack — белый 8% был невидим на светлом accentSoft (#D9E9E1); трек — sage-хейрлайн.
  if (themeMode === 'sagePorcelain') return { ...base, bg: ['#DCE1D8', '#CDD5C7', '#BFC8B8'], card: ['#FCFDF9', '#DCE1D8'], hero: ['#E1E5DC', '#DCE1D8'], accent: '#315F50', accent2: '#52605A', accentSoft: '#D9E9E1', border: '#CFD6CE', text: '#17201D', muted: '#52605A', ghost: '#61706A', buttonText: '#FFFFFF', taskSurface: '#E1E5DC', ringTrack: '#BDC8BD' }; // guard-ok: chrome-токены темы (border был и до правки), не новая обводка
  if (false) return { ...base, bg: ['#FFF8EA', '#F4E6CD', '#EBD8BC'], card: ['#FFFDF6', '#F2E1C8'], hero: ['#FFFFFF', '#F1DEC0'], accent: '#B7791F', accent2: '#166E65', accentSoft: 'rgba(183,121,31,0.13)', border: 'rgba(91,63,25,0.18)', text: '#201811', muted: '#6A5C4D', ghost: '#9A8975', buttonText: '#21170C', taskSurface: 'rgba(70,48,20,0.055)' };
  if (themeMode === 'indigo') return { ...base, bg: ['#22252A', '#15171A', '#08090A'], card: ['#25282D', '#0E1012'], hero: ['#2C3035', '#101214'], accent: '#D7DEE8', accent2: '#8EA7C6', accentSoft: 'rgba(215,222,232,0.12)', border: 'rgba(215,222,232,0.18)', buttonText: '#101214' };
  return base;
}

// ─── ProgressRing ──────────────────────────────────────────────────────────
function ProgressRing({ pct, chrome, lang }: { pct: number; chrome: PlanChrome; lang: Lang }) {
  const animPct = useRef(new Animated.Value(0)).current;
  const prevPct = useRef(0);

  // Warm up the remote plan-content pack cache as soon as the personal-plan
  // screen mounts. ensurePlanContentPackReady() is idempotent, deduplicated, and
  // a no-op when remote loading is disabled — so this is safe to fire on every
  // mount and costs nothing while the pack is already cached locally.
  useEffect(() => {
    void ensurePlanContentPackReady().catch(() => { /* facade swallows; bundled fallback handles it */ });
  }, []);


  useEffect(() => {
    Animated.timing(animPct, {
      toValue: pct,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    prevPct.current = pct;
  }, [pct, animPct]);

  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={[styles.progressRing, { backgroundColor: chrome.accentSoft, borderColor: chrome.border }]}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={chrome.accent2} stopOpacity="1" />
            <Stop offset="1" stopColor={chrome.accent} stopOpacity="1" />
          </SvgGradient>
        </Defs>
        <Circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={radius}
          stroke={chrome.ringTrack} strokeWidth={RING_STROKE} fill="transparent"
        />
        <Circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={radius}
          stroke={chrome.accent} strokeWidth={RING_STROKE} strokeLinecap="round"
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - Math.max(0, Math.min(100, pct)) / 100)}
          rotation="-90" origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      {/* «100%» — это 4 широких символа кеглем 24/900; в круге Ø≈82px они упирались
          в обводку и налезали на кольцо. Для трёхзначного значения (только 100%)
          чуть уменьшаем кегль и держим в одну строку. numberOfLines={1} страхует от
          переноса. adjustsFontSizeToFit НЕ используем — он схлопывал текст в ноль. */}
      <Text
        style={[styles.ringPct, Math.round(pct) >= 100 ? styles.ringPctFull : null, { color: chrome.text }]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
      >
        {Math.round(pct)}%
      </Text>
      <Text style={[styles.ringLabel, { color: chrome.muted }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{triLang(lang, { ru: 'готово', en: 'done', uk: 'готово', es: 'listo', 'pt-BR': 'pronto', vi: 'đã xong', id: 'selesai', tr: 'hazır', pl: 'gotowe' })}</Text>
    </View>
  );
}

// ─── StreakBadge ────────────────────────────────────────────────────────────
// `streakDays` is the REAL "days in a row" streak (same source the stats screen
// uses): derived from completed-task timestamps via trailingStreak(), not the
// plan day number. A 0-streak shows a neutral "День N" label without the flame
// so we never imply an active streak that doesn't exist.
function StreakBadge({ streakDays, dayIndex, chrome, lang }: { streakDays: number; dayIndex: number; chrome: PlanChrome; lang: Lang }) {
  if (streakDays <= 0) {
    return (
      <View style={[styles.streakBadge, { backgroundColor: chrome.accentSoft, borderColor: chrome.border }]}>
        <Text style={[styles.streakText, { color: chrome.accent }]}>{triLang(lang, { ru: `День ${dayIndex}`, en: `Day ${dayIndex}`, uk: `День ${dayIndex}`, es: `Día ${dayIndex}`, 'pt-BR': `Dia ${dayIndex}`, vi: `Ngày ${dayIndex}`, id: `Hari ${dayIndex}`, tr: `${dayIndex}. gün`, pl: `Dzień ${dayIndex}` })}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.streakBadge, { backgroundColor: chrome.accentSoft, borderColor: chrome.border }]}>
      <Ionicons name="flame" size={14} color={chrome.accent} />
      <Text style={[styles.streakText, { color: chrome.accent }]}>{triLang(lang, { ru: `${streakDays} дн`, en: `${streakDays}d`, uk: `${streakDays} дн`, es: `${streakDays} d`, 'pt-BR': `${streakDays} d`, vi: `${streakDays} ngày`, id: `${streakDays} hr`, tr: `${streakDays} gün`, pl: `${streakDays} dni` })}</Text>
    </View>
  );
}

// ─── TaskRow ────────────────────────────────────────────────────────────────
function TaskRow({
  task,
  planId,
  themeMode,
  completed,
  isNext,
  chrome,
  onPress,
  showEnergyCost,
  lang,
}: {
  task: PlanDailyTask;
  planId: PersonalPlanId;
  themeMode: ThemeMode;
  completed: boolean;
  isNext: boolean;
  chrome: PlanChrome;
  onPress: () => void;
  showEnergyCost: boolean;
  lang: Lang;
}) {
  const visual = getPersonalPlanTaskVisual(task, planId, themeMode);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ position: 'relative', overflow: 'visible', transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={triLang(lang, {
            ru: `${completed ? 'Повторить' : 'Открыть'} задание ${task.title}`,
            uk: `${completed ? 'Повторити' : 'Відкрити'} завдання ${task.title}`,
            en: `${completed ? 'Repeat' : 'Open'} task ${task.title}`,
            es: `${completed ? 'Repetir' : 'Abrir'} tarea ${task.title}`,
            'pt-BR': `${completed ? 'Repetir' : 'Abrir'} tarefa ${task.title}`,
            vi: `${completed ? 'Làm lại' : 'Mở'} nhiệm vụ ${task.title}`,
            id: `${completed ? 'Ulangi' : 'Buka'} tugas ${task.title}`,
            tr: `${task.title} görevini ${completed ? 'tekrarla' : 'aç'}`,
            pl: `${completed ? 'Powtórz' : 'Otwórz'} zadanie ${task.title}`,
        })}
        style={[
          styles.taskRow,
          {
            backgroundColor: isNext && !completed ? chrome.accentSoft : chrome.taskSurface,
            borderColor: isNext && !completed ? chrome.accent + '55' : completed ? chrome.border : chrome.border,
          },
        ]}
      >
        {/* Left icon.
            Выполненная задача — галочка в рамке (нужны border+фон).
            Активная задача — ассет уже ГОТОВАЯ иконка-плитка со своим скруглённым
            тёмным фоном; вторую рамку/фон/scrim вокруг неё не добавляем, иначе углы
            плитки торчат «рамкой в рамке». Только клипуем картинку по радиусу. */}
        {completed ? (
          <View
            style={[
              styles.taskIcon,
              { borderWidth: 0, borderColor: chrome.accent2 + '88', backgroundColor: chrome.accent2 + '18' },
            ]}
          >
            <Ionicons name="checkmark" size={22} color={chrome.accent2} />
          </View>
        ) : (
          <View style={[styles.taskIcon, styles.taskIconImageWrap]}>
            <Image source={visual.asset} style={styles.taskImage} contentFit="contain" transition={120} />
          </View>
        )}

        {/* Copy */}
        <View style={styles.taskCopy}>
          {/* numberOfLines обязателен: колонка стоит в строке рядом с иконкой и
              правым блоком; без клампа узкая колонка рвёт заголовок по буквам. */}
          <Text style={[styles.taskTitle, { color: chrome.text }]} numberOfLines={2}>
            {task.title}
          </Text>
          <Text style={[styles.taskSub, { color: completed ? chrome.accent2 : chrome.muted }]} numberOfLines={3}>
            {completed ? triLang(lang, { ru: '✓ Выполнено', en: '✓ Done', uk: '✓ Виконано', es: '✓ Completado', 'pt-BR': '✓ Concluído', vi: '✓ Đã hoàn thành', id: '✓ Selesai', tr: '✓ Tamamlandı', pl: '✓ Wykonano' }) : task.subtitle}
          </Text>
        </View>

        {/* Right */}
        <View style={styles.taskRight}>
          {isNext && !completed ? (
            <View style={[styles.nextBadge, { backgroundColor: chrome.accent, borderRadius: 10 }]}>
              <Text style={[styles.nextBadgeText, { color: chrome.buttonText }]}>→</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.taskMinutes, { color: chrome.accent }]}>{triLang(lang, { ru: `${task.minutes}мин`, en: `${task.minutes}min`, uk: `${task.minutes}хв`, es: `${task.minutes}min`, 'pt-BR': `${task.minutes}min`, vi: `${task.minutes}p`, id: `${task.minutes}mnt`, tr: `${task.minutes}dk`, pl: `${task.minutes}min` })}</Text>
              <Ionicons name="chevron-forward" size={18} color={chrome.ghost} />
            </>
          )}
        </View>
      </TouchableOpacity>
      {showEnergyCost ? <EnergyCostBadge testID={`personal-plan-task-${task.id}-energy-cost`} /> : null}
    </Animated.View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────
function PersonalPlanScreen() {
  const { lang } = useLang();
  const router = useRouter();
  // Входной премиум-замок «Личного плана». Перехватывает ВСЕ пути входа (карточка на
  // главной, snapshot-карточка, Compass «начать день», прямой диплинк): фри-юзер без
  // доступа улетает на пейвол, а не открывает уже созданный план. С учётом «Пульта»
  // (перевод фичи в «Фри» снимает замок живьём).
  const insets = useStableSafeAreaInsets();
  const { theme: t, themeMode } = useTheme();
  const { studyTarget } = useStudyTarget();
  const [loaded, setLoaded] = useState<LoadedPlan | null>(() => {
    const cached = getCachedPersonalPlanState();
    if (!cached) return null;
    const plan = getPlanById(cached.planId);
    const completedTasks = {};
    const instantInput = {
      plan,
      state: cached,
      completedTasks,
      duePracticeCount: INSTANT_PLAN_DUE_COUNT,
      duePracticeWordCount: INSTANT_PLAN_DUE_COUNT,
      dueTrainerCount: INSTANT_PLAN_DUE_COUNT,
      duePlanTrainerWeakSpotCount: INSTANT_PLAN_DUE_COUNT,
      dueFlashcardsCount: INSTANT_PLAN_DUE_COUNT,
    };
    return {
      plan,
      state: cached,
      runtime: buildTodayPlanRuntime(instantInput),
      snapshot: buildPersonalPlanSnapshot(instantInput),
      completedTasks,
      mistakePracticeReadyCount: 0,
    };
  });
  // зачем (расследование 2026-08-24): экран плана грел ТОЛЬКО манифест пака, а
  // сами день-строки не качал никто, кроме холодного старта (idle+4.5 с) — до
  // него пользователь не доживал, и вход в день всегда падал на bundled
  // (`pack_not_cached`). Здесь, зная текущий день, греем окно «текущий ±2»
  // сразу при открытии плана: к моменту тапа по дню его json уже на диске.
  // Идемпотентно и бесплатно на повторе: скачанные строки не перекачиваются.
  const warmedDayWindowRef = useRef<string | null>(null);
  const activePlanId = loaded?.state.planId ?? null;
  const activeDayIndex = loaded?.state.currentDayIndex ?? null;
  useEffect(() => {
    if (!activePlanId || !activeDayIndex) return;
    const key = `${activePlanId}:${activeDayIndex}`;
    if (warmedDayWindowRef.current === key) return;
    warmedDayWindowRef.current = key;
    void prefetchPlanContentDayWindow(activePlanId, activeDayIndex);
  }, [activePlanId, activeDayIndex]);
  // Тихая ревалидация: подпись последнего закоммиченного `loaded`, чтобы на повторных
  // фокусах (useFocusEffect) не звать setLoaded/энтранс-анимацию, если пересчитанные
  // plan/runtime/snapshot структурно совпадают с уже отображаемыми — не мигать контентом.
  const loadedSignatureRef = useRef<string | null>(null);
  const [extraVisibleTaskCount, setExtraVisibleTaskCount] = useState(0);
  // Задачи дня по умолчанию СВЁРНУТЫ — пользователь раскрывает их сам по тапу на заголовок.
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [lessonRecommendation, setLessonRecommendation] = useState<PlanDayLessonRecommendation | null>(null);
  const [dayComparison, setDayComparison] = useState<PlanDayComparison | null>(null);
  // Подтверждение смены плана (новый план начинается с дня 1 — прогресс сбрасывается).
  const [changePlanConfirmVisible, setChangePlanConfirmVisible] = useState(false);
  const isGold = themeMode === 'gold';
  const screenBg = isGold ? '#090704' : t.bgPrimary;
  const chrome = useMemo(() => resolvePlanChrome(themeMode, t), [themeMode, t]);
  const [sunsetNowMs, setSunsetNowMs] = useState(() => peekPersonalPlanSunsetEffectiveNow());
  const sunsetClockRefreshInFlightRef = useRef<Promise<number> | null>(null);

  const refreshDurableSunsetClock = useCallback((): Promise<number> => {
    if (sunsetClockRefreshInFlightRef.current === null) {
      sunsetClockRefreshInFlightRef.current = readPersonalPlanSunsetEffectiveNow()
        .finally(() => {
          sunsetClockRefreshInFlightRef.current = null;
        });
    }
    return sunsetClockRefreshInFlightRef.current;
  }, []);

  // The visible timer exists only while this screen is focused. At the exact global
  // boundary it persists/checks the monotonic clock and replaces the route; the
  // one-second display tick never touches AsyncStorage and plan data stays intact.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      let durableTimer: ReturnType<typeof setTimeout> | null = null;
      let redirected = false;
      let refreshAwaiterActive = false;

      const redirectToFallback = (): void => {
        if (!alive || redirected) return;
        redirected = true;
        markNextNavigationAsReplace();
        router.replace(PERSONAL_PLAN_SUNSET_FALLBACK_ROUTE as any);
      };

      const scheduleDurableRefresh = (): void => {
        if (!alive || redirected) return;
        const remainingMs = PERSONAL_PLAN_SUNSET_AT_MS - peekPersonalPlanSunsetEffectiveNow();
        durableTimer = setTimeout(
          () => { void refreshDurableClock(); },
          Math.max(0, Math.min(PERSONAL_PLAN_SUNSET_CLOCK_REFRESH_MS, remainingMs)),
        );
      };

      const refreshDurableClock = async (): Promise<void> => {
        if (refreshAwaiterActive || redirected) return;
        refreshAwaiterActive = true;
        try {
          const effectiveNowMs = await refreshDurableSunsetClock();
          if (!alive) return;
          setSunsetNowMs((previous) => Math.max(previous, effectiveNowMs));
          if (effectiveNowMs >= PERSONAL_PLAN_SUNSET_AT_MS) {
            redirectToFallback();
            return;
          }
          scheduleDurableRefresh();
        } catch {
          redirectToFallback();
        } finally {
          refreshAwaiterActive = false;
        }
      };

      void refreshDurableClock();
      const displayTimer = setInterval(() => {
        const displayNowMs = peekPersonalPlanSunsetEffectiveNow();
        setSunsetNowMs((previous) => Math.max(previous, displayNowMs));
        if (displayNowMs < PERSONAL_PLAN_SUNSET_AT_MS) return;
        if (durableTimer !== null) {
          clearTimeout(durableTimer);
          durableTimer = null;
        }
        void refreshDurableClock();
      }, 1_000);
      return () => {
        alive = false;
        clearInterval(displayTimer);
        if (durableTimer !== null) clearTimeout(durableTimer);
      };
    }, [refreshDurableSunsetClock, router]),
  );

  // Entrance animation
  const entranceFade = useRef(new Animated.Value(0)).current;
  const entranceSlide = useRef(new Animated.Value(24)).current;
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  // Классический Animated.Value для TopFadeMask (он не умеет в Reanimated SharedValue,
  // что отдаёт useBouncy). Обновляем из onScroll вместе с bounce-обработчиком, чтобы
  // верхний фейд под статус-баром был такой же, как на главной/табах.
  const fadeScrollY = useRef(new Animated.Value(0)).current;
  const handlePlanScroll = useCallback((e: any) => {
    onBouncyScroll(e);
    const y = e?.nativeEvent?.contentOffset?.y ?? 0;
    fadeScrollY.setValue(y);
  }, [onBouncyScroll, fadeScrollY]);

  const load = useCallback(async () => {
    const state = await readAnyPersonalPlanState();
    if (!state) {
      // Плана нет → свапаем экран плана на онбординг-setup. Пометка replace держит
      // честный стек согласованным: после активации setup→replace('/personal_plan')
      // «назад» из плана не вернёт в уже пройденный setup.
      markNextNavigationAsReplace();
      router.replace('/personal_plan_setup' as any);
      setLoaded(null);
      return;
    }
    if (state.status === 'completed') {
      markNextNavigationAsReplace();
      router.replace('/personal_plan_complete' as any);
      setLoaded(null);
      return;
    }
    const plan = getPlanById(state.planId);
    const completedTasks = await readCompletedPlanTasks();
    const instantInput = {
      plan,
      state,
      completedTasks,
      duePracticeCount: INSTANT_PLAN_DUE_COUNT,
      duePracticeWordCount: INSTANT_PLAN_DUE_COUNT,
      dueTrainerCount: INSTANT_PLAN_DUE_COUNT,
      duePlanTrainerWeakSpotCount: INSTANT_PLAN_DUE_COUNT,
      dueFlashcardsCount: INSTANT_PLAN_DUE_COUNT,
    };
    setLoaded({
      plan,
      state,
      runtime: buildTodayPlanRuntime(instantInput),
      snapshot: buildPersonalPlanSnapshot(instantInput),
      completedTasks,
      mistakePracticeReadyCount: 0,
    });

    const [dueFlashcardsCount, mistakePracticeReadyCount] = await Promise.all([
      resolvePersonalPlanFlashcardsReviewCount(studyTarget).catch(() => 0),
      studyTarget === 'en' || studyTarget === 'fr'
        ? getMistakePracticeReadyCount(studyTarget).catch(() => 0)
        : Promise.resolve(0),
    ]);
    const duePracticeCount = 0;
    const duePracticeWordCount = 0;
    const dueTrainerCount = 0;
    const advancedState = advancePersonalPlanStateForToday({
      plan,
      state,
      completedTasks,
      duePracticeCount,
      duePracticeWordCount,
      dueTrainerCount,
      duePlanTrainerWeakSpotCount: 0,
      dueFlashcardsCount,
    });
    if (advancedState.currentDayIndex !== state.currentDayIndex) {
      await savePersonalPlanState(advancedState);
    }
    const input = {
      plan,
      state: advancedState,
      completedTasks,
      duePracticeCount,
      duePracticeWordCount,
      dueTrainerCount,
      duePlanTrainerWeakSpotCount: 0,
      dueFlashcardsCount,
    };
    // Маршрут пройден до конца — вместо вечного показа последнего дня ведём на
    // финальный экран «маршрут пройден» (поздравление + следующий план).
    if (isPersonalPlanFinished(input)) {
      // Свап на финальный экран. Без пометки replace экран плана остаётся в стеке и
      // «назад» с экрана завершения вернул бы на план, который снова видит «маршрут
      // пройден» → опять replace на завершение → петля.
      markNextNavigationAsReplace();
      router.replace('/personal_plan_complete' as any);
      return;
    }
    const finalLoaded: LoadedPlan = {
      plan,
      state: advancedState,
      runtime: buildTodayPlanRuntime(input),
      snapshot: buildPersonalPlanSnapshot(input),
      completedTasks,
      mistakePracticeReadyCount,
    };
    // Тихая ревалидация: если пересчитанные данные структурно совпадают с уже
    // показанными — не сетим (не мигаем контентом/анимацией на повторном фокусе).
    let signature: string | null = null;
    try {
      signature = JSON.stringify(finalLoaded);
    } catch { /* на всякий случай, если в данных попадётся не-JSON-совместимое поле */ }
    const unchanged = signature !== null && signature === loadedSignatureRef.current;
    if (unchanged) return;
    if (signature !== null) loadedSignatureRef.current = signature;
    setLoaded(finalLoaded);

    // Entrance animation after data loads — только когда контент реально изменился,
    // иначе на каждом фокусе экран бы мигал повторным fade-in без причины.
    entranceFade.setValue(0);
    entranceSlide.setValue(24);
    Animated.parallel([
      Animated.timing(entranceFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(entranceSlide, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [router, studyTarget, entranceFade, entranceSlide]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void load().then(() => { if (!alive) return; });
      return () => { alive = false; };
    }, [load]),
  );

  // Which app lessons to finish before this plan day (grammar prerequisites the
  // learner has not passed yet). Recomputed when the visible day changes.
  const visibleDayIndex = loaded?.runtime.visibleDay.dayIndex ?? null;
  useEffect(() => {
    if (!loaded) {
      setLessonRecommendation(null);
      return;
    }
    let alive = true;
    void getPlanDayLessonRecommendation(loaded.runtime.visibleDay, studyTarget)
      .then((rec) => { if (alive) setLessonRecommendation(rec); })
      .catch(() => { if (alive) setLessonRecommendation(null); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleDayIndex, studyTarget]);

  // Award the one-time shard bonus when the whole day is finished. Idempotent — safe
  // to call on every load; awardPlanDayCompletionReward dedups per (instance, day).
  const todayDone = loaded?.runtime.todayDone ?? false;
  useEffect(() => {
    if (!loaded || !todayDone) {
      setDayComparison(null);
      return;
    }
    void awardPlanDayCompletionReward(loaded.state.planInstanceId, loaded.runtime.visibleDay.dayIndex);
    let alive = true;
    void loadPlanDayComparison().then((c) => { if (alive) setDayComparison(c); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayDone, visibleDayIndex]);

  const totalMinutes = useMemo(() => {
    if (!loaded) return 0;
    const visibleTasks = visibleTasksForMinutes(
      loaded.runtime.visibleDay,
      loaded.state.minutesPerDay,
      extraVisibleTaskCount,
      {
        mistakePracticeReadyCount: loaded.mistakePracticeReadyCount,
      },
    );
    return visibleTasks.reduce((sum, task) => sum + task.minutes, 0);
  }, [extraVisibleTaskCount, loaded]);

  // Reset the "show more tasks" expansion whenever the visible day changes.
  useEffect(() => {
    if (!loaded) return;
    setExtraVisibleTaskCount(0);
  }, [loaded?.runtime.visibleDay.dayIndex]);

  const openTask = (task: PlanDailyTask) => {
    if (!loaded) return;
    hapticTap();
    openPersonalPlanTask(router, loaded.plan, loaded.runtime.visibleDay, task, loaded.state.planInstanceId);
  };

  // Тап по баннеру «Сначала пройди урок N» открывает рекомендованный урок
  // (раньше баннер был неинтерактивный — нажатие ничего не делало, юзер не мог
  // найти этот урок). Открываем меню первого незакрытого урока-предпосылки.
  const openRecommendedLesson = () => {
    const firstId = lessonRecommendation?.recommendedLessonIds?.[0];
    if (firstId == null) return;
    hapticTap();
    router.push({ pathname: '/lesson_menu', params: { id: String(firstId) } });
  };

  // Loading state
  if (!loaded) {
    return (
      <View style={[styles.safe, { backgroundColor: screenBg, paddingTop: insets.top }]}>
        <LinearGradient colors={chrome.bg} style={styles.fill}>
          <View style={styles.loadingCenter}>
            <View style={[styles.loadingRing, { borderColor: chrome.accent + '33' }]}>
              <Ionicons name="map-outline" size={32} color={chrome.accent} />
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const { plan, runtime, snapshot, completedTasks } = loaded;
  const day = runtime.visibleDay;
  const addMoreOptions = {
    mistakePracticeReadyCount: loaded.mistakePracticeReadyCount,
  };
  const visibleTasks = visibleTasksForMinutes(day, loaded.state.minutesPerDay, extraVisibleTaskCount, addMoreOptions);
  const addMoreTask = nextTaskAfterVisibleSlice(day, loaded.state.minutesPerDay, extraVisibleTaskCount, addMoreOptions);
  const isTaskCompleted = (task: PlanDailyTask) =>
    Boolean(completedTasks[planTaskCompletionKey(loaded.state.planInstanceId, task.id)]);
  const visibleCompletedCount = visibleTasks.filter(isTaskCompleted).length;
  const visibleProgressPct = visibleTasks.length > 0
    ? Math.round((visibleCompletedCount / visibleTasks.length) * 100)
    : snapshot.dayProgressPct;
  const requiredTaskIds = new Set(runtime.tasks.map((task) => task.id));
  const optionalCompletedCount = allTasksForDay(day).filter((task) =>
    !requiredTaskIds.has(task.id) && isTaskCompleted(task)
  ).length;
  const visibleTasksDone = visibleTasks.length > 0 && visibleTasks.every((task) =>
    isTaskCompleted(task)
  );
  const canAddMoreTasks = Boolean(addMoreTask);
  const nextTask = visibleTasks.find((task) => !isTaskCompleted(task))
    ?? (visibleTasksDone && addMoreTask ? addMoreTask : visibleTasks[0])
    ?? null;
  const heroOpensTheory = Boolean(
    nextTask
      && hasBundledCompatibilityPlanContentTheoryEntry(loaded.plan.id, day.dayIndex)
      && visibleProgressPct === 0,
  );
  const heroShowsEnergyCost = Boolean(
    nextTask && !heroOpensTheory && personalPlanTaskStartsPaidExercise(nextTask),
  );

  // Real "days in a row" streak — same source the stats screen uses
  // (completed-task timestamps), not the plan day number. UTC todayKey to match
  // completedAt (new Date().toISOString()).
  const realStreakDays = trailingStreak(
    activeDayKeys(completedTasks as Record<string, PersonalPlanCompletedTask | unknown>, loaded.state.planInstanceId),
    new Date().toISOString().slice(0, 10),
  );

  return (
    // paddingTop НЕ ставим на корень — контент скроллится ПОД статус-баром (как на
    // главной/табах), а верхний фейд-маск рисует затухание под чёлкой.
    <View style={[styles.safe, { backgroundColor: screenBg }]}>
      <LinearGradient colors={chrome.bg} style={styles.fill}>
        {/* Тот же верхний фейд под safe-area, что на главной/табах. */}
        <TopFadeMask scrollY={fadeScrollY} zIndex={2} />
        <Reanimated.View style={[{ flex: 1 }, bouncyStyle]}>

        <BouncyWrap>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          bounces
          alwaysBounceVertical
          overScrollMode="always"
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 4 }]}
          style={{ opacity: entranceFade, transform: [{ translateY: entranceSlide }] }}
          scrollEventThrottle={16}
          onScroll={handlePlanScroll}
        >

        {/* ── Header (теперь внутри скролла — скроллится вся страница) ── */}
        <View style={styles.header}>
          <TapScale
            onPress={() => safeRouterBack(router, '/(tabs)/home' as any)}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Назад', en: 'Back', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
            style={[styles.back, { backgroundColor: chrome.taskSurface, borderColor: chrome.border }]}
          >
            <Ionicons name="chevron-back" size={22} color={chrome.text} />
          </TapScale>
          {/* Тексты названия плана и заголовка дня убраны из шапки — рядом с 4-5
              кнопками они уродливо ужимались/обрезались («АТЛА…», «Аэр о…»).
              Оставляем только кнопки и «День N». Пустой flex-разделитель держит
              кнопку «назад» слева, а блок кнопок — справа. */}
          <View style={styles.headerCopy} />
          {hasBundledCompatibilityPlanContentDay(loaded.plan.id, day.dayIndex) ? (
            <ReportErrorButton
              variant="icon-flag"
              screen="personal_plan_day"
              dataId={`${loaded.plan.id}_day_${day.dayIndex}`}
              dataText={triLang(lang, {
                  ru: `${plan.name} · День ${day.dayIndex}: ${day.title}`,
                  uk: `${plan.name} · День ${day.dayIndex}: ${day.title}`,
                  en: `${plan.name} · Day ${day.dayIndex}: ${day.title}`,
                  es: `${plan.name} · Día ${day.dayIndex}: ${day.title}`,
                  'pt-BR': `${plan.name} · Dia ${day.dayIndex}: ${day.title}`,
                  vi: `${plan.name} · Ngày ${day.dayIndex}: ${day.title}`,
                  id: `${plan.name} · Hari ${day.dayIndex}: ${day.title}`,
                  tr: `${plan.name} · Gün ${day.dayIndex}: ${day.title}`,
                  pl: `${plan.name} · Dzień ${day.dayIndex}: ${day.title}`,
              })}
              style={[styles.statsButton, { backgroundColor: chrome.taskSurface, borderColor: chrome.border, marginRight: 8 }]}
              textColor={chrome.accent}
            />
          ) : null}
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => { hapticTap(); setChangePlanConfirmVisible(true); }}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Сменить план', en: 'Change plan', uk: 'Змінити план', es: 'Cambiar de plan', 'pt-BR': 'Trocar de plano', vi: 'Đổi kế hoạch', id: 'Ganti rencana', tr: 'Planı değiştir', pl: 'Zmień plan' })}
            style={[styles.statsButton, { backgroundColor: chrome.taskSurface, borderColor: chrome.border, marginRight: 8 }]}
          >
            <Ionicons name="swap-horizontal" size={20} color={chrome.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => { hapticTap(); router.push('/personal_plan_stats_screen' as any); }}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Статистика плана', en: 'Plan stats', uk: 'Статистика плану', es: 'Estadísticas del plan', 'pt-BR': 'Estatísticas do plano', vi: 'Thống kê kế hoạch', id: 'Statistik rencana', tr: 'Plan istatistikleri', pl: 'Statystyki planu' })}
            style={[styles.statsButton, { backgroundColor: chrome.taskSurface, borderColor: chrome.border }]}
          >
            <Ionicons name="stats-chart" size={20} color={chrome.accent} />
          </TouchableOpacity>
          <StreakBadge streakDays={realStreakDays} dayIndex={day.dayIndex} chrome={chrome} lang={lang} />
        </View>

          <PersonalPlanSunsetNotice
            lang={lang}
            nowMs={sunsetNowMs}
            backgroundColor={chrome.taskSurface}
            borderColor={chrome.accent}
            textColor={chrome.text}
            mutedColor={chrome.muted}
            accentColor={chrome.accent}
          />

          {/* ── Hero card ── */}
          <LinearGradient colors={chrome.hero} style={[styles.heroCard, { borderColor: chrome.border }]}>
            {/* Top row */}
            <View style={styles.heroRow}>
              <ProgressRing pct={visibleProgressPct} chrome={chrome} lang={lang} />
              <View style={styles.heroCopy}>
                <View style={[styles.timePill, { backgroundColor: chrome.accentSoft, borderColor: chrome.border }]}>
                  <Ionicons name="time-outline" size={14} color={chrome.accent} />
                  <Text style={[styles.timePillText, { color: chrome.accent }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{triLang(lang, { ru: `${totalMinutes} мин сегодня`, en: `${totalMinutes} min today`, uk: `${totalMinutes} хв сьогодні`, es: `${totalMinutes} min hoy`, 'pt-BR': `${totalMinutes} min hoje`, vi: `${totalMinutes} phút hôm nay`, id: `${totalMinutes} mnt hari ini`, tr: `bugün ${totalMinutes} dk`, pl: `${totalMinutes} min dzisiaj` })}</Text>
                </View>
                {/* numberOfLines обязателен: heroCopy стоит в строке рядом с кольцом
                    прогресса; без клампа узкая колонка рвёт заголовок по буквам. */}
                <Text style={[styles.heroTitle, { color: chrome.text }]} numberOfLines={4}>
                  {nextTask ? nextTask.title : day.title}
                </Text>
              </View>
            </View>

            {/* Day progress bar */}
            <View style={[styles.heroDivider, { backgroundColor: chrome.border }]} />
            {/* Три колонки flex:1 с плотной сеткой. numberOfLines={1} держит каждую
                ячейку в одну строку — иначе длинная подпись «осн. +N доп.» или большой
                системный шрифт разбивали ячейку на 2 строки и колонки «прыгали» по высоте.
                maxFontSizeMultiplier ограничивает системный FONT_SCALE (на 1.30 сетка рвётся). */}
            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatValue, { color: chrome.text }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  {visibleCompletedCount}
                  /{visibleTasks.length}
                </Text>
                <Text style={[styles.heroStatLabel, { color: chrome.muted }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  {optionalCompletedCount > 0
                      ? triLang(lang, { ru: `осн. +${optionalCompletedCount} доп.`, en: `main +${optionalCompletedCount} extra`, uk: `осн. +${optionalCompletedCount} дод.`, es: `base +${optionalCompletedCount} extra`, 'pt-BR': `base +${optionalCompletedCount} extra`, vi: `cơ bản +${optionalCompletedCount} thêm`, id: `dasar +${optionalCompletedCount} ekstra`, tr: `temel +${optionalCompletedCount} ek`, pl: `podst. +${optionalCompletedCount} dod.` })
                      : triLang(lang, { ru: 'задач', en: 'tasks', uk: 'завдань', es: 'tareas', 'pt-BR': 'tarefas', vi: 'nhiệm vụ', id: 'tugas', tr: 'görev', pl: 'zadań' })}
                </Text>
              </View>
              <View style={[styles.heroStatDivider, { backgroundColor: chrome.border }]} />
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatValue, { color: chrome.text }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{triLang(lang, { ru: `День ${day.dayIndex}`, en: `Day ${day.dayIndex}`, uk: `День ${day.dayIndex}`, es: `Día ${day.dayIndex}`, 'pt-BR': `Dia ${day.dayIndex}`, vi: `Ngày ${day.dayIndex}`, id: `Hari ${day.dayIndex}`, tr: `${day.dayIndex}. gün`, pl: `Dzień ${day.dayIndex}` })}</Text>
                <Text style={[styles.heroStatLabel, { color: chrome.muted }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{triLang(lang, { ru: `${plan.horizonWeeks * 7} дней`, en: `${plan.horizonWeeks * 7} days`, uk: `${plan.horizonWeeks * 7} днів`, es: `${plan.horizonWeeks * 7} días`, 'pt-BR': `${plan.horizonWeeks * 7} dias`, vi: `${plan.horizonWeeks * 7} ngày`, id: `${plan.horizonWeeks * 7} hari`, tr: `${plan.horizonWeeks * 7} gün`, pl: `${plan.horizonWeeks * 7} dni` })}</Text>
              </View>
              <View style={[styles.heroStatDivider, { backgroundColor: chrome.border }]} />
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatValue, { color: chrome.text }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  {visibleProgressPct}%
                </Text>
                <Text style={[styles.heroStatLabel, { color: chrome.muted }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{triLang(lang, { ru: 'прогресс', en: 'progress', uk: 'прогрес', es: 'progreso', 'pt-BR': 'progresso', vi: 'tiến độ', id: 'progres', tr: 'ilerleme', pl: 'postęp' })}</Text>
              </View>
            </View>

            {/* CTA button — если день ещё не начат и есть теория, сначала теория */}
            <View style={{ position: 'relative', overflow: 'visible' }}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => {
                  if (!nextTask) return;
                  if (heroOpensTheory) {
                  hapticTap();
                  router.push({
                    pathname: '/personal_plan_theory',
                    params: {
                      planId: loaded.plan.id,
                      dayIndex: String(day.dayIndex),
                      startTaskId: nextTask.id,
                      ...(loaded.state.planInstanceId ? { planInstanceId: loaded.state.planInstanceId } : {}),
                    },
                  } as any);
                  } else {
                    openTask(nextTask);
                  }
                }}
                accessibilityRole="button"
                style={styles.heroButtonWrap}
              >
                <LinearGradient colors={[chrome.accent2, chrome.accent]} style={styles.heroButton}>
                {/* День закрыт (visibleTasksDone): кнопка НЕ ведёт дальше по плану,
                    а даёт повторить материал или взять доп. практику. Текст «Продолжить»
                    путал — звучал как переход к следующему шагу. Различаем два случая:
                    есть доп. задание → «Ещё практика» (откроется НОВОЕ задание, иконка play),
                    доп. заданий нет → «Повторить» (повтор первой задачи, иконка refresh). */}
                <Ionicons
                  name={visibleTasksDone ? (canAddMoreTasks ? 'play' : 'refresh-outline') : 'play'}
                  size={22}
                  color={chrome.buttonText}
                />
                <Text style={[styles.heroButtonText, { color: chrome.buttonText }]}>
                  {visibleTasksDone
                    ? (canAddMoreTasks
                        ? triLang(lang, { ru: 'Ещё практика', en: 'More practice', uk: 'Ще практика', es: 'Más práctica', 'pt-BR': 'Mais prática', vi: 'Luyện thêm', id: 'Latihan lagi', tr: 'Daha fazla pratik', pl: 'Więcej praktyki' })
                        : triLang(lang, { ru: 'Повторить', en: 'Repeat', uk: 'Повторити', es: 'Repetir', 'pt-BR': 'Repetir', vi: 'Làm lại', id: 'Ulangi', tr: 'Tekrarla', pl: 'Powtórz' }))
                    : nextTask
                      ? triLang(lang, { ru: 'Начать задание', en: 'Start task', uk: 'Почати завдання', es: 'Empezar tarea', 'pt-BR': 'Começar tarefa', vi: 'Bắt đầu nhiệm vụ', id: 'Mulai tugas', tr: 'Göreve başla', pl: 'Rozpocznij zadanie' })
                      : triLang(lang, { ru: 'Начать', en: 'Start', uk: 'Почати', es: 'Empezar', 'pt-BR': 'Começar', vi: 'Bắt đầu', id: 'Mulai', tr: 'Başla', pl: 'Rozpocznij' })}
                </Text>
                </LinearGradient>
              </TouchableOpacity>
              {heroShowsEnergyCost ? <EnergyCostBadge testID="personal-plan-hero-energy-cost" /> : null}
            </View>
          </LinearGradient>

          {/* ── Recommended lessons banner (tappable → opens the first lesson) ── */}
          {lessonRecommendation && lessonRecommendation.recommendedLessonIds.length > 0 ? (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={openRecommendedLesson}
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, { ru: `Открыть урок ${lessonRecommendation.recommendedLessonIds[0]}`, uk: `Відкрити урок ${lessonRecommendation.recommendedLessonIds[0]}`, en: `Open lesson ${lessonRecommendation.recommendedLessonIds[0]}`, es: `Abrir lección ${lessonRecommendation.recommendedLessonIds[0]}`, 'pt-BR': `Abrir lição ${lessonRecommendation.recommendedLessonIds[0]}`, vi: `Mở bài học ${lessonRecommendation.recommendedLessonIds[0]}`, id: `Buka pelajaran ${lessonRecommendation.recommendedLessonIds[0]}`, tr: `${lessonRecommendation.recommendedLessonIds[0]}. dersi aç`, pl: `Otwórz lekcję ${lessonRecommendation.recommendedLessonIds[0]}` })}
              style={[styles.recommendBanner, { borderColor: chrome.border, backgroundColor: chrome.accentSoft }]}
            >
              <View style={[styles.recommendIconWrap, { backgroundColor: chrome.accent + '18', borderColor: chrome.accent + '33' }]}>
                <Ionicons name="school-outline" size={22} color={chrome.accent} />
              </View>
              <View style={styles.recommendCopy}>
                <Text style={[styles.recommendTitle, { color: chrome.text }]}>
                  {triLang(lang, {
                      ru: `Рекомендуем ${lessonRecommendation.recommendedLessonIds.length === 1 ? 'урок' : 'уроки'} ${formatLessonList(lessonRecommendation.recommendedLessonIds)}`,
                      uk: `Рекомендуємо ${lessonRecommendation.recommendedLessonIds.length === 1 ? 'урок' : 'уроки'} ${formatLessonList(lessonRecommendation.recommendedLessonIds)}`,
                      en: `We recommend ${lessonRecommendation.recommendedLessonIds.length === 1 ? 'lesson' : 'lessons'} ${formatLessonList(lessonRecommendation.recommendedLessonIds)}`,
                      es: `Te recomendamos la lección ${formatLessonList(lessonRecommendation.recommendedLessonIds)}`,
                      'pt-BR': `Recomendamos a lição ${formatLessonList(lessonRecommendation.recommendedLessonIds)}`,
                      vi: `Chúng tôi gợi ý bài học ${formatLessonList(lessonRecommendation.recommendedLessonIds)}`,
                      id: `Kami merekomendasikan pelajaran ${formatLessonList(lessonRecommendation.recommendedLessonIds)}`,
                      tr: `${formatLessonList(lessonRecommendation.recommendedLessonIds)} dersini öneriyoruz`,
                      pl: `Polecamy lekcję ${formatLessonList(lessonRecommendation.recommendedLessonIds)}`,
                  })}
                </Text>
                <Text style={[styles.recommendText, { color: chrome.accent }]} numberOfLines={2}>
                  {lessonRecommendation.recommendedLessonIds.length === 1
                    ? triLang(lang, { ru: 'Переход к уроку из списка →', uk: 'Перехід до уроку зі списку →', en: 'Go to the lesson from the list →', es: 'Ir a la lección de la lista →', 'pt-BR': 'Ir para a lição da lista →', vi: 'Chuyển đến bài học trong danh sách →', id: 'Buka pelajaran dari daftar →', tr: 'Listedeki derse git →', pl: 'Przejdź do lekcji z listy →' })
                    : triLang(lang, { ru: 'Переход к первому уроку из списка →', uk: 'Перехід до першого уроку зі списку →', en: 'Go to the first lesson from the list →', es: 'Ir a la primera lección de la lista →', 'pt-BR': 'Ir para a primeira lição da lista →', vi: 'Chuyển đến bài học đầu tiên trong danh sách →', id: 'Buka pelajaran pertama dari daftar →', tr: 'Listedeki ilk derse git →', pl: 'Przejdź do pierwszej lekcji z listy →' })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={chrome.accent} style={{ alignSelf: 'center' }} />
            </TouchableOpacity>
          ) : null}

          {/* ── All done banner ── */}
          {runtime.todayDone ? (
            <View style={[styles.doneBanner, { borderColor: chrome.border, backgroundColor: chrome.accentSoft }]}>
              <View style={[styles.doneIconWrap, { backgroundColor: chrome.accent + '18', borderColor: chrome.accent + '33' }]}>
                <Ionicons name="checkmark-circle-outline" size={26} color={chrome.accent} />
              </View>
              <View style={styles.doneCopy}>
                <Text style={[styles.doneTitle, { color: chrome.text }]}>{triLang(lang, { ru: 'День закрыт', uk: 'День закрито', en: 'Day complete', es: 'Día completado', 'pt-BR': 'Dia concluído', vi: 'Ngày đã hoàn thành', id: 'Hari selesai', tr: 'Gün tamamlandı', pl: 'Dzień zamknięty' })}</Text>
                <Text style={[styles.doneSub, { color: chrome.muted }]}>
                  {dayComparison
                    ? triLang(lang, {
                        ru: `${planDayComparisonLine(dayComparison)}. Завтра откроется следующий шаг.`,
                        uk: `${planDayComparisonLine(dayComparison)}. Завтра відкриється наступний крок.`,
                        es: `${planDayComparisonLine(dayComparison)}. Mañana se abrirá el siguiente paso.`,
                        'pt-BR': `${planDayComparisonLine(dayComparison)}. Amanhã o próximo passo será liberado.`,
                        vi: `${planDayComparisonLine(dayComparison)}. Ngày mai bước tiếp theo sẽ mở ra.`,
                        id: `${planDayComparisonLine(dayComparison)}. Besok langkah berikutnya akan terbuka.`,
                        tr: `${planDayComparisonLine(dayComparison)}. Yarın bir sonraki adım açılacak.`,
                        pl: `${planDayComparisonLine(dayComparison)}. Jutro otworzy się kolejny krok.`,
                    })
                    : triLang(lang, { ru: 'Завтра откроется следующий шаг. Сегодня можно дополнительно потренироваться.', uk: 'Завтра відкриється наступний крок. Сьогодні можна додатково потренуватися.', es: 'Mañana se abrirá el siguiente paso. Hoy puedes practicar más si quieres.', 'pt-BR': 'Amanhã o próximo passo será liberado. Hoje você pode praticar mais se quiser.', vi: 'Ngày mai bước tiếp theo sẽ mở ra. Hôm nay bạn có thể luyện tập thêm.', id: 'Besok langkah berikutnya akan terbuka. Hari ini kamu bisa berlatih lebih banyak.', tr: 'Yarın bir sonraki adım açılacak. Bugün ekstra pratik yapabilirsin.', pl: 'Jutro otworzy się kolejny krok. Dziś możesz dodatkowo poćwiczyć.' })}
                </Text>
              </View>
            </View>
          ) : null}

          {/* ── Day tasks ── */}
          <LinearGradient colors={chrome.card} style={[styles.sectionCard, { borderColor: chrome.border }]}>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => { hapticTap(); setTasksExpanded((v) => !v); }}
              accessibilityRole="button"
              accessibilityState={{ expanded: tasksExpanded }}
              style={styles.sectionHeader}
            >
              <View>
                <Text style={[styles.sectionKicker, { color: chrome.accent }]}>{triLang(lang, { ru: 'Задачи дня', uk: 'Завдання дня', es: 'Tareas del día', 'pt-BR': 'Tarefas do dia', vi: 'Nhiệm vụ trong ngày', id: 'Tugas hari ini', tr: 'Günün görevleri', pl: 'Zadania dnia' })}</Text>
                <Text style={[styles.sectionTitle, { color: chrome.text }]}>{triLang(lang, { ru: 'Сегодня', uk: 'Сьогодні', es: 'Hoy', 'pt-BR': 'Hoje', vi: 'Hôm nay', id: 'Hari ini', tr: 'Bugün', pl: 'Dzisiaj' })}</Text>
              </View>
              <View style={styles.sectionHeaderRight}>
                <View style={[styles.countBadge, { backgroundColor: chrome.accentSoft, borderColor: chrome.border }]}>
                  <Text style={[styles.countBadgeText, { color: chrome.accent }]}>{visibleTasks.length}</Text>
                </View>
                <Ionicons name={tasksExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={chrome.muted} />
              </View>
            </TouchableOpacity>

            {tasksExpanded ? (
              <View style={styles.taskList}>
                {visibleTasks.map((task, idx) => {
                  const completed = Boolean(completedTasks[planTaskCompletionKey(loaded.state.planInstanceId, task.id)]);
                  const isNext = task === nextTask;
                  return (
                    <TaskRow
                      key={task.id}
                      task={task}
                      planId={loaded.plan.id}
                      themeMode={themeMode}
                      completed={completed}
                      isNext={isNext}
                      chrome={chrome}
                      onPress={() => openTask(task)}
                      showEnergyCost={personalPlanTaskStartsPaidExercise(task)}
                      lang={lang}
                    />
                  );
                })}
                {canAddMoreTasks ? (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={() => { hapticTap(); setExtraVisibleTaskCount((c) => c + 1); }}
                    style={[styles.addMoreRow, { borderColor: chrome.border }]}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={chrome.accent} />
                    <Text style={[styles.addMoreText, { color: chrome.accent }]}>{triLang(lang, { ru: 'Добавить ещё задание', uk: 'Додати ще завдання', es: 'Añadir otra tarea', 'pt-BR': 'Adicionar outra tarefa', vi: 'Thêm nhiệm vụ khác', id: 'Tambah tugas lagi', tr: 'Başka görev ekle', pl: 'Dodaj kolejne zadanie' })}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </LinearGradient>

          {/* ── DEV ── */}
          {ENABLE_DEV_TOOLS ? (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => { hapticTap(); router.push('/personal_plan_dev' as any); }}
              style={[styles.devLink, { borderColor: chrome.border, backgroundColor: chrome.taskSurface }]}
            >
              <Ionicons name="construct-outline" size={15} color={chrome.accent} />
              <Text style={[styles.devLinkText, { color: chrome.accent }]}>DEV</Text>
            </TouchableOpacity>
          ) : null}
        </Animated.ScrollView>
        </BouncyWrap>

        {/* Подтверждение смены плана: новый план стартует с дня 1, прогресс текущего сбрасывается. */}
        <Modal
          visible={changePlanConfirmVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setChangePlanConfirmVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setChangePlanConfirmVisible(false)}
            style={styles.changePlanBackdrop}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}}
              style={[styles.changePlanCard, { backgroundColor: chrome.card[0], borderColor: chrome.border }]}
            >
              <View style={[styles.changePlanIconWrap, { backgroundColor: chrome.accent + '18', borderColor: chrome.accent + '33' }]}>
                <Ionicons name="swap-horizontal" size={24} color={chrome.accent} />
              </View>
              <Text style={[styles.changePlanTitle, { color: chrome.text }]}>{triLang(lang, { ru: 'Сменить план?', uk: 'Змінити план?', es: '¿Cambiar de plan?', 'pt-BR': 'Trocar de plano?', vi: 'Đổi kế hoạch?', id: 'Ganti rencana?', tr: 'Plan değiştirilsin mi?', pl: 'Zmienić plan?' })}</Text>
              <Text style={[styles.changePlanBody, { color: chrome.muted }]}>
                {/* зачем (аудит по Библии, 2026-08-26): предупреждение нужное и честное, но
                    «весь прогресс будет потерян» пугало длинной фразой. Правило 4
                    (до 10 слов) и словарь (прогресс → путь): смысл сохранён,
                    подача спокойная. */}
                {triLang(lang, { ru: 'Новый план начнётся с первого дня. Пройденное в старом не переносится.', uk: 'Новий план почнеться з першого дня. Пройдене у старому не переноситься.', es: 'El nuevo plan empieza desde el día uno. Lo hecho en el anterior no se traslada.', 'pt-BR': 'O novo plano começa do dia um. O que foi feito no anterior não é transferido.', vi: 'Kế hoạch mới bắt đầu từ ngày đầu. Phần đã học ở kế hoạch cũ không chuyển sang.', id: 'Rencana baru mulai dari hari pertama. Yang sudah dilalui tidak ikut pindah.', tr: 'Yeni plan ilk günden başlar. Eski planda yapılanlar aktarılmaz.', pl: 'Nowy plan zacznie się od pierwszego dnia. Przerobione w starym nie przechodzi.' })}
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  hapticTap();
                  setChangePlanConfirmVisible(false);
                  // directToPlans=1 → сразу список планов, без повторного опроса.
                  router.push({ pathname: '/personal_plan_setup', params: { directToPlans: '1' } } as any);
                }}
                style={[styles.changePlanPrimary, { backgroundColor: chrome.accent }]}
              >
                <Text style={[styles.changePlanPrimaryText, { color: chrome.buttonText }]}>{triLang(lang, { ru: 'Выбрать другой план', uk: 'Обрати інший план', es: 'Elegir otro plan', 'pt-BR': 'Escolher outro plano', vi: 'Chọn kế hoạch khác', id: 'Pilih rencana lain', tr: 'Başka bir plan seç', pl: 'Wybierz inny plan' })}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => { hapticTap(); setChangePlanConfirmVisible(false); }}
                style={styles.changePlanSecondary}
              >
                <Text style={[styles.changePlanSecondaryText, { color: chrome.muted }]}>{triLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj' })}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
        </Reanimated.View>
      </LinearGradient>
    </View>
  );
}

export default withPersonalPlanSunsetGuard(PersonalPlanScreen);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  changePlanBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  changePlanCard: { width: '100%', maxWidth: 420, borderRadius: 22, borderWidth: 0, padding: 22, alignItems: 'center' },
  changePlanIconWrap: { width: 52, height: 52, borderRadius: 16, borderWidth: 0, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  changePlanTitle: { fontSize: 19, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  changePlanBody: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  changePlanPrimary: { width: '100%', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  changePlanPrimaryText: { fontSize: 15, fontWeight: '800' },
  changePlanSecondary: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  changePlanSecondaryText: { fontSize: 14, fontWeight: '600' },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 0, alignItems: 'center', justifyContent: 'center',
  },
  header: {
    // Горизонтальный отступ даёт контейнер скролла (styles.scroll), здесь 0,
    // иначе двойной паддинг. Header теперь часть скролла.
    paddingHorizontal: 0,
    paddingTop: 2,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: {
    width: 46, height: 46,
    borderRadius: 14, borderWidth: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  statsButton: {
    width: 44, height: 44,
    borderRadius: 14, borderWidth: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCopy: { flex: 1, minWidth: 0 },
  headerKicker: {
    fontSize: 11, lineHeight: 14, fontWeight: '900',
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  headerTitle: { fontSize: 22, lineHeight: 27, fontWeight: '900', marginTop: 1 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 16, borderWidth: 0,
  },
  streakText: { fontSize: 12, lineHeight: 15, fontWeight: '900' },
  scroll: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 40, gap: 12 },

  // Hero
  heroCard: {
    borderRadius: 14, borderWidth: 0,
    padding: 18, gap: 0,
    ...noAndroidOutline, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 20,
  },
  heroRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  progressRing: {
    width: RING_SIZE, height: RING_SIZE,
    borderRadius: RING_SIZE / 2, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  ringPct: { fontSize: 24, lineHeight: 28, fontWeight: '900' },
  // 100% = 4 широких символа; в круге Ø≈82px кегль 24 налезал на обводку. Для
  // трёхзначного значения уменьшаем до 19/22, чтобы «100%» помещалось целиком.
  ringPctFull: { fontSize: 19, lineHeight: 22 },
  ringLabel: { fontSize: 10, lineHeight: 13, fontWeight: '900', textTransform: 'uppercase', marginTop: 1 },
  heroCopy: { flex: 1, minWidth: 0, paddingTop: 2 },
  timePill: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 0,
  },
  timePillText: { fontSize: 12, lineHeight: 15, fontWeight: '900' },
  heroFocus: { marginTop: 8, fontSize: 11, lineHeight: 14, fontWeight: '800', textTransform: 'uppercase' },
  heroTitle: { marginTop: 6, fontSize: 20, lineHeight: 25, fontWeight: '900' },
  heroDivider: { height: 1, marginVertical: 16 },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStatItem: { flex: 1, alignItems: 'center', gap: 2 },
  heroStatValue: { fontSize: 16, lineHeight: 20, fontWeight: '900' },
  heroStatLabel: { fontSize: 11, lineHeight: 14, fontWeight: '800' },
  heroStatDivider: { width: 1, height: 32 },
  heroButtonWrap: { marginTop: 16 },
  heroButton: {
    height: 62, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  heroButtonText: { fontSize: 18, lineHeight: 22, fontWeight: '900' },

  // Done banner
  doneBanner: {
    borderRadius: 14, borderWidth: 0,
    padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start',
  },
  doneIconWrap: {
    width: 46, height: 46, borderRadius: 14, borderWidth: 0,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  doneCopy: { flex: 1, minWidth: 0 },
  doneTitle: { fontSize: 15, lineHeight: 20, fontWeight: '900' },
  doneSub: { marginTop: 3, fontSize: 13, lineHeight: 18, fontWeight: '700' },

  recommendBanner: {
    borderRadius: 14, borderWidth: 0,
    padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    marginTop: 12,
  },
  recommendIconWrap: {
    width: 46, height: 46, borderRadius: 14, borderWidth: 0,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  recommendCopy: { flex: 1, minWidth: 0 },
  recommendTitle: { fontSize: 15, lineHeight: 20, fontWeight: '900' },
  recommendText: { marginTop: 3, fontSize: 13, lineHeight: 18, fontWeight: '700' },

  // Section cards
  sectionCard: { borderRadius: 14, borderWidth: 0, padding: 16, overflow: 'hidden' },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 12, marginBottom: 14,
  },
  sectionKicker: { fontSize: 11, lineHeight: 14, fontWeight: '900', textTransform: 'uppercase' },
  sectionTitle: { fontSize: 20, lineHeight: 25, fontWeight: '900', marginTop: 2 },
  sectionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: {
    minWidth: 36, height: 36, borderRadius: 18, borderWidth: 0,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  countBadgeText: { fontSize: 15, lineHeight: 19, fontWeight: '900' },

  // Tasks
  taskList: { gap: 8 },
  taskRow: {
    minHeight: 70, borderRadius: 14, borderWidth: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, gap: 12,
  },
  taskIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  // Обёртка для готовой иконки-плитки: без рамки/фона, только клип по радиусу,
  // чтобы плитка садилась ровно, а не «рамкой в рамке».
  taskIconImageWrap: { overflow: 'hidden', backgroundColor: 'transparent' },
  taskImage: { width: 48, height: 48 },
  taskCopy: { flex: 1, minWidth: 0 },
  taskTitle: { fontSize: 16, lineHeight: 21, fontWeight: '900' },
  taskSub: { marginTop: 2, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  taskRight: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    flexShrink: 0, width: 52, justifyContent: 'flex-end',
  },
  taskMinutes: { fontSize: 12, lineHeight: 15, fontWeight: '900' },
  nextBadge: {
    width: 30, height: 30, alignItems: 'center', justifyContent: 'center',
  },
  nextBadgeText: { fontSize: 16, fontWeight: '900' },
  addMoreRow: {
    height: 48, borderRadius: 14, borderWidth: 0, borderStyle: 'dashed',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 4,
  },
  addMoreText: { fontSize: 14, lineHeight: 18, fontWeight: '900' },

  // Day rail

  // Dev
  devLink: {
    height: 38, borderRadius: 12, borderWidth: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  devLinkText: { fontSize: 11, fontWeight: '900' },
});
