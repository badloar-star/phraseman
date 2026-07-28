import {
  logicalTabToPhysicalPage,
  physicalPageToLogicalTab,
  physicalPageToRuntimeOwner,
} from '../lib/today/tab_page_model';

describe('Today tab page model', () => {
  test('places Today before Home without changing the logical tab order', () => {
    expect(logicalTabToPhysicalPage(0)).toBe(1);
    expect(logicalTabToPhysicalPage(4)).toBe(5);
    expect(physicalPageToLogicalTab(0)).toBe(0);
    expect(physicalPageToLogicalTab(1)).toBe(0);
    expect(physicalPageToLogicalTab(5)).toBe(4);
  });

  // Турниры временно возвращены как обычная вкладка для тестирования.
  test('assigns one runtime owner to every physical page', () => {
    expect([0, 1, 2, 3, 4, 5].map(physicalPageToRuntimeOwner)).toEqual([
      'today',
      'home',
      'lessons',
      'tournaments',
      'friends',
      'settings',
    ]);
  });

  test('rejects invalid indexes instead of silently clamping them', () => {
    expect(() => logicalTabToPhysicalPage(-1)).toThrow(RangeError);
    expect(() => logicalTabToPhysicalPage(5)).toThrow(RangeError);
    expect(() => physicalPageToLogicalTab(-1)).toThrow(RangeError);
    expect(() => physicalPageToRuntimeOwner(6)).toThrow(RangeError);
  });
});
