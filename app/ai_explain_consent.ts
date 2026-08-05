/**
 * ai_explain_consent.ts — явное согласие на AI-разбор ошибок в уроках
 * («Разбор промаха» + «Объясни проще»).
 *
 * Юридический смысл: обе фичи отправляют текст ответа пользователя и
 * правильный ответ стороннему провайдеру ИИ (OpenAI) — см. Privacy Policy,
 * раздел 11. До явного согласия эти фичи не должны запускаться → дефолт
 * `false`, карточка/кнопка не рендерятся вовсе (не просто скрыты стилем,
 * см. app/use_mistake_explain.ts). Пользователь может отозвать согласие в
 * настройках в любой момент.
 *
 * Тонкая обёртка над app/ai_consent_factory.ts — там общая механика (снапшот
 * в памяти + гидрация + запись в облако), здесь только имена под эту фичу.
 */

import { createAiConsentModule, type AiConsentState } from './ai_consent_factory';

export type AiExplainConsentState = AiConsentState;

const consent = createAiConsentModule('ai_explain_consent_v1', 'recordAiExplainConsent');

/** Синхронный геттер для гейта в use_mistake_explain.ts. */
export const isAiExplainConsentGranted = consent.isGranted;
export const getAiExplainConsentState = consent.getState;
export const subscribeAiExplainConsent = consent.subscribe;
/** Сделан ли уже выбор (нужно ли показывать модалку согласия). */
export const hasAiExplainConsentDecision = consent.hasDecision;
export const isAiExplainConsentHydrated = consent.isHydrated;
/** Вызывать в app bootstrap рядом с hydrateAnalyticsConsentFromStorage. */
export const hydrateAiExplainConsentFromStorage = consent.hydrateFromStorage;
/** Записать выбор пользователя (модалка согласия при первой ошибке, настройки). */
export const setAiExplainConsent = consent.setConsent;
/**
 * Best-effort облачная запись — источник правды остаётся локальным (см.
 * setAiExplainConsent выше), это только видимость для админки (owner rule:
 * "тронул данные — видимость в админке"). Ошибка сети не должна ронять UI.
 */
export const recordAiExplainConsentToCloud = consent.recordToCloud;

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
