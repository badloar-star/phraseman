// theme_sliders_v1 выключен: миграция ничего не меняет.
import { migrateThemeIdToTune } from '../app/theme_tune_migration';

jest.mock('../constants/theme_sliders_flag', () => ({ THEME_SLIDERS_V1_ENABLED: false }));

it('флаг выключен — тема остаётся прежней, миграции нет', () => {
  expect(migrateThemeIdToTune({ resolvedId: 'slate', appearance: 'dark', isNewUser: false })).toEqual({ id: 'slate', migrated: false, reason: 'flag_off' });
  expect(migrateThemeIdToTune({ resolvedId: 'ink', appearance: 'light', isNewUser: true })).toEqual({ id: 'ink', migrated: false, reason: 'flag_off' });
});
