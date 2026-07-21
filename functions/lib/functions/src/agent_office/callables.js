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
exports.agentOfficeSetKillSwitch = exports.agentOfficeGetControl = exports.agentOfficeListAuditEvents = exports.agentOfficeListTasks = exports.agentOfficeDecideRecommendation = exports.agentOfficeListRecommendations = exports.agentOfficeGetAggregateHealth = exports.agentOfficeGetCase = exports.agentOfficeListCases = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("../callable_options");
const firestore_repository_1 = require("./firestore_repository");
const ledger_1 = require("./ledger");
const OPTIONS = Object.freeze({
    region: 'us-central1',
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK,
    timeoutSeconds: 20,
    memory: '256MiB',
});
function ledger() {
    return new ledger_1.AgentOfficeLedger(new firestore_repository_1.FirestoreAgentOfficeRepository(admin.firestore()));
}
function auth(request) {
    if (!request.auth)
        return null;
    return { uid: request.auth.uid, token: request.auth.token };
}
exports.agentOfficeListCases = (0, https_1.onCall)(OPTIONS, async (request) => ledger().listCases(auth(request), request.data));
exports.agentOfficeGetCase = (0, https_1.onCall)(OPTIONS, async (request) => ledger().getCase(auth(request), request.data));
exports.agentOfficeGetAggregateHealth = (0, https_1.onCall)(OPTIONS, async (request) => ledger().getAggregateHealth(auth(request)));
exports.agentOfficeListRecommendations = (0, https_1.onCall)(OPTIONS, async (request) => ledger().listRecommendations(auth(request), request.data));
exports.agentOfficeDecideRecommendation = (0, https_1.onCall)(OPTIONS, async (request) => ledger().decideRecommendation(auth(request), request.data));
exports.agentOfficeListTasks = (0, https_1.onCall)(OPTIONS, async (request) => ledger().listTasks(auth(request), request.data));
exports.agentOfficeListAuditEvents = (0, https_1.onCall)(OPTIONS, async (request) => ledger().listAuditEvents(auth(request), request.data));
exports.agentOfficeGetControl = (0, https_1.onCall)(OPTIONS, async (request) => ledger().getControl(auth(request)));
exports.agentOfficeSetKillSwitch = (0, https_1.onCall)(OPTIONS, async (request) => ledger().setKillSwitch(auth(request), request.data));
//# sourceMappingURL=callables.js.map