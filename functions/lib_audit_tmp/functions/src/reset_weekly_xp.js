"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetWeeklyXp = resetWeeklyXp;
const admin = __importStar(require("firebase-admin"));
/**
 * Returns ISO date (YYYY-MM-DD) of the most recent Monday 00:00 UTC.
 * Mirrors app/weekly_xp.ts:getCurrentWeekStartIso so client and server agree
 * on the boundary. (Cron fires Monday 00:00 UTC → Monday is 'now'.)
 */
function getCurrentWeekStartIso(now = new Date()) {
    const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon, ...
    const daysSinceMonday = (utcDay + 6) % 7;
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday));
    const yyyy = monday.getUTCFullYear();
    const mm = String(monday.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(monday.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}
/**
 * Resets progress.weekly_xp to 0 for ALL users. Does NOT touch
 * progress.user_total_xp — XP-04 invariant: total xp survives the reset.
 *
 * Pagination: orderBy('__name__'), limit(200), batches of 400 (mirrors
 * functions/src/sync_leaderboard.ts pattern — proven for ~50k users).
 *
 * Side effect: also sets progress.weekly_xp_period_start to the current
 * Monday ISO date so clients see a fresh period without local recompute.
 */
async function resetWeeklyXp() {
    const db = admin.firestore();
    const period = getCurrentWeekStartIso();
    const BATCH_SIZE = 400;
    const PAGE_SIZE = 200;
    let batch = db.batch();
    let updated = 0;
    let skipped = 0;
    let lastDoc = null;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        // зачем: обнуление недельного XP не читает НИ ОДНОГО поля пользователя — оно просто
        // перезаписывает progress.weekly_xp. Раньше страница тянула документы целиком, а это
        // самые «толстые» доки в базе (весь progress). Тарификация чтений не меняется, но
        // трафик и память функции падают на порядок. guard-ok: .select() без полей намеренно —
        // нужны только ссылки на документы для batch.set.
        let query = db.collection('users')
            .orderBy('__name__')
            .limit(PAGE_SIZE)
            .select();
        if (lastDoc)
            query = query.startAfter(lastDoc);
        const snap = await query.get();
        if (snap.empty)
            break;
        lastDoc = snap.docs[snap.docs.length - 1];
        for (const doc of snap.docs) {
            // При .select() тело документа не запрашивается: doc.data() отдаёт пустой объект, и
            // прежняя проверка «данные не объект» больше не различает валидные доки. Существование
            // документа гарантировано самим попаданием в результат запроса, поэтому пропускать
            // здесь нечего — счётчик skipped остаётся в контракте функции и в логах ради
            // совместимости, но при выборке-по-ссылкам он честно нулевой.
            batch.set(doc.ref, {
                progress: {
                    weekly_xp: '0',
                    weekly_xp_period_start: period,
                },
            }, { merge: true });
            updated++;
            if (updated % BATCH_SIZE === 0) {
                await batch.commit();
                batch = db.batch();
            }
        }
    }
    if (updated % BATCH_SIZE !== 0) {
        await batch.commit();
    }
    console.log(`resetWeeklyXp: updated=${updated}, skipped=${skipped}, period=${period}`);
    return { updated, skipped };
}
//# sourceMappingURL=reset_weekly_xp.js.map