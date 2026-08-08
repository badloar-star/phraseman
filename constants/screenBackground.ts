import { CINEMA } from './cinemaThemes';
import type { ThemeMode } from './theme';

/**
 * Стопы фонового градиента приложения по темам. Вынесено из ScreenGradient,
 * чтобы и фон, и верхняя fade-маска (TopFadeMask) брали один источник цвета
 * без циклического импорта между компонентами.
 */
const THEME_BG_GRADIENTS: Record<ThemeMode, string[]> = {
  dark: ['#07120B', '#030805', '#010201'],
  gold: ['#151005', '#090704', '#010101'],
  coral: ['#17090C', '#0C0406', '#010101'],
  // Sketch light paper tone
  // Graphite dark neutral tone
  minimalDark: ['#111318', '#08090D', '#010102'],
  // «Бизнес»: тёплый графит («графит и шампань»), без чистого чёрного.
  business: ['#000000', '#000000'],
  // «Бизнес светлый»: тёплая бумажная подложка.
  businessLight: ['#FFFFFF', '#FFFFFF'],
  // зачем 2026-08-04 (владелец: «в светлой теме фон должен быть темнее даже
  // на главной и на других страницах», заметно): был почти-белый градиент
  // #F7F8F4→#E7EAE3, неотличимый от карточек. Сдвинут в тёплый серо-зелёный
  // ряд вокруг нового SAGE_PORCELAIN.bgPrimary #DCE1D8.
  sagePorcelain: ['#E7EAE2', '#DCE1D8', '#CDD5C7'],
  // «Чёрное кино»: чистый чёрный; блум рисуется слоем CinemaBloom поверх.
  midnight: [...CINEMA.midnight.bgGradient3],
  ember: [...CINEMA.ember.bgGradient3],
  aurora: [...CINEMA.aurora.bgGradient3],
  volt: [...CINEMA.volt.bgGradient3],
  // Legacy candyBlue compatibility palette.
  candyBlue: ['#0B161B', '#050C0F', '#010203'],
  // «Индиго»: тёмный индиго-сумрак.
  indigo: ['#14131F', '#0C0B16', '#010102'],
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
