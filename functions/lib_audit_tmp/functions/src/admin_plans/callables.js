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
exports.adminListPlans = exports.adminGetPlan = exports.adminCreatePlan = void 0;
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
    return new ledger_1.AdminPlansLedger(new firestore_repository_1.FirestoreAdminPlansRepository(admin.firestore()));
}
function auth(request) {
    return request.auth ? { uid: request.auth.uid, token: request.auth.token } : null;
}
exports.adminCreatePlan = (0, https_1.onCall)(OPTIONS, async (request) => ledger().createPlan(auth(request), request.data));
exports.adminGetPlan = (0, https_1.onCall)(OPTIONS, async (request) => ledger().getPlan(auth(request), request.data));
exports.adminListPlans = (0, https_1.onCall)(OPTIONS, async (request) => ledger().listPlans(auth(request), request.data));
//# sourceMappingURL=callables.js.map