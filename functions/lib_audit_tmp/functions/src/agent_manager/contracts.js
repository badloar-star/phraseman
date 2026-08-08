"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MANAGER_TASK_STATUSES = exports.MANAGER_ALLOWED_SCOPES = exports.MANAGER_AGENT_ROLES = exports.AGENT_MANAGER_SCHEMA_VERSION = void 0;
exports.agentIdentifier = agentIdentifier;
exports.parseManagerTaskDraft = parseManagerTaskDraft;
exports.parseManagerTaskResult = parseManagerTaskResult;
exports.parseManagerAgent = parseManagerAgent;
exports.assertManagerTaskTransition = assertManagerTaskTransition;
const https_1 = require("firebase-functions/v2/https");
const contracts_1 = require("../agent_office/contracts");
exports.AGENT_MANAGER_SCHEMA_VERSION = 1;
exports.MANAGER_AGENT_ROLES = ['manager', 'analytics', 'support', 'reports', 'developer', 'qa', 'content'];
exports.MANAGER_ALLOWED_SCOPES = ['analysis_only', 'support_draft', 'report_triage', 'code_prepare', 'content_prepare'];
exports.MANAGER_TASK_STATUSES = ['draft', 'planned', 'awaiting_approval', 'queued', 'in_progress', 'needs_review', 'completed', 'archived', 'cancelled', 'failed'];
function fail(message) { throw new https_1.HttpsError('invalid-argument', message); }
function row(value, label) { if (!value || typeof value !== 'object' || Array.isArray(value))
    fail(`${label} must be an object`); return value; }
function exact(input, keys, label) { const unknown = Object.keys(input).find((key) => !keys.includes(key)); const missing = keys.find((key) => !(key in input)); if (unknown || missing)
    fail(`${label} fields are invalid`); }
function identifier(value, label) { if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9._:-]{2,159}$/.test(value))
    fail(`${label} is invalid`); return value; }
function agentIdentifier(value, label = 'agentId') { if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9._:-]{1,159}$/.test(value))
    fail(`${label} is invalid`); return value; }
function text(value, label, min, max) { if (typeof value !== 'string')
    fail(`${label} is invalid`); const result = value.trim(); if (result.length < min || result.length > max || /[\u0000-\u001f\u007f]/.test(result))
    fail(`${label} is invalid`); return result; }
function noPii(value, label) { if (/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/.test(value) || /\+?\d[\d\s().-]{7,}\d/.test(value) || /\b(?:sk-[A-Za-z0-9_-]{12,}|AIza[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|\d{8,12}:[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]{16,})\b/i.test(value))
    fail(`${label} must be redacted`); return value; }
function choice(value, values, label) { if (typeof value !== 'string' || !values.includes(value))
    fail(`${label} is invalid`); return value; }
function parseManagerTaskDraft(value) {
    const input = row(value, 'manager task');
    exact(input, ['taskId', 'title', 'brief', 'priority', 'deadlineAtMs', 'allowedScope', 'sourceLinks'], 'manager task');
    if (!Array.isArray(input.sourceLinks) || input.sourceLinks.length > 20)
        fail('manager task sourceLinks is invalid');
    const links = input.sourceLinks.map((link) => {
        const item = row(link, 'manager task sourceLink');
        exact(item, ['sourceType', 'sourceRef'], 'manager task sourceLink');
        const sourceType = choice(item.sourceType, ['support', 'report', 'analytics', 'manual'], 'sourceType');
        const sourceRef = (0, contracts_1.isSafeOpaqueRef)(item.sourceRef) ? item.sourceRef : fail('sourceRef is invalid');
        if (!sourceRef.startsWith(`${sourceType}:`))
            fail('sourceRef type is invalid');
        return Object.freeze({ sourceType, sourceRef });
    });
    const deadlineAtMs = input.deadlineAtMs === null ? null : typeof input.deadlineAtMs === 'number' && Number.isSafeInteger(input.deadlineAtMs) && input.deadlineAtMs >= 0 ? input.deadlineAtMs : fail('deadlineAtMs is invalid');
    return Object.freeze({ schemaVersion: exports.AGENT_MANAGER_SCHEMA_VERSION, taskId: identifier(input.taskId, 'taskId'), title: noPii(text(input.title, 'title', 3, 140), 'title'), brief: noPii(text(input.brief, 'brief', 10, 4000), 'brief'), priority: choice(input.priority, ['low', 'normal', 'high', 'critical'], 'priority'), deadlineAtMs, allowedScope: choice(input.allowedScope, exports.MANAGER_ALLOWED_SCOPES, 'allowedScope'), sourceLinks: Object.freeze(links), status: 'draft' });
}
function parseManagerTaskResult(value) { const input = row(value, 'manager task result'); exact(input, ['summary', 'outcome'], 'manager task result'); return Object.freeze({ summary: noPii(text(input.summary, 'summary', 3, 2000), 'summary'), outcome: choice(input.outcome, ['needs_review', 'completed'], 'outcome') }); }
function parseManagerAgent(value) { const input = row(value, 'manager agent'); exact(input, ['schemaVersion', 'agentId', 'role', 'label', 'enabled', 'allowedScopes', 'lastCheckInAtMs'], 'manager agent'); if (input.schemaVersion !== exports.AGENT_MANAGER_SCHEMA_VERSION || typeof input.enabled !== 'boolean' || !Array.isArray(input.allowedScopes) || input.allowedScopes.length < 1 || typeof input.lastCheckInAtMs !== 'number' || !Number.isSafeInteger(input.lastCheckInAtMs) || input.lastCheckInAtMs < 0)
    fail('manager agent is invalid'); return Object.freeze({ schemaVersion: exports.AGENT_MANAGER_SCHEMA_VERSION, agentId: agentIdentifier(input.agentId), role: choice(input.role, exports.MANAGER_AGENT_ROLES, 'role'), label: text(input.label, 'label', 2, 80), enabled: input.enabled, allowedScopes: Object.freeze(input.allowedScopes.map((scope) => choice(scope, exports.MANAGER_ALLOWED_SCOPES, 'allowedScope'))), lastCheckInAtMs: input.lastCheckInAtMs }); }
const TRANSITIONS = Object.freeze({ draft: ['planned', 'cancelled'], planned: ['awaiting_approval', 'cancelled'], awaiting_approval: ['queued', 'cancelled'], queued: ['in_progress', 'cancelled', 'failed'], in_progress: ['needs_review', 'failed'], needs_review: ['completed', 'queued', 'cancelled'], completed: ['archived'], archived: [], cancelled: ['archived'], failed: ['queued', 'archived'] });
function assertManagerTaskTransition(from, to) { if (!TRANSITIONS[from]?.includes(to))
    throw new https_1.HttpsError('failed-precondition', `manager task transition ${from} -> ${to} is invalid`); }
//# sourceMappingURL=contracts.js.map