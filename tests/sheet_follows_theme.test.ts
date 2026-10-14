// зачем (владелец 13.10, последнее слово через координатора: «всё строго в текущей теме, все модалы слушаются тему»): нейтральная тёмная шторка стиля «Тень» (#28282E, решение 12.10)
// отменена. Подложка шторок/окон и заливка контролов — токены ТЕКУЩЕЙ темы; приём «Тень» (без рамок, тень/тон/скругление) остаётся.
// Заменяет четыре сторожа нейтрали (neutral_dark_opaque_sheet, paywall_surfaces_neutral_dark, shadow_sheet_paint, shadow_sheet_plates).
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { shadowSheetGradient, shadowSheetPlateTokens } from '../components/v2/shadow_sheet_paint';
import { sheetPlateTokens } from '../components/v2/ShadowSurface';
import { paywallPlateBg, paywallSheetBg } from '../components/paywall/paywall_surfaces';

const THEMES = ['graphite', 'grad_aurora', 'grad_iris', 'grad_magma', 'grad_jade', 'grad_orchid', 'grad_midnight', 'rose', 'polar', 'taupe'] as const;

describe('шторки и окна слушаются тему', () => {
  it('в тёмном оформлении подложка шторки у разных тем разная (не одна нейтраль)', () => {
    const sheets = new Set<string>();
    for (const id of THEMES) sheets.add(liquidGlassTokens(id, { appearance: 'dark', intensity: 0.5 } as never).opaqueSheet.toUpperCase());
    expect(sheets.size).toBeGreaterThan(3);
    expect(sheets.has('#28282E') && sheets.size === 1).toBe(false);
  });

  it('нейтрального градиента шторки нет: оба оформления идут тематическим путём потребителей', () => {
    expect(shadowSheetGradient(true)).toBeNull();
    expect(shadowSheetGradient(false)).toBeNull();
  });

  it('плашки внутри шторки — sheetPlateTokens текущей темы, в светлом и в тёмном', () => {
    for (const appearance of ['dark', 'light'] as const) {
      for (const id of THEMES) {
        const g = liquidGlassTokens(id, { appearance, intensity: 0.5 } as never);
        expect(shadowSheetPlateTokens(g)).toEqual(sheetPlateTokens(g));
      }
    }
  });

  it('пейвол: лист — opaqueSheet темы в обоих оформлениях, плашки — плашки темы', () => {
    for (const appearance of ['dark', 'light'] as const) {
      for (const id of THEMES) {
        const g = liquidGlassTokens(id, { appearance, intensity: 0.5 } as never);
        expect(paywallSheetBg(g)).toBe(g.opaqueSheet);
        expect(typeof paywallPlateBg(g)).toBe('string');
      }
    }
  });
});
