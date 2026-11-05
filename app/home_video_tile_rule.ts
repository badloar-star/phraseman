// home_video_tile_rule.ts — когда на Главной стоит плитка «Фразы из видео».
// зачем (слово владельца ~20:41 через координатора: «ФРАЗЫ ИЗ ВИДЕО НЕ СТАНОВИТСЯ 5 В РЯД! ОНА ТОЛЬКО ПОКА РАЗДЕЛ ВИДЕО НЕДОСТУПЕН»): плитка живёт рядом с «Уроки» и «Сохранённые»
// только пока раздел «Видео» закрыт (ранг ниже открытия видео, нет Plus); как только Видео открыт — плитки нет (наборы из видео доступны в самом разделе);
// в ряд из четырёх плиток пятой она не встаёт никогда. Чистая функция — чтобы правило проверялось на каждом ранге без запуска экрана.
export type HomeVideoPacksTileFacts = Readonly<{
  /** Плитку вообще можно показать (язык курса, карточки видимы). */
  available: boolean;
  /** Раздел «Видео» открыт у человека (ранг или Plus). */
  videoUnlocked: boolean;
  /** Сколько плиток в ряду без видеоплитки. */
  rowWithoutVideo: number;
}>;

export const HOME_TILE_ROW_MAX = 4;

export function homeVideoPacksTileWanted(f: HomeVideoPacksTileFacts): boolean {
  return f.available && !f.videoUnlocked && f.rowWithoutVideo < HOME_TILE_ROW_MAX;
}

export default function __HomeVideoTileRuleRouteShim() {
  return null;
}
