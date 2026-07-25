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
exports.agentOfficeTelegramWebhook = exports.AGENT_OFFICE_TELEGRAM_ENABLED = exports.AGENT_OFFICE_TELEGRAM_CONFIG = void 0;
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const admin_alerts_1 = require("../admin_alerts");
const firestore_repository_1 = require("./firestore_repository");
const ledger_1 = require("./ledger");
const telegram_approvals_1 = require("./telegram_approvals");
const telegram_contracts_1 = require("./telegram_contracts");
const telegram_transport_1 = require("./telegram_transport");
const REGION = 'us-central1';
/**
 * Owner/chat binding and webhook verification material are deliberately kept
 * separate from the browser-editable admin alert configuration.
 */
exports.AGENT_OFFICE_TELEGRAM_CONFIG = (0, params_1.defineJsonSecret)('AGENT_OFFICE_TELEGRAM_CONFIG');
/** A non-secret, fail-closed deployment parameter. Missing means disabled. */
exports.AGENT_OFFICE_TELEGRAM_ENABLED = (0, params_1.defineString)('AGENT_OFFICE_TELEGRAM_ENABLED', { default: 'false' });
const handler = (0, telegram_transport_1.createAgentOfficeTelegramWebhookHandler)({
    isEnabled: () => exports.AGENT_OFFICE_TELEGRAM_ENABLED.value() === 'true',
    loadConfig: () => exports.AGENT_OFFICE_TELEGRAM_CONFIG.value(),
    loadTokenByHash: async (tokenIdHash) => {
        const snapshot = await admin.firestore().doc((0, telegram_contracts_1.telegramApprovalTokenPath)(tokenIdHash)).get();
        return snapshot.exists ? snapshot.data() ?? null : null;
    },
    handleApproval: async (update, state) => {
        const repository = new firestore_repository_1.FirestoreAgentOfficeRepository(admin.firestore());
        const core = new telegram_approvals_1.TelegramApprovalCore(new ledger_1.AgentOfficeLedger(repository));
        return core.handle(update, state);
    },
    answerCallbackQuery: async (callbackQueryId, text) => {
        const transport = new telegram_transport_1.TelegramBotApiTransport(admin_alerts_1.ADMIN_ALERT_BOT_TOKEN.value());
        await transport.answerCallbackQuery(callbackQueryId, text);
    },
    log: (event, reason) => firebase_functions_1.logger.warn('agent_office_telegram_webhook', { event, reason }),
});
exports.agentOfficeTelegramWebhook = (0, https_1.onRequest)({
    region: REGION,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 3,
    cors: false,
    secrets: [admin_alerts_1.ADMIN_ALERT_BOT_TOKEN, exports.AGENT_OFFICE_TELEGRAM_CONFIG],
}, handler);
//# sourceMappingURL=telegram_webhook.js.map