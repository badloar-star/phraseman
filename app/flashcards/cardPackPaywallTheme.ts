import type { GlassTokens } from "../../constants/liquidGlassThemePalette";
import { cardPackPaywallShellFromTokens } from "./cardPackPaywallTokenTheme";
import type { FlashcardMarketPack } from "./marketplace";

/**
 * Оболочка окна покупки набора: цвета подложки, ореола, рамок, плашки цены и кнопок.
 *
 * зачем (координатор 12.10, R1_LIGHT_THEME_LITERALS / R1_THEMEMODE_LEGACY_MAP): здесь жила таблица цветов по прежним id тем (`ThemeMode`),
 * 65 литералов hex/rgba. ThemeContext всегда отдаёт themeMode='dark', поэтому человек на ЛЮБОЙ теме видел одну зелёную оболочку, а светлая
 * тема и оттенки ползунка в окне не отражались. Оба вызова теперь передают токены темы Liquid Glass, таблица стала недостижимой и удалена:
 * оболочка строится только из токенов (`cardPackPaywallTokenTheme.ts`, контраст проверен tests/card_pack_paywall_token_shell_contrast.test.ts).
 * Категория набора и цвет карточек UGC оболочку не красят — окно следует теме.
 */
export type CardPackPaywallTheme = {
  backdropBase: string;
  outerGlow: readonly [string, string, string];
  borderAccent: string;
  handleColorLight: string;
  handleColorDark: string;
  iconBg: readonly [string, string];
  iconBorder: string;
  priceBorder: string;
  priceGradient: readonly [string, string];
  /** Если фон `priceGradient` тёмный, контрастный текст; иначе текст берётся из ThemeContext в модалке. Токен-оболочка не задаёт (текст темы). */
  priceTextOnCard?: { label: string; value: string; unit: string };
  ctaColors: readonly [string, string];
  ctaForeground: string;
  ctaGlowTop: string;
  goShopCta: readonly [string, string];
  goShopForeground: string;
};

/** Оболочка окна покупки обычного набора — из токенов активной темы. */
export function getCardPackPaywallTheme(
  _pack: FlashcardMarketPack,
  opts: { tokens: GlassTokens },
): CardPackPaywallTheme {
  return cardPackPaywallShellFromTokens(opts.tokens);
}

/** Оболочка окна покупки UGC-набора — тоже из токенов темы (ключ палитры карточек автора окно не красит). */
export function getCommunityUgcPackPaywallTheme(
  _themeKey: string | undefined,
  opts: { tokens: GlassTokens },
): CardPackPaywallTheme {
  return cardPackPaywallShellFromTokens(opts.tokens);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
