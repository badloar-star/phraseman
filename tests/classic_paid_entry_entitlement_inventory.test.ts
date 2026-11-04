import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

describe('paid classic/combo/exam/menu entitlement inventory', () => {
  it('level exam stays checking while PremiumContext is unresolved', () => {
    const source = read('app/level_exam.tsx');
    expect(source).toContain('hasPremiumAccess, accessResolved, reload: reloadPremiumAccess');
    expect(source).toContain('if (!accessResolved) {');
    expect(source).toContain('void reloadPremiumAccess();');
    expect(source.indexOf('if (!accessResolved) {'))
      .toBeLessThan(source.indexOf("setAccessBlockKind('premium')"));
    expect(source).toContain('[accessResolved, frenchExamBlocked, hasPremiumAccess, lang, lvl, reloadPremiumAccess, studyTarget]');
  });

  it('lesson-complete note and Next use only resolved/confirmed entitlement', () => {
    const source = read('app/lesson_complete.tsx');
    expect(source).toContain('const { hasPremiumAccess, accessResolved } = usePremium();');
    expect(source).toContain('decisionConfirmed: isPremiumAccessDecisionConfirmedForCurrentAccount');
    expect(source).toContain('contextResolved: () => accessResolvedRef.current');
    expect(source).toContain('accessResolved,\n    hasPremiumAccess,');
    expect(read('hooks/use_soft_upsell_opportunity.ts')).toContain('if (!accessResolved) return;');
  });

  it('all connected paid-entry resolvers expose an explicit unknown branch', () => {
    expect(read('app/monetization_policy.ts')).toContain("if (!accessResolved) return 'pending';");
    expect(read('app/lesson_premium_gate.ts')).toContain("'entitlement_pending'");
    expect(read('app/combo_gate_decision.ts')).toContain("if (!input.accessResolved) return 'pending';");
    expect(read('app/lesson_next_access.ts')).toContain('input.decisionConfirmed()');
  });
});
