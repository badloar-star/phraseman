import { getLessonIntroScreens, LESSON_DATA } from '../app/lesson_data_all';
import type { IntroLine, LessonIntroScreen } from '../app/lesson_data_types';

type Finding = {
  lesson: number;
  severity: 'error' | 'warn';
  kind: string;
  detail: string;
};

const LESSON_IDS = Array.from({ length: 32 }, (_, i) => i + 1);
const strictExamples = process.argv.includes('--strict-examples');
const strictTranslations = process.argv.includes('--strict-translations');
const reviewExampleScreens = new Set([
  'lesson_31_intro_3_conditionals_reported_passive',
  'lesson_31_intro_4_final_advanced_mix',
]);

function lineText(line: IntroLine): string {
  return line.parts?.map((part) => part.text).join('') ?? line.text ?? '';
}

function exampleEn(example: any): string {
  if (!example) return '';
  if (typeof example.en === 'string') return example.en;
  if (Array.isArray(example.en)) return example.en.map((part: any) => part?.text ?? '').join('');
  return '';
}

function screenText(screen: LessonIntroScreen): string {
  const chunks: string[] = [];
  for (const key of ['titleRU', 'titleUK', 'titleES', 'subtitleRU', 'subtitleUK', 'subtitleES', 'textRU', 'textUK', 'textES'] as const) {
    const value = screen[key];
    if (typeof value === 'string') chunks.push(value);
  }
  for (const line of [...(screen.linesRU ?? []), ...(screen.linesUK ?? []), ...(screen.linesES ?? [])]) {
    chunks.push(lineText(line));
  }
  for (const example of screen.examples ?? []) {
    chunks.push(exampleEn(example));
    for (const key of ['ru', 'uk', 'es', 'trRU', 'trUK', 'trES', 'noteRU', 'noteUK', 'noteES', 'labelRU', 'labelUK', 'labelES'] as const) {
      const value = example?.[key];
      if (typeof value === 'string') chunks.push(value);
    }
  }
  return chunks.join('\n');
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9а-яіїєґё\s'-]+/giu, ' ').replace(/\s+/g, ' ').trim();
}

function phraseCorpus(lessonId: number): string {
  const phrases = LESSON_DATA[lessonId]?.phrases ?? [];
  return phrases.map((phrase) => phrase.english).join('\n');
}

function phraseMap(lessonId: number): Map<string, any> {
  const phrases = LESSON_DATA[lessonId]?.phrases ?? [];
  return new Map(phrases.map((phrase: any) => [normalize(phrase.english), phrase]));
}

function allPhraseMap(): Map<string, any> {
  const entries: Array<[string, any]> = [];
  for (const lesson of LESSON_IDS) {
    for (const phrase of LESSON_DATA[lesson]?.phrases ?? []) {
      entries.push([normalize(phrase.english), { ...phrase, lesson }]);
    }
  }
  return new Map(entries);
}

function hasRe(text: string, re: RegExp): boolean {
  return re.test(text);
}

function add(findings: Finding[], lesson: number, severity: Finding['severity'], kind: string, detail: string) {
  findings.push({ lesson, severity, kind, detail });
}

