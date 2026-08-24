export type PaywallCloseReason = 'close' | 'continue_free';
export type PaywallViewMode = 'purchase' | 'manage';

export function shouldShowPrimaryTrialUi(params: {
  forceTrialUI: boolean;
  source?: string | string[];
  /**
   * Магазин реально отдаёт intro/free-фазу для текущего пользователя
   * (проверено через storeProductHasTrialIntro + кулдаун). Когда true —
   * триальный фрейминг показывается НА ВСЕХ контекстных входах, а не только
   * из настроек. Это честно (триал есть в сторе) и снимает главную потерю
   * конверсии: раньше юзер видел полную цену вместо «3 дня бесплатно».
   */
  hasStoreTrial?: boolean;
}): boolean {
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  return (
    params.forceTrialUI ||
    params.hasStoreTrial === true ||
    source === 'settings_premium'
  );
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
  // План #7: расширено на больше high-value контекстов — exit-offer «0–30 сек» даёт
  // самый высокий ROI среди re-engagement-механик (Superwall: 17% revenue от abandon).
  const EXIT_TRIAL_CONTEXTS = new Set([
    'course_after_lesson3', 'no_energy',
    'intro_ended', 'streak', 'flashcard_limit',
  ]);
  return (
    EXIT_TRIAL_CONTEXTS.has(params.context) &&
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
