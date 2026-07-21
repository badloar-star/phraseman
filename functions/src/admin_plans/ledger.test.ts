import { HttpsError } from 'firebase-functions/v2/https';
import {
  AdminPlansLedger,
  type AdminPlanDocument,
  type AdminPlanQuery,
  type AdminPlansRepository,
  type AdminPlansTransaction,
} from './ledger';

const OWNER = { uid: 'owner-uid', token: { admin: true, adminRole: 'owner' } };
const NOW_MS = 2_000_000_000_000;
const SOURCE_REF = `director_digest:sha256:${'a'.repeat(64)}`;

class MemoryRepository implements AdminPlansRepository {
  readonly documents = new Map<string, AdminPlanDocument>();
  readonly writes: Array<{ operation: 'create'; path: string }> = [];

  async get(path: string): Promise<AdminPlanDocument | null> {
    return this.documents.get(path) ?? null;
  }

  async query(input: AdminPlanQuery): Promise<readonly AdminPlanDocument[]> {
    return [...this.documents.entries()]
      .filter(([path]) => path.startsWith(`${input.collection}/`))
      .map(([, document]) => document)
      .sort((a, b) =>
        Number(b.data[input.orderBy]) - Number(a.data[input.orderBy])
        || b.id.localeCompare(a.id))
      .slice(0, input.limit);
  }

  async runTransaction<T>(body: (transaction: AdminPlansTransaction) => Promise<T>): Promise<T> {
    const staged = new Map(this.documents);
    const writes: Array<{ operation: 'create'; path: string }> = [];
    const result = await body({
      get: async (path) => staged.get(path) ?? null,
      create: (path, data) => {
        if (staged.has(path)) throw new HttpsError('already-exists', 'document already exists');
        staged.set(path, {
          id: path.split('/').at(-1) ?? '',
          data: structuredClone(data),
        });
        writes.push({ operation: 'create', path });
      },
    });
    this.documents.clear();
    staged.forEach((value, key) => this.documents.set(key, value));
    this.writes.push(...writes);
    return result;
  }
}

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: 'director-digest-plan-2026-07-19-0001',
    planKind: 'reliability',
    priority: 'high',
    expectedEffect: 'reduce_failures',
    source: { kind: 'director_digest', ref: SOURCE_REF },
    actionCodes: ['investigate_metrics', 'prepare_change', 'define_rollback'],
    ...overrides,
  };
}

