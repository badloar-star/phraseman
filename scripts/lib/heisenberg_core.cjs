'use strict';

const fs = require('node:fs');
const path = require('node:path');

let ts = null;
try {
  ts = require('typescript');
} catch (_err) {
  ts = null;
}

const ACTIVE_APP_LOCALES = ['ru', 'uk', 'es'];
const PLANNED_APP_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'];
const REGISTERED_INTERFACE_SOURCE_LOCALES = [...ACTIVE_APP_LOCALES, ...PLANNED_APP_LOCALES];
const KNOWN_APP_LOCALES = ACTIVE_APP_LOCALES;
const DEFAULT_SOURCE_LOCALES = ['ru', 'uk', 'es'];
const HEISENBERG_BATCH_SOURCE_LOCALES = ['es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const STRUCTURED_BATCH_SOURCE_LOCALES = HEISENBERG_BATCH_SOURCE_LOCALES.filter((locale) => locale !== 'es');
const STRUCTURED_BATCH_QUIZ_FIELDS = [
  'prompt',
  'explanations[0]',
  'explanations[1]',
  'explanations[2]',
  'explanations[3]',
];
const DAILY_PHRASE_BATCH_FIELDS = ['literal', 'meaning', 'text'];
const STRUCTURED_BATCH_COVERAGE_CONTRACTS = [
  ...rangeInclusive(111, 231).flatMap((ordinal) =>
    STRUCTURED_BATCH_QUIZ_FIELDS.map((field) => ({
      file: 'app/quiz_source_locale_payloads.ts',
      surface: 'quizzes',
      keyPath: `medium.${ordinal}.<locale>.${field}`,
      locales: STRUCTURED_BATCH_SOURCE_LOCALES,
    })),
  ),
  ...rangeInclusive(1, 100).flatMap((ordinal) =>
    STRUCTURED_BATCH_QUIZ_FIELDS.map((field) => ({
      file: 'app/quiz_source_locale_payloads.ts',
      surface: 'quizzes',
      keyPath: `hard.${ordinal}.<locale>.${field}`,
      locales: STRUCTURED_BATCH_SOURCE_LOCALES,
    })),
  ),
];
const DAILY_PHRASE_SOURCE_LOCALE_COVERAGE_CONTRACTS = rangeInclusive(11, 186).flatMap((id) =>
  DAILY_PHRASE_BATCH_FIELDS.map((field) => ({
    file: 'app/idioms_data.ts',
    surface: 'daily-phrase',
    keyPath: `id:${id}.sourceLocales.<locale>.${field}`,
    locales: STRUCTURED_BATCH_SOURCE_LOCALES,
  })),
);
const DAILY_PHRASE_ES_COVERAGE_CONTRACTS = rangeInclusive(11, 186).flatMap((id) =>
  DAILY_PHRASE_BATCH_FIELDS.map((field) => ({
    file: 'app/idioms_data.ts',
    surface: 'daily-phrase',
    keyPath: `id:${id}.${field}_<locale>`,
    locales: ['es'],
  })),
);
const DAILY_PHRASE_BATCH_COVERAGE_CONTRACTS = [
  ...DAILY_PHRASE_SOURCE_LOCALE_COVERAGE_CONTRACTS,
  ...DAILY_PHRASE_ES_COVERAGE_CONTRACTS,
];
const IRREGULAR_VERB_BASES = [
  'break',
  'bring',
  'build',
  'buy',
  'choose',
  'come',
  'cost',
  'drink',
  'drive',
  'eat',
  'fall',
  'feel',
  'find',
  'forget',
  'get',
  'give',
  'go',
  'have',
  'hear',
  'hit',
  'hurt',
  'keep',
  'know',
  'leave',
  'let',
  'lose',
  'make',
  'meet',
  'pay',
  'put',
  'read',
  'ring',
  'run',
  'say',
  'see',
  'sell',
  'send',
  'shake',
  'sing',
  'sit',
  'sleep',
  'speak',
  'stand',
  'strike',
  'take',
  'tell',
  'think',
  'understand',
  'wake',
  'wear',
  'write',
];
const IRREGULAR_VERB_BATCH_COVERAGE_CONTRACTS = IRREGULAR_VERB_BASES.map((base) => ({
  file: 'app/irregular_verbs_data.ts',
  surface: 'app-other',
  keyPath: `${base}.<locale>`,
  locales: HEISENBERG_BATCH_SOURCE_LOCALES,
}));
const BATCH_COVERAGE_CONTRACTS = [
  ...STRUCTURED_BATCH_COVERAGE_CONTRACTS,
  ...DAILY_PHRASE_BATCH_COVERAGE_CONTRACTS,
  ...IRREGULAR_VERB_BATCH_COVERAGE_CONTRACTS,
];
const EXTRACTABLE_SOURCE_LOCALES = Array.from(
  new Set([...KNOWN_APP_LOCALES, ...HEISENBERG_BATCH_SOURCE_LOCALES]),
);
const LOCALE_KEY_ALIASES = new Map();
for (const locale of EXTRACTABLE_SOURCE_LOCALES) {
  LOCALE_KEY_ALIASES.set(locale.toLowerCase(), locale);
  LOCALE_KEY_ALIASES.set(locale.replace(/-/g, '_').toLowerCase(), locale);
}
const AMBIGUOUS_EXACT_LOCALE_KEYS = new Set(['id']);

const ES_SIDECAR_COVERAGE_FILES = {
  'app/achievements.ts': ['app/achievements_es_locale.ts'],
  'app/daily_tasks.ts': ['app/daily_tasks_es_locale.ts'],
  'app/flashcards/bundles/official_peaky_blinders_en.json': [
    'app/flashcards/bundles/esOverlays/peakyBlinders.ts',
    'app/flashcards/bundles/bundled_marketplace_manifest.json',
  ],
  'app/flashcards/bundles/dark_logic/dark_logic_part1.ts': ['app/flashcards/bundles/esOverlays/darkLogic.ts'],
  'app/flashcards/bundles/dark_logic/dark_logic_part2.ts': ['app/flashcards/bundles/esOverlays/darkLogic.ts'],
  'app/flashcards/bundles/dark_logic/dark_logic_part3.ts': ['app/flashcards/bundles/esOverlays/darkLogic.ts'],
  'app/flashcards/bundles/dark_logic/dark_logic_part4.ts': ['app/flashcards/bundles/esOverlays/darkLogic.ts'],
  'app/flashcards/bundles/negotiator/negotiator_part1.ts': ['app/flashcards/bundles/esOverlays/negotiator.ts'],
  'app/flashcards/bundles/negotiator/negotiator_part2.ts': ['app/flashcards/bundles/esOverlays/negotiator.ts'],
  'app/flashcards/bundles/negotiator/negotiator_part3.ts': ['app/flashcards/bundles/esOverlays/negotiator.ts'],
  'app/flashcards/bundles/royal_tea/royal_tea_part1.ts': ['app/flashcards/bundles/esOverlays/royalTea.ts'],
  'app/flashcards/bundles/royal_tea/royal_tea_part2.ts': ['app/flashcards/bundles/esOverlays/royalTea.ts'],
  'app/flashcards/bundles/royal_tea/royal_tea_part3.ts': ['app/flashcards/bundles/esOverlays/royalTea.ts'],
  'app/flashcards/bundles/royal_tea/royal_tea_part4.ts': ['app/flashcards/bundles/esOverlays/royalTea.ts'],
  'app/flashcards/bundles/wild_west/wild_west_part1.ts': ['app/flashcards/bundles/esOverlays/wildWest.ts'],
  'app/flashcards/bundles/wild_west/wild_west_part2.ts': ['app/flashcards/bundles/esOverlays/wildWest.ts'],
  'app/flashcards/bundles/wild_west/wild_west_part3.ts': ['app/flashcards/bundles/esOverlays/wildWest.ts'],
  'app/flashcards/bundles/wild_west/wild_west_part4.ts': ['app/flashcards/bundles/esOverlays/wildWest.ts'],
  'app/flashcards/bundles/wild_west/wild_west_part5.ts': ['app/flashcards/bundles/esOverlays/wildWest.ts'],
};

const VERIFIED_EXISTING_LOCALE_FALLBACK_FILES = {
  es: {
    'components/LangContext.tsx':
      'Central UI string bundle explicitly returns ES when the Spanish interface locale is enabled; RU is only the disabled/default guard.',
    'constants/i18n.ts':
      'Central triLang/bundleLang helpers explicitly return ES when the Spanish interface locale is enabled; RU is only the disabled/default guard.',
    'app/exam.tsx':
      'Exam screen uses bundleLang/triLang with explicit ES copy; textFallback is a native share/export fallback, not a language fallback.',
    'components/ExamResultPreviewAdminModal.tsx':
      'Admin preview uses localized share-message builders; textFallback is a native share/export fallback, not a language fallback.',
    'components/ShardRewardModal.tsx':
      'Shard reward modal has an explicit ES text bundle and uses bundleLang only to choose the active UI bundle.',
    'app/flashcards_market_dev.tsx':
      'DEV marketplace screen uses triLang/bundleLang with explicit ES copy; it is not part of production locale activation.',
    'app/lesson_irregular_verbs.tsx':
      'Irregular verbs now carry ES rows in the lesson data; any final fallback stays non-Russian to avoid UI/source-locale mixing.',
    'app/shards_shop.tsx':
      'Shard shop has explicit ES branches for store copy; marketplace data fallback is catalog availability fallback, not language fallback.',
  },
};

function rangeInclusive(start, end) {
  const out = [];
  for (let value = start; value <= end; value += 1) out.push(value);
  return out;
}

const TEXT_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);

