/**
 * зачем: порядок ОБЯЗАН совпадать с TABS в app/(tabs)/_layout.tsx.
 * Забыть про этот файл легко: сборка не падает, но таббар начинает открывать
 * соседние экраны, а последний просто вылетает (индекс выходит за границы
 * LogicalTabIndex).
 * 2026-08-09: турниры полностью исключены из релизной навигации, включая
 * физическую свайп-страницу. После добавления Арены: lessons 1, arena 2,
 * friends 3, settings 4.
 * Исходники турниров сохранены отдельно и не участвуют в этой модели.
 * 2026-08-08: таб «Все уроки» возвращён вторым. При этом плитка на главной
 * сохраняет полноэкранный push-маршрут /lessons_list.
 * 2026-08-03, владелец: экран «Сегодня» убран полностью. Он был нулевой
 * ФИЗИЧЕСКОЙ страницей слева от главной и жил на удалённой фиче «Компас»
 * (collectCompassSnapshot/buildCompassDay), без которой показывал бы пустую
 * заглушку. Вместе с ним исчезло расхождение логических и физических
 * индексов: теперь страница = таб, и оба перевода тождественны. Функции
 * оставлены (а не вырезаны по всему layout), чтобы не переписывать свайп-
 * логику и сохранить единую точку правды, если слева снова появится страница.
 */
export const LOGICAL_TAB_IDS = ['home', 'lessons', 'arena', 'friends', 'settings'] as const;
export const PHYSICAL_PAGE_IDS = [...LOGICAL_TAB_IDS] as const;

export type LogicalTabId = (typeof LOGICAL_TAB_IDS)[number];
export type PhysicalPageId = (typeof PHYSICAL_PAGE_IDS)[number];
export type LogicalTabIndex = 0 | 1 | 2 | 3 | 4;
export type PhysicalPageIndex = 0 | 1 | 2 | 3 | 4;
export type TabRuntimeOwnerId = PhysicalPageId;

function assertIntegerInRange(value: number, max: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new RangeError(`${label} must be an integer between 0 and ${max}`);
  }
}

export function logicalTabToPhysicalPage(index: number): PhysicalPageIndex {
  assertIntegerInRange(index, LOGICAL_TAB_IDS.length - 1, 'logical tab index');
  return index as PhysicalPageIndex;
}

export function physicalPageToLogicalTab(index: number): LogicalTabIndex {
  assertIntegerInRange(index, PHYSICAL_PAGE_IDS.length - 1, 'physical page index');
  return index as LogicalTabIndex;
}

export function physicalPageToRuntimeOwner(index: number): TabRuntimeOwnerId {
  assertIntegerInRange(index, PHYSICAL_PAGE_IDS.length - 1, 'physical page index');
  return PHYSICAL_PAGE_IDS[index] as TabRuntimeOwnerId;
}
