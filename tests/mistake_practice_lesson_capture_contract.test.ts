import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'lesson1.tsx'),
  'utf8',
);

describe('lesson mistake-practice capture wiring', () => {
  test('uses the new objective capture adapter for a wrong phrase answer', () => {
    expect(source).toContain("from './mistake_practice_capture'");
    expect(source).toContain('captureObjectiveAttempt({');
    expect(source).toContain("verdict: 'wrong'");
    expect(source).toContain("objective: true");
    expect(source).toContain("kind: 'word_order'");
  });

  test('does not keep the three old long-term mistake writers', () => {
    expect(source).not.toContain('recordMistake(');
    expect(source).not.toContain('logMistake(');
    expect(source).not.toContain('recordPhraseMistake(');
  });
});
