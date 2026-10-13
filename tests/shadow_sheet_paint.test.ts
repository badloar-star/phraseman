// зачем (Макеты 7c831a193, mistakes-panel-021 / cards-v2-027): шторки стиля «Тень» в тёмном оформлении — нейтральный градиент при ЛЮБОЙ теме,
// светлое оформление не меняется. Сторож не даёт вернуть тон «Авроры» в подложку шторки.
import fs from 'node:fs';
import path from 'node:path';

import { SHADOW_SHEET_DARK_BOTTOM, SHADOW_SHEET_DARK_TOP, shadowSheetGradient } from '../components/v2/shadow_sheet_paint';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('шторки «Тень»: нейтральная заливка', () => {
  it('тёмное оформление — нейтральный градиент сверху вниз (shadow-skin.css .ph .sheet)', () => {
    expect(shadowSheetGradient(false)).toEqual([SHADOW_SHEET_DARK_TOP, SHADOW_SHEET_DARK_BOTTOM]);
    expect(SHADOW_SHEET_DARK_TOP).toBe('#28282E');
    expect(SHADOW_SHEET_DARK_BOTTOM).toBe('#1E1E24');
  });

  it('светлое оформление — null (прежняя заливка по токенам темы остаётся)', () => {
    expect(shadowSheetGradient(true)).toBeNull();
  });

  it('шторка «Мои ошибки» и шторка режимов Карточек берут заливку из одного хелпера, без bgGlow в тёмной ветке', () => {
    const panel = read('components/mistakes-panel/PanelSheet.tsx');
    expect(panel).toContain('shadowSheetGradient(g.isLight)');
    expect(panel).not.toContain('g.bgGlow');
    const cards = read('app/flashcards/FlashcardsTrainingModeSheet.tsx');
    expect(cards).toContain('shadowSheetGradient(g.isLight)');
  });
});
