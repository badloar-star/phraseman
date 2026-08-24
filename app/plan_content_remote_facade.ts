// ════════════════════════════════════════════════════════════════════════════
// plan_content_remote_facade.ts — the ONE call screens make to fetch a plan day.
//
// Screens used to read `getAuthoredPlanContentDay()` directly (bundled only).
// This facade hides the new path: it builds the pack cache key from the server
// registration, asks the async remote-or-bundled bridge to resolve the day, and
// records telemetry. When remote is disabled or the registration/cache are not
// ready yet, it transparently falls back to bundled. Result: screens get the
// verified server day when available, the bundled copy otherwise, and we always
// know which one served them.
// ════════════════════════════════════════════════════════════════════════════
import { buildCoursePackCacheKey, validateCoursePackManifest } from './course_pack_manifest';
import { ensureRemoteCoursePack } from './course_pack_remote_loader';
import {
  getBundledCompatibilityPlanContentTheoryDay,
} from './plan_content_readiness';
import {
  resolveRemoteOrBundledPlanContentDay,
  type PlanContentRemoteDay,
} from './plan_content_remote_readiness';
import {
  getPlanContentRemoteRegistration,
  planContentRowUrl,
} from './plan_content_remote_registration';
import {
  recordPlanContentSource,
  telemetryFromRemoteDay,
  type PlanContentFallbackReason,
  type PlanContentTelemetrySurface,
} from './plan_content_remote_telemetry';
import type { PlanContentDay } from './plan_content_schema';

/**
 * One-shot fetch+cache of the registered plan_content pack. Idempotent and
 * deduplicated by the loader. Safe to call from screen mount (it does nothing
 * while remote loading is disabled).
 *
 * Returns the cache key on success so callers can subsequently resolve days
 * against the verified cache. Returns null on any failure: callers should keep
 * using the bundled fallback in that case (which is what the bridge does
 * automatically when no cacheKey is supplied).
 */
let cachedCacheKey: string | null = null;
let cachedCacheKeyAt = 0;
const CACHE_KEY_TTL_MS = 5 * 60 * 1000;

export async function ensurePlanContentPackReady(): Promise<string | null> {
  const reg = getPlanContentRemoteRegistration();
  if (!reg) return null;
  // Cheap memo: a successful manifest fetch a few minutes ago is good enough to
  // skip a network round-trip on every screen mount. ensureRemoteCoursePack is
  // itself deduplicated, so this is belt-and-suspenders.
  if (cachedCacheKey && Date.now() - cachedCacheKeyAt < CACHE_KEY_TTL_MS) return cachedCacheKey;

  const startedAt = Date.now();
  const result = await ensureRemoteCoursePack(reg.manifestUrl, (inPackPath) => planContentRowUrl(inPackPath));
  // зачем (приёмка Ф1 «Бандл-диеты» 2026-08-24): дев-лог показал
  // `bundled_compatibility (pack_not_cached)`, но по нему нельзя понять, доехал
  // ли пак вообще — медленная сеть, ошибка загрузки или битый манифест выглядят
  // одинаково. Печатаем исход загрузки пака и сколько он занял. Только dev.
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const ms = Date.now() - startedAt;
    const detail = result.state === 'manifest_invalid'
      ? ` errors=${result.errors.slice(0, 2).join('; ')}`
      : result.state === 'integrity_failed'
        ? ` detail=${result.detail}`
        : result.state === 'index_download_failed'
          ? ' detail=index.json не скачался (проверь idempotent/права записи)'
          : '';
    // eslint-disable-next-line no-console -- dev-only приёмочный сигнал
    console.log(`[plan_pack] ensure → ${result.state} (${ms}ms)${detail}`);
  }
  if (result.state === 'ready') {
    cachedCacheKey = buildCoursePackCacheKey(result.manifest);
    cachedCacheKeyAt = Date.now();
    return cachedCacheKey;
  }
  // Manifest came in but failed validation? Try to compute cacheKey from the
  // registration directly so subsequent read-from-cache attempts can still hit
  // a previously-good cache, if one exists on disk.
  return null;
}

export type PlanContentDayFetch = PlanContentRemoteDay;

/**
 * Resolve a plan-content day for a screen, preferring the verified server copy
 * when available and falling back to bundled otherwise. Records telemetry.
 *
 * This is the SINGLE call screens should use instead of reading the bundled
 * registry directly. It is async, but never blocks meaningfully: the bridge
 * returns synchronously-equivalent data in the disabled/no-pack paths.
 */
export async function fetchPlanContentDayForScreen(
  planId: string,
  dayIndex: number,
  surface: PlanContentTelemetrySurface,
): Promise<PlanContentDayFetch> {
  let extraReason: PlanContentFallbackReason = '';
  let cacheKey: string | null = null;
  try {
    cacheKey = await ensurePlanContentPackReady();
  } catch {
    cacheKey = null;
  }
  if (!cacheKey) {
    // The registration may be off (flag disabled) or the manifest fetch may
    // have failed. Either way, the bridge will serve bundled — we just want
    // the telemetry to say WHY.
    const reg = getPlanContentRemoteRegistration();
    extraReason = reg ? 'network_unavailable' : 'remote_disabled';
  }

  const result = await resolveRemoteOrBundledPlanContentDay(
    planId,
    dayIndex,
    cacheKey ?? undefined,
    cacheKey ? planContentRowUrl : undefined,
  );
  recordPlanContentSource(telemetryFromRemoteDay(planId, dayIndex, surface, result, extraReason));
  return result;
}