describe('Admin Plans ledger', () => {
  test('creates an owner-only durable draft with audit-safe server metadata', async () => {
    const repository = new MemoryRepository();
    const ledger = new AdminPlansLedger(repository, () => NOW_MS);

    const result = await ledger.createPlan(OWNER, createInput());

    expect(result).toMatchObject({
      ok: true,
      replayed: false,
      item: {
        planId: expect.stringMatching(/^plan_[a-f0-9]{64}$/),
        schemaVersion: 1,
        status: 'draft',
        planKind: 'reliability',
        expectedEffect: 'reduce_failures',
        actionCodes: ['investigate_metrics', 'prepare_change', 'define_rollback'],
        title: 'Reliability improvement plan',
        summary: 'Reduce verified failures while preserving current behavior.',
        source: { kind: 'director_digest', ref: SOURCE_REF },
        steps: [
          { title: 'Investigate verified metrics', outcome: 'A bounded evidence summary is ready for owner review.' },
          { title: 'Prepare a bounded change', outcome: 'A non-executing change proposal is ready for owner review.' },
          { title: 'Define rollback criteria', outcome: 'Explicit rollback conditions are recorded before execution.' },
        ],
        createdAtMs: NOW_MS,
        updatedAtMs: NOW_MS,
      },
    });
    const planId = result.item.planId;
    expect(repository.documents.get(`admin_plans/${planId}`)?.data).toMatchObject({
      createdByUid: 'owner-uid',
      createdByRole: 'owner',
      piiClass: 'none',
      idempotencyKeyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      requestPayloadHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(repository.documents.get(`admin_plan_events/${planId}__created`)?.data).toEqual({
      schemaVersion: 1,
      eventId: `${planId}__created`,
      eventType: 'plan_created',
      planId,
      actorUid: 'owner-uid',
      actorRole: 'owner',
      occurredAtMs: NOW_MS,
      requestPayloadHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      piiClass: 'none',
    });
    expect(JSON.stringify(result)).not.toMatch(/owner-uid|idempotencyKey|requestPayloadHash/i);
  });

  test('deduplicates a matching token and rejects token reuse with a different payload', async () => {
    const repository = new MemoryRepository();
    const ledger = new AdminPlansLedger(repository, () => NOW_MS);

    const created = await ledger.createPlan(OWNER, createInput());
    const replayed = await ledger.createPlan(OWNER, createInput());

    expect(replayed).toMatchObject({
      ok: true,
      replayed: true,
      item: { planId: created.item.planId },
    });
    expect([...repository.documents.keys()].filter((path) => path.startsWith('admin_plans/'))).toHaveLength(1);
    expect([...repository.documents.keys()].filter((path) => path.startsWith('admin_plan_events/'))).toHaveLength(1);
    await expect(ledger.createPlan(OWNER, createInput({ expectedEffect: 'improve_resilience' })))
      .rejects.toMatchObject({ code: 'failed-precondition' });
  });

  test('scopes the same client idempotency key to the authenticated owner UID', async () => {
    const repository = new MemoryRepository();
    const ledger = new AdminPlansLedger(repository, () => NOW_MS);
    const secondOwner = { uid: 'second-owner-uid', token: { admin: true, adminRole: 'owner' } };

    const first = await ledger.createPlan(OWNER, createInput());
    const second = await ledger.createPlan(secondOwner, createInput());

    expect(first).toMatchObject({ ok: true, replayed: false });
    expect(second).toMatchObject({ ok: true, replayed: false });
    expect(second.item.planId).not.toBe(first.item.planId);
    expect([...repository.documents.keys()].filter((path) => path.startsWith('admin_plans/'))).toHaveLength(2);
  });

  test.each([
    ['missing auth', null],
    ['missing admin claim', { uid: 'owner-uid', token: { adminRole: 'owner' } }],
    ['non-owner role', { uid: 'admin-uid', token: { admin: true, adminRole: 'admin' } }],
  ])('rejects create and read access for %s', async (_label, auth) => {
    const repository = new MemoryRepository();
    const ledger = new AdminPlansLedger(repository, () => NOW_MS);

    await expect(ledger.createPlan(auth, createInput())).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(ledger.getPlan(auth, { planId: `plan_${'b'.repeat(64)}` })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(ledger.listPlans(auth, { limit: 20 })).rejects.toMatchObject({ code: 'permission-denied' });
    expect(repository.writes).toHaveLength(0);
  });

  test.each([
    ['legitimate phrase as free-form title', { title: 'Improve onboarding outcomes' }],
    ['person name as free-form summary', { summary: 'Review Sam at noon' }],
    ['short address as free-form details', { details: '1 High St' }],
    ['short Firebase UID as free-form details', { details: 'aB3dE5fG7hI9' }],
    ['unknown raw email field', { rawEmail: 'person@example.com' }],
    ['unknown raw body field', { body: 'private support request' }],
    ['non-opaque source', { source: { kind: 'director_digest', ref: 'director_digest:daily-owner-email' } }],
    ['unknown plan kind', { planKind: 'custom' }],
    ['unknown expected effect', { expectedEffect: 'send_email' }],
    ['unknown action code', { actionCodes: ['investigate_metrics', 'contact_user'] }],
    ['empty actions', { actionCodes: [] }],
  ])('rejects unsafe or malformed create input: %s', async (_label, overrides) => {
    const repository = new MemoryRepository();
    const ledger = new AdminPlansLedger(repository, () => NOW_MS);

    await expect(ledger.createPlan(OWNER, createInput(overrides)))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    expect(repository.writes).toHaveLength(0);
  });

  test('gets and lists only safe owner projections in newest-first order', async () => {
    const repository = new MemoryRepository();
    const ledger = new AdminPlansLedger(repository, () => NOW_MS);
    const older = await ledger.createPlan(OWNER, createInput());
    const newerLedger = new AdminPlansLedger(repository, () => NOW_MS + 1);
    const newer = await newerLedger.createPlan(OWNER, createInput({
      idempotencyKey: 'director-digest-plan-2026-07-19-0002',
      planKind: 'retention',
      expectedEffect: 'reduce_drop_off',
    }));

    await expect(ledger.getPlan(OWNER, { planId: older.item.planId })).resolves.toEqual({
      ok: true,
      item: older.item,
    });
    const listed = await ledger.listPlans(OWNER, { limit: 2 });
    expect(listed.items.map((item) => item.planId)).toEqual([newer.item.planId, older.item.planId]);
    expect(JSON.stringify(listed)).not.toMatch(/owner-uid|idempotencyKey|requestPayloadHash|person@example.com|body/i);
  });

  test('validates read inputs and returns not-found for an absent plan', async () => {
    const ledger = new AdminPlansLedger(new MemoryRepository(), () => NOW_MS);

    await expect(ledger.getPlan(OWNER, { planId: 'unsafe/path' }))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(ledger.getPlan(OWNER, { planId: `plan_${'b'.repeat(64)}` }))
      .rejects.toMatchObject({ code: 'not-found' });
    await expect(ledger.listPlans(OWNER, { limit: 0 }))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(ledger.listPlans(OWNER, { limit: 101 }))
      .rejects.toMatchObject({ code: 'invalid-argument' });
  });
});
