"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRemoteBool = resolveRemoteBool;
exports.pickRemoteBool = pickRemoteBool;
exports.aiGloballyDisabled = aiGloballyDisabled;
const REMOTE_CONFIG_COLLECTION = 'remote_config';
const REMOTE_CONFIG_DOC = 'app';
function coerceBool(value) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        if (v === 'true' || v === '1' || v === 'yes')
            return true;
        if (v === 'false' || v === '0' || v === 'no')
            return false;
    }
    if (typeof value === 'number') {
        if (value === 1)
            return true;
        if (value === 0)
            return false;
    }
    return null;
}
/**
 * Читает один bool-флаг из remote_config/app.bools.
 * @param fallback значение по умолчанию (= хардкод-дефолт клиента, обычно true для gate_*).
 */
async function resolveRemoteBool(db, key, fallback) {
    try {
        const snap = await db.collection(REMOTE_CONFIG_COLLECTION).doc(REMOTE_CONFIG_DOC).get();
        const bools = snap.data()?.bools;
        const coerced = coerceBool(bools?.[key]);
        return coerced ?? fallback;
    }
    catch (e) {
        console.warn('resolveRemoteBool failed, using fallback', key, e);
        return fallback;
    }
}
/** Чистая функция для тестов: извлекает bool-флаг из объекта bools. */
function pickRemoteBool(bools, key, fallback) {
    return coerceBool(bools?.[key]) ?? fallback;
}
/**
 * Глобальный рубильник всего ИИ (remote flag `ai_global_disable`). TRUE = весь ИИ
 * выключен админом в «Пульте». Серверный дубль клиентского isAiGloballyDisabled —
 * чтобы клиентский гейт нельзя было обойти прямым вызовом callable. Дефолт FALSE
 * (ИИ работает). При ошибке чтения → FALSE (не блокируем ИИ из-за сбоя конфига).
 */
async function aiGloballyDisabled(db) {
    return resolveRemoteBool(db, 'ai_global_disable', false);
}
//# sourceMappingURL=remote_gates.js.map