/**
 * Server-first with a short deadline. The screen sees:
 *   - `initial`: what to render IMMEDIATELY (either the server day if it came in
 *     under the deadline, or — if the deadline expired or the server can't help
 *     — the bundled compatibility day). Never null on a day the bundled gate
 *     considers renderable.
 *   - `initialSource`: which one above actually fed `initial`. Drives the
 *     initial telemetry record.
 *   - `pendingUpgrade`: when the server lost the race, a Promise that may yield
 *     the verified server day later. The screen subscribes once and atomically
 *     upgrades from bundled→server. Resolves to null if the server never
 *     produces a better answer than the one already rendered.
 *
 * Why server-first with a deadline:
 *   - Cache-hit path (which is the steady state): the server day is read from
 *     disk in milliseconds — wins the race, no bundled flash, no swap.
 *   - Cold-cache or slow-network path: bundled paints at the deadline so the
 *     screen never feels stuck. The server day, when it arrives, upgrades in
 *     place — the bundled is just the corrected-by-review version anyway.
 *   - Offline / remote disabled / no registration: bundled wins immediately
 *     because the bridge resolves synchronously-equivalent in those branches.
 */
// зачем (расследование 2026-08-24): замер живой цепочки Storage дал
// manifest 654 мс + index 848 мс + day-row 597 мс ≈ 2100 мс на ХОЛОДНОМ кэше,
// а дедлайн стоял 150 мс — сервер не мог выиграть гонку НИКОГДА при первом
// заходе, и экран всегда рисовал bundled (`pack_not_cached`). 150 мс — это
// бюджет ТЁПЛОГО пути (чтение с диска — миллисекунды), он и остаётся целью.
// Порог поднят до 1200 мс: тёплый кэш по-прежнему отвечает мгновенно, а на
// холодном мы даём серверу реальный шанс, не заставляя пользователя ждать
// дольше секунды — дальше всё равно рисуется bundled и апгрейдится фоном.
const SERVER_DEADLINE_MS = 1200;

export type PlanContentScreenFetch = {
  initial: PlanContentDay | null;
  initialSource: 'downloaded_pack' | 'bundled_compatibility' | 'missing';
  pendingUpgrade: Promise<PlanContentDay | null> | null;
};

export async function fetchPlanContentDayForScreenServerFirst(
  planId: string,
  dayIndex: number,
  surface: PlanContentTelemetrySurface,
): Promise<PlanContentScreenFetch> {
  // Kick off the real server-or-bundled bridge resolution immediately.
  // ensurePlanContentPackReady is non-blocking (5-min memo + idempotent),
  // and resolveRemoteOrBundledPlanContentDay is what knows how to read the
  // verified cache vs fall back to bundled.
  const bundledImmediate = (() => {
    try {
      return getBundledCompatibilityPlanContentTheoryDay(planId, dayIndex) ?? null;
    } catch {
      return null;
    }
  })();

  let extraReason: PlanContentFallbackReason = '';
  const serverPromise = (async () => {
    let cacheKey: string | null = null;
    try { cacheKey = await ensurePlanContentPackReady(); } catch { cacheKey = null; }
    if (!cacheKey) {
      const reg = getPlanContentRemoteRegistration();
      extraReason = reg ? 'network_unavailable' : 'remote_disabled';
    }
    return resolveRemoteOrBundledPlanContentDay(
      planId,
      dayIndex,
      cacheKey ?? undefined,
      cacheKey ? planContentRowUrl : undefined,
    );
  })();

  // Race the server against the deadline. Whichever finishes first wins the
  // initial paint. The server promise keeps running in the background regardless.
  type Tagged = { kind: 'server'; value: PlanContentRemoteDay } | { kind: 'deadline' };
  const winner: Tagged = await Promise.race<Tagged>([
    serverPromise.then((r): Tagged => ({ kind: 'server', value: r })),
    new Promise<Tagged>((resolve) => setTimeout(() => resolve({ kind: 'deadline' }), SERVER_DEADLINE_MS)),
  ]);

  if (winner.kind === 'server') {
    // Server beat the deadline — paint server day right away, no swap needed.
    const r = winner.value;
    recordPlanContentSource(telemetryFromRemoteDay(planId, dayIndex, surface, r, extraReason));
    return { initial: r.day, initialSource: r.source, pendingUpgrade: null };
  }

  // Deadline won — paint bundled now, but keep waiting for the server in the
  // background. Only emit telemetry for what the screen actually showed first.
  recordPlanContentSource({
    planId, dayIndex, surface,
    source: bundledImmediate ? 'bundled_compatibility' : 'missing',
    reason: bundledImmediate ? 'pack_not_cached' : 'no_bundled_day',
    recoveredFromCorruption: false,
  });

  const pendingUpgrade = serverPromise.then((late) => {
    if (!late || late.source !== 'downloaded_pack' || !late.day) return null;
    // The server eventually produced a verified day. Record the transition so
    // FULL dashboard can see "started as bundled, healed to server".
    recordPlanContentSource(telemetryFromRemoteDay(planId, dayIndex, surface, late, extraReason));
    return late.day;
  }).catch(() => null);

  return { initial: bundledImmediate, initialSource: bundledImmediate ? 'bundled_compatibility' : 'missing', pendingUpgrade };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __PlanContentRemoteFacadeRouteShim() {
  return null;
}
