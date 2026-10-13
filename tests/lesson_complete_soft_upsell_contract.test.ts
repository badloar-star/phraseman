import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_complete.tsx'), 'utf8');
const helperSource = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_complete_soft_upsell.ts'), 'utf8');

describe('lesson completion soft upsell integration', () => {
  it('derives first-only candidates from the canonical first-completion grant', () => {
    // зачем (10.10): статус первой отметки передаётся в чистый помощник (candidateAfterLessonGrant),
    // проверка 'granted' живёт в нём (см. helperSource ниже).
    expect(source).toMatch(/candidateAfterLessonGrant\(\{\s*status: firstBonus\.status,/);
    expect(helperSource).toMatch(/lessonId === 1[\s\S]*trigger: 'first_lesson'/);
    expect(helperSource).toMatch(/lessonId === freeLessonLimit[\s\S]*trigger: 'free_lessons_complete'/);
    expect(helperSource).not.toMatch(/lessonId\s*>=\s*freeLessonLimit/);
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

  // зачем (решение владельца 14, 13.10, вариант А «вернуть»): карточка жила только в выключенном старом варианте итога и ждала
  // seqDone, который ставит лишь старая секвенция, — на экране 2.0 предложение Plus не показывалось никогда. Теперь она во вставке
  // V2DoneScreen (макет embedded-plus-states 009/010: результат → карточка → «дальше»), показ по sequenceShowing с плавной вставкой.
  it('renders on the 2.0 completion screen once it is showing and preserves existing controls', () => {
    expect(source).toContain('shouldRenderLessonSoftUpsell(sequenceShowing, upsellOpportunity)');
    expect(source).toContain('const upsellOpportunity = devUpsellOpportunity ?? softUpsell.opportunity;');
    const v2Branch = source.slice(source.indexOf('<V2DoneScreen'), source.indexOf('</SafeAreaView>', source.indexOf('<V2DoneScreen')));
    expect(v2Branch).toContain('<SoftContextualUpsellCard');
    expect(v2Branch).toMatch(/feedbackSlot=\{lessonSoftUpsellVisible \|\|/);
    expect(source).not.toContain('shouldRenderLessonSoftUpsell(seqDone');
    expect(source).toMatch(/animateNextLayoutTransition\(\);\s*setLessonSoftUpsellVisible\(lessonSoftUpsellWanted\);/);
    expect(source).toContain('testID="lesson-complete-next-lesson"');
    expect(source).toContain('testID="lesson-complete-repeat"');
    expect(source).toContain('testID="lesson-complete-back-home"');
  });

  it('routes both offers to explicit paywall contexts', () => {
    expect(source).not.toContain("router.push('/personal_plan_setup' as any)");
    expect(source).toContain("pathname: '/premium_modal'");
    expect(source).toContain("context: 'free_lessons_complete'");
    expect(source).toContain("source: 'lesson_complete_soft_upsell'");
    expect(source).not.toMatch(/useEffect\([\s\S]{0,400}lesson_complete_soft_upsell/);
  });

  it('passes localized card and accessibility copy without creating another overlay queue', () => {
    for (const key of ['ru', 'uk', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl']) {
      expect(source).toContain(`${key}: {`);
    }
    for (const prop of ['title', 'body', 'ctaLabel', 'dismissLabel', 'dismissAccessibilityLabel', 'dismissAccessibilityHint', 'ctaAccessibilityLabel', 'ctaAccessibilityHint']) {
      expect(source).toContain(`${prop}={softUpsellCopy.${prop}}`);
    }
    // зачем (Ядро 13.10): с 7a79d3519 (Авторизация, dev `upsell=`) обработчики обёрнуты в dev-подмену — подставное предложение
    // съёмки не пишет отметок. Боевой путь тот же (softUpsell.*); подмена возможна только в dev (стор-заглушка возвращает null).
    expect(source).toMatch(/onImpression=\{(devUpsellOpportunity \? devUpsellNoop : )?softUpsell\.onImpression\}/);
    expect(source).toMatch(/onDismiss=\{(devUpsellOpportunity \? devUpsellNoop : )?softUpsell\.onDismiss\}/);
    if (source.includes('devUpsellOpportunity')) {
      expect(source).toContain('const kind = getDevLessonUpsell();');
      const stub = fs.readFileSync(path.join(__dirname, '..', 'store_release_stubs', 'dev_state', 'dev_paywall_state_stub.ts'), 'utf8');
      expect(stub).toMatch(/export function getDevLessonUpsell\(\)[^{]*\{ return null; \}/);
    }
    expect(source).not.toContain('OverlayKey');
    expect(source).not.toContain('softUpsellQueue');
  });
});
