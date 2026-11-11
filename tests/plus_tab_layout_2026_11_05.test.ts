// Governance-ID: TG-A9C881207310
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  FULL_TAB_PAGE_LAYOUT,
  LOGICAL_TAB_IDS,
  PLUS_TAB_INDEX,
  isLogicalTabHidden,
  logicalTabToPhysicalPage,
  physicalPageCount,
  physicalPageToLogicalTab,
  tabPageLayoutFor,
  visibleLogicalTabs,
} from '../app/tab_page_model';
import { MAIN_TABS } from '../constants/mainTabs';

// зачем (слово владельца 05.11): шестая логическая вкладка Plus — в раскладке скрыта ВСЕГДА, пока правило видимости её не откроет;
// все прежние раскладки (4 или 5 страниц) остаются прежними.
describe('вкладка Plus в раскладке нижней панели', () => {
  test('Plus — шестая логическая вкладка (индекс и маршрут не менялись)', () => {
    expect(LOGICAL_TAB_IDS[PLUS_TAB_INDEX]).toBe('plus');
    expect(MAIN_TABS[PLUS_TAB_INDEX].key).toBe('plus');
  });

  test('по умолчанию Plus скрыта, число страниц прежнее (5)', () => {
    expect(isLogicalTabHidden(PLUS_TAB_INDEX, FULL_TAB_PAGE_LAYOUT)).toBe(true);
    expect(physicalPageCount(FULL_TAB_PAGE_LAYOUT)).toBe(5);
    expect(visibleLogicalTabs(tabPageLayoutFor({ learnTabVisible: true }))).toEqual([0, 1, 2, 3, 4]);
  });

  test('4 иконки (видео скрыто) и Plus открыта → Plus между «Сообществом» и «Настройками» (владелец 11.11)', () => {
    const layout = tabPageLayoutFor({ learnTabVisible: true, videoTabVisible: false, plusTabVisible: true });
    expect(visibleLogicalTabs(layout)).toEqual([0, 1, 3, 5, 4]);
    expect(physicalPageCount(layout)).toBe(5);
  });

  test('4 иконки (обучение скрыто) и Plus открыта', () => {
    const layout = tabPageLayoutFor({ learnTabVisible: false, videoTabVisible: true, plusTabVisible: true });
    expect(visibleLogicalTabs(layout)).toEqual([0, 2, 3, 5, 4]);
  });

  // зачем (слово владельца 11.11): значок и страница обязаны совпадать — тап по алмазику открывает Plus, а не Настройки.
  test('страница Plus — предпоследняя, Настройки крайние справа; индексы переводятся туда и обратно', () => {
    const layout = tabPageLayoutFor({ learnTabVisible: true, videoTabVisible: false, plusTabVisible: true });
    expect(logicalTabToPhysicalPage(PLUS_TAB_INDEX, layout)).toBe(3);
    expect(logicalTabToPhysicalPage(4, layout)).toBe(4);
    expect(physicalPageToLogicalTab(3, layout)).toBe(PLUS_TAB_INDEX);
    expect(physicalPageToLogicalTab(4, layout)).toBe(4);
    for (const logical of visibleLogicalTabs(layout)) {
      expect(physicalPageToLogicalTab(logicalTabToPhysicalPage(logical, layout), layout)).toBe(logical);
    }
  });

  test('панель, лента и копия панели берут порядок из модели, а не считают его сами', () => {
    const layoutSource = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', '_layout.tsx'), 'utf8');
    expect(layoutSource).toContain('visibleLogicalTabs(pageLayout).map((logicalIdx) => TAB_BAR_TABS[logicalIdx]!)');
    expect(layoutSource).toContain('visibleLogicalTabs(pageLayout).map((logicalIdx) => screens[logicalIdx]!)');
    const rootTabs = fs.readFileSync(path.join(__dirname, '..', 'components', 'packs', 'CommunityRootTabs.tsx'), 'utf8');
    expect(rootTabs).toContain('visibleLogicalTabs(layout).map((index) => MAIN_TABS[index]!)');
  });

  test('одинаковые флаги — тот же объект раскладки', () => {
    expect(tabPageLayoutFor({ learnTabVisible: true, videoTabVisible: false, plusTabVisible: true }))
      .toBe(tabPageLayoutFor({ learnTabVisible: true, videoTabVisible: false, plusTabVisible: true }));
  });

  test('значок Plus — ромб без подписи, оболочка берёт раскладку из общего хука', () => {
    expect(MAIN_TABS[PLUS_TAB_INDEX].icon).toBe('diamond-outline');
    expect(MAIN_TABS[PLUS_TAB_INDEX].active).toBe('diamond');
    const layoutSource = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', '_layout.tsx'), 'utf8');
    expect(layoutSource).toContain('useTabPageLayout()');
    expect(layoutSource).toContain("case 5: return loadPlusScreen();");
    const rootTabs = fs.readFileSync(path.join(__dirname, '..', 'components', 'packs', 'CommunityRootTabs.tsx'), 'utf8');
    expect(rootTabs).toContain('useTabPageLayout()');
  });
});
