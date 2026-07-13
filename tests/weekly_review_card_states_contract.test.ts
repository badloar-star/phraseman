import fs from 'fs';
import path from 'path';

const card = fs.readFileSync(path.join(__dirname, '../app/WeeklyReviewCard.tsx'), 'utf8');
const copy = fs.readFileSync(path.join(__dirname, '../app/weekly_review_copy.ts'), 'utf8');

describe('WeeklyReviewCard V2 states', () => {
  it('always reserves geometry and renders the neutral snapshot strip', () => {
    expect(card).toContain('<LoadingCard');
    expect(card).toContain('<SnapshotStrip snapshot={state.snapshot}');
    expect(card).toContain('minHeight: 270');
    expect(card).toContain('progressCurrent');
    expect(card).toContain('sourceCoverage.ready');
  });

  it('shows Free value without passing any review text into the Free offer', () => {
    expect(card).toContain('!isPremium ? (');
    expect(card).toContain('<FreeOffer copy={copy}');
    expect(card).not.toContain('<FreeOffer review=');
    expect(card).toContain("context: 'weekly_review'");
    expect(copy).toContain('закономерности в практике');
    expect(copy).toContain('пошаговый план');
    expect(copy).toContain('точные упражнения из твоей практики');
  });

  it('renders every structured Plus section and routes only verified actions', () => {
    expect(card).toContain('review.headline');
    expect(card).toContain('review.summary');
    expect(card).toContain('review.patterns.map');
    expect(card).toContain('review.improvements.map');
    expect(card).toContain('review.priorities.map');
    expect(card).toContain('review.plan.map');
    expect(card).toContain('routeForWeeklyReviewAction(actionKind, recommendationId)');
    expect(card).toContain("actionKind === 'repeat_due_words' && recommendationId === 'due:words'");
    expect(card).toContain("actionKind === 'open_personal_training' && recommendationId.startsWith('diagnosis:')");
  });

  it('uses dark foreground on lime and accessible 44px+ controls', () => {
    expect(card).toContain("foreground={t.correctText ?? '#07110A'}");
    expect(card).toContain('color={foreground}');
    expect(card).toContain('accessibilityRole="button"');
    expect(card).toContain('accessibilityLabel=');
    expect(card).toContain('accessibilityState={{ expanded }}');
    expect(card).toContain('minHeight: 50');
    expect(card).toContain('minHeight: 46');
  });

  it('uses one-shot transform/opacity animation with focus and reduced-motion gates', () => {
    expect(card).toContain('if (!active || reduceMotion || state?.status !== \'fresh\')');
    expect(card).toContain('Animated.timing(sweep');
    expect(card).toContain('duration: 260');
    expect(card).not.toContain('Animated.loop');
    expect(card).not.toContain('withRepeat(');
    expect(card).toContain('transform: [{ translateX: sweepX }');
  });
});
