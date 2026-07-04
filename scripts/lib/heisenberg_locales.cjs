'use strict';

// Single source of truth for every locale Heisenberg knows about.
//
// Adding a new interface/source locale must be ONE entry in LOCALE_REGISTRY.
// Every derived structure (active/batch lists, localized key markers, field
// marker regexes, locale variable names, language signals) is generated from
// this registry, so the rest of the pipeline never hardcodes locale lists.
//
// Entry contract:
// - code: canonical BCP 47 locale code used across app data ('ru', 'pt-BR').
// - englishName: English language name, for reports and prompts.
// - keyWord: lowercase word-form marker used in data keys ('russian').
// - active: locale is a selectable app interface/source locale today.
// - planned: locale is registered for future activation (not active yet).
// - legacyInline: locale lives in the legacy inline ru/uk/es triples and
//   suffix fields (textRu/_ru); drives suffix/marker derivations.
// - defaultSource: locale is a default translation source for new languages.
// - batch: locale participates in Heisenberg batch coverage audits.
// - ambiguousKey: bare object key equal to the code collides with common
//   identifiers (e.g. 'id') and needs sibling/context proof.
// - languageSignal: deterministic language-detection rule for semantic audit
//   ({ words, chars?, minMatches }); null when the locale is detected by a
//   dedicated script check instead (ru/uk via Cyrillic).

const LOCALE_REGISTRY = [
  {
    code: 'ru',
    englishName: 'Russian',
    keyWord: 'russian',
    active: true,
    planned: false,
    legacyInline: true,
    defaultSource: true,
    batch: false,
    ambiguousKey: false,
    languageSignal: null,
  },
  {
    code: 'uk',
    englishName: 'Ukrainian',
    keyWord: 'ukrainian',
    active: true,
    planned: false,
    legacyInline: true,
    defaultSource: true,
    batch: false,
    ambiguousKey: false,
    languageSignal: null,
  },
  {
    code: 'es',
    englishName: 'Spanish',
    keyWord: 'spanish',
    active: true,
    planned: false,
    legacyInline: true,
    defaultSource: true,
    batch: true,
    ambiguousKey: false,
    languageSignal: {
      words: [
        'algo',
        'alguien',
        'cuando',
        'decir',
        'significa',
        'puede',
        'ser',
        'sirve',
        'usa',
        'usar',
        'por',
        'sin',
        'esfuerzo',
        'literal',
        'figurado',
        'figurada',
        'porque',
        'pero',
        'una',
        'un',
        'que',
        'no',
        'muy',
        'mas',
        'tambien',
        'se',
      ],
      chars: /[áéíóúüñ¿¡]/iu,
      minMatches: 2,
    },
  },
  {
    code: 'pt-BR',
    englishName: 'Brazilian Portuguese',
    keyWord: 'portuguese',
    active: true,
    planned: false,
    legacyInline: false,
    defaultSource: false,
    batch: true,
    ambiguousKey: false,
    languageSignal: {
      words: [
        'algo',
        'alguem',
        'quando',
        'dizer',
        'significa',
        'serve',
        'usado',
        'usada',
        'usa',
        'usar',
        'porque',
        'mas',
        'uma',
        'um',
        'que',
        'nao',
        'voce',
        'tambem',
        'e',
      ],
      chars: /[áàâãéêíóôõúç]/iu,
      minMatches: 2,
    },
  },
  {
    code: 'vi',
    englishName: 'Vietnamese',
    keyWord: 'vietnamese',
    active: true,
    planned: false,
    legacyInline: false,
    defaultSource: false,
    batch: true,
    ambiguousKey: false,
    languageSignal: {
      words: [
        'la',
        'khi',
        'mot',
        'nguoi',
        'duoc',
        'dung',
        'nghia',
        'noi',
        'khong',
        'nhung',
        'ban',
        'co',
        'de',
        'trong',
        'voi',
        'rang',
      ],
      chars: /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/iu,
      minMatches: 2,
    },
  },
  {
    code: 'id',
    englishName: 'Indonesian',
    keyWord: 'indonesian',
    active: true,
    planned: false,
    legacyInline: false,
    defaultSource: false,
    batch: true,
    ambiguousKey: true,
    languageSignal: {
      words: [
        'adalah',
        'ketika',
        'untuk',
        'bisa',
        'berarti',
        'terlalu',
        'sebelum',
        'waktunya',
        'berasal',
        'lomba',
        'seseorang',
        'bergerak',
        'tanda',
        'mulai',
        'lengkap',
        'semua',
        'diperlukan',
        'atau',
        'usaha',
        'penuh',
        'sampai',
        'tuntas',
        'ungkapan',
        'ini',
        'informal',
        'dipakai',
        'digunakan',
        'orang',
        'sesuatu',
        'dengan',
        'tidak',
        'tetapi',
        'kamu',
        'dalam',
        'menjelaskan',
        'terdengar',
        'secara',
      ],
      minMatches: 2,
    },
  },
  {
    code: 'tr',
    englishName: 'Turkish',
    keyWord: 'turkish',
    active: true,
    planned: false,
    legacyInline: false,
    defaultSource: false,
    batch: true,
    ambiguousKey: false,
    languageSignal: {
      words: [
        'bir',
        'biri',
        'birinin',
        'icin',
        'kullanilir',
        'kullanılır',
        'demek',
        'anlamina',
        'gelir',
        'zamanı',
        'kabul',
        'sonuclari',
        'sonuçları',
        'sey',
        'degil',
        'ama',
        'cok',
        'daha',
        'kendi',
        'durumda',
        'dogal',
        'soylenir',
        'birçok',
        'insanın',
        'dikkatinin',
        'üzerinde',
        'olması',
        'takdir',
        'görmek',
        'olumlu',
        'görünürlük',
        'istiyorsan',
        'rahatsız',
        'edici',
      ],
      chars: /[çğıöşüİ]/iu,
      minMatches: 2,
    },
  },
  {
    code: 'pl',
    englishName: 'Polish',
    keyWord: 'polish',
    active: true,
    planned: false,
    legacyInline: false,
    defaultSource: false,
    batch: true,
    ambiguousKey: false,
    languageSignal: {
      words: [
        'sie',
        'kiedy',
        'gdy',
        'uzywa',
        'uzywaj',
        'znaczy',
        'oznacza',
        'mozna',
        'moze',
        'sluzyc',
        'ktos',
        'kto',
        'cos',
        'kogos',
        'opisuje',
        'dziala',
        'klopoty',
        'brzmiec',
        'wiec',
        'ostroznie',
        'warto',
        'zalezy',
        'kontekstu',
        'nie',
        'ale',
        'bardzo',
        'jest',
        'zeby',
        'naturalnie',
        'brzmi',
        'wtedy',
      ],
      chars: /[ąćęłńóśźż]/iu,
      minMatches: 2,
    },
  },
];

