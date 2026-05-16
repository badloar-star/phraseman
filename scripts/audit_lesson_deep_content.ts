import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { LESSON_DATA } from '../app/lesson_data_all';
import { getPerWordDistracts, getPhraseWords } from '../app/lesson1_smart_options';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'docs', 'reports');
const STAMP = new Date().toISOString().slice(0, 10);

type Severity = 'high' | 'medium' | 'low';

type Issue = {
  severity: Severity;
  code: string;
  loc: string;
  detail: string;
};

type WordRow = {
  lessonId: number | null;
  lineNo: number;
  en: string;
  ru: string;
  uk: string;
  es: string;
  pos: string;
};

type PhraseWord = {
  text?: string;
  correct?: string;
  category?: string;
  distractors?: string[];
};

const severityRank: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

const ALLOWED_LATIN_PROMPT_TOKENS = new Set([
  'a', 'am', 'an', 'are', 'be', 'being', 'can', 'cannot', 'can\'t', 'could',
  'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'done', 'don\'t',
  'had', 'has', 'have', 'i', 'if', 'ing', 'is', 'isn\'t', 'it', 'let', 'let\'s',
  'may', 'might', 'must', 'mustn\'t', 'not', 'ok', 'okay', 'pm', 'am', 'should',
  'that', 'the', 'there', 'this', 'to', 'us', 'v', 'v2', 'v3', 'was', 'were',
  'will', 'would', 'wifi', 'wi-fi', 'you',
]);

const BORROWED_IDENTICAL = new Set([
  'app', 'email', 'gps', 'sms', 'tv', 'wi-fi', 'wifi', 'youtube',
]);

function norm(s: unknown): string {
  return String(s ?? '').trim().replace(/\s+/g, ' ');
}

function lower(s: unknown): string {
  return norm(s).toLowerCase();
}

