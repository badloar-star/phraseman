// зачем (запрос координатора 15.10, +52 МБ на экране тем): кэш токенов темы ограничен, результат не меняется, чужие темы освобождаются.
import {
  LIQUID_GLASS_THEME_IDS, VARIANT_CACHE_LIMIT, liquidGlassTokenCacheSize, liquidGlassTokens, releaseLiquidGlassTokenCacheExcept,
} from '../constants/liquidGlassThemePalette';

describe('кэш токенов темы', () => {
  it('не превышает потолок при переборе всех тем, оформлений и шагов ползунка', () => {
    for (const id of LIQUID_GLASS_THEME_IDS) for (const appearance of ['dark', 'light'] as const) for (let i = 0; i <= 20; i += 1) {
      liquidGlassTokens(id, { intensity: i / 20, appearance } as never);
      expect(liquidGlassTokenCacheSize()).toBeLessThanOrEqual(VARIANT_CACHE_LIMIT);
    }
  });
  it('вытеснение не меняет значения: пересчитанный токен равен прежнему', () => {
    const first = liquidGlassTokens('rose', { intensity: 0.5, appearance: 'light' } as never);
    for (const id of LIQUID_GLASS_THEME_IDS) for (let i = 0; i <= 20; i += 1) liquidGlassTokens(id, { intensity: i / 20, appearance: 'dark' } as never);
    const again = liquidGlassTokens('rose', { intensity: 0.5, appearance: 'light' } as never);
    expect(again.plateFillTo).toBe(first.plateFillTo);
    expect(again.text).toBe(first.text);
  });
  it('освобождение оставляет только активную тему и не ломает её токены', () => {
    const before = liquidGlassTokens('marine', { intensity: 0, appearance: 'dark' } as never);
    const freed = releaseLiquidGlassTokenCacheExcept('marine');
    expect(freed).toBeGreaterThan(0);
    expect(liquidGlassTokens('marine', { intensity: 0, appearance: 'dark' } as never)).toBe(before);
    expect(liquidGlassTokenCacheSize()).toBeLessThanOrEqual(42);
  });
});
