// ════════════════════════════════════════════════════════════════════════════
// season_cosmetics.ts — владение статусными наградами Season Pass (навсегда):
// рамка, цвет ника, перелив ника, титулы, стадии ауры, секретная аура.
// зачем: владелец, 2026-08-03 — «каждый подарок обязан быть рабочим»: статус
// без записи владения = пустая модалка. Ключ синкается в облако (SYNC_KEYS в
// cloud_sync.ts), чтобы косметика переезжала на новое устройство.
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AVATAR_AURA_OWNED_KEY,
  SEASON_AVATAR_AURA_IDS,
  USER_AVATAR_AURA_KEY,
} from '../constants/avatar_auras';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { emitAppEvent } from './events';
import { SEASON1_FRAME_ID, seasonAuraIdForStage } from './season_cosmetics_model';
import { withStorageLock } from './storage_mutex';

export { SEASON1_FRAME_ID, seasonAuraIdForStage } from './season_cosmetics_model';

export const SEASON_COSMETICS_KEY = 'season_cosmetics_v1';

/** Фирменный цвет сезона 1 — един во всех темах (узнаваемость, опросник в.23а). */
export const SEASON1_NICK_COLOR = '#57C8DE';
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

type SeasonCosmeticsMutationOptions = Readonly<{
  activateAuraId?: typeof SEASON_AVATAR_AURA_IDS[number];
}>;

const assertCurrentAccount = (token: AccountGenerationToken): void => {
  if (!isCurrentAccountGeneration(token)) {
    throw new Error('season_cosmetics_account_changed');
  }
};

async function mutate(
  fn: (s: SeasonCosmeticsState) => SeasonCosmeticsState,
  options: SeasonCosmeticsMutationOptions = {},
): Promise<SeasonCosmeticsState> {
  const accountToken = captureAccountGeneration();
  const next = await withAccountTransitionLock(() => withStorageLock(async () => {
    assertCurrentAccount(accountToken);
    const raw = await AsyncStorage.getItem(SEASON_COSMETICS_KEY);
    assertCurrentAccount(accountToken);
    let current: SeasonCosmeticsState;
    try {
      current = normalize(raw ? JSON.parse(raw) : null);
    } catch {
      current = { ...EMPTY };
    }
    const updated = normalize(fn(current));
    const pairs: [string, string][] = [
      [SEASON_COSMETICS_KEY, JSON.stringify(updated)],
    ];

    if (options.activateAuraId) {
      const ownedRaw = await AsyncStorage.getItem(AVATAR_AURA_OWNED_KEY);
      assertCurrentAccount(accountToken);
      let owned: Record<string, true> = {};
      try {
        const parsed: unknown = ownedRaw ? JSON.parse(ownedRaw) : {};
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          owned = Object.fromEntries(
            Object.entries(parsed).filter(([id, value]) => id.trim().length > 0 && value === true),
          ) as Record<string, true>;
        }
      } catch {
        owned = {};
      }
      pairs.push(
        [AVATAR_AURA_OWNED_KEY, JSON.stringify({ ...owned, [options.activateAuraId]: true })],
        [USER_AVATAR_AURA_KEY, options.activateAuraId],
      );
    }

    assertCurrentAccount(accountToken);
    await AsyncStorage.multiSet(pairs);
    assertCurrentAccount(accountToken);
    cache = updated;
    return updated;
  }));
  emitAppEvent('season_cosmetics_changed', undefined);
  if (options.activateAuraId) emitAppEvent('xp_changed');
  return next;
}

const addUnique = (list: string[], v: string): string[] => (list.includes(v) ? list : [...list, v]);

export const grantSeasonFrame = (id: string = SEASON1_FRAME_ID) =>
  mutate((s) => ({ ...s, frames: addUnique(s.frames, id) }));

export const grantSeasonNickColor = (color: string = SEASON1_NICK_COLOR) =>
  mutate((s) => ({ ...s, nickColors: addUnique(s.nickColors, color), activeNickColor: s.activeNickColor ?? color }));

export const grantSeasonTitle = (title: string) =>
  mutate((s) => ({ ...s, titles: addUnique(s.titles, title) }));

export async function grantSeasonAuraStage(stage: number): Promise<SeasonCosmeticsState> {
  const normalizedStage = Math.max(1, Math.min(4, Math.round(Number(stage) || 1)));
  return mutate((s) => ({
    ...s,
    auraStages: s.auraStages.includes(normalizedStage)
      ? s.auraStages
      : [...s.auraStages, normalizedStage].sort((a, b) => a - b),
  }), { activateAuraId: seasonAuraIdForStage(normalizedStage) });
}

export async function grantSeasonSecretAura(id: string = 'purple_vortex'): Promise<SeasonCosmeticsState> {
  return mutate(
    (s) => ({ ...s, secretAuras: addUnique(s.secretAuras, id) }),
    { activateAuraId: SEASON_AVATAR_AURA_IDS[4] },
  );
}

export async function grantSeasonFinale(): Promise<SeasonCosmeticsState> {
  return mutate((s) => ({
    ...s,
    nickShimmer: true,
    titles: addUnique(s.titles, SEASON1_FINALE_TITLE),
    auraStages: s.auraStages.includes(4) ? s.auraStages : [...s.auraStages, 4].sort((a, b) => a - b),
  }), { activateAuraId: SEASON_AVATAR_AURA_IDS[3] });
}

export const bumpSeasonCustomAvatarGrant = () =>
  mutate((s) => ({ ...s, customAvatarGrants: s.customAvatarGrants + 1 }));
