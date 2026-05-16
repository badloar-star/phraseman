export type PaywallCloseReason = 'close' | 'continue_free';
export type PaywallViewMode = 'purchase' | 'manage' | 'success';

export function shouldShowPrimaryTrialUi(params: {
  forceTrialUI: boolean;
  source?: string | string[];
}): boolean {
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  return params.forceTrialUI || source === 'settings_premium';
}

export function shouldShowExitTrialOffer(params: {
  context: string;
  closeReason: PaywallCloseReason;
  viewMode: PaywallViewMode;
  openManageFromSettings: boolean;
  purchasing: boolean;
  restoring: boolean;
  hasStoreTrial: boolean;
  alreadySeen: boolean;
  forceTrialUI: boolean;
}): boolean {
  return (
    params.context === 'course_after_lesson3' &&
    (params.closeReason === 'close' || params.closeReason === 'continue_free') &&
    params.viewMode === 'purchase' &&
    !params.openManageFromSettings &&
    !params.purchasing &&
    !params.restoring &&
    params.hasStoreTrial &&
    !params.alreadySeen &&
    !params.forceTrialUI
  );
}
