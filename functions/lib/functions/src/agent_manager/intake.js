"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT_MANAGER_REPORT_SOURCES = void 0;
exports.parseAgentManagerInboxRequest = parseAgentManagerInboxRequest;
exports.inboxSourceRef = inboxSourceRef;
const crypto_1 = require("crypto");
const https_1 = require("firebase-functions/v2/https");
exports.AGENT_MANAGER_REPORT_SOURCES = ['error_reports', 'user_reports', 'community_pack_reports', 'explain_report_entries', 'app_errors'];
function fail(message) { throw new https_1.HttpsError('invalid-argument', message); }
function row(value) { if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('inbox task must be an object'); return value; }
function safeSourceId(value, max) {
    if (typeof value !== 'string')
        fail('inbox sourceId is invalid');
    const result = value.trim();
    if (!result || result.length > max || result.includes('/') || /[\u0000-\u001f\u007f]/.test(result))
        fail('inbox sourceId is invalid');
    return result;
}
function parseAgentManagerInboxRequest(value) {
    const input = row(value);
    const keys = Object.keys(input);
    if (keys.some((key) => !['sourceType', 'sourceId', 'reportSource'].includes(key)) || !['sourceType', 'sourceId', 'reportSource'].every((key) => key in input))
        fail('inbox task fields are invalid');
    if (input.sourceType === 'support') {
        if (input.reportSource !== null)
            fail('support intake cannot include reportSource');
        return Object.freeze({ sourceType: 'support', sourceId: safeSourceId(input.sourceId, 400), reportSource: null });
    }
    if (input.sourceType !== 'report' || typeof input.reportSource !== 'string' || !exports.AGENT_MANAGER_REPORT_SOURCES.includes(input.reportSource))
        fail('report intake source is invalid');
    return Object.freeze({ sourceType: 'report', sourceId: safeSourceId(input.sourceId, 160), reportSource: input.reportSource });
}
function inboxSourceRef(input, hmacKey) {
    if (!hmacKey || hmacKey.length < 32)
        throw new https_1.HttpsError('failed-precondition', 'AGENT_MANAGER_INTAKE_HMAC_KEY is not configured');
    const canonical = `${input.sourceType}\n${input.reportSource ?? ''}\n${input.sourceId}`;
    const digest = (0, crypto_1.createHmac)('sha256', hmacKey).update(canonical, 'utf8').digest('hex');
    return `${input.sourceType}:sha256:${digest}`;
}
//# sourceMappingURL=intake.js.map