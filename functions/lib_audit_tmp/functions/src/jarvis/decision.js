"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_EVIDENCE_AGE_MS = exports.JARVIS_DECISION_SCHEMA_VERSION = void 0;
exports.normalizeEvidence = normalizeEvidence;
exports.decisionConfidence = decisionConfidence;
exports.buildDecision = buildDecision;
const node_crypto_1 = require("node:crypto");
/**
 * Ядро Джарвиса: одно решение несёт весь путь — факт, гипотеза, варианты,
 * рекомендация, риск, цена, метрика, откат.
 *
 * зачем: владелец хочет один интерфейс общения, за которым стоят департаменты.
 * Одна сущность Decision — чтобы решение выглядело одинаково в админке и в
 * Telegram, а не собиралось дважды из разных кусков.
 *
 * Главное правило проекта: отсутствие данных НИКОГДА не превращается в ноль.
 * Источник, который не может доказать своё число, отдаёт count === null.
 */
exports.JARVIS_DECISION_SCHEMA_VERSION = 1;
/** Максимальный возраст наблюдения. Старше — данные несвежие, утверждать по ним нельзя. */
exports.MAX_EVIDENCE_AGE_MS = 36 * 60 * 60 * 1000;
const EVIDENCE_STATES = ['ready', 'empty', 'partial', 'error', 'stale', 'truncated'];
const RISK_LEVELS = ['low', 'medium', 'high'];
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 3;
function isSafeCount(value) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
function isEvidenceState(value) {
    return typeof value === 'string' && EVIDENCE_STATES.includes(value);
}
/**
 * Приёмка расписки источника. Всё, что не доказано явно, схлопывается в 'error'
 * с count === null — доверять такому источнику нельзя.
 *
 * зачем: в старом коде это было единственное по-настоящему верное место, и оно
 * прямо требуется планом владельца («неполные данные не становятся ложными нулями»).
 */
function normalizeEvidence(input) {
    const sourceId = typeof input.sourceId === 'string' && input.sourceId.trim()
        ? input.sourceId.trim().slice(0, 80)
        : 'unknown_source';
    const observedAtMs = isSafeCount(input.observedAtMs) ? input.observedAtMs : 0;
    const digest = typeof input.digest === 'string' ? input.digest.slice(0, 2000) : '';
    const failClosed = () => Object.freeze({
        sourceId,
        state: 'error',
        count: null,
        truncated: input.truncated === true,
        droppedCount: isSafeCount(input.droppedCount) ? input.droppedCount : 0,
        observedAtMs,
        digest,
        trustworthy: false,
    });
    if (!isEvidenceState(input.state))
        return failClosed();
    if (typeof input.truncated !== 'boolean')
        return failClosed();
    if (!isSafeCount(input.droppedCount))
        return failClosed();
    if (input.count !== null && !isSafeCount(input.count))
        return failClosed();
    // Пустой источник обязан заявлять ровно ноль — иначе он сам себе противоречит.
    if (input.state === 'empty' && input.count !== 0)
        return failClosed();
    const truncated = input.truncated;
    const droppedCount = input.droppedCount;
    // Обрезанная выборка не даёт права на число: часть данных не увидена.
    const state = truncated || droppedCount > 0 ? 'truncated' : input.state;
    const trustworthy = state === 'ready' || state === 'empty';
    return Object.freeze({
        sourceId,
        state,
        count: trustworthy && isSafeCount(input.count) ? input.count : null,
        truncated,
        droppedCount,
        observedAtMs,
        digest,
        trustworthy,
    });
}
/**
 * Доверие к решению — доля источников, которым можно верить.
 * Нет источников — ноль доверия, а не уверенный ноль.
 */
function decisionConfidence(evidence) {
    if (evidence.length === 0)
        return 0;
    const trusted = evidence.filter((item) => item.trustworthy).length;
    return Math.round((trusted / evidence.length) * 100) / 100;
}
function assertText(value, label) {
    if (typeof value !== 'string' || !value.trim())
        throw new Error(`Jarvis decision: ${label} is required`);
    return value.trim();
}
function assertOptions(options) {
    if (!Array.isArray(options) || options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
        throw new Error(`Jarvis decision: options must contain ${MIN_OPTIONS}..${MAX_OPTIONS} items`);
    }
    return Object.freeze(options.map((option) => {
        if (!RISK_LEVELS.includes(option.risk))
            throw new Error('Jarvis decision: option risk is invalid');
        if (typeof option.cost !== 'number' || !Number.isFinite(option.cost) || option.cost < 0) {
            throw new Error('Jarvis decision: option cost is invalid');
        }
        return Object.freeze({ title: assertText(option.title, 'option title'), cost: option.cost, risk: option.risk });
    }));
}
/**
 * Хэш содержания. Меняется вместе с любым смыслом решения, поэтому одобрение,
 * выданное на прежнюю версию, автоматически перестаёт действовать.
 */
function contentHashOf(parts) {
    return (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(parts), 'utf8').digest('hex');
}
function buildDecision(input) {
    const evidence = Object.freeze((input.evidence ?? []).map(normalizeEvidence));
    const confidence = decisionConfidence(evidence);
    const options = assertOptions(input.options);
    const question = assertText(input.question, 'question');
    const finding = assertText(input.finding, 'finding');
    const hypothesis = assertText(input.hypothesis, 'hypothesis');
    const recommendation = assertText(input.recommendation, 'recommendation');
    const risk = assertText(input.risk, 'risk');
    const successMetric = assertText(input.successMetric, 'successMetric');
    const rollback = assertText(input.rollback, 'rollback');
    // зачем: факт не может утверждать больше, чем доказано. Нет ни одного
    // источника, которому можно верить — решение честно помечается как
    // недостаточно доказанное, а не показывается владельцу как вывод.
    const hasTrustworthyEvidence = evidence.some((item) => item.trustworthy);
    const status = hasTrustworthyEvidence ? 'awaiting_owner' : 'insufficient_evidence';
    const constraints = Object.freeze((input.constraints ?? []).map((item) => assertText(item, 'constraint')));
    const relatedDecisionIds = Object.freeze([...(input.relatedDecisionIds ?? [])]);
    return Object.freeze({
        schemaVersion: exports.JARVIS_DECISION_SCHEMA_VERSION,
        revision: 1,
        contentHash: contentHashOf([
            exports.JARVIS_DECISION_SCHEMA_VERSION,
            input.department,
            input.mode,
            input.trigger,
            question,
            finding,
            hypothesis,
            options,
            recommendation,
            risk,
            input.cost,
            successMetric,
            rollback,
            constraints,
            evidence.map((item) => [item.sourceId, item.state, item.count, item.droppedCount]),
        ]),
        department: input.department,
        mode: input.mode,
        trigger: input.trigger,
        question,
        evidence,
        finding,
        hypothesis,
        options,
        recommendation,
        risk,
        cost: input.cost,
        successMetric,
        rollback,
        confidence,
        constraints,
        relatedDecisionIds,
        status,
        createdAtMs: isSafeCount(input.nowMs) ? input.nowMs : 0,
    });
}
//# sourceMappingURL=decision.js.map