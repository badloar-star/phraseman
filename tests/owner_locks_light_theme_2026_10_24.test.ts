// ЗАМОК ВЛАДЕЛЬЦА 24.10: «из онбординга убрать тёмную тему, и стандартная тема только одна — светлая».
// зачем: выбора темы в онбординге нет — тема новичка шла по системе, и на тёмном телефоне онбординг был в тёмном «Океане».
// Сторож: стандартная тема новичка — одна светлая «Сумерки» (ink) при любом системном режиме; тёмной пары «по системе» нет.
// Выбор человека и старые пользователи не трогаются (decideFirstRunTheme). Ослабить замок — только новым словом владельца.
import fs from 'node:fs';
import path from 'node:path';
import { NEW_USER_DEFAULT_THEME, decideFirstRunTheme, pickSystemDefaultTheme } from '../app/theme_first_run_default';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/theme_first_run_default.ts'), 'utf8');

describe('ЗАМОК ВЛАДЕЛЬЦА 24.10: стандартная тема только одна — светлая', () => {
  it('при любом системном режиме новичок получает светлые «Сумерки»', () => {
    for (const scheme of ['light', 'dark', null, undefined, 'no-preference']) {
      expect(pickSystemDefaultTheme(scheme)).toEqual({ themeId: 'ink', appearance: 'light', intensity: 1 });
    }
    expect(NEW_USER_DEFAULT_THEME).toEqual({ themeId: 'ink', intensity: 1 });
  });

  it('в выборе темы новичка нет тёмной ветки', () => {
    const body = src.slice(src.indexOf('export function pickSystemDefaultTheme'), src.indexOf('export const NEW_USER_DEFAULT_THEME'));
    expect(body).not.toContain('NEW_USER_SYSTEM_PAIR.dark');
    expect(body).not.toMatch(/appearance:\s*[^,}]*'dark'/);
  });

  it('выбор человека и старые пользователи не перекрашиваются', () => {
    const empty = { storedThemeId: null, storedIntensity: null, storedLevel: null };
    expect(decideFirstRunTheme({ ...empty, storedThemeId: 'marine', onboardingDone: '1' })).toMatchObject({ kind: 'stored_choice', apply: false });
    expect(decideFirstRunTheme({ ...empty, onboardingDone: '1', followSystemMarker: null })).toMatchObject({ kind: 'existing_user_kept', apply: false });
  });
});
