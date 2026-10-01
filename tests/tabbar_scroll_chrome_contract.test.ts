import fs from 'fs';
import path from 'path';

const tab = (name: string) => path.join(__dirname, '..', 'app', '(tabs)', name);
const layoutPath = tab('_layout.tsx');
const fc = (...parts: string[]) => path.join(__dirname, '..', 'app', ...parts);

describe('tabbar scroll chrome contract', () => {
  it('uses the shared scroll transport on every scrollable tab', () => {
    // зачем: «Турниры» удалены вместе с Ареной (D74/D83) — сторожим оставшиеся табы.
    const friends = fs.readFileSync(tab('friends.tsx'), 'utf8');
    const settings = fs.readFileSync(tab('settings.tsx'), 'utf8');

    expect(friends).toContain('const handleFriendsScroll = useCallback((e: any) => {');
    expect(friends).toContain('topFadeScroll?.onScroll?.(e);');
    expect(friends).toContain('onScroll: handleFriendsScroll,');
    expect(settings).toContain('const handleSettingsScroll = useCallback((e: any) => {');
    expect(settings).toContain('topFadeScroll?.onScroll?.(e);');
    expect(settings).toContain('onScroll={handleSettingsScroll}');
  });

  // зачем (2.0): владелец выбрал таббар «В · Тёплая кромка» (6c5c8326f, макет
  // docs/design/tabbar/tabbar-variants.html) — общий V2TabBar, сжатие при скролле
  // оставлено прежним. Прежняя версия теста ждала неподвижную панель s.tabDock,
  // которую этот выбор заменил.
  it('renders the owner-chosen V2 tab bar with one shared scroll-collapse machine', () => {
    const layout = fs.readFileSync(layoutPath, 'utf8');
    expect(layout).toContain('import V2TabBar');
    expect(layout).toContain('<V2TabBar');
    expect(layout).toContain('topFadeScroll?.tabBarScrollY');
    expect(layout).toContain('TAB_SCROLL_COLLAPSED_SCALE');
    expect(layout).not.toContain('s.tabDock,');
  });
});

/**
 * Раздел «Карточки» ведёт себя при скролле ровно как главная (замечание
 * владельца после теста на iPhone, 2026-08-13). Числа живут в
 * `app/flashcards/pill_tabbar_chrome.ts`; здесь — храповик против расхождения
 * с литералами главной, которые заперты выше.
 */
describe('flashcards tabbar mirrors the home scroll chrome', () => {
  const chrome = fs.readFileSync(fc('flashcards', 'pill_tabbar_chrome.ts'), 'utf8');

  // Главная больше не сжимает таббар (2.0), поэтому зеркалить её числа не с чем:
  // собственные числа карточек живут в pill_tabbar_chrome.ts до их перерисовки.
  it('keeps its own collapse numbers in one place', () => {
    for (const name of ['TAB_SCROLL_COLLAPSED_SCALE', 'TAB_SCROLL_COLLAPSE_TRIGGER_Y', 'TAB_SCROLL_EXPAND_TRIGGER_Y']) {
      expect(chrome).toMatch(new RegExp(`${name} = ([-0-9.]+);`));
    }
  });

  it('drives the capsule from the lists, without per-frame setState', () => {
    const bar = fs.readFileSync(fc('flashcards', 'FlashcardsTabBar.tsx'), 'utf8');
    expect(bar).toContain('export function useFcTabBarScroll()');
    expect(bar).toContain('useAnimatedScrollHandler');
    expect(bar).toContain('fcTabChromeAction(y, lastY.value)');
    // Хром — только transform/opacity, и ни одного бесконечного цикла.
    expect(bar).not.toMatch(/withRepeat\([\s\S]{0,220}?,\s*-1/);
  });

  // зачем (2.0, снимок 1.6.16 / 6ce8e6b4e): собственная капсула «Карточек» снята с
  // экранов раздела — они живут под общим V2TabBar. Сторож не даёт вернуть второй
  // таббар поверх общего («Мои наборы» — плоский роут, см. 2026-08-13).
  it('flashcards screens do not render a second tab bar under the shared V2 one', () => {
    for (const file of ['flashcards_collection.tsx', 'flashcards_packs.tsx', 'flashcards_my_packs.tsx']) {
      const source = fs.readFileSync(fc(file), 'utf8');
      expect(source).not.toContain('<FlashcardsTabBar');
      expect(source).not.toContain('useFcTabBarScroll()');
    }
  });

  it('keeps the compact capsule aligned with its highlight', () => {
    expect(chrome).toContain('export const TAB_SLOT_WIDTH = 64;');
    // Зона нажатия слота не меньше 44×44 (высота капсулы ≥ 52).
    expect(chrome).toMatch(/export const TAB_SLOT_WIDTH = (\d+);/);
    const slot = Number(chrome.match(/export const TAB_SLOT_WIDTH = (\d+);/)![1]);
    const pillW = Number(chrome.match(/export const TAB_ACTIVE_PILL_WIDTH = (\d+);/)![1]);
    expect(slot).toBeGreaterThanOrEqual(44);
    expect(slot).toBeGreaterThanOrEqual(pillW);
  });
});
