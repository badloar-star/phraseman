import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function loadCompletionHelpers() {
  const source = read('app/lesson_complete.tsx');
  const start = source.indexOf('const MAX_LESSON_MULTIPLIER_PARAM_LENGTH');
  const end = source.indexOf('type LessonSoftUpsellCopy', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const output = ts.transpileModule(source.slice(start, end), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const helperExports: Record<string, unknown> = {};
  new Function('exports', output)(helperExports);
  return helperExports as {
    parseConfirmedLessonMultipliers: (value: unknown) => { multiplier: number; xpDelta: number }[];
    deriveConfirmedLessonResults: (input: {
      finalXp: number;
      baseXp: number;
      multipliers: { multiplier: number; xpDelta: number }[];
    }) => { xp: number; rewards?: { multipliers: { label: string; xpDelta: number }[] } };
  };
}

describe('confirmed lesson multiplier breakdown', () => {
  test('parses only bounded positive confirmed multiplier deltas and consolidates labels', () => {
    const { parseConfirmedLessonMultipliers } = loadCompletionHelpers();

    expect(parseConfirmedLessonMultipliers(JSON.stringify([
      [2, 10],
      [2, 5],
      [1.5, 4],
      [1, 99],
      [3, 0],
      [Number.POSITIVE_INFINITY, 8],
      ['bad', 7],
    ]))).toEqual([
      { multiplier: 1.5, xpDelta: 4 },
      { multiplier: 2, xpDelta: 15 },
    ]);
    expect(parseConfirmedLessonMultipliers('{bad json')).toEqual([]);
    expect(parseConfirmedLessonMultipliers('x'.repeat(513))).toEqual([]);
  });

  test('uses confirmed base plus deltas only when they exactly reconcile to final XP', () => {
    const { deriveConfirmedLessonResults } = loadCompletionHelpers();
    const multipliers = [
      { multiplier: 2, xpDelta: 15 },
      { multiplier: 1.5, xpDelta: 4 },
    ];

    expect(deriveConfirmedLessonResults({ finalXp: 39, baseXp: 20, multipliers })).toEqual({
      xp: 20,
      rewards: {
        multipliers: [
          { label: 'XP ×1.5', xpDelta: 4 },
          { label: 'XP ×2', xpDelta: 15 },
        ],
      },
    });
    expect(deriveConfirmedLessonResults({ finalXp: 40, baseXp: 20, multipliers })).toEqual({ xp: 40 });
    expect(deriveConfirmedLessonResults({ finalXp: 20, baseXp: 20, multipliers: [] })).toEqual({ xp: 20 });
  });

  test('passes bounded confirmed breakdown params on normal and fallback completion routes', () => {
    const lesson = read('app/lesson1.tsx');
    expect(lesson).toContain('.then(({ finalDelta, multiplier }) => {');
    expect(lesson.match(/earnedBaseXp:/g)).toHaveLength(2);
    expect(lesson.match(/earnedMultipliers:/g)).toHaveLength(2);
    expect(lesson).toContain('MAX_LESSON_MULTIPLIER_PARAM_LENGTH');
    expect(lesson).toContain('await Promise.all(pendingLessonXpAwardsRef.current)');
  });

  test('feeds both lesson completion sequences the same fail-closed derived props', () => {
    const completion = read('app/lesson_complete.tsx');
    expect(completion.match(/xp={lessonResults\.xp}/g)).toHaveLength(2);
    expect(completion.match(/rewards={lessonResults\.rewards}/g)).toHaveLength(2);
  });
});

