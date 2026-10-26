// ═══════════════════════════════════════════════════════════════════════════
// net_offline_step.ts — одно правило «нет сети» для экранов, которые решают по NetInfo.
//
// зачем (владелец 26.10, скрин эмулятора: «Нет сети» при живой сети — «вот этого экрана не надо»; координатор: тот же шаблон
// в каталоге и в очереди зовов — общий помощник): одного `isInternetReachable === false` хватало, чтобы объявить офлайн. Проба
// доступности NetInfo врёт на эмуляторе, за порталом Wi-Fi и на медленной сети. Правило:
//   · `isConnected === false` — нет сети сразу;
//   · `isInternetReachable === false` — только если держится дольше NET_UNREACHABLE_CONFIRM_MS (короткий провал не виден);
//   · `null` / неизвестно — сеть есть;
//   · возврат сети — сразу, отсчёт «недоступно» сбрасывается (дребезг не копит время).
// Разовая проверка без подписки (перед действием) — netOfflineInstant: ждать 5 с перед тапом нельзя, поэтому офлайн только при
// `isConnected === false`. Без импортов React Native: тестируется без моков. Журнал [NET-BANNER] с меткой места.
// ═══════════════════════════════════════════════════════════════════════════

const LOG = '[NET-BANNER]';

/** Сколько `isInternetReachable === false` при живом подключении должно продержаться, чтобы считать «нет сети». */
export const NET_UNREACHABLE_CONFIRM_MS = 5_000;

/** Поля снимка NetInfo, которые решают (тот же смысл, что у NetInfoState). */
export type NetOfflineSnapshot = Readonly<{
  isConnected: boolean | null | undefined;
  isInternetReachable?: boolean | null | undefined;
  type?: string | null | undefined;
}>;

export type NetOfflineStep = Readonly<{
  offline: boolean;
  /** С какого момента подряд держится reachable=false при живом подключении (null — не держится). */
  unreachableSinceMs: number | null;
  /** Через сколько перепроверить тот же снимок (null — перепроверка не нужна). */
  recheckInMs: number | null;
  reason: string;
}>;

function snapText(state: NetOfflineSnapshot): string {
  return `connected=${String(state.isConnected)} reachable=${String(state.isInternetReachable)} type=${String(state.type)}`;
}

/** Прошлый отсчёт «недоступно» + новый снимок NetInfo → офлайн ли. */
export function netOfflineStep(prevUnreachableSinceMs: number | null, state: NetOfflineSnapshot, nowMs: number): NetOfflineStep {
  const snap = snapText(state);
  if (state.isConnected === false) {
    return { offline: true, unreachableSinceMs: null, recheckInMs: null, reason: `not_connected ${snap}` };
  }
  if (state.isInternetReachable === false) {
    const since = prevUnreachableSinceMs ?? nowMs;
    const heldMs = Math.max(0, nowMs - since);
    if (heldMs >= NET_UNREACHABLE_CONFIRM_MS) {
      return { offline: true, unreachableSinceMs: since, recheckInMs: null, reason: `unreachable_held held_ms=${heldMs} ${snap}` };
    }
    return {
      offline: false,
      unreachableSinceMs: since,
      recheckInMs: NET_UNREACHABLE_CONFIRM_MS - heldMs,
      reason: `unreachable_wait held_ms=${heldMs} ${snap}`,
    };
  }
  // null / undefined — NetInfo ещё не знает: считаем, что сеть есть (вслепую «нет сети» не объявляем).
  return { offline: false, unreachableSinceMs: null, recheckInMs: null, reason: `online ${snap}` };
}

/** Разовая проверка без отсчёта: reachable=false само по себе «нет сети» не объявляет. */
export function netOfflineInstant(state: NetOfflineSnapshot): Readonly<{ offline: boolean; reason: string }> {
  const step = netOfflineStep(null, state, 0);
  return { offline: step.offline, reason: step.reason };
}

export type NetOfflineTrackerDeps = Readonly<{
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
}>;

const REAL_DEPS: NetOfflineTrackerDeps = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

/**
 * Подписка на NetInfo по общему правилу: на каждое сообщение — решение (onDecision зовётся на каждое, и на перепроверку);
 * при reachable=false — один таймер перепроверки тем же снимком. Возвращает отписку (снимает и таймер).
 */
export function trackNetOffline(
  place: string,
  subscribe: (listener: (state: NetOfflineSnapshot) => void) => () => void,
  onDecision: (offline: boolean, reason: string) => void,
  deps: NetOfflineTrackerDeps = REAL_DEPS,
): () => void {
  let alive = true;
  let timer: unknown = null;
  let unreachableSinceMs: number | null = null;
  let lastOffline: boolean | null = null;
  let shownAtMs: number | null = null;
  let lastState: NetOfflineSnapshot | null = null;
  const clearRecheck = () => {
    if (timer !== null) deps.clearTimeout(timer);
    timer = null;
  };
  const apply = (state: NetOfflineSnapshot, source: 'event' | 'recheck') => {
    if (!alive) {
      console.log(LOG, 'apply:skip', JSON.stringify({ place, reason: 'unsubscribed', source })); // guard-ok: ранний выход называет причину
      return;
    }
    lastState = state;
    const nowMs = deps.now();
    const step = netOfflineStep(unreachableSinceMs, state, nowMs);
    unreachableSinceMs = step.unreachableSinceMs;
    clearRecheck();
    if (step.recheckInMs !== null) {
      timer = deps.setTimeout(() => {
        timer = null;
        if (lastState) apply(lastState, 'recheck');
      }, step.recheckInMs);
    }
    console.log(LOG, 'decision', JSON.stringify({ // guard-ok: одна строка на сообщение NetInfo / перепроверку
      place,
      source,
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      offline: step.offline,
      previous: lastOffline,
      reason: step.reason,
      recheckInMs: step.recheckInMs,
    }));
    if (lastOffline !== step.offline) {
      if (step.offline) {
        shownAtMs = nowMs;
        console.log(LOG, 'offline', JSON.stringify({ place, reason: step.reason })); // guard-ok: стало «нет сети» — что решило
      } else if (lastOffline === true) {
        console.log(LOG, 'online', JSON.stringify({ place, offlineMs: shownAtMs === null ? null : nowMs - shownAtMs, reason: step.reason })); // guard-ok: сеть вернулась — сколько не было
        shownAtMs = null;
      }
      lastOffline = step.offline;
    }
    onDecision(step.offline, step.reason);
  };
  const unsubscribe = subscribe((state) => { apply(state, 'event'); });
  return () => {
    alive = false;
    clearRecheck();
    unsubscribe();
  };
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
