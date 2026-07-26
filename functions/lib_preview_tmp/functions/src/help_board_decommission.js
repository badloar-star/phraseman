"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compassChatDailyCronDisabled = exports.helpBoardCompassRetryCronDisabled = exports.helpBoardGenerateCompassForTopicDisabled = exports.HELP_BOARD_DECOMMISSIONED_EXPORTS = exports.HELP_BOARD_DECOMMISSIONED_MESSAGE = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const callable_options_1 = require("./callable_options");
/*
 * Надгробия Help Board и Compass-чата.
 *
 * зачем: владелец удалил обе фичи из кода коммитом 9af87817d (2026-07-16,
 * "remove legacy user chat surfaces") вместе с клиентскими экранами и правками
 * политики конфиденциальности. Но функции остались задеплоенными в проде —
 * старые клиенты, не получившие обновление, продолжают их звать.
 *
 * Просто удалить их с сервера нельзя: у пользователей со старой версией
 * приложения экран доски помощи начнёт падать с ошибкой соединения. Поэтому
 * повторяем приём, уже применённый к Арене (quiz_arena_decommission.ts):
 * имена функций остаются, сигнатуры и расписания те же, но внутри — вежливый
 * отказ. Никаких чтений и записей в Firestore, то есть нулевая стоимость.
 *
 * Надгробия живут, пока старые версии клиента не вымрут; после этого их можно
 * снять вместе с самими функциями.
 */
const REGION = 'us-central1';
exports.HELP_BOARD_DECOMMISSIONED_MESSAGE = 'Help Board is no longer available.';
/*
 * Вызываемые из приложения: отвечают отказом, ничего не трогая.
 * зачем: enforceAppCheck берём тот же, что был у оригиналов
 * (ENFORCE_APP_CHECK_OPENAI), иначе старый клиент упрётся в ошибку App Check
 * вместо понятного «раздел недоступен».
 */
const helpBoardDisabledCallable = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK_OPENAI }, async () => {
    throw new https_1.HttpsError('failed-precondition', exports.HELP_BOARD_DECOMMISSIONED_MESSAGE);
});
/** Кроны и триггеры: живут по прежнему расписанию, но не делают ничего. */
const retiredNoop = async () => {
    // зачем: пустое тело вместо удаления — Firestore не читается, счёт не растёт.
};
/*
 * Имена и параметры совпадают с удалёнными оригиналами (functions/src/help_board.ts
 * и compass_chat_cron.ts в prod-snapshot/all-development-integration-20260721),
 * иначе деплой создал бы новые функции вместо замены живых.
 */
exports.HELP_BOARD_DECOMMISSIONED_EXPORTS = {
    helpBoardCreateTopic: helpBoardDisabledCallable,
    helpBoardAddComment: helpBoardDisabledCallable,
    helpBoardVote: helpBoardDisabledCallable,
    helpBoardReport: helpBoardDisabledCallable,
    helpBoardDeleteMyTopic: helpBoardDisabledCallable,
    helpBoardDeleteCompassAnswer: helpBoardDisabledCallable,
    helpBoardAdminModerate: helpBoardDisabledCallable,
    compassChatRunNow: helpBoardDisabledCallable,
};
/** Был onDocumentCreated на help_board_topics/{topicId} — генерация ответа Компаса. */
exports.helpBoardGenerateCompassForTopicDisabled = (0, firestore_1.onDocumentCreated)({
    region: REGION,
    document: 'help_board_topics/{topicId}',
}, retiredNoop);
/** Был почасовой ретрай генерации ответов Компаса. */
exports.helpBoardCompassRetryCronDisabled = (0, scheduler_1.onSchedule)({
    region: REGION,
    schedule: '0 * * * *',
    timeZone: 'UTC',
}, retiredNoop);
/** Компас постил в чат лиги по понедельникам; чат удалён — постить некуда. */
exports.compassChatDailyCronDisabled = (0, scheduler_1.onSchedule)({
    region: REGION,
    schedule: 'every monday 09:00',
    timeZone: 'UTC',
}, retiredNoop);
//# sourceMappingURL=help_board_decommission.js.map