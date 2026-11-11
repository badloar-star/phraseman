import { readFileSync } from 'fs';
import { join } from 'path';

describe('level exam access check deadline', () => {
  test('fails closed instead of showing the loading state forever', () => {
    const source = readFileSync(join(process.cwd(), 'app', 'level_exam.tsx'), 'utf8');
    const accessEffect = source.slice(
      source.indexOf("setAccessState('checking')"),
      source.indexOf('const silentLeaveFrench = '),
    );

    expect(accessEffect).toContain('LEVEL_EXAM_ACCESS_TIMEOUT_MS');
    expect(accessEffect).toContain('level_exam_access_timeout');
    expect(accessEffect).toContain('Promise.race');
    expect(accessEffect).toContain("setAccessState('blocked')");
  });

  // зачем (найдено на эмуляторе 11.11.2026): при неподтверждённом статусе Plus проверка выходила немым return — гонка с
  // пределом считалась выигранной, кнопка «Начать» оставалась серой навсегда. Ветка обязана ждать, чтобы решал предел.
  test('an unconfirmed Plus status waits for the deadline instead of returning silently', () => {
    const source = readFileSync(join(process.cwd(), 'app', 'level_exam.tsx'), 'utf8');
    const unresolved = source.slice(source.indexOf('if (!accessResolved) {'), source.indexOf('const examLevel = lvl as CourseLevel;'));
    expect(unresolved).toContain('void reloadPremiumAccess();');
    expect(unresolved).toContain('await new Promise<never>(() => undefined);');
    // ищем оператор выхода в коде, а не слово в комментарии
    const code = unresolved.split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
    expect(code).not.toMatch(/\breturn\b/);
    expect(unresolved).toContain('[LEVEL-EXAM-ACCESS] plus_unresolved');
    expect(source).toContain('[LEVEL-EXAM-ACCESS] check_failed');
  });

  test('does not disguise a blocked access result as continued loading', () => {
    const source = readFileSync(
      join(process.cwd(), 'components', 'level-exam', 'LevelExamV2.tsx'),
      'utf8',
    );

    // зачем (владелец 18.10: «экранов-ошибок нигде»): «не открылся» — тихий уход, замок Plus/уровня — своя ветка.
    expect(source).toContain("const silentLeave = identityUnavailable || contentUnavailable || (accessState === 'blocked' && accessBlockKind === 'error');");
    expect(source).toContain("if (accessState === 'blocked') {");
    expect(source).toContain("accessState === 'checking' || phase === 'loading' || phase === 'intro'");
    expect(source).not.toContain('Готовим экзамен');
  });
});
