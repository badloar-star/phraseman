// UI-слой: короткая подпись уровня карточки профиля для бейджа у имени и заголовков меню.
//
// Раньше уровни подписывались словом «CARD» (CARD I … CARD V) — юзер попросил убрать его.
// Теперь: для русского — продуктовые имена (Стандарт/Гранёная/Фирменная/Движение/Престиж/
// Элита), для остальных языков — нейтральное «Lv {римская цифра}» (служебные англ. кодовые
// имена Polished/Elite не для игрока). Подпись короткая — бейдж рядом с именем узкий.
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
