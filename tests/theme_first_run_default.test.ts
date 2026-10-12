// зачем (координатор 12.10, DEFAULT_THEME_OPTIONS_R1): метка первого запуска — тема по умолчанию меняется ТОЛЬКО для новых.
// Сейчас конфиг = встроенный дефолт («Графит / Спокойно»): поведение приложения прежнее, ключи новичку не пишутся.
import fs from 'node:fs';
import path from 'node:path';

import {
  BUILTIN_DEFAULT_THEME,
  NEW_USER_DEFAULT_THEME,
  decideFirstRunTheme,
} from '../app/theme_first_run_default';

const AURORA_MAX = { themeId: 'grad_aurora', intensity: 1 };
const empty = { storedThemeId: null, storedIntensity: null, storedLevel: null };

describe('тема по умолчанию для новых (метка первого запуска)', () => {
  it('сейчас конфиг = встроенный дефолт → поведение прежнее (новичку ничего не пишется)', () => {
    expect(NEW_USER_DEFAULT_THEME).toEqual(BUILTIN_DEFAULT_THEME);
    const decision = decideFirstRunTheme({ ...empty, onboardingDone: null });
    expect(decision).toMatchObject({ kind: 'new_user', apply: false });
    expect(decision.reason).toContain('config_equals_builtin');
  });

  it('новичок (нет ключей темы, онбординг не пройден) → тема из конфига применяется и пишется', () => {
    expect(decideFirstRunTheme({ ...empty, onboardingDone: null }, AURORA_MAX))
      .toMatchObject({ kind: 'new_user', apply: true, themeId: 'grad_aurora', intensity: 1 });
  });

  it('старый без ключей (онбординг пройден) → не трогаем, даже если конфиг — Аврора', () => {
    expect(decideFirstRunTheme({ ...empty, onboardingDone: '1' }, AURORA_MAX))
      .toEqual({ kind: 'existing_user_kept', reason: 'no_theme_keys_but_onboarding_done', apply: false });
  });

  it('старый с выбранной темой или ползунком → его выбор', () => {
    expect(decideFirstRunTheme({ ...empty, storedThemeId: 'rose', onboardingDone: '1' }, AURORA_MAX))
      .toMatchObject({ kind: 'stored_choice', apply: false, reason: 'stored:theme' });
    expect(decideFirstRunTheme({ ...empty, storedIntensity: '0.5', onboardingDone: null }, AURORA_MAX))
      .toMatchObject({ kind: 'stored_choice', reason: 'stored:intensity' });
    expect(decideFirstRunTheme({ ...empty, storedLevel: 'max', onboardingDone: null }, AURORA_MAX))
      .toMatchObject({ kind: 'stored_choice', reason: 'stored:level' });
  });

  it('брошенный онбординг (ключей нет, онбординг не завершён) → считается новичком', () => {
    expect(decideFirstRunTheme({ ...empty, onboardingDone: '0' }, AURORA_MAX))
      .toMatchObject({ kind: 'new_user', apply: true });
  });

  it('новый телефон того же аккаунта: тема не синхронизируется — решает, успел ли восстановиться onboarding_done', () => {
    // восстановление аккаунта уже записало onboarding_done → прежний дефолт (как раньше для любого выбора темы)
    expect(decideFirstRunTheme({ ...empty, onboardingDone: '1' }, AURORA_MAX)).toMatchObject({ kind: 'existing_user_kept' });
    // ещё не восстановлен → новый телефон получает тему новичка (выбор темы и раньше не переносился между телефонами)
    expect(decideFirstRunTheme({ ...empty, onboardingDone: null }, AURORA_MAX)).toMatchObject({ kind: 'new_user', apply: true });
  });

  it('ThemeContext: onboarding_done читается в ТОМ ЖЕ multiGet (без лишнего ожидания до кадра), лог [THEME-DEFAULT]', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'ThemeContext.tsx'), 'utf8');
    expect(src).toContain("AsyncStorage.multiGet([THEME_STORAGE_KEY, COLOR_LEVEL_STORAGE_KEY, APPEARANCE_STORAGE_KEY, INTENSITY_STORAGE_KEY, 'onboarding_done'])");
    expect(src).toContain('decideFirstRunTheme({');
    expect(src).toContain('[THEME-DEFAULT]');
    expect(src.match(/AsyncStorage\.getItem\('onboarding_done'\)/g)).toBeNull();
  });
});
