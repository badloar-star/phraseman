// «У меня Plus» — для своего кольца и метки.
// зачем (владелец 21.10, реестр №6): у других признак приходит в публичной проекции (isPremium = покупка магазина ИЛИ выдача админом ИЛИ
// VIP ИЛИ подарок — functions/src/premium_status.ts isPremiumAccessActive). Для себя берём то же самое из PremiumContext:
// isPremium || isVip || isPro. Вводный полный доступ (isIntroFullAccess) — это пробный доступ, а не Plus: кольца он не даёт.
import { usePremium } from '../PremiumContext';

export function useIsPlus(): boolean {
  const { isPremium, isVip, isPro } = usePremium();
  return isPremium || isVip || isPro;
}
