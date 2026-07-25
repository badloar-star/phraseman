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
exports.agentManagerCreateInboxTask = exports.agentManagerInitializeRoster = exports.agentManagerListRunbooks = exports.agentManagerListAgents = exports.agentManagerListTasks = exports.agentManagerTransitionTask = exports.agentManagerCreateTask = exports.AGENT_MANAGER_INTAKE_HMAC_KEY = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const callable_options_1 = require("../callable_options");
const auth_1 = require("../agent_office/auth");
const firestore_repository_1 = require("./firestore_repository");
const ledger_1 = require("./ledger");
const intake_1 = require("./intake");
const OPTIONS = Object.freeze({ region: 'us-central1', enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK, timeoutSeconds: 20, memory: '256MiB' });
exports.AGENT_MANAGER_INTAKE_HMAC_KEY = (0, params_1.defineSecret)('AGENT_MANAGER_INTAKE_HMAC_KEY');
function ledger() { return new ledger_1.AgentManagerLedger(new firestore_repository_1.FirestoreAgentManagerRepository(admin.firestore())); }
function auth(request) { return request.auth ? { uid: request.auth.uid, token: request.auth.token } : null; }
exports.agentManagerCreateTask = (0, https_1.onCall)(OPTIONS, async (request) => ledger().createTask(auth(request), request.data));
exports.agentManagerTransitionTask = (0, https_1.onCall)(OPTIONS, async (request) => ledger().transitionTask(auth(request), request.data));
exports.agentManagerListTasks = (0, https_1.onCall)(OPTIONS, async (request) => ledger().listTasks(auth(request), request.data));
exports.agentManagerListAgents = (0, https_1.onCall)(OPTIONS, async (request) => ledger().listAgents(auth(request), request.data));
exports.agentManagerListRunbooks = (0, https_1.onCall)(OPTIONS, async (request) => ledger().listRunbooks(auth(request)));
exports.agentManagerInitializeRoster = (0, https_1.onCall)(OPTIONS, async (request) => ledger().initializeRoster(auth(request)));
exports.agentManagerCreateInboxTask = (0, https_1.onCall)({ ...OPTIONS, secrets: [exports.AGENT_MANAGER_INTAKE_HMAC_KEY] }, async (request) => {
    (0, auth_1.requireAgentOfficeOwner)(auth(request));
    const input = (0, intake_1.parseAgentManagerInboxRequest)(request.data);
    const sourceCollection = input.sourceType === 'support' ? 'support_inbox' : input.reportSource;
    const source = await admin.firestore().collection(sourceCollection).doc(input.sourceId).get();
    if (!source.exists)
        throw new https_1.HttpsError('not-found', 'inbox source not found');
    const sourceRef = (0, intake_1.inboxSourceRef)(input, String(exports.AGENT_MANAGER_INTAKE_HMAC_KEY.value() || '').trim());
    return ledger().createInboxTask(auth(request), {
        sourceType: input.sourceType,
        sourceRef,
        reportSource: input.reportSource,
        // Kept solely in the server-only link document; task/UI/Telegram retain the HMAC reference.
        sourceDocumentId: input.sourceId,
    });
});
//# sourceMappingURL=callables.js.map