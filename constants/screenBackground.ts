import { GOLD_GRADIENTS } from './goldTheme';
import { CINEMA } from './cinemaThemes';
import type { ThemeMode } from './theme';

/**
 * Стопы фонового градиента приложения по темам. Вынесено из ScreenGradient,
 * чтобы и фон, и верхняя fade-маска (TopFadeMask) брали один источник цвета
 * без циклического импорта между компонентами.
 */
const THEME_BG_GRADIENTS: Record<ThemeMode, string[]> = {
  dark:   ['#112318', '#09150E', '#030805'],
  neon:   ['#181818', '#0F0F0F', '#070707'],
  gold:   GOLD_GRADIENTS.appBackground,
  coral:  ['#342027', '#1C1012', '#070405'],
  // Sketch light paper tone
  minimalLight: ['#F1E8D7', '#E0D0B7', '#CDB99C'],
  // Graphite dark neutral tone
  minimalDark: ['#191B1F', '#121316', '#0C0D0F'],
  compass: ['#333335', '#303032', '#2D2D2F'],
  // «Чёрное кино»: чистый чёрный; блум рисуется слоем CinemaBloom поверх.
  midnight: [...CINEMA.midnight.bgGradient3],
  ember: [...CINEMA.ember.bgGradient3],
  aurora: [...CINEMA.aurora.bgGradient3],
  volt: [...CINEMA.volt.bgGradient3],
};

const LEGACY_UNSUPPORTED_BG_GRADIENTS: Record<'ocean' | 'sakura', string[]> = {
  // Глубина: яркий верх, книзу почти ночной синий
  ocean:  ['#2088D0', '#0C4A78', '#020A14'],
  // Тёмно-винный, насыщенно; верх чуть светлее — шапка/приветствие с тёмным текстом читаемы
  sakura: ['#B03062', '#581830', '#14040C'],
};

export const BG_GRADIENTS: Record<ThemeMode | keyof typeof LEGACY_UNSUPPORTED_BG_GRADIENTS, string[]> = {
  ...THEME_BG_GRADIENTS,
  ...LEGACY_UNSUPPORTED_BG_GRADIENTS,
};

/** Те же стопы, что у полного фона приложения — для интро-слоёв и fade-масок без дублирования палитры. */
export const SCREEN_BG_GRADIENT_STOPS: Record<string, string[]> = BG_GRADIENTS;
