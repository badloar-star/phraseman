/**
 * [TAP-LAT] Трассировка задержки отклика: касание → отпускание → обработчик → коммит → кадр.
 *
 * зачем: владелец чувствует «лёгкую, почти незаметную задержку» на любом тапе и
 * открытии раздела (2026-09-02). По правилу «сперва логи, потом починка» здесь
 * стоит измеритель, который показывает, ГДЕ именно теряется время:
 *   • палец            — сколько палец лежал на экране (нажал→отпустил); это не
 *                        задержка приложения, но без этой цифры остальное не понять;
 *   • JS-лаг на отпускании — насколько JS-поток опоздал обработать отпускание:
 *                        (JS-интервал нажал→отпустил) − (нативный интервал нажал→отпустил).
 *                        Считается по РАЗНИЦАМ, поэтому не зависит от того, в каких
 *                        единицах и от какой точки отсчёта идут нативные часы;
 *   • отпускание→обработчик — от отпускания до onPress/обработчика;
 *   • обработчик→коммит — рендер + коммит экрана назначения (тяжёлый маунт);
 *   • коммит→кадр      — ожидание следующего кадра после коммита (включая всё,
 *                        чем JS занят сразу после коммита: эффекты, колбэки I/O).
 * Вторая строка (↳) объясняет «коммит→кадр»: сколько длинных отрезков JS был занят
 * после коммита и какие React-поддеревья сколько раз и как долго рендерились от
 * момента касания (данные <Profiler> вокруг стека и панелей табов).
 * Без этих цифр любая «починка» — угадывание; с ними видно, что чинить первым.
 *
 * Стоимость: две JS-функции на касание (touchStart в capture-фазе корня без
 * захвата responder + touchEnd корня), один слушатель состояния навигации,
 * колбэки Profiler (в production-сборке React их не вызывает) и короткая серия
 * setTimeout(0) после коммита навигации — только пока не пришёл следующий кадр.
 * В release трассировка ВЫКЛЮЧЕНА, если не задан EXPO_PUBLIC_TAP_LATENCY_TRACE=1.
 *
 * Как читать: grep '[TAP-LAT]' в .expo/metro-console.log (dev) или logcat /
 * Console.app (release с флагом). Последние 60 замеров доступны через
 * getRecentTapLatency() для панели DEV-хаба.
 *
 * ВАЖНО про dev-клиент: Metro докачивает модули лениво, и первое открытие экрана
 * может включать сетевую докачку (строки «Bundled …» рядом в логе). Такие замеры
 * не показательны — смотреть второе открытие или release-сборку.
 */

export const TAP_LATENCY_TRACE_ENABLED: boolean =
  __DEV__ || process.env.EXPO_PUBLIC_TAP_LATENCY_TRACE === '1';

const LOG_PREFIX = '[TAP-LAT]';
/** Касание старше этого окна к моменту коммита навигации = навигация не от тапа (редирект, таймер). */
const TOUCH_TO_NAV_MAX_MS = 3000;
/** Порог, выше которого «отпускание→обработчик» печатается сам по себе (без навигации): один кадр. */
const SLOW_RELEASE_TO_HANDLER_MS = 16;
/** Порог «медленного» открытия экрана целиком (от отпускания до кадра). */
const SLOW_TOTAL_MS = 100;
/** Отрезок занятости JS после коммита, который считаем «длинной задачей». */
const LONG_TASK_MS = 50;
/** Предохранитель сэмплера после коммита: дольше не ждём кадр (приложение ушло в фон). */
const POST_COMMIT_SAMPLER_MAX_MS = 5000;
/** Рендеры короче этого не запоминаем — шум. */
const RENDER_MIN_MS = 1;
const RING_SIZE = 60;
const RENDERS_MAX = 40;

type TouchMark = Readonly<{
  downJsAt: number;
  downNativeTs: number | null;
  upJsAt: number | null;
  upNativeTs: number | null;
}>;
type ActionMark = Readonly<{ at: number; label: string }>;
type RenderMark = Readonly<{ id: string; phase: string; durationMs: number; at: number }>;

