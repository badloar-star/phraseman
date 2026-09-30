import {
  LOGICAL_TAB_IDS,
  PHYSICAL_PAGE_IDS,
  logicalTabToPhysicalPage,
  physicalPageToLogicalTab,
  physicalPageToRuntimeOwner,
  physicalPageCount,
  isLogicalTabHidden,
  tabPageLayoutFor,
  SUB_RUNTIME_OWNER_IDS,
} from '../app/tab_page_model';

describe('Tab page model', () => {
  // зачем 2026-08-03: экран «Сегодня» убран, вместе с ним исчезла нулевая
  // физическая страница слева от главной. Теперь страница = таб, и оба
  // перевода тождественны. Тест сторожит именно это: если слева когда-нибудь
  // снова появится страница, сдвиг обязан вернуться СЮДА, в одну точку правды,
  // а не расползтись по _layout.tsx.
  test('maps every logical tab onto the same physical page', () => {
    // 2026-09-24 (2.0, D39): «Главная · Обучение · Видео · Сообщество · Настройки».
    expect(LOGICAL_TAB_IDS).toEqual(['home', 'lessons', 'video', 'community', 'settings']);
    expect(PHYSICAL_PAGE_IDS).toEqual(LOGICAL_TAB_IDS);
    for (const index of [0, 1, 2, 3, 4]) {
      expect(physicalPageToLogicalTab(logicalTabToPhysicalPage(index))).toBe(index);
    }
  });

  // Турниров среди runtime-владельцев нет: скрытая вкладка не должна оставаться
  // физической страницей, доступной горизонтальным свайпом.
  test('assigns one runtime owner to every physical page', () => {
    expect([0, 1, 2, 3, 4].map((index) => physicalPageToRuntimeOwner(index))).toEqual([
      'home',
      'lessons',
      'video',
      'community',
      'settings',
    ]);
  });

  test('rejects invalid indexes instead of silently clamping them', () => {
    expect(() => logicalTabToPhysicalPage(-1)).toThrow(RangeError);
    expect(() => logicalTabToPhysicalPage(5)).toThrow(RangeError);
    expect(() => physicalPageToLogicalTab(-1)).toThrow(RangeError);
    expect(() => physicalPageToRuntimeOwner(5)).toThrow(RangeError);
  });

  // зачем: «Шпиль» (за замком app/spire_tab_flag.ts) — третий раздел «Сообщества» со своим
  // runtime-владельцем; порядок совпадает с сегментами «Друзья / Шпиль / Наборы».
  test('lists spire as a community sub-runtime owner between friends and packs', () => {
    expect(SUB_RUNTIME_OWNER_IDS).toEqual(['friends', 'spire', 'packs']);
  });

  // зачем D129 (владелец 2026-09-30): без готового курса вкладки «Обучение» нет ни в
  // таббаре, ни в свайп-ленте. Логические индексы не меняются, сдвиг только тут.
  test('hides the learn tab from the swipe pages when the course is not ready', () => {
    const layout = tabPageLayoutFor({ learnTabVisible: false });
    expect(physicalPageCount(layout)).toBe(4);
    expect(isLogicalTabHidden(1, layout)).toBe(true);
    expect([0, 1, 2, 3].map((index) => physicalPageToRuntimeOwner(index, layout))).toEqual([
      'home',
      'video',
      'community',
      'settings',
    ]);
    expect(logicalTabToPhysicalPage(2, layout)).toBe(1);
    expect(logicalTabToPhysicalPage(4, layout)).toBe(3);
    // Скрытая вкладка ведёт на Главную, а не падает.
    expect(logicalTabToPhysicalPage(1, layout)).toBe(0);
    expect(physicalPageToLogicalTab(3, layout)).toBe(4);
    expect(() => physicalPageToLogicalTab(4, layout)).toThrow(RangeError);
    expect(physicalPageCount(tabPageLayoutFor({ learnTabVisible: true }))).toBe(5);
  });
});
