"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramApprovalCore = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("./auth");
const contracts_1 = require("./contracts");
const telegram_contracts_1 = require("./telegram_contracts");
function invalid(message) {
    throw new https_1.HttpsError('invalid-argument', message);
}
function parseConfiguredTelegramId(value, label, allowNegative) {
    if (typeof value !== 'string')
        invalid(`${label} is invalid`);
    const pattern = allowNegative ? /^-?[1-9][0-9]{0,19}$/ : /^[1-9][0-9]{0,19}$/;
    if (!pattern.test(value))
        invalid(`${label} is invalid`);
    return value;
}
function parseServerState(value) {
    if (!(0, contracts_1.isRecord)(value))
        invalid('Telegram approval server state must be an object');
    (0, contracts_1.assertExactKeys)(value, [
        'ownerAuth', 'configuredOwnerUid', 'configuredTelegramChatId', 'configuredTelegramUserId', 'token',
    ], 'Telegram approval server state');
    if (!(0, contracts_1.isRecord)(value.ownerAuth))
        invalid('Telegram approval ownerAuth is invalid');
    return Object.freeze({
        ownerAuth: value.ownerAuth,
        configuredOwnerUid: (0, contracts_1.parseIdentifier)(value.configuredOwnerUid, 'Telegram approval configuredOwnerUid'),
        configuredTelegramChatId: parseConfiguredTelegramId(value.configuredTelegramChatId, 'Telegram approval configuredTelegramChatId', true),
        configuredTelegramUserId: parseConfiguredTelegramId(value.configuredTelegramUserId, 'Telegram approval configuredTelegramUserId', false),
        token: (0, telegram_contracts_1.parseAgentTelegramApprovalToken)(value.token),
    });
}
class TelegramApprovalCore {
    constructor(ledger, now = Date.now) {
        this.ledger = ledger;
        this.now = now;
    }
    async handle(verifiedUpdateValue, serverStateValue) {
        const update = (0, telegram_contracts_1.parseVerifiedTelegramApprovalUpdate)(verifiedUpdateValue);
        if (update.callbackNamespace !== 'ao1')
            throw new https_1.HttpsError('invalid-argument', 'Agent Office Telegram namespace is invalid');
        const state = parseServerState(serverStateValue);
        const command = (0, telegram_contracts_1.parseTelegramApprovalCommand)(update.commandText);
        const actor = (0, auth_1.requireAgentOfficeOwner)(state.ownerAuth);
        if (actor.actorUid !== state.configuredOwnerUid)
            throw new https_1.HttpsError('permission-denied', 'Telegram owner binding mismatch');
        if (update.chatId !== state.configuredTelegramChatId || update.userId !== state.configuredTelegramUserId) {
            throw new https_1.HttpsError('permission-denied', 'Telegram identity binding mismatch');
        }
        const token = state.token;
        const updateIdHash = (0, contracts_1.sha256)(update.updateId);
        if (token.tokenIdHash !== (0, telegram_contracts_1.telegramApprovalTokenHash)(command.nonce)) {
            throw new https_1.HttpsError('permission-denied', 'Telegram nonce binding mismatch');
        }
        if (token.ownerUid !== actor.actorUid
            || token.ownerUid !== state.configuredOwnerUid
            || token.telegramChatId !== update.chatId
            || token.telegramUserId !== update.userId) {
            throw new https_1.HttpsError('permission-denied', 'Telegram token owner binding mismatch');
        }
        if (token.permittedVerb !== command.verb)
            throw new https_1.HttpsError('permission-denied', 'Telegram verb is not permitted');
        const nowMs = this.now();
        if (token.issuedAtMs > nowMs || token.validUntilMs <= nowMs)
            throw new https_1.HttpsError('failed-precondition', 'Telegram approval token expired');
        if (token.status === 'revoked')
            throw new https_1.HttpsError('failed-precondition', 'Telegram approval token is revoked');
        if (token.status === 'consumed' && token.consumedUpdateIdHash !== updateIdHash) {
            throw new https_1.HttpsError('failed-precondition', 'Telegram approval token replay mismatch');
        }
        const controlResult = await this.ledger.getControl(state.ownerAuth);
        const control = controlResult.control;
        if (control.state !== 'ready' || control.killSwitchEnabled) {
            throw new https_1.HttpsError('failed-precondition', 'Agent Office kill switch is enabled or unavailable');
        }
        if (control.revision !== token.controlRevision)
            throw new https_1.HttpsError('failed-precondition', 'stale Telegram control revision');
        return this.ledger.decideTelegramRecommendation(state.ownerAuth, {
            caseId: token.caseId,
            expectedCaseRevision: token.expectedCaseRevision,
            recommendationId: token.recommendationId,
            recommendationRevision: token.recommendationRevision,
            recommendationContentHash: token.recommendationContentHash,
            decision: command.verb === 'authorize' ? 'approve' : 'decline',
            reason: command.verb === 'authorize'
                ? 'Verified Telegram owner authorization.'
                : 'Verified Telegram owner rejection.',
            idempotencyKey: `telegram:${command.nonce}`,
        }, {
            token,
            updateIdHash,
        });
    }
}
exports.TelegramApprovalCore = TelegramApprovalCore;
//# sourceMappingURL=telegram_approvals.js.map