export type TapLatencySample = Readonly<{
  /** Экран, который открылся (имя маршрута). */
  route: string;
  /** Откуда пришли (имя предыдущего маршрута), если известно. */
  from: string | null;
  /** Метка обработчика (noteTapAction), если была. */
  label: string | null;
  /** Палец на экране: нажал→отпустил (JS-часы). */
  holdMs: number | null;
  /** Опоздание JS-потока на отпускании: JS-интервал минус нативный интервал. */
  jsLagAtReleaseMs: number | null;
  /** Отпускание → обработчик (onPress). */
  releaseToHandlerMs: number | null;
  /** Обработчик → коммит нового экрана (рендер + коммит). */
  handlerToCommitMs: number | null;
  /** Коммит → следующий кадр. */
  commitToFrameMs: number | null;
  /** Отпускание пальца → кадр с новым экраном. Это и есть «задержка, которую чувствует человек». */
  releaseToFrameMs: number | null;
  /** Длинные (>50 мс) отрезки занятости JS между коммитом и кадром. */
  postCommitLongTasksMs: ReadonlyArray<number>;
  /** Рендеры Profiler-поддеревьев от касания до кадра. */
  renders: ReadonlyArray<RenderMark>;
  /** Date.now() момента коммита. */
  at: number;
}>;

let lastTouch: TouchMark | null = null;
let lastAction: ActionMark | null = null;
let rendersSinceTouch: ReadonlyArray<RenderMark> = [];
let recent: ReadonlyArray<TapLatencySample> = [];

