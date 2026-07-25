"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSourceHealth = normalizeSourceHealth;
exports.deduplicateReportIncidents = deduplicateReportIncidents;
exports.createObservationCases = createObservationCases;
exports.buildDailyObservationDigest = buildDailyObservationDigest;
exports.observeAgentOffice = observeAgentOffice;
const contracts_1 = require("./contracts");
const MAX_REPORT_ROWS = 100;
const MAX_REPORT_GROUPS = 20;
const MAX_TOTAL_EVIDENCE = 20;
const SAFE_REPORT_SOURCES = new Set(['error_reports', 'user_reports', 'community_pack_reports', 'explain_report_entries', 'app_errors']);
const SAFE_REPORT_CATEGORIES = new Set(['audio', 'bug', 'content', 'crash', 'other', 'payment', 'safety', 'spam', 'typo', 'unknown']);
const SAFE_REPORT_SCREENS = new Set(['home', 'lesson', 'profile', 'quiz', 'settings', 'unknown_screen']);
const EXPECTED_OBSERVATION_SOURCES = ['analytics', 'reports', 'audit'];
function text(value, fallback, max) {
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}
function hasSufficientReceipt(input) {
    return (input.state === 'ready' || input.state === 'empty')
        && typeof input.count === 'number' && Number.isSafeInteger(input.count) && input.count >= 0
        && input.truncated === false
        && (input.state !== 'empty' || input.count === 0);
}
function sourceState(input) {
    if (input.truncated === true || input.state === 'truncated')
        return 'truncated';
    if (!hasSufficientReceipt(input) && input.state !== 'partial' && input.state !== 'error' && input.state !== 'truncated')
        return 'error';
    if (input.state === 'ready' || input.state === 'empty' || input.state === 'partial' || input.state === 'error')
        return input.state;
    return 'error';
}
/** Converts existing callable health contracts without inferring zero from unavailable data. */
function normalizeSourceHealth(source, input, observedAtMs) {
    const state = sourceState(input);
    const sourceObservedAtMs = typeof input.observedAtMs === 'number'
        && Number.isSafeInteger(input.observedAtMs) && input.observedAtMs >= 0
        ? input.observedAtMs
        : observedAtMs;
    return Object.freeze({
        source: text(source, 'unknown_source', 80),
        state,
        observedAtMs: sourceObservedAtMs,
        insufficientEvidence: !hasSufficientReceipt(input),
    });
}
function safeMetadata(value, allowed, fallback) {
    return typeof value === 'string' && allowed.has(value) ? value : fallback;
}
/** Groups only allowlisted metadata and prevalidated W1 opaque references. */
function deduplicateReportIncidents(reports, maxEvidence = 3) {
    const groups = new Map();
    const bounded = Math.max(0, Math.min(5, Math.floor(maxEvidence), MAX_TOTAL_EVIDENCE));
    let totalEvidence = 0;
    let truncated = reports.length > MAX_REPORT_ROWS;
    let droppedEvidenceCount = Math.max(0, reports.length - MAX_REPORT_ROWS);
    for (const row of reports.slice(0, MAX_REPORT_ROWS)) {
        if (!(0, contracts_1.isSafeOpaqueRef)(row.sourceRef)) {
            droppedEvidenceCount += 1;
            continue;
        }
        const source = safeMetadata(row.source, SAFE_REPORT_SOURCES, 'unknown_reports');
        const category = safeMetadata(row.category, SAFE_REPORT_CATEGORIES, 'other');
        const screen = safeMetadata(row.screen, SAFE_REPORT_SCREENS, 'unknown_screen');
        const key = `${source}\u0000${category}\u0000${screen}`;
        let group = groups.get(key);
        if (!group) {
            if (groups.size >= MAX_REPORT_GROUPS) {
                truncated = true;
                droppedEvidenceCount += 1;
                continue;
            }
            group = { source, category, screen, count: 0, evidence: [], droppedEvidenceCount: 0 };
        }
        group.count += 1;
        if (group.evidence.length < bounded && totalEvidence < MAX_TOTAL_EVIDENCE) {
            group.evidence.push(Object.freeze({
                sourceRef: row.sourceRef,
                // Never carry a report body into the Agent Office collection or digest.
                summary: 'Redacted report metadata sample.',
            }));
            totalEvidence += 1;
        }
        else {
            truncated = true;
            droppedEvidenceCount += 1;
            group.droppedEvidenceCount += 1;
        }
        groups.set(key, group);
    }
    const insufficientEvidence = droppedEvidenceCount > 0;
    const incidents = Object.freeze([...groups.values()]
        .sort((left, right) => right.count - left.count || left.source.localeCompare(right.source))
        .map((group) => Object.freeze({ ...group, evidence: Object.freeze(group.evidence), truncated, insufficientEvidence, droppedEvidenceCount: group.droppedEvidenceCount })));
    return Object.freeze({ incidents, truncated, insufficientEvidence, droppedEvidenceCount });
}
function createObservationCases(input) {
    const analyticsInsufficient = input.analytics.qualityIncomplete || !hasSufficientReceipt(input.analytics);
    const auditInsufficient = !hasSufficientReceipt(input.audit);
    const expectedReceiptsPresent = ['analytics', 'reports', 'audit'].every((source) => input.sourceHealth.some((health) => health.source === source && !health.insufficientEvidence));
    const incomplete = !expectedReceiptsPresent || analyticsInsufficient || auditInsufficient || input.sourceHealth.some((source) => source.insufficientEvidence) || input.incidents.some((incident) => incident.insufficientEvidence);
    const cases = [];
    if (analyticsInsufficient) {
        cases.push(Object.freeze({ signal: 'analytics_incomplete', status: 'insufficient_data', insufficientEvidence: true, summary: 'Analytics source is incomplete; observe again before drawing a conclusion.', actionType: 'analysis_prepare' }));
    }
    for (const incident of input.incidents.filter((item) => item.count >= 2).slice(0, 3)) {
        cases.push(Object.freeze({
            signal: 'report_incident',
            status: incomplete ? 'insufficient_data' : 'observed',
            insufficientEvidence: incomplete,
            summary: `${incident.count} related reports: ${incident.category} on ${incident.screen}.`,
            actionType: 'analysis_prepare',
        }));
    }
    if (auditInsufficient) {
        cases.push(Object.freeze({ signal: 'audit_error', status: 'insufficient_data', insufficientEvidence: true, summary: 'Audit source is incomplete; no operational conclusion is available.', actionType: 'analysis_prepare' }));
    }
    return Object.freeze(cases);
}
function buildDailyObservationDigest(input) {
    const recommendation = input.cases.find((item) => !item.insufficientEvidence) ?? null;
    return Object.freeze({
        generatedAtMs: input.generatedAtMs,
        freshness: Object.freeze(input.sourceHealth.map((source) => Object.freeze({
            source: source.source, state: source.state, ageMs: Math.max(0, input.generatedAtMs - source.observedAtMs),
        }))),
        cost: Object.freeze({ currency: 'EUR', estimatedMinor: 0, summary: 'No model or external calls.' }),
        recommendation,
    });
}
function hasExactKeys(value, keys) {
    return Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
function sanitizedIncidents(value) {
    if (!Array.isArray(value) || value.length > MAX_REPORT_ROWS) {
        return Object.freeze({ incidents: Object.freeze([]), valid: false, rowCount: Array.isArray(value) ? value.length : 0 });
    }
    const groups = new Map();
    let valid = true;
    for (const candidate of value) {
        if (!(0, contracts_1.isRecord)(candidate) || !hasExactKeys(candidate, ['source', 'category', 'screen'])) {
            valid = false;
            continue;
        }
        const row = candidate;
        if (typeof row.source !== 'string' || !SAFE_REPORT_SOURCES.has(row.source)
            || typeof row.category !== 'string' || !SAFE_REPORT_CATEGORIES.has(row.category)
            || typeof row.screen !== 'string' || !SAFE_REPORT_SCREENS.has(row.screen)) {
            valid = false;
            continue;
        }
        const key = `${row.source}\u0000${row.category}\u0000${row.screen}`;
        const current = groups.get(key);
        if (!current && groups.size >= MAX_REPORT_GROUPS) {
            valid = false;
            continue;
        }
        groups.set(key, current
            ? { ...current, count: current.count + 1 }
            : { source: row.source, category: row.category, screen: row.screen, count: 1 });
    }
    const incidents = Object.freeze([...groups.values()]
        .sort((left, right) => right.count - left.count || left.source.localeCompare(right.source))
        .map((group) => Object.freeze({
        ...group,
        evidence: Object.freeze([]),
        truncated: !valid,
        insufficientEvidence: !valid,
        droppedEvidenceCount: valid ? 0 : 1,
    })));
    return Object.freeze({ incidents, valid, rowCount: value.length });
}
/** Pure boundary over sanitized server-provided receipts and metadata-only report rows. */
function observeAgentOffice(value) {
    const input = (0, contracts_1.isRecord)(value) ? value : {};
    const observedAtValid = typeof input.observedAtMs === 'number'
        && Number.isSafeInteger(input.observedAtMs) && input.observedAtMs >= 0;
    const observedAtMs = observedAtValid ? input.observedAtMs : 0;
    const rawHealth = Array.isArray(input.sourceHealth) ? input.sourceHealth : [];
    const inputKeysValid = hasExactKeys(input, ['observedAtMs', 'sourceHealth', 'rows']);
    const receiptsValid = rawHealth.length === EXPECTED_OBSERVATION_SOURCES.length
        && rawHealth.every((candidate) => (0, contracts_1.isRecord)(candidate)
            && hasExactKeys(candidate, ['source', 'state', 'count', 'truncated', 'observedAtMs'])
            && typeof candidate.observedAtMs === 'number'
            && Number.isSafeInteger(candidate.observedAtMs)
            && candidate.observedAtMs >= 0);
    const sourceHealth = Object.freeze(EXPECTED_OBSERVATION_SOURCES.map((source) => {
        const matches = rawHealth.filter((candidate) => (0, contracts_1.isRecord)(candidate) && candidate.source === source);
        const receipt = matches.length === 1 ? matches[0] : { state: 'error', count: 0, truncated: false };
        return normalizeSourceHealth(source, receipt, observedAtMs);
    }));
    const rows = sanitizedIncidents(input.rows);
    const reportsReceipt = rawHealth.find((candidate) => (0, contracts_1.isRecord)(candidate) && candidate.source === 'reports');
    const reportsCountMatches = reportsReceipt?.count === rows.rowCount;
    const shapeValid = inputKeysValid && observedAtValid && receiptsValid && rows.valid && reportsCountMatches;
    const analytics = sourceHealth.find((source) => source.source === 'analytics');
    const audit = sourceHealth.find((source) => source.source === 'audit');
    const initialCases = createObservationCases({
        observedAtMs,
        sourceHealth,
        analytics: {
            state: analytics?.state ?? 'error',
            qualityIncomplete: !analytics || analytics.insufficientEvidence,
            count: rawHealth.find((candidate) => (0, contracts_1.isRecord)(candidate) && candidate.source === 'analytics')?.count,
            truncated: rawHealth.find((candidate) => (0, contracts_1.isRecord)(candidate) && candidate.source === 'analytics')?.truncated,
        },
        incidents: rows.incidents,
        audit: {
            state: audit?.state ?? 'error',
            count: rawHealth.find((candidate) => (0, contracts_1.isRecord)(candidate) && candidate.source === 'audit')?.count,
            truncated: rawHealth.find((candidate) => (0, contracts_1.isRecord)(candidate) && candidate.source === 'audit')?.truncated,
        },
    });
    const cases = shapeValid ? initialCases : Object.freeze(initialCases.map((item) => Object.freeze({
        ...item,
        status: 'insufficient_data',
        insufficientEvidence: true,
    })));
    const evidenceSufficient = shapeValid && sourceHealth.every((source) => !source.insufficientEvidence);
    const digest = buildDailyObservationDigest({ generatedAtMs: observedAtMs, sourceHealth, cases });
    return Object.freeze({ observedAtMs, sourceHealth, cases, digest, evidenceSufficient });
}
//# sourceMappingURL=observation.js.map