import React, { Profiler, useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Freeze } from 'react-freeze';
import { useFocusEffect, useNavigationContainerRef, usePathname, useRouter, useSegments } from 'expo-router';
import { View, StyleSheet, Animated, AppState, Easing } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import { triLang, type PlannedTriLangCopy } from '../../constants/i18n';
import { useScreen } from '../../hooks/use-screen';
import ScreenGradient from '../../components/ScreenGradient';
import TopFadeMask from '../../components/TopFadeMask';
import { TopFadeScrollProvider, useTopFadeScroll } from '../../components/TopFadeScrollContext';
import { DeferredRedirect } from '../../components/DeferredRedirect';
import TabSlider from '../TabSlider';
import { TabProvider, useTabNav } from '../TabContext';
import { createTapLatencyProfilerHandler, noteTapAction } from '../tap_latency_trace';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { HOME_ENTRANCE } from '../../constants/motion';
import { TabBarVisibilityProvider, useTabBarVisibility } from '../../components/TabBarVisibilityContext';
import V2TabBar, { V2_TAB_BAR_HEIGHT, type V2TabBarItem } from '../../components/v2/V2TabBar';
import { useCommunityTabDot } from '../../hooks/use_community_tab_dot';
import { FLOATING_PILL_BOTTOM_GAP } from '../../hooks/use-tab-content-bottom-pad';
import { emitAppEvent, onAppEvent } from '../events';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { PerfR1Profile, useMountTrace, useNavActionTrace } from '../perf_r1_probe';
import { setTabsShellMounted } from '../tabs_shell_state';
import { whenHomePainted } from '../home_paint_marker';
// Home stays behind the tab shell until React can commit the first frame. Its
// screen/data tree is large enough that evaluating it synchronously delays boot.
// Starting the promise here overlaps the module fetch/evaluation with the root
// bootstrap while keeping Home out of the synchronous dependency graph.
const homeScreenModulePromise = import('./home');
const HomeScreen = React.lazy(() => homeScreenModulePromise);

function HomeScreenHost({ onOpenDevHub }: { onOpenDevHub: () => void }) {
  useMountTrace('home_host'); // зачем (R1, двойной монтаж Главной): ярус между каркасом табов и экраном Главной
  // The dynamically evaluated Home bundle has its own event-module lifetime in
  // Metro dev mode. Emit from this static tab shell as well so the root splash
  // gate cannot miss the first committed Home frame.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      emitAppEvent('app_home_screen_ready');
      emitAppEvent('app_first_content_ready');
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return <PerfR1Profile id="home"><HomeScreen onOpenDevHub={onOpenDevHub} /></PerfR1Profile>; // зачем (R1): чистое время рендера Главной отдельно от ожидания очереди
}
import DevHubSheetGate from '../../components/dev/DevHubSheetGate';
import { subscribeOpenDevHub } from '../dev_hub_bus';
import { ENABLE_DEV_TOOLS } from '../config';
import {
  captureAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from '../account_generation';
import {
  applyLessonsReconcile,
  computeLessonsCover,
  failClosedLessons,
  nextActivatedEpoch,
  type LessonsPrivacyState,
} from '../lessons_privacy_epoch';
import {
  setExamBestPctTabActivity,
} from '../exam_best_pct_overlay';
import {
  isLogicalTabHidden,
  logicalTabToPhysicalPage,
  physicalPageCount,
  physicalPageToLogicalTab,
  physicalPageToRuntimeOwner,
  tabPageLayoutFor,
  type PhysicalPageIndex,
  type TabPageLayout,
} from '../tab_page_model';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { isLearnTabVisibleForTarget } from '../learning_language_surface_readiness';
import { shouldLoadTabScreen } from '../tab_mount_policy';
import { whenOnboardingSettled } from '../onboarding_defer_gate';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type TabScreenProps = {
  overlayIdentityEpoch?: number;
  presentation?: 'tab' | 'push';
};
type TabScreenComponent = React.ComponentType<TabScreenProps>;
type DeferredTabModule = { default: TabScreenComponent };
type CancelableTask = { cancel?: () => void };

let deferredLessonsScreen: TabScreenComponent | null = null;
let deferredVideoScreen: TabScreenComponent | null = null;
let deferredCommunityScreen: TabScreenComponent | null = null;
let deferredSettingsScreen: TabScreenComponent | null = null;

function loadLessonsScreen(): TabScreenComponent {
  deferredLessonsScreen ??= (require('./lessons') as DeferredTabModule).default;
  return deferredLessonsScreen;
}

// зачем (2.0, D39): таббар «Главная · Обучение · Видео · Сообщество · Настройки».
// Арена ушла из таббара (консервация PM-036), Друзья — раздел «Сообщества».
function loadVideoScreen(): TabScreenComponent {
  deferredVideoScreen ??= (require('./video') as DeferredTabModule).default;
  return deferredVideoScreen;
}

function loadCommunityScreen(): TabScreenComponent {
  deferredCommunityScreen ??= (require('./community') as DeferredTabModule).default;
  return deferredCommunityScreen;
}

function loadSettingsScreen(): TabScreenComponent {
  deferredSettingsScreen ??= (require('./settings') as DeferredTabModule).default;
  return deferredSettingsScreen;
}

function loadDeferredTabScreenByIndex(idx: number): TabScreenComponent | null {
  switch (idx) {
    case 1: return loadLessonsScreen();
    case 2: return loadVideoScreen();
    case 3: return loadCommunityScreen();
    case 4: return loadSettingsScreen();
    default: return null;
  }
}

function prewarmDeferredTabScreen(idx: number): boolean {
  try {
    loadDeferredTabScreenByIndex(idx);
    return true;
  } catch (error) {
    // зачем: раньше ошибка глоталась молча и вкладка навсегда оставалась пустой —
    // ни экрана, ни причины. Прогрев остаётся необязательным (вызывающий его код
    // больше не считает неудачу запретом на показ), но сама ошибка обязана быть
    // видна в логах, иначе следующий такой баг снова будут искать вслепую.
    if (__DEV__) console.warn(`[tabs] prewarm failed for tab ${idx}:`, error);
    return false;
  }
}

// зачем: трассировка [TAP-LAT] — Profiler вокруг содержимого панели таба показывает,
// сколько раз и как долго React рендерил панель после тапа/возврата (разморозка,
// каскады setState). Обёртка живёт ВНЕ TabPane, чтобы не трогать контракт
// «<Freeze freeze={freezeActive}>{children}</Freeze>» (tab_freeze_handoff_contract).
// Когда трассировка выключена — обработчика нет и дети рендерятся как есть.
const tapLatencyProfilerOnRender = createTapLatencyProfilerHandler();
function TabRenderProbe({ id, children }: { id: string; children: React.ReactNode }) {
  if (!tapLatencyProfilerOnRender) return <>{children}</>;
  return <Profiler id={id} onRender={tapLatencyProfilerOnRender}>{children}</Profiler>;
}

function DeferredTabScreen({
  shouldLoad,
  loadScreen,
  screenProps,
}: {
  shouldLoad: boolean;
  loadScreen: () => TabScreenComponent;
  screenProps?: TabScreenProps;
}) {
  const { theme: t } = useTheme();
  const Screen = shouldLoad ? loadScreen() : null;
  if (!Screen) return <View style={[s.deferredTabPlaceholder, { backgroundColor: t.bgPrimary }]} collapsable={false} />;
  return <Screen {...screenProps} />;
}

/**
 * Панель таба с заморозкой невидимого содержимого.
 *
 * Freeze включается только ПОСЛЕ незамороженного коммита. Это нужно не только при
 * первом премаунте: при прямом прыжке через несколько вкладок runtimeOwnerId и
 * freezeWanted меняются одним родительским коммитом. react-freeze приостановил бы
 * исходящее поддерево раньше, чем оно увидит потерю ownership и выполнит cleanup.
 * Поэтому false -> true сначала коммитит children незамороженными, а пассивный
 * effect вооружает Freeze следующим коммитом. false размораживает синхронно.
 */
function TabPane({ freezeWanted, children }: { freezeWanted: boolean; children: React.ReactNode }) {
  const [freezeCommitted, setFreezeCommitted] = useState(false);
  useEffect(() => { setFreezeCommitted(freezeWanted); }, [freezeWanted]);
  const freezeActive = ENABLE_TAB_FREEZE && freezeWanted && freezeCommitted;
  return <Freeze freeze={freezeActive}>{children}</Freeze>;
}

function LessonsPaneBoundary({
  freezeWanted,
  shouldLoad,
}: {
  freezeWanted: boolean;
  shouldLoad: boolean;
}) {
  const { theme: t } = useTheme();
  const renderToken = useRef(captureAccountGeneration()).current;
  const previousTokenRef = useRef(renderToken);
  const activatedEpochRef = useRef(0);
  const [privacy, setPrivacy] = useState<LessonsPrivacyState>({
    epoch: 0,
    phase: renderToken.phase,
    failClosed: false,
  });

  useLayoutEffect(() => {
    const failClosed = () => {
      console.warn('[LESSONS-EPOCH] bump', JSON.stringify({ reason: 'subscription_failed', nextPhase: 'transitioning' })); // guard-ok: сбой подписки закрывает вкладку
      setPrivacy((previous) => failClosedLessons(previous));
    };
    const reconcile = (next: AccountGenerationToken) => {
      try {
        const previous = previousTokenRef.current;
        previousTokenRef.current = next;
        // зачем (B1, §AUTH-0070, п.73): правило роста эпохи — в app/lessons_privacy_epoch.ts (чистая функция, проверена тестом). Эпоха растёт только при
        // уходе из active, при новом active и при сбое подписки; «смена → смена» лишь обновляет фазу, и вкладка не пересобирается 7 раз за вход.
        // Первое усыновление владельца (uninitialized → active) эпоху не растит, но фазу записывает (иначе вкладка навсегда оставалась закрытой).
        setPrivacy((current) => {
          const { state, decision } = applyLessonsReconcile(current, previous, next);
          console.log('[LESSONS-EPOCH]', decision.bump ? 'bump' : 'skip', JSON.stringify({ // guard-ok: трассировка роста эпохи вкладки уроков
            reason: decision.reason, prevPhase: previous.phase, nextPhase: next.phase, generation: next.generation, epoch: state.epoch,
          }));
          return state;
        });
      } catch (error) {
        console.warn('[LESSONS-EPOCH] ошибка reconcile → fail-closed', String(error)); // guard-ok: catch логируется
        failClosed();
      }
    };

    try {
      const subscription = subscribeAccountGeneration(reconcile);
      reconcile(captureAccountGeneration());
      return () => subscription.remove();
    } catch {
      failClosed();
      return undefined;
    }
  }, [renderToken]);

  // зачем: крышка снималась только когда таб уже АКТИВЕН (isActive). Но вкладка
  // премаунтится в фоне и в момент премаунта неактивна — эпоха не «усыновлялась»,
  // и при первом открытии список был закрыт глухой заливкой bgPrimary (пустой
  // экран), пока какой-нибудь перерендер не совпал с isActive. Приватность держит
  // phase: 'active' означает, что владелец уже известен и это НЕ переходное
  // состояние между аккаунтами, поэтому смотреть на видимость таба здесь не нужно.
  activatedEpochRef.current = nextActivatedEpoch(privacy, activatedEpochRef.current);
  // зачем (аудит скорости): крышка закрывала вкладку и на ХОЛОДНОМ СТАРТЕ, пока
  // phase === 'uninitialized'. Владелец видел это как «Уроки открываются долго»:
  // экран уже смонтирован и синхронно гидратирован снимком, но поверх лежала
  // глухая заливка, пока stable_id асинхронно читался из SecureStore.
  //
  // Приватность при этом НЕ ослаблена. Крышка нужна против показа данных ЧУЖОГО
  // аккаунта, а такой риск существует только при переходе между аккаунтами —
  // это фаза 'transitioning' (invalidateAccountGeneration) и рост epoch; оба
  // случая закрыты ниже по-прежнему. В 'uninitialized' чужих данных физически
  // нет: и lessons_tab_state, и сессионный кэш списка заштампованы поколением и
  // при первом старте пусты, поэтому показывать под крышкой нечего — там ровно
  // тот же фон. fail-closed на ошибке подписки тоже сохранён.
  const coverLessons = computeLessonsCover(privacy, activatedEpochRef.current);

  return (
    <View style={[s.lessonsPaneBoundary, { backgroundColor: t.bgPrimary }]} collapsable={false}>
      <View
        style={s.lessonsPaneContent}
        accessibilityElementsHidden={coverLessons}
        importantForAccessibility={coverLessons ? 'no-hide-descendants' : 'auto'}
        pointerEvents={coverLessons ? 'none' : 'auto'}
      >
        <TabPane freezeWanted={freezeWanted}>
          <TabRenderProbe id="tab:lessons">
            {/* зачем (R1, «Уроки 3,6 с»): чистое время рендера экрана Уроков отдельно от ожидания очереди JS-потока */}
            <PerfR1Profile id="lessons">
              <DeferredTabScreen
                key={`lessons-${privacy.epoch}`}
                shouldLoad={shouldLoad}
                loadScreen={loadLessonsScreen}
                screenProps={{ overlayIdentityEpoch: privacy.epoch, presentation: 'tab' }}
              />
            </PerfR1Profile>
          </TabRenderProbe>
        </TabPane>
      </View>
      {coverLessons ? (
        <View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: t.bgPrimary }]}
          pointerEvents="auto"
          accessible={false}
        />
      ) : null}
    </View>
  );
}

