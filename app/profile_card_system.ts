import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';
import { forceSyncShardsToCloud, getShardsBalance, spendShards } from './shards_system';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';

const FUNCTIONS_REGION = 'us-central1';

export const PROFILE_CARD_LEVEL_KEY = 'profile_card_level';
export const PROFILE_CARD_THEME_KEY = 'profile_card_theme';
export const PROFILE_CARD_MOTION_KEY = 'profile_card_motion';
export const PROFILE_CARD_PUBLIC_FOCUS_KEY = 'profile_card_public_focus';

export const PROFILE_CARD_MAX_LEVEL = 1;
export const PROFILE_CARD_UPGRADE_COST = 200;

export type ProfileCardLevel = 0 | 1;
export type ProfileCardTheme = 'classic' | 'gold';
export type ProfileCardMotion = 'none';
export type ProfileCardPublicFocus = 'balanced';

export type ProfileCardLevelDef = {
  level: ProfileCardLevel;
  name: string;
  cost: number;
  unlockRu: string;
  unlockUk: string;
  unlockEs: string;
  'unlockPt-BR': string;
  unlockVi: string;
  unlockId: string;
  unlockTr: string;
  unlockPl: string;
};

export type ProfileCardSnapshot = {
  level: ProfileCardLevel;
  theme: ProfileCardTheme;
  motion: ProfileCardMotion;
  publicFocus: ProfileCardPublicFocus;
};

export const PROFILE_CARD_LEVELS: ProfileCardLevelDef[] = [
  {
    level: 0,
    name: 'Standard',
    cost: 0,
    unlockRu: 'Базовая карточка профиля',
    unlockUk: 'Базова картка профілю',
    unlockEs: 'Tarjeta de perfil base',
    'unlockPt-BR': 'Cartão de perfil básico',
    unlockVi: 'Thẻ hồ sơ cơ bản',
    unlockId: 'Kartu profil dasar',
    unlockTr: 'Temel profil kartı',
    unlockPl: 'Podstawowa karta profilu',
  },
  {
    level: 1,
    name: 'Phraseman Pro',
    cost: PROFILE_CARD_UPGRADE_COST,
    unlockRu: 'Новая Pro-карточка: премиальный кант, бейдж и 3 публичные метрики',
    unlockUk: 'Нова Pro-картка: преміальний кант, бейдж і 3 публічні метрики',
    unlockEs: 'Nueva tarjeta Pro: borde premium, insignia y 3 métricas públicas',
    'unlockPt-BR': 'Novo cartão Pro: borda premium, selo e 3 métricas públicas',
    unlockVi: 'Thẻ Pro mới: viền cao cấp, huy hiệu và 3 chỉ số công khai',
    unlockId: 'Kartu Pro baru: tepi premium, lencana, dan 3 metrik publik',
    unlockTr: 'Yeni Pro kart: premium kenar, rozet ve 3 herkese açık metrik',
    unlockPl: 'Nowa karta Pro: premium krawędź, odznaka i 3 publiczne metryki',
  },
];

const DEFAULT_PROFILE_CARD_LEVEL_DEF = PROFILE_CARD_LEVELS[0];

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
  return PROFILE_CARD_LEVELS.find((item) => item.level === level) ?? DEFAULT_PROFILE_CARD_LEVEL_DEF;
}

export function getNextProfileCardLevel(level: ProfileCardLevel): ProfileCardLevel | null {
  return level >= PROFILE_CARD_MAX_LEVEL ? null : 1;
}

export type ProfileCardFxKind = 'none' | 'sheen';

export function fxKindForProfileCard(level: ProfileCardLevel, _motion: ProfileCardMotion): ProfileCardFxKind {
  return level >= 1 ? 'sheen' : 'none';
}

export const PROFILE_CARD_LEVEL_NAME_RU: Record<ProfileCardLevel, string> = {
  0: 'Стандарт',
  1: 'Phraseman Pro',
};

export type ProfileCardSellingText = {
  ru: string;
  uk: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
};

export type ProfileCardSellingPoint = { text: ProfileCardSellingText; isNew: boolean };

export function sellingPointText(point: ProfileCardSellingPoint, lang: string): string {
  const byLang = (point.text as Record<string, string>)[lang];
  return byLang || point.text.ru;
}

