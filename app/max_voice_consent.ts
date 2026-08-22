/**
 * Explicit consent for live MAX voice processing, post-call review, and the
 * learner-owned tutor memory. This is intentionally separate from text AI
 * dialogs and mistake explanations.
 */
import { createAiConsentModule, type AiConsentState } from './ai_consent_factory';

export type AiVoiceConsentState = AiConsentState;

const consent = createAiConsentModule('ai_voice_consent_v1', 'recordAiVoiceConsent');

export const isAiVoiceConsentGranted = consent.isGranted;
export const getAiVoiceConsentState = consent.getState;
export const subscribeAiVoiceConsent = consent.subscribe;
export const hasAiVoiceConsentDecision = consent.hasDecision;
export const isAiVoiceConsentHydrated = consent.isHydrated;
export const hydrateAiVoiceConsentFromStorage = consent.hydrateFromStorage;
export const setAiVoiceConsent = consent.setConsent;
export const recordAiVoiceConsentToCloud = consent.recordToCloud;

export default function __RouteShim() {
  return null;
}
