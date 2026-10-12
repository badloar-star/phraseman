import { useMemo } from 'react';
import { useTheme } from '../ThemeContext';
import type { BoxShadowValue } from 'react-native';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { nestedBoxShadow } from '../v2/ShadowSurface';

/**
 * Краски шторок визитки («Текст визитки», «Стиль») из токенов выбранной темы.
 *
 * зачем (замечание владельца 10.10 «цвета не должны быть зашиты под макет»): шторки были литералами (#151518, белый,
 * rgba белого) и в светлой теме выглядели тёмным пятном с белым текстом на светлом. Теперь лист, поле, текст, кнопки и
 * предупреждение — токены темы (контраст ≥ 4.5 на всех поверхностях проверен по всем темам). Сама визитка (арт, превью
 * стиля) остаётся иллюстрацией и цветов темы не меняет.
 */
export type SheetButtonPaint = Readonly<{
  primaryBg: string;
  primaryInk: string;
  altBg: string;
  altInk: string;
  offBg: string;
  offInk: string;
}>;

export type ProfileSheetPaint = Readonly<{
  sheet: string;
  shadow: string;
  handle: string;
  title: string;
  field: string;
  /** Тень вложенного поля вместо кромки (стиль «Тень», владелец 12.10). */
  fieldShadow: BoxShadowValue[];
  fieldInk: string;
  placeholder: string;
  selection: string;
  hint: string;
  warn: string;
  selectedRing: string;
  button: SheetButtonPaint;
}>;

export function useProfileSheetPaint(): ProfileSheetPaint {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  return useMemo(() => ({
    sheet: g.opaqueSheet,
    shadow: g.dropShadow,
    handle: `${g.mutedText.slice(0, 7)}73`,
    title: g.text,
    field: g.opaqueControl,
    fieldShadow: nestedBoxShadow(g),
    fieldInk: g.text,
    placeholder: g.mutedText,
    selection: g.accentGraphic, // зачем (светлый акцент): выделение — графика
    hint: g.secondary,
    warn: g.warn,
    selectedRing: g.text,
    button: {
      primaryBg: g.cta,
      primaryInk: g.ctaInk,
      altBg: g.opaqueControl,
      altInk: g.text,
      offBg: g.hairlineSoft,
      offInk: g.mutedText,
    },
  }), [g]);
}
