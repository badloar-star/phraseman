// зачем (координатор 12.10, DEFAULT_THEME_OPTIONS_R1): метка первого запуска — тема по умолчанию меняется ТОЛЬКО для новых.
// Владелец 13.10 (вопрос 3): новичку «Сумерки» (светлый системный режим) / «Океан» (тёмный), насыщенность 1; пара следует за системой, пока он не выбрал сам.
import fs from 'node:fs';
import path from 'node:path';

import {
  FOLLOW_SYSTEM_MARKER_KEY,
  NEW_USER_DEFAULT_THEME,
  NEW_USER_SYSTEM_PAIR,
  decideFirstRunTheme,
  pickSystemDefaultTheme,
} from '../app/theme_first_run_default';

const AURORA_MAX = { themeId: 'grad_aurora', intensity: 1 };
const empty = { storedThemeId: null, storedIntensity: null, storedLevel: null };

describe('тема по умолчанию для новых (метка первого запуска)', () => {
  it('пара по умолчанию: светлый → ink, тёмный → marine, насыщенность 1; неизвестный режим → тёмный', () => {
    expect(NEW_USER_SYSTEM_PAIR).toEqual({ light: 'ink', dark: 'marine', intensity: 1 });
    expect(pickSystemDefaultTheme('light')).toEqual({ themeId: 'ink', appearance: 'light', intensity: 1 });
    expect(pickSystemDefaultTheme('dark')).toEqual({ themeId: 'marine', appearance: 'dark', intensity: 1 });
    expect(pickSystemDefaultTheme(null)).toMatchObject({ themeId: 'marine', appearance: 'dark' });
    expect(pickSystemDefaultTheme(undefined)).toMatchObject({ themeId: 'marine', appearance: 'dark' });
  });

  it('новичок без метки и онбординга → применяется пара; конфиг-зерно = Океан@1', () => {
    expect(NEW_USER_DEFAULT_THEME).toEqual({ themeId: 'marine', intensity: 1 });
    expect(decideFirstRunTheme({ ...empty, onboardingDone: null })).toMatchObject({ kind: 'new_user', apply: true, themeId: 'marine', intensity: 1 });
  });

  it('метка «следует за системой» держит новичка новичком и после онбординга; выбор человека (ключи) сильнее метки', () => {
    expect(FOLLOW_SYSTEM_MARKER_KEY).toBe('theme_default_follow_system_v1');
    expect(decideFirstRunTheme({ ...empty, onboardingDone: '1', followSystemMarker: '1' }))
      .toMatchObject({ kind: 'new_user', apply: true, reason: 'follow_system_marker' });
    expect(decideFirstRunTheme({ ...empty, storedThemeId: 'rose', onboardingDone: '1', followSystemMarker: '1' }))
      .toMatchObject({ kind: 'stored_choice', apply: false });
    expect(decideFirstRunTheme({ ...empty, onboardingDone: '1', followSystemMarker: '0' }))
      .toMatchObject({ kind: 'existing_user_kept', apply: false });
    expect(decideFirstRunTheme({ ...empty, onboardingDone: '1', followSystemMarker: null }))
      .toMatchObject({ kind: 'existing_user_kept', apply: false });
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
    expect(src).toContain("AsyncStorage.multiGet([THEME_STORAGE_KEY, COLOR_LEVEL_STORAGE_KEY, APPEARANCE_STORAGE_KEY, INTENSITY_STORAGE_KEY, 'onboarding_done', FOLLOW_SYSTEM_MARKER_KEY])");
    expect(src).toContain('decideFirstRunTheme({');
    expect(src).toContain('[THEME-DEFAULT]');
    expect(src.match(/AsyncStorage\.getItem\('onboarding_done'\)/g)).toBeNull();
  });

  it('ThemeContext (сторож): пара следует за useColorScheme, первый выбор замораживает, новичку тема в хранилище не пишется, логи [DEFAULT-THEME]', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'ThemeContext.tsx'), 'utf8');
    expect(src).toContain('useColorScheme()');
    expect(src).toContain('followSystem ? systemDefault.appearance : savedLiquidGlassAppearance');
    expect(src).toContain('followSystem ? resolveLiquidGlassTheme(systemDefault.themeId) : appliedLiquidGlassThemeId');
    for (const kind of ["freezeFollowSystem('theme')", "freezeFollowSystem('intensity')", "freezeFollowSystem('appearance')"]) expect(src).toContain(kind);
    expect(src).toContain('migration.needsWrite && !newUserApply');
    expect(src).not.toContain('[[THEME_STORAGE_KEY, resolved], [INTENSITY_STORAGE_KEY, String(newUserApply.intensity)]]');
    expect(src).toContain('[DEFAULT-THEME]');
  });
});
