// зачем (Волна 2, пункт 5; владелец одобрил 04.11): управляющие кнопки китов карточек и панелей нажимаются с отпусканием кита 2.0 (KitTouchable: scale .97 + opacity,
// transform/opacity на нативном драйвере, reduce-motion), а не мгновенным «щёлк» через pressed-стиль. Строки длинных списков (PanelRow, FlashcardListItem) не трогаем.
import * as fs from 'fs';
import * as path from 'path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('кнопки китов — нажатие через KitTouchable', () => {
  it('CardsKit: KitCard, KitCta и сегмент не используют pressed-стиль', () => {
    const kit = read('components/cards-grid/CardsKit.tsx');
    expect(kit).toContain("import { KitTouchable } from '../KitTouchable';");
    expect(kit).not.toMatch(/style=\{\(\{ pressed \}\)/);
    expect((kit.match(/<KitTouchable/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
  it('PanelKit: PanelCta и SheetRow через KitTouchable; PanelRow (строка списка) без изменений', () => {
    const panel = read('components/mistakes-panel/PanelKit.tsx');
    expect(panel).toContain("import { KitTouchable } from '../KitTouchable';");
    const cta = panel.slice(panel.indexOf('export const PanelCta'), panel.indexOf('export const PanelDock'));
    expect(cta).toContain('<KitTouchable');
    expect(cta).not.toContain('<Pressable');
    const sheetRow = panel.slice(panel.indexOf('export function SheetRow'));
    expect(sheetRow.slice(0, 900)).toContain('<KitTouchable');
    const row = panel.slice(panel.indexOf('export const PanelRow'), panel.indexOf('export const PanelCta'));
    expect(row).toContain('<Pressable');
  });
  it('CardsGlassKit: круглая кнопка и главная кнопка — KitTouchable, без TouchableOpacity', () => {
    const glass = read('app/flashcards/CardsGlassKit.tsx');
    expect(glass).not.toContain('TouchableOpacity');
    expect((glass.match(/<KitTouchable/g) ?? []).length).toBe(2);
  });
  it('строки длинных списков карточек не тронуты', () => {
    const item = read('app/flashcards/FlashcardListItem.tsx');
    expect(item).not.toContain("components/KitTouchable");
  });
});
