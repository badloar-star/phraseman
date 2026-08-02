import {
  logicalTabToPhysicalPage,
  physicalPageToLogicalTab,
  physicalPageToRuntimeOwner,
} from '../lib/today/tab_page_model';

describe('Today tab page model', () => {
  test('places Today before Home without changing the logical tab order', () => {
    expect(logicalTabToPhysicalPage(0)).toBe(1);
    expect(logicalTabToPhysicalPage(3)).toBe(4);
    expect(physicalPageToLogicalTab(0)).toBe(0);
    expect(physicalPageToLogicalTab(1)).toBe(0);
    expect(physicalPageToLogicalTab(4)).toBe(3);
  });

  // зачем 2026-08-02: таб «Уроки» убран (список — push-маршрут /lessons_list),
  // владельца 'lessons' среди страниц слайдера больше нет.
  test('assigns one runtime owner to every physical page', () => {
    expect([0, 1, 2, 3, 4].map(physicalPageToRuntimeOwner)).toEqual([
      'today',
      'home',
      'tournaments',
      'friends',
      'settings',
    ]);
  });

  test('rejects invalid indexes instead of silently clamping them', () => {
    expect(() => logicalTabToPhysicalPage(-1)).toThrow(RangeError);
    expect(() => logicalTabToPhysicalPage(4)).toThrow(RangeError);
    expect(() => physicalPageToLogicalTab(-1)).toThrow(RangeError);
    expect(() => physicalPageToRuntimeOwner(5)).toThrow(RangeError);
  });
});
