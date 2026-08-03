export interface LeagueHubPalette {
  surface: string;
  elevated: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  outline: string;
  positive: string;
  negative: string;
  warning: string;
  /**
   * зачем: владелец увидел экран Лиги в светлой теме и не смог разобрать
   * ни карточки, ни подиум — вся сцена рисовалась под тёмный фон
   * (полупрозрачное золото, белые «кости» скелета, жёлтый акцент).
   * Компоненты Лиги должны знать, что фон светлый, и переключать
   * ступени подиума, лучи, скелет и трек прогресса на тёмные тона.
   */
  isLight: boolean;
  /** Тон «кости» скелета и треков прогресса: темнее поверхности, не белый. */
  bone: string;
  /** Блик шиммера скелета — светлее кости на любом фоне. */
  boneShine: string;
}
