/**
 * Single source of truth for logical tabs and physical swipe pages.
 *
 * Compass is deliberately a hidden physical page to the left of Home. It has
 * no tab-bar item and no route of its own: horizontal swipe is an additional
 * discoverable entry, while Home remains logical tab 0 and keeps its URL.
 */
export const LOGICAL_TAB_IDS = ['home', 'lessons', 'friends', 'settings'] as const;
export const PHYSICAL_PAGE_IDS = ['compass', ...LOGICAL_TAB_IDS] as const;

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

/** Logical Home 0 lives on physical page 1 because Compass occupies page 0. */
export function logicalTabToPhysicalPage(index: number): PhysicalPageIndex {
  assertIntegerInRange(index, LOGICAL_TAB_IDS.length - 1, 'logical tab index');
  return (index + 1) as PhysicalPageIndex;
}

/** Compass and Home both keep logical Home selected; Compass does not invent a tab. */
export function physicalPageToLogicalTab(index: number): LogicalTabIndex {
  assertIntegerInRange(index, PHYSICAL_PAGE_IDS.length - 1, 'physical page index');
  return Math.max(0, index - 1) as LogicalTabIndex;
}

export function physicalPageToRuntimeOwner(index: number): TabRuntimeOwnerId {
  assertIntegerInRange(index, PHYSICAL_PAGE_IDS.length - 1, 'physical page index');
  return PHYSICAL_PAGE_IDS[index] as TabRuntimeOwnerId;
}
