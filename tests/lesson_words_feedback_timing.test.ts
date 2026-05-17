import fs from 'fs';
import path from 'path';

describe('lesson_words answer feedback timing', () => {
  it('keeps wrong-answer feedback visible long enough to read', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_words.tsx'), 'utf8');
    const match = source.match(/ANSWER_FEEDBACK_MS\s*=\s*\{\s*correct:\s*(\d+),\s*wrong:\s*(\d+)\s*\}/);
    expect(match).not.toBeNull();
    const correctMs = Number(match![1]);
    const wrongMs = Number(match![2]);

    expect(correctMs).toBeLessThanOrEqual(900);
    expect(wrongMs).toBeGreaterThanOrEqual(1500);
    expect(wrongMs).toBeGreaterThan(correctMs);
  });
});
