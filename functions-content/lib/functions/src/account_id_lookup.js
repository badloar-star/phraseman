"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAccountByAlias = findAccountByAlias;
exports.verifyAccountHit = verifyAccountHit;
const account_id_1 = require("./account_id");
/**
 * Опознаёт человека по ЛЮБОМУ его старому имени.
 *
 * Возвращает null, если имя неизвестно, — вызывающая сторона обязана
 * продолжить прежним путём. Ошибки чтения тоже дают null: новая ступень не
 * имеет права ронять вход, который до неё работал.
 */
async function findAccountByAlias(db, alias) {
    const clean = String(alias ?? '').trim();
    if (!clean || clean.length > 180)
        return null;
    let snap;
    try {
        snap = await db.collection(account_id_1.ACCOUNT_ID_INDEX).doc((0, account_id_1.accountIdIndexDocId)(clean)).get();
    }
    catch (e) {
        // зачем не глотаем молча (правило проекта): новая ступень отключилась, и
        // это обязано быть видно — иначе она «работает» лишь на бумаге.
        console.warn(JSON.stringify({
            event: 'account_id_lookup_unavailable',
            aliasLength: clean.length,
            message: String(e?.message ?? e).slice(0, 160),
        }));
        return null;
    }
    if (!snap.exists)
        return null;
    const data = snap.data() ?? {};
    const accountId = String(data.accountId ?? '').trim();
    const stableId = String(data.stableId ?? '').trim();
    if (!accountId || !stableId) {
        // Половинчатая запись индекса опаснее её отсутствия: по ней нельзя открыть аккаунт,
        // но можно принять решение. Считаем её отсутствующей и говорим об этом.
        console.warn(JSON.stringify({
            event: 'account_id_index_incomplete',
            hasAccountId: Boolean(accountId),
            hasStableId: Boolean(stableId),
        }));
        return null;
    }
    return {
        accountId,
        stableId,
        matchedAlias: clean,
        matchedKind: String(data.kind ?? 'unknown'),
    };
}
/**
 * Проверяет, что найденный аккаунт действительно жив и принадлежит этому имени.
 *
 * зачем отдельной проверкой: индекс — карта, а не источник правды. Аккаунт мог
 * быть слит или скрыт уже после заполнения таблицы, и вести человека по
 * устаревшей записи нельзя — ровно так и появляются «пустые профили».
 *
 * `ownerAuthUid` (аудит 2026-09-02): при опознании на входе принимаем только
 * документ, которым этот uid владеет по firebaseAuthUid — ровно то, что нашёл
 * бы прежний авторитетный запрос. Псевдоним провайдера (linkedAuth.providerUid)
 * и легаси-документ с id = uid — лишь подсказки: прежняя лестница решала по
 * ним сама, и менять её решения карта не имеет права.
 */
async function verifyAccountHit(db, hit, ownerAuthUid) {
    let snap;
    try {
        snap = await db.collection('users').doc(hit.stableId).get();
    }
    catch (e) {
        console.warn(JSON.stringify({
            event: 'account_id_lookup_verify_failed',
            message: String(e?.message ?? e).slice(0, 160),
        }));
        return false;
    }
    if (!snap.exists)
        return false;
    const data = snap.data() ?? {};
    if (data.identityHidden === true)
        return false;
    // Имя в документе обязано совпасть с именем в индексе: расхождение означает,
    // что карта устарела, и доверять ей нельзя.
    if (String(data[account_id_1.ACCOUNT_ID_FIELD] ?? '').trim() !== hit.accountId)
        return false;
    if (ownerAuthUid === undefined)
        return true;
    const owner = String(data.firebaseAuthUid ?? '').trim();
    if (owner === ownerAuthUid)
        return true;
    // Ранний выход обязан быть виден (правило проекта): по этому событию видно,
    // сколько входов карта отдаёт прежней лестнице и почему.
    console.log(JSON.stringify({
        event: 'account_id_lookup_not_owned',
        matchedKind: hit.matchedKind,
        ownerPresent: Boolean(owner),
        selfKeyed: hit.stableId === ownerAuthUid,
    }));
    return false;
}
//# sourceMappingURL=account_id_lookup.js.map