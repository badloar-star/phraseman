// ════════════════════════════════════════════════════════════════════════════
// plan_content_prefetch.ts — событийная префетч-оркестровка plan_content пака
// (Фаза 1 «Бандл-диеты», docs/plans/2026-08-24-bundle-diet-plan.md, шаг 3).
//
// зачем: владелец требует, чтобы юзер НИКОГДА не увидел незагруженный контент —
// к моменту входа в день его json уже должен лежать в дисковом кэше. Пока жив
// bundled-фолбэк это страховка; после финального коммита Ф1 (выпил require из
// plan_content_registry) — единственный источник.
//
// События (НИКАКИХ периодических таймеров — правило Firebase-экономии):
//   · холодный старт (маунт главной) → в idle, с паузой после первого кадра:
//     манифест+индекс пака и день-строки активного плана «текущий ±2»;
//   · покупка/выбор/смена плана → фоновый префетч ВСЕХ дней плана (~4-6 МБ,
//     малыми пачками, остановка при потере сети);
//   · вход в день покрыт отдельно: fetchPlanContentDayForScreenServerFirst в
//     plan_content_remote_facade.ts качает недостающий день сам.
//
// Стоимость: только Firebase Storage GET (0 чтений Firestore). Объекты пака
// immutable (max-age=1 год), уже скачанное повторно не качается никогда —
// ensureCachedCoursePackRow сперва проверяет файл на диске.
// ════════════════════════════════════════════════════════════════════════════
import { InteractionManager } from 'react-native';

import {
  ensureCachedCoursePackRow,
  readCachedCoursePackRow,
} from './course_pack_remote_loader';
import { ensurePlanContentPackReady } from './plan_content_remote_facade';
import { planContentRowUrl } from './plan_content_remote_registration';

/** Форма index.json пака (см. scripts/export_plan_content_packs.mjs). */
type PlanContentPackIndexLike = {
  entries?: Array<{ planId?: string; dayIndex?: number; path?: string }>;
};

const WINDOW_RADIUS = 2;
// Пауза после первого кадра: приоритет у видимого контента (тот же приём, что
// в achievement_art_prefetch.ts). Одноразовая задержка события, не расписание.
const COLD_START_DELAY_MS = 4500;
const BATCH_SIZE = 3;
const BATCH_PAUSE_MS = 250;
// Столько подряд неудачных строк считаем «сети нет» и молча останавливаемся —
// префетч повторится на следующем событии (старт/покупка/вход в день).
const OFFLINE_FAILURE_LIMIT = 4;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let coldStartFired = false;
const wholePlanInFlight = new Set<string>();

async function readPackIndex(cacheKey: string): Promise<PlanContentPackIndexLike | null> {
  try {
    return await readCachedCoursePackRow<PlanContentPackIndexLike>(cacheKey, 'index.json');
  } catch {
    return null;
  }
}

function entryPathsFor(
  index: PlanContentPackIndexLike | null,
  planId: string,
  filter?: (dayIndex: number) => boolean,
): string[] {
  if (!index || !Array.isArray(index.entries)) return [];
  return index.entries
    .filter((entry) =>
      entry.planId === planId &&
      typeof entry.path === 'string' &&
      typeof entry.dayIndex === 'number' &&
      (!filter || filter(entry.dayIndex)))
    .sort((a, b) => (a.dayIndex ?? 0) - (b.dayIndex ?? 0))
    .map((entry) => entry.path as string);
}

/** Скачивает строки пачками; true = всё запрошенное лежит на диске. */
async function ensureRows(cacheKey: string, paths: string[]): Promise<boolean> {
  let failures = 0;
  for (let i = 0; i < paths.length; i += BATCH_SIZE) {
    const batch = paths.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((rowPath) => ensureCachedCoursePackRow(cacheKey, rowPath, planContentRowUrl)),
    );
    failures += results.filter((r) => r.status === 'rejected' || r.value !== true).length;
    if (failures >= OFFLINE_FAILURE_LIMIT) return false;
    if (i + BATCH_SIZE < paths.length) await sleep(BATCH_PAUSE_MS);
  }
  return failures === 0;
}

/**
 * Окно «текущий день ±radius» для плана: скачивает недостающие день-строки.
 * Идемпотентно и дёшево на повторе (существующие файлы не перекачиваются).
 */
export async function prefetchPlanContentDayWindow(
  planId: string,
  currentDayIndex: number,
  radius: number = WINDOW_RADIUS,
): Promise<void> {
  try {
    const cacheKey = await ensurePlanContentPackReady();
    if (!cacheKey) return; // выключено/оффлайн — bundled-фолбэк прикрывает
    const index = await readPackIndex(cacheKey);
    const paths = entryPathsFor(index, planId, (dayIndex) =>
      Math.abs(dayIndex - currentDayIndex) <= radius);
    if (paths.length > 0) await ensureRows(cacheKey, paths);
  } catch {
    // best-effort: любой сбой молча откладывает префетч до следующего события
  }
}

/**
 * Полный префетч плана — вызывается на покупке/выборе/смене плана, чтобы весь
 * контент лёг в кэш фоном, пока юзер смотрит первый день. Дедуп на сессию;
 * при обрыве сети остановится и повторится при следующем событии.
 */
export function prefetchWholePlanContentInBackground(plan: string | { planId: string }): void {
  // зачем: пейвол присваивает состояние плана внутри async-колбэка, из-за чего
  // TS сужает замыкание до never и обращение к `.planId` на call-site не
  // компилируется. Принимаем объект целиком (как hasCurrentPersonalPlanSunsetAccess)
  // и достаём id здесь — call-site остаётся чистым и типобезопасным.
  const planId = typeof plan === 'string' ? plan : plan?.planId;
  if (!planId || wholePlanInFlight.has(planId)) return;
  wholePlanInFlight.add(planId);
  void (async () => {
    try {
      const cacheKey = await ensurePlanContentPackReady();
      if (!cacheKey) return;
      const index = await readPackIndex(cacheKey);
      const paths = entryPathsFor(index, planId);
      if (paths.length === 0) return;
      const complete = await ensureRows(cacheKey, paths);
      // Неполный проход (оффлайн) → снимаем дедуп, чтобы следующее событие докачало.
      if (!complete) wholePlanInFlight.delete(planId);
    } catch {
      wholePlanInFlight.delete(planId);
    }
  })();
}

/**
 * Холодный старт: один раз за сессию, после первого кадра и в idle, греет
 * манифест+индекс пака и окно «±2» АКТИВНОГО плана. Читатель состояния плана
 * передаётся параметром, чтобы модуль не тянул personal_plan_state (и его
 * AsyncStorage-граф) в чужие бандл-цепочки.
 */
export function prefetchActivePlanContentOnColdStart(
  readActivePlan: () => Promise<{ planId: string; currentDayIndex: number } | null>,
): void {
  if (coldStartFired) return;
  coldStartFired = true;
  void InteractionManager.runAfterInteractions(async () => {
    try {
      await sleep(COLD_START_DELAY_MS);
      const active = await readActivePlan();
      if (!active) return; // нет активного плана — ничего не качаем (экономия)
      await prefetchPlanContentDayWindow(active.planId, active.currentDayIndex);
    } catch {
      // best-effort
    }
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __PlanContentPrefetchRouteShim() {
  return null;
}
