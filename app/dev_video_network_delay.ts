/**
 * DEV-задержка сети для экрана «Видео» (R57 #23, координатор 15.10: «плейлист из хвоста на медленной сети — сымитируй задержку в коде, проверь скелет и пустое состояние, логи»).
 *
 * Включается ТОЛЬКО в dev-сборке (`__DEV__ && !IS_STORE_RELEASE`): `globalThis.__DEV_VIDEO_NETWORK_DELAY_MS__ = 20000` в консоли JS (0 или удалить — снять). Перед чтением полного списка
 * канала (`loadAllChannelVideos`) делается пауза на это число миллисекунд — как на очень медленной сети. В стор-сборке функция всегда возвращает 0. Лог: [ALL-VIDEOS] DEV: искусственная задержка.
 */
import { IS_STORE_RELEASE } from './config';

const MAX_DELAY_MS = 120_000;

/** Миллисекунды искусственной задержки сети (0 — нет). Некорректное значение — 0 с предупреждением. */
export function getDevVideoNetworkDelayMs(): number {
  if (!(typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE)) return 0;
  const raw = (globalThis as { __DEV_VIDEO_NETWORK_DELAY_MS__?: unknown }).__DEV_VIDEO_NETWORK_DELAY_MS__;
  if (raw === undefined || raw === null || raw === 0) return 0;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0 || raw > MAX_DELAY_MS) {
    console.warn('[ALL-VIDEOS] DEV: задержка сети отклонена — нужно число 0…120000 мс', JSON.stringify({ raw: String(raw) })); // guard-ok: ранний выход логируется
    return 0;
  }
  return Math.round(raw);
}

/* expo-router route shim: служебный модуль в app/ не должен становиться экраном. */
export default function __DevVideoNetworkDelayRouteShim() { return null; }
