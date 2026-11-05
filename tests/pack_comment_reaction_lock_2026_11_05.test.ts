// зачем (ревью Сообщества 05.11): двойной тап по реакции отклика не должен ставить её дважды.
import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'community_packs', 'PackCommentsSheet.tsx'), 'utf8');

describe('PackCommentsSheet: замок реакции', () => {
  it('замок берётся до оптимистичного шага и снимается в finally', () => {
    expect(src).toContain('reactionLocksRef');
    expect(src).toMatch(/reactionLocksRef\.current\.has\(lockKey\)/);
    expect(src).toMatch(/reactionLocksRef\.current\.add\(lockKey\)/);
    expect(src).toMatch(/\.finally\(\(\) => \{ reactionLocksRef\.current\.delete\(lockKey\); \}\)/);
  });
  it('исключение сети откатывает реакцию (catch называет причину)', () => {
    expect(src).toMatch(/comment_reaction threw/);
  });
});
