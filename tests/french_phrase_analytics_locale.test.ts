import fs from 'fs';
import path from 'path';

describe('French phrase analytics planned locale lesson titles', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/french_phrase_analytics.ts'), 'utf8');

  it('does not build Spanish lesson stats from the Russian French lesson title', () => {
    expect(source).not.toContain("lessonNameES: lessonNameForStudyTarget('ru', 'fr', lessonId)");
    expect(source).toContain("lessonNameES: title.es");
  });

  it('uses planned French lesson titles instead of generic lesson-number insight copy', () => {
    expect(source).toContain("lessonNameForStudyTarget('pt-BR', 'fr', lessonId)");
    expect(source).toContain("lessonNameForStudyTarget('vi', 'fr', lessonId)");
    expect(source).toContain("lessonNameForStudyTarget('id', 'fr', lessonId)");
    expect(source).toContain("lessonNameForStudyTarget('tr', 'fr', lessonId)");
    expect(source).toContain("lessonNameForStudyTarget('pl', 'fr', lessonId)");
    expect(source).not.toContain('needs-review: título da lição');
    expect(source).not.toContain('needs-review: tiêu đề bài');
    expect(source).not.toContain('A lição de francês mais fraca agora é a lição ${topLesson.lessonId}');
    expect(source).not.toContain('Bài tiếng Pháp yếu nhất hiện tại là bài ${topLesson.lessonId}');
    expect(source).not.toContain('Pelajaran bahasa Prancis terlemah saat ini adalah pelajaran ${topLesson.lessonId}');
    expect(source).not.toContain('Şu anda en zayıf Fransızca dersi ${topLesson.lessonId}. ders');
    expect(source).not.toContain('Najsłabsza lekcja francuskiego teraz to lekcja ${topLesson.lessonId}');
  });
});
