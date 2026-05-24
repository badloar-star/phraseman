import {
  shouldShowExitTrialOffer,
  shouldShowPrimaryTrialUi,
} from '../app/paywall_trial_offer';

const baseExitOfferParams = {
  context: 'course_after_lesson3',
  closeReason: 'close' as const,
  viewMode: 'purchase' as const,
  openManageFromSettings: false,
  purchasing: false,
  restoring: false,
  hasStoreTrial: true,
  alreadySeen: false,
  forceTrialUI: false,
};

describe('paywall trial offer timing', () => {
  it('does not show trial copy on the primary paywall for real users', () => {
    expect(shouldShowPrimaryTrialUi({ forceTrialUI: false })).toBe(false);
  });

  it('keeps the primary trial UI available only for admin QA preview', () => {
    expect(shouldShowPrimaryTrialUi({ forceTrialUI: true })).toBe(true);
  });

  it('shows trial copy on the primary paywall opened intentionally from settings', () => {
    expect(shouldShowPrimaryTrialUi({
      forceTrialUI: false,
      source: 'settings_premium',
    })).toBe(true);
  });

  it('shows the 3-day offer as a second attempt after closing the lesson-3 paywall', () => {
    expect(shouldShowExitTrialOffer(baseExitOfferParams)).toBe(true);
  });

  it('shows the 3-day offer from continue-free on the lesson-3 paywall too', () => {
    expect(shouldShowExitTrialOffer({
      ...baseExitOfferParams,
      closeReason: 'continue_free',
    })).toBe(true);
  });

  it('does not show the 3-day offer from unrelated paywalls', () => {
    expect(shouldShowExitTrialOffer({
      ...baseExitOfferParams,
      context: 'arena',
    })).toBe(false);
  });

  it('does not show the exit trial offer without a real store trial or after it was seen', () => {
    expect(shouldShowExitTrialOffer({
      ...baseExitOfferParams,
      hasStoreTrial: false,
    })).toBe(false);

    expect(shouldShowExitTrialOffer({
      ...baseExitOfferParams,
      alreadySeen: true,
    })).toBe(false);
  });
});
