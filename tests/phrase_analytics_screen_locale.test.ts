import fs from 'fs';
import path from 'path';

describe('phrase analytics planned locale lesson titles', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/phrase_analytics_screen.tsx'), 'utf8');

  it('does not collapse planned lesson rows to Russian lesson names', () => {
    expect(source).toContain('phraseAnalyticsLessonTitle(stat, lang, studyTarget)');
    expect(source).not.toContain("lang === 'uk' ? stat.lessonNameUK : lang === 'es' ? stat.lessonNameES : stat.lessonNameRU");
  });

  it('uses study-target lesson titles and localized unavailable copy', () => {
    expect(source).toContain('lessonNameForStudyTarget(lang, studyTarget, stat.lessonId)');
    expect(source).toContain('ANALYTICS_LESSON_TITLE_UNAVAILABLE');
    expect(source).not.toContain('needs-review: título da lição pendente');
    expect(source).toContain('<LessonRow key={stat.lessonId} stat={stat} studyTarget={studyTarget} />');
  });
});