function markExamBestPctTabActivity(idx: number): void {
  setExamBestPctTabActivity(idx === 0 ? 'safe_home' : 'unsafe');
}

type TabLabelCopy = { ru: string; uk: string; es: string; en: string } & PlannedTriLangCopy;

type TabDef = {
  key: string;
  icon: IconName;
  active: IconName;
  label: TabLabelCopy;
};

/** Суффиксы основных табов. `/journal` остаётся legacy-якорем вкладки уроков.
 *  `/friends` — старый адрес, теперь раздел «Друзья» во вкладке «Сообщество»;
 *  `/arena` — законсервированная Арена (PM-036), старые ссылки ведут на Главную. */
const TAB_PATH_SUFFIXES = ['/home', '/journal', '/lessons', '/video', '/community', '/friends', '/arena', '/settings'] as const;

const PATHNAME_TO_IDX: Record<(typeof TAB_PATH_SUFFIXES)[number], number> = {
  '/home': 0,
  '/journal': 1,
  '/lessons': 1,
  '/video': 2,
  '/community': 3,
  '/friends': 3,
  '/arena': 0,
  '/settings': 4,
};
const IDX_TO_TAB_ROUTE: Record<number, string> = {
  0: '/(tabs)/home',
  1: '/(tabs)/lessons',
  2: '/(tabs)/video',
  3: '/(tabs)/community',
  4: '/(tabs)/settings',
};

/** D129: скрытая вкладка заменяется Главной (0). */
function visibleTabIdx(idx: number, layout: TabPageLayout): number {
  return isLogicalTabHidden(idx, layout) ? 0 : idx;
}

function addVisitedTab(prev: Set<number>, idx: number): Set<number> {
  if (idx < 0 || prev.has(idx)) return prev;
  const next = new Set(prev);
  next.add(idx);
  return next;
}

/** Минимальный отступ панели таббара от низа, когда системной полосы нет. */
const TAB_DOCK_MIN_BOTTOM_PAD = 8;
/** Запас над капсулой в оверлее — чтобы тень под ней не обрезалась. */
const TAB_BAR_WRAP_SHADOW_ROOM = 24;
// зачем (владелец 24.09, референс): та же механика сжатия при скролле вниз, что
// была у дореформенного таббара (commit bfdc8e783~1) — капсула не исчезает,
// а слегка уменьшается и оседает. Портирована 1:1, только без gold/olive веток.
// зачем (Сверка system-004, 05.10): system.html `.tb.shrink` — translateY(8) scale(.9) от нижнего края
// (transform-origin 50% 100%), переход 260 мс cubic-bezier(.33,1,.68,1) в обе стороны, БЕЗ приглушения
// (было: прозрачность .94, сжатие 220 мс ease-out cubic, масштаб от центра).
const TAB_SCROLL_COLLAPSED_SCALE = 0.9;
const TAB_SCROLL_COLLAPSED_TRANSLATE_Y = 8;
const TAB_SCROLL_EASE = Easing.bezier(0.33, 1, 0.68, 1);
const TAB_SCROLL_COLLAPSE_TRIGGER_Y = 36;
const TAB_SCROLL_EXPAND_TRIGGER_Y = 10;
const TAB_SCROLL_DIRECTION_EPSILON = 5;
const TAB_SCROLL_COLLAPSE_MS = 260;
const TAB_SCROLL_EXPAND_MS = 260;
const TAB_SCROLL_TOGGLE_COOLDOWN_MS = 140;
/** Фоновый премаунт соседних табов в idle: первое открытие любого таба — мгновенное,
 *  без «плейсхолдер → полный маунт на глазах». Дёшев в связке с ENABLE_TAB_FREEZE:
 *  премаунченный таб делает первый коммит (модуль + первый рендер + старт загрузок)
 *  и тут же засыпает (Freeze), не потребляя рендеры до реального открытия. */
