// ═══════════════════════════════════════════════════════════════════════════
// tournament_content_source.ts — доступ к авторскому контенту планов.
//
// зачем: генератор турнирных заданий берёт сырьё из app/plan_content_*.ts —
// это уже отревьюенные фразы с разметкой частей речи и дистракторов. Читаем
// их из КОДА, а не из Firestore: ноль чтений на генерацию (правило экономии),
// и контент гарантированно совпадает с тем, что видит игрок в приложении.
//
// Файлы планов большие (3-5 МБ каждый), поэтому загружаем лениво и кэшируем:
// генерация по одному плану не должна тянуть в память все пять.
// ═══════════════════════════════════════════════════════════════════════════

import type { SourceDay } from './tournament_task_factory';

/** Планы с авторским контентом. Совпадает с PLAN_IDS в app/plan_content_registry.ts. */
export const TOURNAMENT_SOURCE_PLANS: readonly string[] = Object.freeze([
  'mitap', 'gavan', 'impuls', 'echo', 'voyazh',
]);

/** Кэш на инстанс функции: JSON парсится один раз на холодный старт. */
let BUNDLE_CACHE: readonly SourceDay[] | null = null;

/**
 * Загружает выжимку контента, собранную на этапе сборки.
 *
 * зачем: исходники планов (app/plan_content_*.ts) — TypeScript в корне
 * проекта, а в Cloud Functions уезжает только папка functions/, где .ts никто
 * не исполнит. Поэтому scripts/build_tournament_content.js вытаскивает нужные
 * генератору поля в src/generated/tournament_content.json (2.2 МБ вместо 20 МБ
 * исходников — без объяснений, теории и словаря дня). Файл обязан обновляться
 * при изменении контента планов: `npm run build:tournament-content`.
 */
function loadBundle(): readonly SourceDay[] {
  if (BUNDLE_CACHE) return BUNDLE_CACHE;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional: JSON грузится лениво, только при первой генерации
    BUNDLE_CACHE = require('./generated/tournament_content.json') as readonly SourceDay[];
  } catch {
    // Отсутствие выжимки не должно ронять функцию: генерация вернёт ноль
    // заданий и админка покажет это владельцу явно.
    BUNDLE_CACHE = [];
  }
  return BUNDLE_CACHE;
}

/** Дни одного плана. Неизвестный план — пустой массив. */
export function loadPlanDays(planId: string): readonly SourceDay[] {
  if (!TOURNAMENT_SOURCE_PLANS.includes(planId)) return [];
  return loadBundle().filter((day) => day.planId === planId);
}

/** Собирает дни нескольких планов в один список для генератора. */
export function loadTournamentSourceDays(planIds: readonly string[]): SourceDay[] {
  const days: SourceDay[] = [];
  for (const planId of planIds) days.push(...loadPlanDays(planId));
  return days;
}
