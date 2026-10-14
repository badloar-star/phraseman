// зачем (владелец 13.10, последнее слово через координатора: «всё строго в текущей теме, все модалы слушаются тему»): нейтральная тёмная шторка стиля «Тень»
// (#28282E → #1E1E24, решение 12.10) ОТМЕНЕНА. Цвет поверхности шторки и плашек на ней — из токенов ТЕКУЩЕЙ темы; приём «Тень» остаётся (без рамок, тень/тон/скругление).
// Функции оставлены, чтобы потребители (HybridSheetShell, PanelSheet, PackEditorV2, FlashcardsTrainingModeSheet, PanelKit) не менялись: градиент нейтрали
// теперь всегда null (потребители берут свой тематический путь), плашки — прежние sheetPlateTokens темы.

import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { sheetPlateTokens } from './ShadowSurface';

/** Нейтрального градиента шторки больше нет — всегда null, шторка красится токенами темы. */
export function shadowSheetGradient(_isLight: boolean): readonly [string, string] | null {
  return null;
}

/** Плашки и плитки внутри шторки: токены текущей темы (sheetPlateTokens), в светлом и в тёмном оформлении. */
export function shadowSheetPlateTokens<T extends GlassTokens>(g: T): T {
  return sheetPlateTokens(g);
}
