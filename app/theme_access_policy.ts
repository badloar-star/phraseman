import type { ThemeMode } from '../constants/theme';

// зачем (владелец 2026-08-24): темы перестроены на три ясных полки.
//   • 'free'     — «Индиго» и «Нефрит», витрина без замка;
//   • 'plus'     — «Олива», единственная тема, которую открывает подписка;
//   • 'shards'   — все остальные: покупка за жемчуг, ПОДПИСКА ИХ НЕ ОТКРЫВАЕТ
//                  (прямое требование владельца — тема остаётся целью для
//                  внутренней валюты, иначе жемчуг обесценивается);
//   • 'reward'   — «Золото», только награда лиги, за жемчуг не продаётся.
// Купленные и «дедушкины» темы живут отдельно (см. ThemeContext): полка
// описывает, КАК тему получить впервые, а не что уже есть у человека.
export type ThemeAccessTier = 'free' | 'plus' | 'shards' | 'reward' | 'unavailable';

export const SELECTABLE_THEME_MODES = [
  'indigo',
  'sagePorcelain',
  'olive',
  'midnight',
  'ember',
  'aurora',
  'volt',
  'dark',
  'gold',
] as const satisfies readonly ThemeMode[];

export type SelectableThemeMode = typeof SELECTABLE_THEME_MODES[number];

/** Цена темы в жемчуге. Одна на все покупаемые темы — решение владельца. */
export const THEME_PRICE_SHARDS = 200;

const THEME_ACCESS_BY_MODE: Record<SelectableThemeMode, Exclude<ThemeAccessTier, 'unavailable'>> = {
  indigo: 'free',
  sagePorcelain: 'free',
  olive: 'plus',
  midnight: 'shards',
  ember: 'shards',
  aurora: 'shards',
  volt: 'shards',
  dark: 'shards',
  gold: 'reward',
};

export function isSelectableThemeMode(themeMode: unknown): themeMode is SelectableThemeMode {
  return typeof themeMode === 'string'
    && Object.prototype.hasOwnProperty.call(THEME_ACCESS_BY_MODE, themeMode);
}

export function themeAccessTier(themeMode: unknown): ThemeAccessTier {
  return isSelectableThemeMode(themeMode) ? THEME_ACCESS_BY_MODE[themeMode] : 'unavailable';
}

export function isThemePlusOnly(themeMode: unknown): boolean {
  return themeAccessTier(themeMode) === 'plus';
}

export function isThemeRewardOnly(themeMode: unknown): boolean {
  return themeAccessTier(themeMode) === 'reward';
}

/** Тема покупается за жемчуг. Подписка её НЕ открывает — только покупка. */
export function isThemeShardPurchasable(themeMode: unknown): boolean {
  return themeAccessTier(themeMode) === 'shards';
}

/** Цена конкретной темы; 0 — тема не продаётся за жемчуг. */
export function themePriceShards(themeMode: unknown): number {
  return isThemeShardPurchasable(themeMode) ? THEME_PRICE_SHARDS : 0;
}

/**
 * Единственная точка правды «доступна ли тема этому человеку».
 * Порядок веток намеренно такой: сначала то, что человек уже ЗАРАБОТАЛ или
 * КУПИЛ (отнимать нельзя — правило владельца), и только потом полки.
 */
export function isThemeUnlockedFor(
  themeMode: unknown,
  access: {
    hasPremium?: boolean;
    ownedThemeModes?: ReadonlySet<string> | readonly string[];
    isGoldUnlocked?: boolean;
    /** «Дедушки»: темы, которыми человек уже пользовался до смены правил. */
    grandfatheredModes?: ReadonlySet<string> | readonly string[];
    devUnlockAll?: boolean;
  } = {},
): boolean {
  const tier = themeAccessTier(themeMode);
  if (tier === 'unavailable') return false;
  if (tier === 'free') return true;
  if (access.devUnlockAll) return true;

  const mode = String(themeMode);
  const owns = (list: ReadonlySet<string> | readonly string[] | undefined): boolean => {
    if (!list) return false;
    // Array.isArray сужает тип корректно; `instanceof Set` не сужает ReadonlySet.
    return Array.isArray(list) ? list.includes(mode) : (list as ReadonlySet<string>).has(mode);
  };

  // Куплено за жемчуг или сохранено «дедушке» — доступно всегда и навсегда.
  if (owns(access.ownedThemeModes) || owns(access.grandfatheredModes)) return true;

  if (tier === 'reward') return Boolean(access.isGoldUnlocked);
  if (tier === 'plus') return Boolean(access.hasPremium);
  // 'shards': подписка НЕ открывает — только покупка выше.
  return false;
}
