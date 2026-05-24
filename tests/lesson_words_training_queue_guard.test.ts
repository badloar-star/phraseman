import fs from 'fs';
import path from 'path';

describe('lesson words training queue guard', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_words.tsx'), 'utf8');

  it('normalizes training queues before delayed answer transitions', () => {
    expect(source).toContain('const sanitizeTrainingQueue');
    expect(source).toContain('const newQueue = sanitizeTrainingQueue(queue);');
    expect(source).not.toContain('const newQueue = [...queue];');
  });

  it('does not read word from queue entries without a training-card guard', () => {
    expect(source).toContain('newQueue.filter(c => isTrainingCard(c) && c.word.en !== current.word.en)');
    expect(source).not.toContain('newQueue.filter(c => c.word.en');
  });
});
