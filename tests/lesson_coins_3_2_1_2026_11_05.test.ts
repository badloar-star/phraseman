// Governance-ID: TG-E138CC4DF370
import fs from 'node:fs';
import path from 'node:path';
import { createPracticeRuneEarnings, practiceRuneAwardForPass } from '../app/practice_rune_earnings';
import { lessonCoinsLog, lessonCoinsShortKey, LESSON_COINS_TAG } from '../app/lesson_coins_log';

// зачем (владелец 05.11, №80/№72: «первое прохождение +3, второе +2, третье и дальше +1»; на итоге 0 монет и ожидание 10 с):
// 1) ставки 3/2/1 по номеру прохода — на функции решения; 2) цепочка журнала [LESSON-COINS] не теряет ни одного раннего выхода и catch.

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('монеты за урок: ставки 3/2/1', () => {
  test.each([
    [1, 3], [2, 2], [3, 1], [4, 1], [10, 1], [100, 1],
  ])('проход %i платит %i за правильный ответ', (pass, award) => {
    expect(practiceRuneAwardForPass(pass)).toBe(award);
    expect(createPracticeRuneEarnings({ activity: 'lesson', sessionKey: 'lesson1_runes_en', passNumber: pass }).awardPerItem).toBe(award);
  });

  test.each([0, -1, 1.5, Number.NaN])('неверный номер прохода %p платит минимум (1)', (pass) => {
    expect(practiceRuneAwardForPass(pass as number)).toBe(1);
  });
});

describe('журнал [LESSON-COINS]', () => {
  test('пишет префикс и не бросает даже на неудобных данных', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => lessonCoinsLog('probe', { a: 1 })).not.toThrow();
    expect(() => lessonCoinsLog('probe_circular', circular)).not.toThrow();
    expect(log.mock.calls.some((call) => call[0] === LESSON_COINS_TAG)).toBe(true);
    log.mockRestore();
  });

  test('ключ сессии укорачивается до 40 символов', () => {
    expect(lessonCoinsShortKey('x'.repeat(200)).length).toBe(40);
  });

  test('в хуке монет журнал стоит на входе, решении, каждом раннем выходе и ошибке зачёта', () => {
    const hook = read('hooks/usePracticeRunes.ts');
    for (const step of [
      "'hydrate_enter'", "'hydrate_skip'", "'hydrate_abort'", "'pass_decision'", "'hydrated'",
      "'answer_skipped'", "'answer_awarded'", "'settle_skip'", "'settle_start'", "'settle_server_result'", "'settle_failed'",
    ]) {
      expect(hook).toContain(`lessonCoinsLog(${step}`);
    }
    // решение показывает все три источника номера прохода и итоговую ставку
    const decision = hook.slice(hook.indexOf("lessonCoinsLog('pass_decision'"));
    for (const field of ['markerCount', 'committedOrdinal', 'accumulatorHighWater', 'passNumber', 'awardPerItem', 'source']) {
      expect(decision.slice(0, 900)).toContain(field);
    }
  });

  test('на экране итога журнал показывает ожидание, вызов зачёта и ошибку зачёта', () => {
    const screen = read('app/lesson_complete.tsx');
    for (const step of ["'screen_hydrated'", "'screen_settle_call'", "'screen_settle_failed'"]) {
      expect(screen).toContain(`lessonCoinsLog(${step}`);
    }
    expect(screen).toContain('waitedMs');
  });

  test('журнал не пишет идентификатор пользователя', () => {
    const helper = read('app/lesson_coins_log.ts');
    expect(helper).not.toMatch(/stableId|ownerStableId|authUid|email/i);
  });
});
