// Стор-сборка: заглушка app/dev_ai_consent.ts. Согласие на ИИ не подменяется — решает настоящий гейт.
export function setDevAiConsentGranted(): boolean { return false; }
export function setDevAiConsentOverride(): boolean { return false; }
export function getDevAiConsentOverride(): null { return null; }
export function getDevAiConsentGranted(): boolean { return false; }
