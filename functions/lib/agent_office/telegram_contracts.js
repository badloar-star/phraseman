"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_TELEGRAM_WEBHOOK_BODY_BYTES = exports.MAX_TELEGRAM_APPROVAL_TTL_MS = exports.AGENT_TELEGRAM_TOKEN_SCHEMA_VERSION = void 0;
exports.telegramApprovalTokenHash = telegramApprovalTokenHash;
exports.telegramApprovalTokenPath = telegramApprovalTokenPath;
exports.parseTelegramApprovalCommand = parseTelegramApprovalCommand;
exports.parseVerifiedTelegramApprovalUpdate = parseVerifiedTelegramApprovalUpdate;
exports.parseTelegramCallbackUpdate = parseTelegramCallbackUpdate;
exports.parseAgentTelegramApprovalToken = parseAgentTelegramApprovalToken;
exports.parseTelegramApprovalRuntimeConfig = parseTelegramApprovalRuntimeConfig;
const node_crypto_1 = require("node:crypto");
const https_1 = require("firebase-functions/v2/https");
const contracts_1 = require("./contracts");
exports.AGENT_TELEGRAM_TOKEN_SCHEMA_VERSION = 1;
exports.MAX_TELEGRAM_APPROVAL_TTL_MS = 10 * 60 * 1000;
exports.MAX_TELEGRAM_WEBHOOK_BODY_BYTES = 16 * 1024;
function invalid(message) {
    throw new https_1.HttpsError('invalid-argument', message);
}
function row(value, label) {
    if (!(0, contracts_1.isRecord)(value))
        invalid(`${label} must be an object`);
    return value;
}
function telegramId(value, label, allowNegative) {
    const result = typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value;
    if (typeof result !== 'string')
        invalid(`${label} is invalid`);
    const pattern = allowNegative ? /^-?[1-9][0-9]{0,19}$/ : /^[1-9][0-9]{0,19}$/;
    if (!pattern.test(result))
        invalid(`${label} is invalid`);
    return result;
}
function nullableInteger(value, label) {
    return value === null ? null : (0, contracts_1.parseNonNegativeInteger)(value, label);
}
function nullableHash(value, label) {
    return value === null ? null : (0, contracts_1.parseHash)(value, label);
}
function nullableApprovalId(value, label) {
    return value === null ? null : (0, contracts_1.parseHash)(value, label);
}
function telegramApprovalTokenHash(nonce) {
    return (0, node_crypto_1.createHash)('sha256').update(nonce, 'utf8').digest('hex');
}
function telegramApprovalTokenPath(tokenIdHash) {
    return `agent_telegram_tokens/${(0, contracts_1.parseHash)(tokenIdHash, 'tokenIdHash')}`;
}
function parseTelegramApprovalCommand(value) {
    if (typeof value !== 'string' || value.length > 64)
        invalid('Telegram approval command is invalid');
    const match = /^\/(authorize|reject) ([A-Za-z0-9_-]{32,43})$/.exec(value);
    if (!match)
        invalid('Telegram approval command is invalid');
    return Object.freeze({ verb: match[1], nonce: match[2] });
}
function parseVerifiedTelegramApprovalUpdate(value) {
    const input = row(value, 'verified Telegram update');
    (0, contracts_1.assertExactKeys)(input, ['verification', 'updateId', 'callbackQueryId', 'chatId', 'userId', 'commandText'], 'verified Telegram update');
    if (input.verification !== 'verified')
        throw new https_1.HttpsError('permission-denied', 'Telegram identity is not verified');
    const updateId = telegramId(input.updateId, 'verified Telegram update.updateId', false);
    if (typeof input.callbackQueryId !== 'string' || !/^[A-Za-z0-9_-]{8,160}$/.test(input.callbackQueryId)) {
        invalid('verified Telegram update.callbackQueryId is invalid');
    }
    parseTelegramApprovalCommand(input.commandText);
    return Object.freeze({
        verification: 'verified',
        updateId,
        callbackQueryId: input.callbackQueryId,
        chatId: telegramId(input.chatId, 'verified Telegram update.chatId', true),
        userId: telegramId(input.userId, 'verified Telegram update.userId', false),
        commandText: input.commandText,
    });
}
function parseTelegramCallbackUpdate(value) {
    const input = row(value, 'Telegram update');
    const updateId = telegramId(input.update_id, 'Telegram update.update_id', false);
    const callback = row(input.callback_query, 'Telegram update.callback_query');
    const from = row(callback.from, 'Telegram update.callback_query.from');
    const message = row(callback.message, 'Telegram update.callback_query.message');
    const chat = row(message.chat, 'Telegram update.callback_query.message.chat');
    if (from.is_bot !== false)
        throw new https_1.HttpsError('permission-denied', 'Telegram bot identity is not allowed');
    if (chat.type !== 'private')
        throw new https_1.HttpsError('permission-denied', 'Telegram approval chat must be private');
    if (typeof callback.id !== 'string' || !/^[A-Za-z0-9_-]{8,160}$/.test(callback.id))
        invalid('Telegram callback id is invalid');
    if (typeof callback.data !== 'string' || callback.data.length > 64)
        invalid('Telegram callback data is invalid');
    const match = /^ao1:(a|r):([A-Za-z0-9_-]{32,43})$/.exec(callback.data);
    if (!match)
        invalid('Telegram callback data is invalid');
    const verb = match[1] === 'a' ? 'authorize' : 'reject';
    return Object.freeze({
        verification: 'verified',
        updateId,
        callbackQueryId: callback.id,
        chatId: telegramId(chat.id, 'Telegram update.callback_query.message.chat.id', true),
        userId: telegramId(from.id, 'Telegram update.callback_query.from.id', false),
        commandText: `/${verb} ${match[2]}`,
    });
}
function parseAgentTelegramApprovalToken(value) {
    const input = row(value, 'AgentTelegramApprovalToken');
    (0, contracts_1.assertExactKeys)(input, [
        'schemaVersion', 'tokenIdHash', 'status', 'ownerUid', 'telegramChatId', 'telegramUserId',
        'permittedVerb', 'caseId', 'expectedCaseRevision', 'recommendationId', 'recommendationRevision',
        'recommendationContentHash', 'controlRevision', 'issuedAtMs', 'validUntilMs', 'consumedAtMs',
        'consumedApprovalId', 'consumedUpdateIdHash',
    ], 'AgentTelegramApprovalToken');
    if (input.schemaVersion !== exports.AGENT_TELEGRAM_TOKEN_SCHEMA_VERSION)
        invalid('AgentTelegramApprovalToken schemaVersion is invalid');
    if (input.status !== 'active' && input.status !== 'consumed' && input.status !== 'revoked')
        invalid('AgentTelegramApprovalToken status is invalid');
    if (input.permittedVerb !== 'authorize' && input.permittedVerb !== 'reject')
        invalid('AgentTelegramApprovalToken permittedVerb is invalid');
    const issuedAtMs = (0, contracts_1.parseNonNegativeInteger)(input.issuedAtMs, 'AgentTelegramApprovalToken.issuedAtMs');
    const validUntilMs = (0, contracts_1.parseNonNegativeInteger)(input.validUntilMs, 'AgentTelegramApprovalToken.validUntilMs');
    if (validUntilMs <= issuedAtMs || validUntilMs - issuedAtMs > exports.MAX_TELEGRAM_APPROVAL_TTL_MS) {
        invalid('AgentTelegramApprovalToken TTL is invalid');
    }
    const consumedAtMs = nullableInteger(input.consumedAtMs, 'AgentTelegramApprovalToken.consumedAtMs');
    const consumedApprovalId = nullableApprovalId(input.consumedApprovalId, 'AgentTelegramApprovalToken.consumedApprovalId');
    const consumedUpdateIdHash = nullableHash(input.consumedUpdateIdHash, 'AgentTelegramApprovalToken.consumedUpdateIdHash');
    const consumedFieldsPresent = consumedAtMs !== null && consumedApprovalId !== null && consumedUpdateIdHash !== null;
    if (input.status === 'consumed' ? !consumedFieldsPresent : consumedAtMs !== null || consumedApprovalId !== null || consumedUpdateIdHash !== null) {
        invalid('AgentTelegramApprovalToken consumption state is invalid');
    }
    return Object.freeze({
        schemaVersion: 1,
        tokenIdHash: (0, contracts_1.parseHash)(input.tokenIdHash, 'AgentTelegramApprovalToken.tokenIdHash'),
        status: input.status,
        ownerUid: (0, contracts_1.parseIdentifier)(input.ownerUid, 'AgentTelegramApprovalToken.ownerUid'),
        telegramChatId: telegramId(input.telegramChatId, 'AgentTelegramApprovalToken.telegramChatId', true),
        telegramUserId: telegramId(input.telegramUserId, 'AgentTelegramApprovalToken.telegramUserId', false),
        permittedVerb: input.permittedVerb,
        caseId: (0, contracts_1.parseIdentifier)(input.caseId, 'AgentTelegramApprovalToken.caseId'),
        expectedCaseRevision: (0, contracts_1.parsePositiveInteger)(input.expectedCaseRevision, 'AgentTelegramApprovalToken.expectedCaseRevision'),
        recommendationId: (0, contracts_1.parseIdentifier)(input.recommendationId, 'AgentTelegramApprovalToken.recommendationId'),
        recommendationRevision: (0, contracts_1.parsePositiveInteger)(input.recommendationRevision, 'AgentTelegramApprovalToken.recommendationRevision'),
        recommendationContentHash: (0, contracts_1.parseHash)(input.recommendationContentHash, 'AgentTelegramApprovalToken.recommendationContentHash'),
        controlRevision: (0, contracts_1.parsePositiveInteger)(input.controlRevision, 'AgentTelegramApprovalToken.controlRevision'),
        issuedAtMs,
        validUntilMs,
        consumedAtMs,
        consumedApprovalId,
        consumedUpdateIdHash,
    });
}
function parseTelegramApprovalRuntimeConfig(value) {
    const input = row(value, 'Agent Office Telegram config');
    (0, contracts_1.assertExactKeys)(input, ['webhookSecret', 'ownerUid', 'ownerTelegramUserId', 'ownerTelegramChatId'], 'Agent Office Telegram config');
    if (typeof input.webhookSecret !== 'string' || !/^[A-Za-z0-9_-]{32,256}$/.test(input.webhookSecret)) {
        invalid('Agent Office Telegram webhookSecret is invalid');
    }
    return Object.freeze({
        webhookSecret: input.webhookSecret,
        ownerUid: (0, contracts_1.parseIdentifier)(input.ownerUid, 'Agent Office Telegram ownerUid'),
        ownerTelegramUserId: telegramId(input.ownerTelegramUserId, 'Agent Office Telegram ownerTelegramUserId', false),
        ownerTelegramChatId: telegramId(input.ownerTelegramChatId, 'Agent Office Telegram ownerTelegramChatId', true),
    });
}
//# sourceMappingURL=telegram_contracts.js.map