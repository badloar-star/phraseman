import { createRecordAiConsentCallable } from './record_ai_consent_factory';

/**
 * Records the user's explicit opt-in/opt-out for AI dialogs (scenario
 * ai_dialog_session.tsx + free-form ai_companion_session.tsx). Separate field
 * from aiExplainConsent — a different feature, a different piece of text sent
 * to OpenAI, a decision the user can make independently of mistake-explain.
 */
export const recordAiDialogConsent = createRecordAiConsentCallable('aiDialogConsent');
