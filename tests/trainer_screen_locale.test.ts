import fs from 'fs';
import path from 'path';

describe('trainer screen planned locale lesson titles', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/trainer.tsx'), 'utf8');

  it('does not collapse planned analytics lesson rows to Russian lesson names', () => {
    expect(source).toContain('trainerAnalyticsLessonTitle(stat, lang, studyTarget)');
    expect(source).not.toContain("lang === 'uk' ? stat.lessonNameUK : lang === 'es' ? stat.lessonNameES : stat.lessonNameRU");
  });

  it('uses lessonNameForStudyTarget and localized unavailable copy instead of RU/UK/ES fallback', () => {
    expect(source).toContain('lessonNameForStudyTarget(lang, studyTarget, stat.lessonId)');
    expect(source).toContain('TRAINER_LESSON_TITLE_UNAVAILABLE');
    expect(source).not.toContain('needs-review: título da aula pendente');
  });
});
