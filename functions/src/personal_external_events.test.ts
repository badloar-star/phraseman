import {
  appendPersonalExternalEvent,
  type PersonalExternalEventInput,
} from './personal_external_events';

type FakeRef = Readonly<{
  id: string;
  path: string;
  collection: (name: string) => Readonly<{ doc: (id: string) => FakeRef }>;
}>;

function ref(path: string): FakeRef {
  const parts = path.split('/');
  const id = parts[parts.length - 1] ?? '';
  return {
    id,
    path,
    collection: (name: string) => ({
      doc: (childId: string) => ref(`${path}/${name}/${childId}`),
    }),
  };
}

function externalEventHarness() {
  const documents = new Map<string, unknown>();
  const transaction = {
    get: async (documentRef: FakeRef) => ({
      exists: documents.has(documentRef.path),
      data: () => documents.get(documentRef.path),
    }),
    set: (documentRef: FakeRef, value: unknown) => {
      documents.set(documentRef.path, value);
    },
    create: (documentRef: FakeRef, value: unknown) => {
      if (documents.has(documentRef.path)) {
        throw new Error('fake_already_exists');
      }
      documents.set(documentRef.path, value);
    },
  };
  const userRef = ref('users/stable-1');
  return {
    documents,
    append: (input: PersonalExternalEventInput) => appendPersonalExternalEvent(
      transaction as never,
      userRef as never,
      input,
    ),
  };
}

function event(eventId: string): PersonalExternalEventInput {
  return {
    schemaVersion: 'personal-external-event.v1',
    stableUid: 'stable-1',
    eventId,
    domain: 'economy',
    kind: 'confirmed_grant',
    payload: { amount: 10, grant: `grant:${eventId}` },
    createdAtMs: 100,
  };
}

test('external events receive a monotonic per-account server sequence', async () => {
  const harness = externalEventHarness();

  const first = await harness.append(event('purchase-1'));
  const second = await harness.append(event('refund-1'));

  expect([first.event.serverSequence, second.event.serverSequence]).toEqual([1, 2]);
  expect(first.duplicate).toBe(false);
  expect(second.duplicate).toBe(false);
  expect(harness.documents.get(
    'users/stable-1/personal_sync_server_state/external_head',
  )).toMatchObject({ latestSequence: 2 });
});

test('same event ID and fingerprint replays; changed bytes conflict', async () => {
  const harness = externalEventHarness();
  const first = await harness.append(event('admin-grant-1'));
  const duplicate = await harness.append(event('admin-grant-1'));

  expect(duplicate).toEqual({ ...first, duplicate: true });
  await expect(harness.append({
    ...event('admin-grant-1'),
    payload: { amount: 999, grant: 'grant:admin-grant-1' },
  })).rejects.toThrow('personal_external_event_id_conflict');
});

test('rejects cross-user input and unsafe event IDs before reading or writing', async () => {
  const harness = externalEventHarness();

  await expect(harness.append({ ...event('purchase-1'), stableUid: 'someone-else' }))
    .rejects.toThrow('personal_external_event_scope_invalid');
  await expect(harness.append(event('../unsafe')))
    .rejects.toThrow('personal_external_event_invalid');
  expect(harness.documents.size).toBe(0);
});
