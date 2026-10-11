/**
 * Цвет и сила скрима под статус-баром. зачем (кадр HOME_light.png, координатор 14.10): по умолчанию скрим был ЧЁРНЫМ (0,0,0) с альфой 0.446 — на светлой теме
 * под статус-баром получалась тёмно-серая полоса (RGB 131,133,135). Если `tone` не передан явно, в светлой теме скрим берёт цвет фона темы (bgTop) и
 * закрывает контент плотнее (0.8), в тёмной — как раньше (чёрный, strength×0.62). Явный `tone` работает без изменений.
 * Чистая функция вынесена из TopFadeMask.tsx, чтобы её проверял тест без нативных модулей.
 */
export function topFadeScrim(isLight: boolean, bgTop: string, strength: number, tone?: 'dark' | 'light'): Readonly<{ rgb: string; alpha: number; source: string }> {
  const clamped = Math.min(1, Math.max(0, strength));
  if (tone === 'light') return { rgb: '255,255,255', alpha: clamped * 0.62, source: 'tone=light' };
  if (tone === 'dark') return { rgb: '0,0,0', alpha: clamped * 0.62, source: 'tone=dark' };
  if (isLight) {
    const n = Number.parseInt(bgTop.replace('#', '').slice(0, 6), 16);
    const rgb = Number.isFinite(n) ? `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}` : '255,255,255';
    return { rgb, alpha: 0.8, source: `theme-light bgTop=${bgTop}` };
  }
  return { rgb: '0,0,0', alpha: clamped * 0.62, source: 'theme-dark' };
}
