import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'app', 'lesson_menu.tsx'), 'utf8');
const LEGACY_RUNTIME_RE = /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

describe('lesson menu planned locale runtime copy', () => {
  it('does not route planned lesson menu labels through RU/UK/ES branches', () => {
    const runtimeSource = SOURCE
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(runtimeSource).not.toMatch(LEGACY_RUNTIME_RE);
  });

  it('keeps auxiliary lesson card subtitles explicit for planned locales', () => {
    expect(SOURCE).toContain("'pt-BR': `${wordsLearned}/${total} palavras`");
    expect(SOURCE).toContain("vi: `${wordsLearned}/${total} từ`");
    expect(SOURCE).toContain("id: `${wordsLearned}/${total} kata`");
    expect(SOURCE).toContain("tr: `${wordsLearned}/${total} kelime`");
    expect(SOURCE).toContain("pl: `${wordsLearned}/${total} słów`");
    expect(SOURCE).toContain("'pt-BR': 'Verbos irregulares desta lição'");
    expect(SOURCE).toContain("vi: 'Động từ bất quy tắc của bài này'");
    expect(SOURCE).toContain("id: 'Kata kerja tak beraturan pelajaran ini'");
    expect(SOURCE).toContain("tr: 'Bu dersin düzensiz fiilleri'");
    expect(SOURCE).toContain("pl: 'Czasowniki nieregularne z tej lekcji'");
    expect(SOURCE).toContain("'pt-BR': 'Preposições desta lição'");
    expect(SOURCE).toContain("vi: 'Giới từ của bài này'");
    expect(SOURCE).toContain("id: 'Preposisi pelajaran ini'");
    expect(SOURCE).toContain("tr: 'Bu dersin edatları'");
    expect(SOURCE).toContain("pl: 'Przyimki z tej lekcji'");
  });
});
