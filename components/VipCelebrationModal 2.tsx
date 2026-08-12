import React from 'react';
import PremiumCelebrationModal from './PremiumCelebrationModal';

export default function VipCelebrationModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return <PremiumCelebrationModal visible={visible} onClose={onClose} variant="vip" />;
}
