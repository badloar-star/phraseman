"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMonthlyDecisionPack = void 0;
exports.generateMonthlyDecisionPackResponse = generateMonthlyDecisionPackResponse;
const node_crypto_1 = require("node:crypto");
const https_1 = require("firebase-functions/v2/https");
const permissions_1 = require("./admin/permissions");
const callable_options_1 = require("./callable_options");
const monthly_decision_pack_core_1 = require("./monthly_decision_pack_core");
const monthly_decision_pack_sources_1 = require("./monthly_decision_pack_sources");
const monthly_decision_pack_zip_1 = require("./monthly_decision_pack_zip");
const REGION = 'us-central1';
const DEFAULT_DEPENDENCIES = {
    nowMs: () => Date.now(),
    hasPermission: (token) => (0, permissions_1.hasClaimedPermission)(token, 'money.read'),
    load: monthly_decision_pack_sources_1.loadDecisionPackAggregateInput,
};
function safeTimezone(value) {
    const timezone = String(value ?? 'UTC').trim();
    if (!timezone || timezone.length > 80 || !/^[A-Za-z0-9_+\-/]+$/.test(timezone))
        throw new https_1.HttpsError('invalid-argument', 'Invalid IANA timezone');
    return timezone;
}
function safeMonth(value) {
    if (value == null || value === '')
        return undefined;
    const month = String(value).trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
        throw new https_1.HttpsError('invalid-argument', 'Month must be YYYY-MM');
    return month;
}
async function generateMonthlyDecisionPackResponse(data, authToken, dependencies = DEFAULT_DEPENDENCIES) {
    if (!dependencies.hasPermission(authToken))
        throw new https_1.HttpsError('permission-denied', 'money.read permission required');
    const request = data && typeof data === 'object' ? data : {};
    const generatedAtMs = dependencies.nowMs();
    let window;
    try {
        window = (0, monthly_decision_pack_core_1.resolveMonthlyReportingWindow)({ timezone: safeTimezone(request.timezone), month: safeMonth(request.month), asOfMs: generatedAtMs });
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('invalid-argument', String(error?.message ?? 'invalid_reporting_window'));
    }
    const aggregateInput = await dependencies.load(window, generatedAtMs);
    let files;
    try {
        files = (0, monthly_decision_pack_core_1.buildMonthlyDecisionPackFiles)(aggregateInput);
    }
    catch (error) {
        const message = String(error?.message ?? 'decision_pack_build_failed');
        if (message.includes('limit'))
            throw new https_1.HttpsError('resource-exhausted', message);
        throw error;
    }
    let zip;
    try {
        zip = await (0, monthly_decision_pack_zip_1.createDecisionPackZip)(files);
    }
    catch (error) {
        const message = String(error?.message ?? 'decision_pack_zip_failed');
        if (message.includes('limit'))
            throw new https_1.HttpsError('resource-exhausted', message);
        throw error;
    }
    const timezoneSlug = window.timezone.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return {
        filename: `phraseman-monthly-decision-pack-${window.month}-${timezoneSlug || 'utc'}${window.preliminary ? '-preliminary' : ''}.zip`,
        mimeType: 'application/zip',
        base64: zip.toString('base64'),
        byteSize: zip.length,
        sha256: (0, node_crypto_1.createHash)('sha256').update(zip).digest('hex'),
        fileList: monthly_decision_pack_core_1.DECISION_PACK_FILE_NAMES,
        manifestPreview: JSON.parse(files['manifest.json']),
    };
}
exports.adminMonthlyDecisionPack = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK,
    timeoutSeconds: 120,
    memory: '1GiB',
}, async (request) => generateMonthlyDecisionPackResponse(request.data, request.auth?.token));
//# sourceMappingURL=admin_monthly_decision_pack.js.map