// spire_week_energy — строка про запас энергии в «Итоге недели» (энергия от Пика, владелец 04.11).
// зачем: повышение — «+1 к запасу энергии», понижение — «−1 к запасу энергии», без смены лиги строки нет. Максимум 11 — для повышения строки нет;
// понижение показываем, только если было что снимать (бонус уже > 0). Ничего сверх этого не придумываем. Чистая функция — проверяется без экрана.
import type { Lang } from '../../constants/i18n';
import { SPIRE_ENERGY_BONUS_MAX } from '../../shared/spire_energy_bonus';
import { momentText } from './moments/moments_strings';

// зачем (координатор 05.11 00:17): окна повышения и карточка итога решают «показывать +1» ОДНИМ правилом — запас уже 11 → строки нет (сервер на 11 режет, текст не должен врать)
export function promotionEnergyLine(lang: Lang, bonus: number): string | null {
  return bonus < SPIRE_ENERGY_BONUS_MAX ? momentText(lang, 'promoEnergy') : null;
}

export function spireWeekEnergyLine(lang: Lang, r: Readonly<{ promoted: boolean; demoted: boolean }>, bonus: number): string | null {
  if (r.promoted) return promotionEnergyLine(lang, bonus);
  if (r.demoted && bonus > 0) return momentText(lang, 'demoEnergy');
  return null;
}
