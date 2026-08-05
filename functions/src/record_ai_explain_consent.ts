import { createRecordAiConsentCallable } from './record_ai_consent_factory';

/**
 * Records the user's explicit opt-in/opt-out for the AI mistake-explanation
 * features (inline breakdown + «Объясни проще» ELI5). See
 * record_ai_consent_factory.ts for the shared write/validate mechanics.
 */
export const recordAiExplainConsent = createRecordAiConsentCallable('aiExplainConsent');
