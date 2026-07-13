import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_complete.tsx'), 'utf8');
const helperSource = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_complete_soft_upsell.ts'), 'utf8');

describe('lesson completion soft upsell integration', () => {
  it('derives first-only candidates from the canonical first-completion grant', () => {
    expect(source).toContain("firstBonus.status === 'granted'");
    expect(helperSource).toMatch(/lessonId === 1[\s\S]*trigger: 'first_lesson'/);
    expect(helperSource).toMatch(/lessonId === FREE_LESSON_LIMIT[\s\S]*trigger: 'free_lessons_complete'/);
    expect(helperSource).not.toMatch(/lessonId\s*>=\s*FREE_LESSON_LIMIT/);
    expect(helperSource).toContain("input.status !== 'granted'");
  });

  it('uses canonical account, study target, and premium access inputs', () => {
    expect(source).toContain('lessonSoftUpsellPersistenceScope(softUpsellAccountToken)');
    expect(source).not.toContain('accountScopeKey(softUpsellAccountToken)');
    expect(source).toContain('subscribeAccountGeneration');
    expect(source).toContain('useSoftUpsellOpportunity({');
    expect(source).toContain('accountScope: softUpsellAccountScope');
    expect(source).toContain('studyTarget');
    expect(source).toContain('hasPremiumAccess');
  });

  it('renders only after the reward sequence and preserves existing controls', () => {
    expect(source).toContain('shouldRenderLessonSoftUpsell(seqDone, softUpsell.opportunity)');
    expect(source).toContain('<SoftContextualUpsellCard');
    expect(source).toContain('testID="lesson-complete-next-lesson"');
    expect(source).toContain('testID="lesson-complete-repeat"');
    expect(source).toContain('testID="lesson-complete-back-home"');
  });

  it('routes both lesson triggers through the dispatcher with exact soft attribution', () => {
    expect(source).not.toContain("router.push('/personal_plan_setup' as any)");
    expect(source).toContain("pathname: '/premium_modal'");
    expect(source).toContain('context: attribution.context');
    expect(source).toContain("source: 'soft_upsell'");
    expect(source).toContain('softUpsellRouteParams(attribution)');
    expect(source).not.toMatch(/useEffect\([\s\S]{0,400}lesson_complete_soft_upsell/);
  });

  it('passes localized card and accessibility copy without creating another overlay queue', () => {
    for (const key of ['ru', 'uk', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl']) {
      expect(source).toContain(`${key}: {`);
    }
    for (const prop of ['proof', 'title', 'body', 'ctaLabel', 'dismissLabel', 'dismissAccessibilityLabel', 'dismissAccessibilityHint', 'ctaAccessibilityLabel', 'ctaAccessibilityHint']) {
      expect(source).toContain(`${prop}={softUpsellCopy.${prop}}`);
    }
    expect(source).toContain('onImpression={softUpsell.onImpression}');
    expect(source).toContain('onDismiss={softUpsell.onDismiss}');
    expect(source).not.toContain('OverlayKey');
    expect(source).not.toContain('softUpsellQueue');
  });
});
