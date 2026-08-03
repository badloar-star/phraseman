// ════════════════════════════════════════════════════════════════════════════
// season_cosmetics.ts — владение статусными наградами Season Pass (навсегда):
// рамка, цвет ника, перелив ника, титулы, стадии ауры, секретная аура.
// зачем: владелец, 2026-08-03 — «каждый подарок обязан быть рабочим»: статус
// без записи владения = пустая модалка. Ключ синкается в облако (SYNC_KEYS в
// cloud_sync.ts), чтобы косметика переезжала на новое устройство.
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';

export const SEASON_COSMETICS_KEY = 'season_cosmetics_v1';

/** Фирменный цвет сезона 1 — един во всех темах (узнаваемость, опросник в.23а). */
export const SEASON1_NICK_COLOR = '#57C8DE';
export const SEASON1_FRAME_ID = 'season1_frame';
export const SEASON1_TITLE = 'Сезон 1';
export const SEASON1_FINALE_TITLE = 'Финал сезона 1';

export interface SeasonCosmeticsState {
  frames: string[];
  nickColors: string[];
  /** Активный цвет ника (юзер может снять/надеть в будущем UI кастомизации). */
  activeNickColor: string | null;
  nickShimmer: boolean;
  titles: string[];
  auraStages: number[];      // 1..4
  secretAuras: string[];     // 'purple_vortex'
  customAvatarGrants: number;
}

const EMPTY: SeasonCosmeticsState = {
  frames: [], nickColors: [], activeNickColor: null, nickShimmer: false,
  titles: [], auraStages: [], secretAuras: [], customAvatarGrants: 0,
};

let cache: SeasonCosmeticsState | null = null;

function normalize(raw: unknown): SeasonCosmeticsState {
  if (!raw || typeof raw !== 'object') return { ...EMPTY };
  const r = raw as Partial<SeasonCosmeticsState>;
  return {
    frames: Array.isArray(r.frames) ? r.frames.filter((x): x is string => typeof x === 'string') : [],
    nickColors: Array.isArray(r.nickColors) ? r.nickColors.filter((x): x is string => typeof x === 'string') : [],
    activeNickColor: typeof r.activeNickColor === 'string' ? r.activeNickColor : null,
    nickShimmer: r.nickShimmer === true,
    titles: Array.isArray(r.titles) ? r.titles.filter((x): x is string => typeof x === 'string') : [],
    auraStages: Array.isArray(r.auraStages) ? r.auraStages.filter((x): x is number => Number.isInteger(x)) : [],
    secretAuras: Array.isArray(r.secretAuras) ? r.secretAuras.filter((x): x is string => typeof x === 'string') : [],
    customAvatarGrants: Number.isInteger(r.customAvatarGrants) ? Math.max(0, r.customAvatarGrants as number) : 0,
  };
}

export function peekSeasonCosmetics(): SeasonCosmeticsState {
  return cache ?? { ...EMPTY };
}

export async function loadSeasonCosmetics(): Promise<SeasonCosmeticsState> {
  try {
    const raw = await AsyncStorage.getItem(SEASON_COSMETICS_KEY);
    cache = normalize(raw ? JSON.parse(raw) : null);
  } catch {
    cache = cache ?? { ...EMPTY };
  }
  return cache;
}

async function mutate(fn: (s: SeasonCosmeticsState) => SeasonCosmeticsState): Promise<SeasonCosmeticsState> {
  const current = await loadSeasonCosmetics();
  const next = fn(current);
  cache = next;
  try {
    await AsyncStorage.setItem(SEASON_COSMETICS_KEY, JSON.stringify(next));
  } catch { /* best effort — кэш уже обновлён, диск догонит */ }
  emitAppEvent('season_cosmetics_changed', undefined);
  return next;
}

const addUnique = (list: string[], v: string): string[] => (list.includes(v) ? list : [...list, v]);

export const grantSeasonFrame = (id: string = SEASON1_FRAME_ID) =>
  mutate((s) => ({ ...s, frames: addUnique(s.frames, id) }));

export const grantSeasonNickColor = (color: string = SEASON1_NICK_COLOR) =>
  mutate((s) => ({ ...s, nickColors: addUnique(s.nickColors, color), activeNickColor: s.activeNickColor ?? color }));

export const grantSeasonTitle = (title: string) =>
  mutate((s) => ({ ...s, titles: addUnique(s.titles, title) }));

export const grantSeasonAuraStage = (stage: number) =>
  mutate((s) => ({ ...s, auraStages: s.auraStages.includes(stage) ? s.auraStages : [...s.auraStages, stage].sort((a, b) => a - b) }));

export const grantSeasonSecretAura = (id: string = 'purple_vortex') =>
  mutate((s) => ({ ...s, secretAuras: addUnique(s.secretAuras, id) }));

export const grantSeasonFinale = () =>
  mutate((s) => ({
    ...s,
    nickShimmer: true,
    titles: addUnique(s.titles, SEASON1_FINALE_TITLE),
    auraStages: s.auraStages.includes(4) ? s.auraStages : [...s.auraStages, 4].sort((a, b) => a - b),
  }));

export const bumpSeasonCustomAvatarGrant = () =>
  mutate((s) => ({ ...s, customAvatarGrants: s.customAvatarGrants + 1 }));
