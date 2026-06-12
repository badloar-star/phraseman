import fs from 'fs';
import path from 'path';

describe('ai dialog session flow contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_dialog_session.tsx'), 'utf8');

  it('lets the learner finish manually instead of auto-ending at 8 replies', () => {
    expect(source).toContain('const RECOMMENDED_EXCHANGES = 8');
    expect(source).toContain('finishDialog');
    expect(source).toContain('Завершить');
    expect(source).not.toContain('userExchanges >= MAX_EXCHANGES');
    expect(source).not.toContain('/ {MAX_EXCHANGES}');
  });

  it('shows a Russian next-step recommendation instead of tappable canned answers', () => {
    expect(source).toContain('scenario.nextStepHintRu');
    expect(source).toContain('Что сделать дальше');
    expect(source).not.toContain('scenario.suggestedReplies.map');
    expect(source).not.toContain('Можно тапнуть готовый ответ');
  });
});