const CODE_EXTENSIONS = new Set(['.cjs', '.js', '.jsx', '.mjs', '.ts', '.tsx']);

const SKIP_DIRS = new Set([
  '.expo',
  '.git',
  '.gradle',
  '.claude',
  '.next',
  '.turbo',
  '.vscode',
  'android',
  'build',
  'coverage',
  'dist',
  'ios',
  'node_modules',
]);

const SKIP_PATH_PARTS = [
  'scripts/all_candidates_dump',
  'scripts/missing_edits_dump',
  'scripts/out',
  'docs/heisenberg',
  'subscription-recovery/node_modules',
  'tmp',
];

const LOCALIZED_KEY_EXACT = new Set([
  'ru',
  'uk',
  'es',
  'russian',
  'ukrainian',
  'spanish',
  'trru',
  'truk',
  'tres',
  'textru',
  'textuk',
  'textes',
  'titleru',
  'titleuk',
  'titlees',
  'subtitleru',
  'subtitleuk',
  'subtitlees',
  'labelru',
  'labeluk',
  'labeles',
  'tagru',
  'taguk',
  'tages',
  'descru',
  'descuk',
  'desces',
  'descriptionru',
  'descriptionuk',
  'descriptiones',
  'messageru',
  'messageuk',
  'messagees',
  'nameru',
  'nameuk',
  'namees',
  'explainru',
  'explainuk',
  'explaines',
  'explanations',
  'explanationsuk',
  'explanationses',
  'linesru',
  'linesuk',
  'lineses',
]);

const RESEARCH_SOURCES = [
  {
    id: 'w3c-language-tags',
    title: 'W3C Language Tags and Locale Identifiers',
    url: 'https://www.w3.org/TR/ltli/',
    use: 'Pick and document canonical BCP 47 language tags and region/script variants.',
  },
  {
    id: 'w3c-html-lang',
    title: 'W3C Internationalization: Specifying Language in HTML',
    url: 'https://www.w3.org/International/geo/html-tech/tech-lang.html',
    use: 'Check HTML lang attributes for public web/admin/legal pages.',
  },
  {
    id: 'unicode-cldr',
    title: 'Unicode CLDR Project',
    url: 'https://cldr.unicode.org/',
    use: 'Use standard locale data for names, formats, language matching, and locale conventions.',
  },
  {
    id: 'unicode-plurals',
    title: 'Unicode CLDR Language Plural Rules',
    url: 'https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html',
    use: 'Audit plural categories and example numbers before writing counters or reward copy.',
  },
  {
    id: 'icu-messageformat',
    title: 'ICU MessageFormat Guide',
    url: 'https://unicode-org.github.io/icu/userguide/format_parse/messages/',
    use: 'Prefer whole-message localization with plural/select variants over string concatenation.',
  },
  {
    id: 'fluent',
    title: 'Mozilla Project Fluent',
    url: 'https://projectfluent.org/',
    use: 'Model grammar-sensitive copy: gender, cases, plurals, and translator-owned variants.',
  },
  {
    id: 'cefr',
    title: 'Council of Europe CEFR Companion Volume',
    url: 'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions',
    use: 'Keep lesson and quiz levels aligned with accepted A1-C2 descriptors.',
  },
  {
    id: 'british-council-grammar',
    title: 'British Council LearnEnglish Grammar',
    url: 'https://learnenglish.britishcouncil.org/grammar',
    use: 'Cross-check English grammar explanations and learner exercise wording.',
  },
];

const PRODUCT_SURFACES = new Set([
  'admin-site',
  'app-other',
  'arena',
  'daily-phrase',
  'legal',
  'lessons',
  'personal-training',
  'progression-daily-rewards',
  'public-web',
  'quizzes',
  'ui-locale',
]);

const SPANISH_STUDY_TARGET_ISOLATED_FILES = new Set([
  'app/(tabs)/settings.tsx',
  'app/config.ts',
  'app/flashcards_collection.tsx',
  'app/flashcards_swipe.tsx',
  'app/lesson1.tsx',
  'app/lesson1_smart_options.ts',
  'app/lesson_data_all.ts',
  'app/lesson_intro_screens.tsx',
  'app/lesson_locale_utils.ts',
  'app/pack_opening.tsx',
  'app/phrase_target_utils.ts',
  'app/review.tsx',
  'app/spanish_content_gate.ts',
  'app/study_target_lang_dev.ts',
  'components/StudyTargetContext.tsx',
]);

const TEXT_FIELD_MARKER_BASES = [
  'answer',
  'badge',
  'body',
  'copy',
  'correctAnswer',
  'cta',
  'desc',
  'description',
  'empty',
  'error',
  'example',
  'explain',
  'explanation',
  'explanations',
  'feedback',
  'fullLabel',
  'header',
  'hint',
  'label',
  'line',
  'lines',
  'literal',
  'meaning',
  'message',
  'name',
  'note',
  'option',
  'options',
  'placeholder',
  'prompt',
  'question',
  'rank',
  'reward',
  'screen',
  'section',
  'short',
  'sub',
  'subtitle',
  'tab',
  'tag',
  'text',
  'tier',
  'title',
  'tr',
  'translation',
  'usageNote',
  'warning',
];

const TEXT_FIELD_MARKER_BASE_PATTERN = TEXT_FIELD_MARKER_BASES.join('|');
const FIELD_MARKER_REGEX = {
  ru: new RegExp(`\\b(?:(?:${TEXT_FIELD_MARKER_BASE_PATTERN})(?:RU|Ru)|(?:${TEXT_FIELD_MARKER_BASE_PATTERN})_ru|russian)\\b`, 'g'),
  uk: new RegExp(`\\b(?:(?:${TEXT_FIELD_MARKER_BASE_PATTERN})(?:UK|Uk)|(?:${TEXT_FIELD_MARKER_BASE_PATTERN})_uk|ukrainian)\\b`, 'g'),
  es: new RegExp(`\\b(?:(?:${TEXT_FIELD_MARKER_BASE_PATTERN})(?:ES|Es)|(?:${TEXT_FIELD_MARKER_BASE_PATTERN})_es|spanish)\\b`, 'g'),
};

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function normalizeLocale(input) {
  const raw = String(input || '').trim();
  if (!raw) throw new Error('Missing locale. Pass --lang fr, --lang fr-FR, etc.');
  try {
    return Intl.getCanonicalLocales(raw)[0];
  } catch (_err) {
    throw new Error(`Invalid BCP 47 locale: ${raw}`);
  }
}

