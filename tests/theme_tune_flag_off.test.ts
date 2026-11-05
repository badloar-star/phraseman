// theme_sliders_v1 ВЫКЛЮЧЕН (по умолчанию): идентификатор `tune:` не принимается — палитра отвечает как на неизвестное имя, старые темы работают как раньше.
import { liquidGlassTokens, resolveLiquidGlassTheme } from '../constants/liquidGlassThemePalette';

jest.mock('../constants/theme_sliders_flag', () => ({ THEME_SLIDERS_V1_ENABLED: false }));

describe('theme_sliders_v1 выключен', () => {
  it('tune:… → graphite, токены как у graphite', () => {
    expect(resolveLiquidGlassTheme('tune:250:35')).toBe('graphite');
    expect(liquidGlassTokens('tune:250:35', { level: 'calm', appearance: 'dark' }).bg).toBe(liquidGlassTokens('graphite', { level: 'calm', appearance: 'dark' }).bg);
  });
  it('старые темы не затронуты', () => {
    expect(resolveLiquidGlassTheme('slate')).toBe('slate');
    expect(resolveLiquidGlassTheme('marine')).toBe('marine');
  });
  // зачем (владелец 05.11 ~20:55): флаг включён в коде; этот файл по-прежнему проверяет поведение палитры при выключенном флаге (откат одним коммитом безопасен)
  it('флаг в коде включён (владелец 05.11)', () => {
    jest.unmock('../constants/theme_sliders_flag');
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    expect((require('../constants/theme_sliders_flag') as { THEME_SLIDERS_V1_ENABLED: boolean }).THEME_SLIDERS_V1_ENABLED).toBe(true);
  });
});
