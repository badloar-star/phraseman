/**
 * Ссылка холодного старта: что распознал redirectSystemPath при `initial: true`.
 *
 * зачем (Сверка 10.10 21:55, [DEEPLINK]): холодный `phraseman://video` распознаётся как `/(tabs)/video`, но
 * маршрутизатор при старте остаётся на корне `/`, и через ~2,4 с стартовый переход «корень → Главная»
 * (app/_layout.tsx, rootIndex_replace_home) съедает ссылку. Здесь ссылка живёт до первого такого перехода —
 * он открывает её вместо Главной. Только вкладки и только свежие (60 с): старая ссылка после онбординга
 * не должна внезапно увести человека.
 *
 * Логи: префикс [DEEPLINK].
 */
const INITIAL_DEEP_LINK_TTL_MS = 60_000;

let pending: { target: string; atMs: number } | null = null;

export function rememberInitialDeepLinkTarget(target: string, nowMs: number = Date.now()): void {
  pending = { target, atMs: nowMs };
}

/** Забирает ссылку один раз. null — нет, протухла или это не вкладка (тогда обычный путь на Главную). */
export function consumeInitialDeepLinkTarget(nowMs: number = Date.now()): string | null {
  const current = pending;
  pending = null;
  if (!current) return null;
  const ageMs = nowMs - current.atMs;
  if (ageMs > INITIAL_DEEP_LINK_TTL_MS) {
    console.log('[DEEPLINK] initial_link_expired', JSON.stringify({ target: current.target.split('?')[0], ageMs }));
    return null;
  }
  if (!/^\/\(tabs\)\/[a-z_-]+/i.test(current.target)) {
    console.log('[DEEPLINK] initial_link_not_tab', JSON.stringify({ target: current.target.split('?')[0] }));
    return null;
  }
  return current.target;
}

/* expo-router: не регистрировать файл как экран */
export default function __InitialDeepLinkStoreRouteShim() {
  return null;
}
