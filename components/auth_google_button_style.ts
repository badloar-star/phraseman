/**
 * Вариант брендовой кнопки Google по яркости поверхности под ней.
 *
 * зачем (координатор 18.10, [BLEND-AUTH]): кнопки входа без обводки (запрет владельца на рамки), поэтому белая кнопка Google на светлой
 * шторке/фоне и тёмная #1F1F1F на тёмном сливались с поверхностью (≈1,0–1,2:1). Google разрешает и светлый, и тёмный вариант на любом фоне —
 * берём противоположный поверхности: светлая поверхность → тёмная кнопка, тёмная → белая (как уже сделано у Apple).
 */
export type GoogleButtonVariant = 'light' | 'dark';

function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '').slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(h)) return 0;
  const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

/** 'dark' (#1F1F1F) на светлой поверхности, 'light' (белая) на тёмной. */
export function googleButtonVariantForSurface(surfaceHex: string): GoogleButtonVariant {
  return relativeLuminance(surfaceHex) > 0.4 ? 'dark' : 'light';
}

/* expo-router route shim: служебный модуль вне app/ — заглушка не нужна, но держим единообразие экспорта */
