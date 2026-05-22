import fs from 'fs';
import path from 'path';
import { explainPrepositionChoice } from '../app/preposition_explanations';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('preposition explanation planned locale runtime', () => {
  const explanationSource = fs.readFileSync(path.join(__dirname, '../app/preposition_explanations.ts'), 'utf8');
  const lessonPrepositionsSource = fs.readFileSync(path.join(__dirname, '../app/lesson_prepositions.ts'), 'utf8');

  it('does not keep generic planned fallback helpers or fallback level markers', () => {
    expect(explanationSource).not.toContain('plannedExplanationFallback');
    expect(explanationSource).not.toContain('withPlannedFallback');
    expect(explanationSource).not.toContain("level: 'fallback'");
    expect(explanationSource).not.toContain("'fallback'");
    expect(lessonPrepositionsSource).not.toContain('|fallback');
  });

  it('marks unresolved planned preposition explanations as locale-specific needs-review', () => {
    const explanation = explainPrepositionChoice('after', 'Call me after lunch.');

    for (const locale of PLANNED_LOCALES) {
      expect(explanation[locale]).toBeTruthy();
      expect(explanation[locale]).toMatch(/^needs-review:/);
    }
  });

  it('preserves explicit ru/uk/es explanation copy for existing runtime behavior', () => {
    const explanation = explainPrepositionChoice('after', 'Call me after lunch.');

    expect(explanation.ru).toContain('after');
    expect(explanation.uk).toContain('after');
    expect(explanation.es).toContain('after');
    expect(explanation.level).not.toBe('needs-review');
  });
});
