// зачем (координатор 12.10): по журналам каждый прогон cards=demo на госте писал 64 карточки в прод. Пока на госте применена
// cards-фикстура, синхронизация не выгружает ключи карточек/наборов ([SYNC-SKIP]); вошедший аккаунт выгружается как обычно.
import fs from 'fs';
import path from 'path';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
    setItem: jest.fn(async (k: string, v: string) => { mockStore.set(k, v); }),
  },
}));

import {
  DEV_FIXTURE_NO_UPLOAD_KEY,
  __resetDevFixtureNoUploadForTests,
  isDevFixtureCardSyncKey,
  isDevFixtureNoUploadActive,
  markDevFixtureNoUpload,
  omitDevFixtureCardKeys,
} from '../app/dev_fixture_upload_guard';
import { assertDisposableGuest } from '../app/dev_state_account_guard';

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterAll(() => jest.restoreAllMocks());
beforeEach(() => {
  mockStore.clear();
  __resetDevFixtureNoUploadForTests();
});

const SYNC_SAMPLE: Record<string, string> = {
  flashcards_v1: '[64 cards]',
  'fr:flashcards_v1': '[]',
  custom_flashcards_v2: '[50]',
  flashcards_progress_v1: '{}',
  flashcards_owned_packs_v1: '[]',
  community_owned_pack_ids_v1: '["p1"]',
  achievement_flashcards_saved_count: '64',
  streak_count: '5',
  app_lang: 'ru',
};

describe('ключи карточек и наборов', () => {
  it('вырезаются карточки/наборы, прогресс и достижения остаются', () => {
    expect(Object.keys(SYNC_SAMPLE).filter(isDevFixtureCardSyncKey).sort()).toEqual([
      'community_owned_pack_ids_v1', 'custom_flashcards_v2', 'flashcards_owned_packs_v1', 'flashcards_progress_v1',
      'flashcards_v1', 'fr:flashcards_v1',
    ]);
  });

  it('метка не активна — тот же объект', () => {
    expect(omitDevFixtureCardKeys(SYNC_SAMPLE, false, 'sync')).toBe(SYNC_SAMPLE);
  });
});

describe('метка «не выгружать» — гость с фикстурой', () => {
  it('фикстура на госте → 0 ключей карточек в выгрузке, [SYNC-SKIP] на каждый', async () => {
    assertDisposableGuest('cards=demo', () => ({ isAnonymous: true, uid: 'guest_uid_1', providerData: [] }));
    expect(await isDevFixtureNoUploadActive('guest_uid_1')).toBe(true);
    const out = omitDevFixtureCardKeys(SYNC_SAMPLE, true, 'sync');
    expect(Object.keys(out).filter(isDevFixtureCardSyncKey)).toEqual([]);
    expect(out).toMatchObject({ streak_count: '5', app_lang: 'ru', achievement_flashcards_saved_count: '64' });
    const logs = (console.log as jest.Mock).mock.calls.map((c) => String(c[0])).filter((l) => l.startsWith('[SYNC-SKIP] dev_fixture key='));
    expect(logs).toHaveLength(6);
  });

  it('метка переживает перезапуск (force-stop робота) — читается с устройства', async () => {
    markDevFixtureNoUpload('guest_uid_2', 'cards=empty');
    await Promise.resolve();
    expect(mockStore.get(DEV_FIXTURE_NO_UPLOAD_KEY)).toContain('guest_uid_2');
    __resetDevFixtureNoUploadForTests(); // «новый процесс»
    expect(await isDevFixtureNoUploadActive('guest_uid_2')).toBe(true);
  });

  it('вошёл в настоящий аккаунт (другой uid) — его карточки выгружаются', async () => {
    markDevFixtureNoUpload('guest_uid_3', 'cards=demo');
    expect(await isDevFixtureNoUploadActive('real_account_uid')).toBe(false);
    expect(await isDevFixtureNoUploadActive(null)).toBe(false);
  });

  it('настоящий аккаунт — фикстура отказана и метка не ставится', async () => {
    expect(() => assertDisposableGuest('cards=demo', () => ({ isAnonymous: false, uid: 'real', providerData: [{}] }))).toThrow();
    expect(await isDevFixtureNoUploadActive('real')).toBe(false);
  });
});

describe('проводка в синхронизации (контракт по исходнику)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app/cloud_sync.ts'), 'utf8');
  it('обычная и принудительная синхронизация вырезают ключи до выгрузки карточек', () => {
    expect(src).toContain("await isDevFixtureNoUploadActive(getAuthUserId()),\n      'sync',");
    expect(src).toContain("await isDevFixtureNoUploadActive(getAuthUserId()),\n      'force_sync',");
    expect(src.indexOf("'sync',\n    );")).toBeLessThan(src.indexOf('const flashcardUpload = await uploadFlashcardListsToPages('));
    expect(src.indexOf("'force_sync',\n    );")).toBeLessThan(src.indexOf('const flashcardOutcome = await runForceFlashcardUpload('));
  });

  it('стор-сборка: метка не действует (проверка __DEV__ && !IS_STORE_RELEASE)', () => {
    const guard = fs.readFileSync(path.join(__dirname, '..', 'app/dev_fixture_upload_guard.ts'), 'utf8');
    expect(guard).toContain("return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;");
  });
});
