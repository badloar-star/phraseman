/**
 * ai_dialog_consent.ts — явное согласие на AI-диалоги (ai_dialog_session.tsx —
 * сценарные диалоги, ai_companion_session.tsx — свободный разговор с Компасом).
 *
 * Отдельная фича от «Разбор промаха»/«Объясни проще» (app/ai_explain_consent.ts):
 * другой сетевой вызов (callPremiumDialogSend → functions/src/premium_dialog.ts),
 * другой текст того, что уходит в OpenAI (свободный текст сообщения, а не
 * ответ на конкретное упражнение) — поэтому согласие отдельное, не общий флаг
 * на «всё AI сразу»: пользователь может разрешить один вид AI-фич и отказаться
 * от другого.
 */

import { createAiConsentModule, type AiConsentState } from './ai_consent_factory';

export type AiDialogConsentState = AiConsentState;

const consent = createAiConsentModule('ai_dialog_consent_v1', 'recordAiDialogConsent');

export const isAiDialogConsentGranted = consent.isGranted;
export const getAiDialogConsentState = consent.getState;
export const subscribeAiDialogConsent = consent.subscribe;
export const hasAiDialogConsentDecision = consent.hasDecision;
export const isAiDialogConsentHydrated = consent.isHydrated;
export const hydrateAiDialogConsentFromStorage = consent.hydrateFromStorage;
export const setAiDialogConsent = consent.setConsent;
export const recordAiDialogConsentToCloud = consent.recordToCloud;

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
