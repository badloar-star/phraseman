import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'personal_plan_exercise.tsx'),
  'utf8',
);

describe('personal plan mistake ELI5 wiring', () => {
  it('uses the shared simpler-explanation flow on every inline mistake card', () => {
    expect(source).toContain("import MistakeEli5Modal from '../components/MistakeEli5Modal'");
    expect(source.match(/onOpenSimple=\{mistakeExplain\.eli5\.onOpen\}/g)).toHaveLength(2);
    expect(source).toContain('<MistakeEli5Modal');
    expect(source).toContain('visible={mistakeExplain.eli5.open}');
    expect(source).toContain('state={mistakeExplain.eli5.state}');
    expect(source).toContain('onRetry={mistakeExplain.eli5.onRetry}');
  });
});
