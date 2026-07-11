import fs from 'fs';
import path from 'path';

describe('premium dialog companion prompt contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'functions', 'src', 'premium_dialog.ts'), 'utf8');

  it('keeps open conversation broad but inside the learning product frame', () => {
    expect(source).toContain('They may ask for explanations, examples, progress, weak spots, or the next useful step');
    expect(source).toContain('Stay inside language learning, communication practice, learner progress, and safe everyday topics');
    expect(source).toContain('If the learner asks you something in {LEARNER_LANG_NAME}');
    expect(source).toContain('still ANSWER IN {TARGET_LANG_UPPER}');
    expect(source).not.toContain('If the learner writes in Russian, gently nudge back to English');
  });
});
