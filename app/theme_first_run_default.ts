// ═════════════════════════════════════════════════════════════════════
// theme_first_run_default.ts — тема по умолчанию ТОЛЬКО для новых пользователей (метка первого запуска).
//
// зачем (координатор 12.10, DEFAULT_THEME_OPTIONS_R1): выбор темы хранится лишь на телефоне, и ключи пишутся только при ручной
// смене — у большинства старых пользователей ключей нет. Поэтому смена встроенного дефолта перекрасила бы и их. Здесь — решение
// «кто новичок»: ключей темы нет И онбординг не пройден → новичок, ему тема из NEW_USER_DEFAULT_THEME; ключей нет, но онбординг
// пройден → старый, ничего не меняем; ключи есть → выбор человека. Firebase 0: читаем то же, что ThemeContext уже читает одним multiGet.
// СЕЙЧАС константа равна прежнему поведению («Графит / Спокойно») — приложение ведёт себя как раньше; после «да» владельца
// меняется одна строка (DEFAULT_THEME_OPTIONS_R1.md, раздел «После да»).
// ═════════════════════════════════════════════════════════════════════

/**
 * зачем (владелец 13.10 10:05, вопрос 3): новому человеку тема по умолчанию — «как на телефоне»: системный светлый → «Сумерки» (ink),
 * системный тёмный → «Океан» (marine), насыщенность 1. Пока он сам не выбрал тему/оформление/насыщенность, пара следует за системным
 * режимом (без перезапуска и мигания); первый же выбор замораживает текущую пару как его выбор навсегда.
 */
export const NEW_USER_SYSTEM_PAIR: Readonly<{ light: string; dark: string; intensity: number }> = Object.freeze({ light: 'ink', dark: 'marine', intensity: 1 });

/** Метка «этот человек — новичок, тема ещё следует за системой». Пишется один раз при первом запуске; снимается первым выбором. */
export const FOLLOW_SYSTEM_MARKER_KEY = 'theme_default_follow_system_v1';

export type SystemDefaultTheme = Readonly<{ themeId: string; appearance: 'light' | 'dark'; intensity: number }>;

/** Тема новичка по системному режиму; неизвестный/пустой режим → тёмный («Океан»). */
export function pickSystemDefaultTheme(scheme: string | null | undefined): SystemDefaultTheme {
  const light = scheme === 'light';
  return { themeId: light ? NEW_USER_SYSTEM_PAIR.light : NEW_USER_SYSTEM_PAIR.dark, appearance: light ? 'light' : 'dark', intensity: NEW_USER_SYSTEM_PAIR.intensity };
}

/** Тема для новых пользователей (тёмное зерно; реальную пару по системному режиму даёт pickSystemDefaultTheme). */
export const NEW_USER_DEFAULT_THEME: Readonly<{ themeId: string; intensity: number }> = Object.freeze({ themeId: NEW_USER_SYSTEM_PAIR.dark, intensity: NEW_USER_SYSTEM_PAIR.intensity });

/** Встроенный дефолт приложения (resolveLiquidGlassTheme(null) / migrateStoredLiquidGlassIntensity без ключей). */
export const BUILTIN_DEFAULT_THEME: Readonly<{ themeId: string; intensity: number }> = Object.freeze({ themeId: 'graphite', intensity: 0 });

export type FirstRunThemeInput = Readonly<{
  storedThemeId: string | null;
  storedIntensity: string | null;
  storedLevel: string | null;
  onboardingDone: string | null;
  /** Значение FOLLOW_SYSTEM_MARKER_KEY; '1' — новичок, пара ещё следует за системой. */
  followSystemMarker?: string | null;
}>;

export type FirstRunThemeDecision =
  | Readonly<{ kind: 'stored_choice'; reason: string; apply: false }>
  | Readonly<{ kind: 'existing_user_kept'; reason: string; apply: false }>
  | Readonly<{ kind: 'new_user'; reason: string; apply: boolean; themeId: string; intensity: number }>;

function present(value: string | null): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Чистое решение по одному чтению хранилища. `apply=true` — новичку надо применить и записать тему из конфига;
 * `apply=false` у новичка — конфиг совпадает со встроенным дефолтом: ничего не пишем (ключи остаются пустыми, как раньше).
 */
export function decideFirstRunTheme(
  input: FirstRunThemeInput,
  config: Readonly<{ themeId: string; intensity: number }> = NEW_USER_DEFAULT_THEME,
): FirstRunThemeDecision {
  const storedKeys = [
    present(input.storedThemeId) ? 'theme' : null,
    present(input.storedIntensity) ? 'intensity' : null,
    present(input.storedLevel) ? 'level' : null,
  ].filter(Boolean);
  if (storedKeys.length > 0) {
    return { kind: 'stored_choice', reason: `stored:${storedKeys.join('+')}`, apply: false };
  }
  if (input.followSystemMarker === '1') {
    return { kind: 'new_user', reason: 'follow_system_marker', apply: true, themeId: config.themeId, intensity: config.intensity };
  }
  if (input.onboardingDone === '1') {
    return { kind: 'existing_user_kept', reason: 'no_theme_keys_but_onboarding_done', apply: false };
  }
  const differsFromBuiltin = config.themeId !== BUILTIN_DEFAULT_THEME.themeId || config.intensity !== BUILTIN_DEFAULT_THEME.intensity;
  return {
    kind: 'new_user',
    reason: `no_theme_keys_onboarding=${input.onboardingDone ?? 'null'}${differsFromBuiltin ? '' : ':config_equals_builtin'}`,
    apply: differsFromBuiltin,
    themeId: config.themeId,
    intensity: config.intensity,
  };
}
