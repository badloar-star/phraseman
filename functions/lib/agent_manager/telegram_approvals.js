"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentManagerTelegramApprovalCore = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../agent_office/auth");
const contracts_1 = require("../agent_office/contracts");
const telegram_contracts_1 = require("../agent_office/telegram_contracts");
const telegram_contracts_2 = require("./telegram_contracts");
function fail(message) { throw new https_1.HttpsError('permission-denied', message); }
class AgentManagerTelegramApprovalCore {
    constructor(ledger, now = Date.now) {
        this.ledger = ledger;
        this.now = now;
    }
    async handle(verifiedUpdateValue, state) {
        const update = (0, telegram_contracts_1.parseVerifiedTelegramApprovalUpdate)(verifiedUpdateValue);
        if (update.callbackNamespace !== 'am1')
            throw new https_1.HttpsError('invalid-argument', 'manager Telegram namespace is invalid');
        const command = (0, telegram_contracts_1.parseTelegramApprovalCommand)(update.commandText);
        const decision = command.verb === 'authorize' ? 'approve' : 'reject';
        const actor = (0, auth_1.requireAgentOfficeOwner)(state.ownerAuth);
        if (actor.actorUid !== state.configuredOwnerUid || update.chatId !== state.configuredTelegramChatId || update.userId !== state.configuredTelegramUserId)
            fail('manager Telegram owner binding mismatch');
        const token = (0, telegram_contracts_2.parseManagerTelegramToken)(state.token);
        if (token.tokenIdHash !== (0, telegram_contracts_2.managerTelegramTokenHash)(command.nonce) || token.ownerUid !== actor.actorUid || token.telegramChatId !== update.chatId || token.telegramUserId !== update.userId || token.permittedDecision !== decision)
            fail('manager Telegram token binding mismatch');
        const nowMs = this.now();
        if (token.issuedAtMs > nowMs || token.validUntilMs <= nowMs || token.status === 'revoked')
            throw new https_1.HttpsError('failed-precondition', 'manager Telegram token is unavailable');
        await this.ledger.requireGlobalControlReady(state.ownerAuth);
        return this.ledger.decideTelegramTask(state.ownerAuth, { token, decision, updateIdHash: (0, contracts_1.sha256)(update.updateId) });
    }
}
exports.AgentManagerTelegramApprovalCore = AgentManagerTelegramApprovalCore;
//# sourceMappingURL=telegram_approvals.js.map