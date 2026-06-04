import fs from 'node:fs';
import path from 'node:path';

import { ACTIVE_INTERFACE_SOURCE_LOCALES, type SourceLocale } from '../app/source_locales';
import {
  skylerThematicPackToQuizPhrases,
  thematicQuizPackAvailableForTarget,
  validateSkylerThematicPackForRuntime,
  type SkylerThematicPack,
} from '../app/quiz_thematic_packs';

const ROOT = path.join(__dirname, '..');
const PACK_PATH = path.join(
  ROOT,
  'docs',
  'skyler',
  'runs',
  '2026-05-21T10-11-09-752Z_en_brief',
  'pack-001.draft.json',
);

function loadPack(): SkylerThematicPack {
  return JSON.parse(fs.readFileSync(PACK_PATH, 'utf8')) as SkylerThematicPack;
}

describe('Skyler thematic quiz adapter', () => {
  it('keeps the kitchen pack runtime-safe for all active interface locales', () => {
    const pack = loadPack();
    const validation = validateSkylerThematicPackForRuntime(pack);

    expect(validation).toEqual({ ok: true, issues: [] });

    for (const locale of ACTIVE_INTERFACE_SOURCE_LOCALES) {
      const phrases = skylerThematicPackToQuizPhrases(pack, { sourceLocale: locale });

      expect(phrases).toHaveLength(100);
      expect(phrases.every(phrase => phrase.sourceLocale === locale)).toBe(true);
      expect(phrases.every(phrase => phrase.sourceText && phrase.sourceExplanations?.length === 4)).toBe(true);
      expect(phrases[0]!.sourceText).toBe(pack.items[0]!.localizedPrompts[locale]);
      expect(phrases[0]!.sourceExplanations).toEqual(pack.items[0]!.explanations[locale]);
    }
  });

  it('preserves choices, correct answer, and Skyler metadata during conversion', () => {
    const pack = loadPack();
    const phrases = skylerThematicPackToQuizPhrases(pack, { sourceLocale: 'ru', level: 'A2' });
    const first = phrases[0]!;

    expect(first.choices).toEqual(pack.items[0]!.choices);
    expect(first.correct).toBe(pack.items[0]!.correctIndex);
    expect(first.answer).toBe('knife');
    expect(first.questionId).toBe('kitchen-and-cooking-001');
    expect(first.skillTag).toBe('kitchen_object_labels');
    expect(first.quizItemType).toBe('skyler_thematic:kitchen-and-cooking');
    expect(first.level).toBe('A2');
  });

  it('does not expose English thematic packs while the French quiz source gate is active', () => {
    const pack = loadPack();

    expect(thematicQuizPackAvailableForTarget(pack, 'en')).toBe(true);
    expect(thematicQuizPackAvailableForTarget(pack, 'fr')).toBe(false);
    expect(skylerThematicPackToQuizPhrases(pack, { sourceLocale: 'ru', studyTarget: 'fr' })).toEqual([]);
  });

  it('reports missing localized prompts before runtime use', () => {
    const pack = loadPack();
    const broken = {
      ...pack,
      items: pack.items.map((item, index) => index === 0
        ? {
            ...item,
            localizedPrompts: {
              ...item.localizedPrompts,
              tr: '',
            } as Partial<Record<SourceLocale, string>>,
          }
        : item),
    } satisfies SkylerThematicPack;

    const validation = validateSkylerThematicPackForRuntime(broken);

    expect(validation.ok).toBe(false);
    expect(validation.issues.map(issue => issue.id)).toContain('kitchen-and-cooking-001.tr');
    expect(skylerThematicPackToQuizPhrases(broken, { sourceLocale: 'tr' })).toEqual([]);
  });
});
