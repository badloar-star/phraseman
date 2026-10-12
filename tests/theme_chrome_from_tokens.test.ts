import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { liquidGlassLevelForIntensity } from '../constants/liquidGlassThemeIntensity';
import {
  statsAccentFromTokens, statsBorderFromTokens, statsGlowStyleFromTokens, statsHairlineFromTokens,
  statsPageFieldFromTokens, statsSoftBgFromTokens,
} from '../constants/statsThemeChromeFromTokens';
import { themedToastChromeFromTokens } from '../constants/themedToastChromeFromTokens';
import { medalToastStyleFromTokens } from '../components/medalToastThemeStylesFromTokens';
import { statsThemeAccent } from '../constants/statsThemeChrome';
import { themedToastChrome } from '../constants/themedToastChrome';
import { DARK } from '../constants/theme';

// зачем: вариант темы требует level; берём его из интенсивности, как ThemeContext
const variant = (appearance: 'dark' | 'light', intensity: number) => ({ appearance, intensity, level: liquidGlassLevelForIntensity(intensity) });

// зачем (координатор 12.10): модули-константы тем следуют токенам Liquid Glass на любой теме, оформлении и оттенке ползунка.
const IDS = ['graphite', 'ocean', 'sunset', 'mint'];
const APPEARANCES = ['dark', 'light'] as const;
const INTENSITIES = [0, 0.5, 1];
const rgba = /^rgba?\(/;

describe('цвета тем из токенов', () => {
  for (const id of IDS) for (const appearance of APPEARANCES) for (const intensity of INTENSITIES) {
    it(`${id}/${appearance}/${intensity}`, () => {
      const t = liquidGlassTokens(id, variant(appearance, intensity));
      expect(statsAccentFromTokens(t)).toBe(t.accentGraphic);
      if (appearance === 'dark') expect(statsAccentFromTokens(t)).toBe(t.accent); // тёмный вид не меняется
      expect(statsPageFieldFromTokens(t)).toBe(t.opaqueSheet);
      for (const v of [statsSoftBgFromTokens(t), statsSoftBgFromTokens(t, 'strong'), statsBorderFromTokens(t), statsHairlineFromTokens(t)]) {
        expect(v).toMatch(rgba);
      }
      expect(statsGlowStyleFromTokens(t, 'medium').shadowRadius).toBe(12);
      const toast = themedToastChromeFromTokens(t);
      expect(toast.title).toBe(t.text);
      expect(toast.accent).toBe(t.accent);
      expect(toast.cardColors).toHaveLength(3);
      const medal = medalToastStyleFromTokens(t);
      expect(medal.titleColor).toBe(t.text);
      expect(medal.cardBgColors).toEqual([t.opaqueControl, t.opaqueCard]);
      expect(medal.tierAccents.gold).toBe(t.isLight ? '#8B6320' : '#F2C44A');
    });
  }

  it('БЫЛО: прежние таблицы по themeMode=dark остались зелёными (запись «до»)', () => {
    expect(statsThemeAccent('dark')).toBe(DARK.accent);
    expect(themedToastChrome('dark', DARK).accent).toBe('#47C870');
  });

  it('на теме не из «dark» акцент статистики и тоста больше не зелёный прежнего режима', () => {
    const t = liquidGlassTokens('ocean', variant('light', 1));
    expect(statsAccentFromTokens(t)).not.toBe(DARK.accent);
    expect(themedToastChromeFromTokens(t).accent).not.toBe('#47C870');
  });
});