function plainKey(s: unknown): string {
  return lower(s)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ё/g, 'е')
    .replace(/і/g, 'и')
    .replace(/ї/g, 'и')
    .replace(/є/g, 'е')
    .replace(/[(){}\[\],.;:!?'"`«»“”‘’/\\|·—–-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripTok(s: unknown): string {
  return norm(s)
    .replace(/[¿¡]/g, '')
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/[^\p{L}\p{N}']+$/u, '')
    .trim();
}

function eqTok(a: unknown, b: unknown): boolean {
  return stripTok(a).toLowerCase() === stripTok(b).toLowerCase();
}

function hasMojibake(s: unknown): boolean {
  return /[╨╩╬]|Ð|Ñ|Ã|Â/.test(String(s ?? ''));
}

function latinTokens(s: unknown): string[] {
  return (String(s ?? '').match(/[A-Za-z][A-Za-z'-]*/g) ?? []).map((x) => x.toLowerCase());
}

function fieldRe(name: string): RegExp {
  return new RegExp(`\\b${name}:\\s*'((?:\\\\.|[^'\\\\])*)'`);
}

function unquote(s: string): string {
  return String(s ?? '').replace(/\\(.)/g, '$1');
}

function parseLessonWords(): WordRow[] {
  const file = path.join(ROOT, 'app', 'lesson_words.tsx');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const rows: WordRow[] = [];
  let lessonId: number | null = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
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
      lineNo: i + 1,
      en: unquote(en[1]!),
      ru: unquote(ru[1]!),
      uk: unquote(uk[1]!),
      es: es ? unquote(es[1]!) : '',
      pos: unquote(pos[1]!),
    });
  }
  return rows;
}

function canonicalNounLemma(en: string): string {
  const x = lower(en);
  if (/[^aeiou]ies$/.test(x) && x.length > 4) return x.slice(0, -3) + 'y';
  if (x.endsWith('ves') && x.length > 4) return x.slice(0, -3) + 'f';
  if (/(ches|shes|xes|zes|sses)$/.test(x) && x.length > 4) return x.slice(0, -2);
  if (x.endsWith('oes') && x.length > 4) return x.slice(0, -1);
  if (x.endsWith('s') && !x.endsWith('ss') && x.length > 3) return x.slice(0, -1);
  return x;
}

function visiblePrompt(text: string, en: string): string {
  const answer = norm(en);
  let out = norm(text);
  if (!answer) return out;
  out = out.replace(new RegExp(`\\s*\\(${escapeRe(answer)}\\)\\s*$`, 'i'), '').trim();
  out = out.replace(new RegExp(`\\s*/\\s*${escapeRe(answer)}\\s*$`, 'i'), '').trim();
  const lemma = canonicalNounLemma(answer);
  if (lemma !== lower(answer)) {
    out = out.replace(new RegExp(`\\s*\\(${escapeRe(lemma)}\\)\\s*$`, 'i'), '').trim();
  }
  return out;
}

function containsExactEnglish(text: string, en: string): boolean {
  const answer = lower(en);
  if (!answer || answer.length <= 1) return false;
  return new RegExp(`(^|[^a-z])${escapeRe(answer)}([^a-z]|$)`, 'i').test(lower(text));
}

function isPunctuationRow(w: PhraseWord | undefined): boolean {
  const raw = norm(w?.correct ?? w?.text ?? '');
  const category = lower(w?.category);
  return /^[.?!]$/.test(raw) || raw === '¿' || raw === '¡' || category.includes('punct') || category.includes('puntuacion');
}

function englishRows(phrase: { words?: PhraseWord[]; wordsEn?: PhraseWord[] }): PhraseWord[] {
  return phrase.wordsEn?.length ? phrase.wordsEn : phrase.words ?? [];
}

function phraseSurface(s: string): string {
  return lower(s)
    .replace(/[¿¡]/g, ' ')
    .replace(/[.,!?;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentenceMode(s: unknown): string {
  const text = norm(s);
  if (/\?\s*$/.test(text)) return '?';
  if (/!\s*$/.test(text)) return '!';
  return '.';
}

function translationCollisionKey(russian: string, ukrainian: string): string {
  return `${plainKey(russian)}|${sentenceMode(russian)}||${plainKey(ukrainian)}|${sentenceMode(ukrainian)}`;
}

function flattenStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => flattenStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => flattenStrings(v, out));
  return out;
}

function loadJson(file: string, fallback: unknown): any {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function addIssue(issues: Issue[], severity: Severity, code: string, loc: string, detail: string): void {
  issues.push({ severity, code, loc, detail });
}

function auditWords(issues: Issue[]): void {
  const rows = parseLessonWords();

  for (const row of rows) {
    for (const lang of ['ru', 'uk'] as const) {
      const visible = visiblePrompt(row[lang], row.en);
      const borrowedSame = lower(visible) === lower(row.en) && BORROWED_IDENTICAL.has(lower(row.en));
      if (!borrowedSame && containsExactEnglish(visible, row.en)) {
        addIssue(issues, 'high', 'WORD_PROMPT_CONTAINS_EXACT_ANSWER', `app/lesson_words.tsx:${row.lineNo}`, `${lang} prompt still contains answer "${row.en}": ${visible}`);
      }

      const extraLatin = latinTokens(visible)
        .filter((token) => token !== lower(row.en))
        .filter((token) => !ALLOWED_LATIN_PROMPT_TOKENS.has(token));
      if (extraLatin.length) {
        addIssue(issues, 'low', 'WORD_PROMPT_HAS_LATIN_REVIEW', `app/lesson_words.tsx:${row.lineNo}`, `${lang} prompt has Latin tokens [${[...new Set(extraLatin)].join(', ')}]: ${visible}`);
      }

      if (hasMojibake(visible)) {
        addIssue(issues, 'high', 'WORD_PROMPT_MOJIBAKE', `app/lesson_words.tsx:${row.lineNo}`, `${lang} prompt looks mojibake: ${visible}`);
      }
      if (visible.length > 58) {
        addIssue(issues, 'low', 'WORD_PROMPT_LONG_FOR_MOBILE', `app/lesson_words.tsx:${row.lineNo}`, `${lang} prompt length=${visible.length}: ${visible}`);
      }
    }

    if (!norm(row.es)) {
      addIssue(issues, 'high', 'WORD_MISSING_ES', `app/lesson_words.tsx:${row.lineNo}`, `missing es for ${row.en}`);
    }
  }

  for (const lang of ['ru', 'uk'] as const) {
    const buckets = new Map<string, WordRow[]>();
    for (const row of rows.filter((r) => r.lessonId !== null)) {
      const key = [row.lessonId, row.pos, plainKey(visiblePrompt(row[lang], row.en))].join('||');
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(row);
    }
    for (const [key, group] of buckets) {
      const en = [...new Set(group.map((r) => r.en))];
      if (en.length < 2) continue;
      const [lessonId, pos, prompt] = key.split('||');
      addIssue(issues, 'medium', 'WORD_SAME_PROMPT_SAME_LANG_LESSON', `L${lessonId}:${pos}:${lang}`, `${lang} prompt "${prompt}" is shared by: ${en.join(' | ')}`);
    }
  }

  const enPos = new Map<string, WordRow[]>();
  for (const row of rows.filter((r) => r.lessonId !== null)) {
    const key = lower(row.en);
    if (!enPos.has(key)) enPos.set(key, []);
    enPos.get(key)!.push(row);
  }
  for (const [en, group] of enPos) {
    const poses = [...new Set(group.map((r) => r.pos))];
    if (poses.length > 1) {
      addIssue(issues, 'low', 'WORD_SAME_EN_DIFFERENT_POS_REVIEW', en, `${en} appears as multiple POS: ${poses.join(', ')} in lessons ${[...new Set(group.map((r) => r.lessonId))].join(', ')}`);
    }
  }
}

function auditPhrases(issues: Issue[]): void {
  const byRuUk = new Map<string, { id: string; en: string }[]>();
  const byEnglish = new Map<string, { id: string; ru: string; uk: string }[]>();

  for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
    const lesson = LESSON_DATA[lessonId];
    if (!lesson?.phrases?.length) {
      addIssue(issues, 'high', 'PHRASES_MISSING_LESSON', `L${lessonId}`, 'lesson has no phrases');
      continue;
    }

    const sameTranslation = new Map<string, { id: string; en: string }[]>();

    for (const p of lesson.phrases) {
      const phraseId = String(p.id ?? '?');
      const english = norm(p.english);
      const russian = norm(p.russian);
      const ukrainian = norm(p.ukrainian);
      const spanish = norm((p as any).spanish);

      if (!english || !russian || !ukrainian) {
        addIssue(issues, 'high', 'PHRASE_EMPTY_REQUIRED_TEXT', `${phraseId}`, `empty required text: en="${english}" ru="${russian}" uk="${ukrainian}"`);
      }
      for (const [field, text] of Object.entries({ english, russian, ukrainian, spanish })) {
        if (hasMojibake(text)) addIssue(issues, 'high', 'PHRASE_TEXT_MOJIBAKE', `${phraseId}:${field}`, text);
      }
      for (const [lang, text] of Object.entries({ ru: russian, uk: ukrainian })) {
        const badLatin = latinTokens(text).filter((token) => !ALLOWED_LATIN_PROMPT_TOKENS.has(token) && !BORROWED_IDENTICAL.has(token));
        if (badLatin.length) {
          addIssue(issues, 'low', 'PHRASE_TRANSLATION_HAS_LATIN_REVIEW', `${phraseId}:${lang}`, `Latin tokens [${[...new Set(badLatin)].join(', ')}] in "${text}"`);
        }
      }

      const transKey = translationCollisionKey(russian, ukrainian);
      if (!sameTranslation.has(transKey)) sameTranslation.set(transKey, []);
      sameTranslation.get(transKey)!.push({ id: phraseId, en: english });
      if (!byRuUk.has(transKey)) byRuUk.set(transKey, []);
      byRuUk.get(transKey)!.push({ id: phraseId, en: english });
      const enKey = plainKey(english);
      if (!byEnglish.has(enKey)) byEnglish.set(enKey, []);
      byEnglish.get(enKey)!.push({ id: phraseId, ru: russian, uk: ukrainian });

      const rows = englishRows(p);
      const contentEntries = rows
        .map((w, rowIndex) => ({ w, rowIndex }))
        .filter(({ w }) => !isPunctuationRow(w));
      const contentRows = contentEntries.map(({ w }) => w);
      let tokens: string[] = [];
      try {
        tokens = getPhraseWords(english);
      } catch {
        addIssue(issues, 'high', 'PHRASE_TOKENIZER_THROW', phraseId, english);
      }

      const expectedSurface = phraseSurface(english);
      const rowSurface = phraseSurface(contentRows.map((w) => w.correct ?? w.text ?? '').join(' '));
      if (tokens.length !== contentRows.length && expectedSurface !== rowSurface) {
        addIssue(issues, 'high', 'PHRASE_SLOT_LENGTH_MISMATCH', phraseId, `english="${expectedSurface}" rows="${rowSurface}"`);
      }

      if (tokens.length === contentRows.length) {
        for (let i = 0; i < contentRows.length; i += 1) {
          const correct = contentRows[i]?.correct ?? contentRows[i]?.text ?? '';
          if (!eqTok(tokens[i], correct)) {
            addIssue(issues, 'high', 'PHRASE_SLOT_TOKEN_MISMATCH', `${phraseId}:${i + 1}`, `expected "${tokens[i]}", row correct="${correct}"`);
          }
        }
      }

      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i]!;
        if (isPunctuationRow(row)) continue;
        const correct = row.correct ?? row.text ?? '';
        if (!norm(correct)) {
          addIssue(issues, 'high', 'PHRASE_EMPTY_CORRECT', `${phraseId}:${i + 1}`, 'empty correct/text');
          continue;
        }
        const distractors = row.distractors ?? [];
        if (distractors.some((d) => eqTok(d, correct))) {
          addIssue(issues, 'high', 'PHRASE_CORRECT_IN_RAW_DISTRACTORS', `${phraseId}:${i + 1}`, `"${correct}" is present in raw distractors: ${distractors.join(', ')}`);
        }
        const options = getPerWordDistracts(p, i, 'en');
        const optionKeys = options.map((o) => stripTok(o).toLowerCase()).filter(Boolean);
        if (!optionKeys.includes(stripTok(correct).toLowerCase())) {
          addIssue(issues, 'high', 'PHRASE_GENERATED_OPTIONS_MISSING_CORRECT', `${phraseId}:${i + 1}`, `correct="${correct}" options=${options.join(', ')}`);
        }
        if (new Set(optionKeys).size !== optionKeys.length) {
          addIssue(issues, 'medium', 'PHRASE_GENERATED_OPTIONS_DUPLICATE', `${phraseId}:${i + 1}`, `options=${options.join(', ')}`);
        }
      }
    }

    for (const [key, group] of sameTranslation) {
      const en = [...new Set(group.map((x) => x.en))];
      if (en.length > 1) {
        addIssue(issues, 'medium', 'PHRASE_SAME_RU_UK_DIFFERENT_EN_SAME_LESSON', `L${lessonId}`, `translation key "${key}" shared by ${group.map((x) => `${x.id}=${x.en}`).join('; ')}`);
      }
    }
  }

  for (const [key, group] of byEnglish) {
    if (group.length < 2) continue;
    const translations = new Set(group.map((x) => `${plainKey(x.ru)}||${plainKey(x.uk)}`));
    if (translations.size > 1) {
      addIssue(issues, 'low', 'PHRASE_SAME_EN_DIFFERENT_TRANSLATION_REVIEW', key, group.map((x) => `${x.id}: ru="${x.ru}" uk="${x.uk}"`).join('; '));
    }
  }
}

function auditTheoryAndIntro(issues: Issue[]): void {
  const theory = loadJson(path.join(ROOT, 'exports', 'lesson-theory-dump', 'lesson_theory_help.json'), { lessons: {} });
  const phrasesDump = loadJson(path.join(ROOT, 'exports', 'lesson-theory-dump', 'lesson_phrases.json'), { phrasesByLessonId: {} });

  for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
    const lessonTheory = theory.lessons?.[String(lessonId)] ?? theory[String(lessonId)];
    const theoryText = flattenStrings(lessonTheory).join('\n');
    if (!theoryText.trim()) {
      addIssue(issues, 'high', 'THEORY_MISSING_LESSON', `L${lessonId}`, 'no extracted theory text');
    } else {
      if (theoryText.length < 1200) addIssue(issues, 'low', 'THEORY_SHORT_REVIEW', `L${lessonId}`, `theory text is short: ${theoryText.length} chars`);
      if (hasMojibake(theoryText)) addIssue(issues, 'high', 'THEORY_MOJIBAKE', `L${lessonId}`, 'theory contains mojibake markers');
    }

    const lesson = LESSON_DATA[lessonId];
    const introScreens = lesson?.introScreens ?? [];
    if (!introScreens.length) {
      addIssue(issues, 'high', 'INTRO_MISSING_LESSON', `L${lessonId}`, 'no intro screens');
    }
    const screenIds = new Set<string>();
    const orders = new Set<number>();
    for (let i = 0; i < introScreens.length; i += 1) {
      const screen: any = introScreens[i];
      const screenId = String(screen.screenId ?? screen.id ?? `#${i + 1}`);
      if (screenIds.has(screenId)) addIssue(issues, 'high', 'INTRO_DUPLICATE_SCREEN_ID', `L${lessonId}:${screenId}`, 'duplicate intro screen id');
      screenIds.add(screenId);
      if (typeof screen.order === 'number') {
        if (orders.has(screen.order)) addIssue(issues, 'medium', 'INTRO_DUPLICATE_ORDER', `L${lessonId}:${screenId}`, `duplicate order ${screen.order}`);
        orders.add(screen.order);
      }
      const strings = flattenStrings(screen);
      const visibleStrings = strings.map(norm).filter(Boolean);
      if (!visibleStrings.length) addIssue(issues, 'high', 'INTRO_EMPTY_SCREEN_TEXT', `L${lessonId}:${screenId}`, 'screen has no visible strings');
      for (const text of visibleStrings) {
        if (hasMojibake(text)) addIssue(issues, 'high', 'INTRO_MOJIBAKE', `L${lessonId}:${screenId}`, text.slice(0, 160));
      }
    }

    const english = (phrasesDump.phrasesByLessonId?.[String(lessonId)] ?? [])
      .map((p: any) => p.english)
      .join('\n');
    const theoryLower = lower(theoryText);
    if (/\bLet us\b/.test(english) && !theoryLower.includes("let's")) {
      addIssue(issues, 'medium', 'THEORY_PATTERN_LET_US_LETS_REVIEW', `L${lessonId}`, 'lesson uses Let us but theory does not mention Let\'s');
    }
    if (/\bThere (?:is|are) no\b/.test(english) && !/there\s+(?:is|are)\s+no/i.test(theoryText)) {
      addIssue(issues, 'high', 'THEORY_PATTERN_THERE_NO_MISSING', `L${lessonId}`, 'lesson uses There is/are no but theory does not mention the pattern');
    }
  }
}

