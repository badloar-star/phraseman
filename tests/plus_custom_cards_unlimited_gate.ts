import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(__dirname, '..');
const source = (path: string): string => readFileSync(resolve(root, path), 'utf8');

const accessPath = resolve(root, 'app/flashcards/custom_card_access.ts');
const accessSource = existsSync(accessPath)
  ? readFileSync(accessPath, 'utf8')
  : source('app/flashcards/custom_cards_store.ts');
const storeSource = source('app/flashcards/custom_cards_store.ts');
const editorSource = source('app/flashcards_card_editor.tsx');
const creatorSource = source('app/creator_access.ts');
const cloudSyncSource = source('app/cloud_sync.ts');
const milestoneRuntimeSource = source('app/flashcards/custom_card_milestone.ts');

assert.match(accessSource, /FREE_CUSTOM_CARD_LIMIT\s*=\s*50\b/u,
  'Free custom-card limit must remain exactly 50');
// зачем (владелец 2026-09-30): «не 1500, а напиши безлимит» — у Plus лимита нет.
assert.match(accessSource, /PLUS_CUSTOM_CARD_LIMIT\s*=\s*Number\.POSITIVE_INFINITY\b/u,
  'Plus custom-card policy must be unlimited');
assert.match(accessSource, /CUSTOM_CARD_OWNER_ALERT_MILESTONE\s*=\s*1_500\b/u,
  '1,500 remains an owner-alert milestone only');

assert.match(editorSource, /existingCards\.length\s*>=\s*cardLimit/u,
  'The editor must enforce the resolved Free/Plus card limit');
assert.match(editorSource, /const cardLimit = hasPremiumAccess \? PLUS_CUSTOM_CARD_LIMIT : FREE_CUSTOM_CARD_LIMIT/u,
  'The editor must resolve the Free/Plus creation limit');
assert.match(creatorSource, /Plus\s*[—-]\s*свои карточки и наборы без лимита/u,
  'Creator-access documentation must state that Plus has no card cap');

