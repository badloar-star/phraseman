// ════════════════════════════════════════════════════════════════════════════
// settingsSurfaces.ts — тональная палитра поверхностей раздела «Настройки».
//
// зачем: экран «Аккаунт» (app/account_details.tsx) — модальный лист, продолжение
// настроек, и обязан использовать те же тона панелей/делителей. Палитра пока
// продублирована из app/(tabs)/settings.tsx (SETTINGS_SURFACES): settings.tsx
// активно правится в параллельных сессиях, и вынос оттуда сейчас рискует
// конфликтом. Record<ThemeMode, …> в обоих местах — новая тема сломает компиляцию
// обеих копий, так что рассинхрон по составу тем невозможен; расхождение цветов
// вычищается отдельной задачей (перевести settings.tsx на этот модуль).
// ════════════════════════════════════════════════════════════════════════════
import type { ThemeMode } from '../../constants/theme';

export type SettingsSurfacePalette = {
  panel: string;
  chip: string;
  border: string;
  divider: string;
  notice: string;
  /** Приглушённый акцент темы — выбранные значения, активные надписи. */
  accent: string;
  /** Мягкая тональная заливка «выбранного» — состояние тоном, без обводок. */
  chipOn: string;
};

export const SETTINGS_SURFACES: Record<ThemeMode, SettingsSurfacePalette> = {
  dark: {
    panel: '#19231D',
    chip: '#19231D',
    border: 'rgba(214,255,226,0.10)',
    divider: 'rgba(214,255,226,0.07)',
    notice: '#1C281F',
    accent: '#84C39B',
    chipOn: '#233729',
  },
  gold: {
    panel: '#1C1912',
    chip: '#1C1912',
    border: 'rgba(232,205,139,0.14)',
    divider: 'rgba(232,205,139,0.08)',
    notice: '#211C12',
    accent: '#D6BE8B',
    chipOn: '#2B2515',
  },
  coral: {
    panel: '#24191D',
    chip: '#24191D',
    border: 'rgba(255,220,228,0.11)',
    divider: 'rgba(255,220,228,0.07)',
    notice: '#2A1C20',
    accent: '#E39FAC',
    chipOn: '#322028',
  },
  minimalDark: {
    panel: '#1C1C1E',
    chip: '#1C1C1E',
    border: 'rgba(255,255,255,0.12)',
    divider: 'rgba(255,255,255,0.08)',
    notice: '#202124',
    accent: '#8FB6E8',
    chipOn: '#24292F',
  },
  business: {
    panel: '#0A0A0A',
    chip: '#0A0A0A',
    border: 'rgba(255,255,255,0.10)',
    divider: 'rgba(255,255,255,0.07)',
    notice: '#121212',
    accent: '#E4E4E4',
    chipOn: '#1E1E1E',
  },
  businessLight: {
    panel: '#FFFFFF',
    chip: '#FFFFFF',
    border: 'rgba(0,0,0,0.10)',
    divider: 'rgba(0,0,0,0.06)',
    notice: '#FAFAFA',
    accent: '#2B2B2B',
    chipOn: '#EDEDED',
  },
  midnight: {
    panel: '#1B1D25',
    chip: '#1B1D25',
    border: 'rgba(225,232,255,0.12)',
    divider: 'rgba(225,232,255,0.07)',
    notice: '#202330',
    accent: '#A3B2E4',
    chipOn: '#242939',
  },
  ember: {
    panel: '#241B18',
    chip: '#241B18',
    border: 'rgba(255,222,205,0.12)',
    divider: 'rgba(255,222,205,0.07)',
    notice: '#2B201B',
    accent: '#DFA985',
    chipOn: '#33251D',
  },
  aurora: {
    panel: '#182222',
    chip: '#182222',
    border: 'rgba(215,255,244,0.12)',
    divider: 'rgba(215,255,244,0.07)',
    notice: '#1B2828',
    accent: '#8FC8BC',
    chipOn: '#20332F',
  },
  volt: {
    panel: '#1F2417',
    chip: '#1F2417',
    border: 'rgba(226,255,122,0.13)',
    divider: 'rgba(226,255,122,0.07)',
    notice: '#242B19',
    accent: '#BCCB85',
    chipOn: '#2B331D',
  },
  candyBlue: {
    panel: '#16282F',
    chip: '#16282F',
    border: 'rgba(178,213,229,0.13)',
    divider: 'rgba(178,213,229,0.07)',
    notice: '#1A2E36',
    accent: '#9DC4D6',
    chipOn: '#1F3742',
  },
  indigo: {
    panel: '#222140',
    chip: '#222140',
    border: 'rgba(200,195,255,0.13)',
    divider: 'rgba(200,195,255,0.07)',
    notice: '#26254A',
    accent: '#B5AFE2',
    chipOn: '#2D2C55',
  },
};
