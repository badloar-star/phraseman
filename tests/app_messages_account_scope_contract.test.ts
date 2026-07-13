import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'app', 'app_messages.ts'), 'utf8');

describe('app message account-scoped persistence', () => {
  it('scopes private caches and animation history by stable uid', () => {
    expect(source).toContain('function appMessagesOwnerStorageKey');
    expect(source).toContain('encodeURIComponent(ownerUid)');
    expect(source).toContain('APP_MESSAGES_CACHE_KEY_PREFIX');
    expect(source).toContain('APP_MESSAGES_LAST_BACKGROUND_REFRESH_KEY_PREFIX');
    expect(source).toContain('ANIMATED_MESSAGE_IDS_KEY_PREFIX');
    expect(source).toContain('REPORT_REPLY_PENDING_CLAIMS_KEY_PREFIX');
    expect(source).toContain('LOCAL_APP_MESSAGES_KEY_PREFIX');
    expect(source).toContain('LOCAL_APP_MESSAGE_STATES_KEY_PREFIX');
    expect(source).toContain('cleanupUnownedAppMessageStorage');
  });

  it('persists last-write-wins visibility operations and can restore a message', () => {
    expect(source).toContain('type PendingAppMessageVisibility');
    expect(source).toContain('APP_MESSAGE_VISIBILITY_OUTBOX_KEY_PREFIX');
    expect(source).toContain('applyPendingVisibilityToSnapshot');
    expect(source).toContain('export async function restoreAppMessage');
    expect(source).toContain('enqueueAppMessageVisibilityMutation(messageId, null');
    expect(source).toContain('revision');
    expect(source).toContain('async function flushPendingAppMessageVisibility');
    expect(source).toContain('visibilityMutationQueueByOwner');
    expect(source).toContain('capturedOwnerUid: Promise<string | null>');
    expect(source).toContain('visibilityActionQueueByOwner');
    expect(source).toContain('db.runTransaction');
    expect(source).toContain('serverRevision > operation.revision');
    expect(source).toContain('applyPendingVisibilityToStates');
    expect(source).toContain('await flushPendingAppMessageVisibility(firestoreFactory, uid)');
    expect(source).not.toContain('readAtMs: operation.dismissedAtMs ?? undefined');
    expect(source).not.toContain('readAtMs: operation.dismissedAtMs');
  });

  it('does not write a snapshot into a different account after an identity switch', () => {
    expect(source).toContain('expectedOwnerUid?: string | null');
    expect(source).toContain('ownerUid !== expectedOwnerUid');
    expect(source).toContain('writeCachedSnapshot(snapshot, uid)');
    expect(source).toContain('writeCachedSnapshot(snapshot, ownerUid)');
  });

  it('attributes legacy reward claims only through owned private report messages', () => {
    expect(source).toContain('migrateLegacyReportReplyClaimsForOwnedMessages');
    expect(source).toContain("ownedMessages.filter((message) => message.kind === 'report_reply')");
    expect(source).toContain('ownedReportReplyIds.has(claim.messageId)');
  });
});
