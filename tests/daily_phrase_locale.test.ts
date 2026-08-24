import fs from 'fs';
import path from 'path';

import { dailyPhraseCopyForLang, type DailyPhrase } from '../app/daily_phrase_system';
import { IDIOMS, type IdiomSourceLocaleMap } from '../app/idioms_data';

type DailyPhraseSeed = {
  id: number;
  english: string;
  literal: string;
  meaning: string;
  text: string;
  literal_uk: string;
  meaning_uk: string;
  text_uk: string;
  literal_es?: string;
  meaning_es?: string;
  text_es?: string;
  sourceLocales?: IdiomSourceLocaleMap;
};

const SPANISH_DAILY_PHRASE_IDS = Array.from({ length: 176 }, (_, index) => index + 11);
const SPANISH_FIELDS = ['literal_es', 'meaning_es', 'text_es'] as const;
const BATCH_DAILY_PHRASE_IDS = Array.from({ length: 176 }, (_, index) => index + 11);
const BATCH_SOURCE_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const BATCH_SOURCE_FIELDS = ['literal', 'meaning', 'text'] as const;
const SOURCE_FIELDS = ['literal', 'meaning', 'text', 'literal_uk', 'meaning_uk', 'text_uk'] as const;
const CYRILLIC_RE = /[А-Яа-яЁёІіЇїЄєҐґ]/;

const loadDailyPhraseSeed = (): DailyPhraseSeed[] => {
  const seedPath = path.join(__dirname, '..', 'admin', 'daily_phrases_seed.json');
  return JSON.parse(fs.readFileSync(seedPath, 'utf8')) as DailyPhraseSeed[];
};

const phrase = (overrides: Partial<DailyPhrase> = {}): DailyPhrase => ({
  id: 'local-test',
  english: 'Break a leg',
  literal: 'RU literal',
  meaning: 'RU meaning',
  text: 'RU text',
  literal_uk: 'UK literal',
  meaning_uk: 'UK meaning',
  text_uk: 'UK text',
  date: '2026-05-16',
  allowSave: true,
  ...overrides,
});

describe('dailyPhraseCopyForLang', () => {
  it('uses Spanish explanation fields for Spanish UI', () => {
    const copy = dailyPhraseCopyForLang(
      phrase({
        literal_es: 'ES literal',
        meaning_es: 'ES meaning',
        text_es: 'ES text',
      }),
      'es',
    );

    expect(copy).toEqual({
      literal: 'ES literal',
      meaning: 'ES meaning',
      text: 'ES text',
      isFallback: false,
    });
  });

  it('falls back without writing Russian text into ES fields', () => {
    const p = phrase();
    const copy = dailyPhraseCopyForLang(p, 'es');

    expect(p.literal_es).toBeUndefined();
    expect(copy.literal).toBe('RU literal');
    expect(copy.meaning).toBe('RU meaning');
    expect(copy.text).toBe('RU text');
    expect(copy.isFallback).toBe(true);
  });

  it('uses structured sourceLocales for future Daily Phrase interface languages', () => {
    const copy = dailyPhraseCopyForLang(
      phrase({
        sourceLocales: {
          'pt-BR': {
            literal: 'PT literal',
            meaning: 'PT meaning',
            text: 'PT text',
          },
        },
      }),
      'pt-BR',
    );

    expect(copy).toEqual({
      literal: 'PT literal',
      meaning: 'PT meaning',
      text: 'PT text',
      isFallback: false,
    });
  });

  it('keeps Ukrainian UI on Ukrainian fields', () => {
    const copy = dailyPhraseCopyForLang(phrase(), 'uk');

    expect(copy.literal).toBe('UK literal');
    expect(copy.meaning).toBe('UK meaning');
    expect(copy.text).toBe('UK text');
    expect(copy.isFallback).toBe(false);
  });
});

