// ═══════════════════════════════════════════════════════════════════════════
// tabbar_shadow_dev.ts — временный переключатель тени капсулы таб-бара: прежний elevation или маска с вырезом (только dev-ссылка).
//
// зачем (координатор 22.10: «Капсула таб-бара: маска за dev-ссылкой (?tabbarShadow=mask&alpha=…), по умолчанию прежний elevation;
// Сверка подбирает альфу парой снимков до/после; затем одним коммитом маска по умолчанию + elevation снят + найденная альфа»):
// режим меняет только dev-ссылка (app/dev_state_fixtures.ts); в релизе ссылки нет — всегда elevation. После подбора альфы модуль
// удаляется вместе с параметрами ссылки.
// ═══════════════════════════════════════════════════════════════════════════

export type TabbarShadowMode = Readonly<{ kind: 'elevation' }> | Readonly<{ kind: 'mask'; alpha: number; alphaLight: number }>;

/** Сила тени маски по умолчанию — середина ориентира Material 0,19–0,30 (4 · ТЕМЫ, home_scene_baked_assets). */
export const TABBAR_SHADOW_DEFAULT_ALPHA = 0.25;

const ELEVATION: TabbarShadowMode = Object.freeze({ kind: 'elevation' });
let mode: TabbarShadowMode = ELEVATION;
const listeners = new Set<() => void>();

export function getTabbarShadowMode(): TabbarShadowMode {
  return mode;
}

export function subscribeTabbarShadowMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const unit = (value: number | null | undefined, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

/** Только dev-ссылка: mask — маска с альфой тёмных (alpha) и светлых (alphaLight, по умолчанию = alpha) тем; иначе прежний elevation. */
export function setTabbarShadowDevLink(kind: 'mask' | 'elevation' | null, alpha?: number | null, alphaLight?: number | null): void {
  const dark = unit(alpha, TABBAR_SHADOW_DEFAULT_ALPHA);
  mode = kind === 'mask' ? Object.freeze({ kind: 'mask', alpha: dark, alphaLight: unit(alphaLight, dark) }) : ELEVATION;
  console.log('[TABBAR-SHADOW] dev-ссылка', JSON.stringify({ requested: { kind, alpha: alpha ?? null, alphaLight: alphaLight ?? null }, applied: mode })); // guard-ok: одна строка на применение ссылки
  listeners.forEach((listener) => listener());
}
