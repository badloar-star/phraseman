// Таббар по рангам (владелец 30.10): «Видео» скрыта у новичка до ранга 1 вместе со свайп-страницей; раскладки кэшируются.
import { FULL_TAB_PAGE_LAYOUT, isLogicalTabHidden, logicalTabToPhysicalPage, physicalPageCount, physicalPageToLogicalTab, tabPageLayoutFor, visibleLogicalTabs } from '../app/tab_page_model';

describe('tabPageLayoutFor + видео по рангу', () => {
  it('по умолчанию видео видно (старые и неопределённые)', () => {
    expect(tabPageLayoutFor({ learnTabVisible: true })).toBe(FULL_TAB_PAGE_LAYOUT);
    expect(tabPageLayoutFor({ learnTabVisible: true, videoTabVisible: true })).toBe(FULL_TAB_PAGE_LAYOUT);
  });
  it('видео скрыто: четыре страницы, логические индексы прежние, «Сообщество» сдвигается на физическую 2', () => {
    const l = tabPageLayoutFor({ learnTabVisible: true, videoTabVisible: false });
    expect(isLogicalTabHidden(2, l)).toBe(true);
    expect(physicalPageCount(l)).toBe(4);
    expect(visibleLogicalTabs(l)).toEqual([0, 1, 3, 4]);
    expect(logicalTabToPhysicalPage(3, l)).toBe(2);
    expect(physicalPageToLogicalTab(2, l)).toBe(3);
    expect(logicalTabToPhysicalPage(2, l)).toBe(0); // скрытая вкладка ведёт на Главную
  });
  it('обучение и видео скрыты вместе', () => {
    const l = tabPageLayoutFor({ learnTabVisible: false, videoTabVisible: false });
    expect(visibleLogicalTabs(l)).toEqual([0, 3, 4]);
  });
  it('одинаковые флаги — тот же объект', () => {
    expect(tabPageLayoutFor({ learnTabVisible: true, videoTabVisible: false })).toBe(tabPageLayoutFor({ learnTabVisible: true, videoTabVisible: false }));
  });
});
