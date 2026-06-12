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
exports.openAiDialogModelConfig = exports.ALLOWED_DIALOG_MODELS = void 0;
exports.resolveConfiguredDialogModel = resolveConfiguredDialogModel;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const REGION = 'us-central1';
const CONFIG_COLLECTION = 'admin_runtime_config';
const CONFIG_DOC = 'openai_dialog_model';
const MODEL_DEFAULT = 'gpt-4.1-nano';
exports.ALLOWED_DIALOG_MODELS = [
    'gpt-4.1-nano',
    'gpt-4.1-mini',
    'gpt-4.1',
    'gpt-4o-mini',
];
function text(value, max = 120) {
    return String(value ?? '').trim().slice(0, max);
}
function isAllowedDialogModel(model) {
    return exports.ALLOWED_DIALOG_MODELS.includes(model);
}
function normalizeDialogModel(value) {
    const model = text(value, 80);
    return isAllowedDialogModel(model) ? model : null;
}
async function resolveConfiguredDialogModel(db, envModel) {
    try {
        const snap = await db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC).get();
        const configured = normalizeDialogModel(snap.data()?.model);
        if (configured)
            return configured;
    }
    catch (e) {
        console.warn('resolveConfiguredDialogModel failed, using fallback', e);
    }
    return normalizeDialogModel(envModel) || MODEL_DEFAULT;
}
exports.openAiDialogModelConfig = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth?.token?.admin) {
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    }
    const db = admin.firestore();
    const ref = db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC);
    const action = text(request.data?.action, 20) || 'get';
    if (action === 'set') {
        const model = normalizeDialogModel(request.data?.model);
        if (!model) {
            throw new https_1.HttpsError('invalid-argument', 'unsupported_dialog_model');
        }
        await ref.set({
            model,
            allowedModels: exports.ALLOWED_DIALOG_MODELS,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAtMs: Date.now(),
            updatedBy: text(request.auth?.token?.email, 200) || 'admin',
        }, { merge: true });
    }
    else if (action !== 'get') {
        throw new https_1.HttpsError('invalid-argument', 'unsupported_action');
    }
    const snap = await ref.get();
    const configured = normalizeDialogModel(snap.data()?.model);
    const activeModel = configured || normalizeDialogModel(process.env.OPENAI_DIALOG_MODEL) || MODEL_DEFAULT;
    return {
        ok: true,
        activeModel,
        configuredModel: configured,
        defaultModel: MODEL_DEFAULT,
        allowedModels: exports.ALLOWED_DIALOG_MODELS,
        updatedAtMs: Number(snap.data()?.updatedAtMs || 0),
    };
});
//# sourceMappingURL=openai_dialog_model_config.js.map