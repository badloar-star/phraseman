import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const sequence = fs.readFileSync(path.join(root, 'components', 'feedback', 'ResultsSequence.tsx'), 'utf8');
const view = fs.readFileSync(path.join(root, 'components', 'feedback', 'ProgressCompletionView.tsx'), 'utf8');

describe('visible result presentation', () => {
  test('supports proportional finite celebration and reduced motion', () => {
    expect(sequence).toContain("export type ResultsIntensity = 'quiet' | 'milestone' | 'major'");
    expect(sequence).toContain('useReduceMotion');
    expect(sequence).toContain('count={motionPlan.confettiCount}');
    expect(sequence).not.toContain('setInterval');
    expect(sequence).not.toContain('XP_FRAME_MS');
    expect(sequence).toContain('const xpProgress = useSharedValue(0)');
    expect(sequence).toContain('useAnimatedProps');
    expect(sequence).toContain('AnimatedTextInput');
    expect(sequence).toContain('setShowConfetti(false)');
    expect(sequence).toMatch(/\}, \[\s*badgeSV,[\s\S]*motionPlan,[\s\S]*xp,[\s\S]*\]\);/);
  });

  test('renders all three proof lines from a ready model', () => {
    expect(view).toContain('model.fact');
    expect(view).toContain('model.accumulated');
    expect(view).toContain('model.nextStep');
    expect(view).toContain('intensity={model.level}');
  });
});
