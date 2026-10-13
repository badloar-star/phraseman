// зачем (Макеты 15.10, home-002): светлая/тёмная Главная ссылкой dev_state?appearance=light|dark|clear — ТОЛЬКО в памяти: хранилище и сохранённый выбор темы не меняются.
import { readFileSync } from 'fs';
import { join } from 'path';
import { getDevAppearance, getDevThemeChoice, setDevAppearance, setDevThemeChoice, subscribeDevAppearance, subscribeDevThemeChoice } from '../app/dev_appearance_override';
import { parseDevStateParams } from '../app/dev_state_fixtures';

const read = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8').replace(/\r\n/g, '\n');

describe('dev_state appearance (только память)', () => {
  let log: jest.SpyInstance;
  beforeEach(() => { log = jest.spyOn(console, 'log').mockImplementation(() => undefined); setDevAppearance(null); });
  afterEach(() => { setDevAppearance(null); log.mockRestore(); });

  it('оверрайд: по умолчанию нет; set/get; подписчики получают смену, повтор того же значения молчит; clear = null', () => {
    const seen: Array<string | null> = [];
    const off = subscribeDevAppearance((v) => seen.push(v));
    expect(getDevAppearance()).toBeNull();
    setDevAppearance('light');
    setDevAppearance('light');
    expect(getDevAppearance()).toBe('light');
    setDevAppearance('dark');
    setDevAppearance(null);
    off();
    setDevAppearance('light');
    expect(seen).toEqual(['light', 'dark', null]);
  });

  it('параметр appearance разбирается: light|dark|clear принимаются, остальное отвергается с причиной', () => {
    expect(parseDevStateParams({ appearance: 'light' }).request.appearance).toBe('light');
    expect(parseDevStateParams({ appearance: 'dark' }).request.appearance).toBe('dark');
    expect(parseDevStateParams({ appearance: 'clear' }).request.appearance).toBe('clear');
    const bad = parseDevStateParams({ appearance: 'sepia' });
    expect(bad.request.appearance).toBeUndefined();
    expect(bad.rejected.appearance).toMatch(/light\|dark\|clear/);
  });

  it('ThemeContext берёт эффективное оформление = оверрайд ?? сохранённое и не пишет оверрайд в хранилище', () => {
    const ctx = read('components', 'ThemeContext.tsx');
    // зачем (владелец 13.10): между оверрайдом и сохранённым стоит «пара по умолчанию для новичка» (следует за системой), оверрайд по-прежнему первый
    expect(ctx).toContain('const liquidGlassAppearance: LiquidGlassAppearance = devAppearance ?? (followSystem ? systemDefault.appearance : savedLiquidGlassAppearance);');
    expect(ctx).toContain('subscribeDevAppearance(setDevAppearanceState)');
    const override = read('app', 'dev_appearance_override.ts');
    expect(override).not.toMatch(/AsyncStorage|setItem|firestore|persist/i);
  });
  // зачем (Сверка chain7 12.10): образец макетов — «Аврора» на полной насыщенности, приложение снимали с «Графит» на нуле; тема и оттенок теперь подменяются ссылкой, только в памяти
  describe('dev_state theme / level (только память)', () => {
    beforeEach(() => setDevThemeChoice(null));
    afterEach(() => setDevThemeChoice(null));

    it('оверрайд: set/get; подписчики получают смену, повтор молчит; пустой выбор = null', () => {
      const seen: Array<string> = [];
      const off = subscribeDevThemeChoice((v) => seen.push(JSON.stringify(v)));
      expect(getDevThemeChoice()).toBeNull();
      setDevThemeChoice({ themeId: 'grad_aurora', intensity: 1 });
      setDevThemeChoice({ themeId: 'grad_aurora', intensity: 1 });
      expect(getDevThemeChoice()).toEqual({ themeId: 'grad_aurora', intensity: 1 });
      setDevThemeChoice({ themeId: null, intensity: null });
      off();
      expect(getDevThemeChoice()).toBeNull();
      expect(seen).toEqual(['{"themeId":"grad_aurora","intensity":1}', 'null']);
    });

    it('параметры theme и level разбираются: id темы / число 0..1 / clear принимаются, остальное отвергается с причиной', () => {
      expect(parseDevStateParams({ theme: 'grad_aurora', level: '1' }).request).toMatchObject({ theme: 'grad_aurora', level: 1 });
      expect(parseDevStateParams({ theme: 'clear', level: 'clear' }).request).toMatchObject({ theme: 'clear', level: 'clear' });
      expect(parseDevStateParams({ level: '0.25' }).request.level).toBe(0.25);
      const bad = parseDevStateParams({ theme: 'neon', level: '2' });
      expect(bad.request.theme).toBeUndefined();
      expect(bad.request.level).toBeUndefined();
      expect(bad.rejected.theme).toMatch(/id темы/);
      expect(bad.rejected.level).toMatch(/0\.\.1/);
    });

    it('ThemeContext берёт тему и оттенок = оверрайд ?? сохранённое и не пишет оверрайд в хранилище', () => {
      const ctx = read('components', 'ThemeContext.tsx');
      expect(ctx).toContain('previewLiquidGlassIntensity ?? devThemeChoice?.intensity ?? appliedLiquidGlassIntensity');
      expect(ctx).toContain('devThemeChoice?.themeId ? resolveLiquidGlassTheme(devThemeChoice.themeId) : null) ?? (followSystem ? resolveLiquidGlassTheme(systemDefault.themeId) : appliedLiquidGlassThemeId)');
      expect(ctx).toContain('subscribeDevThemeChoice(setDevThemeChoiceState)');
      expect(read('app', 'dev_appearance_override.ts')).not.toMatch(/AsyncStorage|setItem|firestore|persist/i);
    });
  });
});
