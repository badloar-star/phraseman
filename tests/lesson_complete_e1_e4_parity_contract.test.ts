// зачем (координатор 13.10, learn.html E1–E4 + D121): итог урока — звёзды по проценту верных, счёт из маршрута урока,
// «Добить: Ещё учу (N)» и «Повторить ошибки» запускают повтор ошибок прохода в «Моих ошибках».
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const complete = read('app/lesson_complete.tsx');
const lesson = read('app/lesson1.tsx');

describe('итог урока: паритет с learn.html E1–E4', () => {
  it('звёзды считаются по проценту (D121), а не по медали', () => {
    expect(complete).toContain('lessonStarCountFromPercent(lessonScoreToPercent(lessonScore))');
    expect(complete).not.toContain('RESULTS_STARS_BY_TIER');
    expect(complete).toContain('stars={isComboCompletion ? null : resultStars}');
  });

  it('экран урока кладёт счёт в маршрут в обоих переходах, а итог читает его запасным источником', () => {
    expect(lesson.match(/resultCorrect: String\(correct\)/g)).toHaveLength(2);
    expect(lesson.match(/resultTotal: String\(effectiveTotal\)/g)).toHaveLength(2);
    expect(complete).toContain('parseRouteLessonResult(params.resultCorrect, params.resultTotal)');
    expect(complete).toContain('const fallbackCounts = devDemo ?? routeResult;');
  });

  it('id записанной ошибки собирается в уроке, «Добить» и «Повторить ошибки» запускают их повтор', () => {
    expect(lesson).toContain("if (captured.kind === 'captured') collectLessonRunMistakeId(lessonId, captured.mistakeId);");
    // Ревизор 2.76: «Добить» несёт чек дневной квоты из гейта (tests/mistake_practice_entry_quota_gate_guard)
    expect(complete).toContain("params: { mistakeIds: ids.join(','), length: 'all', ...receipt }");
    expect(complete).toContain('onRepeatErrors={runMistakeIds.length > 0 ? finishMistakes : ('); // R69/Макеты: при ошибках без id — хаб «Мои ошибки» (openMistakesHub)
    expect(complete).toContain('runMistakeIds.length > 0 ? finishMistakes : handleRepeatLesson');
    expect(complete).toContain('Добить: Ещё учу (${n})');
  });

  it('ошибка последнего вопроса не теряется: переход ждёт записи ошибок до 300 мс, новый проход сбрасывает сборщик (ревью Авторизации 13.10)', () => {
    expect(lesson).toContain('lessonMistakeWritesRef.current.push(captureWrite);');
    expect(lesson).toContain('await Promise.race([Promise.allSettled(pending), new Promise((resolve) => setTimeout(resolve, 300))]);');
    expect(lesson).toContain('beginLessonRunErrors(lessonId);');
  });

  it('1★ остаётся «Повторить урок» + «К списку уроков», Plus — «Открыть Plus» + «Остаться на бесплатном»', () => {
    expect(complete).toContain('(completionRequiresPremium || resultStars === 1) ? goBackFromComplete');
    expect(complete).toContain("ru: 'Остаться на бесплатном'");
    expect(complete).toContain("ru: 'К списку уроков'");
  });
});
