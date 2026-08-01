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
 *    используем непрозрачные семантические поверхности и мягкую тему-тень.
 *  • Тёмные темы (dark/gold/coral/cinema) — полупрозрачная тёмная заливка: фон
 *    просвечивает. Опциональный тонкий верхний хайлайт-кант вместо обводки.
 *
 * tone управляет плотностью: 'card' (основная плитка) плотнее, 'subtle' (вложенный
 * блок / чип) прозрачнее, 'raised' (акцентный) — чуть светлее и с хайлайтом.
 */
import React from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from './ThemeContext';
import { isLightThemeMode } from '../constants/theme';
import { sagePorcelainShadow } from '../constants/sagePorcelainChrome';
import { glassFill } from '../constants/glassSurfaceFill';

export { glassFill } from '../constants/glassSurfaceFill';

export type GlassTone = 'card' | 'subtle' | 'raised';

/**
 * Безопасное превращение цвета темы в rgba с заданной альфой. Работает с hex
 * (#RGB/#RRGGBB) — все токены поверхностей тем сейчас hex. Если внезапно пришёл
 * НЕ-hex (rgb/rgba/имя) — не гадаем и возвращаем как есть (плотный фон лучше,
 * чем сломанный цвет): плитка просто будет непрозрачной, а не «стеклянной».
 */
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

  // Светлые темы: непрозрачная семантическая поверхность + мягкая глубина.
  if (isLightThemeMode(themeMode)) {
    const lightFill = tone === 'subtle' ? t.bgSurface : t.bgCard;
    const lightDepth = tone === 'raised' ? sagePorcelainShadow(2) : sagePorcelainShadow(1);
    return (
      <View
        style={[{ backgroundColor: lightFill, borderRadius: radius, ...lightDepth }, style]}
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
    backgroundColor: glassFill(fillHex, fillAlpha),
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
