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
exports.v2ProgressTransport = void 0;
const admin = __importStar(require("firebase-admin"));
const progress_event_callable_1 = require("../progress_event_callable");
const DISPOSABLE_PROJECT_ID = "phraseman-v2-ac-test-20260718";
const projectId = process.env.GCLOUD_PROJECT;
const googleCloudProjectId = process.env.GOOGLE_CLOUD_PROJECT;
const isFunctionsEmulator = process.env.FUNCTIONS_EMULATOR === "true";
const hasConflictingProjectEnvironment = projectId !== undefined
    && googleCloudProjectId !== undefined
    && projectId !== googleCloudProjectId;
const isAllowedDemoEmulator = !hasConflictingProjectEnvironment
    && isFunctionsEmulator
    && projectId?.startsWith("demo-") === true;
const isAllowedDisposableDeploy = !hasConflictingProjectEnvironment
    && !isFunctionsEmulator
    && projectId === DISPOSABLE_PROJECT_ID;
if (!isAllowedDemoEmulator && !isAllowedDisposableDeploy) {
    throw new Error("V2 progress transport test harness refuses to load outside "
        + "a demo-project Functions emulator or its exact disposable project");
}
if (admin.apps.length === 0) {
    admin.initializeApp();
}
// Test-only discovery boundary. Production index.ts intentionally does not
// export this callable until every Phase 02 gate is independently closed.
exports.v2ProgressTransport = (0, progress_event_callable_1.createProgressEventProductionCallable)();
