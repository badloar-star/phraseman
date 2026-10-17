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
  // зачем (координатор 18.10, Сверка d1cdb9ac5): uiLang=pt-BR отклонялся — значение опускается в нижний регистр, а код смешанный.
  test('uiLang без учёта регистра → каноничный код; чужой язык отклоняется', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    for (const raw of ['pt-BR', 'pt-br', 'PT-BR']) {
      const { request, rejected } = parseDevStateParams({ uiLang: raw });
      expect(rejected).toEqual({});
      expect(request.uiLang).toBe('pt-BR');
    }
    expect(parseDevStateParams({ uiLang: 'EN' }).request.uiLang).toBe('en');
    const bad = parseDevStateParams({ uiLang: 'fr' });
    expect(bad.request.uiLang).toBeUndefined();
    expect(Object.keys(bad.rejected)).toEqual(['uiLang']);
    expect(log.mock.calls.some(([tag, payload]) => tag === '[DEV-UILANG] pick' && String(payload).includes('"decision":"rejected"'))).toBe(true);
    log.mockRestore();
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

  test('packdraft few/full/private и speech=hold|preparing', async () => {
    const cards = require('../app/dev_cards_state') as typeof import('../app/dev_cards_state');
    const rowsOf = () => (cards.getDevPackDraft() as { rows: unknown[]; publishToCommunity: boolean } | null);
    await applyDevState(parseDevStateParams({ packdraft: 'few' }).request);
    expect(rowsOf()?.rows).toHaveLength(4);
    await applyDevState(parseDevStateParams({ packdraft: 'full' }).request);
    expect(rowsOf()?.rows).toHaveLength(50);
    expect(new Set((rowsOf()?.rows as { en: string }[]).map((r) => r.en)).size).toBe(50);
    await applyDevState(parseDevStateParams({ packdraft: 'private' }).request);
    expect(rowsOf()?.publishToCommunity).toBe(false);
    expect(parseDevStateParams({ speech: 'hold' }).request.speech).toBe('hold');
    expect(parseDevStateParams({ speech: 'preparing' }).request.speech).toBe('preparing');
  });
});

describe('dev_state R1 (Ядро): прогресс уроков и экзамен A1 (learn-007…013), «Почему так» исчерпаны (dialogs-020)', () => {
  test('lessonsDone=N&examA1=almost — снимок списка уроков в памяти, хранилище не трогается; off снимает', async () => {
    const tab = require('../app/lessons_tab_state') as typeof import('../app/lessons_tab_state');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    expect(parseDevStateParams({ lessonsDone: '40' }).rejected).toHaveProperty('lessonsDone');
    expect(parseDevStateParams({ examA1: 'maybe' }).rejected).toHaveProperty('examA1');
    await applyDevState(parseDevStateParams({ lessonsDone: '8', examA1: 'almost' }).request);
    const snap = await tab.loadLessonsTabStateFromStorage('en', 'test');
    expect(snap.scores.slice(0, 8)).toEqual(new Array(8).fill(5));
    expect(snap.scores[8]).toBe(0);
    expect(snap.persistedUnlocked).toEqual(expect.arrayContaining([1, 9]));
    expect(snap.examResults.A1).toEqual({ pct: 61, passed: false });
    expect(tab.getLessonsTabInitialState('en')?.examResults.A1).toEqual({ pct: 61, passed: false });
    expect(await AsyncStorage.getItem('lesson1_best_score')).toBeNull();
    await applyDevState(parseDevStateParams({ lessonsDone: 'off', examA1: 'off' }).request);
    expect((await tab.loadLessonsTabStateFromStorage('en', 'test')).examResults.A1).toEqual({ pct: 0, passed: false });
  });

  test('lessonGates=real&legacyCap=8 — ворота уроков в памяти; плохое значение отклоняется; off снимает', async () => {
    const paywall = require('../app/dev_paywall_state') as typeof import('../app/dev_paywall_state');
    expect(parseDevStateParams({ legacyCap: '40' }).rejected).toHaveProperty('legacyCap');
    expect(parseDevStateParams({ lessonGates: 'maybe' }).rejected).toHaveProperty('lessonGates');
    await applyDevState(parseDevStateParams({ lessonGates: 'real', legacyCap: '8' }).request);
    expect(paywall.getDevLessonGates()).toEqual({ real: true, legacyCap: 8 });
    await applyDevState(parseDevStateParams({ lessonGates: 'off', legacyCap: 'off' }).request);
    expect(paywall.getDevLessonGates()).toBeNull();
  });

  test('dev_dialog_why=spent — бесплатных разборов 0, запись не идёт; off возвращает обычный счётчик', async () => {
    const why = require('../app/dialogue_v2_why_allowance') as typeof import('../app/dialogue_v2_why_allowance');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await applyDevState(parseDevStateParams({ dev_dialog_why: 'spent' }).request);
    const spent = await why.readDialogueV2WhyAllowance();
    expect(why.whyFreeLeft(spent)).toBe(0);
    expect(why.revealWhy(spent, 'msg-new').allowed).toBe(false);
    why.persistDialogueV2WhyAllowance(spent);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await AsyncStorage.getItem('dialogue_v2_why_allowance:v1')).toBeNull();
    await applyDevState(parseDevStateParams({ dev_dialog_why: 'off' }).request);
    expect(why.whyFreeLeft(await why.readDialogueV2WhyAllowance())).toBe(why.DIALOGUE_V2_WHY_FREE_PER_DAY);
  });
});

