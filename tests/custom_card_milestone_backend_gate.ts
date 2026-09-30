import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(__dirname, '..');
const corePath = resolve(root, 'functions/src/custom_card_milestone_core.ts');

assert.equal(
  existsSync(corePath),
  true,
  'custom-card milestone backend core must exist',
);

type StoredDocument = Readonly<Record<string, unknown>>;

function memoryStore() {
  const documents = new Map<string, StoredDocument>();
  let createAttempts = 0;
  return {
    documents,
    get createAttempts() { return createAttempts; },
    store: {
      createIfAbsent: async (eventId: string, document: StoredDocument): Promise<boolean> => {
        createAttempts += 1;
        if (documents.has(eventId)) return false;
        documents.set(eventId, document);
        return true;
      },
    },
  };
}

const nowMs = 1_800_000_000_000;

async function main(): Promise<void> {
  const core = await import(pathToFileURL(corePath).href) as typeof import('../functions/src/custom_card_milestone_core');
  const catalog = await import('../functions/src/admin_alert_catalog');
  const privacy = await import('../functions/src/admin_alert_privacy');
  const templates = await import('../functions/src/admin_alert_templates');

async function rejectsWithoutWrite(
  authUid: string | null,
  data: unknown,
  expectedCode: string,
): Promise<void> {
  const memory = memoryStore();
  await assert.rejects(
    core.recordCustomCardMilestone({ authUid, data, nowMs }, memory.store),
    (error: unknown) => error instanceof core.CustomCardMilestoneRequestError
      && error.code === expectedCode,
  );
  assert.equal(memory.createAttempts, 0, 'invalid or mismatched identity must perform zero writes');
  assert.equal(memory.documents.size, 0);
}

await rejectsWithoutWrite(null, {
  count: 1_500,
  language: 'en',
  expectedOwnerUid: 'owner-a',
}, 'unauthenticated');

// Captured A, but native callable eventually authenticates as B: reject before
// deriving or writing an event for either account.
await rejectsWithoutWrite('owner-b', {
  count: 1_500,
  language: 'en',
  expectedOwnerUid: 'owner-a',
}, 'permission-denied');

await rejectsWithoutWrite('owner-a', {
  count: 1_500,
  language: 'en',
}, 'invalid-argument');
await rejectsWithoutWrite('owner-a', {
  count: 1_500,
  language: 'en',
  expectedOwnerUid: ' '.repeat(2),
}, 'invalid-argument');
await rejectsWithoutWrite('owner-a', {
  count: 1_499,
  language: 'en',
  expectedOwnerUid: 'owner-a',
}, 'invalid-argument');
await rejectsWithoutWrite('owner-a', {
  count: 1_500,
  language: 'ru',
  expectedOwnerUid: 'owner-a',
}, 'invalid-argument');

const memory = memoryStore();
const first = await core.recordCustomCardMilestone({
  authUid: 'owner-a',
  data: {
    count: 1_500,
    language: 'en',
    expectedOwnerUid: 'owner-a',
    cardText: 'must never persist',
  },
  nowMs,
}, memory.store);
assert.deepEqual(first, { accepted: true, duplicate: false });
assert.equal(memory.documents.size, 1);

const [firstEventId, firstDocument] = [...memory.documents.entries()][0];
assert.match(firstEventId, /^custom_cards\.milestone:[a-f0-9]{48}$/u);
assert.equal(firstDocument.eventType, 'customCardMilestone');
assert.equal(firstDocument.source, 'custom_cards.milestone');
assert.equal(firstDocument.status, 'pending');
assert.deepEqual(firstDocument.payload, { count: 1_500, language: 'en' });
const serialized = JSON.stringify(firstDocument);
assert.doesNotMatch(serialized, /owner-a|expectedOwnerUid|must never persist/u,
  'persisted owner alert must contain no UID, UID binder, or card content');

const retry = await core.recordCustomCardMilestone({
  authUid: 'owner-a',
  data: { count: 1_501, language: 'en', expectedOwnerUid: 'owner-a' },
  nowMs: nowMs + 1,
}, memory.store);
assert.deepEqual(retry, { accepted: true, duplicate: true });
assert.equal(memory.documents.size, 1, 'same account+language milestone must dedupe across retries');

for (const language of ['es', 'fr', 'de'] as const) {
  await core.recordCustomCardMilestone({
    authUid: 'owner-a',
    data: { count: 1_500, language, expectedOwnerUid: 'owner-a' },
    nowMs,
  }, memory.store);
}
await core.recordCustomCardMilestone({
  authUid: 'owner-b',
  data: { count: 1_500, language: 'en', expectedOwnerUid: 'owner-b' },
  nowMs,
}, memory.store);
assert.equal(memory.documents.size, 5,
  'all four study languages and separate authenticated accounts need independent milestones');

assert.deepEqual(privacy.sanitizeAdminAlertPayload('customCardMilestone', {
  count: 1_500,
  language: 'de',
  nickname: 'must be omitted',
  uidLast4: 'abcd',
  cardText: 'private phrase',
  details: [{ label: 'Экран', value: 'private-screen' }],
}), { count: 1_500, language: 'de' },
'the milestone privacy policy must permit exactly count+language');
const [message] = privacy.renderAdminAlertMessages({
  eventType: 'customCardMilestone',
  occurredAtMs: nowMs,
  payload: {
    count: 1_500,
    language: 'de',
    details: [{ label: 'Экран', value: 'private-screen' }],
  },
});
assert.match(message, /1 500 КАРТОЧЕК/u);
assert.match(message, /Количество/u);
assert.match(message, /Язык/u);
assert.doesNotMatch(message, /private-screen|Экран/u,
  'milestone Telegram rendering must not accept even generally allowed detail labels');
assert.equal(catalog.ADMIN_ALERT_IDS.includes('customCardMilestone'), true);
assert.equal(
  new Set(catalog.ADMIN_ALERT_IDS.map((id) => templates.ADMIN_ALERT_TEMPLATES[id].emoji)).size,
  catalog.ADMIN_ALERT_IDS.length,
  'every owner-alert type must retain its distinct list emoji',
);

console.log('custom card milestone backend gate: PASS');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
