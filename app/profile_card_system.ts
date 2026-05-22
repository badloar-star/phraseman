import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';
import { getShardsBalance, spendShards } from './shards_system';

export const PROFILE_CARD_LEVEL_KEY = 'profile_card_level';
export const PROFILE_CARD_THEME_KEY = 'profile_card_theme';
export const PROFILE_CARD_MOTION_KEY = 'profile_card_motion';
export const PROFILE_CARD_PUBLIC_FOCUS_KEY = 'profile_card_public_focus';

export const PROFILE_CARD_MAX_LEVEL = 5;

export type ProfileCardLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type ProfileCardTheme = 'classic' | 'gold' | 'crystal' | 'ember' | 'aurora';
export type ProfileCardMotion = 'none' | 'gleam' | 'pulse' | 'particles' | 'elite';
export type ProfileCardPublicFocus = 'balanced' | 'arena' | 'streak' | 'league' | 'xp';

export type ProfileCardLevelDef = {
  level: ProfileCardLevel;
  name: string;
  cost: number;
  unlockRu: string;
  unlockUk: string;
  unlockEs: string;
};

export type ProfileCardSnapshot = {
  level: ProfileCardLevel;
  theme: ProfileCardTheme;
  motion: ProfileCardMotion;
  publicFocus: ProfileCardPublicFocus;
};

export type ProfileCardChoiceDef<T extends string> = {
  id: T;
  minLevel: ProfileCardLevel;
  name: string;
  descriptionRu: string;
  descriptionUk: string;
  descriptionEs: string;
};

export const PROFILE_CARD_LEVELS: ProfileCardLevelDef[] = [
  {
    level: 0,
    name: 'Standard',
    cost: 0,
    unlockRu: 'Базовая карточка профиля',
    unlockUk: 'Базова картка профілю',
    unlockEs: 'Tarjeta de perfil base',
  },
  {
    level: 1,
    name: 'Polished',
    cost: 50,
    unlockRu: 'Элитная компоновка, бейдж уровня карточки и более чистая иерархия',
    unlockUk: 'Елітна композиція, бейдж рівня картки та чистіша ієрархія',
    unlockEs: 'Diseño premium, insignia de nivel y jerarquía más clara',
  },
  {
    level: 2,
    name: 'Signature',
    cost: 100,
    unlockRu: 'Выбор темы и материала карточки',
    unlockUk: 'Вибір теми та матеріалу картки',
    unlockEs: 'Elección de tema y material de la tarjeta',
  },
  {
    level: 3,
    name: 'Motion',
    cost: 180,
    unlockRu: 'Анимированная рамка и более дорогой вход карточки',
    unlockUk: 'Анімована рамка та дорожчий вхід картки',
    unlockEs: 'Marco animado y entrada más premium',
  },
  {
    level: 4,
    name: 'Prestige',
    cost: 300,
    unlockRu: 'Расширенные публичные статусные показатели',
    unlockUk: 'Розширені публічні статусні показники',
    unlockEs: 'Estadísticas públicas de prestigio ampliadas',
  },
  {
    level: 5,
    name: 'Elite',
    cost: 500,
    unlockRu: 'Элитный entrance-эффект и самый сильный визуальный статус',
    unlockUk: 'Елітний entrance-ефект і найсильніший візуальний статус',
    unlockEs: 'Efecto de entrada elite y máximo estado visual',
  },
];

export const PROFILE_CARD_THEMES: ProfileCardChoiceDef<ProfileCardTheme>[] = [
  {
    id: 'classic',
    minLevel: 0,
    name: 'Classic',
    descriptionRu: 'Чистый базовый материал без декоративной темы.',
    descriptionUk: 'Чистий базовий матеріал без декоративної теми.',
    descriptionEs: 'Material base limpio sin tema decorativo.',
  },
  {
    id: 'gold',
    minLevel: 2,
    name: 'Gold',
    descriptionRu: 'Теплый золотой металл для статусной карточки.',
    descriptionUk: 'Теплий золотий метал для статусної картки.',
    descriptionEs: 'Metal dorado cálido para una tarjeta de estatus.',
  },
  {
    id: 'crystal',
    minLevel: 2,
    name: 'Crystal',
    descriptionRu: 'Холодное стекло, сияние и аккуратный премиальный блеск.',
    descriptionUk: 'Холодне скло, сяйво і акуратний преміальний блиск.',
    descriptionEs: 'Cristal frío, brillo y acabado premium sutil.',
  },
  {
    id: 'ember',
    minLevel: 2,
    name: 'Ember',
    descriptionRu: 'Огненный акцент для игроков с сильной серией.',
    descriptionUk: 'Вогняний акцент для гравців із сильною серією.',
    descriptionEs: 'Acento de fuego para jugadores con buena racha.',
  },
  {
    id: 'aurora',
    minLevel: 2,
    name: 'Aurora',
    descriptionRu: 'Редкое северное свечение для элитного профиля.',
    descriptionUk: 'Рідкісне північне сяйво для елітного профілю.',
    descriptionEs: 'Aurora rara para un perfil elite.',
  },
];