// Field-name bases that carry localized copy when suffixed with a locale
// ('trRu', 'text_es', ...). Bare 'explanations' historically means RU.
const LOCALIZED_KEY_BASES = [
  'tr',
  'text',
  'title',
  'subtitle',
  'label',
  'tag',
  'desc',
  'description',
  'message',
  'name',
  'explain',
  'lines',
];
const LEGACY_BARE_KEY_LOCALES = { explanations: 'ru' };

function getLocaleEntry(code) {
  return LOCALE_REGISTRY.find((entry) => entry.code === code) || null;
}

function localeCodes(filter) {
  return LOCALE_REGISTRY.filter(filter).map((entry) => entry.code);
}

const ACTIVE_APP_LOCALES = localeCodes((entry) => entry.active);
const PLANNED_APP_LOCALES = localeCodes((entry) => entry.planned && !entry.active);
const LEGACY_INLINE_APP_LOCALES = localeCodes((entry) => entry.legacyInline);
const DEFAULT_SOURCE_LOCALES = localeCodes((entry) => entry.defaultSource);
const HEISENBERG_BATCH_SOURCE_LOCALES = localeCodes((entry) => entry.batch);
// Structured payload files (quiz_source_locale_payloads, sourceLocales maps)
// carry every batch locale except the legacy inline ones, whose copy lives in
// the existing inline architecture.
const STRUCTURED_BATCH_SOURCE_LOCALES = localeCodes((entry) => entry.batch && !entry.legacyInline);
const AMBIGUOUS_EXACT_LOCALE_KEYS = new Set(localeCodes((entry) => entry.ambiguousKey));

function titleCaseCode(code) {
  const compact = code.replace(/-/g, '');
  return compact.charAt(0).toUpperCase() + compact.slice(1).toLowerCase();
}

// Variable identifiers that hold a whole locale bundle ('PT_BR', 'PTBR').
function localeVariableNames(code) {
  const upper = code.toUpperCase();
  const names = [upper.replace(/-/g, '_')];
  const compact = upper.replace(/-/g, '');
  if (!names.includes(compact)) names.push(compact);
  return names;
}

