import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'trainer_phrases_session.tsx'), 'utf8');

describe('phrase practice correct-result controls', () => {
  it('does not render the check container or the Correct label after a correct answer', () => {
    expect(source).toContain("{feedback !== 'correct' && (");
    expect(source).not.toContain("ru: 'Верно!'");
    expect(source).toContain("feedback === 'wrong'");
  });

  it('does not render the redundant Repeat again action', () => {
    expect(source).not.toContain("ru: 'Повторить ещё раз'");
    expect(source).not.toContain('const retry = () => {');
  });

  it('keeps a dedicated gap between the word tiles and the spoken card', () => {
    expect(source).toContain('<SpeakingInlineSlot style={{ marginTop: 18 }}>');
  });
});