export const PROFILE_CARD_MOTIONS: ProfileCardChoiceDef<ProfileCardMotion>[] = [
  {
    id: 'none',
    minLevel: 0,
    name: 'Calm',
    descriptionRu: 'Спокойная карточка без движения.',
    descriptionUk: 'Спокійна картка без руху.',
    descriptionEs: 'Tarjeta tranquila sin movimiento.',
  },
  {
    id: 'gleam',
    minLevel: 3,
    name: 'Gleam',
    descriptionRu: 'Мягкий проход света по рамке карточки.',
    descriptionUk: 'М’який прохід світла по рамці картки.',
    descriptionEs: 'Barrido suave de luz por el borde.',
  },
  {
    id: 'pulse',
    minLevel: 3,
    name: 'Pulse',
    descriptionRu: 'Дышащее свечение вокруг карточки.',
    descriptionUk: 'Дихаюче сяйво навколо картки.',
    descriptionEs: 'Brillo respirante alrededor de la tarjeta.',
  },
  {
    id: 'particles',
    minLevel: 3,
    name: 'Particles',
    descriptionRu: 'Небольшие искры вокруг верхней части профиля.',
    descriptionUk: 'Невеликі іскри навколо верхньої частини профілю.',
    descriptionEs: 'Pequeñas chispas alrededor del perfil.',
  },
  {
    id: 'elite',
    minLevel: 5,
    name: 'Elite',
    descriptionRu: 'Самый дорогой entrance-эффект и сияние элитной карточки.',
    descriptionUk: 'Найдорожчий entrance-ефект і сяйво елітної картки.',
    descriptionEs: 'Efecto de entrada y brillo elite.',
  },
];

export const PROFILE_CARD_PUBLIC_FOCUSES: ProfileCardChoiceDef<ProfileCardPublicFocus>[] = [
  {
    id: 'balanced',
    minLevel: 0,
    name: 'Balanced',
    descriptionRu: 'Показывает главные сильные стороны без перекоса.',
    descriptionUk: 'Показує головні сильні сторони без перекосу.',
    descriptionEs: 'Muestra las fortalezas principales sin sesgo.',
  },
  {
    id: 'xp',
    minLevel: 4,
    name: 'XP',
    descriptionRu: 'Акцент на общем опыте и уровне.',
    descriptionUk: 'Акцент на загальному досвіді та рівні.',
    descriptionEs: 'Enfoque en experiencia total y nivel.',
  },
  {
    id: 'streak',
    minLevel: 4,
    name: 'Streak',
    descriptionRu: 'Акцент на дисциплине и днях подряд.',
    descriptionUk: 'Акцент на дисципліні та днях поспіль.',
    descriptionEs: 'Enfoque en disciplina y racha.',
  },
  {
    id: 'league',
    minLevel: 4,
    name: 'League',
    descriptionRu: 'Акцент на текущей лиге.',
    descriptionUk: 'Акцент на поточній лізі.',
    descriptionEs: 'Enfoque en la liga actual.',
  },
  {
    id: 'arena',
    minLevel: 4,
    name: 'Arena',
    descriptionRu: 'Акцент на PvP-ранге арены.',
    descriptionUk: 'Акцент на PvP-ранзі арени.',
    descriptionEs: 'Enfoque en el rango PvP de arena.',
  },
];

const DEFAULT_PROFILE_CARD_LEVEL_DEF = PROFILE_CARD_LEVELS[0];
const DEFAULT_PROFILE_CARD_THEME_DEF = PROFILE_CARD_THEMES[0];
const DEFAULT_PROFILE_CARD_MOTION_DEF = PROFILE_CARD_MOTIONS[0];
const DEFAULT_PROFILE_CARD_PUBLIC_FOCUS_DEF = PROFILE_CARD_PUBLIC_FOCUSES[0];

