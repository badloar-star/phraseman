import { createHash } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import { requireAdminPlansOwner, type AdminPlansAuth } from './auth';
import {
  parseAdminPlanDraft,
  parseCreatePlanInput,
  parseGetPlanInput,
  parseListPlansInput,
  parsePlanId,
  type AdminPlanDraft,
} from './contracts';

const PLANS = 'admin_plans' as const;
const EVENTS = 'admin_plan_events' as const;

export interface AdminPlanDocument {
  readonly id: string;
  readonly data: Record<string, unknown>;
}

export interface AdminPlanQuery {
  readonly collection: typeof PLANS;
  readonly orderBy: 'createdAtMs';
  readonly limit: number;
}

export interface AdminPlansTransaction {
  get(path: string): Promise<AdminPlanDocument | null>;
  create(path: string, data: Record<string, unknown>): void;
}

export interface AdminPlansRepository {
  get(path: string): Promise<AdminPlanDocument | null>;
  query(input: AdminPlanQuery): Promise<readonly AdminPlanDocument[]>;
  runTransaction<T>(body: (transaction: AdminPlansTransaction) => Promise<T>): Promise<T>;
}

type PersistedAdminPlan = Readonly<AdminPlanDraft & {
  planId: string;
  createdAtMs: number;
  updatedAtMs: number;
  createdByUid: string;
  createdByRole: 'owner';
  idempotencyKeyHash: string;
  requestPayloadHash: string;
  piiClass: 'none';
}>;

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function safeInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new HttpsError('data-loss', `${label} is invalid`);
  }
  return value;
}

function hashValue(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) {
    throw new HttpsError('data-loss', `${label} is invalid`);
  }
  return value;
}

function actorUid(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 200 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new HttpsError('data-loss', 'createdByUid is invalid');
  }
  return value;
}

function parsePersistedPlan(value: unknown): PersistedAdminPlan {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpsError('data-loss', 'admin plan record is invalid');
  }
  const input = value as Record<string, unknown>;
  const keys = [
    'schemaVersion', 'planId', 'planKind', 'title', 'summary', 'priority', 'expectedEffect',
    'source', 'actionCodes', 'steps', 'status',
    'createdAtMs', 'updatedAtMs', 'createdByUid', 'createdByRole', 'idempotencyKeyHash',
    'requestPayloadHash', 'piiClass',
  ];
  if (Object.keys(input).some((key) => !keys.includes(key)) || keys.some((key) => !(key in input))) {
    throw new HttpsError('data-loss', 'admin plan record fields are invalid');
  }
  const draft = parseAdminPlanDraft({
    planKind: input.planKind,
    title: input.title,
    summary: input.summary,
    priority: input.priority,
    expectedEffect: input.expectedEffect,
    source: input.source,
    actionCodes: input.actionCodes,
    steps: input.steps,
  });
  if (input.schemaVersion !== 1 || input.status !== 'draft' || input.createdByRole !== 'owner' || input.piiClass !== 'none') {
    throw new HttpsError('data-loss', 'admin plan record metadata is invalid');
  }
  return Object.freeze({
    ...draft,
    planId: parsePlanId(input.planId),
    createdAtMs: safeInteger(input.createdAtMs, 'createdAtMs'),
    updatedAtMs: safeInteger(input.updatedAtMs, 'updatedAtMs'),
    createdByUid: actorUid(input.createdByUid),
    createdByRole: 'owner',
    idempotencyKeyHash: hashValue(input.idempotencyKeyHash, 'idempotencyKeyHash'),
    requestPayloadHash: hashValue(input.requestPayloadHash, 'requestPayloadHash'),
    piiClass: 'none',
  });
}

function projectPlan(plan: PersistedAdminPlan) {
  return Object.freeze({
    schemaVersion: plan.schemaVersion,
    planId: plan.planId,
    planKind: plan.planKind,
    title: plan.title,
    summary: plan.summary,
    priority: plan.priority,
    expectedEffect: plan.expectedEffect,
    source: plan.source,
    actionCodes: plan.actionCodes,
    steps: plan.steps,
    status: plan.status,
    createdAtMs: plan.createdAtMs,
    updatedAtMs: plan.updatedAtMs,
  });
}

export class AdminPlansLedger {
  constructor(private readonly repository: AdminPlansRepository, private readonly now: () => number = Date.now) {}

  async createPlan(auth: AdminPlansAuth | null | undefined, value: unknown) {
    const actor = requireAdminPlansOwner(auth);
    const input = parseCreatePlanInput(value);
    const idempotencyKeyHash = sha256(`${actor.actorUid.length}:${actor.actorUid}:${input.idempotencyKey}`);
    const requestPayloadHash = sha256(JSON.stringify(input.draft));
    const planId = `plan_${idempotencyKeyHash}`;
    const nowMs = this.now();
    return this.repository.runTransaction(async (transaction) => {
      const existing = await transaction.get(`${PLANS}/${planId}`);
      if (existing) {
        const plan = parsePersistedPlan(existing.data);
        if (plan.idempotencyKeyHash !== idempotencyKeyHash
          || plan.requestPayloadHash !== requestPayloadHash
          || plan.createdByUid !== actor.actorUid) {
          throw new HttpsError('failed-precondition', 'idempotency key replay mismatch');
        }
        return Object.freeze({ ok: true as const, replayed: true as const, item: projectPlan(plan) });
      }
      const plan: PersistedAdminPlan = Object.freeze({
        ...input.draft,
        planId,
        createdAtMs: nowMs,
        updatedAtMs: nowMs,
        createdByUid: actor.actorUid,
        createdByRole: 'owner',
        idempotencyKeyHash,
        requestPayloadHash,
        piiClass: 'none',
      });
      transaction.create(`${PLANS}/${planId}`, plan as unknown as Record<string, unknown>);
      transaction.create(`${EVENTS}/${planId}__created`, {
        schemaVersion: 1,
        eventId: `${planId}__created`,
        eventType: 'plan_created',
        planId,
        actorUid: actor.actorUid,
        actorRole: 'owner',
        occurredAtMs: nowMs,
        requestPayloadHash,
        piiClass: 'none',
      });
      return Object.freeze({ ok: true as const, replayed: false as const, item: projectPlan(plan) });
    });
  }

  async getPlan(auth: AdminPlansAuth | null | undefined, value: unknown) {
    requireAdminPlansOwner(auth);
    const input = parseGetPlanInput(value);
    const document = await this.repository.get(`${PLANS}/${input.planId}`);
    if (!document) throw new HttpsError('not-found', 'admin plan not found');
    return Object.freeze({ ok: true as const, item: projectPlan(parsePersistedPlan(document.data)) });
  }

  async listPlans(auth: AdminPlansAuth | null | undefined, value: unknown) {
    requireAdminPlansOwner(auth);
    const input = parseListPlansInput(value);
    const documents = await this.repository.query({ collection: PLANS, orderBy: 'createdAtMs', limit: input.limit });
    return Object.freeze({
      ok: true as const,
      items: Object.freeze(documents.map((document) => projectPlan(parsePersistedPlan(document.data)))),
    });
  }
}
