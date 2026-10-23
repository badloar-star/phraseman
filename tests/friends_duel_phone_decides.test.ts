/**
 * «Дуэль на 5 фраз» (идея 3) по закону владельца 22.10 «сервер для сохранения, а не решений»: итог и лимит «три в день»
 * решает телефон (план docs/work/tasks/friends-law-rebuild-2026-10-22.md, координатор 22.10).
 * Сторож: одна функция итога по счёту у обоих телефонов; экран показывает телефонный итог, серверный — только сверка в журнал;
 * вызов учтён в журнале СРАЗУ (до сети), отказ сервера по целостности снимает запись, сеть — оставляет.
 */
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; return Promise.resolve(); }),
}));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: () => Promise.resolve('me-1') }));

import * as fs from 'fs';
import * as path from 'path';
import { normalizeEol } from './helpers/read_source';
import { DUEL_PHRASES, duelOutcome, duelOutcomeByScore } from '../app/friends_together/duel_core';
import { duelOpenWithFriend, duelSentToday, forgetSentDuel, readSentDuels, recordSentDuel } from '../app/friends_together/duel_ledger';

const NOW = 1_800_000_000_000;
const move = (correct: number, elapsedMs: number) => ({ results: Array.from({ length: DUEL_PHRASES }, (_, i) => i < correct), elapsedMs });

beforeEach(() => { for (const key of Object.keys(mockStorage)) delete mockStorage[key]; });

describe('итог решает телефон — одна функция по счёту', () => {
  it('точность, затем время, иначе ничья; по ходам — то же самое', () => {
    expect(duelOutcomeByScore({ correct: 4, elapsedMs: 90_000 }, { correct: 3, elapsedMs: 10_000 })).toBe('win');
    expect(duelOutcomeByScore({ correct: 3, elapsedMs: 10_000 }, { correct: 4, elapsedMs: 90_000 })).toBe('loss');
    expect(duelOutcomeByScore({ correct: 4, elapsedMs: 50_000 }, { correct: 4, elapsedMs: 60_000 })).toBe('win');
    expect(duelOutcomeByScore({ correct: 4, elapsedMs: 60_000 }, { correct: 4, elapsedMs: 60_000 })).toBe('draw');
    for (const [a, b] of [[move(4, 1), move(3, 1)], [move(2, 9), move(2, 8)], [move(5, 7), move(5, 7)]] as const) {
      expect(duelOutcome(a, b)).toBe(duelOutcomeByScore({ correct: a.results.filter(Boolean).length, elapsedMs: a.elapsedMs }, { correct: b.results.filter(Boolean).length, elapsedMs: b.elapsedMs }));
    }
  });
});

describe('лимит «три в день» — журнал на телефоне сразу, откат при отказе по целостности', () => {
  it('записанный вызов сразу закрывает второй вызов этому другу; откат возвращает место', async () => {
    await recordSentDuel('ira', NOW - 1000, '2026-10-22');
    const list = await readSentDuels(NOW);
    expect(duelSentToday(list, '2026-10-22')).toBe(1);
    expect(duelOpenWithFriend(list, 'ira', NOW)).toBe(true);
    await forgetSentDuel('ira', NOW - 1000);
    const after = await readSentDuels(NOW);
    expect(duelSentToday(after, '2026-10-22')).toBe(0);
    expect(duelOpenWithFriend(after, 'ira', NOW)).toBe(false);
  });

  it('откат снимает только свою запись (тот же друг, то же время)', async () => {
    await recordSentDuel('ira', NOW - 3000, '2026-10-22');
    await recordSentDuel('mark', NOW - 2000, '2026-10-22');
    await forgetSentDuel('ira', NOW - 1);
    expect((await readSentDuels(NOW)).map((d) => d.friendUid)).toEqual(['ira', 'mark']);
    await forgetSentDuel('ira', NOW - 3000);
    expect((await readSentDuels(NOW)).map((d) => d.friendUid)).toEqual(['mark']);
  });
});

describe('экран дуэли: телефонный итог, запись вызова до сети', () => {
  const src = normalizeEol(fs.readFileSync(path.resolve(__dirname, '..', 'app', 'friends_duel.tsx'), 'utf8'));

  it('после хода и у вызвавшего показываем итог телефона; серверный — только сверка в журнал', () => {
    expect(src).toContain("return { kind: 'result', move, outcome: local, theirs: res.theirs };");
    expect(src).toContain('outcome: resultOutcome(launch.result),');
    expect(src).toContain('duelOutcomeByScore(result.mine, result.theirs)');
    expect(src).not.toContain('показываем серверный');
  });

  it('вызов учтён до отправки; отказ кроме сети — откат записи', () => {
    const record = src.indexOf('void recordSentDuel(launch.friendUid, sentAtMs);');
    const submit = src.indexOf('void submitDuelChallenge(');
    expect(record).toBeGreaterThan(-1);
    expect(record).toBeLessThan(submit);
    expect(src).toMatch(/res\.reason !== 'network' && res\.reason !== 'no_sender'\) \{[\s\S]{0,160}forgetSentDuel\(launch\.friendUid, sentAtMs\)/);
  });
});
