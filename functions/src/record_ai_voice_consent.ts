import { createRecordAiConsentCallable } from './record_ai_consent_factory';

/** Records explicit opt-in/opt-out for live MAX voice processing. */
export const recordAiVoiceConsent = createRecordAiConsentCallable('aiVoiceConsent');