export const PROFILE_CARD_SYNC_KEYS = [
  PROFILE_CARD_LEVEL_KEY,
  PROFILE_CARD_THEME_KEY,
  PROFILE_CARD_MOTION_KEY,
  PROFILE_CARD_PUBLIC_FOCUS_KEY,
] as const;

export function normalizeProfileCardLevel(value: unknown): ProfileCardLevel {
  const n = Math.max(0, Math.min(PROFILE_CARD_MAX_LEVEL, Math.floor(Number(value) || 0)));
  return n as ProfileCardLevel;
}

export function getProfileCardLevelDef(level: ProfileCardLevel): ProfileCardLevelDef {
  const match = PROFILE_CARD_LEVELS.find((item) => item.level === level);
  if (match) return match;
  return DEFAULT_PROFILE_CARD_LEVEL_DEF;
}

export function getProfileCardThemeDef(theme: ProfileCardTheme): ProfileCardChoiceDef<ProfileCardTheme> {
  const match = PROFILE_CARD_THEMES.find((item) => item.id === theme);
  if (match) return match;
  return DEFAULT_PROFILE_CARD_THEME_DEF;
}

export function getProfileCardMotionDef(motion: ProfileCardMotion): ProfileCardChoiceDef<ProfileCardMotion> {
  const match = PROFILE_CARD_MOTIONS.find((item) => item.id === motion);
  if (match) return match;
  return DEFAULT_PROFILE_CARD_MOTION_DEF;
}

export function getProfileCardPublicFocusDef(focus: ProfileCardPublicFocus): ProfileCardChoiceDef<ProfileCardPublicFocus> {
  const match = PROFILE_CARD_PUBLIC_FOCUSES.find((item) => item.id === focus);
  if (match) return match;
  return DEFAULT_PROFILE_CARD_PUBLIC_FOCUS_DEF;
}

export function getNextProfileCardLevel(level: ProfileCardLevel): ProfileCardLevel | null {
  if (level >= PROFILE_CARD_MAX_LEVEL) return null;
  return (level + 1) as ProfileCardLevel;
}

export async function getProfileCardLevel(): Promise<ProfileCardLevel> {
  try {
    return normalizeProfileCardLevel(await AsyncStorage.getItem(PROFILE_CARD_LEVEL_KEY));
  } catch {
    return 0;
  }
}

export async function getProfileCardSnapshot(): Promise<ProfileCardSnapshot> {
  try {
    const [[, rawLevel], [, rawTheme], [, rawMotion], [, rawFocus]] = await AsyncStorage.multiGet([
      PROFILE_CARD_LEVEL_KEY,
      PROFILE_CARD_THEME_KEY,
      PROFILE_CARD_MOTION_KEY,
      PROFILE_CARD_PUBLIC_FOCUS_KEY,
    ]);
    return {
      level: normalizeProfileCardLevel(rawLevel),
      theme: normalizeProfileCardTheme(rawTheme),
      motion: normalizeProfileCardMotion(rawMotion),
      publicFocus: normalizeProfileCardPublicFocus(rawFocus),
    };
  } catch {
    return {
      level: 0,
      theme: 'classic',
      motion: 'none',
      publicFocus: 'balanced',
    };
  }
}

export function canUseProfileCardTheme(level: ProfileCardLevel, theme: ProfileCardTheme): boolean {
  return level >= getProfileCardThemeDef(theme).minLevel;
}

export function canUseProfileCardMotion(level: ProfileCardLevel, motion: ProfileCardMotion): boolean {
  return level >= getProfileCardMotionDef(motion).minLevel;
}

export function canUseProfileCardPublicFocus(level: ProfileCardLevel, focus: ProfileCardPublicFocus): boolean {
  return level >= getProfileCardPublicFocusDef(focus).minLevel;
}

export async function setProfileCardTheme(theme: ProfileCardTheme): Promise<ProfileCardSnapshot> {
  const level = await getProfileCardLevel();
  const next = normalizeProfileCardTheme(theme);
  if (!canUseProfileCardTheme(level, next)) {
    throw new Error('profile_card_theme_locked');
  }
  await AsyncStorage.setItem(PROFILE_CARD_THEME_KEY, next);
  emitAppEvent('xp_changed');
  return getProfileCardSnapshot();
}