function localeSlug(locale) {
  return normalizeLocale(locale).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function shouldSkipRelative(rel) {
  const normalized = normalizePath(rel);
  if (!normalized || normalized === '.') return false;
  if (SKIP_PATH_PARTS.some((part) => normalized === part || normalized.startsWith(`${part}/`))) {
    return true;
  }
  return normalized.split('/').some((part) => SKIP_DIRS.has(part));
}

function isTextFile(rel) {
  return TEXT_EXTENSIONS.has(path.extname(rel).toLowerCase());
}

function isCodeFile(rel) {
  return CODE_EXTENSIONS.has(path.extname(rel).toLowerCase());
}

function listRepoFiles(root) {
  const out = [];
  function walk(absDir, relDir) {
    const entries = fs.readdirSync(absDir, { withFileTypes: true });
    for (const entry of entries) {
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (shouldSkipRelative(rel)) continue;
      const abs = path.join(absDir, entry.name);
      if (entry.isDirectory()) {
        walk(abs, rel);
      } else if (entry.isFile() && isTextFile(rel)) {
        out.push(normalizePath(rel));
      }
    }
  }
  walk(root, '');
  return out.sort((a, b) => a.localeCompare(b));
}

function classifySurface(rel) {
  const file = normalizePath(rel);
  if (file === 'app/idioms_data.ts' || file === 'admin/daily_phrases_seed.json') return 'daily-phrase';
  if (/^app\/lesson_data|^app\/lesson_intro|^app\/lesson_help|^constants\/lessons\.ts/.test(file)) {
    return 'lessons';
  }
  if (/^app\/quiz|^app\/quizzes|^assets\/arena_questions_/.test(file)) return 'quizzes';
  if (/^app\/diagnosis_training|^app\/personal_training|^admin\/personal-trainings|^tools\/personal_training_agent_room/.test(file)) {
    return 'personal-training';
  }
  if (/^constants\/.*i18n|^constants\/.*locale|^components\/LangContext|^constants\/i18n\.ts/.test(file)) {
    return 'ui-locale';
  }
  if (/^app\/daily_tasks|^constants\/streak_stats_i18n|^app\/streak_stats|^app\/level_gift|^components\/LevelGift/.test(file)) {
    return 'progression-daily-rewards';
  }
  if (/^app\/arena|^constants\/arena|^components\/Arena/.test(file)) return 'arena';
  if (/^admin\//.test(file)) return 'admin-site';
  if (/^knowly-www\/|^invite\//.test(file)) return 'public-web';
  if (/^legal\//.test(file)) return 'legal';
  if (/^tests\//.test(file)) return 'tests';
  if (/^docs\//.test(file)) return 'docs';
  if (/^exports\//.test(file)) return 'docs';
  if (/^scripts\/|^tools\//.test(file)) return 'scripts-tools';
  return 'app-other';
}

function countRegex(text, rx) {
  const matches = text.match(rx);
  return matches ? matches.length : 0;
}

function isExplicitLocaleKey(name) {
  if (!name) return false;
  const raw = String(name);
  const lower = raw.toLowerCase();
  if (LOCALIZED_KEY_EXACT.has(lower)) return true;
  if (/(^|[_-])(ru|uk|es)$/i.test(raw)) return true;
  if (/(RU|UK|ES)$/.test(raw)) return true;
  if (/(Ru|Uk|Es)$/.test(raw)) return true;
  return false;
}

function inferExactLocaleKey(name) {
  const raw = String(name || '').trim();
  if (!raw) return null;
  return LOCALE_KEY_ALIASES.get(raw.toLowerCase()) || null;
}

function inferLocaleContainerKey(name, rel, parentKeyPath) {
  const locale = inferExactLocaleKey(name);
  if (!locale) return null;
  if (!AMBIGUOUS_EXACT_LOCALE_KEYS.has(locale)) return locale;
  const context = `${normalizePath(rel || '')}:${parentKeyPath || ''}`;
  if (locale === 'id' && normalizePath(rel || '') === 'constants/i18n.ts' && !parentKeyPath) return locale;
  if (/sourceLocales|quiz_source_locale_payloads/i.test(context)) return locale;
  return null;
}

function inferDirectLocaleFieldKey(name, rel, parentKeyPath) {
  const locale = inferExactLocaleKey(name);
  if (!locale) return null;
  const file = normalizePath(rel || '');
  const parent = String(parentKeyPath || '');
  const context = `${file}:${parent}`;
  if (/sourceLocales|quiz_source_locale_payloads/i.test(context)) return locale;
  if (file === 'app/irregular_verbs_data.ts' && IRREGULAR_VERB_BASES.includes(parent)) return locale;
  return null;
}

function inferLocaleFromKey(name, contextLocale) {
  if (contextLocale) return contextLocale;
  const raw = String(name || '');
  const lower = raw.toLowerCase();
  const exactLocale = inferExactLocaleKey(raw);
  if (exactLocale) return exactLocale;
  if (lower === 'ru' || lower.endsWith('ru') || lower === 'russian') return 'ru';
  if (lower === 'uk' || lower.endsWith('uk') || lower === 'ukrainian') return 'uk';
  if (lower === 'es' || lower.endsWith('es') || lower === 'spanish') return 'es';
  if (lower === 'explanations') return 'ru';
  return null;
}

function propertyName(node) {
  if (!node) return '';
  if (ts && ts.isIdentifier(node)) return node.text;
  if (ts && ts.isStringLiteral(node)) return node.text;
  if (ts && ts.isNumericLiteral(node)) return node.text;
  return '';
}

function stringValue(node) {
  if (!ts || !node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function objectLiteralSimplePropertyValue(node, keyName) {
  if (!ts || !node || !ts.isObjectLiteralExpression(node)) return null;
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (propertyName(prop.name) !== keyName) continue;
    const literal = prop.initializer;
    if (ts.isStringLiteral(literal) || ts.isNoSubstitutionTemplateLiteral(literal) || ts.isNumericLiteral(literal)) {
      return literal.text;
    }
    return null;
  }
  return null;
}

function containsStringLike(node) {
  if (!ts || !node) return false;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) return true;
  let found = false;
  ts.forEachChild(node, (child) => {
    if (!found && containsStringLike(child)) found = true;
  });
  return found;
}

function translatableExpressionText(node, sf) {
  const direct = stringValue(node);
  if (direct !== null) return direct;
  if (!ts || !node) return null;
  if (
    ts.isTemplateExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isConditionalExpression(node)
  ) {
    if (!containsStringLike(node)) return null;
    const raw = node.getText(sf);
    return raw.length <= 1200 ? raw : `${raw.slice(0, 1200)}...`;
  }
  return null;
}

function sourceKindForRel(rel) {
  const ext = path.extname(rel).toLowerCase();
  if (!ts) return null;
  if (ext === '.tsx' || ext === '.jsx') return ts.ScriptKind.TSX;
  if (ext === '.ts') return ts.ScriptKind.TS;
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') return ts.ScriptKind.JS;
  return null;
}

function positionOf(sf, node) {
  const pos = node.getStart ? node.getStart(sf) : node.pos;
  const loc = sf.getLineAndCharacterOfPosition(Math.max(0, pos));
  return { line: loc.line + 1, column: loc.character + 1 };
}

function makeStableId(rel, line, fieldPath, index) {
  const suffix = index === undefined ? '' : `[${index}]`;
  return `${normalizePath(rel)}:${line}:${fieldPath}${suffix}`;
}

function addLocalizedItem(items, seen, rel, surface, sf, node, fieldPath, value, locale, sourceKind) {
  if (typeof value !== 'string') return;
  if (!value.trim()) return;
  const pos = positionOf(sf, node);
  const id = makeStableId(rel, pos.line, fieldPath);
  if (seen.has(id)) return;
  seen.add(id);
  items.push({
    id,
    file: normalizePath(rel),
    surface,
    line: pos.line,
    column: pos.column,
    keyPath: fieldPath,
    locale,
    sourceKind,
    text: value,
    textLength: value.length,
  });
}

function collectObjectStrings(items, seen, rel, surface, sf, node, locale, prefix) {
  if (!ts || !node) return;
  if (ts.isObjectLiteralExpression(node)) {
    for (const prop of node.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const key = propertyName(prop.name);
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      const direct = translatableExpressionText(prop.initializer, sf);
      if (direct !== null) {
        addLocalizedItem(items, seen, rel, surface, sf, prop.initializer, nextPrefix, direct, locale, 'locale-pack');
        continue;
      }
      if (ts.isArrayLiteralExpression(prop.initializer)) {
        prop.initializer.elements.forEach((element, index) => {
          const val = stringValue(element);
          if (val !== null) {
            addLocalizedItem(
              items,
              seen,
              rel,
              surface,
              sf,
              element,
              `${nextPrefix}[${index}]`,
              val,
              locale,
              'locale-pack-array',
            );
          } else if (ts.isObjectLiteralExpression(element)) {
            collectObjectStrings(items, seen, rel, surface, sf, element, locale, `${nextPrefix}[${index}]`);
          }
        });
        continue;
      }
      if (ts.isObjectLiteralExpression(prop.initializer)) {
        collectObjectStrings(items, seen, rel, surface, sf, prop.initializer, locale, nextPrefix);
      }
    }
  }
}

function collectLocalePayloadCall(items, seen, rel, surface, sf, node, locale, prefix) {
  if (!ts || !node || !ts.isCallExpression(node)) return false;
  const [promptArg, explanationsArg] = node.arguments;
  const prompt = translatableExpressionText(promptArg, sf);
  let found = false;
  if (prompt !== null) {
    addLocalizedItem(items, seen, rel, surface, sf, promptArg, `${prefix}.prompt`, prompt, locale, 'locale-payload-call');
    found = true;
  }
  if (explanationsArg && ts.isArrayLiteralExpression(explanationsArg)) {
    explanationsArg.elements.forEach((element, index) => {
      const val = stringValue(element);
      if (val !== null) {
        addLocalizedItem(
          items,
          seen,
          rel,
          surface,
          sf,
          element,
          `${prefix}.explanations[${index}]`,
          val,
          locale,
          'locale-payload-call-array',
        );
        found = true;
      }
    });
  }
  return found;
}

function extractLocalizedItemsFromText(rel, text) {
  const items = [];
  const seen = new Set();
  const surface = classifySurface(rel);
  if (!ts || !isCodeFile(rel)) return items;
  const kind = sourceKindForRel(rel);
  if (!kind) return items;
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, kind);

  function walk(node, pathParts = []) {
    if (ts.isArrayLiteralExpression(node)) {
      node.elements.forEach((element, index) => {
        const stableId = ts.isObjectLiteralExpression(element)
          ? objectLiteralSimplePropertyValue(element, 'id')
          : null;
        const part = stableId ? `id:${stableId}` : `[${index}]`;
        walk(element, [...pathParts, part]);
      });
      return;
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const variableLocale = {
        RU: 'ru',
        UK: 'uk',
        ES: 'es',
        PT_BR: 'pt-BR',
        PTBR: 'pt-BR',
        VI: 'vi',
        ID: 'id',
        TR: 'tr',
        PL: 'pl',
      }[node.name.text];
      if (variableLocale && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
        collectObjectStrings(items, seen, rel, surface, sf, node.initializer, variableLocale, node.name.text);
        return;
      }
    }

    if (ts.isPropertyAssignment(node)) {
      const key = propertyName(node.name);
      const nextPathParts = key ? [...pathParts, key] : pathParts;
      const fieldPath = nextPathParts.join('.');
      const keyLocale = inferLocaleContainerKey(key, rel, pathParts.join('.'));
      if (keyLocale && ts.isObjectLiteralExpression(node.initializer)) {
        collectObjectStrings(items, seen, rel, surface, sf, node.initializer, keyLocale, fieldPath);
        return;
      }
      if (keyLocale && collectLocalePayloadCall(items, seen, rel, surface, sf, node.initializer, keyLocale, fieldPath)) {
        return;
      }

      const directLocale = inferDirectLocaleFieldKey(key, rel, pathParts.join('.')) ||
        (isExplicitLocaleKey(key) ? inferLocaleFromKey(key, null) : null);
      if (directLocale) {
        const direct = translatableExpressionText(node.initializer, sf);
        if (direct !== null) {
          addLocalizedItem(
            items,
            seen,
            rel,
            surface,
            sf,
            node.initializer,
            fieldPath,
            direct,
            directLocale,
            'localized-field',
          );
          return;
        }
        if (ts.isArrayLiteralExpression(node.initializer)) {
          node.initializer.elements.forEach((element, index) => {
            const val = stringValue(element);
            if (val !== null) {
              addLocalizedItem(
                items,
                seen,
                rel,
                surface,
                sf,
                element,
                `${fieldPath}[${index}]`,
                val,
                directLocale,
                'localized-array',
              );
            }
          });
          return;
        }
      }
      ts.forEachChild(node, (child) => walk(child, nextPathParts));
      return;
    }
    ts.forEachChild(node, (child) => walk(child, pathParts));
  }

  walk(sf);
  return items.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.keyPath.localeCompare(b.keyPath));
}

function recurseJsonStrings(out, rel, surface, value, keyPath, localeContext) {
  if (typeof value === 'string') {
    const key = keyPath.split('.').pop() || '';
    const locale = inferLocaleFromKey(key, localeContext);
    if (localeContext || isExplicitLocaleKey(key)) {
      out.push({
        id: `${rel}:json:${keyPath}`,
        file: normalizePath(rel),
        surface,
        line: 0,
        column: 0,
        keyPath,
        locale,
        sourceKind: 'json',
        text: value,
        textLength: value.length,
      });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => recurseJsonStrings(out, rel, surface, entry, `${keyPath}[${index}]`, localeContext));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const nextLocale = inferLocaleContainerKey(key, rel, keyPath) || localeContext;
      recurseJsonStrings(out, rel, surface, child, keyPath ? `${keyPath}.${key}` : key, nextLocale);
    }
  }
}

function extractJsonItemsFromText(rel, text) {
  const out = [];
  try {
    const parsed = JSON.parse(text);
    recurseJsonStrings(out, rel, classifySurface(rel), parsed, '', null);
  } catch (_err) {
    return out;
  }
  return out;
}

function readFileText(root, rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function inventoryFiles(root, files) {
  const summaries = [];
  const totals = {
    filesScanned: 0,
    bytesScanned: 0,
    localizedItems: 0,
    bySurface: {},
    byLocale: {},
    markers: {},
  };
  const allItems = [];

  for (const rel of files) {
    const abs = path.join(root, rel);
    let text = '';
    try {
      text = fs.readFileSync(abs, 'utf8');
    } catch (_err) {
      continue;
    }
    const ext = path.extname(rel).toLowerCase();
    const surface = classifySurface(rel);
    const markers = {
      triLang: countRegex(text, /\btriLang\s*\(/g),
      useLang: countRegex(text, /\buseLang\s*\(/g),
      legacyRuUk: countRegex(text, /\blegacyRuUk\b/g),
      bundleLang: countRegex(text, /\bbundleLang\b/g),
      reportRussianOnly: countRegex(text, /\bREPORT_SCREENS_RUSSIAN_ONLY\s*=\s*true\b/g),
      localeTriples: countRegex(text, /\b(?:ru|uk|es)\s*:/g),
      ruFields: countRegex(text, FIELD_MARKER_REGEX.ru),
      ukFields: countRegex(text, FIELD_MARKER_REGEX.uk),
      esFields: countRegex(text, FIELD_MARKER_REGEX.es),
      enableSpanishLocale: countRegex(text, /\bENABLE_SPANISH_LOCALE\b/g),
      enableDevStudyTargetLang: countRegex(text, /\bENABLE_DEV_STUDY_TARGET_LANG\b/g),
      studyTargetLang: countRegex(text, /\bStudyTargetLang\b/g),
      spanishStudyActive: countRegex(text, /\bspanishStudyActive\b/g),
      spanishLessonUiStringsActive: countRegex(text, /\bspanishLessonUiStringsActive\b/g),
      flashcardContentLang: countRegex(text, /\bflashcardContentLang\b/g),
      stringsForLang: countRegex(text, /\bstringsForLang\b/g),
      langTypeUnion: countRegex(text, /Lang\s*=\s*['"]ru['"]\s*\|\s*['"]uk['"]\s*\|\s*['"]es['"]/g),
      cyrillicText: countRegex(text, /[\u0400-\u04FF]/g),
      latinAccentText: countRegex(text, /[ÁÉÍÓÚÜÑáéíóúüñ¿¡ÀÂÆÇÈÉÊËÎÏÔŒÙÛÜŸàâæçèéêëîïôœùûüÿ]/g),
    };
    let items = [];
    if (ext === '.json') {
      items = extractJsonItemsFromText(rel, text);
    } else if (isCodeFile(rel)) {
      items = extractLocalizedItemsFromText(rel, text);
    }
    for (const item of items) {
      totals.byLocale[item.locale || 'unknown'] = (totals.byLocale[item.locale || 'unknown'] || 0) + 1;
    }
    totals.bySurface[surface] = (totals.bySurface[surface] || 0) + 1;
    for (const [key, value] of Object.entries(markers)) {
      totals.markers[key] = (totals.markers[key] || 0) + value;
    }
    totals.filesScanned += 1;
    totals.bytesScanned += Buffer.byteLength(text, 'utf8');
    totals.localizedItems += items.length;
    allItems.push(...items);
    summaries.push({
      file: rel,
      surface,
      extension: ext,
      bytes: Buffer.byteLength(text, 'utf8'),
      localizedItems: items.length,
      markers,
    });
  }

  summaries.sort((a, b) => b.localizedItems - a.localizedItems || a.file.localeCompare(b.file));
  allItems.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.keyPath.localeCompare(b.keyPath));

  return { totals, files: summaries, items: allItems };
}

function guardReport(inventory, targetLocale) {
  const canonical = normalizeLocale(targetLocale);
  const slug = localeSlug(canonical);
  const baseLang = canonical.split('-')[0].toLowerCase();
  const collisionPatterns = [
    new RegExp(`\\b${baseLang}\\s*:`, 'i'),
    new RegExp(`\\b${baseLang.toUpperCase()}\\b`),
    new RegExp(`\\b${slug}\\b`, 'i'),
  ];
  const collisions = [];
  const pathLocaleMarker = new RegExp(`(^|[\\/_.-])${baseLang}([\\/_.-]|$)`, 'i');
  for (const file of inventory.files) {
    const markerHit = pathLocaleMarker.test(file.file);
    if (markerHit) {
      collisions.push({ file: file.file, kind: 'path-locale-marker' });
    }
  }
  const isActiveInterfaceLocale = ACTIVE_APP_LOCALES.includes(canonical) || ACTIVE_APP_LOCALES.includes(baseLang);
  const isPlannedInterfaceLocale = PLANNED_APP_LOCALES.includes(canonical) || PLANNED_APP_LOCALES.includes(baseLang);
  const targetInterfaceStatus = isActiveInterfaceLocale
    ? 'active'
    : isPlannedInterfaceLocale
      ? 'planned'
      : 'missing';
  const knownLocaleConflict = isActiveInterfaceLocale;
  const integrationBlockers = [
    ...(targetInterfaceStatus === 'missing'
      ? ['Target locale is not registered as a selectable app interface/source locale yet.']
      : []),
  ];
  return {
    targetLocale: canonical,
    targetBaseLang: baseLang,
    targetInterfaceStatus,
    knownLocaleConflict,
    targetRegisteredAsAppLocale: targetInterfaceStatus !== 'missing',
    integrationBlockers,
    collisionPatternCount: collisionPatterns.length,
    pathCollisions: collisions,
    isolationPolicy: [
      'Do not write generated target-language content into ru/uk/es fields.',
      'Keep target language work under docs/heisenberg/<locale>/ until the integration gate is explicit.',
      'A future apply step must add a new locale registry entry and locale-specific files, never mutate existing locale fields in place.',
      ...(targetInterfaceStatus === 'planned'
        ? ['Target locale is registered as planned/disabled; do not enable it until UI bundle and semantic gates pass.']
        : []),
      'Before integration, run the generated manifest diff and the app test bundle.',
    ],
  };
}

function topFiles(files, limit = 80) {
  return files.slice(0, limit);
}

function summarizeFileRisk(file, reason, extra = {}) {
  return {
    file: file.file,
    surface: file.surface,
    localizedItems: file.localizedItems,
    reason,
    markers: {
      ruFields: file.markers.ruFields || 0,
      ukFields: file.markers.ukFields || 0,
      esFields: file.markers.esFields || 0,
      localeTriples: file.markers.localeTriples || 0,
      triLang: file.markers.triLang || 0,
      legacyRuUk: file.markers.legacyRuUk || 0,
      bundleLang: file.markers.bundleLang || 0,
      reportRussianOnly: file.markers.reportRussianOnly || 0,
      enableSpanishLocale: file.markers.enableSpanishLocale || 0,
      enableDevStudyTargetLang: file.markers.enableDevStudyTargetLang || 0,
      studyTargetLang: file.markers.studyTargetLang || 0,
      spanishStudyActive: file.markers.spanishStudyActive || 0,
      spanishLessonUiStringsActive: file.markers.spanishLessonUiStringsActive || 0,
      flashcardContentLang: file.markers.flashcardContentLang || 0,
      stringsForLang: file.markers.stringsForLang || 0,
      langTypeUnion: file.markers.langTypeUnion || 0,
    },
    ...extra,
  };
}

function sidecarCoverageForFile(file, baseLang, byFileLocale, filesByPath) {
  if (baseLang !== 'es') return null;
  const sourceFile = normalizePath(file.file || '');
  const sidecars = ES_SIDECAR_COVERAGE_FILES[sourceFile] || [];
  if (!sidecars.length) return null;

  const presentSidecars = sidecars.filter((sidecar) => filesByPath.has(sidecar));
  const targetItemCount = presentSidecars.reduce((sum, sidecar) => {
    const counts = byFileLocale[sidecar] || {};
    return sum + (counts[baseLang] || 0);
  }, 0);

  if (!presentSidecars.length || targetItemCount <= 0) return null;
  return {
    file: sourceFile,
    surface: file.surface,
    localizedItems: file.localizedItems,
    reason: `Spanish ${baseLang} coverage is supplied by sidecar locale file(s), not inline fields.`,
    sidecars: presentSidecars,
    targetItemCount,
  };
}

function verifiedExistingLocaleFallbackForFile(file, baseLang) {
  const sourceFile = normalizePath(file.file || '');
  const localeRecords = VERIFIED_EXISTING_LOCALE_FALLBACK_FILES[baseLang] || {};
  const reason = localeRecords[sourceFile];
  if (!reason) return null;
  return summarizeFileRisk(file, reason);
}

function isIsolatedSpanishStudyTargetFile(file) {
  return SPANISH_STUDY_TARGET_ISOLATED_FILES.has(normalizePath(file.file || file));
}

function countItemsBySurface(items, locale) {
  const out = {};
  for (const item of items) {
    if (locale && item.locale !== locale) continue;
    out[item.surface] = (out[item.surface] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => a[0].localeCompare(b[0])));
}

function countItemsByFileAndLocale(items) {
  const out = {};
  for (const item of items) {
    if (!out[item.file]) out[item.file] = {};
    const locale = item.locale || 'unknown';
    out[item.file][locale] = (out[item.file][locale] || 0) + 1;
  }
  return out;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeCoverageKeyPath(keyPath, locale) {
  let out = String(keyPath || '');
  const protectedSegments = [];
  out = out.replace(/\.verbs\.tr$/i, (match) => {
    const token = `.__heisenberg_protected_field_${protectedSegments.length}__`;
    protectedSegments.push([token, match]);
    return token;
  });
  const aliases = [locale, locale.replace(/-/g, '_')].filter(Boolean);
  for (const alias of aliases) {
    const escaped = escapeRegExp(alias);
    out = out.replace(new RegExp(`(^|\\.)${escaped}(?=\\.|\\[|$)`, 'gi'), '$1<locale>');
  }
  out = out
    .replace(/(RU|UK|ES)(?=\.|\[|$)/g, '<locale>')
    .replace(/(Ru|Uk|Es)(?=\.|\[|$)/g, '<locale>')
    .replace(/_(ru|uk|es)(?=\.|\[|$)/gi, '_<locale>');
  for (const [token, value] of protectedSegments) out = out.replace(token, value.toLowerCase());
  return out;
}

function normalizeExpectedCoverageUnits(expectedUnits, requiredLocales) {
  if (expectedUnits === false) return [];
  const rawUnits = Array.isArray(expectedUnits) ? expectedUnits : BATCH_COVERAGE_CONTRACTS;
  const units = [];
  const seen = new Set();

  for (const unit of rawUnits) {
    if (!unit || !unit.file || !unit.keyPath) continue;
    const file = normalizePath(unit.file);
    const keyPath = String(unit.keyPath).includes('<locale>')
      ? String(unit.keyPath)
      : normalizeCoverageKeyPath(String(unit.keyPath), requiredLocales[0] || 'es');
    const key = `${file}:${keyPath}`;
    if (seen.has(key)) continue;
    seen.add(key);
    units.push({
      file,
      surface: unit.surface || classifySurface(file),
      keyPath,
      locales: Array.isArray(unit.locales) && unit.locales.length
        ? Array.from(new Set(unit.locales.map((locale) => inferExactLocaleKey(locale) || normalizeLocale(locale))))
        : requiredLocales,
    });
  }

  return units;
}

function buildBatchLocaleCoverageAudit(inventory, locales = STRUCTURED_BATCH_SOURCE_LOCALES, options = {}) {
  const genericRequiredLocales = Array.from(new Set(locales.map((locale) => inferExactLocaleKey(locale) || normalizeLocale(locale))));
  const productOnly = options.productOnly !== false;
  const maxGaps = Number(options.maxGaps || 500);
  const expectedUnits = normalizeExpectedCoverageUnits(options.expectedUnits, genericRequiredLocales);
  const requiredLocales = Array.from(
    new Set([
      ...genericRequiredLocales,
      ...expectedUnits.flatMap((unit) => unit.locales || genericRequiredLocales),
    ]),
  );
  const requiredSet = new Set(requiredLocales);
  const items = (inventory.items || []).filter((item) => {
    if (!requiredSet.has(item.locale)) return false;
    return !productOnly || PRODUCT_SURFACES.has(item.surface);
  });

  const groups = new Map();
  for (const item of items) {
    const normalizedKeyPath = normalizeCoverageKeyPath(item.keyPath, item.locale);
    const groupKey = `${item.file}:${normalizedKeyPath}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        file: item.file,
        surface: item.surface,
        keyPath: normalizedKeyPath,
        lineByLocale: {},
        textByLocale: {},
        localesPresent: new Set(),
      });
    }
    const group = groups.get(groupKey);
    group.localesPresent.add(item.locale);
    if (group.lineByLocale[item.locale] === undefined) group.lineByLocale[item.locale] = item.line;
    if (group.textByLocale[item.locale] === undefined) group.textByLocale[item.locale] = item.text;
  }

  const partialUnits = [];
  const missingByLocale = Object.fromEntries(requiredLocales.map((locale) => [locale, 0]));
  const expectedGroupKeys = new Set(expectedUnits.map((unit) => `${unit.file}:${unit.keyPath}`));
  for (const group of groups.values()) {
    const groupKey = `${group.file}:${group.keyPath}`;
    if (expectedGroupKeys.has(groupKey)) continue;
    const present = genericRequiredLocales.filter((locale) => group.localesPresent.has(locale));
    const missing = genericRequiredLocales.filter((locale) => !group.localesPresent.has(locale));
    if (present.length > 0 && missing.length > 0) {
      for (const locale of missing) missingByLocale[locale] += 1;
      partialUnits.push({
        file: group.file,
        surface: group.surface,
        keyPath: group.keyPath,
        present,
        missing,
        lineByLocale: group.lineByLocale,
      });
    }
  }

  const missingAllLocaleUnits = [];
  const missingAllByLocale = Object.fromEntries(requiredLocales.map((locale) => [locale, 0]));
  for (const expected of expectedUnits) {
    const groupKey = `${expected.file}:${expected.keyPath}`;
    const expectedLocales = expected.locales || genericRequiredLocales;
    const group = groups.get(groupKey);
    if (group) {
      const present = expectedLocales.filter((locale) => group.localesPresent.has(locale));
      const missing = expectedLocales.filter((locale) => !group.localesPresent.has(locale));
      if (present.length > 0 && missing.length > 0) {
        for (const locale of missing) missingByLocale[locale] += 1;
        partialUnits.push({
          file: group.file,
          surface: group.surface,
          keyPath: group.keyPath,
          present,
          missing,
          lineByLocale: group.lineByLocale,
        });
      }
      continue;
    }
    for (const locale of expectedLocales) missingAllByLocale[locale] += 1;
    missingAllLocaleUnits.push({
      file: expected.file,
      surface: expected.surface,
      keyPath: expected.keyPath,
      present: [],
      missing: expectedLocales,
    });
  }

  partialUnits.sort(
    (a, b) =>
      b.missing.length - a.missing.length ||
      a.file.localeCompare(b.file) ||
      a.keyPath.localeCompare(b.keyPath),
  );
  missingAllLocaleUnits.sort((a, b) => a.file.localeCompare(b.file) || a.keyPath.localeCompare(b.keyPath));

  const fileCoverage = {};
  for (const item of items) {
    if (!fileCoverage[item.file]) {
      fileCoverage[item.file] = {
        file: item.file,
        surface: item.surface,
        localesPresent: new Set(),
      };
    }
    fileCoverage[item.file].localesPresent.add(item.locale);
  }

  const partialFiles = Object.values(fileCoverage)
    .map((file) => {
      const present = genericRequiredLocales.filter((locale) => file.localesPresent.has(locale));
      const missing = genericRequiredLocales.filter((locale) => !file.localesPresent.has(locale));
      return { file: file.file, surface: file.surface, present, missing };
    })
    .filter((file) => file.present.length > 0 && file.missing.length > 0)
    .sort((a, b) => b.missing.length - a.missing.length || a.file.localeCompare(b.file));

  return {
    mode: 'batch-locale-coverage',
    requiredLocales,
    productOnly,
    summary: {
      localizedItemsChecked: items.length,
      expectedUnits: expectedUnits.length,
      completeUnits: groups.size - partialUnits.length,
      partialUnits: partialUnits.length,
      missingAllLocaleUnits: missingAllLocaleUnits.length,
      partialFiles: partialFiles.length,
      missingByLocale,
      missingAllByLocale,
    },
    partialFiles: partialFiles.slice(0, maxGaps),
    partialUnits: partialUnits.slice(0, maxGaps),
    missingAllLocaleUnits: missingAllLocaleUnits.slice(0, maxGaps),
    truncated: partialUnits.length > maxGaps || partialFiles.length > maxGaps || missingAllLocaleUnits.length > maxGaps,
  };
}

function missingTargetSourceItems(inventory, targetLocale) {
  const canonical = normalizeLocale(targetLocale);
  const baseLang = canonical.split('-')[0].toLowerCase();
  const sourceLocales = KNOWN_APP_LOCALES.filter((locale) => locale !== baseLang);
  const byFileLocale = countItemsByFileAndLocale(inventory.items || []);
  const productionFiles = inventory.files.filter((file) => PRODUCT_SURFACES.has(file.surface));
  const gapFiles = new Set();

  for (const file of productionFiles) {
    const counts = byFileLocale[file.file] || {};
    const sourceItemCount = sourceLocales.reduce((sum, locale) => sum + (counts[locale] || 0), 0);
    const targetItemCount = counts[baseLang] || 0;
    if (sourceItemCount > 0 && targetItemCount === 0) {
      gapFiles.add(file.file);
    }
  }

  return (inventory.items || []).filter(
    (item) =>
      gapFiles.has(item.file) &&
      sourceLocales.includes(item.locale) &&
      PRODUCT_SURFACES.has(item.surface),
  );
}

function buildExistingLocaleAudit(inventory, targetLocale) {
  const canonical = normalizeLocale(targetLocale);
  const baseLang = canonical.split('-')[0].toLowerCase();
  const targetIsKnownAppLocale = KNOWN_APP_LOCALES.includes(baseLang);
  const sourceLocales = KNOWN_APP_LOCALES.filter((locale) => locale !== baseLang);
  const fieldMarkerByLocale = { ru: 'ruFields', uk: 'ukFields', es: 'esFields' };
  const targetFieldMarker = fieldMarkerByLocale[baseLang];
  const sourceFieldMarkers = sourceLocales.map((locale) => fieldMarkerByLocale[locale]).filter(Boolean);
  const byFileLocale = countItemsByFileAndLocale(inventory.items || []);
  const productionFiles = inventory.files.filter((file) => PRODUCT_SURFACES.has(file.surface));
  const filesByPath = new Map(inventory.files.map((file) => [normalizePath(file.file), file]));
  const sidecarCoverageByFile = new Map(
    productionFiles
      .map((file) => sidecarCoverageForFile(file, baseLang, byFileLocale, filesByPath))
      .filter(Boolean)
      .map((coverage) => [coverage.file, coverage]),
  );

  const fieldCoverageGaps = productionFiles
    .map((file) => {
      const sourceFieldCount = sourceFieldMarkers.reduce((sum, marker) => sum + (file.markers[marker] || 0), 0);
      const targetFieldCount = targetFieldMarker ? file.markers[targetFieldMarker] || 0 : 0;
      return { file, sourceFieldCount, targetFieldCount };
    })
    .filter(
      ({ file, sourceFieldCount, targetFieldCount }) =>
        sourceFieldCount > 0 &&
        targetFieldCount === 0 &&
        !sidecarCoverageByFile.has(normalizePath(file.file)),
    )
    .sort((a, b) => b.sourceFieldCount - a.sourceFieldCount || a.file.file.localeCompare(b.file.file))
    .map(({ file, sourceFieldCount }) =>
      summarizeFileRisk(file, `Has ${sourceFieldCount} localized source-language field marker(s), but no ${baseLang.toUpperCase()} field marker.`),
    );

  const itemCoverageGaps = productionFiles
    .map((file) => {
      const counts = byFileLocale[file.file] || {};
      const sourceItemCount = sourceLocales.reduce((sum, locale) => sum + (counts[locale] || 0), 0);
      const targetItemCount = counts[baseLang] || 0;
      return { file, counts, sourceItemCount, targetItemCount };
    })
    .filter(
      ({ file, sourceItemCount, targetItemCount }) =>
        sourceItemCount > 0 &&
        targetItemCount === 0 &&
        !sidecarCoverageByFile.has(normalizePath(file.file)),
    )
    .sort((a, b) => b.sourceItemCount - a.sourceItemCount || a.file.file.localeCompare(b.file.file))
    .map(({ file, counts, sourceItemCount }) =>
      summarizeFileRisk(file, `Extracted ${sourceItemCount} source localized item(s), but no ${baseLang} extracted items.`, {
        localizedItemLocales: counts,
      }),
    );

  const russianOnlyReports = productionFiles
    .filter((file) => (file.markers.reportRussianOnly || 0) > 0)
    .map((file) => summarizeFileRisk(file, 'Report/data screen is explicitly marked Russian-only.'));

  const verifiedFallbackFiles = productionFiles
    .map((file) => verifiedExistingLocaleFallbackForFile(file, baseLang))
    .filter(Boolean)
    .sort((a, b) => a.file.localeCompare(b.file));

  const verifiedFallbackFileSet = new Set(verifiedFallbackFiles.map((file) => normalizePath(file.file)));
  const fallbackRiskFiles = productionFiles
    .filter((file) => (file.markers.legacyRuUk || 0) > 0 || (file.markers.bundleLang || 0) > 0 || (file.markers.stringsForLang || 0) > 0)
    .filter((file) => !verifiedFallbackFileSet.has(normalizePath(file.file)))
    .map((file) => summarizeFileRisk(file, 'Language helper/fallback path present; verify target locale is not silently returning RU.'));

  const productionGateFiles = productionFiles
    .filter((file) => (file.markers.enableSpanishLocale || 0) > 0)
    .map((file) => summarizeFileRisk(file, 'Spanish UI is tied to the old dev-only ENABLE_SPANISH_LOCALE gate.'));

  const studyTargetFiles = productionFiles
    .filter(
      (file) =>
        (file.markers.enableDevStudyTargetLang || 0) > 0 ||
        (file.markers.studyTargetLang || 0) > 0 ||
        (file.markers.spanishStudyActive || 0) > 0 ||
        (file.markers.spanishLessonUiStringsActive || 0) > 0 ||
        (file.markers.flashcardContentLang || 0) > 0,
    )
    .map((file) => summarizeFileRisk(file, 'Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization.'));
  const isolatedStudyTargetFiles = studyTargetFiles
    .filter((file) => isIsolatedSpanishStudyTargetFile(file))
    .map((file) => ({
      ...file,
      reason: 'Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization.',
    }));
  const studyTargetRiskFiles = studyTargetFiles.filter((file) => !isIsolatedSpanishStudyTargetFile(file));

  const targetItemCount = (inventory.totals.byLocale || {})[baseLang] || 0;
  const allLocalizedItems = inventory.totals.localizedItems || 0;
  const targetItemShare = allLocalizedItems ? Number((targetItemCount / allLocalizedItems).toFixed(4)) : 0;
  const sidecarCoverageFiles = [...sidecarCoverageByFile.values()].sort((a, b) => a.file.localeCompare(b.file));

  return {
    targetLocale: canonical,
    targetBaseLang: baseLang,
    mode: targetIsKnownAppLocale ? 'existing-locale-production-audit' : 'new-locale-preflight',
    targetIsKnownAppLocale,
    targetIsInterfaceSourceLanguage: true,
    studyTargetMustRemain: 'en',
    summary: {
      filesScanned: inventory.totals.filesScanned,
      localizedItems: allLocalizedItems,
      localizedItemsByLocale: inventory.totals.byLocale,
      targetLocalizedItems: targetItemCount,
      targetLocalizedItemShare: targetItemShare,
      targetItemsBySurface: countItemsBySurface(inventory.items || [], baseLang),
      fieldCoverageGapFiles: fieldCoverageGaps.length,
      itemCoverageGapFiles: itemCoverageGaps.length,
      sidecarCoverageFiles: sidecarCoverageFiles.length,
      russianOnlyReportFiles: russianOnlyReports.length,
      fallbackRiskFiles: fallbackRiskFiles.length,
      verifiedFallbackFiles: verifiedFallbackFiles.length,
      productionGateFiles: productionGateFiles.length,
      isolatedStudyTargetFiles: isolatedStudyTargetFiles.length,
      studyTargetRiskFiles: studyTargetRiskFiles.length,
      studyTargetConfusionFiles: studyTargetFiles.length,
    },
    policy: [
      `${canonical} is treated as an interface/explanation source language for learning English.`,
      'Do not switch, generate, or expose a studied Spanish course in this run.',
      'The study target stays `en`; any `StudyTargetLang = es` code is a separate dev-only feature and must not drive this localization.',
      'Generated audit output is isolated under docs/heisenberg/<locale>/<run>; no production content is overwritten.',
      'Before enabling the locale in production, every UI surface must have an explicit target-language branch or an intentional fallback record.',
    ],
    blockers: [
      ...(targetIsKnownAppLocale ? [] : ['Target locale is not registered as an app UI locale yet.']),
      ...(productionGateFiles.length ? ['Spanish UI is currently behind the old ENABLE_SPANISH_LOCALE gate.'] : []),
      ...(fieldCoverageGaps.length ? ['Some localized RU/UK field contracts have no ES field marker.'] : []),
      ...(itemCoverageGaps.length ? ['Some extracted RU/UK localized items have no extracted ES counterpart.'] : []),
      ...(studyTargetRiskFiles.length ? ['Some non-isolated files contain Spanish study-target logic; these must not drive UI Spanish.'] : []),
    ],
    risks: {
      fieldCoverageGaps: topFiles(fieldCoverageGaps),
      itemCoverageGaps: topFiles(itemCoverageGaps),
      sidecarCoverageFiles: topFiles(sidecarCoverageFiles),
      russianOnlyReports: topFiles(russianOnlyReports),
      fallbackRiskFiles: topFiles(fallbackRiskFiles),
      verifiedFallbackFiles: topFiles(verifiedFallbackFiles),
      productionGateFiles: topFiles(productionGateFiles),
      isolatedStudyTargetFiles: topFiles(isolatedStudyTargetFiles),
      studyTargetRiskFiles: topFiles(studyTargetRiskFiles),
      studyTargetConfusionFiles: topFiles(studyTargetFiles),
    },
  };
}

function buildExistingLocaleAuditMarkdown(audit) {
  const lines = [];
  lines.push(`# Existing locale audit: ${audit.targetLocale}`);
  lines.push('');
  lines.push('## Scope');
  lines.push(`- Target locale: \`${audit.targetLocale}\``);
  lines.push('- Role: interface/explanation source language for learning English.');
  lines.push(`- Study target: \`${audit.studyTargetMustRemain}\``);
  lines.push(`- Mode: \`${audit.mode}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push(markdownTable([
    ['Metric', 'Value'],
    ['Files scanned', audit.summary.filesScanned],
    ['Localized items', audit.summary.localizedItems],
    ['Target localized items', audit.summary.targetLocalizedItems],
    ['Target item share', audit.summary.targetLocalizedItemShare],
    ['Field coverage gap files', audit.summary.fieldCoverageGapFiles],
    ['Item coverage gap files', audit.summary.itemCoverageGapFiles],
    ['Resolved sidecar coverage files', audit.summary.sidecarCoverageFiles],
    ['Russian-only report files', audit.summary.russianOnlyReportFiles],
    ['Fallback risk files', audit.summary.fallbackRiskFiles],
    ['Verified fallback files', audit.summary.verifiedFallbackFiles],
    ['Production gate files', audit.summary.productionGateFiles],
    ['Isolated study-target files', audit.summary.isolatedStudyTargetFiles],
    ['Study-target risk files', audit.summary.studyTargetRiskFiles],
  ]));
  lines.push('');
  lines.push('## Policy');
  for (const rule of audit.policy) lines.push(`- ${rule}`);
  lines.push('');
  lines.push('## Blockers');
  if (audit.blockers.length) {
    for (const blocker of audit.blockers) lines.push(`- ${blocker}`);
  } else {
    lines.push('- No blocking architecture risks detected by the static audit.');
  }
  lines.push('');
  lines.push('## Target items by surface');
  lines.push(markdownTable([
    ['Surface', 'Target items'],
    ...Object.entries(audit.summary.targetItemsBySurface),
  ]));
  lines.push('');

  const riskSections = [
    ['Field Coverage Gaps', audit.risks.fieldCoverageGaps],
    ['Item Coverage Gaps', audit.risks.itemCoverageGaps],
    ['Resolved Sidecar Coverage', audit.risks.sidecarCoverageFiles],
    ['Russian-Only Reports', audit.risks.russianOnlyReports],
    ['Fallback Risk Files', audit.risks.fallbackRiskFiles],
    ['Verified Fallback Files', audit.risks.verifiedFallbackFiles],
    ['Production Gate Files', audit.risks.productionGateFiles],
    ['Isolated Study-Target Files', audit.risks.isolatedStudyTargetFiles],
    ['Study-Target Risk Files', audit.risks.studyTargetRiskFiles],
  ];
  for (const [title, rows] of riskSections) {
    lines.push('');
    lines.push(`## ${title}`);
    if (!rows.length) {
      lines.push('- None detected.');
      continue;
    }
    lines.push(markdownTable([
      ['File', 'Surface', 'Reason'],
      ...rows.slice(0, 30).map((row) => [row.file, row.surface, row.reason]),
    ]));
  }
  lines.push('');
  lines.push('## Next gate');
  lines.push('- Resolve or document every blocker above before turning Spanish UI on in production.');
  lines.push('- Keep Spanish UI/explanations separate from Spanish-as-study-target experiments.');
  lines.push('- Run the Spanish locale test bundle after every integration block.');
  return lines.join('\n');
}

function buildTranslationBlocks(items, targetLocale, options = {}) {
  const blockSize = Number(options.blockSize || 40);
  const canonical = normalizeLocale(targetLocale);
  const baseLang = canonical.split('-')[0].toLowerCase();
  const targetIsKnownAppLocale = KNOWN_APP_LOCALES.includes(baseLang);
  const grouped = new Map();
  for (const item of items) {
    const key = item.surface;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push({
      id: item.id,
      file: item.file,
      line: item.line,
      surface: item.surface,
      keyPath: item.keyPath,
      sourceLocale: item.locale || 'unknown',
      targetLocale: canonical,
      targetSlot: targetIsKnownAppLocale ? `${baseLang}-field-gap` : 'external-locale-workspace',
      sourceText: item.text,
      notes: targetIsKnownAppLocale
        ? [
            `Create or fill only explicit ${baseLang} locale fields/items for this content.`,
            'Do not change existing ru/uk source fields or mix target text into another locale.',
            'Preserve placeholders, punctuation intent, examples, and English grammar terms unless target-language pedagogy requires adaptation.',
          ]
        : [
            'Preserve placeholders, punctuation intent, examples, and English grammar terms unless the target-language pedagogy requires adaptation.',
            'Do not overwrite ru/uk/es source fields.',
          ],
    });
  }
  const blocks = [];
  for (const [surface, rows] of [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    for (let i = 0; i < rows.length; i += blockSize) {
      blocks.push({
        surface,
        index: Math.floor(i / blockSize) + 1,
        totalRows: rows.length,
        rows: rows.slice(i, i + blockSize),
      });
    }
  }
  return blocks;
}

function markdownTable(rows) {
  const body = rows.map((row) => `| ${row.map((cell) => String(cell).replace(/\|/g, '\\|')).join(' | ')} |`);
  return body.join('\n');
}

function buildResearchChecklist(targetLocale, inventory) {
  const canonical = normalizeLocale(targetLocale);
  const lines = [];
  lines.push(`# Heisenberg research checklist: ${canonical}`);
  lines.push('');
  lines.push('## Required external sources');
  for (const source of RESEARCH_SOURCES) {
    lines.push(`- [ ] ${source.title}: ${source.url}`);
    lines.push(`  Use: ${source.use}`);
  }
  lines.push('');
  lines.push('## Target-language research gates');
  lines.push('- [ ] Confirm canonical BCP 47 tag, script, region assumptions, and display name.');
  lines.push('- [ ] Record CLDR plural categories and example numbers for app counters, streaks, shards, minutes, lessons, and questions.');
  lines.push('- [ ] Build a learner-error map for native speakers of this language learning English: articles, tense/aspect, word order, prepositions, pronouns, false friends, phonology where relevant.');
  lines.push('- [ ] Decide whether English grammar terms stay in English, are translated, or use bilingual labels.');
  lines.push('- [ ] Define tone rules for rewards, mistakes, admin warnings, legal copy, and child-safe wording.');
  lines.push('- [ ] Check punctuation, quotation marks, spacing around symbols, decimal/group separators, and capitalization conventions.');
  lines.push('- [ ] Write reviewer notes for each lesson cluster before generating translations.');
  lines.push('- [ ] Cite every grammar/pedagogy decision in the language report before integration.');
  lines.push('');
  lines.push('## Repo inventory summary');
  lines.push(markdownTable([
    ['Surface', 'Files'],
    ...Object.entries(inventory.totals.bySurface).sort((a, b) => a[0].localeCompare(b[0])),
  ]));
  lines.push('');
  lines.push('## Minimum checks after each block');
  lines.push('- [ ] No target text appears in ru/uk/es fields.');
  lines.push('- [ ] Placeholders like {time}, % values, URLs, emoji, and product names are preserved intentionally.');
  lines.push('- [ ] Answer choices still align with explanations and correct indexes.');
  lines.push('- [ ] Lesson intro examples match the target-language explanation.');
  lines.push('- [ ] Personal training rules explain the English mistake for this target-language learner, not just a literal translation.');
  return lines.join('\n');
}

function buildRunbook(targetLocale, outDir) {
  const canonical = normalizeLocale(targetLocale);
  const lines = [];
  lines.push(`# Heisenberg runbook: ${canonical}`);
  lines.push('');
  lines.push('## Command');
  lines.push(`Run again: \`npm run heisenberg -- --lang ${canonical}\``);
  lines.push('');
  lines.push('## Generated files');
  lines.push(`Workspace: \`${normalizePath(outDir)}\``);
  lines.push('- `manifest.json`: machine-readable summary.');
  lines.push('- `inventory.json`: repo file inventory and marker counts.');
  lines.push('- `localized_items.jsonl`: extracted localizable strings and source fields (`localized_items_sample.jsonl` in audit-only runs).');
  lines.push('- `translation_blocks/*.jsonl`: bounded translation/rewrite batches.');
  lines.push('- `research_checklist.md`: source-based research gates.');
  lines.push('- `guard_report.json`: overwrite/mixing safety report.');
  lines.push('- `existing_locale_audit.md/json`: generated when the target already exists as an app locale.');
  lines.push('');
  lines.push('## Integration gate');
  lines.push('Do not integrate target text into app code until all translation blocks, language research notes, and tests are green. The current app has many hard-coded ru/uk/es contracts; Heisenberg keeps the new language isolated first.');
  lines.push('');
  lines.push('## Suggested verification');
  lines.push('- `npm run heisenberg -- --lang <locale> --audit-only`');
  lines.push('- `npm run heisenberg:batch:audit`');
  lines.push('- `npm run heisenberg:batch:audit:strict`');
  lines.push('- `npm run heisenberg:gate`');
  lines.push('- `npm run audit:translations`');
  lines.push('- `npm run lesson:qa:summary`');
  lines.push('- `npm test -- --runTestsByPath tests/heisenberg_pipeline.test.ts tests/locale_ru_uk_es.test.ts tests/quiz_source_locale.test.ts tests/quiz_spanish_locale.test.ts tests/daily_phrase_locale.test.ts --runInBand`');
  lines.push('- `npx tsc --noEmit --pretty false`');
  return lines.join('\n');
}

module.exports = {
  KNOWN_APP_LOCALES,
  ACTIVE_APP_LOCALES,
  PLANNED_APP_LOCALES,
  REGISTERED_INTERFACE_SOURCE_LOCALES,
  DEFAULT_SOURCE_LOCALES,
  HEISENBERG_BATCH_SOURCE_LOCALES,
  STRUCTURED_BATCH_SOURCE_LOCALES,
  STRUCTURED_BATCH_COVERAGE_CONTRACTS,
  DAILY_PHRASE_SOURCE_LOCALE_COVERAGE_CONTRACTS,
  DAILY_PHRASE_ES_COVERAGE_CONTRACTS,
  DAILY_PHRASE_BATCH_COVERAGE_CONTRACTS,
  IRREGULAR_VERB_BASES,
  IRREGULAR_VERB_BATCH_COVERAGE_CONTRACTS,
  BATCH_COVERAGE_CONTRACTS,
  EXTRACTABLE_SOURCE_LOCALES,
  ES_SIDECAR_COVERAGE_FILES,
  VERIFIED_EXISTING_LOCALE_FALLBACK_FILES,
  PRODUCT_SURFACES,
  RESEARCH_SOURCES,
  buildBatchLocaleCoverageAudit,
  buildResearchChecklist,
  buildExistingLocaleAudit,
  buildExistingLocaleAuditMarkdown,
  buildRunbook,
  buildTranslationBlocks,
  classifySurface,
  extractJsonItemsFromText,
  extractLocalizedItemsFromText,
  guardReport,
  inferLocaleFromKey,
  inventoryFiles,
  isExplicitLocaleKey,
  listRepoFiles,
  localeSlug,
  missingTargetSourceItems,
  normalizeLocale,
  normalizePath,
  shouldSkipRelative,
  timestampSlug,
};
