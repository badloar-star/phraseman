import { readFileSync } from 'fs';
import { join } from 'path';

describe('level exam access check deadline', () => {
  test('fails closed instead of showing the loading state forever', () => {
    const source = readFileSync(join(process.cwd(), 'app', 'level_exam.tsx'), 'utf8');
    const accessEffect = source.slice(
      source.indexOf("setAccessState('checking')"),
      source.indexOf('const levelLabel = LEVEL_LABELS[lvl]'),
    );

    expect(accessEffect).toContain('LEVEL_EXAM_ACCESS_TIMEOUT_MS');
    expect(accessEffect).toContain('level_exam_access_timeout');
    expect(accessEffect).toContain('Promise.race');
    expect(accessEffect).toContain("setAccessState('blocked')");
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
