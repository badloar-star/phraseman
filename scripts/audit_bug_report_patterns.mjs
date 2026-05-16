import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STAMP = new Date().toISOString().slice(0, 10);
const REPORT_DIR = path.join(ROOT, 'docs', 'reports');
const WORDS_FILE = path.join(ROOT, 'app', 'lesson_words.tsx');
const THEORY_FILE = path.join(ROOT, 'exports', 'lesson-theory-dump', 'lesson_theory_help.json');
const PHRASES_FILE = path.join(ROOT, 'exports', 'lesson-theory-dump', 'lesson_phrases.json');
const FLAT_TRANSLATIONS_FILE = path.join(ROOT, 'docs', 'reports', 'lessons_translations_flat.json');

const ISSUE_LIMIT = 80;

const read = (file) => fs.readFileSync(file, 'utf8');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const norm = (s) => String(s ?? '').trim().replace(/\s+/g, ' ');
const lower = (s) => norm(s).toLowerCase();

function fieldRe(name) {
  return new RegExp(`\\b${name}:\\s*'((?:\\\\.|[^'\\\\])*)'`);
}

function unquote(s) {
  return String(s ?? '').replace(/\\(.)/g, '$1');
}

function parseLessonWordRows() {
  const src = read(WORDS_FILE);
  const rows = [];
  let lessonId = null;
  for (const line of src.split(/\r?\n/)) {
    const lessonMatch = line.match(/^\s*(\d+):\s*\[/);
    if (lessonMatch) lessonId = Number(lessonMatch[1]);
    if (!line.includes('en:') || !line.includes('pos:')) continue;
    const en = line.match(fieldRe('en'));
    const ru = line.match(fieldRe('ru'));
    const uk = line.match(fieldRe('uk'));
    const es = line.match(fieldRe('es'));
    const pos = line.match(fieldRe('pos'));
    if (!en || !ru || !uk || !pos) continue;
    rows.push({
      lessonId,
      en: unquote(en[1]),
      ru: unquote(ru[1]),
      uk: unquote(uk[1]),
      es: es ? unquote(es[1]) : '',
      pos: unquote(pos[1]),
      line: line.trim(),
    });
  }
  return { rows, src };
}

function parsePluralExceptions(src) {
  const m = src.match(/const\s+NOUN_PLURAL_SURFACE_EXCEPTIONS\s*=\s*new Set\(\[([\s\S]*?)\]\);/);
  if (!m) return new Set();
  return new Set([...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
}

function parseNounLemmaOverrides(src) {
  const m = src.match(/const\s+NOUN_LEMMA_GLOSS_OVERRIDES\s*:[^{]+=\s*\{([\s\S]*?)\n\};/);
  if (!m) return new Set();
  return new Set([...m[1].matchAll(/^\s*([a-z][a-z\s-]*):\s*\{/gim)].map((x) => lower(x[1])));
}

const IRREGULAR_PLURAL_NOUNS = new Set(['children', 'men', 'women', 'people', 'mice']);

function canonicalNounLemma(en) {
  const x = lower(en);
  if (/[^aeiou]ies$/.test(x) && x.length > 4) return x.slice(0, -3) + 'y';
  if (x.endsWith('ves') && x.length > 4) return x.slice(0, -3) + 'f';
  if (/(ches|shes|xes|zes|sses)$/.test(x) && x.length > 4) return x.slice(0, -2);
  if (x.endsWith('oes') && x.length > 4) return x.slice(0, -1);
  if (x.endsWith('s') && !x.endsWith('ss') && x.length > 3) return x.slice(0, -1);
  return x;
}

function isPluralNounSurface(en) {
  const x = lower(en);
  return canonicalNounLemma(x) !== x || IRREGULAR_PLURAL_NOUNS.has(x);
}

function stripVisibleAnswerLeak(text, en, pos) {
  let out = norm(text);
  const answer = norm(en);
  if (!answer) return out;

  const paren = new RegExp(`\\s*\\(${escapeRe(answer)}\\)\\s*$`, 'i');
  out = out.replace(paren, '').trim();

  const slash = new RegExp(`\\s*/\\s*${escapeRe(answer)}\\s*$`, 'i');
  out = out.replace(slash, '').trim();

  if (pos === 'nouns') {
    const lemma = canonicalNounLemma(answer);
    if (lemma !== lower(answer)) {
      out = out.replace(new RegExp(`\\s*\\(${escapeRe(lemma)}\\)\\s*$`, 'i'), '').trim();
    }
  }
  return out;
}

function containsExactAnswer(text, en) {
  const phrase = lower(en);
  if (!phrase || phrase.length <= 1) return false;
  const t = lower(text);
  const boundary = new RegExp(`(^|[^a-z])${escapeRe(phrase)}([^a-z]|$)`, 'i');
  return boundary.test(t);
}

function flattenStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => flattenStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => flattenStrings(v, out));
  return out;
}

function loadJsonIfExists(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(read(file));
}

function getLessonTheoryText(theoryJson, lessonId) {
  const lesson = theoryJson.lessons?.[String(lessonId)] ?? theoryJson[String(lessonId)];
  return flattenStrings(lesson).join('\n');
}

function getPhraseRows() {
  const dump = loadJsonIfExists(PHRASES_FILE, { phrasesByLessonId: {} });
  const rows = [];
  for (const [lessonId, phrases] of Object.entries(dump.phrasesByLessonId ?? {})) {
    for (const p of phrases ?? []) rows.push({ lessonId: Number(lessonId), ...p });
  }
  return rows;
}

function scanIntroSources() {
  const appDir = path.join(ROOT, 'app');
  const files = fs.readdirSync(appDir)
    .filter((name) => /^lesson_intro_screens.*\.(ts|tsx)$/.test(name) || name === 'lesson_intros_17_32.ts')
    .map((name) => path.join(appDir, name));

  const issues = [];
  let stringFields = 0;
  for (const file of files) {
    const src = read(file);
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    if (/[╨╩╬]|Ð|Ñ|Ã|Â/.test(src)) {
      issues.push({ severity: 'medium', code: 'INTRO_MOJIBAKE', loc: rel, detail: 'possible mojibake marker in source' });
    }
    for (const m of src.matchAll(/\b(titleRU|titleUK|textRU|textUK|subtitleRU|subtitleUK|exampleRU|exampleUK|linesRU|linesUK)\s*:/g)) {
      stringFields += 1;
      const afterField = src.slice(m.index + m[0].length, m.index + m[0].length + 48);
      if (/^\s*(['"`])\s*\1/.test(afterField) || /^\s*\[\s*\]/.test(afterField)) {
        issues.push({ severity: 'medium', code: 'INTRO_EMPTY_FIELD', loc: `${rel}:${m[1]}`, detail: 'empty intro field candidate' });
      }
    }
  }
  return { files: files.length, stringFields, issues };
}

function main() {
  const { rows, src } = parseLessonWordRows();
  const pluralExceptions = parsePluralExceptions(src);
  const nounLemmaOverrides = parseNounLemmaOverrides(src);
  const issues = [];

  const nounRowsByEn = new Map(rows.filter((r) => r.pos === 'nouns').map((r) => [lower(r.en), r]));

  for (const row of rows) {
    const visibleRu = stripVisibleAnswerLeak(row.ru, row.en, row.pos);
    const visibleUk = stripVisibleAnswerLeak(row.uk, row.en, row.pos);
    const borrowedIdentical = lower(visibleRu) === lower(row.en) && lower(visibleUk) === lower(row.en);
    if (!borrowedIdentical && (containsExactAnswer(visibleRu, row.en) || containsExactAnswer(visibleUk, row.en))) {
      issues.push({
        severity: 'high',
        code: 'WORD_VISIBLE_EN_ANSWER_LEAK',
        loc: `L${row.lessonId}:${row.en}`,
        detail: `visible RU/UK prompt still contains exact EN answer: ru="${visibleRu}" uk="${visibleUk}"`,
      });
    }

    if (row.pos === 'nouns' && isPluralNounSurface(row.en) && !pluralExceptions.has(lower(row.en))) {
      const lemma = canonicalNounLemma(row.en);
      if (!nounRowsByEn.has(lemma) && !nounLemmaOverrides.has(lemma)) {
        issues.push({
          severity: 'high',
          code: 'WORD_PLURAL_TO_SINGULAR_WITHOUT_SINGULAR_GLOSS',
          loc: `L${row.lessonId}:${row.en}`,
          detail: `plural noun would canonicalize to "${lemma}", but no singular noun row exists to supply singular RU/UK gloss`,
        });
      }
    }

    if (row.pos === 'nouns' && pluralExceptions.has(lower(row.en)) && !isPluralNounSurface(row.en)) {
      issues.push({
        severity: 'low',
        code: 'WORD_PLURAL_EXCEPTION_NOT_PLURAL',
        loc: `L${row.lessonId}:${row.en}`,
        detail: 'word is in plural-surface exceptions but does not look plural',
      });
    }

    const tenseHint = /(\bpast\b|прош\.|прошл|прошед|минул)/i;
    const looksBaseVerb = row.pos === 'verbs' && !/(ed|ing|s)$/i.test(row.en) && row.en.length > 3;
    if (looksBaseVerb && (tenseHint.test(row.ru) || tenseHint.test(row.uk))) {
      issues.push({
        severity: 'high',
        code: 'WORD_BASE_VERB_WITH_PAST_HINT',
        loc: `L${row.lessonId}:${row.en}`,
        detail: `base verb prompt has past-tense hint: ru="${row.ru}" uk="${row.uk}"`,
      });
    }

    const weekdays = new Set(['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays']);
    if (weekdays.has(row.en) && row.pos !== 'nouns') {
      const ru = lower(row.ru);
      if (!ru.startsWith('по ')) {
        issues.push({
          severity: 'medium',
          code: 'WORD_PLURAL_WEEKDAY_PROMPT_NOT_PERIODIC',
          loc: `L${row.lessonId}:${row.en}`,
          detail: `plural weekday should read like "по ...", got ru="${row.ru}"`,
        });
      }
    }
  }

  const samePrompt = new Map();
  for (const row of rows) {
    const key = [row.lessonId, row.pos, stripVisibleAnswerLeak(row.ru, row.en, row.pos), stripVisibleAnswerLeak(row.uk, row.en, row.pos)].join('||');
    if (!samePrompt.has(key)) samePrompt.set(key, []);
    samePrompt.get(key).push(row.en);
  }
  for (const [key, ens] of samePrompt) {
    const unique = [...new Set(ens)];
    if (unique.length < 2) continue;
    const [lessonId, pos, ru, uk] = key.split('||');
    issues.push({
      severity: 'medium',
      code: 'WORD_SAME_VISIBLE_PROMPT_SAME_LESSON',
      loc: `L${lessonId}:${pos}`,
      detail: `same RU/UK prompt for different EN: ${unique.join(' | ')} -> ru="${ru}" uk="${uk}"`,
    });
  }

  if (/\bУзже\b/.test(src)) {
    issues.push({ severity: 'high', code: 'WORD_RU_COMPARATIVE_TYPO_UZZHE', loc: 'app/lesson_words.tsx', detail: 'found "Узже"; expected "Уже"' });
  }
  if (/\bsho\b/i.test(src)) {
    issues.push({ severity: 'high', code: 'WORD_TRUNCATED_SHO', loc: 'app/lesson_words.tsx', detail: 'found suspicious "sho" token' });
  }

  const phrases = getPhraseRows();
  const theoryJson = loadJsonIfExists(THEORY_FILE, { lessons: {} });
  const flatTranslations = loadJsonIfExists(FLAT_TRANSLATIONS_FILE, []);

  for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
    const text = getLessonTheoryText(theoryJson, lessonId);
    if (!text.trim()) {
      issues.push({ severity: 'high', code: 'THEORY_MISSING_LESSON', loc: `L${lessonId}`, detail: 'no theory blocks extracted' });
    }
  }

  const phrasesByLesson = new Map();
  for (const p of phrases) {
    if (!phrasesByLesson.has(p.lessonId)) phrasesByLesson.set(p.lessonId, []);
    phrasesByLesson.get(p.lessonId).push(p);
  }
  for (const [lessonId, lessonPhrases] of phrasesByLesson) {
    const theory = getLessonTheoryText(theoryJson, lessonId);
    const theoryLower = lower(theory);
    const english = lessonPhrases.map((p) => p.english).join('\n');
    if (/\bLet us\b/.test(english) && !theoryLower.includes("let's")) {
      issues.push({
        severity: 'medium',
        code: 'THEORY_LET_US_OMITS_LETS',
        loc: `L${lessonId}`,
        detail: 'lesson has "Let us" phrases; theory does not explicitly mention accepted contraction "Let\'s"',
      });
    }
    if (/\bThere (?:is|are) no\b/.test(english) && !/there\s+(?:is|are)\s+no/i.test(theory)) {
      issues.push({
        severity: 'high',
        code: 'THEORY_THERE_IS_ARE_NO_MISSING',
        loc: `L${lessonId}`,
        detail: 'lesson has There is/are no phrases but theory does not mention the pattern',
      });
    }
  }

  for (const row of flatTranslations) {
    if (lower(row.en) === lower(row.ru) || lower(row.en) === lower(row.uk)) {
      issues.push({ severity: 'high', code: 'PHRASE_TRANSLATION_EQUALS_EN', loc: `${row.id}`, detail: `translation equals EN: "${row.en}"` });
    }
  }

  const introAudit = scanIntroSources();
  issues.push(...introAudit.issues);

  const severityOrder = { high: 0, medium: 1, low: 2 };
  issues.sort((a, b) => (severityOrder[a.severity] - severityOrder[b.severity]) || a.code.localeCompare(b.code) || a.loc.localeCompare(b.loc));
  const counts = issues.reduce((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] ?? 0) + 1;
    acc[issue.code] = (acc[issue.code] ?? 0) + 1;
    return acc;
  }, {});

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const jsonPath = path.join(REPORT_DIR, `bug_report_pattern_audit_${STAMP}.json`);
  const mdPath = path.join(REPORT_DIR, `bug_report_pattern_audit_${STAMP}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    checklist: [
      'visible English answer leak in RU/UK word prompts',
      'plural source canonicalized to singular without singular gloss',
      'base verb prompt includes past-tense hint',
      'plural weekdays should be periodic prompts',
      'same visible prompt for different EN in one lesson',
      'lesson theory mentions patterns used by phrase data',
      'intro sources are wired and free of obvious mojibake/empty fields',
    ],
    counts,
    wordRows: rows.length,
    phraseRows: phrases.length,
    introFiles: introAudit.files,
    introStringFields: introAudit.stringFields,
    issues,
  }, null, 2), 'utf8');

  const lines = [];
  lines.push(`# Bug Report Pattern Audit (${STAMP})`, '');
  lines.push('## Checklist', '');
  lines.push('- EN answer must not remain visible in RU/UK word prompts after display sanitizing.');
  lines.push('- Plural prompts must not point to singular EN answers unless the visible prompt is singularized too.');
  lines.push('- Verb tense/form shown in the prompt must match the EN answer form.');
  lines.push('- Same lesson should not have indistinguishable RU/UK prompts for different EN words without a marker.');
  lines.push('- Phrase `words` / `wordsEn` / translations must stay aligned with the lesson target.');
  lines.push('- Theory must cover the constructions used in the lesson and accepted by the checker.');
  lines.push('- Intro screens must be wired for all lessons and free of empty/mojibake text.', '');
  lines.push('## Summary', '');
  lines.push(`- Word rows scanned: ${rows.length}`);
  lines.push(`- Phrase rows scanned: ${phrases.length}`);
  lines.push(`- Intro source files scanned: ${introAudit.files}`);
  lines.push(`- Issues: high=${counts.high ?? 0}, medium=${counts.medium ?? 0}, low=${counts.low ?? 0}`, '');
  lines.push('## Issues', '');
  if (!issues.length) {
    lines.push('No issues found.');
  } else {
    for (const issue of issues.slice(0, ISSUE_LIMIT)) {
      lines.push(`- **${issue.severity.toUpperCase()} ${issue.code}** ${issue.loc}: ${issue.detail}`);
    }
    if (issues.length > ISSUE_LIMIT) lines.push(`- ... ${issues.length - ISSUE_LIMIT} more issues in JSON report.`);
  }
  lines.push('', `JSON: \`${path.relative(ROOT, jsonPath).replace(/\\/g, '/')}\``);
  fs.writeFileSync(mdPath, lines.join('\n'), 'utf8');

  console.log(`# Bug report pattern audit`);
  console.log(`wordRows=${rows.length} phraseRows=${phrases.length} introFiles=${introAudit.files}`);
  console.log(`issues high=${counts.high ?? 0} medium=${counts.medium ?? 0} low=${counts.low ?? 0}`);
  for (const [code, count] of Object.entries(counts).filter(([k]) => !['high', 'medium', 'low'].includes(k)).sort((a, b) => b[1] - a[1])) {
    console.log(`${code}: ${count}`);
  }
  console.log(`Wrote ${mdPath}`);
  console.log(`Wrote ${jsonPath}`);
}

main();
