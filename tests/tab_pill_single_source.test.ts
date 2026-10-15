// зачем (владелец 15.10: «ТАКОГО НИГДЕ НЕ ДОЛЖНО БЫТЬ»; Ревизор): кнопка «Играть» Пика уходила под плавающую капсулу таб-бара, потому что общий отступ считал старую высоту таб-бара (56/60), а настоящая капсула — 66.
// Сторож: верх капсулы считается в ОДНОМ месте (`tab_bar_geometry`), скролл-отступ вкладок, тосты и доки берут его оттуда; никаких «bottomPad − N» и старой высоты `tabBarHeight` в этих местах.
import fs from 'node:fs';
import path from 'node:path';
import {
  FLOATING_PILL_BOTTOM_GAP,
  TAB_DOCK_MIN_BOTTOM_PAD,
  V2_TAB_BAR_HEIGHT,
  tabPillBottomOffset,
  tabPillTopOffset,
} from '../components/v2/tab_bar_geometry';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

// все места, где контент или док вкладок отсчитывается от низа экрана
const TAB_BOTTOM_USERS = [
  'app/(tabs)/home.tsx',
  'app/(tabs)/lessons.tsx',
  'app/(tabs)/settings.tsx',
  'app/(tabs)/friends.tsx',
  'app/flashcards_packs.tsx',
  'app/lingman_videos.tsx',
  'components/spire/SpireHomeScreen.tsx',
] as const;

describe('таб-бар: один источник «верх капсулы»', () => {
  it('арифметика: низ капсулы = max(inset, 8) + 6, верх = низ + 66', () => {
    expect(V2_TAB_BAR_HEIGHT).toBe(66);
    expect(FLOATING_PILL_BOTTOM_GAP).toBe(6);
    expect(TAB_DOCK_MIN_BOTTOM_PAD).toBe(8);
    expect(tabPillBottomOffset(0)).toBe(14);
    expect(tabPillTopOffset(0)).toBe(80);
    expect(tabPillTopOffset(34)).toBe(106);
    // системная полоса меньше минимума — берётся минимум
    expect(tabPillTopOffset(4)).toBe(tabPillTopOffset(8));
  });

  it('высота капсулы объявлена один раз — в tab_bar_geometry; V2TabBar и _layout берут её оттуда', () => {
    expect(read('components/v2/tab_bar_geometry.ts')).toMatch(/export const V2_TAB_BAR_HEIGHT = 66;/);
    expect(read('components/v2/V2TabBar.tsx')).not.toMatch(/const V2_TAB_BAR_HEIGHT = \d+/);
    const layout = read('app/(tabs)/_layout.tsx');
    expect(layout).toContain("from '../../components/v2/tab_bar_geometry'");
    expect(layout).not.toMatch(/const TAB_DOCK_MIN_BOTTOM_PAD = \d+/);
    expect(layout).toMatch(/const tabBarBottom = Math\.max\(PB, TAB_DOCK_MIN_BOTTOM_PAD\) \+ FLOATING_PILL_BOTTOM_GAP;/);
  });

  it('скролл-отступ вкладок и тосты считаются от верха капсулы, а не от старой высоты tabBarHeight', () => {
    const pad = read('hooks/use-tab-content-bottom-pad.ts');
    expect(pad).toContain('tabPillTopOffset(bottomInset)');
    expect(pad).toMatch(/return useTabPillTop\(\) \+ CONTENT_BREATHING_GAP;/);
    const toast = read('hooks/use-global-bottom-overlay-offset.ts');
    expect(toast).toContain('tabPillTopOffset(bottomInset) + OVERLAY_GAP');
    expect(toast).not.toMatch(/const \{[^}]*tabBarHeight[^}]*\} = useScreen\(\)/);
  });

  it.each(TAB_BOTTOM_USERS)('%s: нет «bottomPad − N» и абсолютных доков с жёсткой высотой над таб-баром', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/(?:tabContentBottomPad|bottomPad)\s*[-−–]\s*\d/);
    expect(src).not.toMatch(/tabBarHeight\s*[+-]/);
  });

  it('Пик: док стоит на «верх капсулы + зазор»', () => {
    const home = read('components/spire/SpireHomeScreen.tsx');
    expect(home).toContain('const pillTop = useTabPillTop();');
    expect(home).toContain('dockBottom = pillTop + DOCK_PILL_GAP');
    expect(home).toContain('style={[s.dock, { bottom: dockBottom }]}');
  });
});
