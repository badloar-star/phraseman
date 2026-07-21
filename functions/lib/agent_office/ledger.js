"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentOfficeLedger = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("./auth");
const contracts_1 = require("./contracts");
const projection_1 = require("./projection");
const telegram_contracts_1 = require("./telegram_contracts");
function invalidInput(message) {
    throw new https_1.HttpsError('invalid-argument', message);
}
function inputRow(value, label) {
    if (!(0, contracts_1.isRecord)(value))
        invalidInput(`${label} must be an object`);
    return value;
}
function parseLimit(value) {
    if (value === undefined)
        return 50;
    const limit = (0, contracts_1.parsePositiveInteger)(value, 'limit');
    if (limit > 100)
        invalidInput('limit is invalid');
    return limit;
}
function parseCursorText(value) {
    if (value === undefined || value === '')
        return '';
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,800}$/.test(value))
        invalidInput('cursor is invalid');
    return value;
}
function parseListInput(value) {
    const input = inputRow(value, 'list request');
    const allowed = ['limit', 'cursor'];
    const unknown = Object.keys(input).find((key) => !allowed.includes(key));
    if (unknown)
        invalidInput(`list request unknown field: ${unknown}`);
    return Object.freeze({ limit: parseLimit(input.limit), cursor: parseCursorText(input.cursor) });
}
function parseCaseListInput(value, allowEmptyCaseId) {
    const input = inputRow(value, 'case list request');
    const allowed = ['caseId', 'limit', 'cursor'];
    const unknown = Object.keys(input).find((key) => !allowed.includes(key));
    if (unknown)
        invalidInput(`case list request unknown field: ${unknown}`);
    const rawCaseId = input.caseId;
    const caseId = allowEmptyCaseId && (rawCaseId === '' || rawCaseId === undefined) ? '' : (0, contracts_1.parseIdentifier)(rawCaseId, 'caseId');
    return Object.freeze({ caseId, limit: parseLimit(input.limit), cursor: parseCursorText(input.cursor) });
}
function decodeCursor(encoded, collection, orderBy, caseId) {
    if (!encoded)
        return undefined;
    try {
        const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
        if (!(0, contracts_1.isRecord)(parsed))
            throw new Error('not object');
        (0, contracts_1.assertExactKeys)(parsed, ['collection', 'orderBy', 'caseId', 'value', 'id'], 'cursor');
        if (parsed.collection !== collection || parsed.orderBy !== orderBy || parsed.caseId !== caseId)
            throw new Error('cursor scope mismatch');
        return Object.freeze({
            value: (0, contracts_1.parseNonNegativeInteger)(parsed.value, 'cursor.value'),
            id: (0, contracts_1.parseIdentifier)(parsed.id, 'cursor.id'),
        });
    }
    catch {
        throw new https_1.HttpsError('invalid-argument', 'cursor is invalid');
    }
}
function encodeCursor(query, row) {
    const value = (0, contracts_1.parseNonNegativeInteger)(row.data[query.orderBy], `cursor.${query.orderBy}`);
    return Buffer.from(JSON.stringify({
        collection: query.collection,
        orderBy: query.orderBy,
        caseId: query.caseId ?? '',
        value,
        id: row.id,
    }), 'utf8').toString('base64url');
}
function parseDecisionInput(value) {
    const input = inputRow(value, 'decision request');
    (0, contracts_1.assertExactKeys)(input, [
        'caseId', 'expectedCaseRevision', 'recommendationId', 'recommendationRevision',
        'recommendationContentHash', 'decision', 'reason', 'idempotencyKey',
    ], 'decision request');
    return Object.freeze({
        caseId: (0, contracts_1.parseIdentifier)(input.caseId, 'caseId'),
        expectedCaseRevision: (0, contracts_1.parsePositiveInteger)(input.expectedCaseRevision, 'expectedCaseRevision'),
        recommendationId: (0, contracts_1.parseIdentifier)(input.recommendationId, 'recommendationId'),
        recommendationRevision: (0, contracts_1.parsePositiveInteger)(input.recommendationRevision, 'recommendationRevision'),
        recommendationContentHash: (0, contracts_1.parseHash)(input.recommendationContentHash, 'recommendationContentHash'),
        decision: (0, contracts_1.parseDecision)(input.decision),
        reason: (0, contracts_1.parseBoundedText)(input.reason, 'reason', 500),
        idempotencyKey: (0, contracts_1.parseIdempotencyKey)(input.idempotencyKey),
    });
}
function parseSetKillSwitchInput(value) {
    const input = inputRow(value, 'kill switch request');
    (0, contracts_1.assertExactKeys)(input, ['enabled', 'expectedRevision', 'reason', 'idempotencyKey'], 'kill switch request');
    return Object.freeze({
        enabled: (0, contracts_1.parseBoolean)(input.enabled, 'enabled'),
        expectedRevision: (0, contracts_1.parseNonNegativeInteger)(input.expectedRevision, 'expectedRevision'),
        reason: (0, contracts_1.parseBoundedText)(input.reason, 'reason', 500),
        idempotencyKey: (0, contracts_1.parseIdempotencyKey)(input.idempotencyKey),
    });
}
function keyHash(actorUid, idempotencyKey) {
    return (0, contracts_1.sha256)(JSON.stringify([actorUid, idempotencyKey]));
}
function decisionPayloadHash(actorUid, input) {
    return (0, contracts_1.sha256)(JSON.stringify({
        actorUid,
        caseId: input.caseId,
        expectedCaseRevision: input.expectedCaseRevision,
        recommendationId: input.recommendationId,
        recommendationRevision: input.recommendationRevision,
        recommendationContentHash: input.recommendationContentHash,
        decision: input.decision,
        reason: input.reason,
        scope: contracts_1.AGENT_OFFICE_SCOPE,
    }));
}
function controlPayloadHash(actorUid, input) {
    return (0, contracts_1.sha256)(JSON.stringify({
        actorUid,
        enabled: input.enabled,
        expectedRevision: input.expectedRevision,
        reason: input.reason,
    }));
}
function decisionResult(approval, idempotent) {
    return Object.freeze({
        ok: true,
        idempotent,
        approvalId: approval.approvalId,
        decision: approval.decision,
        scope: contracts_1.AGENT_OFFICE_SCOPE,
        enqueuedTaskId: null,
        caseRevision: approval.caseRevisionAfter,
    });
}
function controlResult(control, idempotent) {
    return Object.freeze({
        ok: true,
        idempotent,
        operation: Object.freeze({ revision: control.revision, killSwitchEnabled: control.killSwitchEnabled }),
        control: (0, projection_1.projectAgentOfficeControl)(control),
    });
}
function currentControlProjection(document) {
    if (!document) {
        return Object.freeze({
            controlId: 'global',
            killSwitchEnabled: true,
            revision: 0,
            state: 'missing_fail_closed',
            lastChangedAtMs: null,
        });
    }
    try {
        return (0, projection_1.projectAgentOfficeControl)(document.data);
    }
    catch {
        return Object.freeze({
            controlId: 'global',
            killSwitchEnabled: true,
            revision: 0,
            state: 'invalid_fail_closed',
            lastChangedAtMs: null,
        });
    }
}
class AgentOfficeLedger {
    constructor(repository, now = Date.now) {
        this.repository = repository;
        this.now = now;
    }
    async listCases(auth, value) {
        (0, auth_1.requireAgentOfficeReader)(auth, 'briefing.read');
        const input = parseListInput(value);
        const baseQuery = {
            collection: 'agent_cases',
            orderBy: 'updatedAtMs',
            limit: input.limit + 1,
        };
        const query = { ...baseQuery, cursor: decodeCursor(input.cursor, baseQuery.collection, baseQuery.orderBy, '') };
        const rows = await this.repository.query(query);
        const page = rows.slice(0, input.limit);
        return Object.freeze({
            ok: true,
            items: Object.freeze(page.map((row) => (0, projection_1.projectAgentCase)(row.id, row.data))),
            nextCursor: rows.length > input.limit && page.length ? encodeCursor(query, page[page.length - 1]) : null,
        });
    }
    async getCase(auth, value) {
        (0, auth_1.requireAgentOfficeReader)(auth, 'briefing.read');
        const input = inputRow(value, 'get case request');
        (0, contracts_1.assertExactKeys)(input, ['caseId'], 'get case request');
        const caseId = (0, contracts_1.parseIdentifier)(input.caseId, 'caseId');
        const document = await this.repository.get(`agent_cases/${caseId}`);
        if (!document)
            throw new https_1.HttpsError('not-found', 'Agent case not found');
        return Object.freeze({ ok: true, item: (0, projection_1.projectAgentCase)(document.id, document.data) });
    }
    async getAggregateHealth(auth) {
        (0, auth_1.requireAgentOfficeReader)(auth, 'briefing.read');
        (0, auth_1.requireAgentOfficeOwner)(auth);
        const rows = await this.repository.query({
            collection: 'agent_observation_receipts',
            orderBy: 'observedAtMs',
            limit: 1,
        });
        const latest = rows[0];
        if (!latest)
            throw new https_1.HttpsError('failed-precondition', 'Agent Office aggregate health is unavailable');
        return Object.freeze({
            ok: true,
            items: (0, projection_1.projectAgentAggregateHealth)(latest.data),
        });
    }
    async listRecommendations(auth, value) {
        (0, auth_1.requireAgentOfficeReader)(auth, 'briefing.read');
        const input = parseCaseListInput(value, false);
        const baseQuery = {
            collection: 'agent_recommendations',
            orderBy: 'revision',
            limit: input.limit + 1,
            caseId: input.caseId,
        };
        const query = { ...baseQuery, cursor: decodeCursor(input.cursor, baseQuery.collection, baseQuery.orderBy, input.caseId) };
        const rows = await this.repository.query(query);
        const page = rows.slice(0, input.limit);
        return Object.freeze({
            ok: true,
            items: Object.freeze(page.map((row) => (0, projection_1.projectAgentRecommendation)(row.id, row.data))),
            nextCursor: rows.length > input.limit && page.length ? encodeCursor(query, page[page.length - 1]) : null,
        });
    }
    async listTasks(auth, value) {
        (0, auth_1.requireAgentOfficeReader)(auth, 'diagnostics.read');
        const input = parseListInput(value);
        const baseQuery = {
            collection: 'agent_tasks',
            orderBy: 'createdAtMs',
            limit: input.limit + 1,
        };
        const query = { ...baseQuery, cursor: decodeCursor(input.cursor, baseQuery.collection, baseQuery.orderBy, '') };
        const rows = await this.repository.query(query);
        const page = rows.slice(0, input.limit);
        return Object.freeze({
            ok: true,
            items: Object.freeze(page.map((row) => (0, projection_1.projectAgentTask)(row.id, row.data))),
            nextCursor: rows.length > input.limit && page.length ? encodeCursor(query, page[page.length - 1]) : null,
        });
    }
    async listAuditEvents(auth, value) {
        (0, auth_1.requireAgentOfficeReader)(auth, 'diagnostics.read');
        const input = parseCaseListInput(value, true);
        const baseQuery = {
            collection: 'agent_audit_events',
            orderBy: 'occurredAtMs',
            limit: input.limit + 1,
            ...(input.caseId ? { caseId: input.caseId } : {}),
        };
        const query = { ...baseQuery, cursor: decodeCursor(input.cursor, baseQuery.collection, baseQuery.orderBy, input.caseId) };
        const rows = await this.repository.query(query);
        const page = rows.slice(0, input.limit);
        return Object.freeze({
            ok: true,
            items: Object.freeze(page.map((row) => (0, projection_1.projectAgentAuditEvent)(row.id, row.data))),
            nextCursor: rows.length > input.limit && page.length ? encodeCursor(query, page[page.length - 1]) : null,
        });
    }
    async decideRecommendation(auth, value) {
        return this.decideRecommendationInternal(auth, value);
    }
    async decideTelegramRecommendation(auth, value, guard) {
        return this.decideRecommendationInternal(auth, value, guard);
    }
    async decideRecommendationInternal(auth, value, telegramGuard) {
        const actor = (0, auth_1.requireAgentOfficeOwner)(auth);
        const input = parseDecisionInput(value);
        const guardedToken = telegramGuard ? (0, telegram_contracts_1.parseAgentTelegramApprovalToken)(telegramGuard.token) : null;
        const guardedUpdateIdHash = telegramGuard ? (0, contracts_1.parseHash)(telegramGuard.updateIdHash, 'Telegram updateIdHash') : null;
        const approvalId = (0, contracts_1.approvalDocumentId)(input.caseId, input.recommendationId, input.recommendationRevision);
        const idempotencyKeyHash = keyHash(actor.actorUid, input.idempotencyKey);
        const payloadHash = decisionPayloadHash(actor.actorUid, input);
        const auditId = `decision_${idempotencyKeyHash}`;
        const auditPath = `agent_audit_events/${auditId}`;
        const approvalPath = `agent_approvals/${approvalId}`;
        const casePath = `agent_cases/${input.caseId}`;
        const recommendationPath = `agent_recommendations/${input.caseId}__r${input.recommendationRevision}`;
        const controlPath = 'agent_office_control/global';
        const tokenPath = guardedToken ? (0, telegram_contracts_1.telegramApprovalTokenPath)(guardedToken.tokenIdHash) : null;
        return this.repository.runTransaction(async (transaction) => {
            const controlDocument = guardedToken ? await transaction.get(controlPath) : null;
            const tokenDocument = tokenPath ? await transaction.get(tokenPath) : null;
            const replayAuditDocument = await transaction.get(auditPath);
            const caseDocument = await transaction.get(casePath);
            const recommendationDocument = await transaction.get(recommendationPath);
            const approvalDocument = await transaction.get(approvalPath);
            const nowMs = this.now();
            let persistedToken = null;
            if (guardedToken) {
                if (!guardedUpdateIdHash || !controlDocument || !tokenDocument || !tokenPath) {
                    throw new https_1.HttpsError('failed-precondition', 'Telegram approval guard is unavailable');
                }
                const control = (0, contracts_1.parseAgentOfficeControl)(controlDocument.data);
                if (control.killSwitchEnabled)
                    throw new https_1.HttpsError('failed-precondition', 'Agent Office kill switch is enabled');
                if (control.revision !== guardedToken.controlRevision)
                    throw new https_1.HttpsError('failed-precondition', 'stale Telegram control revision');
                persistedToken = (0, telegram_contracts_1.parseAgentTelegramApprovalToken)(tokenDocument.data);
                if (JSON.stringify(persistedToken) !== JSON.stringify(guardedToken)) {
                    throw new https_1.HttpsError('failed-precondition', 'Telegram approval token binding mismatch');
                }
                if (persistedToken.ownerUid !== actor.actorUid
                    || persistedToken.caseId !== input.caseId
                    || persistedToken.expectedCaseRevision !== input.expectedCaseRevision
                    || persistedToken.recommendationId !== input.recommendationId
                    || persistedToken.recommendationRevision !== input.recommendationRevision
                    || persistedToken.recommendationContentHash !== input.recommendationContentHash
                    || (persistedToken.permittedVerb === 'authorize' ? 'approve' : 'decline') !== input.decision) {
                    throw new https_1.HttpsError('failed-precondition', 'Telegram approval token scope mismatch');
                }
                if (persistedToken.issuedAtMs > nowMs || persistedToken.validUntilMs <= nowMs) {
                    throw new https_1.HttpsError('failed-precondition', 'Telegram approval token expired');
                }
                if (persistedToken.status === 'revoked')
                    throw new https_1.HttpsError('failed-precondition', 'Telegram approval token is revoked');
                if (persistedToken.status === 'consumed'
                    && (persistedToken.consumedUpdateIdHash !== guardedUpdateIdHash || persistedToken.consumedApprovalId !== approvalId)) {
                    throw new https_1.HttpsError('failed-precondition', 'Telegram approval token replay mismatch');
                }
            }
            if (replayAuditDocument) {
                if (persistedToken && persistedToken.status !== 'consumed') {
                    throw new https_1.HttpsError('data-loss', 'Telegram approval token consumption is missing');
                }
                const replayAudit = (0, contracts_1.parseAgentAuditEvent)(replayAuditDocument.data);
                if (replayAudit.eventType !== 'recommendation_decided' || replayAudit.payloadHash !== payloadHash) {
                    throw new https_1.HttpsError('failed-precondition', 'idempotency key conflict');
                }
                if (!approvalDocument)
                    throw new https_1.HttpsError('data-loss', 'idempotent approval is missing');
                const approval = (0, contracts_1.parseAgentApproval)(approvalDocument.data);
                if (approval.idempotencyKeyHash !== idempotencyKeyHash || approval.idempotencyPayloadHash !== payloadHash) {
                    throw new https_1.HttpsError('data-loss', 'idempotent approval mismatch');
                }
                return decisionResult(approval, true);
            }
            if (!caseDocument)
                throw new https_1.HttpsError('not-found', 'Agent case not found');
            const agentCase = (0, contracts_1.parseAgentCase)(caseDocument.data);
            if (agentCase.revision !== input.expectedCaseRevision)
                throw new https_1.HttpsError('failed-precondition', 'stale case revision');
            if (agentCase.status !== 'awaiting_decision')
                throw new https_1.HttpsError('failed-precondition', 'case is not awaiting decision');
            const current = agentCase.currentRecommendation;
            if (!current || current.recommendationId !== input.recommendationId || current.revision !== input.recommendationRevision) {
                throw new https_1.HttpsError('failed-precondition', 'stale recommendation revision');
            }
            if (current.contentHash !== input.recommendationContentHash)
                throw new https_1.HttpsError('failed-precondition', 'recommendation contentHash mismatch');
            if (!recommendationDocument)
                throw new https_1.HttpsError('not-found', 'Agent recommendation not found');
            if (approvalDocument)
                throw new https_1.HttpsError('failed-precondition', 'immutable approval already exists');
            const recommendation = (0, contracts_1.parseAgentRecommendation)(recommendationDocument.data);
            if (recommendation.caseId !== input.caseId || recommendation.recommendationId !== input.recommendationId || recommendation.revision !== input.recommendationRevision) {
                throw new https_1.HttpsError('failed-precondition', 'recommendation identity mismatch');
            }
            if (recommendation.contentHash !== input.recommendationContentHash)
                throw new https_1.HttpsError('failed-precondition', 'recommendation contentHash mismatch');
            if (recommendation.contentHash !== (0, contracts_1.agentRecommendationContentHash)(recommendation)) {
                throw new https_1.HttpsError('failed-precondition', 'recommendation canonical contentHash mismatch');
            }
            if (recommendation.scope !== contracts_1.AGENT_OFFICE_SCOPE)
                throw new https_1.HttpsError('failed-precondition', 'recommendation scope is not prepare_only');
            if (recommendation.validUntilMs <= nowMs)
                throw new https_1.HttpsError('failed-precondition', 'recommendation expired');
            if (persistedToken && persistedToken.status !== 'active') {
                throw new https_1.HttpsError('failed-precondition', 'Telegram approval token already consumed');
            }
            const nextStatus = input.decision === 'approve' ? 'approved' : 'cancelled';
            (0, contracts_1.assertAgentCaseTransition)(agentCase.status, nextStatus);
            const nextCaseRevision = agentCase.revision + 1;
            const approval = (0, contracts_1.parseAgentApproval)({
                schemaVersion: contracts_1.AGENT_OFFICE_SCHEMA_VERSION,
                approvalId,
                caseId: input.caseId,
                caseRevisionBefore: agentCase.revision,
                caseRevisionAfter: nextCaseRevision,
                recommendationId: input.recommendationId,
                recommendationRevision: input.recommendationRevision,
                recommendationContentHash: input.recommendationContentHash,
                decision: input.decision,
                scope: contracts_1.AGENT_OFFICE_SCOPE,
                ownerUid: actor.actorUid,
                reason: input.reason,
                idempotencyKeyHash,
                idempotencyPayloadHash: payloadHash,
                decidedAtMs: nowMs,
                enqueuedTaskId: null,
            });
            const audit = (0, contracts_1.parseAgentAuditEvent)({
                schemaVersion: contracts_1.AGENT_OFFICE_SCHEMA_VERSION,
                eventId: auditId,
                eventType: 'recommendation_decided',
                caseId: input.caseId,
                recommendationId: input.recommendationId,
                approvalId,
                decision: input.decision,
                caseRevision: nextCaseRevision,
                actorRole: 'owner',
                scope: contracts_1.AGENT_OFFICE_SCOPE,
                idempotencyKeyHash,
                payloadHash,
                occurredAtMs: nowMs,
                piiClass: 'none',
            });
            transaction.create(approvalPath, approval);
            transaction.create(auditPath, audit);
            transaction.update(casePath, { status: nextStatus, revision: nextCaseRevision, updatedAtMs: nowMs });
            if (tokenPath && guardedUpdateIdHash) {
                transaction.update(tokenPath, {
                    status: 'consumed',
                    consumedAtMs: nowMs,
                    consumedApprovalId: approvalId,
                    consumedUpdateIdHash: guardedUpdateIdHash,
                });
            }
            return decisionResult(approval, false);
        });
    }
    async getControl(auth) {
        (0, auth_1.requireAgentOfficeReader)(auth, 'briefing.read');
        const document = await this.repository.get('agent_office_control/global');
        return Object.freeze({ ok: true, control: currentControlProjection(document) });
    }
    async setKillSwitch(auth, value) {
        const actor = (0, auth_1.requireAgentOfficeOwner)(auth);
        const input = parseSetKillSwitchInput(value);
        const idempotencyKeyHash = keyHash(actor.actorUid, input.idempotencyKey);
        const payloadHash = controlPayloadHash(actor.actorUid, input);
        const auditId = `control_${idempotencyKeyHash}`;
        const auditPath = `agent_audit_events/${auditId}`;
        const controlPath = 'agent_office_control/global';
        const nowMs = this.now();
        return this.repository.runTransaction(async (transaction) => {
            const replayAuditDocument = await transaction.get(auditPath);
            const controlDocument = await transaction.get(controlPath);
            if (replayAuditDocument) {
                const replayAudit = (0, contracts_1.parseAgentAuditEvent)(replayAuditDocument.data);
                if (replayAudit.eventType !== 'kill_switch_changed' || replayAudit.payloadHash !== payloadHash) {
                    throw new https_1.HttpsError('failed-precondition', 'idempotency key conflict');
                }
                return Object.freeze({
                    ok: true,
                    idempotent: true,
                    operation: Object.freeze({
                        revision: replayAudit.controlRevision,
                        killSwitchEnabled: replayAudit.killSwitchEnabled,
                    }),
                    control: currentControlProjection(controlDocument),
                });
            }
            let current = null;
            if (controlDocument)
                current = (0, contracts_1.parseAgentOfficeControl)(controlDocument.data);
            if (!current && !input.enabled)
                throw new https_1.HttpsError('failed-precondition', 'control uninitialized; initialize enabled first');
            const currentRevision = current?.revision ?? 0;
            if (input.expectedRevision !== currentRevision)
                throw new https_1.HttpsError('failed-precondition', 'stale control revision');
            const nextRevision = currentRevision + 1;
            const control = (0, contracts_1.parseAgentOfficeControl)({
                schemaVersion: contracts_1.AGENT_OFFICE_SCHEMA_VERSION,
                controlId: 'global',
                killSwitchEnabled: input.enabled,
                revision: nextRevision,
                lastChangedAtMs: nowMs,
                lastChangedByUid: actor.actorUid,
                lastIdempotencyKeyHash: idempotencyKeyHash,
                lastPayloadHash: payloadHash,
            });
            const audit = (0, contracts_1.parseAgentAuditEvent)({
                schemaVersion: contracts_1.AGENT_OFFICE_SCHEMA_VERSION,
                eventId: auditId,
                eventType: 'kill_switch_changed',
                controlRevision: nextRevision,
                killSwitchEnabled: input.enabled,
                actorRole: 'owner',
                idempotencyKeyHash,
                payloadHash,
                occurredAtMs: nowMs,
                piiClass: 'none',
            });
            transaction.set(controlPath, control);
            transaction.create(auditPath, audit);
            return controlResult(control, false);
        });
    }
}
exports.AgentOfficeLedger = AgentOfficeLedger;
//# sourceMappingURL=ledger.js.map