const ENABLE_BACKGROUND_TAB_PREMOUNT = true;
/** Заморозка (react-freeze) невидимых табов: посещённые табы живут вечно (кастомный
 *  свайпер не размонтирует их), и без freeze они продолжали рендериться в фоне —
 *  главный источник «греется через минуту». Активный таб и его соседи по свайпу
 *  не замораживаются (иначе при драге сосед был бы пустым). Kill-switch на случай
 *  регрессий на устройстве. Guardrail: tests/owner_direction_runtime_contract.test.ts. */
const ENABLE_TAB_FREEZE = true;
const TAB_FREEZE_MIN_DISTANCE = 2;
const BACKGROUND_TAB_PREMOUNT_FALLBACK_MS = 1600;
// зачем (R1, координатор 12.10, «почему Уроки монтируются заранее»; журналы Сверки with_navigate_fix3): премаунт стартовал по app_first_content_ready, а его шлёт оболочка Главной в rAF сразу после СВОЕГО
// монтирования — ДО настоящего первого кадра Главной. Первой в очереди идёт вкладка «Уроки»: её require (3411 строк, 52 импорта) синхронно держал JS-поток ≈1,7 с (JS-STALL +3679→+5437 мс) как раз между
// первым коммитом Главной и её [HOME-PAINT] — кадр откладывался на ≈2 с. Теперь при старте на Главной премаунт ждёт настоящий кадр Главной (whenHomePainted) и ещё короткую паузу под первые касания.
// Потолок на случай, если кадр Главной так и не придёт. Если стартовая вкладка НЕ Главная — прежний путь (событие готовности контента + запасной таймер).
const BACKGROUND_TAB_PREMOUNT_AFTER_PAINT_DELAY_MS = 500;
const BACKGROUND_TAB_PREMOUNT_HOME_PAINT_CEILING_MS = 6000;
// зачем (аудит задержки открытия «Уроки»): было 160 — Уроки, будучи первым в
// BACKGROUND_TAB_PREMOUNT_ORDER, всё равно ждали лишний кадр раньше, чем idle-
// очередь вообще ставила задачу. Тап часто приходит раньше, чем эти 160мс+idle
// успевают отработать, и тогда require('./lessons') (3411 строк, 52 импорта)
// синхронно грузится в момент тапа — вот и «полсекунды». 0 — задача уходит в
// очередь в тот же тик, что событие «первый контент готов».
const BACKGROUND_TAB_PREMOUNT_FIRST_DELAY_MS = 0;
const BACKGROUND_TAB_PREMOUNT_STEP_MS = 180;
// зачем: было 1200 — requestIdleCallback мог ждать секунду с лишним чистого
// простоя JS-потока, прежде чем прогреть Уроки, хотя это первая (и обычно
// единственная в этот момент) задача в очереди. 400мс достаточно, чтобы не
// конкурировать с реальной анимацией входа на Главную, но не оставляет
// пользователю запаса на тап раньше прогрева.
const BACKGROUND_TAB_PREMOUNT_IDLE_TIMEOUT_MS = 400;
// зачем (13.10): пауза после коммита вкладки, прежде чем начнётся следующая, — окно для касаний и анимаций; охранный потолок шага — цепочка не зависает, если кадр не пришёл.
const BACKGROUND_TAB_PREMOUNT_STEP_GAP_MS = 150;
// зачем (координатор 13.10, замер Сверки f0d559796: коммиты премаунта ≈2,2–2,9 с блоками ≥1 с в окне +5…+12 с): шаг ждёт «тихое окно» — нет касаний ≥ QUIET_TOUCH_MS и нет лага цикла событий > QUIET_LAG_MAX_MS (чужая работа: звуки, deferred-задачи);
// потолок QUIET_MAX_WAIT_MS гарантирует, что премаунт всё равно случится. Охранный потолок шага = ожидание тишины + 4 с на сам коммит.
const BACKGROUND_TAB_PREMOUNT_QUIET_TOUCH_MS = 1200;
const BACKGROUND_TAB_PREMOUNT_QUIET_LAG_MAX_MS = 80;
const BACKGROUND_TAB_PREMOUNT_QUIET_POLL_MS = 200;
// зачем (замер #3 Сверки: quietWaitMs:0 во всех шагах — первая проверка по построению «тихая»): тишина = подряд CLEAN_TICKS проверок (≥ CLEAN_TICKS×POLL мс наблюдения) без касаний и без лага; любой лаг/касание обнуляет счёт.
const BACKGROUND_TAB_PREMOUNT_QUIET_CLEAN_TICKS = 4;
const BACKGROUND_TAB_PREMOUNT_QUIET_MAX_WAIT_MS = 8000;
const BACKGROUND_TAB_PREMOUNT_STEP_GUARD_MS = BACKGROUND_TAB_PREMOUNT_QUIET_MAX_WAIT_MS + 4000;
/** Фоново прогреваем все отложенные вкладки в их логическом порядке. */
const BACKGROUND_TAB_PREMOUNT_ORDER = [1, 2, 3, 4] as const;
/** Имена сегментов expo-router под `app/(tabs)/*.tsx` (без ведущих скобочных групп).
 *  journal — legacy-якорь вкладки «Все уроки». */
const SEGMENT_TO_TAB_IDX: Record<string, number> = {
  home: 0,
  journal: 1,
  lessons: 1,
  video: 2,
  community: 3,
  friends: 3,
  arena: 0,
  settings: 4,
};

/**
 * При смене таба pathname иногда один кадр отстаёт от реального экрана; сегменты стабильнее.
 * Схлопнутый `/(tabs)` без дочернего сегмента = редирект из `app/(tabs)/index.tsx` на главную (0).
 *
 * Если URL — полноэкранный экран поверх группы табов (`/lessons_list`, `/lesson_menu`,
 * модальными экранами, здесь возвращаем `null`: не переопределяем activeIdx таб-слайдера
 * (иначе маппинг падал бы в «Главная» и активная вкладка мигала бы под push-экраном).
 */
function tabIdxFromRouter(pathnameRaw: string, segments: readonly string[]): number | null {
  const inTabsGroup = segments.some(s => s === '(tabs)');
  const nonGroup = segments.filter(s => Boolean(s) && !s.startsWith('('));

  for (let i = nonGroup.length - 1; i >= 0; i--) {
    const idx = SEGMENT_TO_TAB_IDX[nonGroup[i]!];
    if (idx !== undefined) return idx;
  }

  if (inTabsGroup && nonGroup.length === 0) {
    return PATHNAME_TO_IDX['/home'];
  }

  return tabIdxFromPathname(pathnameRaw);
}

/** Синхронно с URL — чтобы прямой вход в таб не давал кадр с activeIdx=0. */
function tabIdxFromPathname(pathnameRaw: string): number | null {
  const p = pathnameRaw.replace(/\/$/, '');
  if (p === '' || p === '/') return PATHNAME_TO_IDX['/home'];
  if (p === '/(tabs)' || p.endsWith('/(tabs)')) return PATHNAME_TO_IDX['/home'];
  for (const suf of TAB_PATH_SUFFIXES) {
    if (p === suf || p.endsWith(suf)) {
      const idx = PATHNAME_TO_IDX[suf];
      if (idx !== undefined) return idx;
    }
  }
  return null;
}

function routerShowsTab(pathnameRaw: string, segments: readonly string[], tabIdx: number): boolean {
  const idx = tabIdxFromRouter(pathnameRaw, segments);
  if (idx === null) return false;
  return idx === tabIdx;
}

// Иконка + подпись, как на референсе владельца 24.09 (2.0). Порядок = индексам табов.
const TABS: TabDef[] = [
  { key: 'home', icon: 'home-outline', active: 'home', label: {
    ru: 'Главная', uk: 'Головна', en: 'Home', es: 'Inicio', 'pt-BR': 'Início', vi: 'Trang chủ', id: 'Beranda', tr: 'Ana sayfa', pl: 'Start',
  } },
  { key: 'lessons', icon: 'book-outline', active: 'book', label: {
    ru: 'Обучение', uk: 'Навчання', en: 'Learn', es: 'Aprender', 'pt-BR': 'Aprender', vi: 'Học', id: 'Belajar', tr: 'Öğren', pl: 'Nauka',
  } },
  { key: 'video', icon: 'play-circle-outline', active: 'play-circle', label: {
    ru: 'Видео', uk: 'Відео', en: 'Videos', es: 'Videos', 'pt-BR': 'Vídeos', vi: 'Video', id: 'Video', tr: 'Videolar', pl: 'Filmy',
  } },
  { key: 'community', icon: 'people-outline', active: 'people', label: {
    ru: 'Сообщество', uk: 'Спільнота', en: 'Community', es: 'Comunidad', 'pt-BR': 'Comunidade', vi: 'Cộng đồng', id: 'Komunitas', tr: 'Topluluk', pl: 'Społeczność',
  } },
  { key: 'settings', icon: 'settings-outline', active: 'settings', label: {
    ru: 'Настройки', uk: 'Параметри', en: 'Settings', es: 'Ajustes', 'pt-BR': 'Ajustes', vi: 'Cài đặt', id: 'Setelan', tr: 'Ayarlar', pl: 'Ustawienia',
  } },
];

