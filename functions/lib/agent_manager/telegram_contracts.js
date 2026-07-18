"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MANAGER_TELEGRAM_TOKEN_TTL_MS = void 0;
exports.managerTelegramTokenHash = managerTelegramTokenHash;
exports.managerTelegramTokenPath = managerTelegramTokenPath;
exports.managerTelegramDecisionId = managerTelegramDecisionId;
exports.parseManagerTelegramToken = parseManagerTelegramToken;
const node_crypto_1 = require("node:crypto");
const https_1 = require("firebase-functions/v2/https");
exports.MANAGER_TELEGRAM_TOKEN_TTL_MS = 10 * 60 * 1000;
function fail(message) { throw new https_1.HttpsError('invalid-argument', message); }
function row(value) { if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('manager Telegram token is invalid'); return value; }
function id(value, label) { if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9._:-]{2,159}$/.test(value))
    fail(`${label} is invalid`); return value; }
function hash(value, label) { if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value))
    fail(`${label} is invalid`); return value; }
function telegramId(value, label, negative) { if (typeof value !== 'string' || !(negative ? /^-?[1-9][0-9]{0,19}$/ : /^[1-9][0-9]{0,19}$/).test(value))
    fail(`${label} is invalid`); return value; }
function integer(value, label, nullable = false) { if (nullable && value === null)
    return null; if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    fail(`${label} is invalid`); return value; }
function managerTelegramTokenHash(nonce) { return (0, node_crypto_1.createHash)('sha256').update(nonce, 'utf8').digest('hex'); }
function managerTelegramTokenPath(tokenIdHash) { return `agent_manager_telegram_tokens/${hash(tokenIdHash, 'manager Telegram tokenIdHash')}`; }
function managerTelegramDecisionId(tokenIdHash) { return (0, node_crypto_1.createHash)('sha256').update(`decision:${tokenIdHash}`, 'utf8').digest('hex'); }
function parseManagerTelegramToken(value) {
    const input = row(value);
    const keys = Object.keys(input);
    const expected = ['schemaVersion', 'tokenIdHash', 'status', 'ownerUid', 'telegramChatId', 'telegramUserId', 'taskId', 'expectedRevision', 'permittedDecision', 'projectionHash', 'issuedAtMs', 'validUntilMs', 'consumedAtMs', 'consumedDecisionId', 'consumedUpdateIdHash'];
    if (keys.some((key) => !expected.includes(key)) || expected.some((key) => !(key in input)))
        fail('manager Telegram token fields are invalid');
    const issuedAtMs = integer(input.issuedAtMs, 'issuedAtMs');
    const validUntilMs = integer(input.validUntilMs, 'validUntilMs');
    const expectedRevision = integer(input.expectedRevision, 'expectedRevision');
    if (validUntilMs <= issuedAtMs || validUntilMs - issuedAtMs > exports.MANAGER_TELEGRAM_TOKEN_TTL_MS)
        fail('manager Telegram token TTL is invalid');
    if (expectedRevision < 1)
        fail('expectedRevision is invalid');
    const status = input.status;
    if (input.schemaVersion !== 1 || !['active', 'consumed', 'revoked'].includes(String(status)) || !['approve', 'reject'].includes(String(input.permittedDecision)))
        fail('manager Telegram token is invalid');
    const consumedAtMs = integer(input.consumedAtMs, 'consumedAtMs', true);
    const consumedDecisionId = input.consumedDecisionId === null ? null : hash(input.consumedDecisionId, 'consumedDecisionId');
    const consumedUpdateIdHash = input.consumedUpdateIdHash === null ? null : hash(input.consumedUpdateIdHash, 'consumedUpdateIdHash');
    const consumed = consumedAtMs !== null && consumedDecisionId !== null && consumedUpdateIdHash !== null;
    if ((status === 'consumed') !== consumed || (status !== 'consumed' && (consumedAtMs !== null || consumedDecisionId !== null || consumedUpdateIdHash !== null)))
        fail('manager Telegram token consumption is invalid');
    return Object.freeze({ schemaVersion: 1, tokenIdHash: hash(input.tokenIdHash, 'tokenIdHash'), status: status, ownerUid: id(input.ownerUid, 'ownerUid'), telegramChatId: telegramId(input.telegramChatId, 'telegramChatId', true), telegramUserId: telegramId(input.telegramUserId, 'telegramUserId', false), taskId: id(input.taskId, 'taskId'), expectedRevision, permittedDecision: input.permittedDecision, projectionHash: hash(input.projectionHash, 'projectionHash'), issuedAtMs, validUntilMs, consumedAtMs, consumedDecisionId, consumedUpdateIdHash });
}
//# sourceMappingURL=telegram_contracts.js.map