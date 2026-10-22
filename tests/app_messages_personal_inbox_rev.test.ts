// зачем (владелец 22.10, вопрос 27; сервер f3e4462fe): личные сообщения и их состояния читаются из сети только при росте
// users/{uid}.inboxRev, взятого из документа восстановления. Старт без изменений = 0 чтений личных.
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => 'account-A'),
}));

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
}));

jest.mock('../app/remote_flags', () => ({
  getRemoteNumber: jest.fn(() => 0),
}));

const mockQueriedPaths: string[] = [];
let mockFailUserMessages = false;
jest.mock('@react-native-firebase/firestore', () => {
  const db = { __db: true };
  return {
    __esModule: true,
    default: () => db,
    getFirestore: () => db,
    collection: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
    orderBy: () => ({}),
    limit: () => ({}),
    query: (collectionRef: { path: string }) => collectionRef,
    getDocs: async (queryRef: { path: string }) => {
      mockQueriedPaths.push(queryRef.path);
      if (queryRef.path.endsWith('/user_messages')) {
        if (mockFailUserMessages) throw new Error('permission-denied');
        return { docs: [{ id: 'personal-1', data: () => ({ kind: 'personal_admin_message', title: 'Привет', body: 'Текст', createdAtMs: 1_000, recipientUid: 'account-A' }) }] };
      }
      return { docs: [] };
    },
  };
});

import { refreshAppMessagesSnapshotOnce, decideAppMessagesPersonalReuse } from '../app/app_messages';
import { noteRestoreUserDocInboxRev, resetInboxRevPeekForTests } from '../app/inbox_rev_peek';

const personalReads = () => mockQueriedPaths.filter((path) => path.startsWith('users/account-A/')).length;

describe('личные сообщения по inboxRev', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockQueriedPaths.length = 0;
    mockFailUserMessages = false;
    resetInboxRevPeekForTests();
  });

  it('старт без изменений версии = 0 чтений личных (2 запроса только в первый раз)', async () => {
    noteRestoreUserDocInboxRev('account-A', 3);
    await refreshAppMessagesSnapshotOnce({ force: true, nowMs: 10_000 });
    expect(personalReads()).toBe(2);

    await refreshAppMessagesSnapshotOnce({ force: true, nowMs: 20_000 });
    expect(personalReads()).toBe(2);
  });

  it('версия выросла → личные перечитываются; версии нет → как раньше, копия не нужна', async () => {
    noteRestoreUserDocInboxRev('account-A', 3);
    await refreshAppMessagesSnapshotOnce({ force: true, nowMs: 10_000 });
    noteRestoreUserDocInboxRev('account-A', 4);
    await refreshAppMessagesSnapshotOnce({ force: true, nowMs: 20_000 });
    expect(personalReads()).toBe(4);

    resetInboxRevPeekForTests();
    await refreshAppMessagesSnapshotOnce({ force: true, nowMs: 30_000 });
    expect(personalReads()).toBe(6);
  });

  it('сбой чтения личных не сохраняет пустую копию — следующий старт снова читает', async () => {
    noteRestoreUserDocInboxRev('account-A', 3);
    mockFailUserMessages = true;
    await refreshAppMessagesSnapshotOnce({ force: true, nowMs: 10_000 });
    mockFailUserMessages = false;
    await refreshAppMessagesSnapshotOnce({ force: true, nowMs: 20_000 });
    expect(personalReads()).toBe(4);
  });

  it('решение: причины и страховка 7 дней', () => {
    const stored = { rev: 5, fetchedAtMs: 0, userMessages: [], states: [] };
    expect(decideAppMessagesPersonalReuse({ remoteRev: null, stored, nowMs: 1 }).reason).toBe('no_inbox_rev');
    expect(decideAppMessagesPersonalReuse({ remoteRev: 0, stored, nowMs: 1 }).reason).toBe('no_inbox_rev');
    expect(decideAppMessagesPersonalReuse({ remoteRev: 5, stored: null, nowMs: 1 }).reason).toBe('no_local_copy');
    expect(decideAppMessagesPersonalReuse({ remoteRev: 6, stored, nowMs: 1 }).reason).toBe('rev_changed');
    expect(decideAppMessagesPersonalReuse({ remoteRev: 5, stored, nowMs: 1 }).reuse).toBe(true);
    expect(decideAppMessagesPersonalReuse({ remoteRev: 5, stored, nowMs: 7 * 24 * 60 * 60 * 1000 }).reason).toBe('max_age');
  });
});