type TabBarEntry = TabDef & { logicalIdx: number };
const TAB_BAR_TABS: TabBarEntry[] = TABS.map((tab, logicalIdx) => ({ ...tab, logicalIdx }));


type TabScaffoldProps = {
  tabScreens: React.ReactNode[];
  currentRouteIsTab: boolean;
  visualIdx: number;
  physicalPageIdx: PhysicalPageIndex;
  devHubVisible: boolean;
  onCloseDevHub: () => void;
  onOpenDevHub: () => void;
  pageLayout: TabPageLayout;
};

/**
 * Один full-screen ScreenGradient (орбы/градиент) под системным статус-баром + paddingTop по insets
 * (без SafeAreaView сверху — иначе над контентом оставалась «плашка» из bgPrimary).
 */
function TabScaffold({
  tabScreens,
  currentRouteIsTab,
  visualIdx,
  physicalPageIdx,
  devHubVisible,
  onCloseDevHub,
  onOpenDevHub,
  pageLayout,
}: TabScaffoldProps) {
  useMountTrace('tab_scaffold'); // зачем (R1, двойной монтаж Главной): ярус, держащий TabSlider с панелями
  const { lang } = useLang();
  const { bottomInset: PB } = useScreen();
  const insets = useStableSafeAreaInsets();
  const { goToTab, activeIdx, onSwipeStart, onSwipeComplete } = useTabNav();
  const [devOverlayVisible, setDevOverlayVisible] = useState(false);
  const topFadeScroll = useTopFadeScroll();
  const reduceMotion = useReduceMotion();
  // зачем: капсула висит над системной полосой жестов на том же зазоре, что
  // закладывает useTabContentBottomPad — последний элемент докручивается выше неё.
  const tabBarBottom = Math.max(PB, TAB_DOCK_MIN_BOTTOM_PAD) + FLOATING_PILL_BOTTOM_GAP;
  const { hidden: tabBarHidden } = useTabBarVisibility();
  const firstContentReadyEmittedRef = useRef(false);
  // зачем D129: вкладка «Обучение» есть в таббаре только для языка с готовым курсом.
  const barTabs = useMemo(
    () => TAB_BAR_TABS.filter((tab) => !isLogicalTabHidden(tab.logicalIdx, pageLayout)),
    [pageLayout],
  );
  const activeBarTabIdx = barTabs.findIndex((tab) => tab.logicalIdx === visualIdx);
  // зачем (макет system.html «Точка — есть новое в Сообществе»): точка из локального
  // кэша уведомлений, гаснет при заходе во вкладку. 0 чтений Firestore.
  const communityLogicalIdx = TAB_BAR_TABS.find((tab) => tab.key === 'community')?.logicalIdx ?? -1;
  const communityDot = useCommunityTabDot(visualIdx === communityLogicalIdx);
  const tabBarItems = useMemo<V2TabBarItem[]>(
    // зачем: TabLabelCopy содержит Partial-локали, поэтому triLang типизирован как string|undefined; ru всегда есть.
    () => barTabs.map((tab) => ({
      key: tab.key,
      label: triLang(lang, tab.label) ?? tab.label.ru,
      icon: tab.icon,
      activeIcon: tab.active,
      badge: tab.key === 'community' && communityDot,
    })),
    [barTabs, lang, communityDot],
  );
  const handleTabBarSelect = useCallback((barIndex: number) => {
    const tab = barTabs[barIndex];
    if (tab) goToTab(tab.logicalIdx);
  }, [barTabs, goToTab]);
  // зачем (владелец 24.09, референс): капсула сжимается при скролле вниз и
  // разворачивается при скролле вверх/смене таба/свайпе — портировано из
  // дореформенного таббара (commit bfdc8e783~1), см. TAB_SCROLL_* выше.
  const tabScrollProgress = useRef(new Animated.Value(0)).current;
  const tabScrollCollapsedRef = useRef(false);
  const tabScrollSettledRef = useRef(true);
  const tabScrollLastYRef = useRef(0);
  const tabScrollLastToggleAtRef = useRef(0);
  const previousVisualIdxRef = useRef(visualIdx);

  const animateTabChrome = useCallback((collapsed: boolean, immediate = false) => {
    // зачем: тот же ранний-выход и кулдаун, что и в дореформенном коде — иначе
    // покадровый listener скролла на каждый тик дёргает stopAnimation/setValue
    // через мост под пальцем (владелец, «всё лагает» 2026-09-21).
    if (tabScrollCollapsedRef.current === collapsed && tabScrollSettledRef.current) return;
    const now = Date.now();
    if (!immediate && now - tabScrollLastToggleAtRef.current < TAB_SCROLL_TOGGLE_COOLDOWN_MS) return;
    tabScrollLastToggleAtRef.current = now;
    tabScrollCollapsedRef.current = collapsed;
    tabScrollProgress.stopAnimation();
    if (immediate || reduceMotion) {
      tabScrollProgress.setValue(collapsed ? 1 : 0);
      tabScrollSettledRef.current = true;
      return;
    }
    tabScrollSettledRef.current = false;
    Animated.timing(tabScrollProgress, {
      toValue: collapsed ? 1 : 0,
      duration: collapsed ? TAB_SCROLL_COLLAPSE_MS : TAB_SCROLL_EXPAND_MS,
      easing: TAB_SCROLL_EASE,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && tabScrollCollapsedRef.current === collapsed) {
        tabScrollSettledRef.current = true;
      }
    });
  }, [reduceMotion, tabScrollProgress]);

  useLayoutEffect(() => {
    if (previousVisualIdxRef.current === visualIdx) return;
    previousVisualIdxRef.current = visualIdx;
    tabScrollLastYRef.current = 0;
    animateTabChrome(false, true);
  }, [animateTabChrome, visualIdx]);

  useEffect(() => {
    const scrollY = topFadeScroll?.tabBarScrollY;
    if (!scrollY || tabBarHidden) return undefined;
    const id = scrollY.addListener(({ value }) => {
      const y = Math.max(0, value);
      const delta = y - tabScrollLastYRef.current;
      tabScrollLastYRef.current = y;
      if (y <= TAB_SCROLL_EXPAND_TRIGGER_Y) {
        animateTabChrome(false, true);
        return;
      }
      if (delta >= TAB_SCROLL_DIRECTION_EPSILON && y >= TAB_SCROLL_COLLAPSE_TRIGGER_Y) {
        animateTabChrome(true);
        return;
      }
      if (delta <= -TAB_SCROLL_DIRECTION_EPSILON) {
        animateTabChrome(false);
      }
    });
    return () => {
      scrollY.removeListener(id);
      tabScrollProgress.stopAnimation();
    };
  }, [animateTabChrome, tabBarHidden, tabScrollProgress, topFadeScroll?.tabBarScrollY]);

  const tabScrollScale = tabScrollProgress.interpolate({ inputRange: [0, 1], outputRange: [1, TAB_SCROLL_COLLAPSED_SCALE], extrapolate: 'clamp' });
  const tabScrollTranslateY = tabScrollProgress.interpolate({ inputRange: [0, 1], outputRange: [0, TAB_SCROLL_COLLAPSED_TRANSLATE_Y], extrapolate: 'clamp' });

  const expandTabChrome = useCallback(() => animateTabChrome(false), [animateTabChrome]);

  const handleSwipeStartChrome = useCallback((physicalIdx: number) => {
    tabScrollLastYRef.current = 0;
    animateTabChrome(false, true);
    onSwipeStart(physicalIdx);
  }, [animateTabChrome, onSwipeStart]);

  const notifyFirstContentReady = useCallback(() => {
    if (!currentRouteIsTab || activeIdx === 0 || firstContentReadyEmittedRef.current) return;
    firstContentReadyEmittedRef.current = true;
    const emitFirstContentReady = () => emitAppEvent('app_first_content_ready');
    requestAnimationFrame(() => {
      emitFirstContentReady();
      setTimeout(emitFirstContentReady, 32);
      setTimeout(emitFirstContentReady, 120);
    });
  }, [activeIdx, currentRouteIsTab]);

  useEffect(() => {
    notifyFirstContentReady();
  }, [notifyFirstContentReady]);

  // The tab scaffold owns the system safe area above retained tab screens.
  // Match that strip to Lessons so the Home artwork cannot bleed above it.
  const scaffoldArtBackdrop = visualIdx === 1 ? 'lessons' : 'home';
  const scaffoldStaticParallaxY = visualIdx === 0 ? HOME_ENTRANCE.bgDriftPx : undefined;

  return (
    <ScreenGradient
      artBackdrop={scaffoldArtBackdrop}
      style={{ flex: 1 }}
      staticParallaxY={scaffoldStaticParallaxY}
    >
      {/* Затемняющий верхний край: одна маска на все табы, от самого верха экрана
          (вне paddingTop-обёртки), opacity привязан к скроллу активного таба. */}
      <TopFadeMask scrollY={topFadeScroll?.scrollY} zIndex={2} />
      <View
        onLayout={notifyFirstContentReady}
        style={{ flex: 1, paddingTop: insets.top }}
        pointerEvents={devOverlayVisible ? 'none' : 'auto'}
        accessibilityElementsHidden={devOverlayVisible}
        importantForAccessibility={devOverlayVisible ? 'no-hide-descendants' : 'auto'}
      >
        <View style={{ flex: 1, width: '100%', alignSelf: 'stretch', flexDirection: 'column' }}>
          <View style={s.tabContent}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <TabSlider activeIndex={physicalPageIdx} onTabChange={goToTab} onSwipeStart={handleSwipeStartChrome} onSwipeComplete={onSwipeComplete} swipeEnabled={true}>
                {tabScreens}
              </TabSlider>
            </GestureHandlerRootView>
          </View>
          {/* Плавающая капсула поверх контента: нижняя safe-area остаётся без отдельной полосы. */}
          {/* зачем: раздел Learning V2 открывается ВНУТРИ вкладки «Уроки», и
              таббар оставался поверх карты на весь экран (владелец 20.09).
              Экран просит скрытие через useHideTabBar и обязан отпустить его
              при размонтировании — иначе таббар залипнет скрытым. */}
          {tabBarHidden ? null : (
          <View
            style={[s.tabBarWrap, { height: tabBarBottom + V2_TAB_BAR_HEIGHT + TAB_BAR_WRAP_SHADOW_ROOM }]}
            pointerEvents="box-none"
          >
            {/* зачем (владелец 24.09): стеклянная капсула по варианту «В · Тёплая кромка»
                с макета docs/design/tabbar/tabbar-variants.html — сжатие при скролле,
                пружинная капсула и перетаскивание её пальцем. */}
            <V2TabBar
              items={tabBarItems}
              activeIndex={activeBarTabIdx}
              onSelect={handleTabBarSelect}
              onInteract={expandTabChrome}
              bottomOffset={tabBarBottom}
              reduceMotion={reduceMotion}
              collapseStyle={{ transformOrigin: '50% 100%', transform: [{ translateY: tabScrollTranslateY }, { scale: tabScrollScale }] }}
            />
          </View>
          )}
        </View>
      </View>
      {ENABLE_DEV_TOOLS ? (
        <DevHubSheetGate
          visible={devHubVisible}
          onClose={onCloseDevHub}
          onOpen={onOpenDevHub}
          onSurfaceActiveChange={setDevOverlayVisible}
        />
      ) : null}
    </ScreenGradient>
  );
}

