import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (relative: string): string =>
  fs.readFileSync(path.join(ROOT, relative), 'utf8').replace(/\r\n/g, '\n');

const words = read('app/trainer_words_session.tsx');
const phrases = read('app/trainer_phrases_session.tsx');

describe('trainer and SRS daily-task queue separation', () => {
  it('word trainer advances only its own trainer_words challenge', () => {
    expect(words).toContain("updates.push({ type: 'trainer_words', increment: 1 });");
    expect(words).not.toContain("type: 'recall_session'");
    expect(words).not.toContain("type: 'recall_answers'");
    expect(words).not.toContain("type: 'recall_perfect'");
    expect(words).not.toContain('dailySessionTracked');
  });

  it('phrase trainer advances only phrase/arena trainer challenges', () => {
    expect(phrases).toContain("card.item.queue === 'arena' ? 'trainer_arena' : 'trainer_phrases'");
    expect(phrases).not.toContain("type: 'recall_session'");
    expect(phrases).not.toContain("type: 'recall_answers'");
    expect(phrases).not.toContain("type: 'recall_perfect'");
    expect(phrases).not.toContain('dailySessionTracked');
  });

  it('keeps energy-spend challenge accounting in both trainer modes', () => {
    expect(words).toContain("type: 'energy_spend'");
    expect(phrases).toContain("type: 'energy_spend'");
  });
});
