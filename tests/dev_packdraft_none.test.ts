// зачем (Макеты 13.10, cards-section-029): на телефоне робота от прошлых кадров остаётся настоящий черновик набора, и хаб
// Карточек рисует лишнюю строку «Продолжить создание набора». `packdraft=none` — «черновика нет» только в памяти:
// загрузка черновика отдаёт null, а сам черновик в хранилище остаётся нетронутым.
const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => (mockStore.has(key) ? mockStore.get(key)! : null)),
    setItem: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { mockStore.delete(key); }),
  },
}));

/* eslint-disable import/first */
import { isDevPackDraftNone, setDevPackDraft, getDevPackDraft } from '../app/dev_cards_state';
import { hasMeaningfulCommunityPackCreateDraft } from '../app/community_packs/communityPackDraftStorage';
import { communityPackCreateDraftKey } from '../app/target_storage_keys';

// зачем: подмены работают только в dev-сборке (__DEV__ && !IS_STORE_RELEASE) — среда теста по умолчанию не dev.
(globalThis as { __DEV__?: boolean }).__DEV__ = true;

/**
 * Настоящий черновик на «телефоне»: кладём прямо в хранилище по ключу экрана (запись через save охраняется поколением
 * аккаунта, которого в тесте нет). Форма — та же, что отдаёт подмена `on`.
 */
function seedRealDraft(): void {
  setDevPackDraft('on');
  const d = getDevPackDraft();
  setDevPackDraft(null);
  mockStore.set(communityPackCreateDraftKey('en', 'ru'), JSON.stringify(d));
}

describe('dev packdraft=none', () => {
  beforeEach(async () => {
    mockStore.clear();
    setDevPackDraft(null);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => { setDevPackDraft(null); jest.restoreAllMocks(); });

  it('без подмены настоящий черновик виден', async () => {
    seedRealDraft();
    expect(await hasMeaningfulCommunityPackCreateDraft('en', 'ru')).toBe(true);
  });

  it('none: черновика нет, но хранилище не тронуто', async () => {
    seedRealDraft();
    const before = JSON.stringify([...mockStore.entries()]);
    expect(setDevPackDraft('none')).toBe(true);
    expect(isDevPackDraftNone()).toBe(true);
    expect(getDevPackDraft()).toBeNull();
    expect(await hasMeaningfulCommunityPackCreateDraft('en', 'ru')).toBe(false);
    expect(JSON.stringify([...mockStore.entries()])).toBe(before);
    setDevPackDraft(null);
    expect(await hasMeaningfulCommunityPackCreateDraft('en', 'ru')).toBe(true);
  });
});
