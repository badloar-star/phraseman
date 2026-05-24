import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'lessons.tsx'), 'utf8');
const LEGACY_RUNTIME_RE = /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

describe('lessons tab planned locale runtime copy', () => {
  it('does not keep RU/UK/ES runtime branch fallbacks in the lessons tab', () => {
    expect(SOURCE).not.toMatch(LEGACY_RUNTIME_RE);
  });

  it('keeps exam cards and gate messages explicit for planned locales', () => {
    expect(SOURCE).toContain("'pt-BR': isB2 ? 'Exame' : `Exame ${lvl}`");
    expect(SOURCE).toContain("vi: isB2 ? 'Bài kiểm tra' : `Bài kiểm tra ${lvl}`");
    expect(SOURCE).toContain("id: isB2 ? 'Ujian' : `Ujian ${lvl}`");
    expect(SOURCE).toContain("tr: isB2 ? 'Sınav' : `${lvl} sınavı`");
    expect(SOURCE).toContain("pl: isB2 ? 'Egzamin' : `Egzamin ${lvl}`");
    expect(SOURCE).toContain("'pt-BR': `Primeiro conclua todas as lições ${gateModal.level} com nota 4,5+`");
    expect(SOURCE).toContain("vi: `Trước tiên hãy hoàn thành tất cả bài học ${gateModal.level} với điểm 4.5+`");
    expect(SOURCE).toContain("id: `Selesaikan dulu semua pelajaran ${gateModal.level} dengan nilai 4,5+`");
    expect(SOURCE).toContain("tr: `Önce tüm ${gateModal.level} derslerini 4.5+ puanla tamamla`");
    expect(SOURCE).toContain("pl: `Najpierw ukończ wszystkie lekcje ${gateModal.level} z wynikiem 4,5+`");
  });
});
