import type { PlanContentDay } from './plan_content_schema';

/**
 * Registry of authored PlanContentDay content from the new pipeline, keyed by
 * `${planId}:${dayIndex}`. This is the single place the runtime looks up "do we have
 * real agent-authored content for this plan day?" — if yes, the runtime uses the
 * pipeline (full explanations, day vocabulary, authored POS + distractors); if no, it
 * falls back to the old template path.
 *
 * As more days are authored through the content-agent pipeline, they are registered
 * here (e.g. MITAP_CONTENT_DAYS, etc.). Pure module.
 *
 * PERF (D1): each plan's content file is ~3-5MB. We used to statically import all 5
 * (~20MB) so simply touching this module built every plan's data in memory, even
 * though a screen only ever needs the ONE active plan. Now each plan is loaded via a
 * synchronous `require()` the first time it's actually asked for, keyed by planId, and
 * cached in PLAN_CONTENT_DAYS_CACHE below. Metro's inline-require makes this a
 * standard, supported pattern — no async refactor needed, callers are unchanged.
 *
 * SEAM FOR SERVER MIGRATION: this module is the single access point the runtime uses
 * to fetch plan content. Today `loadPlanContentDays()` is a lazy local `require()`;
 * once content moves to the server (see quiz_phrases_loader.ts / French remote pack
 * for the established pattern), this function becomes the place that fetches from the
 * server with an on-disk cache instead. Screens call `getAuthoredPlanContentDay()` /
 * `hasAuthoredPlanContent()` etc. either way and never need to change.
 */

type PlanId = 'mitap' | 'gavan' | 'impuls' | 'echo' | 'voyazh';

const PLAN_IDS: readonly PlanId[] = ['mitap', 'gavan', 'impuls', 'echo', 'voyazh'];

function isKnownPlanId(planId: string): planId is PlanId {
  return (PLAN_IDS as readonly string[]).includes(planId);
}

function keyFor(planId: string, dayIndex: number): string {
  return `${planId}:${dayIndex}`;
}

/** Module-level cache: one entry per plan, populated on first access. */
const PLAN_CONTENT_DAYS_CACHE = new Map<PlanId, readonly PlanContentDay[]>();

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
function loadPlanContentDays(_planId: PlanId): readonly PlanContentDay[] {
  return EMPTY_PLAN_CONTENT_DAYS;
}

const EMPTY_PLAN_CONTENT_DAYS: readonly PlanContentDay[] = Object.freeze([]);

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