export const PROFILE_CARD_SELLING_POINTS: Record<ProfileCardLevel, ProfileCardSellingPoint[]> = {
  0: [
    { isNew: false, text: {
      ru: 'Базовая карточка профиля',
      uk: 'Базова картка профілю',
      es: 'Tarjeta de perfil base',
      'pt-BR': 'Cartão de perfil básico',
      vi: 'Thẻ hồ sơ cơ bản',
      id: 'Kartu profil dasar',
      tr: 'Temel profil kartı',
      pl: 'Podstawowa karta profilu',
    } },
    { isNew: false, text: {
      ru: 'Видна в профиле и списках',
      uk: 'Видно в профілі та списках',
      es: 'Visible en el perfil y las listas',
      'pt-BR': 'Visível no perfil e nas listas',
      vi: 'Hiển thị trong hồ sơ và danh sách',
      id: 'Terlihat di profil dan daftar',
      tr: 'Profilde ve listelerde görünür',
      pl: 'Widoczna w profilu i listach',
    } },
  ],
  1: [
    { isNew: true, text: {
      ru: 'Премиальный Pro-кант и мягкий световой проход по карточке',
      uk: 'Преміальний Pro-кант і м’який світловий прохід по картці',
      es: 'Borde Pro premium y brillo suave en la tarjeta',
      'pt-BR': 'Borda Pro premium e brilho suave no cartão',
      vi: 'Viền Pro cao cấp và ánh sáng lướt nhẹ trên thẻ',
      id: 'Tepi Pro premium dan kilau lembut di kartu',
      tr: 'Premium Pro kenar ve kartta yumuşak ışık geçişi',
      pl: 'Premium krawędź Pro i delikatny błysk karty',
    } },
    { isNew: true, text: {
      ru: 'Бейдж Phraseman Pro рядом с именем в друзьях, арене и клубе',
      uk: 'Бейдж Phraseman Pro біля імені в друзях, арені та клубі',
      es: 'Insignia Phraseman Pro junto a tu nombre en amigos, arena y club',
      'pt-BR': 'Selo Phraseman Pro ao lado do nome em amigos, arena e clube',
      vi: 'Huy hiệu Phraseman Pro cạnh tên trong bạn bè, đấu trường và câu lạc bộ',
      id: 'Lencana Phraseman Pro di samping nama di teman, arena, dan klub',
      tr: 'Arkadaşlar, arena ve kulüpte adının yanında Phraseman Pro rozeti',
      pl: 'Odznaka Phraseman Pro przy imieniu w znajomych, arenie i klubie',
    } },
    { isNew: true, text: {
      ru: '3 публичные метрики на карточке вместо 2: лига, XP и серия',
      uk: '3 публічні метрики на картці замість 2: ліга, XP і серія',
      es: '3 métricas públicas en la tarjeta en vez de 2: liga, XP y racha',
      'pt-BR': '3 métricas públicas no cartão em vez de 2: liga, XP e sequência',
      vi: '3 chỉ số công khai trên thẻ thay vì 2: giải đấu, XP và chuỗi ngày',
      id: '3 metrik publik di kartu, bukan 2: liga, XP, dan rentetan',
      tr: 'Kartta 2 yerine 3 herkese açık metrik: lig, XP ve seri',
      pl: '3 publiczne metryki na karcie zamiast 2: liga, XP i seria',
    } },
  ],
};

export async function getProfileCardLevel(): Promise<ProfileCardLevel> {
  try {
    return normalizeProfileCardLevel(await AsyncStorage.getItem(PROFILE_CARD_LEVEL_KEY));
  } catch {
    return 0;
  }
}

export function normalizeProfileCardTheme(value: unknown): ProfileCardTheme {
  return value === 'gold' ? 'gold' : 'classic';
}

export function normalizeProfileCardMotion(_value: unknown): ProfileCardMotion {
  return 'none';
}

export function normalizeProfileCardPublicFocus(_value: unknown): ProfileCardPublicFocus {
  return 'balanced';
}

