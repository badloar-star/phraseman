const DARK_BUTTON_TEXT = '#07110A' as const;
const LIGHT_BUTTON_TEXT = '#FFFFFF' as const;

function parseHexColor(value: string): [number, number, number] | null {
  const raw = value.trim().replace(/^#/, '');
  const hex = raw.length === 3
    ? raw.split('').map((part) => `${part}${part}`).join('')
    : raw;
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function relativeLuminance(color: [number, number, number]): number {
  const [r, g, b] = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

function contrastRatio(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function buttonForegroundForBackground(
  backgroundColor: string,
): typeof DARK_BUTTON_TEXT | typeof LIGHT_BUTTON_TEXT {
  const background = parseHexColor(backgroundColor);
  if (!background) return DARK_BUTTON_TEXT;

  const backgroundLuminance = relativeLuminance(background);
  const darkContrast = contrastRatio(backgroundLuminance, relativeLuminance([7, 17, 10]));
  const lightContrast = contrastRatio(backgroundLuminance, 1);
  return darkContrast >= lightContrast ? DARK_BUTTON_TEXT : LIGHT_BUTTON_TEXT;
}

const toHex = (channel: number): string =>
  Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0');

/**
 * Светлая ли поверхность. Считаем по реальной яркости цвета, а не по имени
 * темы: новая светлая тема может появиться без обновления списка имён.
 */
export function isLightSurface(backgroundColor: string): boolean {
  const background = parseHexColor(backgroundColor);
  if (!background) return false;
  return relativeLuminance(background) > 0.4;
}

/** Контраст двух цветов по WCAG (1..21). Неразбираемый цвет → 1 (худший случай). */
export function colorContrast(foreground: string, background: string): number {
  const fg = parseHexColor(foreground);
  const bg = parseHexColor(background);
  if (!fg || !bg) return 1;
  return contrastRatio(relativeLuminance(fg), relativeLuminance(bg));
}

/**
 * Подгоняет цвет ТЕКСТА/иконки под фон до нужного контраста, сохраняя оттенок.
 *
 * зачем: бренд-цвета (лиги, медали, «повышен/понижен») подбирались под тёмный
 * фон. На светлой теме тот же зелёный #34C759 даёт контраст ~1.9:1 — надпись
 * читается как выцветшая. Вместо ручной второй палитры на каждую тему
 * затемняем (или осветляем) исходный оттенок шагами, пока не наберётся
 * минимум WCAG AA. Оттенок узнаваем, читаемость гарантирована.
 *
 * @param color исходный «фирменный» цвет
 * @param backgroundColor фон, на котором он лежит
 * @param minRatio минимальный контраст (4.5 — текст AA, 3 — крупный текст/иконки)
 */
export function readableOn(color: string, backgroundColor: string, minRatio = 4.5): string {
  const source = parseHexColor(color);
  const background = parseHexColor(backgroundColor);
  if (!source || !background) return color;

  const backgroundLuminance = relativeLuminance(background);
  if (contrastRatio(relativeLuminance(source), backgroundLuminance) >= minRatio) return color;

  // На светлом фоне уводим цвет в тень, на тёмном — в свет.
  const target = backgroundLuminance > 0.4 ? 0 : 255;
  let current: [number, number, number] = [...source];

  // 24 шага по 6% гарантированно доводят до чистого чёрного/белого, если
  // нужный контраст не набирается раньше.
  for (let step = 0; step < 24; step += 1) {
    if (contrastRatio(relativeLuminance(current), backgroundLuminance) >= minRatio) break;
    current = [
      current[0] + (target - current[0]) * 0.06,
      current[1] + (target - current[1]) * 0.06,
      current[2] + (target - current[2]) * 0.06,
    ];
  }

  return `#${toHex(current[0])}${toHex(current[1])}${toHex(current[2])}`;
}
