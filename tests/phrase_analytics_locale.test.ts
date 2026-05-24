import fs from 'fs';
import path from 'path';

describe('phrase analytics insight planned locale lesson titles', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/phrase_analytics.ts'), 'utf8');

  it('builds planned lesson insight titles from localized lesson title tables', () => {
    expect(source).toContain("lessonNamesForLang('pt-BR')");
    expect(source).toContain("lessonNamesForLang('vi')");
    expect(source).toContain("lessonNamesForLang('id')");
    expect(source).toContain("lessonNamesForLang('tr')");
    expect(source).toContain("lessonNamesForLang('pl')");
  });

  it('does not use generic lesson-number copy for planned weak or strong lesson insights', () => {
    expect(source).not.toContain('needs-review: título da lição');
    expect(source).not.toContain('needs-review: tiêu đề bài');
    expect(source).not.toContain('ptBR: `Lição ${weakLesson.lessonId}');
    expect(source).not.toContain("'pt-BR': `Lição ${weakLesson.lessonId}");
    expect(source).not.toContain('vi: `Bài ${weakLesson.lessonId}');
    expect(source).not.toContain('id: `Pelajaran ${weakLesson.lessonId}');
    expect(source).not.toContain('tr: `Ders ${weakLesson.lessonId}');
    expect(source).not.toContain('pl: `Lekcja ${weakLesson.lessonId}');
    expect(source).not.toContain('ptBR: `Lição ${id}');
    expect(source).not.toContain("'pt-BR': `Lição ${id}");
    expect(source).not.toContain('vi: `Bài ${id}');
    expect(source).not.toContain('id: `Pelajaran ${id}');
    expect(source).not.toContain('tr: `Ders ${id}');
    expect(source).not.toContain('pl: `Lekcja ${id}');
  });
});