// зачем (D188): автопереход D164 и его dev-параметр сняты; старые ссылки с enStudyPrompt=off не ломаются — параметр игнорируется.
describe('dev_state R1 (Ядро): enStudyPrompt снят вместе с автопереходом (D188)', () => {
  test('ссылка с enStudyPrompt=off разбирается без отказов, параметр не применяется', () => {
    const parsed = parseDevStateParams({ enStudyPrompt: 'off', uiLang: 'en' });
    expect(parsed.rejected).not.toHaveProperty('enStudyPrompt');
    expect(parsed.request).not.toHaveProperty('enStudyPrompt');
    expect(require('../app/dev_ui_lang')).not.toHaveProperty('isDevEnStudyPromptOff');
  });
});

describe('dev_state R1 (Ядро): голосовые попытки Диалога исчерпаны (dialogs-028)', () => {
  test('dev_dialog_voice=spent — бейдж PLUS на микрофоне без трёх настоящих записей; off снимает', async () => {
    const dialog = require('../app/dev_dialog_state') as typeof import('../app/dev_dialog_state');
    const limit = require('../app/dialogue_v2_voice_daily_limit') as typeof import('../app/dialogue_v2_voice_daily_limit');
    expect(parseDevStateParams({ dev_dialog_voice: 'nope' }).rejected).toHaveProperty('dev_dialog_voice');
    await applyDevState(parseDevStateParams({ dev_dialog_voice: 'spent' }).request);
    expect(dialog.isDevDialogVoiceSpent()).toBe(true);
    expect(limit.dialogVoiceLimitDecision({ accessResolved: true, hasPremiumAccess: false, count: 0 })).toBe('limit_reached');
    await applyDevState(parseDevStateParams({ dev_dialog_voice: 'off' }).request);
    expect(dialog.isDevDialogVoiceSpent()).toBe(false);
  });
});