function scheduleIdleTask(run: () => void, timeoutMs: number): CancelableTask {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let idleHandle: unknown = null;
  const requestIdle = (globalThis as any).requestIdleCallback as undefined | ((cb: () => void, options?: { timeout?: number }) => unknown);
  const cancelIdle = (globalThis as any).cancelIdleCallback as undefined | ((handle: unknown) => void);
  const invoke = () => {
    if (cancelled) return;
    run();
  };

  if (requestIdle) {
    idleHandle = requestIdle(invoke, { timeout: timeoutMs });
  } else {
    timer = setTimeout(invoke, 80);
  }

  return {
    cancel: () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (idleHandle !== null && cancelIdle) cancelIdle(idleHandle);
    },
  };
}

function ReleasedTabLayout() {
  useMountTrace('tabs_layout'); // зачем (R1, двойной монтаж Главной): верхний ярус каркаса табов
  const navigationContainerRef = useNavigationContainerRef();
  // зачем (R1, двойной монтаж Главной): корневой эффект уходит с `/` на Главную через navigate (без пересоздания каркаса), только пока каркас уже смонтирован — см. app/tabs_shell_state.ts
  useEffect(() => {
    setTabsShellMounted(true);
    return () => setTabsShellMounted(false);
  }, []);
  useNavActionTrace(navigationContainerRef as never); // зачем (R1): какое действие навигации заменило маршрут (журнал [PERF-R1-NAV]); только dev
  const { width: tabPaneWidth } = useScreen();
  const { theme: t } = useTheme();
  const pathname = usePathname();
  // зачем: useSegments() в expo-router 6 типизирован union'ом ВСЕХ маршрутов —
  // в массивах зависимостей TS падает с TS2590 («union слишком сложный»).
  // Помощники ниже и так принимают readonly string[], поэтому сужаем тип здесь.
  const segments: readonly string[] = useSegments();
  // зачем D129 (владелец 2026-09-30): «Обучение» видно только для языка с готовым курсом.
  // studyTarget синхронный (peek из снапшота) — первый кадр таббара уже финальный,
  // без вспышки вкладки, которая потом исчезает.
  const { studyTarget } = useStudyTarget();
  const learnTabVisible = isLearnTabVisibleForTarget(studyTarget);
  const pageLayout = tabPageLayoutFor({ learnTabVisible });
  const pageLayoutRef = useRef(pageLayout);
  pageLayoutRef.current = pageLayout;
  const initialTabIdx = visibleTabIdx(tabIdxFromRouter(pathname, segments) ?? 0, pageLayout);
  // зачем (R1): ПЕРВАЯ стартовая вкладка (initialTabIdx пересчитывается по маршруту на каждом рендере) — от неё зависит, чего ждёт фоновый премаунт
  const startTabIdxRef = useRef(initialTabIdx);
  const [activeIdx, setActiveIdx] = useState(() => initialTabIdx);
  const [visualIdx, setVisualIdx] = useState(() => initialTabIdx);
  const [physicalPageIdx, setPhysicalPageIdx] = useState<PhysicalPageIndex>(() => logicalTabToPhysicalPage(initialTabIdx, pageLayout));
  const physicalPageIdxRef = useRef(physicalPageIdx);
  physicalPageIdxRef.current = physicalPageIdx;
  const activeIdxRef = useRef(activeIdx);
  activeIdxRef.current = activeIdx;
  const visualIdxRef = useRef(visualIdx);
  visualIdxRef.current = visualIdx;
  const [focusTick, setFocusTick] = useState(0);
  const [devHubVisible, setDevHubVisible] = useState(false);
  const openDevHub = useCallback(() => setDevHubVisible(true), []);
  // зачем (владелец 01.10): вход в Dev Hub ещё и из «Настроек» (дев-сборка) — экран зовёт шину.
  useEffect(() => (ENABLE_DEV_TOOLS ? subscribeOpenDevHub(openDevHub) : undefined), [openDevHub]);
  const closeDevHub = useCallback(() => setDevHubVisible(false), []);
  // Ліниве монтування: слот таба появляется сразу, а тяжелый экран монтируется в idle после первого кадра.
  // Начальный таб всегда в visited/mounted — чтобы первый рендер не был плейсхолдером.
  const [visitedTabs, setVisitedTabs] = useState(() => new Set<number>([0, initialTabIdx]));
  const visitedTabsRef = useRef(visitedTabs);
  visitedTabsRef.current = visitedTabs;
  const [mountedTabs, setMountedTabs] = useState(() => new Set<number>([0, initialTabIdx]));
  const mountedTabsRef = useRef(mountedTabs);
  mountedTabsRef.current = mountedTabs;
  const scheduledMountsRef = useRef<Map<number, CancelableTask>>(new Map());
  const foregroundMountsRef = useRef<Set<number>>(new Set());
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const lastEffectLayoutRef = useRef<TabPageLayout | null>(null);
  const backgroundPremountStartedRef = useRef(false);
  const backgroundPremountTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Пока router.replace ещё не обновил pathname, useLayoutEffect не должен откатить вкладку по старому URL. */
  const pendingTabIdxRef = useRef<number | null>(null);
  const initialExamBestPctTabIdxRef = useRef(initialTabIdx);

  useLayoutEffect(() => {
    markExamBestPctTabActivity(initialExamBestPctTabIdxRef.current);
    return () => setExamBestPctTabActivity('unknown');
  }, []);

  /**
   * Немедленный маунт таба, на который пользователь смотрит ПРЯМО СЕЙЧАС.
   * зачем: раздел «Уроки» открывался долго — тап ставил монтирование в общую
   * idle-очередь (раньше до 1200 мс, теперь BACKGROUND_TAB_PREMOUNT_IDLE_TIMEOUT_MS = 400 мс), и всё
   * это время на экране висела пустая панель. Фоновый премаунт соседей idle
   * оставляем как есть: ждать там некому. Здесь же ждёт живой человек.
   */
  const mountNow = useCallback((idx: number) => {
    if (idx < 0 || mountedTabsRef.current.has(idx) || foregroundMountsRef.current.has(idx)) return;
    const scheduled = scheduledMountsRef.current.get(idx);
    if (scheduled) {
      scheduled.cancel?.();
      scheduledMountsRef.current.delete(idx);
    }
    foregroundMountsRef.current.add(idx);
    setVisitedTabs((prev) => addVisitedTab(prev, idx));
    // Cold require не выполняется в tap/layout-effect стеке: сначала React
    // коммитит непрозрачный shell выбранной вкладки, затем следующий кадр
    // прогревает модуль и атомарно заменяет shell реальным экраном.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (idx !== 0) prewarmDeferredTabScreen(idx);
        foregroundMountsRef.current.delete(idx);
        setMountedTabs((prev) => addVisitedTab(prev, idx));
      });
    });
  }, []);

  // зачем (координатор 13.10, профиль Сверки + стеки Ядра 21d429827): после первого кадра Главной React-коммиты премаунта вкладок занимали ≈1,2–1,35 с (performWorkOnRoot), пассивные эффекты ещё 0,6–0,8 с.
  // Четыре таймера (0/180/360/540 мс) ставили независимые idle-задачи с потолком 400 мс: пока первая вкладка держала JS-поток, остальные «выходили по потолку» и коммитились ПОДРЯД, без окна для касаний и анимаций.
  // Теперь работа шагов выстроена в одну цепочку: следующая вкладка начинается только после коммита предыдущей и паузы BACKGROUND_TAB_PREMOUNT_STEP_GAP_MS; каждый шаг пишет замеры в [TABS-PREMOUNT] step.
  const premountChainRef = useRef<Promise<void>>(Promise.resolve());
  // время последнего касания экрана (для «тихого окна» премаунта); запись — обёрткой вокруг табов, она касания НЕ перехватывает
  const lastTouchAtRef = useRef(0);

  const scheduleMount = useCallback((idx: number) => {
    if (idx < 0 || mountedTabsRef.current.has(idx) || scheduledMountsRef.current.has(idx)) return;

    const enqueuedAt = Date.now();
    let cancelled = false;
    let inner: CancelableTask | null = null;
    let finishStep: (() => void) | null = null;
    // запись нужна сразу: по ней mountNow отменяет шаг (тап), а повторный scheduleMount видит «уже в очереди»
    scheduledMountsRef.current.set(idx, { cancel: () => { cancelled = true; inner?.cancel?.(); finishStep?.(); } });

    premountChainRef.current = premountChainRef.current.then(() => new Promise<void>((resolve) => {
      const startedAt = Date.now();
      let done = false;
      let guard: ReturnType<typeof setTimeout> | null = null;
      const finish = (outcome: string, extra?: Record<string, number | string>) => {
        if (done) return;
        done = true;
        if (guard) clearTimeout(guard);
        console.log('[TABS-PREMOUNT] step', JSON.stringify({ idx, outcome, queuedMs: startedAt - enqueuedAt, totalMs: Date.now() - startedAt, ...extra })); // guard-ok: замер шага премаунта (СПЕРВА ЛОГИ), 4 строки за запуск
        resolve();
      };
      finishStep = () => finish('cancelled');
      // охранный таймер: цепочка не должна зависнуть, если кадр не придёт (фон, заморозка)
      guard = setTimeout(() => finish('guard_timeout'), BACKGROUND_TAB_PREMOUNT_STEP_GUARD_MS);
      if (cancelled || mountedTabsRef.current.has(idx)) {
        scheduledMountsRef.current.delete(idx);
        finish(cancelled ? 'cancelled' : 'already_mounted');
        return;
      }
      const quietStartedAt = Date.now();
      let lastTickAt = quietStartedAt;
      let cleanTicks = 0;
      let maxLagMs = 0;
      const startWork = (quiet: Record<string, number | string>) => {
        if (done) return;
        const workStartedAt = Date.now();
        inner = scheduleIdleTask(() => {
        scheduledMountsRef.current.delete(idx);
        if (AppState.currentState !== 'active') { finish('app_inactive', quiet); return; }
        const idleWaitMs = Date.now() - workStartedAt;
        // зачем: та же мина, что была в mountNow — прогрев стоял УСЛОВИЕМ премаунта.
        // Аудит показал: это главный путь при старте (BACKGROUND_TAB_PREMOUNT_ORDER),
        // и он срабатывает раньше тапа. Одна неудача require — mountedTabs не
        // пополняется, а запись о задаче уже стёрта строкой выше: повторной попытки
        // не будет никогда, вкладка навсегда остаётся пустым плейсхолдером.
        // Прогрев — оптимизация, а не разрешение показать экран.
        const prewarmAt = Date.now();
        if (idx !== 0) prewarmDeferredTabScreen(idx);
        const prewarmMs = Date.now() - prewarmAt;
        requestAnimationFrame(() => {
          if (AppState.currentState !== 'active') { finish('app_inactive', { ...quiet, idleWaitMs, prewarmMs }); return; }
          const commitAt = Date.now();
          setVisitedTabs((prev) => addVisitedTab(prev, idx));
          setMountedTabs((prev) => addVisitedTab(prev, idx));
          // два кадра = коммит и первый кадр вкладки позади; затем пауза, в которой JS-поток свободен
          requestAnimationFrame(() => requestAnimationFrame(() => {
            const commitMs = Date.now() - commitAt;
            setTimeout(() => finish('mounted', { ...quiet, idleWaitMs, prewarmMs, commitMs }), BACKGROUND_TAB_PREMOUNT_STEP_GAP_MS);
          }));
        });
        }, BACKGROUND_TAB_PREMOUNT_IDLE_TIMEOUT_MS);
      };
      // «тихое окно»: опрос каждые 200 мс — касание ≥ 1,2 с назад И лаг таймера ≤ 80 мс; иначе ждём до потолка 8 с
      const pollQuiet = () => {
        if (done) return;
        if (cancelled || mountedTabsRef.current.has(idx)) {
          scheduledMountsRef.current.delete(idx);
          finish(cancelled ? 'cancelled' : 'already_mounted', { quietWaitMs: Date.now() - quietStartedAt });
          return;
        }
        const now = Date.now();
        const lastLagMs = Math.max(0, now - lastTickAt - (now === quietStartedAt ? 0 : BACKGROUND_TAB_PREMOUNT_QUIET_POLL_MS));
        lastTickAt = now;
        const sinceTouchMs = lastTouchAtRef.current === 0 ? BACKGROUND_TAB_PREMOUNT_QUIET_TOUCH_MS : now - lastTouchAtRef.current;
        const quietWaitMs = now - quietStartedAt;
        maxLagMs = Math.max(maxLagMs, lastLagMs);
        const tickClean = sinceTouchMs >= BACKGROUND_TAB_PREMOUNT_QUIET_TOUCH_MS && lastLagMs <= BACKGROUND_TAB_PREMOUNT_QUIET_LAG_MAX_MS;
        cleanTicks = tickClean ? cleanTicks + 1 : 0;
        const isQuiet = cleanTicks >= BACKGROUND_TAB_PREMOUNT_QUIET_CLEAN_TICKS;
        if (isQuiet || quietWaitMs >= BACKGROUND_TAB_PREMOUNT_QUIET_MAX_WAIT_MS) {
          startWork({ quietReason: isQuiet ? 'quiet' : 'ceiling', quietWaitMs, cleanTicks, lastLagMs, maxLagMs, sinceTouchMs: Math.min(sinceTouchMs, 99999) });
          return;
        }
        setTimeout(pollQuiet, BACKGROUND_TAB_PREMOUNT_QUIET_POLL_MS);
      };
      pollQuiet();
    }));
  }, []);

  useEffect(() => () => {
    scheduledMountsRef.current.forEach((task) => task.cancel?.());
    scheduledMountsRef.current.clear();
    backgroundPremountTimersRef.current.forEach((timer) => clearTimeout(timer));
    backgroundPremountTimersRef.current = [];
  }, []);

  // До paint: pathname + segments, чтобы индекс не отставал и TabSlider не кадрил старый слайд.
  useLayoutEffect(() => {
    const layout = pageLayout;
    const layoutChanged = lastEffectLayoutRef.current !== layout;
    lastEffectLayoutRef.current = layout;
    const rawFromRouter = tabIdxFromRouter(pathname, segments);
    // зачем D129: маршрут скрытой вкладки (старая ссылка, возврат из урока, смена языка)
    // ведёт на Главную — экрана «Обучение» в ленте нет.
    if (rawFromRouter !== null && isLogicalTabHidden(rawFromRouter, layout)) {
      console.warn('[LANG-SURFACE] tabs:hidden_tab_route → home', { rawFromRouter, pathname, studyTarget });
      routerRef.current.replace('/(tabs)/home' as any);
    }
    const fromRouter = rawFromRouter === null ? null : visibleTabIdx(rawFromRouter, layout);
    if (pendingTabIdxRef.current !== null && isLogicalTabHidden(pendingTabIdxRef.current, layout)) {
      console.warn('[LANG-SURFACE] tabs:pending_hidden_tab → drop', { pending: pendingTabIdxRef.current });
      pendingTabIdxRef.current = null;
    }
    const pending = pendingTabIdxRef.current;
    if (pending !== null && fromRouter !== null && fromRouter === pending) {
      pendingTabIdxRef.current = null;
    }
    if (pendingTabIdxRef.current !== null) {
      const hold = pendingTabIdxRef.current;
      markExamBestPctTabActivity(hold);
      if (!visitedTabsRef.current.has(hold)) {
        setVisitedTabs((prev) => addVisitedTab(prev, hold));
      }
      // зачем: это таб, который прямо сейчас становится активным по URL
      // (deep link, возврат из урока) — маунт в idle оставлял пустую панель.
      mountNow(hold);
      if (visualIdxRef.current !== hold) {
        setVisualIdx(hold);
      }
      if (activeIdxRef.current !== hold) {
        setActiveIdx(hold);
      }
      const physical = logicalTabToPhysicalPage(hold, layout);
      if (physicalPageIdxRef.current !== physical) setPhysicalPageIdx(physical);
      return;
    }
    if (fromRouter !== null) {
      markExamBestPctTabActivity(fromRouter);
      if (!visitedTabsRef.current.has(fromRouter)) {
        setVisitedTabs((prev) => addVisitedTab(prev, fromRouter));
      }
      mountNow(fromRouter);
      if (visualIdxRef.current !== fromRouter) {
        setVisualIdx(fromRouter);
      }
      if (activeIdxRef.current !== fromRouter) {
        setActiveIdx(fromRouter);
      }
      const physical = logicalTabToPhysicalPage(fromRouter, layout);
      if (physicalPageIdxRef.current !== physical) setPhysicalPageIdx(physical);
      return;
    }
    // зачем D129: язык сменили поверх push-экрана (URL не таб) — пересчитываем
    // страницу по новой раскладке, скрытую активную вкладку меняем на Главную.
    // Только при смене раскладки: обычный push-экран поверх табов ничего не трогает.
    if (!layoutChanged) return;
    const active = visibleTabIdx(activeIdxRef.current, layout);
    if (active !== activeIdxRef.current) {
      console.warn('[LANG-SURFACE] tabs:active_tab_hidden → home', { was: activeIdxRef.current, studyTarget });
      setActiveIdx(active);
      setVisualIdx(active);
    }
    const physical = logicalTabToPhysicalPage(active, layout);
    if (physicalPageIdxRef.current !== physical) setPhysicalPageIdx(physical);
  }, [mountNow, pageLayout, pathname, segments, studyTarget]);

  useFocusEffect(useCallback(() => { setFocusTick(tick => tick + 1); }, []));

  const scheduleBackgroundPremount = useCallback(() => {
    if (!ENABLE_BACKGROUND_TAB_PREMOUNT || backgroundPremountStartedRef.current) return;
    if (AppState.currentState !== 'active') return;
    backgroundPremountStartedRef.current = true;

    BACKGROUND_TAB_PREMOUNT_ORDER.forEach((idx, order) => {
      const timer = setTimeout(() => {
        backgroundPremountTimersRef.current = backgroundPremountTimersRef.current.filter((entry) => entry !== timer);
        // зачем D129: скрытую вкладку («Обучение» без курса) не греем — 52 импорта впустую.
        if (isLogicalTabHidden(idx, pageLayoutRef.current)) {
          console.log('[LANG-SURFACE] tabs:premount_skip_hidden', { idx });
          return;
        }
        scheduleMount(idx);
      }, BACKGROUND_TAB_PREMOUNT_FIRST_DELAY_MS + order * BACKGROUND_TAB_PREMOUNT_STEP_MS);
      backgroundPremountTimersRef.current.push(timer);
    });
  }, [scheduleMount]);

  useEffect(() => {
    if (!ENABLE_BACKGROUND_TAB_PREMOUNT) return;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let afterPaintTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const startPremount = (reason: string) => {
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      if (afterPaintTimer) {
        clearTimeout(afterPaintTimer);
        afterPaintTimer = null;
      }
      console.log('[TABS-PREMOUNT] start', JSON.stringify({ reason, startTabIdx: startTabIdxRef.current, startedAlready: backgroundPremountStartedRef.current })); // guard-ok: причина старта премаунта (СПЕРВА ЛОГИ)
      // зачем (координатор 13.10, B1 «Авторизация: скорость входа»): под онбордингом Главная не рисуется, потолок whenHomePainted (6 с) срабатывал,
      // и цепочка премаунта (вкладки 1…4, «тихое окно» до 8 с) собирала «Уроки» (52 импорта) поверх входа, ≈9 с общего времени входа.
      // Ждём конец онбординга; онбординга нет или он не известен — прежнее поведение. Тап по вкладке монтирует её сразу (mountNow) и не ждёт.
      const requestedAt = Date.now();
      void whenOnboardingSettled('tabs_premount').then((outcome) => {
        console.log('[LESSONS-REBUILD] premount_release', JSON.stringify({ reason, outcome, heldMs: Date.now() - requestedAt, cancelled })); // guard-ok: итог ожидания онбординга
        if (cancelled) return;
        scheduleBackgroundPremount();
      });
    };

    if (startTabIdxRef.current === 0) {
      // Старт на Главной: ждём её настоящий кадр, затем короткая пауза; потолок — на случай, если кадр не придёт.
      void whenHomePainted(BACKGROUND_TAB_PREMOUNT_HOME_PAINT_CEILING_MS).then((outcome) => {
        if (cancelled) return;
        afterPaintTimer = setTimeout(
          () => startPremount(outcome === 'painted' ? 'home_painted' : 'home_paint_ceiling'),
          outcome === 'painted' ? BACKGROUND_TAB_PREMOUNT_AFTER_PAINT_DELAY_MS : 0,
        );
      });
      return () => {
        cancelled = true;
        if (afterPaintTimer) clearTimeout(afterPaintTimer);
      };
    }

    const sub = onAppEvent('app_first_content_ready', () => startPremount('content_ready_non_home_start'));
    fallbackTimer = setTimeout(() => startPremount('fallback_timer_non_home_start'), BACKGROUND_TAB_PREMOUNT_FALLBACK_MS);
    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (afterPaintTimer) clearTimeout(afterPaintTimer);
      sub.remove();
    };
  }, [scheduleBackgroundPremount]);

  const rememberVisitedTab = useCallback((idx: number) => {
    setVisitedTabs((prev) => addVisitedTab(prev, idx));
  }, []);

  /** Вызывается в момент отпускания пальца (до анимации): хром таббара догоняет сразу,
   *  а реальный activeIdx/URL переключаются после UI-thread анимации. */
  const handleSwipeStart = useCallback((physicalIdx: number) => {
    const idx = physicalPageToLogicalTab(physicalIdx, pageLayoutRef.current);
    setExamBestPctTabActivity('unsafe');
    setVisualIdx(idx);
    if (physicalIdx === 0 || idx === activeIdxRef.current) return;
    // зачем (аудит свайпов 2026-08-16): здесь НЕ монтируем тяжёлый экран.
    // onSwipeStart приходит в момент отпускания пальца, когда UI-поток уже
    // ведёт 260-мс анимацию доезда. Синхронный require + первый рендер экрана
    // (Уроки — 52 импорта) в этот момент замораживал JS на секунды: капсула
    // таббара отставала, приземлившаяся страница оставалась pointerEvents='none'
    // до конца рендера, а если человек за это время свайпал ещё раз — поздний
    // physicalPageIdx откатывал слайдер назад («свайп не работает / прыгает»).
    // Панель под пальцем это всё равно не заполняло: жест уже завершён.
    // Отмечаем таб посещённым (лёгкий плейсхолдер в слоте), а маунт делаем в
    // handleSwipeComplete — после приземления, отдельным кадром.
    rememberVisitedTab(idx);
  }, [rememberVisitedTab]);

  const navigateTo = useCallback((idx: number) => {
    const target = IDX_TO_TAB_ROUTE[idx];
    if (!target) return;
    if (routerShowsTab(pathname, segments, idx)) return;
    pendingTabIdxRef.current = idx;
    router.navigate(target as any);
  }, [pathname, segments, router]);

  /** Тап по таббару — немедленно обновляем UI, URL обновляем асинхронно. */
  const handleTabChange = useCallback((requestedIdx: number) => {
    // зачем D129: goToTab(1) из экранов при скрытом «Обучении» ведёт на Главную.
    const idx = visibleTabIdx(requestedIdx, pageLayoutRef.current);
    if (idx !== requestedIdx) console.warn('[LANG-SURFACE] tabs:goto_hidden_tab → home', { requestedIdx });
    // зачем: метка [TAP-LAT] для тапа по табу — отделяет отклик таббара от
    // разморозки (react-freeze) и коммита панели назначения.
    noteTapAction(`tab:${idx}`);
    markExamBestPctTabActivity(idx);
    setVisualIdx(idx);
    const physical = logicalTabToPhysicalPage(idx, pageLayoutRef.current);
    setPhysicalPageIdx(physical);
    if (idx === activeIdxRef.current && physicalPageIdxRef.current === physical) return;
    setActiveIdx(idx);
    rememberVisitedTab(idx);
    // зачем: тап — пользователь уже смотрит на панель, ждать idle нельзя.
    mountNow(idx);
    navigateTo(idx);
  }, [mountNow, navigateTo, rememberVisitedTab]);

  /** Свайп завершён — теперь обновляем реальный активный таб и затем URL. */
  const handleSwipeComplete = useCallback((physicalIdx: number) => {
    const physical = physicalIdx as PhysicalPageIndex;
    physicalPageIdxRef.current = physical;
    const idx = physicalPageToLogicalTab(physical, pageLayoutRef.current);
    markExamBestPctTabActivity(idx);
    setPhysicalPageIdx(physical);
    setVisualIdx(idx);
    // зачем: страница 0 раньше была «Сегодня» и намеренно не трогала URL; после
    // удаления экрана нулевая страница — обычная главная, и свайп на неё обязан
    // обновлять маршрут наравне с остальными табами.
    if (idx !== activeIdxRef.current) {
      setActiveIdx(idx);
      rememberVisitedTab(idx);
      // mountNow сам гарантирует один нарисованный shell-кадр до cold require.
      mountNow(idx);
    }
    navigateTo(idx);
  }, [mountNow, navigateTo, rememberVisitedTab]);

  // зачем: перехват «Назад» существовал только ради страницы «Сегодня» (увести
  // на главную вместо выхода). Экран удалён, страница 0 — сама главная, и
  // держать перехват дальше значило бы ломать штатный выход из приложения.

  const currentRouteIsTab = tabIdxFromRouter(pathname, segments) !== null;
  const markTouchForPremount = useCallback(() => {
    lastTouchAtRef.current = Date.now();
    return false;
  }, []);

  const tabScreens = useMemo(() => {
    // Главная всегда в дереве; остальные табы получают слот сразу, а реальные экраны
    // по одному монтируются в фоне после первого готового кадра, чтобы первый тап не видел пустой placeholder.
    const placeholder = (k: string) => (
      <View key={k} style={{ width: tabPaneWidth, flex: 1, backgroundColor: t.bgPrimary }} collapsable={false} />
    );

    const show = (i: number) => i === 0 || i === activeIdx || visitedTabs.has(i);
    // зачем: переход и фоновый pre-mount обновляют разные состояния. Если
    // Cold active tab сначала показывает непрозрачный shell; модуль разрешается
    // рендерить только после отдельного prewarm-кадра.
    const shouldLoad = (i: number) => shouldLoadTabScreen(activeIdx, i, mountedTabs);
    // Замораживаем табы дальше чем сосед активного: активный + оба соседа живут
    // (свайп-драг показывает соседнюю панель — она не должна быть пустой).
    const freezeWanted = (logicalIdx: number) => Math.abs(logicalTabToPhysicalPage(logicalIdx, pageLayout) - physicalPageIdx) >= TAB_FREEZE_MIN_DISTANCE;
    // зачем D129: скрытая вкладка выпадает из ленты целиком — свайп её не находит.
    const screens = [
      show(0) ? (
        <TabPane key="home" freezeWanted={freezeWanted(0)}>
          <React.Suspense fallback={placeholder('home-loading')}>
            <TabRenderProbe id="tab:home"><HomeScreenHost onOpenDevHub={openDevHub} /></TabRenderProbe>
          </React.Suspense>
        </TabPane>
      ) : placeholder('ph-home'),
      show(1) ? (
        <LessonsPaneBoundary
          key="lessons"
          freezeWanted={freezeWanted(1)}
          shouldLoad={shouldLoad(1)}
        />
      ) : placeholder('ph-lessons'),
      show(2) ? <TabPane key="video" freezeWanted={freezeWanted(2)}><TabRenderProbe id="tab:video"><DeferredTabScreen shouldLoad={shouldLoad(2)} loadScreen={loadVideoScreen} /></TabRenderProbe></TabPane> : placeholder('ph-video'),
      show(3) ? <TabPane key="community" freezeWanted={freezeWanted(3)}><TabRenderProbe id="tab:community"><DeferredTabScreen shouldLoad={shouldLoad(3)} loadScreen={loadCommunityScreen} /></TabRenderProbe></TabPane> : placeholder('ph-community'),
      show(4) ? <TabPane key="settings" freezeWanted={freezeWanted(4)}><TabRenderProbe id="tab:settings"><DeferredTabScreen shouldLoad={shouldLoad(4)} loadScreen={loadSettingsScreen} /></TabRenderProbe></TabPane> : placeholder('ph-settings'),
    ];
    return screens.filter((_, logicalIdx) => !isLogicalTabHidden(logicalIdx, pageLayout));
  }, [activeIdx, mountedTabs, openDevHub, pageLayout, physicalPageIdx, t.bgPrimary, tabPaneWidth, visitedTabs]);

  // зачем D129: при смене раскладки state страницы догоняет в layout-эффекте; до него
  // старый индекс может выйти за новую длину ленты — зажимаем, а не падаем.
  const renderPhysicalIdx = (physicalPageIdx < physicalPageCount(pageLayout)
    ? physicalPageIdx
    : logicalTabToPhysicalPage(visibleTabIdx(activeIdx, pageLayout), pageLayout)) as PhysicalPageIndex;
  const runtimeOwnerId = physicalPageToRuntimeOwner(renderPhysicalIdx, pageLayout);

  return (
    <TabProvider
      activeIdx={activeIdx}
      runtimeOwnerId={runtimeOwnerId}
      onTabChange={handleTabChange}
      onSwipeStart={handleSwipeStart}
      onSwipeComplete={handleSwipeComplete}
      focusTick={focusTick}
    >
      <TopFadeScrollProvider>
        {/* зачем (13.10, «тихое окно» премаунта): отметка времени касаний без перехвата — onStartShouldSetResponderCapture всегда false; flex:1 — вида не меняет */}
        <View style={{ flex: 1 }} onStartShouldSetResponderCapture={markTouchForPremount}>
          <TabScaffold
            tabScreens={tabScreens}
            currentRouteIsTab={currentRouteIsTab}
            visualIdx={visualIdx}
            physicalPageIdx={renderPhysicalIdx}
            pageLayout={pageLayout}
            devHubVisible={devHubVisible}
            onCloseDevHub={closeDevHub}
            onOpenDevHub={openDevHub}
          />
        </View>
      </TopFadeScrollProvider>
    </TabProvider>
  );
}

