import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string): string =>
  fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('mistake practice preservation boundary', () => {
  test('lesson keeps its immediate local replay queue with a two-answer delay', () => {
    const source = read('app/lesson1.tsx');

    expect(source).toContain('const ERROR_REPLAY_DELAY_ANSWERS = 2;');
    expect(source).toContain('const errorQueueRef          = useRef<number[]>([])');
    expect(source).toContain('const questionsSinceErrorRef = useRef(0)');
    expect(source).toContain('errorQueueRef.current.push(progressCell);');
    expect(source).toContain(
      'questionsSinceErrorRef.current >= ERROR_REPLAY_DELAY_ANSWERS',
    );
  });

  test('lesson drains pending replay before opening completion', () => {
    const source = read('app/lesson1.tsx');
    const replayStart = source.indexOf(
      'const pendingCycleEndReplay = nextCell === 0',
    );
    const completionStart = source.indexOf(
      'if (nextCell === 0 && !pendingCycleEndReplay)',
      replayStart,
    );

    expect(replayStart).toBeGreaterThan(-1);
    expect(completionStart).toBeGreaterThan(replayStart);
    expect(source.slice(replayStart, completionStart)).toContain(
      'errorQueueRef.current.length > 0',
    );
  });

  test('wrong lesson answers remain visibly wrong and reveal ordinary feedback', () => {
    const source = read('app/lesson1.tsx');
    const answerStart = source.indexOf('// КЛЮЧЕВАЯ ЛОГИКА:');
    const resultStart = source.indexOf(
      '// Сразу показываем результат',
      answerStart,
    );
    const answerBlock = source.slice(answerStart, resultStart + 500);

    expect(answerBlock).toContain("np[progressCell] = 'wrong';");
    expect(answerBlock).toContain('setWasWrong(!isRight);');
    expect(answerBlock).toContain("setStatus('result');");
    expect(source).toContain('<AiMistakeCard');
    expect(source).toContain('explanation={aiMistakeText}');
  });

  test('local replay is not gated by Plus and does not depend on the new scheduler', () => {
    const source = read('app/lesson1.tsx');
    const queueStart = source.indexOf(
      'const errorQueueRef          = useRef<number[]>([])',
    );
    const queueEnd = source.indexOf(
      'const [replaySolvedCorrectly',
      queueStart,
    );
    const nextStart = source.indexOf('const goNext = useCallback');
    const nextEnd = source.indexOf('// BUGFIX:', nextStart);
    const replayBlock = [
      source.slice(queueStart, queueEnd),
      source.slice(nextStart, nextEnd),
    ].join('\n');

    expect(replayBlock).not.toMatch(/premium|plus|entitlement/i);
    expect(replayBlock).not.toContain('mistake-practice/scheduler');
    expect(replayBlock).not.toContain('mistake_practice_scheduler');
  });

  test('Learning V2 keeps required-session ownership separate from an optional error loop', () => {
    const source = read('app/learning-v2/lesson/[id].tsx');

    expect(source).toContain('createRequiredSessionLocalCommitCoordinator');
    expect(source).toContain('learningV2CourseSessionRoleV1');
    expect(source).toContain('kind: "locked_session" | "checkpoint"');
    expect(source).toContain('function buildLessonRoadItems(');
  });
});
