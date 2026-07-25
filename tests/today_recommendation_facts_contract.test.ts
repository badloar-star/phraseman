import fs from 'node:fs';
import path from 'node:path';

// зачем: правила рекомендаций были мертвы из-за захардкоженных нулей — этот тест
// ловит регрессию раньше жёстко (по исходнику), чем поведенческий тест успел бы
// заметить, что today.flashcards.* / today.daily_tasks.* больше никогда не срабатывают.
const screenPath = path.join(process.cwd(), 'components/today/TodayScreen.tsx');

function factsBlock(source: string): string {
  const factsStart = source.indexOf('facts: {');
  expect(factsStart).toBeGreaterThan(-1);
  const braceStart = source.indexOf('{', factsStart);
  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(braceStart, i + 1);
    }
  }
  throw new Error('facts block not closed');
}

describe('Today RecommendationFacts contract', () => {
  test('never hardcodes flashcardCount/dailyTasksRemaining/dailyTasksTotal to a literal zero', () => {
    const screen = fs.readFileSync(screenPath, 'utf8');
    const block = factsBlock(screen);

    expect(block).not.toMatch(/flashcardCount:\s*0\s*,/);
    expect(block).not.toMatch(/dailyTasksRemaining:\s*0\s*,/);
    expect(block).not.toMatch(/dailyTasksTotal:\s*0\s*,/);

    // положительный контроль: поля заполняются переменными, посчитанными из локальных источников
    // (dailyTasksRemaining/dailyTasksTotal — object shorthand, без литерала).
    expect(block).toMatch(/flashcardCount:\s*savedFlashcards\.length/);
    expect(block).toMatch(/\bdailyTasksRemaining\s*,/);
    expect(block).toMatch(/\bdailyTasksTotal\s*,/);
  });

  test('streak and courseComplete are also sourced locally, not hardcoded stubs', () => {
    const screen = fs.readFileSync(screenPath, 'utf8');
    const block = factsBlock(screen);

    expect(block).not.toMatch(/streak:\s*0\s*,/);
    expect(block).not.toMatch(/courseComplete:\s*false\s*,/);
    // object shorthand: `streak,` / `courseComplete,` — значит переменная, не литерал.
    expect(block).toMatch(/\bstreak\s*,/);
    expect(block).toMatch(/\bcourseComplete\s*,/);
  });

  test('sources the new facts from local caches only (no new Firestore reads)', () => {
    const screen = fs.readFileSync(screenPath, 'utf8');

    expect(screen).toContain("import('../../hooks/use-flashcards')");
    expect(screen).toContain("import('../../app/daily_tasks')");
    expect(screen).toContain("import('../../app/statsCache')");
    expect(screen).toContain("import('../../app/lesson_grammar_map')");
    expect(screen).not.toMatch(/from ['"]\.\.\/\.\.\/app\/compass\//);
  });
});
