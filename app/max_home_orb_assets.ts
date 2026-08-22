import type { ThemeMode } from '../constants/theme';

export type MaxHomeOrbLayers = Readonly<{
  shell: number;
  field: number;
  glints: number;
}>;

const INDIGO: MaxHomeOrbLayers = {
  shell: require('../assets/images/home_menu/max/indigo/shell.webp'),
  field: require('../assets/images/home_menu/max/indigo/field.webp'),
  glints: require('../assets/images/home_menu/max/indigo/glints.webp'),
};

const SAGE_PORCELAIN: MaxHomeOrbLayers = {
  shell: require('../assets/images/home_menu/max/sagePorcelain/shell.webp'),
  field: require('../assets/images/home_menu/max/sagePorcelain/field.webp'),
  glints: require('../assets/images/home_menu/max/sagePorcelain/glints.webp'),
};

const OLIVE: MaxHomeOrbLayers = {
  shell: require('../assets/images/home_menu/max/olive/shell.webp'),
  field: require('../assets/images/home_menu/max/olive/field.webp'),
  glints: require('../assets/images/home_menu/max/olive/glints.webp'),
};

const MIDNIGHT: MaxHomeOrbLayers = {
  shell: require('../assets/images/home_menu/max/midnight/shell.webp'),
  field: require('../assets/images/home_menu/max/midnight/field.webp'),
  glints: require('../assets/images/home_menu/max/midnight/glints.webp'),
};

const EMBER: MaxHomeOrbLayers = {
  shell: require('../assets/images/home_menu/max/ember/shell.webp'),
  field: require('../assets/images/home_menu/max/ember/field.webp'),
  glints: require('../assets/images/home_menu/max/ember/glints.webp'),
};

const AURORA: MaxHomeOrbLayers = {
  shell: require('../assets/images/home_menu/max/aurora/shell.webp'),
  field: require('../assets/images/home_menu/max/aurora/field.webp'),
  glints: require('../assets/images/home_menu/max/aurora/glints.webp'),
};

const VOLT: MaxHomeOrbLayers = {
  shell: require('../assets/images/home_menu/max/volt/shell.webp'),
  field: require('../assets/images/home_menu/max/volt/field.webp'),
  glints: require('../assets/images/home_menu/max/volt/glints.webp'),
};

const DARK: MaxHomeOrbLayers = {
  shell: require('../assets/images/home_menu/max/dark/shell.webp'),
  field: require('../assets/images/home_menu/max/dark/field.webp'),
  glints: require('../assets/images/home_menu/max/dark/glints.webp'),
};

const GOLD: MaxHomeOrbLayers = {
  shell: require('../assets/images/home_menu/max/gold/shell.webp'),
  field: require('../assets/images/home_menu/max/gold/field.webp'),
  glints: require('../assets/images/home_menu/max/gold/glints.webp'),
};

export function getMaxHomeOrbLayers(themeMode: ThemeMode): MaxHomeOrbLayers {
  switch (themeMode) {
    case 'sagePorcelain': return SAGE_PORCELAIN;
    case 'olive': return OLIVE;
    case 'midnight': return MIDNIGHT;
    case 'ember': return EMBER;
    case 'aurora': return AURORA;
    case 'volt': return VOLT;
    case 'dark': return DARK;
    case 'gold': return GOLD;
    default: return INDIGO;
  }
}