const coverageRules: Array<{
  kind: string;
  lessons?: number[];
  phrase: RegExp;
  intro: RegExp;
  detail: string;
}> = [
  {
    kind: 'would-like-to-exception',
    lessons: [31, 32],
    phrase: /\bwould like\b[\s\S]{0,80}\bto\s+[a-z]+/i,
    intro: /\bwould like\b[\s\S]{0,120}\bto\s*\+\s*verb|\bwould like\b[\s\S]{0,120}\bto\s+[a-z]+/i,
    detail: 'Lesson phrases contain would like + object + to + verb; intro should explicitly distinguish it from bare-infinitive patterns.',
  },
  {
    kind: 'noticed-bare-infinitive',
    lessons: [31, 32],
    phrase: /\bnoticed\b[\s\S]{0,80}\b(put|leave|drop|touch|take|go|come|walk|run)\b/i,
    intro: /\bnoticed\b/i,
    detail: 'Lesson phrases contain noticed + object + bare infinitive; intro should mention noticed if it teaches the bare-infinitive group.',
  },
  {
    kind: 'be-used-to-ing',
    lessons: [32],
    phrase: /\b(am|is|are|was|were)\s+used\s+to\s+\w+ing\b/i,
    intro: /\bbe used to\b[\s\S]{0,80}\b-ing|\bused to\s+\+\s+v-ing/i,
    detail: 'Lesson phrases contain be used to + -ing; intro should not confuse this with used to + base verb.',
  },
  {
    kind: 'passive-progressive',
    lessons: [23, 31, 32],
    phrase: /\b(is|are|was|were)\s+being\s+\w+(ed|en)\b/i,
    intro: /\bbeing\b[\s\S]{0,60}\bv3|\bis \/ are being \+ V3/i,
    detail: 'Lesson phrases contain passive progressive is/are/was/were being + V3; intro should cover being + V3.',
  },
  {
    kind: 'present-perfect-continuous',
    lessons: [31, 32],
    phrase: /\b(have|has)\s+been\s+\w+ing\b/i,
    intro: /\bhave \/ has been \+ V-ing|\bhave been \+ -ing|\bhave been\b[\s\S]{0,80}\b-ing/i,
    detail: 'Lesson phrases contain have/has been + -ing; intro should cover the form.',
  },
  {
    kind: 'relative-whose',
    lessons: [30, 32],
    phrase: /\bwhose\s+\w+/i,
    intro: /\bwhose\b/i,
    detail: 'Lesson phrases contain whose; intro should cover possession in relative clauses.',
  },
  {
    kind: 'relative-where',
    lessons: [30, 32],
    phrase: /\bwhere\s+\w+/i,
    intro: /\bwhere\b/i,
    detail: 'Lesson phrases contain where; intro should cover place relative clauses.',
  },
  {
    kind: 'zero-article-mass',
    lessons: [20],
    phrase: /\b(money|water|coffee|music|time)\b/i,
    intro: /\bбез артикля\b|\bno a \/ an \/ the\b|\bzero article\b|\bнульовий артикль\b/i,
    detail: 'Lesson phrases contain common mass/zero-article nouns; intro should explain no article where relevant.',
  },
];

const badIntroPatterns: Array<{ kind: string; re: RegExp; detail: string }> = [
  {
    kind: 'overbroad-no-to',
    re: /(?:do not|не)\s+(?:put|став|вставля)[\s\S]{0,80}\bto\b[\s\S]{0,80}(?:second|втор|друг)/i,
    detail: 'Intro may state a broad “no to before second action” rule; check for exceptions like would like + object + to + verb.',
  },
  {
    kind: 'night-in-overgeneralization',
    re: /in\s*\+\s*(?:month|місяць|месяц)[\s\S]{0,80}(?:part of the day|частина дня|часть дня)(?![\s\S]{0,160}at night)/i,
    detail: 'Intro says in + part of day without a nearby at night exception.',
  },
  {
    kind: 'bad-meta-english',
    re: /\b(he|she|it|they|we|you|i)\s+(?:always\s+)?takes\b|\b(documents|shoes|books|tickets|keys)\s+is\s+plural\b|\bhas no to\b|\bstands at the end\b/i,
    detail: 'Intro contains non-native or ungrammatical English meta-note.',
  },
  {
    kind: 'uk-russian-letter',
    re: /(titleUK|subtitleUK|textUK|noteUK|trUK|uk)['":\s]+[^'\n]*[ыэёъ]/i,
    detail: 'Ukrainian field appears to contain Russian-only letters.',
  },
];

