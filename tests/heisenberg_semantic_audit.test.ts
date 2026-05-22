declare const require: any;

const semantic = require('../scripts/lib/heisenberg_semantic_core.cjs');

describe('heisenberg semantic audit helpers', () => {
  it('detects common mojibake patterns', () => {
    expect(semantic.hasMojibake('aÃ§Ã£o')).toBe(true);
    expect(semantic.hasMojibake('Äá»c sÃ¡ch')).toBe(true);
    expect(semantic.hasMojibake('Termo-chave em ingl?s')).toBe(true);
    expect(semantic.hasMojibake('Thu?t ng? ti?ng Anh c?n gi?')).toBe(true);
    expect(semantic.hasMojibake('Korunmas? gereken ?ngilizce terim')).toBe(true);
    expect(semantic.hasMojibake('acción correcta')).toBe(false);
    expect(semantic.hasMojibake('Did you use to live here?')).toBe(false);
    expect(semantic.hasMojibake('Did you use to live here? pergunta sobre uma situação habitual')).toBe(false);
  });

  it('extracts protected English terms from answer choices and base explanations', () => {
    const choices = ['Reading books helps me relax', 'Reading books help me relax', 'Redding books helps me relax'];
    const base = 'Reading books works as a singular subject, so use helps. Redding is misspelled.';

    expect(semantic.expectedProtectedTerms(choices, base)).toEqual(
      expect.arrayContaining(['Reading books', 'helps', 'Redding']),
    );
  });

  it('reports missing protected terms in localized explanations', () => {
    const choices = ['Reading books helps me relax', 'Reading books help me relax'];
    const base = 'Use Reading books with helps here.';
    const localized = 'Correcto. La idea funciona como sujeto singular.';

    expect(semantic.missingProtectedTerms(choices, base, localized, choices)).toEqual(
      expect.arrayContaining(['helps']),
    );
    expect(semantic.missingProtectedTerms(choices, base, localized, choices)).not.toContain('Reading books');
  });

  it('treats multi-word protected terms as covered when their discriminative content words are present', () => {
    const choices = ['She reads books every day.', 'She read books every day.'];
    const base = 'Correct. She reads books every day uses reads with she.';
    const localized = 'Correcto. Con she en present simple usamos reads.';

    expect(semantic.missingProtectedTerms(choices.slice(0, 1), base, localized, choices)).toEqual([]);
  });

  it('reports missing required locale fields', () => {
    expect(semantic.missingRequiredFields(null, ['literal', 'meaning', 'text'])).toEqual([
      'literal',
      'meaning',
      'text',
    ]);
    expect(semantic.missingRequiredFields({ literal: 'Literal', meaning: ' ', text: 'Explanation' }, [
      'literal',
      'meaning',
      'text',
    ])).toEqual(['meaning']);
  });

  it('reports exact seed/runtime copy differences', () => {
    expect(
      semantic.localeCopyDifferences(
        { literal: 'PT literal', meaning: 'PT meaning', text: 'PT text' },
        { literal: 'PT literal', meaning: 'Different meaning', text: 'PT text' },
        ['literal', 'meaning', 'text'],
      ),
    ).toEqual([
      {
        field: 'meaning',
        expected: 'PT meaning',
        actual: 'Different meaning',
      },
    ]);
  });

  it('detects suspicious cross-locale duplicate copy', () => {
    expect(
      semantic.duplicateLocaleFieldValues(
        {
          'pt-BR': { literal: 'PT literal', meaning: 'Same copied meaning text', text: 'PT text' },
          vi: { literal: 'VI literal', meaning: 'Same copied meaning text', text: 'VI text' },
          id: { literal: 'ID literal', meaning: 'Different meaning text', text: 'ID text' },
        },
        ['literal', 'meaning', 'text'],
        { minLength: 12 },
      ),
    ).toEqual([
      {
        field: 'meaning',
        value: 'Same copied meaning text',
        locales: ['pt-BR', 'vi'],
      },
    ]);
  });

  it('detects target-language signal in Daily Phrase explanations', () => {
    expect(semantic.localeLanguageSignal('pt-BR', 'Plain sailing é usado quando uma tarefa segue sem grandes problemas.').ok).toBe(true);
    expect(semantic.localeLanguageSignal('vi', 'Plain sailing dùng khi một việc diễn ra dễ dàng, không có trở ngại lớn.').ok).toBe(true);
    expect(semantic.localeLanguageSignal('id', 'Plain sailing dipakai ketika tugas berjalan mudah tanpa masalah besar.').ok).toBe(true);
    expect(semantic.localeLanguageSignal('tr', 'Plain sailing, bir iş büyük sorunlar olmadan ilerlediğinde kullanılır.').ok).toBe(true);
    expect(semantic.localeLanguageSignal('pl', 'Plain sailing używa się, gdy zadanie idzie łatwo i bez większych problemów.').ok).toBe(true);
  });

  it('flags English-only copy as weak source-locale signal', () => {
    const englishOnly = 'Plain sailing is used when a task or situation is easy and has no major problems.';

    for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl']) {
      expect(semantic.localeLanguageSignal(locale, englishOnly).ok).toBe(false);
    }
  });
});
