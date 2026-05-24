import fs from 'fs';
import path from 'path';

import { buildFilterGroups, buildFilterOptions } from '../app/flashcards/selectors';
import type { CardItem } from '../app/flashcards/types';

const ROOT = path.resolve(__dirname, '..');
const COLLECTION_SOURCE = fs.readFileSync(path.join(ROOT, 'app', 'flashcards_collection.tsx'), 'utf8');
const SELECTOR_SOURCE = fs.readFileSync(path.join(ROOT, 'app', 'flashcards', 'selectors.ts'), 'utf8');
const CONSTANTS_SOURCE = fs.readFileSync(path.join(ROOT, 'app', 'flashcards', 'constants.ts'), 'utf8');
const LEGACY_RUNTIME_RE = /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

const savedCards: CardItem[] = [
  {
    id: 'saved_word',
    en: 'I am ready',
    ru: 'Я готов',
    uk: 'Я готовий',
    categoryId: 'saved',
    isSystem: false,
    source: 'word',
  },
  {
    id: 'saved_lesson',
    en: 'Let’s go',
    ru: 'Пойдём',
    uk: 'Ходімо',
    categoryId: 'saved',
    isSystem: false,
    source: 'lesson',
    sourceId: '3',
  },
];

describe('flashcards collection planned locale runtime labels', () => {
  it('keeps collection and selector runtime free of RU/UK/ES fallback patterns', () => {
    expect(COLLECTION_SOURCE).toContain('const strLang: Lang = lang;');
    expect(COLLECTION_SOURCE).toContain('function fullCategoryLabelForLang');
    expect(COLLECTION_SOURCE).toContain('function customCardLocalizationForLang');
    expect(COLLECTION_SOURCE).not.toMatch(LEGACY_RUNTIME_RE);
    expect(SELECTOR_SOURCE).not.toMatch(LEGACY_RUNTIME_RE);
    expect(CONSTANTS_SOURCE).not.toMatch(LEGACY_RUNTIME_RE);
  });

  it('builds planned-locale filter labels explicitly', () => {
    const ptGroups = buildFilterGroups(savedCards, 'saved', 'pt-BR');
    expect(ptGroups).toEqual([
      { groupKey: 'lessons', groupLabel: 'Aulas', items: [{ key: 'lesson:3', label: 'Aula 3' }] },
      { groupKey: 'other', groupLabel: 'Outros', items: [{ key: 'word', label: 'Palavras' }] },
    ]);
    expect(buildFilterOptions(ptGroups, 'pt-BR')[0]).toEqual({ key: 'all', label: 'Todas' });

    const plGroups = buildFilterGroups(savedCards, 'saved', 'pl');
    expect(plGroups[0]).toEqual({ groupKey: 'lessons', groupLabel: 'Lekcje', items: [{ key: 'lesson:3', label: 'Lekcja 3' }] });
    expect(plGroups[1]).toEqual({ groupKey: 'other', groupLabel: 'Inne', items: [{ key: 'word', label: 'Słowa' }] });
    expect(buildFilterOptions(plGroups, 'pl')[0]).toEqual({ key: 'all', label: 'Wszystkie' });
  });
});