function main() {
  const findings: Finding[] = [];
  const globalPhrases = allPhraseMap();

  for (const lesson of LESSON_IDS) {
    const phrases = phraseCorpus(lesson);
    const introScreens = getLessonIntroScreens(lesson, 'en');
    const intro = introScreens.map(screenText).join('\n\n');
    const introNorm = normalize(intro);
    const phraseNorm = normalize(phrases);
    const localPhrases = phraseMap(lesson);

    for (const rule of coverageRules) {
      if (rule.lessons && !rule.lessons.includes(lesson)) continue;
      if (hasRe(phrases, rule.phrase) && !hasRe(intro, rule.intro)) {
        add(findings, lesson, 'warn', rule.kind, rule.detail);
      }
    }

    for (const pattern of badIntroPatterns) {
      if (pattern.kind === 'overbroad-no-to' && /\bwould like\b[\s\S]{0,160}\bto\s*\+\s*verb/i.test(intro)) continue;
      if (hasRe(intro, pattern.re)) {
        add(findings, lesson, pattern.kind === 'bad-meta-english' || pattern.kind === 'uk-russian-letter' ? 'error' : 'warn', pattern.kind, pattern.detail);
      }
    }

    if (/\bwould like\b/i.test(phrases) && /без to|without to|no to/i.test(intro) && !/\bwould like\b/i.test(intro)) {
      add(findings, lesson, 'error', 'bare-infinitive-exception-missing', 'Intro says no-to/bare infinitive but lesson phrases include would like + to and intro does not name the exception.');
    }

    for (const screen of introScreens) {
      for (const example of screen.examples ?? []) {
        const en = exampleEn(example).trim();
        if (!en || en.length < 6) continue;
        const normalizedExample = normalize(en);
        const isLongSynthetic = normalizedExample.split(' ').length > 9;
        if (!phraseNorm.includes(normalizedExample) && !isLongSynthetic) {
          const forbidden = screen.developerNotes?.forbiddenContent?.join(' ') ?? '';
          if (/вне урока|outside the lesson|fuera de la lecci/i.test(forbidden)) {
            add(findings, lesson, 'warn', 'example-not-in-phrases', `Example not found in phrase list despite forbiddenContent saying not to use outside phrases: "${en}" (${screen.screenId ?? 'no screenId'}).`);
          } else if (strictExamples && !reviewExampleScreens.has(screen.screenId ?? '')) {
            add(findings, lesson, 'warn', 'strict-example-not-in-phrases', `Example not found in phrase list: "${en}" (${screen.screenId ?? 'no screenId'}).`);
          }
        }
        if (strictTranslations) {
          const phrase = localPhrases.get(normalizedExample) ?? globalPhrases.get(normalizedExample);
          if (phrase) {
            const checks = [
              ['ru', 'russian'],
              ['trRU', 'russian'],
              ['uk', 'ukrainian'],
              ['trUK', 'ukrainian'],
              ['es', 'spanish'],
              ['trES', 'spanish'],
            ] as const;
            for (const [exampleKey, phraseKey] of checks) {
              const exampleValue = example?.[exampleKey];
              const phraseValue = phrase?.[phraseKey];
              if (typeof exampleValue !== 'string' || typeof phraseValue !== 'string') continue;
              if (normalize(exampleValue) !== normalize(phraseValue)) {
                add(findings, lesson, 'warn', 'translation-differs-from-phrase', `${exampleKey} differs from phrase L${phrase.lesson ?? lesson} for "${en}" (${screen.screenId ?? 'no screenId'}).`);
              }
            }
          }
        }
      }
    }

    const regression = [
      /\bi drink a coffee\b/i,
      /\bmore slowly\b/i,
      /\bcleaned dishes\b/i,
    ].find((item) => item.test(intro));
    if (regression) {
      add(findings, lesson, 'error', 'known-regression-string', `A previously fixed problematic string reappeared in active intro text: ${regression}.`);
    }
  }

  findings.sort((a, b) => a.lesson - b.lesson || a.severity.localeCompare(b.severity) || a.kind.localeCompare(b.kind));

  if (findings.length === 0) {
    console.log('OK: no deep intro-vs-phrases findings.');
    return;
  }

  for (const finding of findings) {
    console.log(`L${finding.lesson} [${finding.severity}] ${finding.kind}: ${finding.detail}`);
  }
  process.exitCode = findings.some((finding) => finding.severity === 'error') ? 1 : 0;
}

main();
