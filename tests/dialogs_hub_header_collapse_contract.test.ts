// зачем (dialogs-003, координатор 13.10: «делаем как в образце»): хаб «Диалоги» схлопывает подзаголовок и плашку «Свободный разговор PLUS», пока открыта категория.
// Условия: список миров не перерисовывается (состояние шапки — в провайдере, каталог шлёт «открыта/закрыта» через стабильный контекст), анимация — layout-переход 220 мс
// в одном коммите с раскрытием, без прыжка прокрутки (схлопываем, только пока шапка видна), Reduce Motion — без анимации. Сторож: чистое решение + контракт по строкам.
import fs from 'node:fs';
import path from 'node:path';

jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../app/smooth_layout', () => ({ animateNextLayoutTransition: jest.fn() }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => false }));

import { decideHubCollapse, HUB_COLLAPSE_MAX_SCROLL, HUB_COLLAPSE_MS } from '../components/dialogs/hub_header_collapse';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('решение о схлопывании шапки', () => {
  it('категория открыта, шапка видна → схлопнуть с анимацией', () => {
    expect(decideHubCollapse({ categoryOpen: true, scrollY: 0, reduceMotion: false, current: false })).toEqual({ collapsed: true, animate: true, reason: 'expanded_header_visible' });
    expect(decideHubCollapse({ categoryOpen: true, scrollY: HUB_COLLAPSE_MAX_SCROLL, reduceMotion: false, current: false }).collapsed).toBe(true);
  });
  it('категория открыта, а шапка уже прокручена за экран → шапку не трогаем (открытая категория не прыгает)', () => {
    expect(decideHubCollapse({ categoryOpen: true, scrollY: HUB_COLLAPSE_MAX_SCROLL + 1, reduceMotion: false, current: false })).toEqual({ collapsed: false, animate: false, reason: 'expanded_header_out_of_view' });
    // уже схлопнута и перешли в другую категорию далеко внизу — не раскрываем шапку обратно
    expect(decideHubCollapse({ categoryOpen: true, scrollY: 400, reduceMotion: false, current: true }).collapsed).toBe(true);
  });
  it('закрыли категорию → шапка возвращается (обратная анимация), если была схлопнута', () => {
    expect(decideHubCollapse({ categoryOpen: false, scrollY: 0, reduceMotion: false, current: true })).toEqual({ collapsed: false, animate: true, reason: 'closed' });
    expect(decideHubCollapse({ categoryOpen: false, scrollY: 0, reduceMotion: false, current: false }).reason).toBe('unchanged');
  });
  it('Reduce Motion: то же состояние, без анимации', () => {
    expect(decideHubCollapse({ categoryOpen: true, scrollY: 0, reduceMotion: true, current: false })).toEqual({ collapsed: true, animate: false, reason: 'expanded_header_visible' });
    expect(decideHubCollapse({ categoryOpen: false, scrollY: 0, reduceMotion: true, current: true }).animate).toBe(false);
  });
  it('тайминг — 220 мс, как у раскрытия самой категории', () => {
    expect(HUB_COLLAPSE_MS).toBe(220);
  });
});

describe('проводка: каталог не знает о состоянии шапки', () => {
  const hub = read('components/dialogs/hub_header_collapse.tsx');
  const section = read('components/dialogs/DialogueV2CatalogueSection.tsx');
  const container = read('components/dialogs/DialogueV2CatalogueContainer.tsx');
  const tab = read('components/DialogsTabContent.tsx');
  const home = read('app/ai_dialog_home.tsx');
  const kit = read('components/v2/V2Kit.tsx');

  it('два контекста: состояние (читают подзаголовок и плашка) и стабильные действия (читает каталог) — каталог не перерисовывается при смене', () => {
    expect(hub).toContain('const StateContext = createContext<boolean>(false);');
    expect(hub).toContain('const ActionsContext = createContext<Actions | null>(null);');
    expect(hub).toContain('const actions = useMemo<Actions>(() => ({ setCategoryOpen, scrollYRef }), [setCategoryOpen]);');
    expect(section).toContain('const collapseActions = useHubHeaderCollapseActions();');
    expect(section).not.toContain('useHubHeaderCollapsed');
    expect(section).toContain('collapseActions?.setCategoryOpen(next !== null);');
  });
  it('раскрытие и схлопывание — в одном коммите: layout-переход зовётся до setState', () => {
    expect(hub).toMatch(/if \(decision\.animate\) animateNextLayoutTransition\(HUB_COLLAPSE_MS\);\n\s*collapsedRef\.current = decision\.collapsed;\n\s*setCollapsed\(decision\.collapsed\);/);
    expect(section).toMatch(/animateNextLayoutTransition\(\);\n\s*const next = activeWorldId === worldId \? null : worldId;\n\s*setActiveWorldId\(next\);/);
  });
  it('плашка PLUS обёрнута читателем состояния прямо в контейнере, подзаголовок снимается пропом V2LargeTitle', () => {
    expect(container).toMatch(/<HubHeaderCollapsible>\n\s*<DialogueV2PlusTools/);
    expect(kit).toContain('{subtitle && !subtitleHidden ? <Text');
    expect(home).toContain('subtitleHidden={subtitleHidden}');
    expect(home).toMatch(/<HubHeaderCollapseProvider>\n\s*<AiDialogHomeBody \/>/);
  });
  it('хост прокрутки пишет scrollY (для решения «шапка видна»), чужой onScroll вызывается как раньше', () => {
    expect(tab).toContain('hubCollapse.scrollYRef.current = event.nativeEvent.contentOffset.y;');
    expect(tab).toContain('onScroll?.(event);');
    expect(tab).toContain('onScroll={handleScroll}');
  });
  it('журнал [HUB-COLLAPSE]: что решили и почему, значения прокрутки и Reduce Motion', () => {
    expect(hub).toContain("const LOG = '[HUB-COLLAPSE]';");
    expect(hub).toContain('scrollY=${Math.round(scrollYRef.current)} reduceMotion=');
  });
});
