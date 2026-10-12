// зачем (Макеты 15.10, home-002): светлая/тёмная Главная ссылкой dev_state?appearance=light|dark|clear — ТОЛЬКО в памяти: хранилище и сохранённый выбор темы не меняются.
import { readFileSync } from 'fs';
import { join } from 'path';
import { getDevAppearance, setDevAppearance, subscribeDevAppearance } from '../app/dev_appearance_override';
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
    expect(ctx).toContain('const liquidGlassAppearance: LiquidGlassAppearance = devAppearance ?? savedLiquidGlassAppearance;');
    expect(ctx).toContain('subscribeDevAppearance(setDevAppearanceState)');
    const override = read('app', 'dev_appearance_override.ts');
    expect(override).not.toMatch(/AsyncStorage|setItem|firestore|persist/i);
  });
});
