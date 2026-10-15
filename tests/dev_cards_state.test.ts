// зачем (координатор 12.10, R1 «нет пути», Карточки): dev-состояния для съёмки (hold / fail / speech / train_gate / moderation / demo_published / notranslation)
// работают ТОЛЬКО в dev-сборке; в стор-сборке ссылка ничего не включает, а геттеры всегда «выключено».
jest.mock('../app/dev_energy_tools', () => ({ devSetEnergy: jest.fn(async () => true), setDevEnergyModeOverride: jest.fn(async () => true) }));
jest.mock('../app/dev_plus_controls', () => ({ setDevLocalPlusOverride: jest.fn(async () => undefined), getDevLocalPlusStorageKey: (id: string) => `k:${id}` }));
jest.mock('../app/dev_as_free_flag', () => ({ setDevAsFreeFlag: jest.fn(async () => true) }));
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn(async () => 'stable-1') }));
jest.mock('../app/spire_tab_flag', () => ({ setSpireTabDevOverride: jest.fn(async () => undefined) }));
jest.mock('../app/spire_gate_refresh', () => ({ forceRefreshSpireGatesNow: jest.fn(async () => ({ tab: true, config: true })) }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined), multiSet: jest.fn(async () => undefined), multiRemove: jest.fn(async () => undefined), multiGet: jest.fn(async () => []) },
}));
let mockStoreRelease = false;
jest.mock('../app/config', () => ({
  ...jest.requireActual('../app/config'),
  get IS_STORE_RELEASE() { return mockStoreRelease; },
}));

