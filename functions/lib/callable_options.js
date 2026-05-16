"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HOT_CALLABLE_OPTIONS = exports.ENFORCE_APP_CHECK = void 0;
const REGION = 'us-central1';
exports.ENFORCE_APP_CHECK = process.env.ENFORCE_APP_CHECK === 'true';
exports.HOT_CALLABLE_OPTIONS = {
    region: REGION,
    enforceAppCheck: exports.ENFORCE_APP_CHECK,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 80,
};
//# sourceMappingURL=callable_options.js.map