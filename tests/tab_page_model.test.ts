import {
  logicalTabToPhysicalPage,
  physicalPageToLogicalTab,
  physicalPageToRuntimeOwner,
} from '../app/tab_page_model';

describe('Tab page model', () => {
  test('keeps hidden Compass left of Home in one mapping source', () => {
    expect(logicalTabToPhysicalPage(0)).toBe(1);
    expect(logicalTabToPhysicalPage(3)).toBe(4);
    expect(physicalPageToLogicalTab(0)).toBe(0);
    expect(physicalPageToLogicalTab(1)).toBe(0);
    expect(physicalPageToLogicalTab(4)).toBe(3);
  });

  // Турниров среди runtime-владельцев нет: скрытая вкладка не должна оставаться
  // физической страницей, доступной горизонтальным свайпом.
  test('assigns one runtime owner to every physical page', () => {
    expect([0, 1, 2, 3, 4].map(physicalPageToRuntimeOwner)).toEqual([
      'compass',
      'home',
      'lessons',
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
