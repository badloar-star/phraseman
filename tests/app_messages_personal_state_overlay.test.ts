// зачем (🔴 Ревизор 3.164 к 1b7a6f987): при той же inboxRev состояния сообщений берутся из копии, а «прочитано»,
// реакцию, голос и скрытие пишет клиент — inboxRev от этого не растёт. Каждая удачная запись обязана попадать в копию,
// иначе после перезапуска отметка пропадает.
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
let mockFailWrites = false;
jest.mock('@react-native-firebase/firestore', () => {
  const docRef = (path: string): any => ({
    path,
    collection: (name: string) => collRef(`${path}/${name}`),
    set: async () => { if (mockFailWrites) throw new Error('unavailable'); },
    delete: async () => { if (mockFailWrites) throw new Error('unavailable'); },
    get: async () => ({ exists: false, data: () => ({}) }),
  });
  const collRef = (path: string): any => ({ doc: (id: string) => docRef(`${path}/${id}`) });
  const db = {
    collection: (name: string) => collRef(name),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      if (mockFailWrites) throw new Error('unavailable');
      return fn({ get: (ref: any) => ref.get(), set: () => undefined });
    },
  };
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
        // Свежая дата: сообщения живут 30 дней от createdAtMs, старое отфильтруется ещё до копии.
        return { docs: [{ id: 'personal-1', data: () => ({ title: 'Привет', body: 'Текст', createdAtMs: Date.now() - 60_000 }) }] };
      }
      return { docs: [] };
    },
  };
});

import {
  dismissAppMessage,
  markAppMessageRead,
  refreshAppMessagesSnapshotOnce,
  setAppMessagePollVote,
  setAppMessageReaction,
} from '../app/app_messages';
import { noteRestoreUserDocInboxRev, resetInboxRevPeekForTests } from '../app/inbox_rev_peek';

const personalReads = () => mockQueriedPaths.filter((path) => path.startsWith('users/account-A/')).length;
const restart = () => refreshAppMessagesSnapshotOnce({ force: true, nowMs: Date.now() });
const message = (snapshot: Awaited<ReturnType<typeof restart>>) => snapshot.messages.find((row) => row.id === 'personal-1');

describe('копия личных: свои отметки переживают перезапуск при той же inboxRev', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockQueriedPaths.length = 0;
    mockFailWrites = false;
    resetInboxRevPeekForTests();
    noteRestoreUserDocInboxRev('account-A', 3);
    const first = await restart(); // первый старт: копия с версией 3
    expect(personalReads()).toBe(2);
    expect(message(first)).toBeDefined();
    expect(message(first)?.unread).toBe(true);
  });

  it('прочитал → перезапуск → прочитано (без чтения из сети)', async () => {
    await markAppMessageRead('personal-1');
    const after = await restart();
    expect(personalReads()).toBe(2);
    expect(message(after)?.readAtMs).toEqual(expect.any(Number));
    expect(message(after)?.unread).toBe(false);
  });

  it('реакция → перезапуск → реакция на месте; снятие реакции тоже сохраняется', async () => {
    await setAppMessageReaction('personal-1', 'like');
    expect(message(await restart())?.reaction).toBe('like');
    await setAppMessageReaction('personal-1', null);
    expect(message(await restart())?.reaction).toBeNull();
    expect(personalReads()).toBe(2);
  });

  it('голос → перезапуск → голос на месте', async () => {
    await setAppMessagePollVote('personal-1', 'option_a');
    expect(message(await restart())?.pollOptionId).toBe('option_a');
    expect(personalReads()).toBe(2);
  });

  it('скрыл → перезапуск → скрыто', async () => {
    await dismissAppMessage('personal-1');
    const after = await restart();
    expect(message(after)).toBeUndefined();
    expect(personalReads()).toBe(2);
  });

  it('сбой записи на сервер → в копии старое (сервер не принял — честно «не прочитано»)', async () => {
    mockFailWrites = true;
    await expect(markAppMessageRead('personal-1')).rejects.toThrow('unavailable');
    mockFailWrites = false;
    const after = await restart();
    expect(message(after)?.readAtMs ?? null).toBeNull();
  });
});
