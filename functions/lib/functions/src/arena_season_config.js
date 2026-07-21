"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveArenaSeasonConfig = resolveArenaSeasonConfig;
// ════════════════════════════════════════════════════════════════════════════
// arena_season_config.ts — серверное чтение тюнинга арены/сезона из Firestore.
//
// ОДИН источник правды клиент↔сервер: читаем ТОТ ЖЕ документ remote_config/app
// (ветку numbers), что и клиент через app/remote_flags.ts (ключи arena_sr_win/
// loss/bot_win, arena_season_rollback_steps). Админка пишет их в форме Remote
// Config и в «Пульте». Раньше сервер игнорировал remote_config и держал свои
// хардкод-константы — отсюда риск рассинхрона денежной математики; теперь обе
// стороны читают одно место.
//
// Отдельно от arena_season.ts (которая ОСТАЁТСЯ чистой математикой без firebase-
// admin — юнит-тесты тривиальны). Здесь только async-резолвер.
//
// При отсутствии/ошибке дока → дефолты (поведение как до фичи). Денежная
// математика: fallback обязателен, поведение по умолчанию НЕ меняется.
// ════════════════════════════════════════════════════════════════════════════
const arena_season_1 = require("./arena_season");
const REMOTE_CONFIG_COLLECTION = 'remote_config';
const REMOTE_CONFIG_DOC = 'app';
/**
 * Читает тюнинг арены/сезона из remote_config/app.numbers. НИКОГДА не бросает:
 * при ошибке/отсутствии → дефолты. Один get на вызов — дёшево.
 */
async function resolveArenaSeasonConfig(db) {
    try {
        const snap = await db.collection(REMOTE_CONFIG_COLLECTION).doc(REMOTE_CONFIG_DOC).get();
        const data = snap.data();
        // Ключи лежат в numbers (тот же формат, что пишет админ-форма RC_NUMBER_FIELDS).
        return (0, arena_season_1.arenaSeasonConfigFromData)(data?.numbers);
    }
    catch (e) {
        console.warn('resolveArenaSeasonConfig failed, using defaults', e);
        return { ...arena_season_1.ARENA_SEASON_DEFAULTS };
    }
}
//# sourceMappingURL=arena_season_config.js.map