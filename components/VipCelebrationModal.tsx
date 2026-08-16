import React, { memo } from 'react';
import PremiumCelebrationModal from './PremiumCelebrationModal';

// зачем: тонкая обёртка над PremiumCelebrationModal (тот уже умеет гибрид) —
// пробрасываем motionVariant, чтобы VIP-празднование включалось тем же флагом.
function VipCelebrationModal({
  visible,
  onClose,
  motionVariant = 'classic',
}: {
  visible: boolean;
  onClose: () => void;
  motionVariant?: 'classic' | 'hybrid';
}) {
  return <PremiumCelebrationModal visible={visible} onClose={onClose} variant="vip" motionVariant={motionVariant} />;
}

export default memo(VipCelebrationModal);
