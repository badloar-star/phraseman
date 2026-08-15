import type { TextStyle } from 'react-native';
import { isLightSurface, readableOn } from '../constants/color_contrast';
import { isLightThemeMode, type ThemeMode } from '../constants/theme';

/** Gold for premium usernames in lists (hall of fame, clubs, etc.) */
export const PREMIUM_MEMBER_NAME_GOLD = '#E8C547';
export const PREMIUM_MEMBER_NAME_GOLD_SKETCH = '#A9781E';
/**
 * Тёмное «настоящее» золото для СВЕТЛЫХ поверхностей.
 *
 * зачем 13.08.2026 (репорт владельца: «золотые ники не видно на белом фоне»):
 * лимонный #E8C547 задуман как блик на чёрной карточке — там он даёт 10.9:1.
 * На светлой карточке (#DCE1D8) это 1.26:1, то есть ника фактически нет.
 * Осветлять фон нельзя, а перекрашивать в серый — значит отобрать у Plus
 * видимый статус. Берём глубокое антикварное золото из той же гаммы, что и
 * тёмный градиент ника на главной (GOLD_STOPS_SKETCH в PremiumGoldUserName):
 * тон читается как металл, а не как жёлтый маркер, и держит 5.0–7.7:1 на всех
 * подложках модалки итогов недели.
 */
export const PREMIUM_MEMBER_NAME_GOLD_LIGHT_CARD = '#6F4A00';

/**
 * Тёплый блик под глифом на светлом фоне. Одна тень в RN не даёт настоящего
 * градиента по буквам (для этого есть SVG-вариант PremiumGoldUserName, но
 * 29 SVG на список — это лишние измерения и потерянный numberOfLines), зато
 * светлое шампанское под тёмным золотом читается как отблеск на металле.
 */
const LIGHT_CARD_SHEEN = 'rgba(246,227,161,0.85)';

export function premiumMemberNameStyle(
  base: TextStyle,
  isPremium: boolean,
  themeMode?: string,
  /**
   * Цвет поверхности под ником. Если передан — светлость определяется по его
   * реальной яркости (надёжнее имени темы: businessLight в isLightThemeMode
   * не входит). Без него падаем на проверку по теме — как было раньше.
   */
  surface?: string,
): TextStyle {
  if (!isPremium) return base;

  const onLight = surface
    ? isLightSurface(surface)
    : isLightThemeMode((themeMode ?? 'dark') as ThemeMode);

  if (!onLight) {
    return {
      ...base,
      color: PREMIUM_MEMBER_NAME_GOLD,
      textShadowColor: 'rgba(232, 197, 71, 0.45)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 5,
    };
  }

  return {
    ...base,
    // Страховка на случай нестандартной светлой поверхности: если и глубокого
    // золота не хватит, цвет дотемнится до нормы WCAG AA, сохранив оттенок.
    color: surface
      ? readableOn(PREMIUM_MEMBER_NAME_GOLD_LIGHT_CARD, surface, 4.5)
      : PREMIUM_MEMBER_NAME_GOLD_LIGHT_CARD,
    textShadowColor: LIGHT_CARD_SHEEN,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  };
}

export function memberNameStatusStyle(
  base: TextStyle,
  opts: { isPremium?: boolean; isVip?: boolean; themeMode?: string; surface?: string },
): TextStyle {
  if (opts.isPremium || opts.isVip) {
    return premiumMemberNameStyle(base, true, opts.themeMode, opts.surface);
  }
  return base;
}
