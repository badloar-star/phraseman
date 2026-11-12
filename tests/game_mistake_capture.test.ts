/**
 * Промах в игре → «Мои ошибки» (D207: связь игр и ошибок; макет «Потока»: «фраза уйдёт в «Ошибки»»).
 */
const capture = jest.fn();
jest.mock('../app/mistake_practice_capture', () => ({ captureCurrentAccountObjectiveAttempt: (...args: unknown[]) => capture(...args) }));
jest.mock('../modules/mistake-practice/contracts', () => ({ isMistakeStudyTargetValue: (v: unknown) => v === 'en' || v === 'de' }));

import { captureGameMistake } from '../modules/games/game_mistake_capture';

const base = { game: 'flow' as const, studyTarget: 'de', itemId: 'de:1:7', target: 'Du bist müde', meaning: 'Ты устал', given: 'Ты один', attemptKey: 'a1' };

beforeEach(() => {
  capture.mockReset();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

it('пишет фразу изучаемого языка и её перевод в журнал ошибок', async () => {
  capture.mockResolvedValue({ kind: 'captured' });
  await expect(captureGameMistake(base)).resolves.toBe('saved');
  const attempt = capture.mock.calls[0][0];
  expect(attempt).toMatchObject({
    attemptId: 'game:flow:a1:de:1:7',
    studyTarget: 'de',
    verdict: 'wrong',
    objective: true,
    content: { sourceKind: 'game', sourceId: 'game:flow:de:1:7', canonicalTarget: 'Du bist müde', sourceMeaning: 'Ты устал' },
    facet: { kind: 'meaning', expected: 'Du bist müde', given: 'Ты один' },
  });
});

it('язык без журнала ошибок и пустая фраза не пишутся', async () => {
  await expect(captureGameMistake({ ...base, studyTarget: 'xx' })).resolves.toBe('skipped');
  await expect(captureGameMistake({ ...base, target: '  ' })).resolves.toBe('skipped');
  expect(capture).not.toHaveBeenCalled();
});

it('отказ журнала — пропуск, сбой журнала — «не удалось», игра не падает', async () => {
  capture.mockResolvedValueOnce({ kind: 'ignored', reason: 'duplicate' });
  await expect(captureGameMistake(base)).resolves.toBe('skipped');
  capture.mockRejectedValueOnce(new Error('disk'));
  await expect(captureGameMistake(base)).resolves.toBe('failed');
});
