// зачем (координатор 12.10, R1_ROBOT_LINKS_GAPS.md): dev-подмены для робота — «мои ошибки», друзья со входящей заявкой, ответ в Блице. Только память, в сторе отказ, включение на одноразовом госте.
import fs from 'node:fs';
import path from 'node:path';

import { getDevBlitzAnswer, resetDevCardsStateForTests, setDevCardsState } from '../app/dev_cards_state';
import { buildDevMistakesDemoSnapshot, isDevMistakesDemoOn } from '../app/dev_mistakes_demo';
import { devFriendsDemoData, isDevFriendsDemoOn } from '../app/dev_friends_demo';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('dev-подмены для робота', () => {
  beforeAll(() => { (globalThis as { __DEV__?: boolean }).__DEV__ = true; });
  beforeEach(() => { resetDevCardsStateForTests(); });

  it('«мои ошибки»: снимок согласован (4 ждут, 2 готовы сейчас, 2 исправлены), по умолчанию выключено', () => {
    expect(isDevMistakesDemoOn()).toBe(false);
    const snap = buildDevMistakesDemoSnapshot(1_000_000_000_000);
    expect(snap.items).toHaveLength(6);
    expect(snap.insights.active).toBe(4);
    expect(snap.insights.corrected).toBe(2);
    expect(snap.readyCount).toBe(2);
    expect(snap.items.filter((item) => item.ready)).toHaveLength(2);
    expect(snap.items.filter((item) => item.status === 'corrected').every((item) => item.correctedAtMs !== null)).toBe(true);
    expect(snap.insights.topMistakes).toHaveLength(4);
    expect(snap.insights.totalTracked).toBe(snap.items.length);
  });

  it('друзья: одна входящая заявка (uid с префиксом dev-demo) и один друг, по умолчанию выключено', () => {
    expect(isDevFriendsDemoOn()).toBe(false);
    const demo = devFriendsDemoData(1_000_000_000_000);
    expect(demo.requests).toHaveLength(1);
    expect(demo.friends).toHaveLength(1);
    expect(demo.requests[0]!.fromUid.startsWith('dev-demo-')).toBe(true);
    expect(demo.requests[0]!.status).toBe('pending');
  });

  it('Блиц: dev blitz_answer хранится в состоянии Карточек и снимается', () => {
    expect(getDevBlitzAnswer()).toBeNull();
    const quiet = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    setDevCardsState({ blitzAnswer: 'wrong' });
    expect(getDevBlitzAnswer()).toBe('wrong');
    setDevCardsState({ blitzAnswer: null });
    quiet.mockRestore();
    expect(getDevBlitzAnswer()).toBeNull();
  });

  it('исходники: в сторе отказ, включение только на госте, подписок и записей у друзей нет, хаб ошибок и Блиц подключены', () => {
    for (const file of ['app/dev_mistakes_demo.ts', 'app/dev_friends_demo.ts']) {
      const src = read(file);
      expect(src).toContain("typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE");
      expect(src).toContain("assertDisposableGuest(");
      expect(src).toContain('отклонено — не dev-сборка');
    }
    const hub = read('app/mistake_practice_insights.ts');
    expect(hub).toContain('if (isDevMistakesDemoOn()) {');
    const friends = read('app/(tabs)/friends.tsx');
    // демо до подписок: возврат раньше startFriendsTabSwrPrime и подписок; кэш вкладки и профили не трогаются; принять/отклонить — только экран
    expect(friends.indexOf('if (isDevFriendsDemoOn()) {\n        const demo')).toBeGreaterThan(-1);
    expect(friends.indexOf('if (isDevFriendsDemoOn()) {\n        const demo')).toBeLessThan(friends.indexOf('await startFriendsTabSwrPrime();'));
    expect(friends).toContain('if (isDevFriendsDemoOn()) return undefined; // зачем: демо-данные не пишем в кэш вкладки (диск)');
    expect(friends).toContain('if (isDevFriendsDemoOn()) return; // зачем: демо-друзья вымышленные');
    expect(friends.match(/\[DEV-STATE\] friends: demo (accept|decline)/g)).toHaveLength(2);
    const blitz = read('app/flashcards_blitz_session.tsx');
    expect(blitz).toContain("testID={isDevTarget ? 'fc-blitz-opt-target' : `fc-blitz-opt-${i}`}");
    const fixtures = read('app/dev_state_fixtures.ts');
    for (const token of ["pick('blitz_answer'", "pick('mistakes'", "pick('friends'", 'setDevMistakesDemo(request.mistakes', 'setDevFriendsDemo(request.friends']) expect(fixtures).toContain(token);
  });
});
