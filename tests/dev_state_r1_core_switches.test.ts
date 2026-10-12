// зачем (координатор 12.10, съёмка R1 «core_switch / manual_conditional»): подмены Ядра для робота — только память процесса,
// без записи в хранилище и сеть; в стор-сборке недоступны. Сторож держит разбор ссылки, применение и то, что `started=`
// не утекает в хранилище при отметке нового языка.
jest.mock('../app/dev_energy_tools', () => ({ devSetEnergy: jest.fn(async () => true), setDevEnergyModeOverride: jest.fn(async () => true) }));
jest.mock('../app/dev_plus_controls', () => ({
  setDevLocalPlusOverride: jest.fn(async () => undefined),
  getDevLocalPlusStorageKey: (stableId: string) => `dev_local_plus_override_v1:${encodeURIComponent(stableId)}`,
}));
jest.mock('../app/dev_as_free_flag', () => ({ setDevAsFreeFlag: jest.fn(async () => true) }));
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn(async () => 'stable-1'), peekStableId: jest.fn(() => 'stable-1') }));
jest.mock('../app/dev_state_account_guard', () => ({ assertDisposableGuest: jest.fn(), classifyGuestUser: jest.fn() }));
jest.mock('../app/spire_tab_flag', () => ({ setSpireTabDevOverride: jest.fn(async () => undefined) }));
jest.mock('../app/spire_gate_refresh', () => ({ forceRefreshSpireGatesNow: jest.fn(async () => ({ tab: true, config: true })) }));
const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => (mockStore.has(key) ? mockStore.get(key)! : null)),
    setItem: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { mockStore.delete(key); }),
    multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => mockStore.set(k, v)); }),
    multiRemove: jest.fn(async (keys: string[]) => { keys.forEach((k) => mockStore.delete(k)); }),
    multiGet: jest.fn(async (keys: string[]) => keys.map((k) => [k, mockStore.has(k) ? mockStore.get(k)! : null])),
  },
}));

/* eslint-disable import/first */
import { applyDevState, parseDevStateParams } from '../app/dev_state_fixtures';
import { getDevStartedLanguages, isDevSupportFakeSent, resetDevSocialStateForTests } from '../app/dev_social_state';
import { getDevLessonUpsell, isDevAiExplainLimit, isDevManageLoadingHold } from '../app/dev_paywall_state';
import { getStartedStudyLanguages, markStudyLanguageStarted, STUDY_LANGUAGES_STARTED_KEY } from '../app/study_languages';

beforeEach(() => {
  // зачем: подмены работают только в dev-сборке (__DEV__ && !IS_STORE_RELEASE) — среда теста по умолчанию не dev.
  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
  mockStore.clear();
  resetDevSocialStateForTests();
  (require('../app/dev_dialog_state') as typeof import('../app/dev_dialog_state')).resetDevDialogState();
});

describe('dev_state R1 (Ядро): разбор', () => {
  test('support=sent, manage, started, upsell, ai_explain', () => {
    const { request, rejected } = parseDevStateParams({
      support: 'sent', manage: 'loading', started: 'en,es', upsell: 'three_lessons', ai_explain: 'limit',
    });
    expect(rejected).toEqual({});
    expect(request).toMatchObject({ support: 'sent', manage: 'loading', started: ['en', 'es'], upsell: 'three_lessons', aiExplain: 'limit' });
  });
  test('мусор отбрасывается с причиной', () => {
    const { rejected } = parseDevStateParams({ support: 'maybe', manage: 'slow', started: 'en,xx', upsell: 'ten', ai_explain: 'on' });
    expect(Object.keys(rejected).sort()).toEqual(['ai_explain', 'manage', 'started', 'support', 'upsell']);
  });
});