/* eslint-disable import/first */
import fs from 'node:fs';
import path from 'node:path';
import { applyDevState, parseDevStateParams } from '../app/dev_state_fixtures';
import {
  devSpeechTranscriptFor, getDevSpeechMode, getDevTrainGate, isDevCardsFail, isDevCardsHeld, resetDevCardsStateForTests, setDevCardsState,
} from '../app/dev_cards_state';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('dev cards states', () => {
  beforeEach(() => {
    mockStoreRelease = false;
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    resetDevCardsStateForTests();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { jest.restoreAllMocks(); });

  it('parses the link parameters, comma lists and rejects unknown names', () => {
    const { request, rejected } = parseDevStateParams({
      hold: 'saved_loading,voices_loading', fail: 'card_write,pack_write', speech: 'wrong', train_gate: 'fail_swipe_quota', moderation: 'revision', cards: 'demo_published',
    });
    expect(request).toMatchObject({ hold: ['saved_loading', 'voices_loading'], fail: ['card_write', 'pack_write'], speech: 'wrong', trainGate: 'fail_swipe_quota', moderation: 'revision', cards: 'demo_published' });
    expect(rejected).toEqual({});
    expect(parseDevStateParams({ cards: 'notranslation' }).request.cards).toBe('notranslation');
    expect(parseDevStateParams({ hold: 'off', fail: 'off' }).request).toMatchObject({ hold: 'off', fail: 'off' });
    const bad = parseDevStateParams({ hold: 'hub_loading,nope', speech: 'sing', train_gate: 'x', moderation: 'maybe' });
    expect(Object.keys(bad.rejected).sort()).toEqual(['hold', 'moderation', 'speech', 'train_gate']);
    expect(bad.request.hold).toEqual(['hub_loading']);
  });

  it('applies and clears the flags in a dev build', async () => {
    const applied = await applyDevState({ hold: ['quota_waiting'], fail: ['recall_load', 'setup_decks'], speech: 'correct', trainGate: 'fail_blitz' });
    expect(applied.skipped).toEqual({});
    expect([isDevCardsHeld('quota_waiting'), isDevCardsHeld('hub_loading'), isDevCardsFail('recall_load'), isDevCardsFail('setup_decks'), getDevSpeechMode(), getDevTrainGate()])
      .toEqual([true, false, true, true, 'correct', 'fail_blitz']);
    await applyDevState({ hold: 'off', fail: 'off', speech: 'off', trainGate: 'off' });
    expect([isDevCardsHeld('quota_waiting'), isDevCardsFail('recall_load'), getDevSpeechMode(), getDevTrainGate()]).toEqual([false, false, null, null]);
  });

  it('substitutes the recognised phrase only for correct and wrong', () => {
    setDevCardsState({ speech: 'correct' });
    expect(devSpeechTranscriptFor('Good morning')).toBe('Good morning');
    setDevCardsState({ speech: 'wrong' });
    expect(devSpeechTranscriptFor('Good morning')).not.toBe('Good morning');
    setDevCardsState({ speech: 'denied' });
    expect(devSpeechTranscriptFor('Good morning')).toBeNull();
  });

  // координатор 15.10 (R11): Сверке нужны кадры «не засчитано» с конкретным пропущенным словом без голоса на эмуляторе
  it('speak_transcript: exact text instead of the microphone, turns speech=correct on, off restores', async () => {
    expect(parseDevStateParams({ speak_transcript: 'I do not the number' }).request.speakTranscript).toBe('I do not the number');
    expect(parseDevStateParams({ speak_transcript: 'off' }).request.speakTranscript).toBe('off');
    expect(parseDevStateParams({ speak_transcript: 'x'.repeat(201) }).rejected.speak_transcript).toMatch(/1..200/);
    await applyDevState({ speakTranscript: 'I do not the number' });
    expect(getDevSpeechMode()).toBe('correct');
    expect(devSpeechTranscriptFor('I do not remember the number')).toBe('I do not the number');
    await applyDevState({ speakTranscript: 'off' });
    expect(devSpeechTranscriptFor('I do not remember the number')).toBe('I do not remember the number');
    await applyDevState({ speech: 'denied', speakTranscript: 'hello' });
    expect(getDevSpeechMode()).toBe('denied'); // явный speech= не перетирается
    expect(devSpeechTranscriptFor('hello there')).toBeNull();
  });

  it('does nothing in a store build', async () => {
    mockStoreRelease = true;
    expect(setDevCardsState({ holds: ['hub_loading'], fails: ['card_write'], speech: 'correct', trainGate: 'fail_blitz' })).toBe(false);
    const result = await applyDevState({ hold: ['hub_loading'], fail: ['card_write'], speech: 'correct', trainGate: 'fail_blitz' });
    expect(result.skipped).toEqual({ all: 'not_dev_build' });
    mockStoreRelease = false;
    setDevCardsState({ holds: ['hub_loading'], fails: ['card_write'], speech: 'correct', trainGate: 'fail_blitz' });
    mockStoreRelease = true; // даже если флаг уже стоял — геттеры гасят его в стор-сборке
    expect([isDevCardsHeld('hub_loading'), isDevCardsFail('card_write'), getDevSpeechMode(), getDevTrainGate(), devSpeechTranscriptFor('x')]).toEqual([false, false, null, null, null]);
  });

  it('is wired into every screen and store the shot list points at', () => {
    const checks: ReadonlyArray<readonly [string, RegExp]> = [
      ['app/flashcards/useCollectionData.ts', /isDevCardsHeld\('saved_loading'\)[\s\S]*isDevCardsFail\('saved_load'\)/],
      ['app/flashcards/FlashcardsCategoryHub.tsx', /isDevCardsHeld\('catalog_loading'\)/],
      ['app/flashcards_training_setup.tsx', /isDevCardsHeld\('setup_loading'\)[\s\S]*isDevCardsFail\('setup_decks'\)/],
      ['app/flashcards_recall_session.tsx', /isDevCardsFail\('recall_load'\)/],
      ['app/flashcards_voice_picker.tsx', /isDevCardsHeld\('voices_loading'\)/],
      ['app/flashcards/custom_cards_store.ts', /isDevCardsFail\('card_write'\)/],
      ['app/community_packs/localPackCardAdd.ts', /isDevCardsFail\('pack_write'\)/],
      ['app/community_packs/communityPackActions.ts', /isDevCardsFail\('pack_write'\)/],
      ['app/community_packs/publishLocalPack.ts', /isDevCardsFail\('publish_daily_limit'\)/],
      ['app/speech_device_availability.ts', /getDevSpeechMode\(\) === 'unavailable'/],
      ['components/SpeakingPanel.tsx', /devSpeechTranscriptFor\(targetText\)/],
      ['app/flashcards_blitz_session.tsx', /getDevTrainGate\(\) === 'fail_blitz'/],
      ['app/flashcards_speaking_session.tsx', /getDevTrainGate\(\) === 'fail_speaking'/],
      ['app/flashcards_swipe.tsx', /fail_swipe_prepare[\s\S]*isDevCardsHeld\('swipe_quickstart'\)/],
      ['app/flashcards/FlashcardsHubScreen.tsx', /isDevCardsHeld\('quota_waiting'\)[\s\S]*isDevCardsHeld\('hub_loading'\)/],
    ];
    const missing = checks.filter(([file, pattern]) => !pattern.test(read(file))).map(([file]) => file);
    expect(missing).toEqual([]);
  });

  it('keeps the dev state module free of network and Firestore', () => {
    expect(read('app/dev_cards_state.ts')).not.toMatch(/httpsCallable\(|firebase\/firestore|@react-native-firebase|\bfetch\(|\bsetDoc\(|\baddDoc\(|\bupdateDoc\(|XMLHttpRequest/);
  });
});
