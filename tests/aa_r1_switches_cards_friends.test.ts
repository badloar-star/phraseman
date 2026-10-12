/**
 * Подмены съёмки R1 (Авторизация 12.10, строки manual_conditional Карточек и Друзей):
 * - Друзья: `dev_friends_hold=search`, `dev_friends_fail=search_offline|list`, код `DEVSLF`, `dailypoll=demo|voted`;
 * - Карточки: `answer=correct|wrong` («Правда/ложь», «Напиши»), `fail=video_list`, `cards=demo_few`, превью итога `/dev_cards_result_preview`.
 * зачем: всё — только память процесса и без сети; сторож держит поведение геттеров и места внедрения ДО сетевых вызовов.
 */
import fs from 'fs';
import path from 'path';

import {
  DEV_FRIENDS_FAILS,
  DEV_FRIENDS_HOLDS,
  devDailyPollVote,
  getDevDailyPoll,
  isDevFriendsFail,
  isDevFriendsHeld,
  isDevSelfFriendCode,
  resetDevSocialStateForTests,
  setDevSocialState,
} from '../app/dev_social_state';
import { DEV_CARDS_FAILS, getDevAnswerTarget, isDevCardsFail, resetDevCardsStateForTests, setDevCardsState } from '../app/dev_cards_state';
import { DEV_CARDS_RESULT_STATES, devCardsResultFixture, isDevCardsResultState } from '../app/flashcards/dev_cards_result_fixture';

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');

beforeAll(() => { (globalThis as { __DEV__?: boolean }).__DEV__ = true; });
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  resetDevSocialStateForTests();
  resetDevCardsStateForTests();
});

describe('Друзья: подмены поиска, списка и опроса дня', () => {
  it('новые удержание и сбои входят в списки и включаются/снимаются', () => {
    expect(DEV_FRIENDS_HOLDS).toContain('search');
    expect(DEV_FRIENDS_FAILS).toEqual(expect.arrayContaining(['search_offline', 'list']));
    expect(setDevSocialState({ friendsHolds: ['search'], friendsFails: ['search_offline', 'list'] })).toBe(true);
    expect(isDevFriendsHeld('search')).toBe(true);
    expect(isDevFriendsFail('search_offline')).toBe(true);
    expect(isDevFriendsFail('list')).toBe(true);
    setDevSocialState({ friendsHolds: [], friendsFails: [] });
    expect(isDevFriendsHeld('search')).toBe(false);
    expect(isDevFriendsFail('list')).toBe(false);
  });

  it('служебный код «свой профиль» — ровно DEVSLF, без учёта регистра и пробелов', () => {
    expect(isDevSelfFriendCode(' devslf ')).toBe(true);
    expect(isDevSelfFriendCode('DEVFND')).toBe(false);
    expect(isDevSelfFriendCode('ABC123')).toBe(false);
  });

  it('опрос дня: выключен — null; demo — без голоса; voted — с голосом; голос в памяти прибавляет 1', () => {
    expect(getDevDailyPoll('2026-10-12')).toBeNull();
    expect(devDailyPollVote('short')).toBeNull();
    setDevSocialState({ dailyPoll: 'demo' });
    const demo = getDevDailyPoll('2026-10-12');
    expect(demo?.poll.question.ru).toBe('Что помогает заниматься регулярно?');
    expect(demo?.poll.options.map((o) => o.text.ru)).toEqual(['Короткие занятия', 'Занятия с друзьями']);
    expect(demo?.poll.dateKey).toBe('2026-10-12');
    expect(demo?.vote).toBeNull();
    const vote = devDailyPollVote('friends');
    expect(vote).toEqual({ optionId: 'friends', counts: { short: 64, friends: 37 } });
    expect(getDevDailyPoll('2026-10-12')?.vote?.optionId).toBe('friends');
    setDevSocialState({ dailyPoll: 'voted' });
    expect(getDevDailyPoll('2026-10-12')?.vote?.optionId).toBe('short');
    setDevSocialState({ dailyPoll: null });
    expect(getDevDailyPoll('2026-10-12')).toBeNull();
  });

  it('экран «Друзья»: подмены поиска стоят ДО сети и до журнала сбоев, `list` — до подписок и не пишет кэш', () => {
    const src = read('app/(tabs)/friends.tsx');
    const search = src.slice(src.indexOf('const handleSearch = useCallback'), src.indexOf('const addRequestInFlightRef'));
    const lookup = search.indexOf('await lookupUserByFriendCode');
    for (const token of ["isDevFriendsHeld('search')", "isDevFriendsFail('search_offline')", 'isDevSelfFriendCode(codeUpper)']) {
      expect(search.indexOf(token)).toBeGreaterThan(-1);
      expect(search.indexOf(token)).toBeLessThan(lookup);
    }
    expect(src.indexOf("if (isDevFriendsFail('list')) {")).toBeLessThan(src.indexOf('unsubFriends = friendsAccountStore.subscribe('));
    expect(src).toContain("if (isDevFriendsFail('list')) return undefined;");
    expect(src).not.toMatch(/'Brak połączenia'\)\+'\n/); // настоящий перенос внутри строки ломал бандл
  });

  it('опрос дня: подмена до чтения кэша/сети, голос — до вызова dailyPollVote', () => {
    const src = read('app/daily_poll/daily_poll_client.ts');
    const load = src.slice(src.indexOf('async function loadInternal'), src.indexOf('function parseCachedPoll'));
    expect(load.indexOf('getDevDailyPoll(dateKey)')).toBeLessThan(load.indexOf('readJson<PollCacheRecord>'));
    const vote = src.slice(src.indexOf('export async function submitDailyPollVote'));
    expect(vote.indexOf('devDailyPollVote(optionId)')).toBeLessThan(vote.indexOf("'dailyPollVote'"));
  });
});

