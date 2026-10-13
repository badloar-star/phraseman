// зачем (разбор diff Темами 13.10, Г1; mistakes-panel-021): плашки внутри нижней шторки «Тень» в тёмном нейтральны при ЛЮБОЙ теме и ≈ образцу
// shadow-skin.css (60,60,68)→(48,48,56); в светлом остаются прежние sheetPlateTokens. Глобальные токены sheetPlateFillFrom/To не меняются.
import fs from 'node:fs';
import path from 'node:path';

import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { SHADOW_SHEET_DARK_BOTTOM, SHADOW_SHEET_DARK_TOP, shadowSheetPlateTokens } from '../components/v2/shadow_sheet_paint';
import { sheetPlateTokens } from '../components/v2/ShadowSurface';

const DARK_THEMES = ['graphite', 'grad_aurora', 'grad_iris', 'grad_magma', 'grad_jade', 'grad_orchid', 'grad_midnight'] as const;
const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('плашки нижних шторок «Тень»', () => {
  it('в тёмном заливка плашки одинакова у всех тем и уровней — тон темы не влияет', () => {
    const base = shadowSheetPlateTokens(liquidGlassTokens('graphite', { appearance: 'dark', intensity: 0 } as never));
    for (const id of DARK_THEMES) {
      for (const intensity of [0, 0.6, 1]) {
        const t = shadowSheetPlateTokens(liquidGlassTokens(id, { appearance: 'dark', intensity } as never));
        expect(`${id}@${intensity} ${t.plateFillFrom}/${t.plateFillTo}`).toBe(`${id}@${intensity} ${base.plateFillFrom}/${base.plateFillTo}`);
      }
    }
  });

  it('плашка светлее нейтральной шторки, без цветного перекоса, ≈ образцу (60,60,68)→(48,48,56)', () => {
    const t = shadowSheetPlateTokens(liquidGlassTokens('grad_aurora', { appearance: 'dark', intensity: 1 } as never));
    const from = channels(t.plateFillFrom);
    const to = channels(t.plateFillTo);
    expect(from[0]).toBeGreaterThan(channels(SHADOW_SHEET_DARK_TOP)[0]);
    expect(to[0]).toBeGreaterThan(channels(SHADOW_SHEET_DARK_BOTTOM)[0]);
    expect(Math.abs(from[0] - from[1])).toBeLessThanOrEqual(2);
    expect(from[2] - from[0]).toBeLessThanOrEqual(10);
    expect(Math.abs(from[0] - 60)).toBeLessThanOrEqual(6);
    expect(Math.abs(to[0] - 48)).toBeLessThanOrEqual(6);
  });

  it('в светлом — прежние sheetPlateTokens; глобальные токены тёмной Авроры не тронуты', () => {
    const light = liquidGlassTokens('grad_aurora', { appearance: 'light', intensity: 0.6 } as never);
    expect(shadowSheetPlateTokens(light).plateFillFrom).toBe(sheetPlateTokens(light).plateFillFrom);
    const dark = liquidGlassTokens('grad_aurora', { appearance: 'dark', intensity: 1 } as never);
    expect(dark.sheetPlateFillFrom).not.toBe(shadowSheetPlateTokens(dark).plateFillFrom);
  });

  it('шторки «Мои ошибки» и «Режим тренировки» берут плашки из хелпера', () => {
    expect(read('components/mistakes-panel/PanelKit.tsx')).toContain('shadowSheetPlateTokens(g)');
    expect(read('app/flashcards/FlashcardsTrainingModeSheet.tsx')).toContain('shadowSheetPlateTokens(g)');
  });
});
