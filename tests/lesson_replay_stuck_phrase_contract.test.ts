import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

/**
 * Регрессия «не можу закінчити раунд» (репорты 2026-08-02, lesson_3_phrase_40).
 *
 * Экран возвращал юзера на одну и ту же фразу после каждого remount (модалка энергии,
 * сворачивание приложения). Два независимых звена держали «залипший повтор»:
 *
 *  1. checkAnswer сохранял override из overridePhraseCellRef, который синхронизируется
 *     с состоянием через useEffect — внутри синхронного checkAnswer он ещё хранит
 *     «мы на повторе ячейки N». В сторадж уходило override=N при уже пустой очереди.
 *  2. Сторож восстановления чистил override только если ячейка НЕ помечена 'wrong'.
 *     После провала повтора ячейка остаётся красной навсегда и из очереди уже удалена,
 *     поэтому битая пара переживала любой перезапуск экрана.
 */
describe('lesson replay stuck-phrase contract', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson1.tsx'), 'utf8');

  it('clears the replay override in storage once the replay answer is graded', () => {
    // Ответ на повтор ЗАВЕРШАЕТ повтор — сохраняться должен явный null, а не значение
    // из ref, отстающего от состояния на один рендер.
    expect(source).toContain('persistErrorReplayToStorage(null);');

    const wrongMark = source.indexOf("np[progressCell] = 'wrong';");
    expect(wrongMark).toBeGreaterThanOrEqual(0);
    const verdictMark = source.indexOf('fk.verdict({ correct: false })', wrongMark);
    expect(verdictMark).toBeGreaterThan(wrongMark);
    const gradeBlock = source.slice(wrongMark, verdictMark);

    // Внутри разбора ответа не должно остаться вызова без аргумента: он читает
    // overridePhraseCellRef и возвращает залипание.
    expect(gradeBlock).not.toMatch(/persistErrorReplayToStorage\(\s*\)/);
  });

  it('drops a restored override that is no longer queued for replay', () => {
    const guardStart = source.indexOf('if (restoredOverride !== null');
    expect(guardStart).toBeGreaterThanOrEqual(0);
    const guardEnd = source.indexOf('restoredOverrideForUi = restoredOverride;', guardStart);
    expect(guardEnd).toBeGreaterThan(guardStart);
    const guardBlock = source.slice(guardStart, guardEnd);

    // Единственный честный признак незавершённого повтора — ячейка всё ещё в очереди.
    expect(guardBlock).toContain('!restoredErrQueue.includes(restoredOverride)');
    expect(guardBlock).toContain('restoredOverride = null;');

    // Признак 'wrong' держал override после ПРОВАЛЕННОГО повтора — он больше не участвует.
    expect(guardBlock).not.toContain("stCell !== 'wrong'");
  });

  it('keeps the deliberate cycle-end replay priming intact', () => {
    // Граница урока — единственное место, где override сохраняется намеренно
    // (иначе пропущенная фраза не всплывёт перед экраном поздравления).
    expect(source).toContain('persistErrorReplayToStorage(overridePhraseCell);');
    expect(source).toContain('persistErrorReplayToStorage(replayCell);');
  });
});
