// use_spire_tower_theme.ts — цвета башни Пика из палитры активной темы (одна точка для SpireHomeScreen и PeakScreenV2).
// зачем (координатор 05.11, решение по №147; правило владельца «все цвета — оттенки темы»; Макеты 05.11 кадр 07:43: «башня тёмно-серая на светлом экране»):
// один расчёт вместо двух копий; SpireHomeScreen — в пределах 400 строк (сторож spire_scene_contract). Не-hex токены → undefined (прежний наряд лиги).
import { useMemo } from 'react';
import type { SpireTowerThemeColors } from '../../modules/spire/tower_skins';

const isHex = (c: unknown): c is string => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);

export function useSpireTowerTheme(p: Readonly<{ accentGraphic: unknown; bgTop: unknown; bg: unknown }>): SpireTowerThemeColors | undefined {
  const { accentGraphic, bgTop, bg } = p;
  return useMemo(
    () => (isHex(accentGraphic) && isHex(bgTop) && isHex(bg) ? { accent: accentGraphic, sceneTop: bgTop, sceneBottom: bg } : undefined),
    [accentGraphic, bgTop, bg],
  );
}
