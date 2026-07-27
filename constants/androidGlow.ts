// ════════════════════════════════════════════════════════════════════════════
// androidGlow.ts — единый способ рисовать мягкое свечение/тень так, чтобы на
// Android не появлялся светлый КВАДРАТ вокруг скруглённого элемента.
//
// Причина бага (см. DESIGN.md → «Тени»):
//   `elevation` на Android — это не blur-тень, как `shadow*` на iOS, а системный
//   ViewOutlineProvider. Форму он берёт из НЕПРОЗРАЧНОГО background-drawable.
//   Если фон полупрозрачный (`rgba(...)`, `#RRGGBBAA`) или его рисует дочерний
//   слой (LinearGradient, Image), формы не видно — и Android заливает
//   прямоугольник по bounding box. Отсюда квадрат с чёткими углами вокруг
//   круглой/скруглённой плитки. На iOS этого нет: там `shadowRadius`/
//   `shadowOffset` строят тень по alpha-каналу слоя, а `elevation` игнорируется.
//
// зачем: владелец увидел квадраты почти на всех кнопках/пейволах/онбординге на
// Android, тогда как на iPhone всё чисто. Эталон — то, как выглядит на iOS;
// Android подгоняем под него, iOS не трогаем.
// ════════════════════════════════════════════════════════════════════════════
import { Platform, type ViewStyle } from 'react-native';

/** Цвет считается непрозрачным, если Android сможет вывести из него outline. */
export function isOpaqueColor(color: string | undefined): boolean {
  if (!color) return false;
  const c = color.trim().toLowerCase();
  if (c === 'transparent') return false;
  if (c.startsWith('rgba(')) {
    // rgba(r,g,b,a) — прозрачный при a < 1
    const alpha = Number(c.slice(c.lastIndexOf(',') + 1, c.lastIndexOf(')')));
    return Number.isFinite(alpha) ? alpha >= 1 : false;
  }
  // #RRGGBBAA / #RGBA — прозрачный, если alpha-часть не максимальная
  if (/^#[0-9a-f]{8}$/.test(c)) return c.slice(7) === 'ff';
  if (/^#[0-9a-f]{4}$/.test(c)) return c.slice(4) === 'f';
  return true;
}

type SoftShadowInput = {
  /** Цвет свечения. На iOS уходит в shadowColor. */
  color: string;
  /** Радиус размытия на iOS. Перф-потолок проекта — ~16 (DESIGN.md). */
  radius?: number;
  opacity?: number;
  offsetY?: number;
  /**
   * Фон САМОГО элемента. Если он непрозрачный, Android умеет вывести
   * скруглённый outline и elevation безопасен.
   */
  backgroundColor?: string;
  /** Elevation, который использовался бы на непрозрачном фоне. */
  elevation?: number;
};

/**
 * Тень/свечение, безопасные на обеих платформах.
 *
 * iOS  — обычные `shadow*` (эталон, ничего не меняем).
 * Android — `elevation` ТОЛЬКО когда фон непрозрачный; иначе 0, чтобы система
 * не нарисовала квадрат. Свечение в этом случае даёт `<GlowHalo/>`.
 */
export function softShadow({
  color,
  radius = 12,
  opacity = 0.3,
  offsetY = 6,
  backgroundColor,
  elevation = 6,
}: SoftShadowInput): ViewStyle {
  if (Platform.OS === 'android') {
    // Непрозрачный фон → outline корректный, elevation можно оставить.
    return { elevation: isOpaqueColor(backgroundColor) ? elevation : 0 };
  }
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: offsetY },
  };
}

/**
 * Точечный фикс для существующих стилей: гасит elevation на Android там, где
 * фон не непрозрачный, и оставляет всё остальное как есть.
 *
 * Применять к стилям, которые УЖЕ описаны в StyleSheet — правка в одну строку.
 */
export const noAndroidOutline: ViewStyle =
  Platform.OS === 'android' ? { elevation: 0 } : {};
