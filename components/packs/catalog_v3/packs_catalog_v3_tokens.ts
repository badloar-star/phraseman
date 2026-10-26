// ═══════════════════════════════════════════════════════════════════════════
// packs_catalog_v3_tokens.ts — цвета и обложки каталога на «Сцене»: из токенов активной темы, без своих литералов.
//
// зачем (слово владельца 26.10: «выглядит строго как макеты 2.0, сцена как на Главной и Пике; обложка в тоне темы; проверь в нескольких темах,
// светлых и тёмных»): сцена — homeSceneTokensForTheme (всегда «Максимум», как у Пика), текст на ней — SPIRE_SCENE_INK (белый, как в эталоне),
// обложка набора — смесь цветов самой сцены и акцента темы с постоянным по id набора сдвигом, поэтому одинаковый набор выглядит одинаково
// всегда, а соседние плитки различаются. Чистый модуль без React: сторож tests/packs_catalog_v3_2026_10_26.test.ts.
// ═══════════════════════════════════════════════════════════════════════════
import { liquidGlassTokens } from '../../../constants/liquidGlassThemePalette';
import { homeSceneTokensForTheme, type HomeSceneStageTokens } from '../../home/v2/scene/home_scene_tokens';
import { colorWithAlpha } from '../../v2/plateAlpha';
import { mixHex } from '../../../constants/v2Style';

export type PacksCatalogColors = Readonly<{
  scene: HomeSceneStageTokens;
  /** Акцент и кнопка темы на уровне «Максимум» — как у сцены. */
  accent: string;
  cta: string;
  ctaInk: string;
  /** Цвет, в который затухает низ списка перед кнопкой. */
  fadeFrom: string;
}>;

export function packsCatalogColors(themeId: string, appearance: 'dark' | 'light'): PacksCatalogColors {
  const scene = homeSceneTokensForTheme(themeId, appearance);
  const g = liquidGlassTokens(themeId, { level: 'max', appearance });
  return { scene, accent: g.accent, cta: g.ctaFill, ctaInk: g.ctaFillInk, fadeFrom: colorWithAlpha(scene.sceneBottom, 0) };
}

/** Стабильный хэш строки → неотрицательное целое (FNV-1a). */
export function packHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Набор значков обложки (Ionicons) — выбор по id, чтобы плитки различались, но не «пестрили». */
export const PACK_COVER_GLYPHS = ['book-outline', 'chatbubbles-outline', 'airplane-outline', 'restaurant-outline', 'briefcase-outline', 'school-outline', 'musical-notes-outline', 'cafe-outline', 'planet-outline', 'rocket-outline'] as const;

export type PackCoverPaint = Readonly<{
  from: string;
  to: string;
  /** Точка начала градиента (x, y в долях). */
  angle: Readonly<{ x: number; y: number }>;
  glyph: (typeof PACK_COVER_GLYPHS)[number];
  glyphColor: string;
}>;

/** Обложка набора: два тона из сцены и акцента темы; сдвиг смеси и угол — от хэша id. */
export function packCoverPaint(id: string, colors: PacksCatalogColors): PackCoverPaint {
  const h = packHash(id);
  const mixA = 0.25 + ((h % 5) / 4) * 0.5; // 0.25…0.75
  const mixB = 0.2 + (((h >> 3) % 5) / 4) * 0.4; // 0.2…0.6
  const from = mixHex(colors.scene.sceneTop, colors.accent, mixA);
  const to = mixHex(colors.scene.sceneBottom, colors.accent, mixB);
  const angles = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] as const;
  return {
    from,
    to,
    angle: angles[(h >> 6) % angles.length]!,
    glyph: PACK_COVER_GLYPHS[(h >> 9) % PACK_COVER_GLYPHS.length]!,
    glyphColor: colorWithAlpha(colors.scene.sceneGlow, 0.9),
  };
}
