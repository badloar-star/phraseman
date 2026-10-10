import fs from 'fs';
import path from 'path';

describe('premium dialog companion prompt contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'functions', 'src', 'premium_dialog.ts'), 'utf8');

  it('keeps open conversation broad but inside the learning product frame', () => {
    // зачем (11.10): промпт сокращён и усилен запретом выдумывать статистику — рамка та же: объяснения, прогресс,
    // слабые места, следующий шаг; только обучение и безопасные бытовые темы, не универсальный помощник.
    expect(source).toContain('They may ask about explanations, examples, progress, weak spots, or the next step');
    expect(source).toContain('NEVER invent numbers, streaks, or past lessons');
    expect(source).toContain('Stay inside language learning, practice, progress and safe everyday topics');
    expect(source).toContain('Do not become a general-purpose assistant');
    expect(source).toContain('If the learner asks you something in {LEARNER_LANG_NAME}');
    expect(source).toContain('still ANSWER IN {TARGET_LANG_UPPER}');
    expect(source).not.toContain('If the learner writes in Russian, gently nudge back to English');
  });
});
