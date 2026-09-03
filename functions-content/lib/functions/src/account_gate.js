"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readAuthAccountState = readAuthAccountState;
exports.readStableAccountState = readStableAccountState;
exports.readStableAccountStateInTx = readStableAccountStateInTx;
exports.readAuthAccountStateInTx = readAuthAccountStateInTx;
exports.accountStateFromSnapshots = accountStateFromSnapshots;
exports.assertAccountUsable = assertAccountUsable;
exports.assertStableAccountUsable = assertStableAccountUsable;
exports.assertAuthAccountUsable = assertAuthAccountUsable;
exports.assertStableGroupUsable = assertStableGroupUsable;
const https_1 = require("firebase-functions/v2/https");
const account_delete_job_1 = require("./account_delete_job");
/**
 * Читает состояние по метке.
 *
 * Отличать grace от смерти по факту СУЩЕСТВОВАНИЯ метки нельзя: маркер,
 * надгробие и постоянные отказы пишутся сразу при подаче заявки и живут все
 * 14 дней. Единственный честный признак — поле `status`.
 *
 * Тип дедлайна проверяется строго: `Number('9999999999999')` дало бы валидное
 * число, и человеку пообещали бы восстановление, которого сервер не выполнит
 * (он читает то же поле числом). При любом сомнении отвечаем строго — «мёртв».
 */
function readMarkerState(snap, nowMs) {
    if (!snap?.exists)
        return 'none';
    const data = snap.data() ?? {};
    if (String(data.status ?? '') !== 'pending')
        return 'deleted';
    const deadline = data.graceDeadlineMs;
    if (typeof deadline !== 'number' || !Number.isFinite(deadline) || deadline <= 0)
        return 'deleted';
    return deadline > nowMs ? { grace: deadline } : 'deleted';
}
function verdictFrom(reads, subject, nowMs) {
    const state = readMarkerState(reads.marker, nowMs);
    if (typeof state === 'object') {
        return { kind: 'grace', graceDeadlineMs: state.grace, subject };
    }
    // Постоянный отказ намеренно НЕ несёт grace: он ставится закрытием личности
    // и снимается только восстановлением. Метка со статусом решает первой; если
    // её нет, а отказ стоит — аккаунт мёртв.
    if (state === 'deleted' || reads.denial?.exists)
        return { kind: 'deleted', subject };
    return { kind: 'active' };
}
/**
 * Состояние по uid входа (Firebase Auth).
 *
 * Оба чтения обёрнуты: недоступность базы НЕ должна выглядеть как «аккаунт
 * жив» — это открыло бы доступ к удаляемому аккаунту при сбое сети.
 */
async function readAuthAccountState(db, authUid, nowMs = Date.now()) {
    const [marker, denial] = await Promise.all([
        db.collection(account_delete_job_1.ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid).get(),
        db.collection(account_delete_job_1.ACCOUNT_DELETE_PERMANENT_DENIALS)
            .doc((0, account_delete_job_1.accountDeletePermanentDenialId)(authUid)).get(),
    ]);
    return verdictFrom({ marker, denial }, 'auth', nowMs);
}
/** Состояние по стабильному id аккаунта. */
async function readStableAccountState(db, stableId, nowMs = Date.now()) {
    const [marker, denial] = await Promise.all([
        db.collection(account_delete_job_1.ACCOUNT_DELETE_TOMBSTONES).doc(stableId).get(),
        db.collection(account_delete_job_1.ACCOUNT_DELETE_PERMANENT_DENIALS)
            .doc((0, account_delete_job_1.accountDeletePermanentDenialId)(stableId)).get(),
    ]);
    return verdictFrom({ marker, denial }, 'stable', nowMs);
}
/**
 * То же, но внутри транзакции — чтобы решение не устарело между чтением и
 * записью. Гонка «проверили живой → пока писали, человек удалился» реальна:
 * заявка ставится одним тапом.
 */
