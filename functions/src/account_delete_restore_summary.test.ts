import fs from 'fs';
import path from 'path';
import { buildAccountRestoreSummary } from './account_delete_restore_summary';

/*
 * зачем (координатор 25.10, макет account-delete-variant-b §3): окно «Восстановить аккаунт?» показывает
 * «серия / фразы / урок N из 32». Цифры обязаны совпадать с приложением (app/exam_readiness.ts):
 * урок — первый из 32 с верными < 45, фразы — correct + replay_correct (≤ 50 на урок).
 */
const cells = (correct: number, wrong = 0) => [
  ...Array(correct).fill('correct'),
  ...Array(wrong).fill('wrong'),
];

describe('сводка восстановления аккаунта', () => {
  it('пустой прогресс — урок 1 из 32, ноль фраз и серии', () => {
    expect(buildAccountRestoreSummary(null)).toEqual({ streakDays: 0, phrasesLearned: 0, currentLesson: 1, lessonTotal: 32 });
    expect(buildAccountRestoreSummary({})).toEqual({ streakDays: 0, phrasesLearned: 0, currentLesson: 1, lessonTotal: 32 });
  });

  it('уроки строкой JSON (как пишет синхронизация) и массивом; порог 45; replay_correct считается', () => {
    const summary = buildAccountRestoreSummary({
      streak_count: '12',
      lesson1_progress: JSON.stringify(cells(50)),
      lesson2_progress: [...cells(44), 'replay_correct'],
      lesson3_progress: JSON.stringify(cells(20, 5)),
    });
    expect(summary).toEqual({ streakDays: 12, phrasesLearned: 50 + 45 + 20, currentLesson: 3, lessonTotal: 32 });
  });

  it('все 32 урока сданы — урок 32 из 32; больше 50 ячеек урока не считаем', () => {
    const progress: Record<string, unknown> = { streak_count: 3 };
    for (let i = 1; i <= 32; i += 1) progress[`lesson${i}_progress`] = cells(60);
    expect(buildAccountRestoreSummary(progress)).toEqual({ streakDays: 3, phrasesLearned: 32 * 50, currentLesson: 32, lessonTotal: 32 });
  });

  it('мусор не роняет сводку: битый JSON, отрицательная серия, чужие типы', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const summary = buildAccountRestoreSummary({ streak_count: -4, lesson1_progress: '{oops', lesson2_progress: 7 });
    expect(summary).toEqual({ streakDays: 0, phrasesLearned: 0, currentLesson: 1, lessonTotal: 32 });
    expect(warn).toHaveBeenCalledWith('[ACCOUNT-RESTORE-SUMMARY] lesson progress parse failed', expect.any(String));
    warn.mockRestore();
  });

  it('статус удаления читает сводку только когда вернуть можно и не падает без неё', () => {
    const src = fs.readFileSync(path.join(__dirname, 'account_delete_restore.ts'), 'utf8');
    expect(src).toContain("const summary = restorable ? await readAccountRestoreSummary(db, String(job.stableUid ?? '').trim()) : null;");
    expect(src).toContain('...(summary ? { summary } : {}),');
    expect(src).toContain("console.warn('[ACCOUNT-RESTORE-SUMMARY] skipped reason=read_failed'");
  });
});
