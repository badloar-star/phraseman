// ═══════════════════════════════════════════════════════════════════════════
// home_scene_hero_fade.ts — где герой сцены Главной гаснет над текстом.
//
// зачем (Темы 25.10, перемер 8bd8aea17: белый текст на бликах героя — 1,14, в светлом до 92 % точек ниже 4,5; координатор отменил
// «поверх текста допустимо» — текст обязан читаться): герой полностью виден до (верх текста − 24 dp), дальше плавно гаснет к 0 ровно на
// верхней границе текста — под буквами героя нет (≤ 16 % / 9 % с запасом: 0). Новых цветов и общего затемнения сцены нет.
// Если маска съела бы героя почти целиком (видно меньше 60 % высоты) — герой уходит в свободное место над текстом (heroBounded).
// Чистая функция: геометрия в координатах блока героя (0 — его верх).
// ═══════════════════════════════════════════════════════════════════════════

/** Плавный уход героя над текстом, dp. */
export const HOME_SCENE_HERO_FADE = 24;
/** Меньше этой доли видимой высоты героя — переходим на heroBounded. */
export const HOME_SCENE_HERO_MIN_VISIBLE = 0.6;

export type HomeSceneHeroFade = Readonly<{
  /** Герой целиком в свободном месте над текстом. */
  bounded: boolean;
  /** Маска нужна: низ героя заходит на текст. */
  masked: boolean;
  /** Доли высоты героя: полностью виден до fadeFrom, к fadeTo — 0. */
  fadeFrom: number;
  fadeTo: number;
  /** Почему так — для журнала [HOME-SCENE]. */
  why: string;
}>;

/**
 * heroTop — верх героя в координатах места под героя; spaceH — высота этого места (ниже начинается текст); heroH — высота героя;
 * fontBounded — крупный шрифт уже требует героя в свободном месте.
 */
export function homeSceneHeroFade(i: Readonly<{ heroTop: number; spaceH: number | null; heroH: number; fontBounded: boolean }>): HomeSceneHeroFade {
  if (i.fontBounded) return { bounded: true, masked: false, fadeFrom: 1, fadeTo: 1, why: 'font_bounded' };
  if (i.spaceH === null) return { bounded: false, masked: false, fadeFrom: 1, fadeTo: 1, why: 'space_unknown' };
  const textTop = i.spaceH - i.heroTop; // верх текста в координатах героя
  if (textTop >= i.heroH) return { bounded: false, masked: false, fadeFrom: 1, fadeTo: 1, why: `no_overlap textTop=${Math.round(textTop)}` };
  const fadeFrom = (textTop - HOME_SCENE_HERO_FADE) / i.heroH;
  if (fadeFrom < HOME_SCENE_HERO_MIN_VISIBLE) return { bounded: true, masked: false, fadeFrom: 1, fadeTo: 1, why: `mask_would_eat textTop=${Math.round(textTop)}` };
  return { bounded: false, masked: true, fadeFrom, fadeTo: Math.max(fadeFrom, textTop / i.heroH), why: `mask textTop=${Math.round(textTop)}` };
}
