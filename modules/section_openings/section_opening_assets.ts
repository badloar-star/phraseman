// section_opening_assets.ts — картинки героя окон «Открытие раздела» (одним местом: окно и прогрев берут их отсюда).
// зачем (координатор 06.11, блокер: «старт истории ждёт загрузку hero 2,5–11 с»): общий список, чтобы прогрев (section_opening_prewarm) и само окно работали с одними и теми же источниками.
import type { ImageSourcePropType } from 'react-native';
import type { SectionOpeningId } from './section_opening_core';

export const SECTION_OPENING_HERO: Readonly<Record<SectionOpeningId, ImageSourcePropType>> = {
  rank: require('../../assets/images/v2/section_openings/rank.webp'),
  video: require('../../assets/images/v2/section_openings/video.webp'),
  dialogs: require('../../assets/images/v2/section_openings/dialogs.webp'),
  peak: require('../../assets/images/v2/section_openings/peak.webp'),
  cards: require('../../assets/images/v2/section_openings/cards.webp'),
  plus: require('../../assets/images/v2/section_openings/plus.webp'),
};
