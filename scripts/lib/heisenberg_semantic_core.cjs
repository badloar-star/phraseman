'use strict';

const CYRILLIC_RE = /[\u0400-\u04FF]/u;
const MOJIBAKE_RE =
  /(?:Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]|Ä[\u0080-\u00BF]|Å[\u0080-\u00BF]|Æ[\u0080-\u00BF]|áº|á»|ï¿½|�)/u;
const REPLACEMENT_QUESTION_MARK_RE =
  /(?:[\p{L}]\?[\p{L}]|(?:^|\s)\?[\p{L}]|(?:ingl|Korunmas)\?)/u;

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'being',
  'but',
  'can',
  'could',
  'do',
  'does',
  'for',
  'from',
  'had',
  'has',
  'have',
  'he',
  'her',
  'him',
  'his',
  'i',
  'in',
  'is',
  'it',
  'me',
  'my',
  'not',
  'of',
  'on',
  'or',
  'she',
  'should',
  'that',
  'the',
  'they',
  'this',
  'to',
  'we',
  'when',
  'will',
  'with',
  'would',
  'you',
  'your',
]);

const LOCALE_LANGUAGE_SIGNALS = {
  es: {
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
  'pt-BR': {
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
  vi: {
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
  id: {
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
  tr: {
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
  pl: {
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
};

function compactSample(value, limit = 180) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function hasMojibake(value) {
  const text = String(value || '');
  return MOJIBAKE_RE.test(text) || REPLACEMENT_QUESTION_MARK_RE.test(text);
}

function hasCyrillic(value) {
  return CYRILLIC_RE.test(String(value || ''));
}

function normalizeForSearch(value) {
  return String(value || '')
    .replace(/[’]/g, "'")
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function containsTerm(text, term) {
  const haystack = normalizeForSearch(text);
  const needle = normalizeForSearch(term);
  if (!needle) return true;
  return haystack.includes(needle);
}

function words(value) {
  return String(value || '').match(/[A-Za-z][A-Za-z']*/g) || [];
}

function contentWords(value) {
  return words(value)
    .map((word) => word.toLowerCase())
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

function commonContentWords(choices) {
  const choiceList = Array.isArray(choices) ? choices : [];
  if (choiceList.length < 2) return new Set();
  const [first, ...rest] = choiceList.map((choice) => new Set(contentWords(choice)));
  return new Set([...first].filter((word) => rest.every((choiceWords) => choiceWords.has(word))));
}

function discriminativeContentWords(term, choices) {
  const common = commonContentWords(choices);
  return contentWords(term).filter((word) => !common.has(word));
}

function termCovered(text, term, choices) {
  if (containsTerm(text, term)) return true;
  const content = discriminativeContentWords(term, choices);
  if (content.length < 1) return false;
  return content.every((word) => containsTerm(text, word));
}

function choiceNgrams(choice) {
  const tokens = words(choice);
  const out = new Set();
  const maxLen = Math.min(4, tokens.length);
  for (let size = maxLen; size >= 1; size -= 1) {
    for (let i = 0; i <= tokens.length - size; i += 1) {
      const slice = tokens.slice(i, i + size);
      const phrase = slice.join(' ');
      const lower = phrase.toLowerCase();
      const first = slice[0].toLowerCase();
      const last = slice[slice.length - 1].toLowerCase();
      if (size === 1 && (phrase.length < 3 || STOP_WORDS.has(lower))) continue;
      if (size > 1 && (STOP_WORDS.has(first) || STOP_WORDS.has(last))) continue;
      if (contentWords(phrase).length === 0) continue;
      if (phrase.length < 3) continue;
      out.add(phrase);
    }
  }
  return [...out];
}

function expectedProtectedTerms(choices, baseExplanation) {
  const found = new Set();
  for (const choice of choices || []) {
    for (const term of choiceNgrams(choice)) {
      if (containsTerm(baseExplanation, term)) found.add(term);
    }
  }
  return [...found]
    .sort((a, b) => b.length - a.length || a.localeCompare(b))
    .filter((term, index, all) => !all.slice(0, index).some((bigger) => containsTerm(bigger, term)))
    .slice(0, 8);
}

function missingProtectedTerms(choices, baseExplanation, localizedExplanation, allChoices) {
  const referenceChoices = Array.isArray(allChoices) && allChoices.length > 0 ? allChoices : choices;
  return expectedProtectedTerms(choices, baseExplanation)
    .filter((term) => discriminativeContentWords(term, referenceChoices).length > 0)
    .filter((term) => !termCovered(localizedExplanation, term, referenceChoices));
}

function missingRequiredFields(record, fields) {
  return (fields || []).filter((field) => {
    const value = record && record[field];
    return typeof value !== 'string' || value.trim().length === 0;
  });
}

function localeCopyDifferences(expected, actual, fields) {
  const out = [];
  for (const field of fields || []) {
    const expectedValue = expected && typeof expected[field] === 'string' ? expected[field] : '';
    const actualValue = actual && typeof actual[field] === 'string' ? actual[field] : '';
    if (expectedValue !== actualValue) {
      out.push({
        field,
        expected: expectedValue,
        actual: actualValue,
      });
    }
  }
  return out;
}

function duplicateLocaleFieldValues(copiesByLocale, fields, options = {}) {
  const minLength = Number(options.minLength || 12);
  const out = [];
  for (const field of fields || []) {
    const byValue = new Map();
    for (const [locale, copy] of Object.entries(copiesByLocale || {})) {
      const raw = copy && typeof copy[field] === 'string' ? copy[field] : '';
      const normalized = normalizeForSearch(raw);
      if (!normalized || normalized.length < minLength) continue;
      const group = byValue.get(normalized) ?? { field, value: raw, locales: [] };
      group.locales.push(locale);
      byValue.set(normalized, group);
    }
    for (const group of byValue.values()) {
      if (group.locales.length > 1) {
        out.push({
          field,
          value: group.value,
          locales: group.locales.sort(),
        });
      }
    }
  }
  return out;
}

function localeLanguageSignal(locale, value) {
  const rule = LOCALE_LANGUAGE_SIGNALS[locale];
  if (!rule) return { ok: true, matches: [] };

  const raw = String(value || '');
  const normalized = normalizeForSearch(raw);
  const tokens = new Set(normalized.split(/[^\p{L}]+/u).filter(Boolean));
  const matches = [];

  if (rule.chars && rule.chars.test(raw)) matches.push('diacritic');

  for (const word of rule.words || []) {
    if (tokens.has(word)) matches.push(word);
  }

  const uniqueMatches = [...new Set(matches)];
  return {
    ok: uniqueMatches.length >= (rule.minMatches || 2),
    matches: uniqueMatches,
  };
}

function exactStringInList(value, list) {
  const normalized = normalizeForSearch(value);
  return (list || []).some((entry) => normalizeForSearch(entry) === normalized);
}

module.exports = {
  CYRILLIC_RE,
  MOJIBAKE_RE,
  REPLACEMENT_QUESTION_MARK_RE,
  choiceNgrams,
  compactSample,
  commonContentWords,
  containsTerm,
  contentWords,
  discriminativeContentWords,
  duplicateLocaleFieldValues,
  exactStringInList,
  expectedProtectedTerms,
  hasCyrillic,
  hasMojibake,
  localeLanguageSignal,
  localeCopyDifferences,
  missingRequiredFields,
  missingProtectedTerms,
  normalizeForSearch,
  termCovered,
};
