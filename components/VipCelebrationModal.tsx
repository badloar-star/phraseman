import React, { memo } from 'react';
import PremiumCelebrationModal from './PremiumCelebrationModal';
import type { PromoReward } from './premium_celebration/celebrationLiquidCopy';

// зачем: тонкая обёртка над PremiumCelebrationModal с зелёной палитрой VIP.
// promoCode прокидывается для активации промокода: тогда перед актом 1
// показывается штамп самого кода (см. хореографию v6).
// motionVariant удалён вместе со старым classic/hybrid-разделением — движок
// теперь один.
function VipCelebrationModal({
  visible,
  onClose,
  promoCode = null,
  promoReward = null,
}: {
  visible: boolean;
  onClose: () => void;
  promoCode?: string | null;
  /** Срок, который дал промокод (из ответа сервера) — «Plus на 30 дней» / «Plus навсегда». */
  promoReward?: PromoReward | null;
}) {
  return <PremiumCelebrationModal visible={visible} onClose={onClose} variant="vip" promoCode={promoCode} promoReward={promoReward} />;
}

export default memo(VipCelebrationModal);
