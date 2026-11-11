// paywall_duo_tap — решение по нажатию на кнопку-тариф в пейволе «Два пути» (макет docs/work/mockups/paywall-sell-2026-11-11/variant-a.html).
// зачем (владелец 11.11: «вариант А, два пути; при нажатии на Plus цвет и иконка меняются на соответственный»):
// отдельной кнопки «Оформить» на первом экране нет — её роль у самих тарифов. Нажатие на НЕвыбранный тариф только
// перекрашивает окно (мгновенно, локально), нажатие на уже выбранный — открывает оплату. Год выбран заранее → год покупается в один тап.
import type { PaywallPlan } from '../../../app/paywall_purchase';

export type DuoTapAction = 'ignore_busy' | 'ignore_no_price' | 'select' | 'buy';

export type DuoTapInput = Readonly<{
  tapped: PaywallPlan;
  selected: PaywallPlan;
  /** Идёт оплата или восстановление — повторный тап не должен запускать вторую покупку. */
  busy: boolean;
  /** Есть ли цена у нажатого тарифа (магазин, кэш или справочная). */
  hasPrice: boolean;
}>;

export function duoTapAction(input: DuoTapInput): DuoTapAction {
  if (input.busy) return 'ignore_busy';
  if (input.tapped !== input.selected) return input.hasPrice ? 'select' : 'ignore_no_price';
  // зачем: выбранный тариф покупается и без цены — тап сам догрузит предложения магазина (D158, «кнопка покупки всегда активна»).
  return 'buy';
}

/** Журнал каждого нажатия: что нажали, что было выбрано и какое значение решило ветку. */
export function logDuoTap(input: DuoTapInput, action: DuoTapAction): void {
  console.log(`[PAYWALL-DUO] тап tapped=${input.tapped} selected=${input.selected} busy=${String(input.busy)} hasPrice=${String(input.hasPrice)} → ${action}`); // guard-ok: одна строка на нажатие, ранние выходы названы
}
