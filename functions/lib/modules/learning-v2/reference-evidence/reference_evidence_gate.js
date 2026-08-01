"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SELECTED_REFERENCE_MODE_IDS = void 0;
exports.evaluateReferenceEvidencePack = evaluateReferenceEvidencePack;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
exports.SELECTED_REFERENCE_MODE_IDS = [
    'sound-discrimination',
    'guided-phrase-pronunciation',
    'prompted-translation-by-voice',
    'contextual-dialogue-mission',
];
const PREVIEW_STATES = [
    'prompt',
    'active',
    'processing',
    'success',
    'needs_work',
    'recovery',
];
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function readJson(filePath, blockers, code) {
    if (!node_fs_1.default.existsSync(filePath)) {
        blockers.push(code);
        return undefined;
    }
    try {
        return JSON.parse(node_fs_1.default.readFileSync(filePath, 'utf8'));
    }
    catch {
        blockers.push(`${code}_invalid_json`);
        return undefined;
    }
}
function exactStrings(value, expected) {
    return (Array.isArray(value) &&
        value.length === expected.length &&
        expected.every((item) => value.includes(item)) &&
        value.every((item) => typeof item === 'string' && expected.includes(item)));
}
function sha256File(filePath) {
    return node_crypto_1.default.createHash('sha256').update(node_fs_1.default.readFileSync(filePath)).digest('hex');
}
function validateCapture(rootDir, capture) {
    if (!isObject(capture) || capture.sourceTier !== 'A_first_hand_current')
        return false;
    const requiredStrings = [
        'evidenceId',
        'product',
        'activityName',
        'platform',
        'device',
        'osVersion',
        'appVersionBuild',
        'locale',
        'learnerLevel',
        'accountSubscriptionState',
        'captureDate',
        'captureMethod',
        'sourceProvenance',
        'rightsUseNote',
        'researcher',
        'rawArtifactPath',
        'rawSha256',
    ];
    if (requiredStrings.some((key) => typeof capture[key] !== 'string' || capture[key] === '')) {
        return false;
    }
    if (!String(capture.rawArtifactPath).startsWith('qa-artifacts/learning-v2/reference-evidence/')) {
        return false;
    }
    if (!/^[a-f0-9]{64}$/.test(String(capture.rawSha256)))
        return false;
    const rawEvidenceRoot = node_path_1.default.resolve(rootDir, 'qa-artifacts', 'learning-v2', 'reference-evidence');
    const rawArtifactPath = node_path_1.default.resolve(rootDir, String(capture.rawArtifactPath));
    if (!rawArtifactPath.startsWith(`${rawEvidenceRoot}${node_path_1.default.sep}`))
        return false;
    if (!node_fs_1.default.existsSync(rawArtifactPath) || sha256File(rawArtifactPath) !== capture.rawSha256) {
        return false;
    }
    const states = capture.states;
    if (!Array.isArray(states) || states.length < 3)
        return false;
    const stateKinds = new Set(states
        .filter(isObject)
        .map((state) => state.previewState)
        .filter((state) => typeof state === 'string'));
    return (stateKinds.has('prompt') &&
        stateKinds.has('active') &&
        (stateKinds.has('success') || stateKinds.has('needs_work') || stateKinds.has('recovery')));
}
function evaluateReferenceEvidencePack(rootDir) {
    const blockers = [];
    const modeResults = {};
    for (const modeId of exports.SELECTED_REFERENCE_MODE_IDS) {
        modeResults[modeId] = { ready: false, blockers: [] };
    }
    const evidenceDir = node_path_1.default.join(rootDir, 'docs', 'v2', 'reference-evidence');
    const ledger = readJson(node_path_1.default.join(evidenceDir, 'activity-mode-capture-ledger.json'), blockers, 'capture_ledger_missing');
    const reviews = readJson(node_path_1.default.join(evidenceDir, 'activity-mode-ui-review.json'), blockers, 'ui_review_missing');
    const ledgerModes = isObject(ledger) && Array.isArray(ledger.selectedModes) ? ledger.selectedModes : [];
    const ledgerModeIds = ledgerModes
        .filter(isObject)
        .map((mode) => mode.modeId)
        .filter((modeId) => typeof modeId === 'string');
    if (!exactStrings(ledgerModeIds, exports.SELECTED_REFERENCE_MODE_IDS)) {
        blockers.push('selected_mode_set_mismatch');
    }
    const hasSharedStructuralBlocker = blockers.length > 0;
    const decisions = isObject(reviews) && Array.isArray(reviews.decisions) ? reviews.decisions : [];
    for (const modeId of exports.SELECTED_REFERENCE_MODE_IDS) {
        const modeBlockers = modeResults[modeId].blockers;
        const blockMode = (code) => {
            blockers.push(code);
            modeBlockers.push(code);
        };
        const mode = ledgerModes.find((candidate) => isObject(candidate) && candidate.modeId === modeId);
        const captures = isObject(mode) && Array.isArray(mode.captures) ? mode.captures : [];
        if (!captures.some((capture) => validateCapture(rootDir, capture))) {
            blockMode(`${modeId}:lawful_first_hand_capture_missing`);
        }
        const designPath = node_path_1.default.join(evidenceDir, 'contact-sheets', `${modeId}.png`);
        const designExists = node_fs_1.default.existsSync(designPath);
        if (!designExists) {
            blockMode(`${modeId}:contact_sheet_missing`);
        }
        const decision = decisions.find((candidate) => isObject(candidate) && candidate.modeId === modeId);
        if (!isObject(decision) || decision.status !== 'approved') {
            blockMode(`${modeId}:current_owner_approval_missing`);
            continue;
        }
        const conditionCoverage = decision.conditionCoverage;
        if (typeof decision.wireframeRevision !== 'string' ||
            typeof decision.wireframeSha256 !== 'string' ||
            typeof decision.reviewer !== 'string' ||
            typeof decision.reviewedAt !== 'string' ||
            typeof decision.notes !== 'string' ||
            typeof decision.distinctivenessReview !== 'string' ||
            !isObject(conditionCoverage) ||
            !exactStrings(conditionCoverage.connectivity, ['online', 'offline']) ||
            !exactStrings(conditionCoverage.microphone, ['granted', 'denied', 'unavailable']) ||
            !exactStrings(conditionCoverage.signal, ['clean', 'noisy', 'silence', 'not_applicable']) ||
            !exactStrings(conditionCoverage.scorerOutcome, [
                'pass',
                'needs_work',
                'uncertain',
                'system_invalid',
                'not_applicable',
            ]) ||
            !exactStrings(conditionCoverage.motion, ['full', 'reduced']) ||
            !exactStrings(conditionCoverage.textScalePercent, ['100', '150', '200']) ||
            !exactStrings(conditionCoverage.colorScheme, ['light', 'dark']) ||
            typeof decision.frameCount !== 'number' ||
            decision.frameCount < 6 ||
            !exactStrings(decision.previewStates, PREVIEW_STATES) ||
            decision.competitorAssetDependencies !== 0) {
            blockMode(`${modeId}:approval_record_incomplete`);
            continue;
        }
        if (designExists && sha256File(designPath) !== decision.wireframeSha256) {
            blockMode(`${modeId}:approval_stale_hash`);
        }
        modeResults[modeId].ready = !hasSharedStructuralBlocker && modeBlockers.length === 0;
    }
    return { ready: blockers.length === 0, blockers, modeResults };
}
//# sourceMappingURL=reference_evidence_gate.js.map