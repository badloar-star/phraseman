import {
  ADMIN_ALERT_EVENTS_COLLECTION,
  adminAlertEventId,
  enqueueAdminAlert,
  type AdminAlertOutboxDb,
} from './admin_alert_outbox';

class FakeDocumentReference {
  constructor(
    private readonly documents: Map<string, Record<string, unknown>>,
    private readonly id: string,
  ) {}

  async create(data: Record<string, unknown>): Promise<void> {
    if (this.documents.has(this.id)) throw Object.assign(new Error('already exists'), { code: 6 });
    this.documents.set(this.id, structuredClone(data));
  }
}

class FakeCollectionReference {
  constructor(private readonly documents: Map<string, Record<string, unknown>>) {}

  doc(id: string): FakeDocumentReference {
    return new FakeDocumentReference(this.documents, id);
  }
}

function fakeDb() {
  const collections = new Map<string, Map<string, Record<string, unknown>>>();
  const db: AdminAlertOutboxDb = {
    collection(name: string) {
      let documents = collections.get(name);
      if (!documents) {
        documents = new Map();
        collections.set(name, documents);
      }
      return new FakeCollectionReference(documents);
    },
  };
  return { db, collections };
}

describe('admin Telegram alert outbox', () => {
  test('builds a stable Firestore-safe event id', () => {
    expect(adminAlertEventId('user.created', 'uid-123')).toBe('user.created:uid-123');
    expect(() => adminAlertEventId('', 'uid-123')).toThrow('invalid_admin_alert_source');
    expect(() => adminAlertEventId('user.created', 'uid/123')).toThrow('invalid_admin_alert_source_id');
  });

  test('creates one immutable event for repeated source delivery', async () => {
    const { db, collections } = fakeDb();
    const input = {
      eventType: 'newUser' as const,
      source: 'user.created',
      sourceId: 'uid-123',
      occurredAtMs: 1_725_000_000_000,
      payload: { platform: 'android', uidLast4: '0123' },
    };

    await expect(enqueueAdminAlert(db, input, 1_725_000_000_100)).resolves.toEqual({
      created: true,
      eventId: 'user.created:uid-123',
    });
    await expect(enqueueAdminAlert(db, input, 1_725_000_000_200)).resolves.toEqual({
      created: false,
      eventId: 'user.created:uid-123',
    });

    const documents = collections.get(ADMIN_ALERT_EVENTS_COLLECTION);
    expect(documents?.size).toBe(1);
    expect(documents?.get('user.created:uid-123')).toMatchObject({
      schemaVersion: 1,
      eventType: 'newUser',
      status: 'pending',
      attempts: 0,
      createdAtMs: 1_725_000_000_100,
    });
  });

  test('stores only the event-specific safe payload allowlist', async () => {
    const { db, collections } = fakeDb();
    await enqueueAdminAlert(db, {
      eventType: 'premiumPurchase',
      source: 'web.paid',
      sourceId: 'order-123',
      occurredAtMs: 1_725_000_000_000,
      payload: {
        provider: 'web',
        product: 'yearly',
        amount: 29.99,
        currency: 'EUR',
        uidLast4: 'A1B2',
        email: 'leak@example.com',
        activationCode: 'SECRET-CODE',
        transactionId: 'tx-secret',
        stack: 'private stack',
      } as never,
    }, 1_725_000_000_100);

    const event = collections.get(ADMIN_ALERT_EVENTS_COLLECTION)?.get('web.paid:order-123');
    expect(event?.payload).toEqual({
      provider: 'web',
      product: 'yearly',
      amount: 29.99,
      currency: 'EUR',
      uidLast4: 'A1B2',
    });
    expect(JSON.stringify(event)).not.toContain('leak@example.com');
    expect(JSON.stringify(event)).not.toContain('SECRET-CODE');
    expect(JSON.stringify(event)).not.toContain('tx-secret');
    expect(JSON.stringify(event)).not.toContain('private stack');
  });

  test('rejects impossible timestamps before writing', async () => {
    const { db } = fakeDb();
    await expect(enqueueAdminAlert(db, {
      eventType: 'newUser',
      source: 'user.created',
      sourceId: 'uid-123',
      occurredAtMs: Number.NaN,
      payload: {},
    })).rejects.toThrow('invalid_admin_alert_occurred_at');
  });
});
