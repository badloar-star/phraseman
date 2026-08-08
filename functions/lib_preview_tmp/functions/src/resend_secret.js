"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESEND_API_KEY = void 0;
const params_1 = require("firebase-functions/params");
/** Canonical Secret Manager parameter shared by every Resend consumer. */
exports.RESEND_API_KEY = (0, params_1.defineSecret)('RESEND_API_KEY');
//# sourceMappingURL=resend_secret.js.map