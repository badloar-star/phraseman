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
exports.agentManagerTelegramPublishApproval = void 0;
const node_crypto_1 = require("node:crypto");
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const admin_alerts_1 = require("../admin_alerts");
const contracts_1 = require("../agent_office/contracts");
const telegram_transport_1 = require("../agent_office/telegram_transport");
const telegram_webhook_1 = require("../agent_office/telegram_webhook");
const telegram_contracts_1 = require("../agent_office/telegram_contracts");
const telegram_contracts_2 = require("./telegram_contracts");
const REGION = 'us-central1';
const RECEIPTS = 'agent_manager_telegram_publication_receipts';
const TOKENS = 'agent_manager_telegram_tokens';
function nonce() { return (0, node_crypto_1.randomBytes)(32).toString('base64url'); }
function safeTaskProjection(value) {
    const taskId = typeof value.taskId === 'string' && /^[A-Za-z][A-Za-z0-9._:-]{2,159}$/.test(value.taskId) ? value.taskId : '';
    const revision = Number(value.revision);
    const allowedScope = String(value.allowedScope || '');
    const priority = String(value.priority || '');
    if (!taskId || !Number.isSafeInteger(revision) || revision < 1 || !['analysis_only', 'support_draft', 'report_triage', 'code_prepare', 'content_prepare'].includes(allowedScope) || !['low', 'normal', 'high', 'critical'].includes(priority))
        return null;
    return Object.freeze({ taskId, revision, allowedScope, priority, taskDigest: (0, contracts_1.sha256)(taskId).slice(0, 12) });
}
function message(projection) {
    if (!projection)
        throw new Error('manager_task_projection_invalid');
    const approvalEffect = projection.allowedScope === 'code_prepare'
        ? 'После одобрения задачу сможет забрать только привязанный локальный Codex runner. Результат потребует ручной проверки.'
        : projection.allowedScope === 'content_prepare'
            ? 'После одобрения задача попадёт в очередь для ручной подготовки. Результат потребует ручной проверки.'
            : 'После одобрения задача попадёт в очередь соответствующего серверного обработчика. Результат потребует ручной проверки.';
    return `Phraseman: задача ожидает согласования\nКод: ${projection.taskDigest}\nОбласть: ${projection.allowedScope}\nПриоритет: ${projection.priority}\nРевизия: ${projection.revision}\n\n${approvalEffect}`;
}
/** Creates short-lived Manager approval capabilities only after a task reaches awaiting_approval. */
exports.agentManagerTelegramPublishApproval = (0, firestore_1.onDocumentCreated)({
    document: 'agent_manager_task_events/{eventId}', region: REGION, timeoutSeconds: 30, memory: '256MiB', maxInstances: 3,
    secrets: [admin_alerts_1.ADMIN_ALERT_BOT_TOKEN, telegram_webhook_1.AGENT_OFFICE_TELEGRAM_CONFIG],
}, async (event) => {
    if (telegram_webhook_1.AGENT_OFFICE_TELEGRAM_ENABLED.value() !== 'true')
        return;
    let config;
    try {
        config = (0, telegram_contracts_1.parseTelegramApprovalRuntimeConfig)(telegram_webhook_1.AGENT_OFFICE_TELEGRAM_CONFIG.value());
    }
    catch {
        return;
    }
    const eventData = event.data?.data() ?? {};
    if (eventData.toStatus !== 'awaiting_approval' || typeof eventData.taskId !== 'string')
        return;
    const db = admin.firestore();
    const taskSnapshot = await db.collection('agent_manager_tasks').doc(eventData.taskId).get();
    if (!taskSnapshot.exists)
        return;
    const projection = safeTaskProjection(taskSnapshot.data() ?? {});
    if (!projection || taskSnapshot.data()?.status !== 'awaiting_approval' || projection.revision !== eventData.taskRevision)
        return;
    const receiptId = (0, contracts_1.sha256)(`manager-telegram:${event.params.eventId}`);
    const receiptRef = db.collection(RECEIPTS).doc(receiptId);
    const approveNonce = nonce();
    const rejectNonce = nonce();
    const approveHash = (0, telegram_contracts_2.managerTelegramTokenHash)(approveNonce);
    const rejectHash = (0, telegram_contracts_2.managerTelegramTokenHash)(rejectNonce);
    const nowMs = Date.now();
    const validUntilMs = nowMs + telegram_contracts_2.MANAGER_TELEGRAM_TOKEN_TTL_MS;
    const created = await db.runTransaction(async (tx) => {
        if ((await tx.get(receiptRef)).exists)
            return false;
        const token = (tokenIdHash, permittedDecision) => ({
            schemaVersion: 1, tokenIdHash, status: 'active', ownerUid: config.ownerUid,
            telegramChatId: config.ownerTelegramChatId, telegramUserId: config.ownerTelegramUserId,
            taskId: projection.taskId, expectedRevision: projection.revision, permittedDecision,
            projectionHash: (0, contracts_1.sha256)(JSON.stringify(projection)), issuedAtMs: nowMs, validUntilMs,
            consumedAtMs: null, consumedDecisionId: null, consumedUpdateIdHash: null,
        });
        tx.create(db.collection(TOKENS).doc(approveHash), token(approveHash, 'approve'));
        tx.create(db.collection(TOKENS).doc(rejectHash), token(rejectHash, 'reject'));
        tx.create(receiptRef, { schemaVersion: 1, receiptId, taskId: projection.taskId, taskRevision: projection.revision, state: 'issuing', createdAtMs: nowMs, updatedAtMs: nowMs, piiClass: 'none' });
        return true;
    });
    if (!created)
        return;
    try {
        await new telegram_transport_1.TelegramBotApiTransport(admin_alerts_1.ADMIN_ALERT_BOT_TOKEN.value()).sendMessage({
            chatId: config.ownerTelegramChatId, text: message(projection),
            replyMarkup: { inline_keyboard: [[
                        { text: 'Approve', callback_data: `am1:a:${approveNonce}` },
                        { text: 'Reject', callback_data: `am1:r:${rejectNonce}` },
                    ]] },
        });
        await receiptRef.update({ state: 'sent', updatedAtMs: Date.now() });
    }
    catch {
        await receiptRef.update({ state: 'failed', updatedAtMs: Date.now() });
    }
});
//# sourceMappingURL=telegram_publication_trigger.js.map