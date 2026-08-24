import React, { memo } from 'react';
import PremiumCelebrationModal from './PremiumCelebrationModal';

// зачем: тонкая обёртка над PremiumCelebrationModal с зелёной палитрой VIP.
// promoCode прокидывается для активации промокода: тогда перед актом 1
// показывается штамп самого кода (см. хореографию v6).
// motionVariant удалён вместе со старым classic/hybrid-разделением — движок
// теперь один.
function VipCelebrationModal({
  visible,
  onClose,
  promoCode = null,
}: {
  visible: boolean;
  onClose: () => void;
  promoCode?: string | null;
}) {
  return <PremiumCelebrationModal visible={visible} onClose={onClose} variant="vip" promoCode={promoCode} />;
}

export default memo(VipCelebrationModal);
