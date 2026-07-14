import fs from 'fs';
import path from 'path';

const card = fs.readFileSync(path.join(__dirname, '../app/WeeklyReviewCard.tsx'), 'utf8');
const copy = fs.readFileSync(path.join(__dirname, '../app/weekly_review_copy.ts'), 'utf8');

describe('WeeklyReviewCard V2 states', () => {
  it('keeps stable Plus loading geometry without delaying the Free teaser', () => {
    expect(card).toContain('<LoadingCard');
    expect(card).toContain('if (!isPremium) {');
    expect(card.indexOf('if (!isPremium) {')).toBeLessThan(card.indexOf('if (!state) return <LoadingCard'));
  });

  it('renders Free as one paywall-opening value surface without AI controls or metrics', () => {
    expect(card).toContain('<FreeReviewTeaser');
    expect(card).toContain('onPress={onPaywall}');
    expect(card).toContain('accessibilityRole="button"');
    expect(card).toContain('minHeight: 96');
    expect(card).toContain("context: 'weekly_review'");
    expect(copy).toContain('Персональный разбор практики');
    expect(copy).toContain('Покажет, какие ошибки повторяются и что повторить первым.');
    expect(card).not.toContain('copy.aiBadge');
    expect(card).not.toContain('copy.values');
    expect(card).not.toContain('copy.cta');
  });

  it('renders every structured Plus section immediately and routes only verified actions', () => {
    expect(card).toContain('review.headline');
    expect(card).toContain('review.summary');
    expect(card).toContain('review.patterns.map');
    expect(card).toContain('review.improvements.map');
    expect(card).toContain('review.priorities.map');
    expect(card).toContain('review.plan.map');
    expect(card).toContain('routeForWeeklyReviewAction(actionKind, recommendationId)');
    expect(card).toContain("actionKind === 'repeat_due_words' && recommendationId === 'due:words'");
    expect(card).toContain("actionKind === 'open_personal_training' && recommendationId.startsWith('diagnosis:')");
    expect(card).not.toContain('accessibilityState={{ expanded }}');
    expect(card).not.toContain('setExpanded((value) => !value)');
  });

  it('uses dark foreground on lime and accessible touch geometry', () => {
    expect(card).toContain("accentText={t.correctText ?? '#07110A'}");
    expect(card).toContain('color={accentText}');
    expect(card).toContain('accessibilityRole="button"');
    expect(card).toContain('accessibilityLabel=');
    expect(card).toContain('minHeight: 96');
    expect(card).toContain('minHeight: 52');
  });

  it('does not add a decorative sweep or a square embedded surface', () => {
    expect(card).not.toContain('Animated.timing(sweep');
    expect(card).not.toContain('Animated.loop');
    expect(card).not.toContain('withRepeat(');
    expect(card).not.toContain('radius={embedded ? 0 : 22}');
    expect(card).not.toContain('<TonalSurface');
    expect(card).toContain('if (embedded)');
  });
});
