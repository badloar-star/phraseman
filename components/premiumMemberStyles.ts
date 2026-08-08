import type { TextStyle } from 'react-native';

/** Gold for premium usernames in lists (hall of fame, clubs, etc.) */
export const PREMIUM_MEMBER_NAME_GOLD = '#E8C547';
export const PREMIUM_MEMBER_NAME_GOLD_SKETCH = '#A9781E';
export const PREMIUM_MEMBER_NAME_GOLD_LIGHT_CARD = '#6F4A00';

export function premiumMemberNameStyle(
  base: TextStyle,
  isPremium: boolean,
  themeMode?: string,
): TextStyle {
  if (!isPremium) return base;
  const isSketch = false;
  return {
    ...base,
    color: isSketch ? PREMIUM_MEMBER_NAME_GOLD_SKETCH : PREMIUM_MEMBER_NAME_GOLD,
    textShadowColor: isSketch ? 'transparent' : 'rgba(232, 197, 71, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: isSketch ? 0 : 5,
  };
}

export function memberNameStatusStyle(
  base: TextStyle,
  opts: { isPremium?: boolean; isVip?: boolean; themeMode?: string },
): TextStyle {
  if (opts.isPremium || opts.isVip) return premiumMemberNameStyle(base, true, opts.themeMode);
  return base;
}
