import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'app', 'review.tsx'), 'utf8');

const PLANNED_HINTS = [
  "'pt-BR': 'Tradução ainda indisponível para esta frase'",
  "vi: 'Chưa có bản dịch cho cụm này'",
  "id: 'Terjemahan frasa ini belum tersedia'",
  "tr: 'Bu ifade için çeviri henüz yok'",
  "pl: 'Tłumaczenie tej frazy jest jeszcze niedostępne'",
];

describe('review planned locale runtime copy', () => {
  it('uses localized missing planned recall translation hints instead of RU/UK/ES fallback', () => {
    expect(SOURCE).toContain('const REVIEW_TRANSLATION_UNAVAILABLE_HINT');
    expect(SOURCE).not.toContain('REVIEW_TRANSLATION_HINT_NEEDS_REVIEW');
    for (const hint of PLANNED_HINTS) {
      expect(SOURCE).toContain(hint);
    }
    expect(SOURCE).not.toContain('needs-review: falta a tradução desta frase');
    expect(SOURCE).toContain('const localizedHints: Partial<Record<Lang, string | undefined>>');
    expect(SOURCE).toContain('const localizedHint = localizedHints[lang]?.trim();');
  });

  it('uses explicit localized completion titles and French recall instructions', () => {
    expect(SOURCE).toContain('const REVIEW_COMPLETION_TITLES');
    expect(SOURCE).toMatch(/'pt-BR':\s*\{\s*strong:\s*\['Excelente!'/);
    expect(SOURCE).toMatch(/vi:\s*\{\s*strong:\s*\['Tuyệt vời!'/);
    expect(SOURCE).toMatch(/id:\s*\{\s*strong:\s*\['Hebat!'/);
    expect(SOURCE).toMatch(/tr:\s*\{\s*strong:\s*\['Harika!'/);
    expect(SOURCE).toMatch(/pl:\s*\{\s*strong:\s*\['Świetnie!'/);
    expect(SOURCE).toContain("'pt-BR': 'Lembre e escreva em francês'");
    expect(SOURCE).toContain("vi: 'Nhớ lại và viết bằng tiếng Pháp'");
  });

  it('does not keep the old review runtime language fallbacks', () => {
    expect(SOURCE).not.toContain("if (lang === 'uk' && item.correctAnswerUK) return item.correctAnswerUK;");
    expect(SOURCE).not.toContain("checkCoachToastNeededWithAnalytics(wrongPhrasesRef.current, studyTarget, lang === 'uk' ? 'uk' : 'ru')");
    expect(SOURCE).not.toContain("_rp(lang === 'es'");
    expect(SOURCE).not.toContain("return lang === 'uk'\n      ? 'Згадайте і напишіть французькою'");
    expect(SOURCE).not.toContain('??ng');
    expect(SOURCE).not.toContain('B??dy');
  });
});
