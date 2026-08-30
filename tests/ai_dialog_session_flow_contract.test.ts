import fs from 'fs';
import path from 'path';

describe('ai dialog session flow contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_dialog_session.tsx'), 'utf8');

  it('keeps manual finish and only uses the 8-turn fallback when game JSON is unavailable', () => {
    expect(source).toContain('const RECOMMENDED_EXCHANGES = 8');
    expect(source).toContain('finishDialog');
    expect(source).toContain('Завершить');
    expect(source).toContain('gameModeAvailable === false');
    expect(source).toContain('exchangeIndex >= RECOMMENDED_EXCHANGES');
    expect(source).not.toContain('/ {MAX_EXCHANGES}');
  });

  it('sends the current scenario state with every turn', () => {
    expect(source).toContain('gameState: {');
    expect(source).toContain('exchangeIndex');
    expect(source).toContain('objectivesMet: Array.from(objectivesMet)');
    expect(source).toContain('noProgressTurns: stuckTurnsRef.current');
  });

  it('shows a Russian next-step recommendation instead of tappable canned answers', () => {
    // Подсказка идёт через локализованный помощник (ru/uk/es), не из сырого
    // scenario.nextStepHintRu — иначе не-русские интерфейсы видели бы русский текст.
    expect(source).toContain('dialogScenarioNextStepHint(scenario, lang)');
    expect(source).toContain('Что сделать дальше');
    expect(source).not.toContain('scenario.suggestedReplies.map');
    expect(source).not.toContain('Можно тапнуть готовый ответ');
  });
});
