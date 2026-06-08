import React, { memo } from 'react';
import PremiumCelebrationModal from './PremiumCelebrationModal';

function VipCelebrationModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return <PremiumCelebrationModal visible={visible} onClose={onClose} variant="vip" />;
}

export default memo(VipCelebrationModal);
