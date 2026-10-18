// coin_rank_display.ts — картинка монеты ранга под размер показа на этом экране (плотность устройства — PixelRatio).
// зачем (координатор 18.10, Ревизор 3.120): Главная, Уроки и Настройки брали исходник 768² напрямую, мимо AvatarView, —
// декод ~2,3 МБ ради монеты 20–52 dp (на Главной это холодный старт). Обёртка над coinRankSourceForSize для таких мест.
import { PixelRatio, type ImageSourcePropType } from 'react-native';
import { coinRankSourceForSize } from '../../app/coin_rank_table_v1';

export function coinRankDisplaySource(rank: number, sizeDp: number): ImageSourcePropType {
  return coinRankSourceForSize(rank, sizeDp, PixelRatio.get()).source;
}
