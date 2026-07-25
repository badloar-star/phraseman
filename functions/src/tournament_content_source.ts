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

/** Кэш на инстанс функции: повторные вызовы не перечитывают мегабайты. */
const DAYS_CACHE = new Map<string, readonly SourceDay[]>();

/**
 * Достаёт массив дней из модуля плана.
 * Имя экспорта у планов отличается (MITAP_CONTENT_DAYS и т.п.), поэтому
 * ищем первый экспорт-массив, элементы которого похожи на день с фразами.
 */
function extractDays(planModule: Record<string, unknown>): readonly SourceDay[] {
  for (const value of Object.values(planModule)) {
    if (!Array.isArray(value) || value.length === 0) continue;
    const first = value[0] as Record<string, unknown> | undefined;
    if (first && Array.isArray(first.phrases)) return value as readonly SourceDay[];
  }
  return [];
}

/** Лениво грузит дни одного плана. Неизвестный/битый план — пустой массив. */
export function loadPlanDays(planId: string): readonly SourceDay[] {
  const cached = DAYS_CACHE.get(planId);
  if (cached) return cached;
  if (!TOURNAMENT_SOURCE_PLANS.includes(planId)) return [];

  let days: readonly SourceDay[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional: ленивая загрузка мегабайтного плана только при обращении
    const planModule = require(`../../app/plan_content_${planId}`) as Record<string, unknown>;
    days = extractDays(planModule);
  } catch {
    // Отсутствующий план не должен ронять генерацию остальных.
    days = [];
  }

  DAYS_CACHE.set(planId, days);
  return days;
}

/** Собирает дни нескольких планов в один список для генератора. */
export function loadTournamentSourceDays(planIds: readonly string[]): SourceDay[] {
  const days: SourceDay[] = [];
  for (const planId of planIds) days.push(...loadPlanDays(planId));
  return days;
}
