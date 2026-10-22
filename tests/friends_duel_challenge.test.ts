/**
 * Вызов на «Дуэль на 5 фраз» из вкладки «Друзья» (идея 3): журнал своих вызовов и хук шторки вызова.
 * Сторож: шторка вызова открывается уже в верном состоянии (фразы и лимит посчитаны по тапу, до показа);
 * «Начать дуэль» ведёт на экран только ПОСЛЕ закрытия шторки и с пятью id фраз; разные языки — курс не трогаем,
 * «Позвать на занятие» зовёт друга; новый тап отменяет старую подготовку; лимит «три в день» и «дуэль уже идёт» — с телефона.
 */
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; return Promise.resolve(); }),
}));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: () => Promise.resolve('me-1') }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../components/plus/use_is_plus', () => ({ useIsPlus: () => false }));
jest.mock('../hooks/use_my_coin_rank', () => ({ useMyCoinRank: () => 4 }));
const mockPick = jest.fn();
jest.mock('../app/friends_together/duel_phrase_source', () => ({ pickMyDuelPhrases: (...args: unknown[]) => mockPick(...args) }));

import { act, renderHook } from '@testing-library/react-native';
import { duelOpenWithFriend, duelSentToday, readSentDuels, recordSentDuel } from '../app/friends_together/duel_ledger';
import { useDuelChallenge, type DuelChallengeFriend } from '../hooks/use_duel_challenge';

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const phrase = (n: number) => ({ id: `en:lesson-01:session-0${n}:i01`, lessonOrdinal: 1, sessionOrdinal: n });
const ira: DuelChallengeFriend = { uid: 'ira', name: 'Ирина', coinRank: 9, isPlus: true, studyLanguages: ['en'] };

beforeEach(() => {
  for (const key of Object.keys(mockStorage)) delete mockStorage[key];
  mockPush.mockReset();
  mockPick.mockReset();
  mockPick.mockResolvedValue([1, 2, 3, 4, 5].map(phrase));
});

describe('журнал своих вызовов', () => {
  it('считает вызовы за сегодня и видит идущую дуэль с другом', async () => {
    await recordSentDuel('ira', NOW - 1000, '2026-10-22');
    await recordSentDuel('mark', NOW - 500, '2026-10-22');
    await recordSentDuel('lida', NOW - 20 * 60 * 60 * 1000, '2026-10-21');
    const list = await readSentDuels(NOW);
    expect(duelSentToday(list, '2026-10-22')).toBe(2);
    expect(duelOpenWithFriend(list, 'ira', NOW)).toBe(true);
    expect(duelOpenWithFriend(list, 'oleg', NOW)).toBe(false);
  });

  it('старше суток — забываем', async () => {
    await recordSentDuel('ira', NOW - DAY - 1, '2026-10-21');
    expect(await readSentDuels(NOW)).toEqual([]);
  });
});

describe('шторка вызова', () => {
  async function setup(onInviteToLesson = jest.fn()) {
    const hook = await renderHook(() => useDuelChallenge({ studyTarget: 'en', lang: 'ru', myName: 'Алекс', onInviteToLesson }));
    return { hook, onInviteToLesson };
  }

  it('открывается уже готовой; «Начать дуэль» ведёт на экран только после закрытия шторки', async () => {
    const { hook } = await setup();
    await act(async () => { hook.result.current.prepare(ira); });
    await act(async () => { hook.result.current.show(); });
    const sheet = hook.result.current.sheet;
    expect(sheet).toMatchObject({ visible: true, sameLanguage: true, enoughPhrases: true, sentToday: 0, openWithFriend: false });
    expect(sheet?.me).toEqual({ name: 'Алекс', coinRank: 4, isPlus: false });
    expect(hook.result.current.open).toBe(true);
    await act(async () => { hook.result.current.sheet?.onStart(); hook.result.current.sheet?.onClose(); });
    expect(mockPush).not.toHaveBeenCalled();
    await act(async () => { hook.result.current.sheet?.onDismissed?.(); });
    expect(mockPush).toHaveBeenCalledTimes(1);
    const [{ pathname, params }] = mockPush.mock.calls[0] as [{ pathname: string; params: Record<string, string> }];
    expect(pathname).toBe('/friends_duel');
    expect(params).toMatchObject({ mode: 'challenge', friend: 'ira', name: 'Ирина', rank: '9', plus: '1', me: 'Алекс', duel: '' });
    expect(params.ids.split(',')).toHaveLength(5);
    expect(hook.result.current.open).toBe(false);
  });

  it('разные языки — курс не трогаем; «Позвать на занятие» зовёт друга, экран не открываем', async () => {
    const { hook, onInviteToLesson } = await setup();
    await act(async () => { hook.result.current.prepare({ ...ira, studyLanguages: ['es'] }); });
    await act(async () => { hook.result.current.show(); });
    expect(mockPick).not.toHaveBeenCalled();
    expect(hook.result.current.sheet).toMatchObject({ sameLanguage: false, enoughPhrases: false });
    await act(async () => { hook.result.current.sheet?.onInviteToLesson(); hook.result.current.sheet?.onDismissed?.(); });
    expect(onInviteToLesson).toHaveBeenCalledWith('ira', 'Ирина');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('мало фраз — «Начать» не ведёт на экран даже при сбое шторки', async () => {
    mockPick.mockResolvedValue([phrase(1)]);
    const { hook } = await setup();
    await act(async () => { hook.result.current.prepare(ira); });
    await act(async () => { hook.result.current.show(); });
    expect(hook.result.current.sheet?.enoughPhrases).toBe(false);
    await act(async () => { hook.result.current.sheet?.onStart(); hook.result.current.sheet?.onDismissed?.(); });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('новый тап отменяет старую подготовку; закрытие без выбора ничего не открывает', async () => {
    const { hook } = await setup();
    await act(async () => {
      hook.result.current.prepare(ira);
      hook.result.current.prepare({ ...ira, uid: 'mark', name: 'Марк' });
    });
    await act(async () => { hook.result.current.show(); });
    expect(hook.result.current.sheet?.friend.name).toBe('Марк');
    await act(async () => { hook.result.current.sheet?.onClose(); hook.result.current.sheet?.onDismissed?.(); });
    expect(mockPush).not.toHaveBeenCalled();
    expect(hook.result.current.sheet).toBeNull();
  });

  it('три вызова сегодня и идущая дуэль — видны в шторке сразу', async () => {
    const today = (await import('../app/local_date')).getLocalDayKey();
    for (const uid of ['ira', 'mark', 'lida']) await recordSentDuel(uid, Date.now() - 1000, today);
    const { hook } = await setup();
    await act(async () => { hook.result.current.prepare(ira); });
    await act(async () => { hook.result.current.show(); });
    expect(hook.result.current.sheet).toMatchObject({ sentToday: 3, openWithFriend: true });
  });
});
