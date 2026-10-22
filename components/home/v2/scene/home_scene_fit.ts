// ═══════════════════════════════════════════════════════════════════════════
// home_scene_fit.ts — высота «Сцены» Главной так, чтобы ВСЯ Главная до «Фразы дня» включительно была видна над таб-баром без прокрутки.
//
// зачем (Сверка 22.10, координатор; владелец просил Главную без скролла): сцена — 46 % экрана (392 из 844), но под ней карточка «Сегодня», ряд плиток и «Фраза дня» не помещались: последняя
// уходила ПОД нижнюю панель (≈ 40 dp). Сжимается ТОЛЬКО сцена (пустая часть героя), всё остальное — карточка, плитки, «Фраза дня» — полного размера, текст не ужимается (без adjustsFontSizeToFit).
// Предел сжатия — 320 (вариант 1 макета 38 %: текст, кнопка и герой ещё помещаются); если и так не влезает (маленький экран 360×640 и ниже, крупный шрифт), Главная прокручивается как раньше.
// Числа — из вёрстки: «Сегодня» (HomeV2TodayCard, режим сцены) 14 + 30 + три строки 52 + 52 + 55 + 6; плитка (подпись внутри, scenes-compact `.tile`) — 6 + картинка 58 + подпись 17 + 10 = 91; «Фраза дня» — 80; зазоры ленты 12.
// ═══════════════════════════════════════════════════════════════════════════
export const HOME_SCENE_PANEL_OVERLAP_DP = 22;
const TODAY_CARD = 14 + 30 + (52 + 52 + 55) + 6;
const PHRASE_CARD = 80;
const FEED_GAP = 12;
const TILE_HEIGHT = 6 + 58 + 17 + 10;
/** Нижний предел сжатия сцены (макет scenes-compact, вариант 1: 38 % экрана на 844). */
export const HOME_SCENE_FIT_MIN = 320;
/** Выше этого масштаба шрифта сцену не сжимаем: текст растёт, прокрутка допустима. */
export const HOME_SCENE_FIT_MAX_FONT_SCALE = 1.15;
/** Запас над верхом капсулы таб-бара. */
const BREATHING = 8;

/** Высота всего, что стоит под сценой (с учётом наезда карточки «Сегодня»). */
export function homeBelowSceneHeight(_windowW: number): number {
  return TODAY_CARD + FEED_GAP + TILE_HEIGHT + FEED_GAP + PHRASE_CARD - HOME_SCENE_PANEL_OVERLAP_DP;
}

/** Высота сцены: доля экрана (46 %), но не больше, чем остаётся над таб-баром после всего, что под сценой. */
export function homeSceneStageHeight(input: Readonly<{ windowH: number; windowW: number; pillTop: number; fontScale: number; share: number }>): number {
  const wanted = Math.round(input.windowH * input.share);
  if (input.fontScale > HOME_SCENE_FIT_MAX_FONT_SCALE) return wanted;
  const room = Math.floor(input.windowH - input.pillTop - BREATHING - homeBelowSceneHeight(input.windowW));
  return Math.max(HOME_SCENE_FIT_MIN, Math.min(wanted, room));
}
