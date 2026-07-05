/**
 * GlassSurface — единая «стеклянная плитка» вместо контейнеров с обводками.
 *
 * Зачем: раньше каждый блок рисовался вручную как `borderWidth + borderColor:
 * t.border` (≈1250 мест). На фоне ScreenGradient обводки шумят и конкурируют с
 * фоном. GlassSurface даёт ОДИН контейнер: полупрозрачная заливка в оттенке темы
 * без рамки — глубокий градиент экрана просвечивает, и это читается как «дорого».
 *
 * Поведение по темам (чтобы не сломать существующие языки дизайна):
 *  • Плоские «бизнес»-темы (isFlat) — их язык это волосяная линия и плоскость;
 *    GlassSurface НЕ навязывает стекло, а даёт плоскую заливку bgCard как раньше.
 *  • Светлые темы — прозрачная заливка на светлом фоне читается слабо, поэтому
 *    держим более плотную светлую заливку (чуть прозрачную, без рамки).
 *  • Тёмные темы (dark/gold/coral/cinema) — полупрозрачная тёмная заливка: фон
 *    просвечивает. Опциональный тонкий верхний хайлайт-кант вместо обводки.
 *
 * tone управляет плотностью: 'card' (основная плитка) плотнее, 'subtle' (вложенный
 * блок / чип) прозрачнее, 'raised' (акцентный) — чуть светлее и с хайлайтом.
 */
import React from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from './ThemeContext';

export type GlassTone = 'card' | 'subtle' | 'raised';

/**
 * Безопасное превращение цвета темы в rgba с заданной альфой. Работает с hex
 * (#RGB/#RRGGBB) — все токены поверхностей тем сейчас hex. Если внезапно пришёл
 * НЕ-hex (rgb/rgba/имя) — не гадаем и возвращаем как есть (плотный фон лучше,
 * чем сломанный цвет): плитка просто будет непрозрачной, а не «стеклянной».
 */
function alpha(color: string, a: number): string {
  const c = String(color).trim();
  if (c[0] !== '#') return c;
  let hex = c.slice(1);
  if (hex.length === 3) hex = hex.split('').map((ch) => ch + ch).join('');
  if (hex.length !== 6) return c;
  const n = parseInt(hex, 16);
  if (Number.isNaN(n)) return c;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * Тот же хелпер для мест, где GlassSurface-обёртка неудобна (StyleSheet-экраны):
 * hex-цвет темы → rgba со стеклянной альфой. Для inline-стилей плиток/панелей.
 */
export function glassFill(color: string, a: number): string {
  return alpha(color, a);
}

interface GlassSurfaceProps extends ViewProps {
  /** Плотность заливки. По умолчанию 'card'. */
  tone?: GlassTone;
  /** Скругление. По умолчанию 14 (как карточки в Threads-стиле). */
  radius?: number;
  /**
   * Тонкий верхний хайлайт-кант (1px акцентного цвета сверху) вместо полной
   * обводки — придаёт объём, не создавая «рамку». Только на тёмных темах.
   */
  highlight?: boolean;
  children?: React.ReactNode;
}

/** Является ли тема светлой (светлый bgCard → нужна плотная светлая заливка). */
function isLightThemeMode(themeMode: string): boolean {
  return themeMode === 'businessLight';
}

export default function GlassSurface({
  tone = 'card',
  radius = 14,
  highlight = false,
  style,
  children,
  ...rest
}: GlassSurfaceProps) {
  const { theme: t, themeMode, isFlat } = useTheme();

  // Плоские бизнес-темы: сохраняем их плоский язык — заливка bgCard без стекла.
  if (isFlat) {
    const flatStyle: ViewStyle = {
      backgroundColor: t.bgCard,
      borderRadius: radius,
    };
    return (
      <View style={[flatStyle, style]} {...rest}>
        {children}
      </View>
    );
  }

  // Светлые темы: полупрозрачная светлая заливка (читается на светлом фоне).
  if (isLightThemeMode(themeMode)) {
    const lightAlpha = tone === 'subtle' ? 0.55 : tone === 'raised' ? 0.9 : 0.75;
    return (
      <View
        style={[{ backgroundColor: alpha(t.bgCard, lightAlpha), borderRadius: radius }, style]}
        {...rest}
      >
        {children}
      </View>
    );
  }

  // Тёмные темы: полупрозрачная тёмная заливка — фон-градиент просвечивает.
  // Плотность по tone: card — заметная плитка, subtle — вложенный блок, raised —
  // акцентный (чуть светлее + хайлайт).
  const fillAlpha = tone === 'subtle' ? 0.32 : tone === 'raised' ? 0.58 : 0.46;
  const fillHex = tone === 'raised' ? t.bgSurface : t.bgCard;
  const surfaceStyle: ViewStyle = {
    backgroundColor: alpha(fillHex, fillAlpha),
    borderRadius: radius,
  };
  // Верхний хайлайт-кант вместо обводки: тонкая акцентная линия сверху даёт
  // объём «стекла», не рисуя замкнутую рамку (владелец не любит рамки).
  const highlightStyle: ViewStyle | null = highlight
    ? { borderTopWidth: 1, borderTopColor: alpha(t.accent, 0.14) }
    : null;

  return (
    <View style={[surfaceStyle, highlightStyle, style]} {...rest}>
      {children}
    </View>
  );
}
