// ═══════════════════════════════════════════════════════════════════════════
// home_net_banner_step.ts — чистое решение «показывать ли «Нет сети» на Главной» по снимку NetInfo и времени.
//
// зачем (владелец 26.10, скрин эмулятора: «Нет сети» при живой сети — «вот этого экрана не надо»): одного
// `isInternetReachable === false` хватало, чтобы включить строку. Проба доступности NetInfo врёт на эмуляторе, за порталом
// Wi-Fi и на медленной сети — тот же урок, что у «Диалогов» 22.10. Правило:
//   · `isConnected === false` — нет сети сразу;
//   · `isInternetReachable === false` — только если держится дольше NET_BANNER_UNREACHABLE_MS (короткий провал не виден);
//   · `null` / неизвестно — сеть есть;
//   · возврат сети — строка уходит сразу, отсчёт «недоступно» сбрасывается (дребезг не копит время).
// Без импортов React Native — тестируется без моков; хук (use_home_scene_offline.ts) держит таймер и журнал [NET-BANNER].
// ═══════════════════════════════════════════════════════════════════════════

/** Сколько `isInternetReachable === false` при живом подключении должно продержаться, чтобы показать «Нет сети». */
export const NET_BANNER_UNREACHABLE_MS = 5_000;

/** Поля снимка NetInfo, которые решают (тот же смысл, что у NetInfoState). */
export type NetBannerSnapshot = Readonly<{
  isConnected: boolean | null;
  isInternetReachable: boolean | null | undefined;
  type: string;
}>;

export type NetBannerStep = Readonly<{
  offline: boolean;
  /** С какого момента подряд держится reachable=false при живом подключении (null — не держится). */
  unreachableSinceMs: number | null;
  /** Через сколько перепроверить тот же снимок (null — перепроверка не нужна). */
  recheckInMs: number | null;
  reason: string;
}>;

/** Прошлый отсчёт «недоступно» + новый снимок NetInfo → показывать ли строку. */
export function homeNetBannerStep(prevUnreachableSinceMs: number | null, state: NetBannerSnapshot, nowMs: number): NetBannerStep {
  const snap = `connected=${String(state.isConnected)} reachable=${String(state.isInternetReachable)} type=${String(state.type)}`;
  if (state.isConnected === false) {
    return { offline: true, unreachableSinceMs: null, recheckInMs: null, reason: `not_connected ${snap}` };
  }
  if (state.isInternetReachable === false) {
    const since = prevUnreachableSinceMs ?? nowMs;
    const heldMs = Math.max(0, nowMs - since);
    if (heldMs >= NET_BANNER_UNREACHABLE_MS) {
      return { offline: true, unreachableSinceMs: since, recheckInMs: null, reason: `unreachable_held held_ms=${heldMs} ${snap}` };
    }
    return {
      offline: false,
      unreachableSinceMs: since,
      recheckInMs: NET_BANNER_UNREACHABLE_MS - heldMs,
      reason: `unreachable_wait held_ms=${heldMs} ${snap}`,
    };
  }
  // null / undefined — NetInfo ещё не знает: считаем, что сеть есть (вслепую «Нет сети» не показываем).
  return { offline: false, unreachableSinceMs: null, recheckInMs: null, reason: `online ${snap}` };
}

/** Мгновенное решение по одному снимку (без отсчёта): reachable=false само по себе «Нет сети» не включает. */
export function homeSceneOfflineVerdict(state: NetBannerSnapshot): Readonly<{ offline: boolean; reason: string }> {
  const step = homeNetBannerStep(null, state, 0);
  return { offline: step.offline, reason: step.reason };
}
