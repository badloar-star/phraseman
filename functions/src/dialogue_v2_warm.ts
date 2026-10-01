import { types as nodeTypes } from 'node:util';

/**
 * Прогрев функций Диалогов V2 (владелец 01.10: диалоги «ДОЛЖНЫ» прогреваться заранее).
 *
 * Телефон при показе хаба «Диалоги» / плитки на Главной шлёт { warm: true } в
 * dialogueV2SessionStart и dialogueV2TextTurn (не чаще раза в 10 минут). Экземпляр
 * функции поднимается заранее, и настоящий старт/ход не платит холодный старт.
 *
 * Ответ мгновенный и постоянный: НИЧЕГО не создаётся, OpenAI не вызывается, Firestore
 * не читается, личность/лимиты/квоты не трогаются. Чтобы warm не стал обходом
 * проверок, принимается ТОЛЬКО точная форма { warm: true } (ровно один ключ, значение
 * строго true, обычный объект, не Proxy, без геттеров) — любая другая форма идёт в
 * обычную строгую проверку запроса и отклоняется ею.
 */
export const DIALOGUE_V2_WARM_RESPONSE = Object.freeze({ ok: true as const, warm: true as const });
export type DialogueV2WarmResponse = typeof DIALOGUE_V2_WARM_RESPONSE;

export function isDialogueV2WarmRequest(value: unknown): boolean {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value) || nodeTypes.isProxy(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== 1 || keys[0] !== 'warm') return false;
    const warm = descriptors.warm;
    return Boolean(warm?.enumerable && 'value' in warm && warm.value === true);
  } catch {
    // Враждебный объект — не warm; обычная проверка запроса его отклонит.
    return false;
  }
}

/** Единый лог прогрева: только имя функции, без uid и данных запроса. */
export function logDialogueV2Warm(fn: 'sessionStart' | 'textTurn'): void {
  console.log('[DIALOGUE-V2] warm', JSON.stringify({ fn }));
}
