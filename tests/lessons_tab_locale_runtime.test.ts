import fs from 'fs';
import path from 'path';
import { normalizeEol } from './helpers/read_source';

const ROOT = path.resolve(__dirname, '..');
const SOURCE = normalizeEol(fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'lessons.tsx'), 'utf8'));
/** Двойные кавычки строковых литералов → одинарные (только для сравнения текстов). */
const normalizeQuotes = (src: string): string => src.replace(/"([^"\n\\]*)"/g, "'$1'");
const LEGACY_RUNTIME_RE = /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

describe('lessons tab planned locale runtime copy', () => {
  it('does not keep RU/UK/ES runtime branch fallbacks in the lessons tab', () => {
    expect(SOURCE).not.toMatch(LEGACY_RUNTIME_RE);
  });

  it('keeps exam cards and gate messages explicit for planned locales', () => {
    // зачем (05.10): lessons.tsx отформатирован двойными кавычками — сверяем тексты без учёта стиля кавычек.
    const q = normalizeQuotes(SOURCE);
    expect(q).toContain("'pt-BR': isB2 ? 'Exame' : `Exame ${lvl}`");
    expect(q).toContain("vi: isB2 ? 'Bài kiểm tra' : `Bài kiểm tra ${lvl}`");
    expect(q).toContain("id: isB2 ? 'Ujian' : `Ujian ${lvl}`");
    expect(q).toContain("tr: isB2 ? 'Sınav' : `${lvl} sınavı`");
    expect(q).toContain("pl: isB2 ? 'Egzamin' : `Egzamin ${lvl}`");
    // зачем (05.10): текст замка экзамена переписан 18.09 (тексты — Ядро); сторожим смысл, а не формулировку:
    // у каждого запланированного языка своя строка с уровнем, без общего запасного текста.
    // Окно-замок: блоки «экзамен» (заголовок и текст) идут до соответствующего «levelGate».
    const segments: string[] = [];
    let from = 0;
    for (;;) {
      const examAt = SOURCE.indexOf('gateModal?.kind === "exam"\n', from);
      if (examAt < 0) break;
      const gateAt = SOURCE.indexOf('gateModal?.kind === "levelGate"', examAt);
      if (gateAt < 0) break;
      segments.push(SOURCE.slice(examAt, gateAt));
      from = gateAt;
    }
    const keys = ['ru:', 'en:', 'uk:', 'es:', '"pt-BR":', 'vi:', 'id:', 'tr:', 'pl:'];
    const explicit = (seg: string) => keys.every((key) =>
      new RegExp(`${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \`[^\`]*\\$\\{gateModal\\.level\\}[^\`]*4[.,]5`).test(seg));
    expect(segments.some(explicit)).toBe(true);
  });
});