export async function setProfileCardMotion(motion: ProfileCardMotion): Promise<ProfileCardSnapshot> {
  const level = await getProfileCardLevel();
  const next = normalizeProfileCardMotion(motion);
  if (!canUseProfileCardMotion(level, next)) {
    throw new Error('profile_card_motion_locked');
  }
  await AsyncStorage.setItem(PROFILE_CARD_MOTION_KEY, next);
  emitAppEvent('xp_changed');
  return getProfileCardSnapshot();
}

export async function setProfileCardPublicFocus(focus: ProfileCardPublicFocus): Promise<ProfileCardSnapshot> {
  const level = await getProfileCardLevel();
  const next = normalizeProfileCardPublicFocus(focus);
  if (!canUseProfileCardPublicFocus(level, next)) {
    throw new Error('profile_card_focus_locked');
  }
  await AsyncStorage.setItem(PROFILE_CARD_PUBLIC_FOCUS_KEY, next);
  emitAppEvent('xp_changed');
  return getProfileCardSnapshot();
}

export async function upgradeProfileCardLevel(): Promise<
  | { ok: true; level: ProfileCardLevel; balance: number }
  | { ok: false; reason: 'max' | 'insufficient' | 'spend_failed'; need?: number; balance?: number }
> {
  const current = await getProfileCardLevel();
  const next = getNextProfileCardLevel(current);
  if (next === null) return { ok: false, reason: 'max' };

  const def = getProfileCardLevelDef(next);
  const balance = await getShardsBalance();
  if (balance < def.cost) {
    return { ok: false, reason: 'insufficient', need: def.cost - balance, balance };
  }

  const ok = await spendShards(def.cost, 'profile_card_upgrade');
  if (!ok) return { ok: false, reason: 'spend_failed', balance };

  await AsyncStorage.setItem(PROFILE_CARD_LEVEL_KEY, String(next));
  if (next >= 2) {
    const theme = await AsyncStorage.getItem(PROFILE_CARD_THEME_KEY);
    if (!theme) await AsyncStorage.setItem(PROFILE_CARD_THEME_KEY, 'gold');
  }
  if (next >= 3) {
    const motion = await AsyncStorage.getItem(PROFILE_CARD_MOTION_KEY);
    if (!motion) await AsyncStorage.setItem(PROFILE_CARD_MOTION_KEY, 'gleam');
  }
  if (next >= 5) {
    const motion = await AsyncStorage.getItem(PROFILE_CARD_MOTION_KEY);
    if (!motion || motion === 'none' || normalizeProfileCardMotion(motion) === 'gleam') {
      await AsyncStorage.setItem(PROFILE_CARD_MOTION_KEY, 'elite');
    }
  }
  if (next >= 4) {
    const focus = await AsyncStorage.getItem(PROFILE_CARD_PUBLIC_FOCUS_KEY);
    if (!focus) await AsyncStorage.setItem(PROFILE_CARD_PUBLIC_FOCUS_KEY, 'balanced');
  }

  const updatedBalance = await getShardsBalance();
  emitAppEvent('xp_changed');
  return { ok: true, level: next, balance: updatedBalance };
}

export function profileCardLevelRoman(level: ProfileCardLevel): string {
  return ['0', 'I', 'II', 'III', 'IV', 'V'][level] ?? '0';
}

export function normalizeProfileCardTheme(value: unknown): ProfileCardTheme {
  return value === 'gold' || value === 'crystal' || value === 'ember' || value === 'aurora'
    ? value
    : 'classic';
}

const LEGACY_PROFILE_CARD_MOTION_LIGHT = ['shi', 'mmer'].join('');

export function normalizeProfileCardMotion(value: unknown): ProfileCardMotion {
  if (value === LEGACY_PROFILE_CARD_MOTION_LIGHT) return 'gleam';
  return value === 'gleam' || value === 'pulse' || value === 'particles' || value === 'elite'
    ? value
    : 'none';
}

export function normalizeProfileCardPublicFocus(value: unknown): ProfileCardPublicFocus {
  return value === 'arena' || value === 'streak' || value === 'league' || value === 'xp'
    ? value
    : 'balanced';
}
