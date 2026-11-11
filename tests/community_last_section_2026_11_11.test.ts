// зачем (владелец 11.11: «приложение должно запоминать — если последний раз был открыт Пик, при входе на вкладку
// „Сообщество“ должен быть открыт Пик, или Наборы, если последний раз были Наборы»): раздел переживает перезапуск.
const mockStore = new Map<string, string>();
let mockFailRead = false;
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => { if (mockFailRead) throw new Error('disk'); return mockStore.get(key) ?? null; }),
    setItem: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
  },
}));

type Mod = typeof import('../app/community_last_section');
const load = (): Mod => { let mod: Mod | null = null; jest.isolateModules(() => { mod = require('../app/community_last_section') as Mod; }); return mod!; };

beforeEach(() => { mockStore.clear(); mockFailRead = false; jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
afterEach(() => { jest.restoreAllMocks(); });

it('после перезапуска отдаёт раздел, выбранный в прошлый раз', async () => {
  const first = load();
  first.rememberCommunityLastSection('packs');
  await Promise.resolve();
  const second = load(); // новый запуск приложения: память пуста, остался только диск
  expect(second.peekCommunityLastSection()).toBeNull();
  await expect(second.primeCommunityLastSection()).resolves.toBe('packs');
  expect(second.peekCommunityLastSection()).toBe('packs');
});

it('выбор виден сразу, не дожидаясь записи на диск', () => {
  const mod = load();
  mod.rememberCommunityLastSection('spire');
  expect(mod.peekCommunityLastSection()).toBe('spire');
});

it('поздний ответ диска не затирает свежий выбор', async () => {
  mockStore.set('community_last_section_v1', 'packs');
  const mod = load();
  const priming = mod.primeCommunityLastSection();
  mod.rememberCommunityLastSection('spire');
  await expect(priming).resolves.toBe('spire');
  expect(mod.peekCommunityLastSection()).toBe('spire');
});

it('мусор на диске и сбой чтения дают «не запомнено», а не падение', async () => {
  mockStore.set('community_last_section_v1', 'arena');
  await expect(load().primeCommunityLastSection()).resolves.toBeNull();
  mockFailRead = true;
  await expect(load().primeCommunityLastSection()).resolves.toBeNull();
});

describe('какой раздел показать при входе', () => {
  const { resolveCommunityEntrySection } = load();
  it('ссылка главнее запомненного', () => {
    expect(resolveCommunityEntrySection({ link: 'friends', saved: 'packs', spireOpen: true })).toBe('friends');
  });
  it('без ссылки — запомненный раздел', () => {
    expect(resolveCommunityEntrySection({ link: null, saved: 'packs', spireOpen: false })).toBe('packs');
    expect(resolveCommunityEntrySection({ link: null, saved: 'spire', spireOpen: true })).toBe('spire');
  });
  it('запомнен Пик, а он сейчас закрыт — Друзья', () => {
    expect(resolveCommunityEntrySection({ link: null, saved: 'spire', spireOpen: false })).toBe('friends');
  });
  it('ничего не запомнено — Друзья, как раньше', () => {
    expect(resolveCommunityEntrySection({ link: null, saved: null, spireOpen: true })).toBe('friends');
  });
});
