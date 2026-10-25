import fs from 'fs';
import path from 'path';
import { normalizeEol } from './helpers/read_source';

const ROOT = path.resolve(__dirname, '..');
const SOURCE = normalizeEol(fs.readFileSync(path.join(ROOT, 'app', 'lesson_menu.tsx'), 'utf8'));
const LEGACY_RUNTIME_RE = /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

describe('lesson menu planned locale runtime copy', () => {
  it('does not route planned lesson menu labels through RU/UK/ES branches', () => {
    const runtimeSource = SOURCE
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(runtimeSource).not.toMatch(LEGACY_RUNTIME_RE);
  });

  it('keeps auxiliary lesson card subtitles explicit for planned locales', () => {
    // зачем (Ревизор 25.10): c8ffad624 поставил неразрывный пробел «число + слово» — в исходнике это \u00A0
    expect(SOURCE).toContain("'pt-BR': `${wordsLearned}/${total}\\u00A0palavras`");
    expect(SOURCE).toContain("vi: `${wordsLearned}/${total}\\u00A0từ`");
    expect(SOURCE).toContain("id: `${wordsLearned}/${total}\\u00A0kata`");
    expect(SOURCE).toContain("tr: `${wordsLearned}/${total}\\u00A0kelime`");
    expect(SOURCE).toContain("pl: `${wordsLearned}/${total}\\u00A0słów`");
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
