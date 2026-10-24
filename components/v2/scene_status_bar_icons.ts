// зачем (координатор 24.10, Р2 у 3 · МАКЕТЫ): значки строки состояния над «Сценой» должны читаться на самой сцене, а не следовать оформлению темы.
// Сцены Главной и Сезона тёмные во всех темах, а сцена Диалогов в светлых темах светлая — ей нужны тёмные значки. Чистая функция без React:
// хук Макетов (hooks/use_scene_status_bar.ts) решает по ней light-content / dark-content. Порог тот же, что у круга «назад» на сцене (back_on_scene.ts).

export type SceneStatusBarIcons = 'light' | 'dark';

const lin = (v: number): number => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };

/** Относительная яркость #rrggbb; не hex — null. */
export function sceneLuminance(hex: string): number | null {
  const m = /^#([0-9a-f]{6})/i.exec(hex.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

/** Какие значки ставить над сценой с таким верхним цветом: на тёмной — светлые, на светлой — тёмные. Не hex — светлые (сцены по умолчанию тёмные). */
export function statusBarIconsOnScene(sceneTop: string): SceneStatusBarIcons {
  const l = sceneLuminance(sceneTop);
  if (l === null) return 'light';
  // белый и чёрный значок к сцене: берём контрастнейший (равносильно порогу ≈ 0,18 по яркости)
  const onWhite = 1.05 / (l + 0.05);
  const onBlack = (l + 0.05) / 0.05;
  return onWhite >= onBlack ? 'light' : 'dark';
}

/** Готовое значение для StatusBar barStyle. */
export function sceneStatusBarStyle(sceneTop: string): 'light-content' | 'dark-content' {
  return statusBarIconsOnScene(sceneTop) === 'light' ? 'light-content' : 'dark-content';
}
