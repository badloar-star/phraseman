import { createHash } from 'node:crypto';

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

export const JARVIS_DECISION_SCHEMA_VERSION = 1 as const;

/** Максимальный возраст наблюдения. Старше — данные несвежие, утверждать по ним нельзя. */
export const MAX_EVIDENCE_AGE_MS = 36 * 60 * 60 * 1_000;

/**
 * Департаменты Джарвиса. 'money' считает УСПЕШНУЮ выручку, 'payments' —
 * наоборот, поломки оплаты (человек заплатил, доступ не выдался).
 */
export type Department = 'quality' | 'money' | 'growth' | 'content' | 'payments' | 'safety' | 'support' | 'factory' | 'retention' | 'data_health';
export type DecisionMode = 'off' | 'observe' | 'advise' | 'prepare' | 'execute';
export type DecisionTrigger = 'scheduled' | 'owner_request';
export type EvidenceState = 'ready' | 'empty' | 'partial' | 'error' | 'stale' | 'truncated';
export type RiskLevel = 'low' | 'medium' | 'high';
export type DecisionActionability = 'evidence_only' | 'confirmed_action';
export type DecisionSeverityHint = 'P0' | 'P1' | 'P2' | 'P3';

export type DecisionStatus =
  | 'draft'
  | 'awaiting_owner'
  | 'insufficient_evidence'
  | 'approved'
  | 'rejected'
  | 'expired';

export interface EvidenceInput {
  readonly sourceId: string;
  readonly state: EvidenceState | string;
  readonly count: number | null;
  readonly truncated: boolean;
  readonly droppedCount: number;
  readonly observedAtMs: number;
  readonly digest?: string;
}

export interface Evidence {
  readonly sourceId: string;
  readonly state: EvidenceState;
  /** null означает «источник не вправе утверждать число», а не «ноль». */
  readonly count: number | null;
  readonly truncated: boolean;
  readonly droppedCount: number;
  readonly observedAtMs: number;
  readonly digest: string;
  readonly trustworthy: boolean;
}

export interface DecisionOption {
  readonly title: string;
  readonly cost: number;
  readonly risk: RiskLevel;
}

export interface BuildDecisionInput {
  readonly department: Department;
  readonly mode: DecisionMode;
  readonly trigger: DecisionTrigger;
  readonly question: string;
  readonly finding: string;
  readonly hypothesis: string;
  readonly options: readonly DecisionOption[];
  readonly recommendation: string;
  readonly risk: string;
  readonly cost: number;
  readonly successMetric: string;
  readonly rollback: string;
  readonly evidence: readonly EvidenceInput[];
  /** Require every supplied source for decisions whose evidence is jointly mandatory. */
  readonly evidencePolicy?: 'any_trustworthy' | 'all_trustworthy';
  readonly actionability?: DecisionActionability;
  readonly severityHint?: DecisionSeverityHint;
  readonly constraints?: readonly string[];
  readonly relatedDecisionIds?: readonly string[];
  readonly nowMs: number;
}

export interface Decision {
  readonly schemaVersion: typeof JARVIS_DECISION_SCHEMA_VERSION;
  readonly revision: number;
  readonly contentHash: string;
  readonly department: Department;
  readonly mode: DecisionMode;
  readonly trigger: DecisionTrigger;
  readonly question: string;
  readonly evidence: readonly Evidence[];
  readonly finding: string;
  readonly hypothesis: string;
  readonly options: readonly DecisionOption[];
  readonly recommendation: string;
  readonly risk: string;
  readonly cost: number;
  readonly successMetric: string;
  readonly rollback: string;
  readonly confidence: number;
  readonly constraints: readonly string[];
  readonly relatedDecisionIds: readonly string[];
  readonly status: DecisionStatus;
  readonly actionability: DecisionActionability;
  readonly severityHint?: DecisionSeverityHint;
  readonly createdAtMs: number;
}

const EVIDENCE_STATES: readonly EvidenceState[] = ['ready', 'empty', 'partial', 'error', 'stale', 'truncated'];
const RISK_LEVELS: readonly RiskLevel[] = ['low', 'medium', 'high'];
const ACTIONABILITY_VALUES: readonly DecisionActionability[] = ['evidence_only', 'confirmed_action'];
const SEVERITY_HINT_VALUES: readonly DecisionSeverityHint[] = ['P0', 'P1', 'P2', 'P3'];

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 3;

function isSafeCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isEvidenceState(value: unknown): value is EvidenceState {
  return typeof value === 'string' && (EVIDENCE_STATES as readonly string[]).includes(value);
}

/**
 * Приёмка расписки источника. Всё, что не доказано явно, схлопывается в 'error'
 * с count === null — доверять такому источнику нельзя.
 *
 * зачем: в старом коде это было единственное по-настоящему верное место, и оно
 * прямо требуется планом владельца («неполные данные не становятся ложными нулями»).
 */
export function normalizeEvidence(input: EvidenceInput): Evidence {
  const sourceId = typeof input.sourceId === 'string' && input.sourceId.trim()
    ? input.sourceId.trim().slice(0, 80)
    : 'unknown_source';
  const observedAtMs = isSafeCount(input.observedAtMs) ? input.observedAtMs : 0;
  const digest = typeof input.digest === 'string' ? input.digest.slice(0, 2_000) : '';

  const failClosed = (): Evidence => Object.freeze({
    sourceId,
    state: 'error' as const,
    count: null,
    truncated: input.truncated === true,
    droppedCount: isSafeCount(input.droppedCount) ? input.droppedCount : 0,
    observedAtMs,
    digest,
    trustworthy: false,
  });

  if (!isEvidenceState(input.state)) return failClosed();
  if (typeof input.truncated !== 'boolean') return failClosed();
  if (!isSafeCount(input.droppedCount)) return failClosed();
  if (input.count !== null && !isSafeCount(input.count)) return failClosed();
  // Пустой источник обязан заявлять ровно ноль — иначе он сам себе противоречит.
  if (input.state === 'empty' && input.count !== 0) return failClosed();

  const truncated = input.truncated;
  const droppedCount = input.droppedCount;

  // Обрезанная выборка не даёт права на число: часть данных не увидена.
  const state: EvidenceState = truncated || droppedCount > 0 ? 'truncated' : input.state;
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
export function decisionConfidence(evidence: readonly Evidence[]): number {
  if (evidence.length === 0) return 0;
  const trusted = evidence.filter((item) => item.trustworthy).length;
  return Math.round((trusted / evidence.length) * 100) / 100;
}

function assertText(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Jarvis decision: ${label} is required`);
  return value.trim();
}

function assertOptions(options: readonly DecisionOption[]): readonly DecisionOption[] {
  if (!Array.isArray(options) || options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
    throw new Error(`Jarvis decision: options must contain ${MIN_OPTIONS}..${MAX_OPTIONS} items`);
  }
  return Object.freeze(options.map((option) => {
    if (!RISK_LEVELS.includes(option.risk)) throw new Error('Jarvis decision: option risk is invalid');
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
function contentHashOf(parts: readonly unknown[]): string {
  return createHash('sha256').update(JSON.stringify(parts), 'utf8').digest('hex');
}

export function buildDecision(input: BuildDecisionInput): Decision {
  const evidence = Object.freeze((input.evidence ?? []).map(normalizeEvidence));
  const confidence = decisionConfidence(evidence);
  const options = assertOptions(input.options);
  const actionability = input.actionability ?? 'confirmed_action';
  if (!ACTIONABILITY_VALUES.includes(actionability)) {
    throw new Error('Jarvis decision: actionability is invalid');
  }
  if (input.severityHint !== undefined && !SEVERITY_HINT_VALUES.includes(input.severityHint)) {
    throw new Error('Jarvis decision: severityHint is invalid');
  }

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
  const hasTrustworthyEvidence = input.evidencePolicy === 'all_trustworthy'
    ? evidence.length > 0 && evidence.every((item) => item.trustworthy)
    : evidence.some((item) => item.trustworthy);
  const status: DecisionStatus = hasTrustworthyEvidence ? 'awaiting_owner' : 'insufficient_evidence';

  const constraints = Object.freeze((input.constraints ?? []).map((item) => assertText(item, 'constraint')));
  const relatedDecisionIds = Object.freeze([...(input.relatedDecisionIds ?? [])]);

  return Object.freeze({
    schemaVersion: JARVIS_DECISION_SCHEMA_VERSION,
    revision: 1,
    contentHash: contentHashOf([
      JARVIS_DECISION_SCHEMA_VERSION,
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
      input.evidencePolicy ?? 'any_trustworthy',
      actionability,
      input.severityHint ?? null,
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
    actionability,
    ...(input.severityHint ? { severityHint: input.severityHint } : {}),
    createdAtMs: isSafeCount(input.nowMs) ? input.nowMs : 0,
  });
}
