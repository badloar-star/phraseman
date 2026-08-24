import {
  LOGICAL_TAB_IDS,
  PHYSICAL_PAGE_IDS,
  logicalTabToPhysicalPage,
  physicalPageToLogicalTab,
  physicalPageToRuntimeOwner,
} from '../app/tab_page_model';

describe('Tab page model', () => {
  // зачем 2026-08-03: экран «Сегодня» убран, вместе с ним исчезла нулевая
  // физическая страница слева от главной. Теперь страница = таб, и оба
  // перевода тождественны. Тест сторожит именно это: если слева когда-нибудь
  // снова появится страница, сдвиг обязан вернуться СЮДА, в одну точку правды,
  // а не расползтись по _layout.tsx.
  test('maps every logical tab onto the same physical page', () => {
    expect(LOGICAL_TAB_IDS).toEqual(['home', 'lessons', 'arena', 'friends', 'settings']);
    expect(PHYSICAL_PAGE_IDS).toEqual(LOGICAL_TAB_IDS);
    for (const index of [0, 1, 2, 3, 4]) {
      expect(physicalPageToLogicalTab(logicalTabToPhysicalPage(index))).toBe(index);
    }
  });

  // Турниров среди runtime-владельцев нет: скрытая вкладка не должна оставаться
  // физической страницей, доступной горизонтальным свайпом.
  test('assigns one runtime owner to every physical page', () => {
    expect([0, 1, 2, 3, 4].map(physicalPageToRuntimeOwner)).toEqual([
      'home',
      'lessons',
      'arena',
      'friends',
      'settings',
    ]);
  });

  test('rejects invalid indexes instead of silently clamping them', () => {
    expect(() => logicalTabToPhysicalPage(-1)).toThrow(RangeError);
    expect(() => logicalTabToPhysicalPage(5)).toThrow(RangeError);
    expect(() => physicalPageToLogicalTab(-1)).toThrow(RangeError);
    expect(() => physicalPageToRuntimeOwner(5)).toThrow(RangeError);
  });
});
