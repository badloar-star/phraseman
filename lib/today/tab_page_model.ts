/**
 * зачем: порядок ОБЯЗАН совпадать с TABS в app/(tabs)/_layout.tsx.
 * Забыть про этот файл легко: сборка не падает, но таббар начинает открывать
 * соседние экраны, а последний просто вылетает (индекс выходит за границы
 * LogicalTabIndex).
 * 2026-08-02, владелец: таб «Уроки» убран из таббара — список уроков теперь
 * полноэкранный push-маршрут /lessons_list (вход: плитка «Уроки» на главной).
 * Все карты индексов сдвинулись: tournaments 1, friends 2, settings 3.
 */
export const LOGICAL_TAB_IDS = ['home', 'tournaments', 'friends', 'settings'] as const;
export const PHYSICAL_PAGE_IDS = ['today', ...LOGICAL_TAB_IDS] as const;

export type LogicalTabId = (typeof LOGICAL_TAB_IDS)[number];
export type PhysicalPageId = (typeof PHYSICAL_PAGE_IDS)[number];
export type LogicalTabIndex = 0 | 1 | 2 | 3;
export type PhysicalPageIndex = 0 | 1 | 2 | 3 | 4;
export type TabRuntimeOwnerId = PhysicalPageId;

function assertIntegerInRange(value: number, max: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new RangeError(`${label} must be an integer between 0 and ${max}`);
  }
}

export function logicalTabToPhysicalPage(index: number): PhysicalPageIndex {
  assertIntegerInRange(index, LOGICAL_TAB_IDS.length - 1, 'logical tab index');
  return (index + 1) as PhysicalPageIndex;
}

export function physicalPageToLogicalTab(index: number): LogicalTabIndex {
  assertIntegerInRange(index, PHYSICAL_PAGE_IDS.length - 1, 'physical page index');
  return (index === 0 ? 0 : index - 1) as LogicalTabIndex;
}

export function physicalPageToRuntimeOwner(index: number): TabRuntimeOwnerId {
  assertIntegerInRange(index, PHYSICAL_PAGE_IDS.length - 1, 'physical page index');
  return PHYSICAL_PAGE_IDS[index] as TabRuntimeOwnerId;
}
