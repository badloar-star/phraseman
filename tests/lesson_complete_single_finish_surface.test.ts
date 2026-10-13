import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_complete.tsx'), 'utf8');
const completionStart = source.lastIndexOf('if (sequenceShowing) {');
const completionEnd = source.indexOf('testID="lesson-complete-loading"', completionStart);
const completionSurface = source.slice(completionStart, completionEnd);

describe('lesson completion single finish surface', () => {
  // зачем (владелец 01.10): итог урока = общий экран 2.0 по макету learn.html E.
  it('renders the shared 2.0 done screen with the earned stars', () => {
    expect(completionSurface).toContain('<V2DoneScreen');
    expect(completionSurface).toContain('stars={isComboCompletion ? null : resultStars}');
    expect(completionSurface).toContain('goNext();');
  });

  it('shows only the next-lesson unlock hint, without follow-up completion overlays', () => {
    // зачем (04.10): 7887bbc7b (итог урока по макету E1–E4) — подсказка стала одной из веток starsNote
    // («нужно 2★» при одной звезде, иначе «следующий урок открыт» по nextLessonUnlockHint), а не самим значением.
    expect(completionSurface).toMatch(/starsNote=\{[\s\S]{0,700}?: nextLessonUnlockHint\s*\?/);
    expect(source).toContain('const [completionRequiresPremium, setCompletionRequiresPremium] = useState(false);');
    // зачем (04.10): PM-229 db985607f — немой catch пишет причину; результат при отказе тот же (undefined).
    expect(source).toContain("readLegacyFreeLessonCap(studyTarget).catch(noteSwallowedAs('lesson_complete:useEffect.readLegacyFreeLessonCap', undefined))");
    expect(source).toContain('requiresPremiumForLesson(lessonId + 1, legacyFreeLessonCap)');
    expect(source).toContain("ru: 'Следующий урок входит в Plus'");
    expect(completionSurface).toContain("ru: 'Открыть Plus'");
    for (const removedSurface of [
      'BonusXPCard',
      'ReviewModal',
      'AchievementNotifModal',
      'RegistrationPromptModal',
      'CollectibleDropModal',
      'CoachToast',
      'SoftContextualUpsellCard',
    ]) {
      expect(completionSurface).not.toContain(removedSurface);
    }
  });

  it('exits to the lessons list on Android Back instead of revealing a blank completion state', () => {
    const backHandlerStart = source.indexOf("BackHandler.addEventListener('hardwareBackPress'");
    const resultBackStart = source.indexOf('if (sequenceShowing)', backHandlerStart);
    const resultBackEnd = source.indexOf('if (showPremiumBanner)', resultBackStart);
    const resultBackHandler = source.slice(resultBackStart, resultBackEnd);

    expect(resultBackHandler).toContain('goBackFromComplete();');
    expect(resultBackHandler).not.toContain('setSeqDone(true);');
  });

  it('renders a cancellable loading surface instead of a blank screen', () => {
    expect(source).toContain('testID="lesson-complete-loading"');
    expect(source).not.toContain('return <ScreenGradient />;');
  });
});
