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
  dismissAppMessage,
  migrateLegacyReportReplyClaimsForOwnedMessages,
  normalizeUserAppMessage,
  readPendingAppMessageVisibility,
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

  it('migrates a legacy reward only after matching a private message owned by that account', async () => {
    const claim = [{ messageId: 'report-owned', amount: 2, creditedAtMs: 900 }];
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
    expect(await migrateLegacyReportReplyClaimsForOwnedMessages('account-A', [ownedMessage])).toEqual(claim);
    expect(await AsyncStorage.getItem('app_messages_report_reply_pending_claims_v1')).toBeNull();
    expect(await AsyncStorage.getItem('app_messages_report_reply_pending_claims_v2:account-A')).toBe(JSON.stringify(claim));
  });
});