async function verifyMilestoneOutbox(): Promise<void> {
  const access = await import(pathToFileURL(accessPath).href) as typeof import('../app/flashcards/custom_card_access');
  assert.equal(access.canCreateCustomCard(1_499, true), true,
    'Plus must allow the 1,499→1,500 creation');
  assert.equal(access.canCreateCustomCard(1_500, true), true,
    'Plus must keep creating past 1,500 cards (no cap)');
  assert.equal(access.canCreateCustomCard(1_000_000, true), true,
    'Plus has no custom-card cap at all');
  assert.equal(access.canCreateCustomCard(49, false), true,
    'Free must allow the 49→50 creation');
  assert.equal(access.canCreateCustomCard(50, false), false,
    'Free must remain blocked at 50');

  const outboxPath = resolve(root, 'app/flashcards/custom_card_milestone_outbox.ts');
  assert.equal(existsSync(outboxPath), true,
    'The account-scoped custom-card milestone outbox must exist');
  const outbox = await import(pathToFileURL(outboxPath).href) as typeof import('../app/flashcards/custom_card_milestone_outbox');

  const values = new Map<string, string>();
  const sends: Array<{ count: number; language: string }> = [];
  let failSend = false;
  let activeScope = 'account-a';
  const dependencies: Parameters<typeof outbox.processCustomCardMilestone>[1] = {
    storage: {
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => { values.set(key, value); },
    },
    send: async (request) => {
      sends.push({ count: request.count, language: request.language });
      if (failSend) throw new Error('offline');
      return { accepted: true, duplicate: false };
    },
    nowMs: () => 1_700_000_000_000,
    commitIfCurrent: async (work) => {
      if (activeScope === 'none') return false;
      await work();
      return activeScope !== 'none';
    },
  };
  const scope = (stableId: string, generation = 1) => ({
    stableId,
    generation,
    expectedOwnerUid: `${stableId}-firebase`,
    isCurrent: () => activeScope === stableId,
  });

  assert.equal(await outbox.processCustomCardMilestone({
    count: 1_499, language: 'en', scope: scope('account-a'),
  }, dependencies), 'below-milestone');
  assert.equal(sends.length, 0, '1,499 must not enqueue or send');

  failSend = true;
  assert.equal(await outbox.processCustomCardMilestone({
    count: 1_500, language: 'en', scope: scope('account-a'),
  }, dependencies), 'deferred');
  assert.equal(sends.length, 1, '1,499→1,500 must attempt the alert after queuing');

  failSend = false;
  assert.equal(await outbox.processCustomCardMilestone({
    count: 1_501, language: 'en', scope: scope('account-a'),
  }, dependencies), 'acknowledged');
  assert.equal(sends.length, 2, 'a pending milestone must retry on the next qualifying save/read');
  assert.equal(await outbox.processCustomCardMilestone({
    count: 1_502, language: 'en', scope: scope('account-a'),
  }, dependencies), 'already-acknowledged');
  assert.equal(sends.length, 2, 'an acknowledged milestone must not send again');

  activeScope = 'account-b';
  assert.equal(await outbox.processCustomCardMilestone({
    count: 1_500, language: 'fr', scope: scope('account-b', 2),
  }, dependencies), 'acknowledged');
  assert.notEqual(
    outbox.customCardMilestoneStorageKey('account-a', 'en'),
    outbox.customCardMilestoneStorageKey('account-b', 'fr'),
    'account and language must have independent milestone receipts',
  );

  const failingStorage = {
    ...dependencies,
    storage: {
      getItem: async () => null,
      setItem: async () => { throw new Error('storage unavailable'); },
    },
  };
  assert.equal(await outbox.processCustomCardMilestone({
    count: 1_500, language: 'en', scope: scope('account-b', 2),
  }, failingStorage), 'deferred', 'outbox failure must remain fail-open');

  const racedValues = new Map<string, string>();
  const racedDependencies: Parameters<typeof outbox.processCustomCardMilestone>[1] = {
    ...dependencies,
    storage: {
      getItem: async (key) => racedValues.get(key) ?? null,
      setItem: async (key, value) => { racedValues.set(key, value); },
    },
    commitIfCurrent: async () => {
      // Reproduces A→B transition winning before A's detached setItem. The
      // account wipe has completed, so old A state must not be recreated.
      activeScope = 'account-b';
      racedValues.clear();
      return false;
    },
  };
  activeScope = 'account-a';
  assert.equal(await outbox.processCustomCardMilestone({
    count: 1_500, language: 'en', scope: scope('account-a'),
  }, racedDependencies), 'stale-account');
  assert.equal(racedValues.size, 0, 'a stale A outbox write must not resurrect after B wiped local state');

  let capturedExpectedOwnerUid: unknown;
  const identityValues = new Map<string, string>();
  const capturedOwnerScope = scope('account-a', 3);
  activeScope = 'account-a';
  const liveAuthUid = 'account-b-firebase';
  const identityBoundDependencies: Parameters<typeof outbox.processCustomCardMilestone>[1] = {
    ...dependencies,
    storage: {
      getItem: async (key) => identityValues.get(key) ?? null,
      setItem: async (key, value) => { identityValues.set(key, value); },
    },
    send: async (request) => {
      capturedExpectedOwnerUid = (request as { expectedOwnerUid?: unknown }).expectedOwnerUid;
      if (capturedExpectedOwnerUid !== liveAuthUid) throw new Error('owner binding mismatch');
      return { accepted: true, duplicate: false };
    },
  };
  assert.equal(await outbox.processCustomCardMilestone({
    count: 1_500, language: 'de', scope: capturedOwnerScope,
  }, identityBoundDependencies), 'deferred',
  'an A-captured alert must remain fail-open when the native callable authenticates as B');
  assert.equal(capturedExpectedOwnerUid, 'account-a-firebase',
    'the callable request must retain captured A instead of recapturing live B');
  assert.doesNotMatch([...identityValues.values()].join('\n'), /firebase/u,
    'the expected Firebase UID is attempt-only and must never enter AsyncStorage');
}

void verifyMilestoneOutbox().then(() => {
  assert.match(storeSource, /observeCustomCardMilestone/u,
    'The shared store must wire the owner milestone observer');
  assert.match(editorSource,
    /const existingCards = existing \? null : await listCustomCards[\s\S]*?if \(existingCards && existingCards\.length >= cardLimit/u,
    'editing an existing card must remain exempt from the creation cap');
  assert.match(storeSource,
    /const milestoneOwner = captureCustomCardMilestoneOwner\(\);[\s\S]*?loadFromDisk[\s\S]*?observeCustomCardMilestone\(cards\.length, target, milestoneOwner\)/u,
    'The store must capture generation+Firebase UID before async card I/O and pass that exact owner to the alert observer');
  assert.match(milestoneRuntimeSource,
    /captureCustomCardMilestoneOwner[\s\S]*?getAuthUserId\(\)[\s\S]*?observeCustomCardMilestone\([\s\S]*?owner: CustomCardMilestoneOwner/u,
    'The runtime adapter must synchronously capture the attempt-only Firebase UID');
  assert.match(milestoneRuntimeSource,
    /expectedOwnerUid:\s*owner\.expectedOwnerUid/u,
    'The callable must send the captured owner binding, not recapture live auth');
  assert.match(milestoneRuntimeSource,
    /isCurrentAccountGeneration\(owner\.accountToken, stableId\)/u,
    'The runtime adapter must re-check the captured owner before its callable');
  assert.match(milestoneRuntimeSource, /withAccountTransitionLock/u,
    'Outbox writes must serialize with account wipe/switch');
  assert.match(milestoneRuntimeSource, /withCallableTimeout/u,
    'The network attempt must be bounded without holding the account transition lock');
  assert.match(cloudSyncSource, /custom_card_milestone_outbox_v1:/u,
    'The milestone outbox must travel and wipe with its owning account');
  console.log('plus custom cards unlimited gate: PASS');
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
