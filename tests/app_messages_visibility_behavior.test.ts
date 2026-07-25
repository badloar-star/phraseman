import AsyncStorage from '@react-native-async-storage/async-storage';

let ownerUid = 'account-A';
let delayedOwnerLookup: (() => Promise<string>) | null = null;

async function mockGetCanonicalUserId(): Promise<string> {
  if (delayedOwnerLookup) {
    const delayed = delayedOwnerLookup;
    delayedOwnerLookup = null;
    return delayed();
  }
  return ownerUid;
}

jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(mockGetCanonicalUserId),
}));

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: false,
  IS_EXPO_GO: true,
}));

import {
  acknowledgePersonalAdminMessageModal,
  applyPendingPersonalModalAcknowledgementsToSnapshot,
  dismissAppMessage,
  mergeAppMessagesWithStates,
  migrateLegacyReportReplyClaimsForOwnedMessages,
  normalizeOwnedUserAppMessage,
  normalizeUserAppMessage,
  pickNextLoginPersonalMessage,
  readPendingAppMessageVisibility,
  readPendingPersonalModalAcknowledgements,
  readPendingReportReplyShardClaims,
  restoreAppMessage,
} from '../app/app_messages';

describe('app-message visibility outbox behavior', () => {
  beforeEach(async () => {
    ownerUid = 'account-A';
    delayedOwnerLookup = null;
    await AsyncStorage.clear();
  });

  it('serializes delete then Undo with a strictly newer revision even in the same millisecond', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    let releaseFirstLookup!: (uid: string) => void;
    delayedOwnerLookup = () => new Promise<string>((resolve) => {
      releaseFirstLookup = resolve;
    });
    const deletePromise = dismissAppMessage('message-1');
    const undoPromise = restoreAppMessage('message-1');
    for (let attempt = 0; attempt < 10 && !releaseFirstLookup; attempt += 1) {
      await Promise.resolve();
    }
    expect(releaseFirstLookup).toBeDefined();
    releaseFirstLookup('account-A');
    await Promise.all([deletePromise, undoPromise]);
    const afterUndo = await readPendingAppMessageVisibility('account-A');
    now.mockRestore();

    expect(afterUndo).toHaveLength(1);
    expect(afterUndo[0].dismissedAtMs).toBeNull();
    expect(afterUndo[0].revision).toBeGreaterThan(1_000);
  });

  it('keeps offline tombstones isolated between accounts', async () => {
    await dismissAppMessage('message-A');
    ownerUid = 'account-B';
    expect(await readPendingAppMessageVisibility('account-B')).toEqual([]);
    await dismissAppMessage('message-B');

    const accountB = await readPendingAppMessageVisibility('account-B');
    const accountA = await readPendingAppMessageVisibility('account-A');
    expect(accountB.map((row) => row.messageId)).toEqual(['message-B']);
    expect(accountA.map((row) => row.messageId)).toEqual(['message-A']);
  });

  it('captures the acting account before a delayed earlier operation and a later account switch', async () => {
    let releaseAccountA!: (uid: string) => void;
    delayedOwnerLookup = () => new Promise<string>((resolve) => {
      releaseAccountA = resolve;
    });
    const accountADelete = dismissAppMessage('message-A');
    ownerUid = 'account-B';
    const accountBDelete = dismissAppMessage('message-B');
    ownerUid = 'account-C';
    for (let attempt = 0; attempt < 10 && !releaseAccountA; attempt += 1) {
      await Promise.resolve();
    }
    releaseAccountA('account-A');
    await Promise.all([accountADelete, accountBDelete]);

    expect((await readPendingAppMessageVisibility('account-A')).map((row) => row.messageId)).toEqual(['message-A']);
    expect((await readPendingAppMessageVisibility('account-B')).map((row) => row.messageId)).toEqual(['message-B']);
    expect(await readPendingAppMessageVisibility('account-C')).toEqual([]);
  });

  it('preserves an unattributed legacy reward without assigning it to the wrong account', async () => {
    const claim = [{ messageId: 'report-1', amount: 2, creditedAtMs: 900 }];
    await AsyncStorage.setItem('app_messages_report_reply_pending_claims_v1', JSON.stringify(claim));

    expect(await readPendingReportReplyShardClaims()).toEqual([]);
    expect(await AsyncStorage.getItem('app_messages_report_reply_pending_claims_v1')).toBe(JSON.stringify(claim));
    expect(await AsyncStorage.getItem('app_messages_report_reply_pending_claims_v2:account-A')).toBeNull();
  });

  it('migrates and caps a legacy reward only after matching a private message owned by that account', async () => {
    const claim = [{ messageId: 'report-owned', amount: 2, creditedAtMs: 900 }];
    const cappedClaim = [{ messageId: 'report-owned', amount: 1, creditedAtMs: 900 }];
    await AsyncStorage.setItem('app_messages_report_reply_pending_claims_v1', JSON.stringify(claim));
    const ownedMessage = normalizeUserAppMessage('report-owned', {
      kind: 'report_reply',
      title: 'Reply',
      body: 'Body',
      shards: 2,
      claimed: false,
      createdAtMs: 800,
    }, 1_000);

    expect(await migrateLegacyReportReplyClaimsForOwnedMessages('account-A', [])).toEqual([]);
    expect(await migrateLegacyReportReplyClaimsForOwnedMessages('account-A', [ownedMessage])).toEqual(cappedClaim);
    expect(await AsyncStorage.getItem('app_messages_report_reply_pending_claims_v1')).toBeNull();
    expect(await AsyncStorage.getItem('app_messages_report_reply_pending_claims_v2:account-A')).toBe(JSON.stringify(cappedClaim));
  });

  it('persists personal modal acknowledgement per account before an offline retry', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(2_000);
    const message = normalizeOwnedUserAppMessage('personal-1', {
      kind: 'personal_admin_message',
      recipientUid: 'account-A',
      deliveryMode: 'next_login_modal',
      nextLoginModalPending: true,
      title: 'Team',
      body: 'Offline durable acknowledgement',
      createdAtMs: 1_000,
    }, 'account-A', 2_000)!;

    await acknowledgePersonalAdminMessageModal('personal-1', 'account-A');
    const pending = await readPendingPersonalModalAcknowledgements('account-A');
    const restarted = applyPendingPersonalModalAcknowledgementsToSnapshot(
      mergeAppMessagesWithStates([message], [], 2_000),
      pending,
    );
    now.mockRestore();

    expect(pending).toEqual([{ messageId: 'personal-1', acknowledgedAtMs: 2_000 }]);
    expect(pickNextLoginPersonalMessage(restarted)).toBeNull();
    expect(restarted.messages.map((row) => row.id)).toEqual(['personal-1']);
    expect(await readPendingPersonalModalAcknowledgements('account-B')).toEqual([]);
  });

  it('caps legacy local report-claim outbox amounts without changing other reward stores', async () => {
    await AsyncStorage.setItem(
      'app_messages_report_reply_pending_claims_v2:account-A',
      JSON.stringify([{ messageId: 'legacy-report', amount: 50, creditedAtMs: 900 }]),
    );
    expect(await readPendingReportReplyShardClaims('account-A')).toEqual([
      { messageId: 'legacy-report', amount: 1, creditedAtMs: 900 },
    ]);
  });
});
