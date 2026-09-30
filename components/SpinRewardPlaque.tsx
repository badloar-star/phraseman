import { memo } from 'react';

export type SpinRewardPlaqueProps = {
  amount: 1;
  receiptId: string;
  visible: boolean;
  onComplete: () => void;
  autoCompleteMs?: number;
  soundScope?: string;
  staticPresentation?: boolean;
  testID?: string;
};

/**
 * Retired presentation boundary. Legacy receipts may still reach the result
 * screen, but the removed Spin feature must never render or play a reward.
 */
export const SpinRewardPlaque = memo(function SpinRewardPlaque(props: SpinRewardPlaqueProps) {
  void props;
  return null;
});