async function readStableAccountStateInTx(tx, db, stableId, nowMs = Date.now()) {
    const [marker, denial] = await Promise.all([
        tx.get(db.collection(account_delete_job_1.ACCOUNT_DELETE_TOMBSTONES).doc(stableId)),
        tx.get(db.collection(account_delete_job_1.ACCOUNT_DELETE_PERMANENT_DENIALS)
            .doc((0, account_delete_job_1.accountDeletePermanentDenialId)(stableId))),
    ]);
    return verdictFrom({ marker, denial }, 'stable', nowMs);
}
/** То же для uid входа внутри транзакции. */
async function readAuthAccountStateInTx(tx, db, authUid, nowMs = Date.now()) {
    const [marker, denial] = await Promise.all([
        tx.get(db.collection(account_delete_job_1.ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid)),
        tx.get(db.collection(account_delete_job_1.ACCOUNT_DELETE_PERMANENT_DENIALS)
            .doc((0, account_delete_job_1.accountDeletePermanentDenialId)(authUid))),
    ]);
    return verdictFrom({ marker, denial }, 'auth', nowMs);
}
/**
 * Решение по УЖЕ ПРОЧИТАННЫМ снапшотам.
 *
 * зачем отдельно от readStableAccountState: внутри транзакций метки читаются
 * вместе с остальными документами одним пакетом, и повторное чтение стоило бы
 * лишних обращений к базе на каждый вход. Смысл при этом обязан быть ТОТ ЖЕ —
 * поэтому оба пути сходятся в одной функции verdictFrom.
 *
 * Принимает несколько надгробий разом (аккаунт + его псевдонимы после слияний):
 * grace хотя бы на одном означает, что человеку положено предложение вернуть
 * аккаунт, а не пустой профиль.
 */
function accountStateFromSnapshots(input, nowMs = Date.now()) {
    const markers = [input.marker, ...(input.markers ?? [])].filter(Boolean);
    const denials = [input.denial, ...(input.denials ?? [])].filter(Boolean);
    const denialExists = denials.some((snap) => snap?.exists);
    // Grace важнее смерти: если хоть одна метка ещё в 14 днях — аккаунт жив.
    for (const marker of markers) {
        const state = readMarkerState(marker, nowMs);
        if (typeof state === 'object') {
            return { kind: 'grace', graceDeadlineMs: state.grace, subject: input.subject };
        }
    }
    if (markers.some((m) => readMarkerState(m, nowMs) === 'deleted') || denialExists) {
        return { kind: 'deleted', subject: input.subject };
    }
    return { kind: 'active' };
}
/**
 * Единственная точка, где отказ превращается в ошибку для клиента.
 *
 * Коды намеренно РАЗНЫЕ и это принципиально:
 *   • `account_delete_pending` — аккаунт жив, приложение обязано предложить
 *     «Восстановить аккаунт?»;
 *   • `identity_retired` — аккаунта больше нет, открывается чистый профиль.
 * Схлопывание этих двух кодов в один и было главной дырой, найденной 01.09:
 * человек внутри 14 дней молча получал пустой профиль вместо предложения
 * вернуть свой прогресс.
 */
function assertAccountUsable(state) {
    if (state.kind === 'active')
        return;
    if (state.kind === 'grace') {
        throw new https_1.HttpsError('failed-precondition', 'account_delete_pending', {
            subject: state.subject,
            graceDeadlineMs: state.graceDeadlineMs,
            recovery: 'offer_restore',
        });
    }
    throw new https_1.HttpsError('failed-precondition', 'identity_retired', {
        subject: state.subject,
        recovery: 'create_fresh_anonymous',
    });
}
/** Короткая форма для самого частого случая: прочитать и сразу отказать. */
async function assertStableAccountUsable(db, stableId, nowMs = Date.now()) {
    assertAccountUsable(await readStableAccountState(db, stableId, nowMs));
}
/** То же по uid входа. */
async function assertAuthAccountUsable(db, authUid, nowMs = Date.now()) {
    assertAccountUsable(await readAuthAccountState(db, authUid, nowMs));
}
/**
 * Проверка группы личностей разом (аккаунт + его псевдонимы после слияний).
 *
 * Отказ выдаёт ПЕРВАЯ мёртвая личность, но grace имеет приоритет над смертью:
 * если хоть одна личность ещё в 14 днях, человеку положено предложение
 * восстановить, а не пустой профиль.
 */
async function assertStableGroupUsable(db, stableIds, nowMs = Date.now()) {
    const unique = [...new Set(stableIds.map((id) => String(id ?? '').trim()).filter(Boolean))];
    if (unique.length === 0)
        return;
    const states = await Promise.all(unique.map((id) => readStableAccountState(db, id, nowMs)));
    const grace = states.find((st) => st.kind === 'grace');
    if (grace)
        assertAccountUsable(grace);
    const dead = states.find((st) => st.kind === 'deleted');
    if (dead)
        assertAccountUsable(dead);
}
//# sourceMappingURL=account_gate.js.map