export async function getProfileCardSnapshot(): Promise<ProfileCardSnapshot> {
  try {
    const [[, rawLevel], , [, rawMotion], [, rawFocus]] = await AsyncStorage.multiGet([
      PROFILE_CARD_LEVEL_KEY,
      PROFILE_CARD_THEME_KEY,
      PROFILE_CARD_MOTION_KEY,
      PROFILE_CARD_PUBLIC_FOCUS_KEY,
    ]);
    const level = normalizeProfileCardLevel(rawLevel);
    return {
      level,
      theme: level >= 1 ? 'gold' : 'classic',
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

async function applyProfileCardLevelLocally(next: ProfileCardLevel): Promise<void> {
  const theme: ProfileCardTheme = next >= 1 ? 'gold' : 'classic';
  await AsyncStorage.multiSet([
    [PROFILE_CARD_LEVEL_KEY, String(next)],
    [PROFILE_CARD_THEME_KEY, theme],
    [PROFILE_CARD_MOTION_KEY, 'none'],
    [PROFILE_CARD_PUBLIC_FOCUS_KEY, 'balanced'],
  ]);
}

type ProfileCardUpgradeCloudResult =
  | { ok: true; alreadyApplied: boolean; level: number; balance: number; spent: number }
  | { ok: false; reason: 'max' | 'insufficient'; level: number; balance: number; cost?: number };

async function upgradeProfileCardLevelOnCloud(
  expectedLevel: ProfileCardLevel,
): Promise<ProfileCardUpgradeCloudResult | 'cloud_disabled' | 'cloud_error'> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return 'cloud_disabled';
  try {
    const { getCanonicalUserId } = require('./user_id_policy');
    const stableId = await getCanonicalUserId();
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
    const { getApp } = require('@react-native-firebase/app');
    const callCf = httpsCallable(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'profileCardUpgrade',
    ) as (data: { expectedLevel: number; stableId?: string }) => Promise<{ data: ProfileCardUpgradeCloudResult }>;
    const res = await callCf({ expectedLevel, ...(stableId ? { stableId } : {}) });
    if (!res?.data) return 'cloud_error';
    return res.data;
  } catch {
    return 'cloud_error';
  }
}

async function reconcileShardsToCloudBeforeUpgrade(): Promise<void> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
  try {
    await forceSyncShardsToCloud();
  } catch { /* best-effort; upgrade still validates server-side */ }
}

function emitProfileCardUpgraded(balance: number): void {
  emitAppEvent('shards_balance_updated', { balance, op: 'spend', reason: 'profile_card_upgrade' });
  emitAppEvent('xp_changed');
}

export async function upgradeProfileCardLevel(): Promise<
  | { ok: true; level: ProfileCardLevel; balance: number }
  | { ok: false; reason: 'max' | 'insufficient' | 'spend_failed' | 'cloud_error'; need?: number; balance?: number }
> {
  const current = await getProfileCardLevel();
  const next = getNextProfileCardLevel(current);
  if (next === null) return { ok: false, reason: 'max' };

  const def = getProfileCardLevelDef(next);
  await reconcileShardsToCloudBeforeUpgrade();

  const cloud = await upgradeProfileCardLevelOnCloud(current);

  if (cloud === 'cloud_error') {
    return { ok: false, reason: 'cloud_error' };
  }

  if (cloud !== 'cloud_disabled') {
    if (cloud.ok === true) {
      const grantedLevel = normalizeProfileCardLevel(cloud.level);
      try {
        await applyProfileCardLevelLocally(grantedLevel);
      } catch { /* mirror only; cloud is authoritative */ }
      emitProfileCardUpgraded(cloud.balance);
      return { ok: true, level: grantedLevel, balance: cloud.balance };
    }
    if (cloud.ok === false) {
      if (cloud.reason === 'max') return { ok: false, reason: 'max' };
      const cost = cloud.cost ?? def.cost;
      return { ok: false, reason: 'insufficient', need: Math.max(0, cost - cloud.balance), balance: cloud.balance };
    }
    return { ok: false, reason: 'cloud_error' };
  }

  const balance = await getShardsBalance();
  if (balance < def.cost) {
    return { ok: false, reason: 'insufficient', need: def.cost - balance, balance };
  }

  const ok = await spendShards(def.cost, 'profile_card_upgrade');
  if (!ok) return { ok: false, reason: 'spend_failed', balance };

  await applyProfileCardLevelLocally(next);
  const updatedBalance = await getShardsBalance();
  emitProfileCardUpgraded(updatedBalance);
  return { ok: true, level: next, balance: updatedBalance };
}

export function profileCardLevelRoman(level: ProfileCardLevel): string {
  return level >= 1 ? 'I' : '0';
}

export async function devGrantProfileCardLevel(): Promise<ProfileCardSnapshot> {
  if (!__DEV__) return getProfileCardSnapshot();
  const current = await getProfileCardLevel();
  const next = getNextProfileCardLevel(current);
  if (next === null) return getProfileCardSnapshot();
  await applyProfileCardLevelLocally(next);
  emitAppEvent('xp_changed');
  return getProfileCardSnapshot();
}

export async function devResetProfileCard(): Promise<ProfileCardSnapshot> {
  if (!__DEV__) return getProfileCardSnapshot();
  await applyProfileCardLevelLocally(0);
  emitAppEvent('xp_changed');
  return getProfileCardSnapshot();
}

export type ProfileCardThemeColors = {
  accent: string;
  accentSoft: string;
  accentStrong: string;
  secondary: string;
  shadowColor: string;
};

export const PROFILE_CARD_THEME_COLORS: Record<ProfileCardTheme, ProfileCardThemeColors> = {
  classic: {
    accent: '#94A3B8',
    accentSoft: 'rgba(148,163,184,0.14)',
    accentStrong: 'rgba(148,163,184,0.38)',
    secondary: '#CBD5E1',
    shadowColor: '#000000',
  },
  gold: {
    accent: '#FACC15',
    accentSoft: 'rgba(250,204,21,0.16)',
    accentStrong: 'rgba(250,204,21,0.48)',
    secondary: '#FFF2A8',
    shadowColor: '#FACC15',
  },
};

export function resolveProfileCardDisplay(input: {
  level?: unknown;
  theme?: unknown;
}): { level: ProfileCardLevel; theme: ProfileCardTheme; colors: ProfileCardThemeColors } {
  const level = normalizeProfileCardLevel(input.level);
  const theme: ProfileCardTheme = level >= 1 ? 'gold' : 'classic';
  return { level, theme, colors: PROFILE_CARD_THEME_COLORS[theme] };
}
