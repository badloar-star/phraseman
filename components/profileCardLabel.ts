// UI-слой: короткая подпись уровня карточки профиля для бейджа у имени и заголовков меню.
//
// Раньше уровни подписывались словом «CARD»; теперь есть только базовая карточка и Pro.
// Для русского показываем продуктовое имя, для остальных языков — короткое «Lv I».
//
// Язык-зависимость живёт ЗДЕСЬ (в UI), а не в data-модуле profile_card_system — тот по
// контракту остаётся без per-language веток.

import {
  PROFILE_CARD_LEVEL_NAME_RU,
  profileCardLevelRoman,
  type ProfileCardLevel,
} from '../app/profile_card_system';

export function profileCardLevelLabel(level: ProfileCardLevel, isRu: boolean): string {
  if (isRu) return PROFILE_CARD_LEVEL_NAME_RU[level] ?? PROFILE_CARD_LEVEL_NAME_RU[0];
  return `Lv ${profileCardLevelRoman(level)}`;
}