describe('DailyPhraseCard runtime locale wiring', () => {
  it('passes planned interface languages through to Daily Phrase copy instead of collapsing them to Russian', () => {
    const componentPath = path.join(__dirname, '..', 'components', 'DailyPhraseCard.tsx');
    const source = fs.readFileSync(componentPath, 'utf8');

    expect(source).toContain('const phraseLang: DailyPhraseInterfaceLang = lang;');
    expect(source).toContain('dailyPhraseCopyForLang(phrase, phraseLang)');
    expect(source).not.toContain("const phraseLang = lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru'");
  });

  it('forwards planned Daily Phrase meanings when saving to flashcards', () => {
    const componentPath = path.join(__dirname, '..', 'components', 'DailyPhraseCard.tsx');
    const source = fs.readFileSync(componentPath, 'utf8');

    expect(source).toContain("const flashcardSourceLocales = {");
    expect(source).toContain("'pt-BR': phrase.sourceLocales?.['pt-BR']?.meaning");
    expect(source).toContain('vi: phrase.sourceLocales?.vi?.meaning');
    expect(source).toContain('sourceLocales={flashcardSourceLocales}');
  });

  it('keeps the compact home plaque free of CTA and meaning copy', () => {
    const componentPath = path.join(__dirname, '..', 'components', 'DailyPhraseCard.tsx');
    const source = fs.readFileSync(componentPath, 'utf8');

    expect(source).not.toContain('homeActionLabel');
    expect(source).not.toContain('homeAdditionalAction');
    expect(source).not.toContain('{homeAdditionalMeaning}');
  });

  it('uses a code-native Daily Phrase icon instead of retired theme raster art', () => {
    const componentPath = path.join(__dirname, '..', 'components', 'DailyPhraseCard.tsx');
    const source = fs.readFileSync(componentPath, 'utf8');

    expect(source).toContain("import Ionicons from '@expo/vector-icons/Ionicons';");
    expect(source).toContain('name="chatbubble-ellipses-outline"');
    expect(source).not.toContain('dailyPhraseThemeArtSource');
    expect(source).not.toContain('DAILY_PHRASE_IMAGES');
    expect(source).not.toContain('home_menu/home-forest-daily-phrase.webp');
    expect(source).not.toContain('home_menu/home-minimal-dark-daily-phrase.webp');
  });
});

describe('Spanish Daily Phrase content coverage', () => {
  const seedById = new Map(loadDailyPhraseSeed().map((item) => [item.id, item]));
  const idiomsById = new Map(IDIOMS.map((item) => [item.id, item]));

  it('has isolated Spanish explanation fields for ids 11-186 in seed and runtime data', () => {
    for (const id of SPANISH_DAILY_PHRASE_IDS) {
      const seed = seedById.get(id);
      const idiom = idiomsById.get(id);

      expect(seed).toBeDefined();
      expect(idiom).toBeDefined();
      expect(idiom?.english).toBe(seed?.english);

      for (const field of SPANISH_FIELDS) {
        expect(seed?.[field]?.trim()).toBeTruthy();
        expect(idiom?.[field]?.trim()).toBeTruthy();
        expect(idiom?.[field]).toBe(seed?.[field]);
        expect(seed?.[field]).not.toMatch(CYRILLIC_RE);
        expect(idiom?.[field]).not.toMatch(CYRILLIC_RE);
        expect(seed?.[field]).not.toContain('?');
      }
    }
  });

  it('does not write Spanish Daily Phrase text into source or Ukrainian fields', () => {
    for (const id of SPANISH_DAILY_PHRASE_IDS) {
      const seed = seedById.get(id);
      const idiom = idiomsById.get(id);
      expect(seed).toBeDefined();
      expect(idiom).toBeDefined();

      const seedSpanishValues = SPANISH_FIELDS.map((field) => seed?.[field]).filter(Boolean);
      const idiomSpanishValues = SPANISH_FIELDS.map((field) => idiom?.[field]).filter(Boolean);

      for (const sourceField of SOURCE_FIELDS) {
        expect(seedSpanishValues).not.toContain(seed?.[sourceField]);
        expect(idiomSpanishValues).not.toContain(idiom?.[sourceField]);
      }
    }
  });

  it('has isolated batch sourceLocales for ids 11-186 in seed and runtime data', () => {
    for (const id of BATCH_DAILY_PHRASE_IDS) {
      const seed = seedById.get(id);
      const idiom = idiomsById.get(id);

      expect(seed).toBeDefined();
      expect(idiom).toBeDefined();
      expect(idiom?.english).toBe(seed?.english);

      for (const locale of BATCH_SOURCE_LOCALES) {
        const seedCopy = seed?.sourceLocales?.[locale];
        const idiomCopy = idiom?.sourceLocales?.[locale];

        expect(seedCopy).toBeDefined();
        expect(idiomCopy).toEqual(seedCopy);

        for (const field of BATCH_SOURCE_FIELDS) {
          const value = idiomCopy?.[field];

          expect(value?.trim()).toBeTruthy();
          expect(value).not.toMatch(CYRILLIC_RE);
          expect(value).not.toContain('?');
        }

        expect(idiomCopy?.text.toLowerCase()).toContain(idiom!.english.toLowerCase());
      }
    }
  });
});