describe('Карточки: ответ робота, «Из видео», мало карточек, итог', () => {
  it('answer=correct|wrong хранится в памяти и снимается; video_list — в списке сбоев', () => {
    expect(getDevAnswerTarget()).toBeNull();
    setDevCardsState({ answer: 'wrong' });
    expect(getDevAnswerTarget()).toBe('wrong');
    setDevCardsState({ answer: null });
    expect(getDevAnswerTarget()).toBeNull();
    expect(DEV_CARDS_FAILS).toContain('video_list');
    setDevCardsState({ fails: ['video_list'] });
    expect(isDevCardsFail('video_list')).toBe(true);
  });

  it('итог: данные макета — N из 20, +N×10 монет, 1:12, ошибки Gate и Customs (без ошибок — пусто)', () => {
    expect(DEV_CARDS_RESULT_STATES).toEqual(['errors', 'clean', 'good', 'grow']);
    expect(devCardsResultFixture('errors')).toMatchObject({ correct: 18, wrong: 2, coins: 180, durationSec: 72 });
    expect(devCardsResultFixture('good')).toMatchObject({ correct: 12, wrong: 8, coins: 120 });
    expect(devCardsResultFixture('grow')).toMatchObject({ correct: 6, wrong: 14, coins: 60 });
    expect(devCardsResultFixture('clean')).toMatchObject({ correct: 20, wrong: 0, coins: 200, mistakes: [] });
    expect(devCardsResultFixture('errors').mistakes.map((m) => m.en)).toEqual(['Gate', 'Customs']);
    expect(isDevCardsResultState('good')).toBe(true);
    expect(isDevCardsResultState('nope')).toBe(false);
  });

  it('превью итога уходит на Главную вне dev и не трогает тренировку, монеты, отзыв и сеть', () => {
    const route = read('app/dev_cards_result_preview.tsx');
    expect(route).toContain('if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) {');
    expect(route).toContain('<Redirect href="/" />');
    expect(route).not.toMatch(/usePracticeRunes|settle\(|feedback=|httpsCallable|firestore|fetch\(/);
  });

  it('места внедрения: «Правда/ложь» помечает цель, «Напиши» держит порядок и вписывает ответ, «Из видео» — до чтения каталога', () => {
    const swipe = read('app/flashcards_swipe.tsx');
    expect(swipe).toContain("(btn.saysMatch === currentPrompt.isMatch) === (devAnswerTarget === 'correct') ? 'flashcards-truefalse-answer-target' : btn.testID");
    const recall = read('app/flashcards_recall_session.tsx');
    expect(recall).toContain('shuffle: devAnswerTarget === null,');
    expect(recall).toContain('const round = devAnswerTarget === null ? shuffle(cards) : cards.slice();');
    expect(recall).toContain("const typed = target === 'correct'");
    const video = read('app/flashcards_video_packs.tsx');
    expect(video.indexOf("isDevCardsFail('video_list')")).toBeLessThan(video.indexOf('await loadVideoPhraseSetPacks'));
    const demo = read('app/dev_state_cards_demo.ts');
    expect(demo).toContain('demoSavedFlashcards(false).slice(0, 3)');
    const fixtures = read('app/dev_state_fixtures.ts');
    for (const token of ["pick('answer'", "pick('dailypoll'", "'demo_few'", 'applyCardsDemo({ few: true })']) expect(fixtures).toContain(token);
  });
});
