import fs from 'node:fs';
import path from 'node:path';

describe('irregular verbs selected-option audio', () => {
  it('speaks the option the learner tapped so contrasting forms can be heard', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'app', 'lesson_irregular_verbs.tsx'),
      'utf8',
    );
    const start = source.indexOf('const handleTap = useCallback');
    const end = source.indexOf('const handleRecallSubmit = useCallback', start);
    const handler = source.slice(start, end);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(handler).toContain("speakAudio(word, speechRate, { language: 'en-US' })");
    expect(handler).not.toContain("speakAudio(correct, speechRate, { language: 'en-US' })");
  });
});
