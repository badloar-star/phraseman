import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const hook = fs.readFileSync(path.join(root, 'hooks', 'useAccordionFaqStyle.ts'), 'utf8');
const icon = fs.readFileSync(path.join(root, 'components', 'AccordionChevronIonicons.tsx'), 'utf8');

describe('accordion motion contract', () => {
  test('respects reduced motion and cleans finite animations', () => {
    expect(hook).toContain('useReduceMotion');
    expect(hook).toContain('chevronAnim.stopAnimation()');
    expect(hook).toContain('duration: reduceMotion ? 0 : MOTION_DURATION.normal');
    expect(hook).not.toMatch(/Animated\.loop|setInterval/);
  });

  test('decorative chevron does not duplicate screen-reader meaning', () => {
    expect(icon).toContain('accessibilityElementsHidden');
    expect(icon).toContain('importantForAccessibility="no-hide-descendants"');
  });

  test('the weekly review is full content rather than another accordion', () => {
    const owner = fs.readFileSync(path.join(root, 'app', 'WeeklyReviewCard.tsx'), 'utf8');
    expect(owner).not.toContain('accessibilityState={{ expanded }}');
    expect(owner).not.toContain("name={expanded ? 'chevron-up' : 'chevron-down'}");
    expect(owner).toContain('review.patterns.map');
  });
});
