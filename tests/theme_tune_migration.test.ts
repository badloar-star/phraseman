// theme_sliders_v1: миграция прежней темы в настроенную (ближайшие оттенок и насыщенность; новичку — стандарт; флаг выкл — ничего).
import { migrateThemeIdToTune } from '../app/theme_tune_migration';
import { parseThemeTuneId, THEME_TUNE_STANDARD } from '../constants/theme_tune';

jest.mock('../constants/theme_sliders_flag', () => ({ THEME_SLIDERS_V1_ENABLED: true }));

describe('migrateThemeIdToTune', () => {
  beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { jest.restoreAllMocks(); });
  it('новичок → стандарт', () => {
    const r = migrateThemeIdToTune({ resolvedId: 'ink', appearance: 'dark', isNewUser: true });
    expect(r).toEqual({ id: `tune:${THEME_TUNE_STANDARD.H}:${THEME_TUNE_STANDARD.S}`, migrated: true, reason: 'new_user_standard' });
  });
  it('уже настроенная тема не трогается', () => {
    expect(migrateThemeIdToTune({ resolvedId: 'tune:10:60', appearance: 'light', isNewUser: false })).toEqual({ id: 'tune:10:60', migrated: false, reason: 'already_tune' });
  });
  it('цветные старые темы → разные оттенки, насыщенность > 0', () => {
    const tunes = ['rose', 'olive', 'marine', 'lavender'].map((id) => {
      const r = migrateThemeIdToTune({ resolvedId: id, appearance: 'dark', isNewUser: false });
      const tune = parseThemeTuneId(r.id);
      expect(tune).not.toBeNull();
      expect(r.migrated).toBe(true);
      expect(tune!.S).toBeGreaterThan(0);
      return tune!;
    });
    expect(new Set(tunes.map((t) => Math.round(t.H / 20))).size).toBeGreaterThanOrEqual(3); // четыре темы дают разные оттенки, а не всё в стандарт
  });
  it('графит (нейтральный) → не ярче стандарта', () => {
    const tune = parseThemeTuneId(migrateThemeIdToTune({ resolvedId: 'graphite', appearance: 'dark', isNewUser: false }).id)!;
    expect(tune.S).toBeLessThanOrEqual(THEME_TUNE_STANDARD.S);
  });
});
