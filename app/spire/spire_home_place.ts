// ═══════════════════════════════════════════════════════════════════════════
// spire_home_place.ts — место в лиге Пика для бейджа плитки «Пик» на Главной.
//
// зачем (владелец 17.10: «на Главной Пик — кнопка-иконка»; решение координатора — эталон #four-tiles вариант (в):
// «у Пика бейдж места в лиге — „3 место“, у новичка без места бейджа нет; число — из уже прогретой комнаты, без нового запроса»):
// считаем место тем же расчётом, что экран Пика (spireBuildRoomRows → spireMyPlace), но ТОЛЬКО из копий на устройстве:
// комната (память → диск этой недели), конфиг (память → диск), своя неделя (диск). Сети нет никогда.
// Значение кладём в лёгкое хранилище с подписчиками — перерисовывается только ряд плиток, не вся Главная.
// ═══════════════════════════════════════════════════════════════════════════
import { useSyncExternalStore } from 'react';

import type { SpireLang } from '../../modules/spire/report_queue';
import type { SpireRoomSnapshot } from '../../modules/spire/room_rows';

export type SpireHomePlace = Readonly<{ lang: SpireLang; place: number }>;

let current: SpireHomePlace | null = null;
const listeners = new Set<() => void>();

function log(step: string, data: Readonly<Record<string, unknown>>): void {
  console.log('[SPIRE]', '[HOME-TILES]', `spire_place:${step}`, JSON.stringify(data)); // guard-ok: строка на каждый исход расчёта места
}

function publish(next: SpireHomePlace | null): void {
  if (current?.lang === next?.lang && current?.place === next?.place) return;
  current = next;
  listeners.forEach((listener) => listener());
}

/** Место для бейджа (только язык Главной); null — бейджа нет. Без перерисовки Главной: подписан только ряд плиток. */
export function useSpireHomePlace(lang: string | null): number | null {
  const value = useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => current,
    () => current,
  );
  return value && value.lang === lang ? value.place : null;
}

/** Чистый расчёт: новичок (0 ступеней за неделю) — без места. Вынесен ради теста. */
export function spireHomePlaceFrom(rows: readonly Readonly<{ isMe: boolean; steps: number }>[]): number | null {
  const i = rows.findIndex((row) => row.isMe);
  if (i < 0) return null;
  return rows[i]!.steps > 0 ? i + 1 : null;
}

/**
 * Посчитать место из копий на устройстве (после прогрева комнаты PM-214, вне первого кадра Главной).
 * room — уже прочитанная комната этой недели (spire_load_trace.warmSpireRoomFromDisk).
 */
export async function refreshSpireHomePlace(uid: string, lang: SpireLang, room: SpireRoomSnapshot): Promise<number | null> {
  const startedAt = Date.now();
  try {
    const [{ peekSpireConfig, warmSpireConfigFromDisk }, { readCurrentLocalWeek }, { spireBuildRoomRows }, { spireResolveRankBy }] = await Promise.all([
      import('../spire_config_client'),
      import('../../components/spire/spire_home_week'),
      import('../../modules/spire/room_rows'),
      import('./spire_rank_by_resolve'),
    ]);
    let config = peekSpireConfig();
    if (!config) { await warmSpireConfigFromDisk(); config = peekSpireConfig(); }
    if (!config || config.enabled !== true) {
      log('skip', { why: config ? 'spire_disabled' : 'no_config_on_device', lang });
      publish(null);
      return null;
    }
    const week = await readCurrentLocalWeek(lang);
    const mine = week && week.weekKey === room.weekId ? week : null;
    const { rankBy } = spireResolveRankBy(config, room.weekId);
    const rows = spireBuildRoomRows({
      room, myUid: uid, mySteps: mine?.stepsCleared ?? 0, myReachedAtMs: mine?.reachedAtMs ?? 0,
      nowMs: Date.now(), tuning: config.residents, rankBy, fillMissingWeekCoinsForPreview: false,
    });
    const place = spireHomePlaceFrom(rows);
    log('done', { lang, place, why: place === null ? 'newcomer_no_steps' : 'room_rows', rows: rows.length, mySteps: mine?.stepsCleared ?? 0, rankBy, ms: Date.now() - startedAt });
    publish(place === null ? null : { lang, place });
    return place;
  } catch (error: unknown) {
    log('failed', { lang, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/** Только для тестов. */
export function __resetSpireHomePlace(): void {
  current = null;
  listeners.clear();
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