function isDisabledTournamentTabPath(pathnameRaw: string): boolean {
  const pathname = pathnameRaw.replace(/\/$/, '');
  return pathname === '/tournaments' || pathname.endsWith('/(tabs)/tournaments');
}

export default function TabLayout() {
  const pathname = usePathname();
  if (isDisabledTournamentTabPath(pathname)) {
    return <DeferredRedirect href="/(tabs)/home" />;
  }
  // Провайдер видимости таббара обязан стоять ВЫШЕ самого таббара: экран
  // внутри вкладки просит скрытие, а рисует таббар этот же layout.
  return (
    <TabBarVisibilityProvider>
      <ReleasedTabLayout />
    </TabBarVisibilityProvider>
  );
}

const s = StyleSheet.create({

  deferredTabPlaceholder: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  lessonsPaneBoundary: {
    flex: 1,
    minHeight: 0,
  },
  lessonsPaneContent: {
    flex: 1,
    minHeight: 0,
  },
  /** Область свайпа табов; minHeight:0 — иначе flex не даёт скроллу сжиматься (RN). Фон прозрачный — градиент с TabScaffold, без белого «просвета». */
  tabContent: { flex: 1, minHeight: 0, width: '100%', backgroundColor: 'transparent' },
  /** Нижний overlay не резервирует место: контент уходит под него без отдельной
   *  safe-area полосы. overflow не задаём — капсула плавает и должна ронять тень. */
  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 20,
    backgroundColor: 'transparent',
  },
});
