import {
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
    expect(logicalTabToPhysicalPage(0)).toBe(0);
    expect(logicalTabToPhysicalPage(3)).toBe(3);
    expect(physicalPageToLogicalTab(0)).toBe(0);
    expect(physicalPageToLogicalTab(3)).toBe(3);
  });

  // зачем 2026-08-02: таб «Уроки» убран (список — push-маршрут /lessons_list),
  // владельца 'lessons' среди страниц слайдера больше нет.
  test('assigns one runtime owner to every physical page', () => {
    expect([0, 1, 2, 3].map(physicalPageToRuntimeOwner)).toEqual([
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
    expect(() => physicalPageToRuntimeOwner(4)).toThrow(RangeError);
  });
});