describe('dev_state R1 (Ядро): память диалогов и свободный разговор без сервера', () => {
  test('dev_dialog_memory=demo — сводка и прогресс; clear «успешен» в памяти; clear_fail — отказ', async () => {
    const dialog = require('../app/dev_dialog_state') as typeof import('../app/dev_dialog_state');
    const client = require('../app/dialogue_v2_memory_client') as typeof import('../app/dialogue_v2_memory_client');
    expect(parseDevStateParams({ dev_dialog_memory: 'clearing' }).rejected).toEqual({});
    await applyDevState(parseDevStateParams({ dev_dialog_memory: 'clear_fail' }).request);
    await expect(client.clearDialogueV2Memory({ studyTarget: 'en' })).rejects.toBeTruthy();
    await applyDevState(parseDevStateParams({ dev_dialog_memory: 'demo' }).request);
    expect(dialog.getDevDialogMemory()).toBe('demo');
    const view = await client.viewDialogueV2Memory({ studyTarget: 'en' });
    expect(view?.sharedSummary?.completedObjectives).toBe(7);
    expect(view?.scenarioCheckpoints).toHaveLength(2);
    await expect(client.clearDialogueV2Memory({ studyTarget: 'en' })).resolves.toMatchObject({ cleared: true });
    expect((await client.viewDialogueV2Memory({ studyTarget: 'en' }))?.sharedSummary).toBeNull();
  });

  test('свободный разговор: dev_dialog_send — сессия и ответ без сервера; dev_dialog_fail — отказ', async () => {
    const free = require('../app/dialogue_v2_freeform_client') as typeof import('../app/dialogue_v2_freeform_client');
    await applyDevState(parseDevStateParams({ dev_dialog_send: 'ok' }).request);
    const started = await free.startDialogueV2FreeformSession({ studyTarget: 'en' });
    expect(started?.sessionId).toMatch(/^d2fs_dev/);
    await applyDevState(parseDevStateParams({ dev_dialog_fail: 'service' }).request);
    await expect(free.startDialogueV2FreeformSession({ studyTarget: 'en' })).rejects.toBeTruthy();
  });
});

describe('dev_state R1 (Ядро): cards=demo_nopacks', () => {
  test('разбирается; фикстура без своих наборов пропускает шаги own_packs и continue', () => {
    expect(parseDevStateParams({ cards: 'demo_nopacks' }).request.cards).toBe('demo_nopacks');
    const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'app', 'dev_state_cards_demo.ts'), 'utf8') as string;
    expect((src.match(/if \(options\.noPacks === true\) return 'skipped:noPacks';/g) ?? []).length).toBe(2);
  });
});

describe('dev_state R1 (Ядро): энергия и вступление урока', () => {
  test('energy=restoring&restore_in, energy_stop, lessonintro — разбор и память', async () => {
    const pay = require('../app/dev_energy_stop_flag') as typeof import('../app/dev_energy_stop_flag');
    const cards = require('../app/dev_cards_state') as typeof import('../app/dev_cards_state');
    const { request, rejected } = parseDevStateParams({ energy: 'restoring', restore_in: '3', energy_stop: 'plus_granted', lessonintro: 'skip' });
    expect(rejected).toEqual({});
    expect(request).toMatchObject({ energyRestoreInSec: 3, energyStop: 'plus_granted', lessonIntro: 'skip' });
    expect(parseDevStateParams({ energy: 'restoring', restore_in: '0' }).rejected).toHaveProperty('restore_in');
    expect(parseDevStateParams({ energy: 'full' }).rejected).toHaveProperty('energy');
    await applyDevState(parseDevStateParams({ energy_stop: 'plus_granted', lessonintro: 'skip' }).request);
    expect(pay.isDevEnergyStopPlusGranted()).toBe(true);
    expect(cards.isDevLessonIntroSkip()).toBe(true);
    await applyDevState(parseDevStateParams({ energy_stop: 'off', lessonintro: 'off' }).request);
    expect(pay.isDevEnergyStopPlusGranted()).toBe(false);
    expect(cards.isDevLessonIntroSkip()).toBe(false);
  });

  test('Plus в памяти — тестерский VIP на сутки, без записи', () => {
    const vip = require('../app/dev_vip_override') as typeof import('../app/dev_vip_override');
    const now = Date.UTC(2026, 9, 12);
    const values = vip.devMemoryPlusValues(now);
    expect(values).toMatchObject({ vip_active: 'true', vip_plan: 'telegram_tester', vip_until: String(now + 86_400_000) });
  });
});

describe('dev_state R1 (Ядро): notifperm=denied (settings-gap-012)', () => {
  test('разбор и флаг в памяти', async () => {
    const social = require('../app/dev_social_state') as typeof import('../app/dev_social_state');
    expect(parseDevStateParams({ notifperm: 'denied' }).request.notifPerm).toBe('denied');
    await applyDevState(parseDevStateParams({ notifperm: 'denied' }).request);
    expect(social.isDevNotifPermDenied()).toBe(true);
    await applyDevState(parseDevStateParams({ notifperm: 'off' }).request);
    expect(social.isDevNotifPermDenied()).toBe(false);
  });
});