/** Монотонные миллисекунды; в RN есть performance.now(), на всякий случай — Date.now(). */
function nowMs(): number {
  const perf = (globalThis as { performance?: { now?: () => number } }).performance;
  return typeof perf?.now === 'function' ? perf.now() : Date.now();
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatMs(value: number | null): string {
  return value === null ? '—' : `${round1(value)}мс`;
}

function finiteOrNull(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Опоздание JS на отпускании. Нативные метки приходят в разных единицах (iOS —
 * секунды, Android — миллисекунды), поэтому сравниваем ИНТЕРВАЛЫ: берём ту
 * интерпретацию нативного интервала (×1 или ×1000), которая ближе к JS-интервалу,
 * и считаем разницу. Отрицательное (шум часов) режем в ноль.
 */
function jsLagAtRelease(touch: TouchMark): number | null {
  if (touch.upJsAt === null || touch.downNativeTs === null || touch.upNativeTs === null) return null;
  const jsDelta = touch.upJsAt - touch.downJsAt;
  const nativeDeltaRaw = touch.upNativeTs - touch.downNativeTs;
  if (!Number.isFinite(jsDelta) || !Number.isFinite(nativeDeltaRaw) || nativeDeltaRaw < 0) return null;
  const candidates = [nativeDeltaRaw, nativeDeltaRaw * 1000];
  const nativeDelta = candidates.reduce((best, candidate) =>
    Math.abs(candidate - jsDelta) < Math.abs(best - jsDelta) ? candidate : best,
  );
  return round1(Math.max(0, jsDelta - nativeDelta));
}

function remember(sample: TapLatencySample): void {
  // зачем: без лимита кольцо росло бы бесконечно — правило Библии про кэши.
  recent = [...recent.slice(-(RING_SIZE - 1)), sample];
}

/** «stack 2×(118/31мс) · tab:home 9×(220/80/…)» — по поддеревьям, самые тяжёлые первыми. */
function formatRenders(renders: ReadonlyArray<RenderMark>): string {
  if (renders.length === 0) return 'рендеров нет';
  const byId = new Map<string, number[]>();
  for (const render of renders) {
    byId.set(render.id, [...(byId.get(render.id) ?? []), render.durationMs]);
  }
  const groups = [...byId.entries()]
    .map(([id, durations]) => ({ id, durations, total: durations.reduce((sum, value) => sum + value, 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 4);
  return groups
    .map(({ id, durations, total }) => {
      const shown = durations.slice(0, 5).map((value) => Math.round(value)).join('/');
      const tail = durations.length > 5 ? '/…' : '';
      return `${id} ${durations.length}×(${shown}${tail}мс, всего ${Math.round(total)}мс)`;
    })
    .join(' · ');
}

type TouchEventLike = { nativeEvent?: { timestamp?: number } };

/**
 * Корневой capture-обработчик начала касания. Возвращает false: responder НЕ
 * захватываем, касание идёт дальше к кнопке как обычно. Когда трассировка
 * выключена — undefined, чтобы у корня не было даже пустого обработчика.
 */
export function createTapLatencyCaptureHandler(): ((event: TouchEventLike) => boolean) | undefined {
  if (!TAP_LATENCY_TRACE_ENABLED) return undefined;
  return (event) => {
    noteTapTouchDown(event?.nativeEvent?.timestamp);
    return false;
  };
}

/** Корневой обработчик конца касания (onTouchEnd — всплывает от любой кнопки). */
export function createTapLatencyTouchEndHandler(): ((event: TouchEventLike) => void) | undefined {
  if (!TAP_LATENCY_TRACE_ENABLED) return undefined;
  return (event) => {
    noteTapTouchUp(event?.nativeEvent?.timestamp);
  };
}

/** Колбэк для <Profiler onRender>: совместим с ProfilerOnRenderCallback (лишние аргументы игнорируем). */
export type TapLatencyProfilerHandler = (
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
) => void;

/** Когда трассировка выключена — undefined: Profiler не оборачивается вовсе. */
export function createTapLatencyProfilerHandler(): TapLatencyProfilerHandler | undefined {
  if (!TAP_LATENCY_TRACE_ENABLED) return undefined;
  return (id, phase, actualDuration) => {
    noteRender(id, phase, actualDuration);
  };
}

/** Касание началось (capture-фаза корня). */
export function noteTapTouchDown(nativeTimestamp?: number): void {
  if (!TAP_LATENCY_TRACE_ENABLED) return;
  lastTouch = {
    downJsAt: nowMs(),
    downNativeTs: finiteOrNull(nativeTimestamp),
    upJsAt: null,
    upNativeTs: null,
  };
  lastAction = null;
  rendersSinceTouch = [];
}

/** Палец отпущен (onTouchEnd корня). Метку действия НЕ сбрасываем: onPress мог уже сработать в этом же тике. */
export function noteTapTouchUp(nativeTimestamp?: number): void {
  if (!TAP_LATENCY_TRACE_ENABLED) return;
  const touch = lastTouch;
  if (!touch || touch.upJsAt !== null) return;
  lastTouch = { ...touch, upJsAt: nowMs(), upNativeTs: finiteOrNull(nativeTimestamp) };
}

/** Рендер Profiler-поддерева (стек, панель таба). Копится от касания до следующего касания. */
export function noteRender(id: string, phase: string, actualDurationMs: number): void {
  if (!TAP_LATENCY_TRACE_ENABLED) return;
  if (!Number.isFinite(actualDurationMs) || actualDurationMs < RENDER_MIN_MS) return;
  rendersSinceTouch = [
    ...rendersSinceTouch.slice(-(RENDERS_MAX - 1)),
    { id, phase, durationMs: round1(actualDurationMs), at: nowMs() },
  ];
}

/** Момент отпускания: если onTouchEnd ещё не пришёл (тот же тик), считаем отпусканием сам обработчик. */
function releaseAt(touch: TouchMark, action: ActionMark | null): number {
  return touch.upJsAt ?? action?.at ?? touch.downJsAt;
}

/**
 * Обработчик действия начал работу (onPress плитки, тап по табу и т.п.).
 * Печатает строку сам, если от отпускания до обработчика прошло больше кадра —
 * это и есть «кнопка тупит», даже когда навигации нет.
 */
export function noteTapAction(label: string): void {
  if (!TAP_LATENCY_TRACE_ENABLED) return;
  const at = nowMs();
  lastAction = { at, label };
  const touch = lastTouch;
  if (!touch || touch.upJsAt === null) return;
  const releaseToHandler = at - touch.upJsAt;
  if (releaseToHandler > SLOW_RELEASE_TO_HANDLER_MS && releaseToHandler <= TOUCH_TO_NAV_MAX_MS) {
    console.log(
      `${LOG_PREFIX} действие=${label} · палец ${formatMs(touch.upJsAt - touch.downJsAt)}`
        + ` · JS-лаг на отпускании ${formatMs(jsLagAtRelease(touch))}`
        + ` · отпускание→обработчик ${formatMs(releaseToHandler)} (медленно: JS-поток был занят)`,
    );
  }
}

/**
 * Сэмплер занятости JS после коммита: setTimeout(0) тикает, пока JS свободен;
 * если между тиками прошло больше LONG_TASK_MS — JS был занят этот отрезок.
 * Останавливается, когда пришёл кадр (stop()) или по предохранителю.
 */
function startPostCommitSampler(commitAt: number): { stop: (frameAt: number) => ReadonlyArray<number> } {
  const gaps: number[] = [];
  let lastTick = commitAt;
  let running = true;
  const tick = () => {
    if (!running) return;
    const t = nowMs();
    const gap = t - lastTick;
    if (gap > LONG_TASK_MS) gaps.push(round1(gap));
    lastTick = t;
    if (t - commitAt > POST_COMMIT_SAMPLER_MAX_MS) {
      running = false;
      return;
    }
    setTimeout(tick, 0);
  };
  setTimeout(tick, 0);
  return {
    stop: (frameAt: number) => {
      running = false;
      const tailGap = frameAt - lastTick;
      return tailGap > LONG_TASK_MS ? [...gaps, round1(tailGap)] : [...gaps];
    },
  };
}

/**
 * Навигация закоммитила новый экран. Вызывается пробником из слушателя 'state'
 * контейнера навигации — то есть ПОСЛЕ рендера и коммита экрана назначения.
 * Следующим кадром дописываем «коммит→кадр» и печатаем итог.
 */
export function noteTapNavigationCommit(route: string, from: string | null): void {
  if (!TAP_LATENCY_TRACE_ENABLED) return;
  const commitAt = nowMs();
  const touch = lastTouch;
  const action = lastAction;
  const touchAgeMs = touch ? commitAt - touch.downJsAt : null;
  const fromTap = touch !== null && touchAgeMs !== null && touchAgeMs <= TOUCH_TO_NAV_MAX_MS;
  const release = touch && fromTap ? releaseAt(touch, action) : null;
  const handlerStart = fromTap ? (action?.at ?? release) : null;
  const sampler = startPostCommitSampler(commitAt);

  requestAnimationFrame(() => {
    const frameAt = nowMs();
    const longTasks = sampler.stop(frameAt);
    const renders = rendersSinceTouch;
    const commitToFrame = round1(frameAt - commitAt);
    const sample: TapLatencySample = {
      route,
      from,
      label: action?.label ?? null,
      holdMs: touch && fromTap && touch.upJsAt !== null ? round1(touch.upJsAt - touch.downJsAt) : null,
      jsLagAtReleaseMs: touch && fromTap ? jsLagAtRelease(touch) : null,
      releaseToHandlerMs: action && release !== null ? round1(Math.max(0, action.at - release)) : null,
      handlerToCommitMs: handlerStart !== null ? round1(commitAt - handlerStart) : null,
      commitToFrameMs: commitToFrame,
      releaseToFrameMs: release !== null ? round1(frameAt - release) : null,
      postCommitLongTasksMs: longTasks,
      renders,
      at: Date.now(),
    };
    remember(sample);
    const busyLine = longTasks.length === 0
      ? 'JS после коммита свободен'
      : `JS после коммита занят: ${longTasks.length} отрезк. >${LONG_TASK_MS}мс (${longTasks.map((value) => Math.round(value)).join('/')}мс)`;
    if (!fromTap) {
      console.log(
        `${LOG_PREFIX} → ${route}${from ? ` (из ${from})` : ''} · без касания (редирект/таймер) · коммит→кадр ${formatMs(commitToFrame)}`
          + `\n${LOG_PREFIX}    ↳ ${busyLine} · рендеры: ${formatRenders(renders)}`,
      );
      return;
    }
    const slow = sample.releaseToFrameMs !== null && sample.releaseToFrameMs > SLOW_TOTAL_MS ? ' ⚠️ МЕДЛЕННО' : '';
    console.log(
      `${LOG_PREFIX} → ${route}${from ? ` (из ${from})` : ''}${action ? ` · действие=${action.label}` : ''}`
        + ` · палец ${formatMs(sample.holdMs)}`
        + ` · JS-лаг на отпускании ${formatMs(sample.jsLagAtReleaseMs)}`
        + ` · отпускание→обработчик ${formatMs(sample.releaseToHandlerMs)}`
        + ` · обработчик→коммит ${formatMs(sample.handlerToCommitMs)}`
        + ` · коммит→кадр ${formatMs(sample.commitToFrameMs)}`
        + ` · ОТ ОТПУСКАНИЯ ДО КАДРА ${formatMs(sample.releaseToFrameMs)}${slow}`
        + `\n${LOG_PREFIX}    ↳ ${busyLine} · рендеры от касания: ${formatRenders(renders)}`,
    );
  });
}

/** Последние замеры (для панели DEV-хаба). Новые — в конце. */
export function getRecentTapLatency(): ReadonlyArray<TapLatencySample> {
  return recent;
}

/** Служебная строка трассировки с общим префиксом (для пробников; молчит, когда трассировка выключена). */
export function traceLog(message: string): void {
  if (!TAP_LATENCY_TRACE_ENABLED) return;
  console.log(`${LOG_PREFIX} ${message}`);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