describe('dev_state R1 (Ядро): применение — только память', () => {
  test('флаги выставляются и снимаются, хранилище не тронуто', async () => {
    await applyDevState(parseDevStateParams({ support: 'sent', manage: 'loading', started: 'en,es', upsell: 'first_lesson', ai_explain: 'limit' }).request);
    expect(isDevSupportFakeSent()).toBe(true);
    expect(isDevManageLoadingHold()).toBe(true);
    expect(getDevStartedLanguages()).toEqual(['en', 'es']);
    expect(getDevLessonUpsell()).toBe('first_lesson');
    expect(isDevAiExplainLimit()).toBe(true);
    expect(mockStore.has(STUDY_LANGUAGES_STARTED_KEY)).toBe(false);

    await applyDevState(parseDevStateParams({ support: 'ok', manage: 'off', started: 'off', upsell: 'off', ai_explain: 'off' }).request);
    expect(isDevSupportFakeSent()).toBe(false);
    expect(isDevManageLoadingHold()).toBe(false);
    expect(getDevStartedLanguages()).toBeNull();
    expect(getDevLessonUpsell()).toBeNull();
    expect(isDevAiExplainLimit()).toBe(false);
  });

  test('started= дополняет список в памяти и не утекает в хранилище при отметке нового языка', async () => {
    mockStore.set(STUDY_LANGUAGES_STARTED_KEY, JSON.stringify(['en']));
    await applyDevState(parseDevStateParams({ started: 'es' }).request);
    expect(await getStartedStudyLanguages()).toEqual(['en', 'es']);
    expect(await markStudyLanguageStarted('de')).toEqual(['en', 'de', 'es']);
    expect(JSON.parse(mockStore.get(STUDY_LANGUAGES_STARTED_KEY)!)).toEqual(['en', 'de']);
  });
});

describe('dev_state R1 (Ядро): Диалоги, Друзья, промокод', () => {
  test('dev_dialog_end/better/completion и promo=hold разбираются и применяются в память', async () => {
    const dialog = require('../app/dev_dialog_state') as typeof import('../app/dev_dialog_state');
    const social = require('../app/dev_social_state') as typeof import('../app/dev_social_state');
    const { request, rejected } = parseDevStateParams({ dev_dialog_end: 'on', dev_dialog_better: 'on', dev_dialog_completion: 'errors', promo: 'hold' });
    expect(rejected).toEqual({});
    await applyDevState(request);
    expect(dialog.isDevDialogEnd()).toBe(true);
    expect(dialog.isDevDialogBetter()).toBe(true);
    expect(dialog.getDevDialogCompletion()).toBe('errors');
    expect(social.isDevPromoHold()).toBe(true);
    expect(social.getDevPromoResult()).toBeNull();
    await applyDevState(parseDevStateParams({ dev_dialog_end: 'off', dev_dialog_better: 'off', dev_dialog_completion: 'off', promo: 'none' }).request);
    expect(dialog.isDevDialogEnd()).toBe(false);
    expect(dialog.getDevDialogCompletion()).toBeNull();
    expect(social.isDevPromoHold()).toBe(false);
  });

  test('служебные коды друзей: DEVUNS срабатывает и на обрезанном вводе, DEVFND — подставной друг', () => {
    const social = require('../app/dev_social_state') as typeof import('../app/dev_social_state');
    expect(social.isDevUnsyncedFriendCode('DEVUNS')).toBe(true);
    expect(social.isDevUnsyncedFriendCode(' devunsynced ')).toBe(true);
    expect(social.isDevFoundFriendCode('devfnd')).toBe(true);
    expect(social.isDevFoundFriendCode('ABCDEF')).toBe(false);
    expect(social.isDevFoundFriendUid(social.DEV_FOUND_FRIEND_UID)).toBe(true);
  });
});

