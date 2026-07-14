import fs from 'fs';
import path from 'path';

describe('weekly review client contract', () => {
  const clientSource = fs.readFileSync(path.join(__dirname, '../app/weekly_review_client.ts'), 'utf8');
  const cardSource = fs.readFileSync(path.join(__dirname, '../app/WeeklyReviewCard.tsx'), 'utf8');
  const serverSource = fs.readFileSync(path.join(__dirname, '../functions/src/weekly_review.ts'), 'utf8');

  it('Free never calls AI and Plus uses the server-owned rolling 24h window', () => {
    expect(clientSource).toContain("if (!options.isPremium) return { status: 'free_eligible', snapshot }");
    expect(clientSource).toContain("'weeklyReviewGenerate'");
    expect(serverSource).toContain('const PLUS_WINDOW_MS = DAY_MS');
    expect(serverSource).toContain('weekly_review_plus_required');
  });

  it('renders the full Plus review without a disclosure control', () => {
    expect(cardSource).toContain('<PlusReview');
    expect(cardSource).toContain('review.patterns.map');
    expect(cardSource).toContain('review.plan.map');
    expect(cardSource).not.toContain('const [expanded, setExpanded] = useState(false)');
    expect(cardSource).not.toContain('accessibilityState={{ expanded }}');
  });

  it('does not show a next-review countdown footer', () => {
    expect(cardSource).not.toContain('nextReviewCopy(');
  });

  it('does not truncate AI plan actions', () => {
    expect(cardSource).toContain('{step.expectedOutcome}');
    expect(cardSource).not.toContain('numberOfLines={1}>{step.expectedOutcome}');
    expect(cardSource).toContain('planText: { flex: 1');
    expect(cardSource).toContain('minHeight: 52');
  });

  it('brands the weekly guidance as Compass instead of an error analysis', () => {
    expect(cardSource).toContain("import { weeklyCompassIconSource } from '../constants/weeklyCompassIcons'");
    expect(cardSource).not.toContain('Animated.loop(');
    expect(cardSource).not.toContain('name="compass-outline"');
    expect(cardSource).not.toContain('AI REHBER');
    expect(cardSource).toContain('copy.title');
    expect(cardSource).toContain('copy.updating');
    expect(cardSource).not.toContain('copy.aiBadge');
  });
});
