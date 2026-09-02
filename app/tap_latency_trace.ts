/**
 * [TAP-LAT] Трассировка задержки отклика: касание → обработчик → коммит экрана → кадр.
 *
 * зачем: владелец чувствует «лёгкую, почти незаметную задержку» на любом тапе и
 * открытии раздела (2026-09-02). По правилу «сперва логи, потом починка» здесь
 * стоит измеритель, который показывает, ГДЕ именно теряется время:
 *   • касание→JS      — был ли занят JS-поток в момент касания (нативная метка
 *                        касания против момента, когда JS её обработал);
 *   • JS→обработчик   — сколько прошло от касания до onPress (Pressable зовёт
 *                        onPress на отпускании пальца, это нормальная часть);
 *   • обработчик→коммит — рендер + коммит экрана назначения (тяжёлый маунт);
 *   • коммит→кадр     — ожидание следующего кадра после коммита.
 * Без этих цифр любая «починка» — угадывание; с ними видно, что чинить первым.
 *
 * Стоимость: одна JS-функция на касание (capture-фаза корня, responder не
 * захватывается) и один слушатель состояния навигации. В release трассировка
 * ВЫКЛЮЧЕНА, если не задан EXPO_PUBLIC_TAP_LATENCY_TRACE=1.
 *
 * Как читать: grep '[TAP-LAT]' в .expo/metro-console.log (dev) или logcat /
 * Console.app (release с флагом). Последние 60 замеров доступны через
 * getRecentTapLatency() для панели DEV-хаба.
 */

export const TAP_LATENCY_TRACE_ENABLED: boolean =
  __DEV__ || process.env.EXPO_PUBLIC_TAP_LATENCY_TRACE === '1';

const LOG_PREFIX = '[TAP-LAT]';
/** Касание старше этого окна к моменту коммита навигации = навигация не от тапа (редирект, таймер). */
const TOUCH_TO_NAV_MAX_MS = 3000;
/** Порог, выше которого «касание→обработчик» печатается сам по себе (без навигации). */
const SLOW_TAP_TO_HANDLER_MS = 32;
/** Порог «медленного» открытия экрана целиком. */
const SLOW_TOTAL_MS = 100;
/** Разумное окно сравнения нативной метки касания с JS-часами. */
const NATIVE_TS_SANE_WINDOW_MS = 5000;
const RING_SIZE = 60;

type TouchMark = Readonly<{ jsAt: number; touchToJsMs: number | null }>;
type ActionMark = Readonly<{ at: number; label: string }>;

export type TapLatencySample = Readonly<{
  /** Экран, который открылся (имя маршрута) или метка действия. */
  route: string;
  /** Откуда пришли (имя предыдущего маршрута), если известно. */
  from: string | null;
  /** Метка обработчика (noteTapAction), если была. */
  label: string | null;
  /** Нативная метка касания → JS обработал касание (приблизительно; null, если часы несравнимы). */
  touchToJsMs: number | null;
  /** Касание (в JS) → обработчик onPress. Включает время удержания пальца. */
  tapToHandlerMs: number | null;
  /** Обработчик → коммит нового экрана в навигации (рендер + коммит). */
  handlerToCommitMs: number | null;
  /** Коммит → следующий кадр. */
  commitToFrameMs: number | null;
  /** Касание → кадр с новым экраном. */
  totalMs: number | null;
  /** Date.now() момента коммита/действия. */
  at: number;
}>;

let lastTouch: TouchMark | null = null;
let lastAction: ActionMark | null = null;
let recent: ReadonlyArray<TapLatencySample> = [];

/** Монотонные миллисекунды; в RN есть performance.now(), на всякий случай — Date.now(). */
function nowMs(): number {
  const perf = (globalThis as { performance?: { now?: () => number } }).performance;
  return typeof perf?.now === 'function' ? perf.now() : Date.now();
}

/**
 * Нативная метка касания приходит в разных единицах: iOS (UITouch.timestamp) —
 * секунды с загрузки, Android (MotionEvent.getEventTime) — миллисекунды с
 * загрузки. JS performance.now() — тоже «с загрузки» (steady_clock). Берём ту
 * интерпретацию, которая попадает в разумное окно; иначе честно возвращаем null.
 */