describe('dev_state R1 (Ядро): Карточки — сообщество без сети', () => {
  test('packcards/comments/community/voices/fail разбираются', () => {
    const { request, rejected } = parseDevStateParams({
      packcards: 'on', comments: 'demo', community: 'reset', voices: 'none', fail: 'pack_like,publish_error,pack_remove_min,video_open,report_send,comment_send',
    });
    expect(rejected).toEqual({});
    expect(request).toMatchObject({ packcards: 'on', comments: 'demo', community: 'reset', voices: 'none' });
    expect(request.fail).toEqual(['pack_like', 'publish_error', 'pack_remove_min', 'video_open', 'report_send', 'comment_send']);
  });

  test('демо-наборы в памяти: карточки «B2 глаголы» как на образце, владение/лайк/отклики — только память', () => {
    const cards = require('../app/dev_cards_state') as typeof import('../app/dev_cards_state');
    const demo = require('../app/dev_state_cards_demo') as typeof import('../app/dev_state_cards_demo');
    cards.resetDevCardsStateForTests();
    const data = demo.demoCommunityPackData('stable-1');
    expect(cards.isDevCommunityPackId('dev_demo_community_2')).toBe(false); // режим выключен — обычный путь
    expect(cards.setDevCommunityState({ active: true, packs: data.packs, comments: 'demo' })).toBe(true);
    const b2 = cards.getDevCommunityPack('dev_demo_community_2');
    expect((b2?.cards as { en: string }[]).slice(0, 5).map((c) => c.en)).toEqual(['Convince', 'Claim', 'Afford', 'Borrow', 'Deserve']);
    expect(b2?.cards).toHaveLength(49);
    expect(cards.getDevCommunityPack('dev_demo_published_own')?.meta.authorStableId).toBe('stable-1');
    expect((cards.getDevCommunityPack(demo.DEMO_VIDEO_COMMUNITY_PACK_ID)?.cards as { videoStartSec?: number }[])[0].videoStartSec).toBe(12);
    expect(cards.isDevCommunityPackId('real_pack_123')).toBe(false);
    expect(cards.isDevCommunityOwned('dev_demo_community_2')).toBe(false);
    cards.devCommunityMarkOwned('dev_demo_community_2');
    expect(cards.getDevCommunityOwnedIds()).toEqual(['dev_demo_community_2']);
    expect(cards.devCommunitySetLiked('dev_demo_community_2', true)).toBe(true);
    expect(cards.devCommunitySetLiked('dev_demo_community_2', true)).toBe(false);
    expect(cards.getDevCommunityComments('dev_demo_community_2')).toHaveLength(3);
    cards.setDevCommunityState({ reset: true });
    expect(cards.getDevCommunityOwnedIds()).toEqual([]);
    expect(cards.isDevCommunityLiked('dev_demo_community_2')).toBe(false);
    expect(cards.getDevCommunityPack('dev_demo_community_2')).not.toBeNull(); // reset не трогает данные наборов
  });

  test('voices: demo — список образца, none — пусто', async () => {
    const cards = require('../app/dev_cards_state') as typeof import('../app/dev_cards_state');
    await applyDevState(parseDevStateParams({ voices: 'demo' }).request);
    expect(cards.getDevVoices()?.map((v) => v.name)).toEqual(['Samantha', 'Daniel', 'Karen', 'Moira']);
    await applyDevState(parseDevStateParams({ voices: 'none' }).request);
    expect(cards.getDevVoices()).toEqual([]);
    await applyDevState(parseDevStateParams({ voices: 'off' }).request);
    expect(cards.getDevVoices()).toBeNull();
  });
});

describe('dev_state R1 (Ядро): packcards=meta и packdraft', () => {
  test('packcards=meta — мета без карточек; packdraft — черновик из 12 карточек в сообщество', async () => {
    const cards = require('../app/dev_cards_state') as typeof import('../app/dev_cards_state');
    expect(parseDevStateParams({ packcards: 'meta', packdraft: 'on' }).rejected).toEqual({});
    await applyDevState(parseDevStateParams({ packcards: 'meta', packdraft: 'on' }).request);
    expect(cards.getDevCommunityPack('dev_demo_community_2')?.cards).toEqual([]);
    expect(cards.getDevCommunityPack('dev_demo_community_2')?.meta.cardCount).toBe(49);
    const draft = cards.getDevPackDraft() as { rows: unknown[]; publishToCommunity: boolean } | null;
    expect(draft?.rows).toHaveLength(12);
    expect(draft?.publishToCommunity).toBe(true);
    await applyDevState(parseDevStateParams({ packdraft: 'off', community: 'off' }).request);
    expect(cards.getDevPackDraft()).toBeNull();
    expect(cards.isDevCommunityPackId('dev_demo_community_2')).toBe(false);
  });
});