function buildVariableLocaleMap(entries = LOCALE_REGISTRY) {
  const map = {};
  for (const entry of entries) {
    for (const name of localeVariableNames(entry.code)) {
      map[name] = entry.code;
    }
  }
  return map;
}

// Exact lowercase object keys that mark localized copy for legacy inline
// locales ('ru', 'russian', 'textru', ..., bare 'explanations' for RU).
function buildLocalizedKeyExact(entries = LOCALE_REGISTRY.filter((entry) => entry.legacyInline)) {
  const out = new Set();
  for (const entry of entries) {
    const code = entry.code.toLowerCase();
    out.add(code);
    out.add(entry.keyWord);
    for (const base of LOCALIZED_KEY_BASES) out.add(`${base}${code}`);
    out.add(code === 'ru' ? 'explanations' : `explanations${code}`);
  }
  return out;
}

// Regex that finds locale field markers for one locale inside code text,
// e.g. for ru: (title|text|...)(RU|Ru) | (title|...)_ru | russian.
function buildFieldMarkerRegexFor(entry, basePattern) {
  const code = entry.code.toLowerCase().replace(/-/g, '');
  const upper = code.toUpperCase();
  const title = titleCaseCode(entry.code);
  return new RegExp(
    `\\b(?:(?:${basePattern})(?:${upper}|${title})|(?:${basePattern})_${code}|${entry.keyWord})\\b`,
    'g',
  );
}

function buildFieldMarkerRegexMap(basePattern, entries = LOCALE_REGISTRY.filter((entry) => entry.legacyInline)) {
  const out = {};
  for (const entry of entries) {
    out[entry.code] = buildFieldMarkerRegexFor(entry, basePattern);
  }
  return out;
}

// Suffix regexes used to recognize explicit locale keys on arbitrary names
// for legacy inline locales: name_ru / nameRU / nameRu.
function buildLegacyInlineSuffixRegexes(entries = LOCALE_REGISTRY.filter((entry) => entry.legacyInline)) {
  const codes = entries.map((entry) => entry.code.toLowerCase().replace(/-/g, ''));
  return {
    separated: new RegExp(`(^|[_-])(${codes.join('|')})$`, 'i'),
    upper: new RegExp(`(${codes.map((code) => code.toUpperCase()).join('|')})$`),
    title: new RegExp(`(${codes.map((code) => titleCaseCode(code)).join('|')})$`),
  };
}

// Legacy inline locale inference from a key name: bare code, code suffix,
// or the language word ('russian'), plus bare-key exceptions.
function inferLegacyInlineLocaleFromKey(lowerName, entries = LOCALE_REGISTRY.filter((entry) => entry.legacyInline)) {
  if (Object.prototype.hasOwnProperty.call(LEGACY_BARE_KEY_LOCALES, lowerName)) {
    return LEGACY_BARE_KEY_LOCALES[lowerName];
  }
  for (const entry of entries) {
    const code = entry.code.toLowerCase().replace(/-/g, '');
    if (lowerName === code || lowerName.endsWith(code) || lowerName === entry.keyWord) {
      return entry.code;
    }
  }
  return null;
}

// Deterministic language-signal rules for the semantic audit, keyed by code.
function buildLocaleLanguageSignals(entries = LOCALE_REGISTRY) {
  const out = {};
  for (const entry of entries) {
    if (entry.languageSignal) out[entry.code] = entry.languageSignal;
  }
  return out;
}

module.exports = {
  LOCALE_REGISTRY,
  LOCALIZED_KEY_BASES,
  LEGACY_BARE_KEY_LOCALES,
  ACTIVE_APP_LOCALES,
  PLANNED_APP_LOCALES,
  LEGACY_INLINE_APP_LOCALES,
  DEFAULT_SOURCE_LOCALES,
  HEISENBERG_BATCH_SOURCE_LOCALES,
  STRUCTURED_BATCH_SOURCE_LOCALES,
  AMBIGUOUS_EXACT_LOCALE_KEYS,
  getLocaleEntry,
  localeVariableNames,
  buildVariableLocaleMap,
  buildLocalizedKeyExact,
  buildFieldMarkerRegexFor,
  buildFieldMarkerRegexMap,
  buildLegacyInlineSuffixRegexes,
  inferLegacyInlineLocaleFromKey,
  buildLocaleLanguageSignals,
};
