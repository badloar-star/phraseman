import fs from 'node:fs';
import path from 'node:path';

import { resolveLessonEntitlementReadiness } from '../app/monetization_policy';

describe('Classic lesson entitlement readiness', () => {
  const decide = (input: Parameters<typeof resolveLessonEntitlementReadiness>[0]) => (
    resolveLessonEntitlementReadiness(input)
  );

  it.each([1, 2, 3])('keeps Free lesson %i out of entitlement pending', (lessonId) => {
    expect(decide({ lessonId, isPremium: false, accessResolved: false })).toBe('ready');
  });

  it('does not grant or paywall a paid lesson while entitlement is unresolved', () => {
    expect(decide({ lessonId: 4, isPremium: false, accessResolved: false })).toBe('pending');
  });

  it('does not grant a paid lesson from an unresolved positive boot snapshot', () => {
    expect(decide({ lessonId: 32, isPremium: true, accessResolved: false })).toBe('pending');
  });

  it('opens the paywall only after Free is confirmed', () => {
    expect(decide({ lessonId: 4, isPremium: false, accessResolved: true })).toBe('premium_required');
  });

  it.each([
    { purchased: true },
    { noLimits: true },
    { devMode: true },
    { legacyFreeLessonCap: 8 },
  ])('keeps an explicit lesson bypass ready while entitlement is unresolved: %o', (bypass) => {
    expect(decide({
      lessonId: 4,
      isPremium: false,
      accessResolved: false,
      ...bypass,
    })).toBe('ready');
  });

  it('wires pending ahead of navigation/paywall and renders a neutral busy card', () => {
    const lessons = fs.readFileSync(
      path.join(process.cwd(), 'app', '(tabs)', 'lessons.tsx'),
      'utf8',
    );
    const handlerStart = lessons.indexOf('const handleLegacyLessonPress = useCallback');
    const handlerEnd = lessons.indexOf('const openDiagnosticTest', handlerStart);
    const handler = lessons.slice(handlerStart, handlerEnd);
    const pendingBranch = handler.indexOf("if (entitlementReadiness === 'pending')");

    expect(pendingBranch).toBeGreaterThan(-1);
    expect(handler.slice(pendingBranch)).toContain('void reloadPremiumAccess()');
    expect(pendingBranch).toBeLessThan(handler.indexOf('resolveLessonAccess(accessInput)'));
    expect(handler.indexOf('resolveLessonAccess(accessInput)')).toBeLessThan(handler.indexOf('openLessonPaywall(num)'));
    expect(lessons).toContain("legacyEntitlementReadiness === 'pending'");
    expect(lessons).toContain('{ kind: "pending" }');
    expect(lessons).toContain('const premiumCourseActive = accessResolved && isPremium;');
    expect(lessons).toContain("if (examEntitlementReadiness === 'pending')");
    expect(lessons).toContain('void reloadPremiumAccess();');
    expect(lessons).toContain('accessResolved &&');

    const card = fs.readFileSync(
      path.join(process.cwd(), 'components', 'lessons', 'LessonsListGlassCard.tsx'),
      'utf8',
    );
    expect(card).toContain("| { kind: 'pending' }");
    expect(card).toContain('<ActivityIndicator size="small" color={glass.secondary} />');
    expect(card).toContain("accessibilityState={{ busy: state.kind === 'pending' }}");
  });
});
