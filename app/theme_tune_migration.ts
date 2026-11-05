// ═══════════════════════════════════════════════════════════════════════════
// theme_tune_migration.ts — при включении флага theme_sliders_v1 прежняя тема человека становится настроенной (tune:H:S).
//
// зачем (слово владельца через координатора 05.11): «кто уже менял тему — ближайшие оттенок и насыщенность, вид не прыгает; остальным — стандарт;
// прогресс и покупки не трогать». Чистая функция: ничего не пишет и не покупает — решение id для ThemeContext; запись в хранилище делает он сам.
// Нейтральный акцент (графит): оттенок берётся стандартный, насыщенность близка к нулю — серый вид остаётся серым.
// Журнал [THEME-SLIDERS]: что было, что стало, почему.
// ═══════════════════════════════════════════════════════════════════════════
import { liquidGlassTokens, type LiquidGlassAppearance } from '../constants/liquidGlassThemePalette';
import { THEME_SLIDERS_V1_ENABLED } from '../constants/theme_sliders_flag';
import { THEME_TUNE_CMAX, THEME_TUNE_STANDARD, oklchOfHex, parseThemeTuneId, themeTuneFromAccentOklch, themeTuneId } from '../constants/theme_tune';

const LOG = '[THEME-SLIDERS]';
/** Ниже этой цветности акцент считается нейтральным: оттенок не определён, берём стандартный. */
const NEUTRAL_CHROMA = 0.012;

export type ThemeTuneMigration = Readonly<{ id: string; migrated: boolean; reason: 'flag_off' | 'already_tune' | 'new_user_standard' | 'nearest_of_old_theme' | 'no_accent_standard' }>;

export function migrateThemeIdToTune(input: Readonly<{ resolvedId: string; appearance: LiquidGlassAppearance; isNewUser: boolean }>): ThemeTuneMigration {
  const done = (id: string, migrated: boolean, reason: ThemeTuneMigration['reason']): ThemeTuneMigration => {
    console.log(LOG, 'migrate', JSON.stringify({ from: input.resolvedId, to: id, migrated, reason, appearance: input.appearance, isNewUser: input.isNewUser })); // guard-ok: одна строка на старт
    return { id, migrated, reason };
  };
  if (!THEME_SLIDERS_V1_ENABLED) return { id: input.resolvedId, migrated: false, reason: 'flag_off' };
  if (parseThemeTuneId(input.resolvedId)) return done(input.resolvedId, false, 'already_tune');
  if (input.isNewUser) return done(themeTuneId(THEME_TUNE_STANDARD), true, 'new_user_standard');
  const accent = oklchOfHex(liquidGlassTokens(input.resolvedId, { level: 'max', appearance: input.appearance }).accent); // light-accent-ok: из акцента старой темы берутся только оттенок и цветность для ближайших H/S
  if (!accent) return done(themeTuneId(THEME_TUNE_STANDARD), true, 'no_accent_standard');
  if (accent.C < NEUTRAL_CHROMA) return done(themeTuneId({ H: THEME_TUNE_STANDARD.H, S: Math.round((accent.C / THEME_TUNE_CMAX) * 100) }), true, 'nearest_of_old_theme');
  return done(themeTuneId(themeTuneFromAccentOklch({ C: accent.C, H: accent.H })), true, 'nearest_of_old_theme');
}
