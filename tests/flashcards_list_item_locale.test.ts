import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'app', 'flashcards', 'FlashcardListItem.tsx'), 'utf8');
const PLANNED_LABELS = [
  "'pt-BR': { collapse: 'Ocultar detalhes', expand: 'Mostrar detalhes' }",
  "vi: { collapse: 'Ẩn chi tiết', expand: 'Hiện chi tiết' }",
  "id: { collapse: 'Sembunyikan detail', expand: 'Tampilkan detail' }",
  "tr: { collapse: 'Ayrıntıları gizle', expand: 'Ayrıntıları göster' }",
  "pl: { collapse: 'Ukryj szczegóły', expand: 'Pokaż szczegóły' }",
];

describe('FlashcardListItem planned locale UI labels', () => {
  it('uses explicit planned-locale detail toggle labels', () => {
    expect(SOURCE).toContain('const FLASHCARD_DETAILS_TOGGLE_LABELS');
    for (const label of PLANNED_LABELS) {
      expect(SOURCE).toContain(label);
    }
    expect(SOURCE).toContain('accessibilityLabel={detailsToggleLabel}');
  });

  it('does not route detail toggle labels through RU/UK/ES ternary fallbacks', () => {
    expect(SOURCE).not.toContain("detailsExpanded\n                    ? lang === 'uk'");
    expect(SOURCE).not.toContain("lang === 'es'\n                        ? 'Ocultar detalles'\n                        : 'Скрыть детали'");
    expect(SOURCE).not.toContain("lang === 'es'\n                        ? 'Mostrar detalles'\n                        : 'Показать детали'");
    expect(SOURCE).not.toContain('Fallback if layout measure fails');
  });

  it('uses explicit planned-locale speech locale mappings without RU/ES return branches', () => {
    expect(SOURCE).toContain('const FLASHCARD_BACK_SPEECH_BY_LANG');
    expect(SOURCE).toContain("'pt-BR': 'pt-BR'");
    expect(SOURCE).toContain("vi: 'vi-VN'");
    expect(SOURCE).toContain("id: 'id-ID'");
    expect(SOURCE).toContain("tr: 'tr-TR'");
    expect(SOURCE).toContain("pl: 'pl-PL'");
    expect(SOURCE).toContain('return FLASHCARD_BACK_SPEECH_BY_LANG[lang];');
    expect(SOURCE).not.toContain("return 'es-ES';");
    expect(SOURCE).not.toContain("return 'ru-RU';");
  });
});
