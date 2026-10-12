import { glassTone } from '../components/dialogs/glass/glassTone';
import type { GlassTokens } from './liquidGlassThemePalette';
import type { ThemedToastChrome } from './themedToastChrome';

// зачем (координатор 12.10): themedToastChrome(themeMode) берёт строку по прежнему режиму (всегда 'dark' → зелёные тосты). Эта функция —
// тот же набор ролей из токенов Liquid Glass, на любой теме и оформлении. Старая таблица не тронута (запись «БЫЛО»).
// Подключение — владельцам тостов (ActionToast/другие); сейчас у themedToastChrome нет потребителей в app/components.
export function themedToastChromeFromTokens(t: GlassTokens): ThemedToastChrome {
  return {
    cardColors: [t.opaqueControl, t.opaqueCard, t.opaqueSheet],
    accent: t.accent,
    accentSoft: glassTone(t.accent, 0.16),
    border: glassTone(t.accent, t.isLight ? 0.3 : 0.42),
    title: t.text,
    body: t.mutedText,
    closeBg: glassTone(t.text, 0.08),
    shadowColor: t.isLight ? t.shadowTint : 'rgba(0,0,0,0.5)',
    radius: 18,
  };
}