function touchToJsFromNative(nativeTs: number | undefined, jsAt: number): number | null {
  if (typeof nativeTs !== 'number' || !Number.isFinite(nativeTs)) return null;
  const candidates = [nativeTs, nativeTs * 1000];
  for (const candidate of candidates) {
    const delta = jsAt - candidate;
    if (delta >= 0 && delta <= NATIVE_TS_SANE_WINDOW_MS) return Math.round(delta * 10) / 10;
  }
  return null;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function remember(sample: TapLatencySample): void {
  // зачем: без лимита кольцо росло бы бесконечно — правило Библии про кэши.
  recent = [...recent.slice(-(RING_SIZE - 1)), sample];
}

function formatMs(value: number | null): string {
  return value === null ? '—' : `${round1(value)}мс`;
}

/**
 * Корневой capture-обработчик касания. Возвращает false: responder НЕ захватываем,
 * касание идёт дальше к кнопке как обычно. Когда трассировка выключена — undefined,
 * чтобы у корня не было даже пустого обработчика.
 */
export function createTapLatencyCaptureHandler():
  | ((event: { nativeEvent?: { timestamp?: number } }) => boolean)
  | undefined {
  if (!TAP_LATENCY_TRACE_ENABLED) return undefined;
  return (event) => {
    noteTapTouchDown(event?.nativeEvent?.timestamp);
    return false;
  };
}

/** Касание началось (capture-фаза корня). */
export function noteTapTouchDown(nativeTimestamp?: number): void {
  if (!TAP_LATENCY_TRACE_ENABLED) return;
  const jsAt = nowMs();
  lastTouch = { jsAt, touchToJsMs: touchToJsFromNative(nativeTimestamp, jsAt) };
  lastAction = null;
}

/**
 * Обработчик действия начал работу (onPress плитки Главной, тап по табу и т.п.).
 * Печатает строку сам, если от касания до обработчика прошло подозрительно долго —
 * это и есть «кнопка тупит», даже когда навигации нет.
 */
export function noteTapAction(label: string): void {
  if (!TAP_LATENCY_TRACE_ENABLED) return;
  const at = nowMs();
  lastAction = { at, label };
  const touch = lastTouch;
  if (!touch) return;
  const tapToHandler = at - touch.jsAt;
  if (tapToHandler > SLOW_TAP_TO_HANDLER_MS && tapToHandler <= TOUCH_TO_NAV_MAX_MS) {
    console.log(
      `${LOG_PREFIX} действие=${label} · касание→JS ${formatMs(touch.touchToJsMs)} · касание→обработчик ${formatMs(tapToHandler)} (медленно: JS-поток был занят или палец удерживался)`,
    );
  }
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
  const tapToHandler = touch && action ? action.at - touch.jsAt : null;
  const touchAgeMs = touch ? commitAt - touch.jsAt : null;
  const fromTap = touchAgeMs !== null && touchAgeMs <= TOUCH_TO_NAV_MAX_MS;
  const handlerStart = action ? action.at : fromTap && touch ? touch.jsAt : null;
  const handlerToCommit = handlerStart !== null ? commitAt - handlerStart : null;

  requestAnimationFrame(() => {
    const frameAt = nowMs();
    const commitToFrame = frameAt - commitAt;
    const total = fromTap && touch ? frameAt - touch.jsAt : null;
    const sample: TapLatencySample = {
      route,
      from,
      label: action?.label ?? null,
      touchToJsMs: fromTap && touch ? touch.touchToJsMs : null,
      tapToHandlerMs: fromTap ? tapToHandler : null,
      handlerToCommitMs: fromTap ? handlerToCommit : null,
      commitToFrameMs: round1(commitToFrame),
      totalMs: total,
      at: Date.now(),
    };
    remember(sample);
    const slow = total !== null && total > SLOW_TOTAL_MS ? ' ⚠️ МЕДЛЕННО' : '';
    if (fromTap) {
      console.log(
        `${LOG_PREFIX} → ${route}${from ? ` (из ${from})` : ''}${action ? ` · действие=${action.label}` : ''}`
          + ` · касание→JS ${formatMs(sample.touchToJsMs)}`
          + ` · касание→обработчик ${formatMs(sample.tapToHandlerMs)}`
          + ` · обработчик→коммит ${formatMs(sample.handlerToCommitMs)}`
          + ` · коммит→кадр ${formatMs(sample.commitToFrameMs)}`
          + ` · ВСЕГО ${formatMs(total)}${slow}`,
      );
    } else {
      console.log(
        `${LOG_PREFIX} → ${route}${from ? ` (из ${from})` : ''} · без касания (редирект/таймер) · коммит→кадр ${formatMs(sample.commitToFrameMs)}`,
      );
    }
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
