// зачем (координатор 05.11): dev-переопределение ползунков «Оформление» не должно протечь в стор-сборку и в боевой флаг.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.resolve(__dirname, '..', 'constants', 'theme_sliders_flag.ts'), 'utf8');

describe('флаг ползунков: dev-переопределение', () => {
  it('боевое значение остаётся false', () => {
    expect(src).toMatch(/const BASE_FLAG = false;/);
  });
  it('переопределение требует dev-сборку и запрещено в стор-сборке', () => {
    expect(src).toMatch(/DEV_FORCE_ON = IS_DEV_BUILD && !IS_STORE && process\.env\.EXPO_PUBLIC_DEV_THEME_SLIDERS === '1'/);
    expect(src).toContain("EXPO_PUBLIC_STORE_RELEASE === '1'");
  });
  it('без переменной окружения флаг выключен, источник const', () => {
    delete process.env.EXPO_PUBLIC_DEV_THEME_SLIDERS;
    jest.isolateModules(() => {
      const m = require('../constants/theme_sliders_flag') as { THEME_SLIDERS_V1_ENABLED: boolean; THEME_SLIDERS_V1_SOURCE: string };
      expect(m.THEME_SLIDERS_V1_ENABLED).toBe(false);
      expect(m.THEME_SLIDERS_V1_SOURCE).toBe('const');
    });
  });
  it('в dev с переменной =1 флаг включён, источник dev; со STORE_RELEASE=1 — выключен', () => {
    process.env.EXPO_PUBLIC_DEV_THEME_SLIDERS = '1';
    (globalThis as { __DEV__?: boolean }).__DEV__ = true; // в jest __DEV__ может быть не задан
    jest.isolateModules(() => {
      const m = require('../constants/theme_sliders_flag') as { THEME_SLIDERS_V1_ENABLED: boolean; THEME_SLIDERS_V1_SOURCE: string };
      expect(m.THEME_SLIDERS_V1_ENABLED).toBe(true);
      expect(m.THEME_SLIDERS_V1_SOURCE).toBe('dev');
    });
    process.env.EXPO_PUBLIC_STORE_RELEASE = '1';
    jest.isolateModules(() => {
      const m = require('../constants/theme_sliders_flag') as { THEME_SLIDERS_V1_ENABLED: boolean };
      expect(m.THEME_SLIDERS_V1_ENABLED).toBe(false);
    });
    delete process.env.EXPO_PUBLIC_STORE_RELEASE;
    delete process.env.EXPO_PUBLIC_DEV_THEME_SLIDERS;
  });
});