function main(): void {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const issues: Issue[] = [];
  auditWords(issues);
  auditPhrases(issues);
  auditTheoryAndIntro(issues);

  issues.sort((a, b) =>
    severityRank[a.severity] - severityRank[b.severity]
    || a.code.localeCompare(b.code)
    || a.loc.localeCompare(b.loc),
  );

  const counts = issues.reduce<Record<string, number>>((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] ?? 0) + 1;
    acc[issue.code] = (acc[issue.code] ?? 0) + 1;
    return acc;
  }, {});

  const md = [
    `# Deep Lesson Content Audit (${STAMP})`,
    '',
    '## Scope',
    '',
    '- lesson word prompts: RU/UK separately, exact EN leaks, Latin review tokens, same-prompt collisions, long mobile prompts',
    '- phrase data: required translations, token/slot alignment, raw/generated option correctness, duplicate options',
    '- theory: extracted help text presence, mojibake, known pattern coverage',
    '- intro screens: presence, duplicate ids/orders, empty/mojibake text',
    '',
    '## Summary',
    '',
    `- Issues: high=${counts.high ?? 0}, medium=${counts.medium ?? 0}, low=${counts.low ?? 0}`,
    '',
    '## Counts By Code',
    '',
    ...Object.entries(counts)
      .filter(([key]) => !['high', 'medium', 'low'].includes(key))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([key, count]) => `- ${key}: ${count}`),
    '',
    '## Issues',
    '',
    ...(issues.length
      ? issues.slice(0, 400).map((issue) => `- **${issue.severity.toUpperCase()} ${issue.code}** ${issue.loc}: ${issue.detail}`)
      : ['No issues found.']),
    '',
  ];

  const jsonPath = path.join(REPORT_DIR, `lesson_deep_content_audit_${STAMP}.json`);
  const mdPath = path.join(REPORT_DIR, `lesson_deep_content_audit_${STAMP}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify({ stamp: STAMP, counts, issues }, null, 2));
  fs.writeFileSync(mdPath, md.join('\n'));

  console.log(`# Deep Lesson Content Audit`);
  console.log(`issues high=${counts.high ?? 0} medium=${counts.medium ?? 0} low=${counts.low ?? 0}`);
  for (const [key, count] of Object.entries(counts).filter(([key]) => !['high', 'medium', 'low'].includes(key)).sort((a, b) => b[1] - a[1])) {
    console.log(`${key}: ${count}`);
  }
  console.log(`Wrote ${mdPath}`);
  console.log(`Wrote ${jsonPath}`);
}

main();
