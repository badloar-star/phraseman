// зачем (координатор 12.10, «сперва логи», cards-v2-033: «Правда / ложь» без подмены сбоя показывает «Не удалось подготовить тренировку»): цепочка «Начать» → подготовка → результат
// обязана писать [FLASHCARDS-SESSION] на каждом шаге, раннем выходе и в catch, а подмены dev (train_gate и др.) — с источником, откуда они взялись.
import fs from 'node:fs';
import path from 'node:path';

import { describeDevCardsState, resetDevCardsStateForTests, setDevCardsState } from '../app/dev_cards_state';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('[FLASHCARDS-SESSION]', () => {
  beforeAll(() => { (globalThis as { __DEV__?: boolean }).__DEV__ = true; });
  beforeEach(() => { resetDevCardsStateForTests(); });

  it('снимок подмен: без ссылки — «не выставлялись», после ссылки — ключи и давность', () => {
    const quiet = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const before = describeDevCardsState();
    expect(before.trainGate).toBeNull();
    expect(typeof before.source).toBe('object');
    setDevCardsState({ trainGate: 'fail_swipe_prepare' });
    const after = describeDevCardsState() as { trainGate: string; source: { lastKeys: string[]; patches: number; lastAgoMs: number } };
    quiet.mockRestore();
    expect(after.trainGate).toBe('fail_swipe_prepare');
    expect(after.source.lastKeys).toEqual(['trainGate']);
    expect(after.source.patches).toBeGreaterThanOrEqual(1);
    expect(after.source.lastAgoMs).toBeGreaterThanOrEqual(0);
  });

  it('старт сессии: вход, ветвления, ответ подготовки, ранние выходы и catch пишут журнал', () => {
    const src = read('app/flashcards_swipe.tsx');
    const at = src.indexOf('const startSession = useCallback(async () => {');
    expect(at).toBeGreaterThan(-1);
    const end = src.indexOf('}, [fsLog, trainingMode', at);
    expect(end).toBeGreaterThan(at);
    const block = src.slice(at, end);
    for (const token of [
      "fsLog('exit:access_not_resolved'", "fsLog('exit:not_startable'", "fsLog('enter'", "devState: describeDevCardsState()",
      "fsLog('exit:dev_train_gate'", "fsLog('cards:built'", "fsLog('exit:no_cards_with_translation'", "fsLog('account:resolved'",
      "fsLog('prepare:request'", "fsLog('prepare:response'", "fsLog('reconcile'", "fsLog('claim'", "fsLog('energy'", "fsLog('exit:energy_cancelled'",
      "fsLog('exit:energy_insufficient'", "fsLog('quota'", "fsLog('exit:quota_refused'", "fsLog('exit:unmounted_or_abandoned'",
      "fsLog('result:play'", "fsLog('catch'", "failOpenPolicy", "fsLog('result:error_shown'",
    ]) expect(block).toContain(token);
  });

  it('экран настройки пишет тот же префикс на тапе и на переходе', () => {
    const src = read('app/flashcards_training_setup.tsx');
    expect(src).toContain('[FLASHCARDS-SESSION] setup:tap');
    expect(src).toContain('[FLASHCARDS-SESSION] setup:push');
    expect(src).toContain('describeDevCardsState');
  });
});
