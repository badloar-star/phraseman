import { readFileSync } from 'fs';
import { join } from 'path';

describe('problem coach practice thought contract', () => {
  const source = readFileSync(join(__dirname, '..', 'app', 'problem_coach.tsx'), 'utf8');

  it('shows the thought only until the first answer in the current practice', () => {
    expect(source).toContain('const [practiceThoughtSeen, setPracticeThoughtSeen] = useState(false)');
    expect(source).toContain('setPracticeThoughtSeen(true);');
    expect(source).toContain('const shouldShowPracticeThought = !practiceThoughtSeen && !hasAnswered;');
  });

  it('does not reset the thought on every next question', () => {
    const handleNextStart = source.indexOf('const handleNext = () => {');
    const handleNextEnd = source.indexOf('const handleStartConsolidation', handleNextStart);
    const handleNext = source.slice(handleNextStart, handleNextEnd);

    expect(handleNext).not.toContain('setPracticeThoughtSeen(false)');
  });
});
