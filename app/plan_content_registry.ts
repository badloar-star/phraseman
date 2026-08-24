import type { PlanContentDay } from './plan_content_schema';

/**
 * Точка входа рантайма за контентом дня плана — БЕЗ САМОГО КОНТЕНТА.
 *
 * ИСТОРИЯ (Фаза 1 «Бандл-диеты», 2026-08-24): здесь лежали пять
 * `require('./plan_content_<plan>')`, тянувшие ~19 МБ TS в JS-бандл. Контент
 * переехал на Firebase Storage (пак release.20260824.e4381599, 546 дней;
 * паритет с бандлом доказан побайтово 546/546, приёмка на устройстве пройдена).
 * Единственный источник теперь — сервер с дисковым кэшем:
 *   plan_content_remote_facade → plan_content_remote_readiness
 *   → course_pack_remote_loader (скачивание + sha256 + evict).
 *
 * Модуль СОХРАНЁН как API-шов: экраны и мост по-прежнему зовут
 * getAuthoredPlanContentDay/hasAuthoredPlanContent, просто теперь эти функции
 * всегда отвечают «данных нет», и вызывающая сторона идёт на сервер. Так
 * `git revert` финального коммита возвращает bundled-фолбэк одним движением,
 * не трогая ни один экран.
 *
 * ВАЖНО для пересборки контента: экспортёр пака
 * (scripts/export_plan_content_packs.mjs) читает исходные plan_content_*.ts
 * НАПРЯМУЮ — через этот реестр он получил бы ноль дней.
 */

type PlanId = 'mitap' | 'gavan' | 'impuls' | 'echo' | 'voyazh';

const PLAN_IDS: readonly PlanId[] = ['mitap', 'gavan', 'impuls', 'echo', 'voyazh'];

function isKnownPlanId(planId: string): planId is PlanId {
  return (PLAN_IDS as readonly string[]).includes(planId);
}

function keyFor(planId: string, dayIndex: number): string {
  return `${planId}:${dayIndex}`;
}

/**
 * ФИНАЛ Фазы 1 «Бандл-диеты» (docs/plans/2026-08-24-bundle-diet-plan.md),
 * решение владельца 2026-08-24 после приёмки на живом устройстве
 * (`[plan_content] echo d1 theory → downloaded_pack`).
 *
 * Пять `require('./plan_content_<plan>')` тянули ~19 МБ TS-контента в JS-бандл.
 * Контент целиком переехал на Firebase Storage (пак release.20260824.e4381599,
 * 546 дней; паритет с бандлом доказан побайтово 546/546), и рантайм читает его
 * через course_pack_remote_loader → plan_content_remote_readiness.
 *
 * Теперь реестр НЕ содержит контента вовсе: он остаётся точкой входа для
 * совместимости API (screens зовут getAuthoredPlanContentDay), но всегда
 * отвечает «нет данных» — единственным источником стал сервер с дисковым кэшем.
 *
 * ОТКАТ: `git revert` этого коммита возвращает require и bundled-фолбэк.
 *
 * ИЗВЕСТНЫЙ РИСК (принят владельцем): юзер без сети и без прогретого кэша
 * увидит день без контента. Прогрев работает при открытии плана (окно ±2),
 * при покупке/выборе плана (весь план) и на холодном старте.
 */
const EMPTY_PLAN_CONTENT_DAYS: readonly PlanContentDay[] = Object.freeze([]);

function loadPlanContentDays(_planId: PlanId): readonly PlanContentDay[] {
  return EMPTY_PLAN_CONTENT_DAYS;
}

/** Per-plan key->day maps, built lazily alongside loadPlanContentDays. */
const CONTENT_BY_KEY_CACHE = new Map<PlanId, ReadonlyMap<string, PlanContentDay>>();

function loadContentByKey(planId: PlanId): ReadonlyMap<string, PlanContentDay> {
  const cached = CONTENT_BY_KEY_CACHE.get(planId);
  if (cached) return cached;

  const days = loadPlanContentDays(planId);
  const byKey = new Map(days.map((day) => [keyFor(day.planId, day.dayIndex), day]));
  CONTENT_BY_KEY_CACHE.set(planId, byKey);
  return byKey;
}

/** Authored content for a plan day, or undefined when only the old fallback exists. */
export function getAuthoredPlanContentDay(
  planId: string,
  dayIndex: number,
): PlanContentDay | undefined {
  if (!isKnownPlanId(planId)) return undefined;
  return loadContentByKey(planId).get(keyFor(planId, dayIndex));
}

/** True when the new pipeline has real content for this plan day. */
export function hasAuthoredPlanContent(planId: string, dayIndex: number): boolean {
  if (!isKnownPlanId(planId)) return false;
  return loadContentByKey(planId).has(keyFor(planId, dayIndex));
}

/**
 * All authored content across every plan, for local dry-run pack parity tooling.
 * EXPENSIVE: this forces every plan's ~3-5MB content file into memory (~20MB total).
 * Only call this from dev/validation tooling (dry-run parity reports, admin/CLI
 * scripts) — never from a runtime screen path.
 */
export function loadAllPlanContentDays(): readonly PlanContentDay[] {
  return PLAN_IDS.flatMap((planId) => loadPlanContentDays(planId));
}

/** @deprecated Use `loadAllPlanContentDays` — kept as an alias for existing call sites. */
export function listAuthoredPlanContentDays(): readonly PlanContentDay[] {
  return loadAllPlanContentDays();
}

/** Number of day-specific theory screens authored for a plan day (0 if none). */
export function authoredPlanIntroCount(planId: string, dayIndex: number): number {
  return getAuthoredPlanContentDay(planId, dayIndex)?.intro.length ?? 0;
}
