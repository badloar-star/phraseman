import fs from 'fs';
import path from 'path';

describe('quizzes speaking button contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/(tabs)/quizzes.tsx'), 'utf8');

  it('does not render the oral speaking button after quiz answers', () => {
    expect(source).not.toContain("import SpeakingButton");
    expect(source).not.toContain('<SpeakingButton');
  });
});
