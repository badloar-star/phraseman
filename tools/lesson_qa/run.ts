/**
 * Phraseman lesson & content QA (static checks).
 * Run: npm run lesson:qa
 *        npm run lesson:qa -- --warn   (non-zero only on --strict later)
 *
 * Не ломает приложение: отдельный entry, импортирует только data-модули.
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { LESSON_DATA, LESSON_VOCABULARIES } from '../../app/lesson_data_all';
import { lessonCards } from '../../app/lesson_cards_data';
import { IRREGULAR_VERBS_BY_LESSON } from '../../app/irregular_verbs_data';
import { getPhraseWords } from '../../app/lesson1_smart_options';
import { parseWordsByLessonFromFile } from './parse_lesson_words_text';

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dir, '../..');
const WARN_ONLY = process.argv.includes('--warn');
const SUMMARY = process.argv.includes('--summary');

/** `npm run lesson:qa -- --lesson 1` — только этот урок (theory_ame остаётся, т.к. один файл на все) */
const LESSON_FILTER: number | null = (() => {
  const i = process.argv.indexOf('--lesson');
  if (i >= 0 && process.argv[i + 1] && /^\d+$/.test(process.argv[i + 1])) {
    return Number(process.argv[i + 1]);
  }
  const raw = process.argv.find((a) => a.startsWith('--lesson='));
  if (raw) {
    const n = Number(raw.split('=')[1]);
    if (n >= 1 && n <= 32) return n;
  }
  return null;
})();

type Severity = 'error' | 'warn' | 'info';
interface Finding {
  severity: Severity;
  check: string;
  lessonId?: number;
  phraseId?: string | number;
  detail: string;
}

const findings: Finding[] = [];

const push = (f: Finding) => findings.push(f);
const e = (check: string, detail: string, lessonId?: number, phraseId?: string | number) =>
  push({ severity: 'error', check, lessonId, phraseId, detail });
const w = (check: string, detail: string, lessonId?: number, phraseId?: string | number) =>
  push({ severity: 'warn', check, lessonId, phraseId, detail });

// ─── British / non-AmE common spellings (heuristic) ───
const BRITISH_PATTERNS: { re: RegExp; hint: string }[] = [
  { re: /\bcolour\b/i, hint: 'colour → color (AmE)' },
  { re: /\bfavour(ite|ed|ing|able)\b/i, hint: 'favour* → favor*' },
  { re: /\bcentre[ds]?\b/i, hint: 'centre → center' },
  { re: /\borganise[ds]?\b/i, hint: 'organise → organize' },
  { re: /\brealise[ds]?\b/i, hint: 'realise → realize' },
  { re: /\btheatre\b/i, hint: 'theater (AmE) in most learning contexts' },
  { re: /\btravell(ed|ing|er)\b/i, hint: 'traveled (AmE) single l' },
  { re: /\bwhilst\b/i, hint: 'while (AmE)' },
  { re: /\bbehaviour(s)?\b/i, hint: 'behavior' },
  { re: /\bgrey\b/i, hint: 'gray' },
  { re: /\bdefence\b/i, hint: 'defense' },
  { re: /\blicence\b/i, hint: 'license (noun, AmE)' },
];

// Forbidden contraction + auxiliary (data error) — see lesson1 user flow
const FORBIDDEN_CONTR_AUX = new Set([
  "she's|is",
  "he's|is",
  "it's|is",
  "that's|is",
  "there's|is",
  "here's|is",
  "i'm|am",
  "we're|are",
  "you're|are",
  "they're|are",
]);

function phraseTokensFromData(phrase: { english: string; words: { correct: string }[] }): string[] {
  if (phrase.words?.length) {
    return phrase.words.map((x) => x.correct);
  }
  return getPhraseWords(phrase.english);
}

// ─── Checks ───

function checkPhrasesAndWords() {
  for (const [idStr, meta] of Object.entries(LESSON_DATA) as [string, (typeof LESSON_DATA)[1]][]) {
    const lessonId = Number(idStr);
    for (const phrase of meta.phrases || []) {
      const pid = phrase.id;
      if (phrase.english == null || String(phrase.english).trim() === '') {
        e('empty_english', 'пустой english', lessonId, pid);
      }
      if (!phrase.russian?.trim() || !phrase.ukrainian?.trim()) {
        w('translation', 'пустой russian или ukrainian', lessonId, pid);
      }
      const words = phrase.words;
      if (!words?.length) {
        w('no_words', 'массив words пуст — дрейф токенов', lessonId, pid);
        continue;
      }
      const toks = phraseTokensFromData(phrase);
      if (toks.length !== words.length) {
        e('token_mismatch', `getPhraseTokens: ${words.length} слотов, токенизатор/words: ${toks.length} (${phrase.english})`, lessonId, pid);
      } else {
        for (let i = 0; i < toks.length; i++) {
          if (words[i].correct.toLowerCase() !== toks[i].toLowerCase() && toks[i] !== '-') {
            w('word_align', `слот ${i}: correct="${words[i].correct}" vs токен "${toks[i]}"`, lessonId, pid);
          }
        }
      }
      for (let i = 0; i < words.length; i++) {
        const wi = words[i];
        if (!wi.correct?.trim()) e('empty_slot', `пустой correct @${i}`, lessonId, pid);
        const d = wi.distractors;
        if (!d?.length) e('distractors', 'нет дистракторов', lessonId, pid);
        const set = new Set(d.map((x) => x.toLowerCase()));
        if (set.size !== d.length) w('distractor_dup', `повтор дистрактора @${i}`, lessonId, pid);
        if (d.some((x) => !x || !x.trim())) e('distractor_empty', `пустой дистрактор @${i}`, lessonId, pid);
        for (const di of d) {
          if (di.toLowerCase() === wi.correct.toLowerCase()) {
            e('distractor_equals_correct', `дистрактор = correct @${i}: ${di}`, lessonId, pid);
          }
        }
        // contraction + auxiliary
        if (i < words.length - 1) {
          const a = (wi.correct || '').trim();
          const b = (words[i + 1].correct || '').trim();
          const k = `${a.toLowerCase()}|${b.toLowerCase()}`;
          if (FORBIDDEN_CONTR_AUX.has(k)) {
            w('contraction', `подозрительная пара: «${a}» + «${b}» (двойной глагол?)`, lessonId, pid);
          }
        }
        for (const text of [phrase.english, wi.correct, ...d]) {
          for (const { re, hint } of BRITISH_PATTERNS) {
            if (re.test(text)) w('am_e', `возможен брит. вариант: ${hint} в «${text.slice(0, 80)}»`, lessonId, pid);
            re.lastIndex = 0;
          }
        }
        if (phrase.russian) {
          for (const { re, hint } of BRITISH_PATTERNS) {
            if (re.test(phrase.russian)) w('am_e', `${hint} в RU? (проверить вручную)`, lessonId, pid);
            re.lastIndex = 0;
          }
        }
        // mojibake
        for (const field of [wi.correct, phrase.russian, phrase.ukrainian, ...d, phrase.english] as string[]) {
          if (!field) continue;
          if (/\uFFFD/.test(field) || /Ã.|â€/.test(field)) {
            e('mojibake', `битая кодировка в: ${String(field).slice(0, 40)}...`, lessonId, pid);
          }
        }
        if (phrase.russian && phrase.ukrainian) {
          const a = phrase.russian.replace(/\s+/g, '');
          const b = phrase.ukrainian.replace(/\s+/g, '');
          if (a.length > 30 && a === b) w('ru_uk_suspect', 'RU и UK строки слишком похожи (калькa?)', lessonId, pid);
        }
        // distractor part-of-speech: same "category" not enforced; warning if all distractor lengths wild
        const clen = (wi.correct || '').length;
        const tooFar = d.filter((distr) => Math.abs(distr.length - clen) > 10).length;
        if (d.length >= 3 && tooFar === d.length) {
          w('distractor_weak', 'все дистракторы сильно отличаются по длине (пед. проверка)', lessonId, pid);
        }
        // Пед. оценка дистракторов (грам. «почти подходит») — только в LLM-промптах, см. tools/lesson_qa/prompts/
        // lookupContraction: если в слоте сокращение, next не должен дублировать be
      }
    }
  }
}

function checkLessonCards() {
  for (const lessonIdStr of Object.keys(LESSON_DATA)) {
    const lessonId = Number(lessonIdStr);
    const phrases = LESSON_DATA[lessonId as keyof typeof LESSON_DATA].phrases || [];
    const cardMap = lessonCards[lessonId as keyof typeof lessonCards];
    if (!cardMap) {
      w('cards_missing', `нет lessonCards[${lessonId}]`, lessonId);
      continue;
    }
    const n = phrases.length;
    for (let idx = 1; idx <= n; idx++) {
      const c = (cardMap as Record<number, unknown>)[idx];
      if (!c) e('card_hole', `нет карточки phraseIndex ${idx} (всего фраз ${n})`, lessonId);
    }
    const maxKey = Math.max(0, ...Object.keys(cardMap as object).map(Number));
    if (maxKey > n) w('card_extra', `карточек больше чем фраз: maxKey=${maxKey} vs phrases=${n}`, lessonId);
    for (const [k, c] of Object.entries(cardMap as Record<string, { correctRu: string; secretRu: string; wrongRu: string }>)) {
      for (const field of ['correctRu', 'correctUk', 'wrongRu', 'wrongUk', 'secretRu', 'secretUk'] as const) {
        const t = (c as any)[field];
        if (typeof t === 'string') {
          if (/\uFFFD|Ã./.test(t)) e('card_mojibake', `lesson ${lessonId} #${k} ${field}`, lessonId);
        }
      }
    }
  }
}

/** Нормализация для сравнения: регистр, снятие диакритик (café ↔ cafe), пунктуация. */
function lessonLemmaKey(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .split(/\s+/)[0]!
    .replace(/[.,!?'"]/g, '');
}

function checkVocabularyAndDedup(lessonWordMap: Map<number, { en: string }[]>) {
  const firstTokensForLesson = (lid: number): string[] => {
    const row = lessonWordMap.get(lid) || [];
    return row.map((x) => lessonLemmaKey(x.en));
  };

  const seenLemmas = new Set<string>();
  for (let lessonId = 1; lessonId <= 32; lessonId++) {
    for (const en of firstTokensForLesson(lessonId)) {
      if (seenLemmas.has(en)) {
        w('vocab_repeat', `слово «${en}» уже встречалось в словаре раннего урока — убрать дубликат по смыслу?`, lessonId);
      } else {
        seenLemmas.add(en);
      }
    }
  }

  // Покрытие: слово из фразы должно встречаться в lesson_words на уроке 1..N
  // (словарь урока N в UI — только новые; повторы из 1..N-1 не дублируем в списке).
  const cumulativeEnSet = (upTo: number) => {
    const s = new Set<string>();
    for (let j = 1; j <= upTo; j++) {
      for (const t of firstTokensForLesson(j)) {
        s.add(t);
      }
    }
    return s;
  };

  const skipForms = new Set(
    (
      'a an the to of at in on for with by from as is am are was were be been do does did have has had will would can could should must may might not ' +
      'i we you he she it they this that these those my your his her our their and or but nor ' +
      'me him us them whose whom than then being ' +
      'myself yourself himself herself itself ourselves themselves which ' +
      'oclock' +
      ' -'
    ).split(/\s+/)
  );

  for (let lessonId = 1; lessonId <= 32; lessonId++) {
    const enSet = cumulativeEnSet(lessonId);
    const meta = LESSON_DATA[lessonId as keyof typeof LESSON_DATA];
    if (!meta) continue;
    const need = new Set<string>();
    for (const p of meta.phrases) {
      for (const word of p.words || []) {
        const cat = (word.category || '').toLowerCase();
        if (cat === 'preposition' || cat === 'article' || word.text === '-' || word.correct === '-') continue;
        const fromPhrase = (word.correct || word.text) || '';
        const key = lessonLemmaKey(fromPhrase.replace(/[’]/g, "'"));
        if (key.length) need.add(key);
      }
    }
    for (const wn of need) {
      if (wn.length <= 1) continue;
      if (/^\d+$/.test(wn)) continue; // годы, номера (1985) — не в словаре-леммах
      if (skipForms.has(wn)) continue;
      if (!enSet.has(wn) && ![...enSet].some((x) => wn.startsWith(x) || x.startsWith(wn))) {
        w('vocab_coverage', `«${wn}» в фразах, нет en в lesson_words (проверить; не учтены омонимы/формы)`, lessonId);
      }
    }
  }
}

function checkIrregularVerbs() {
  const pastSeenBases = new Set<string>();
  for (let lessonId = 1; lessonId <= 32; lessonId++) {
    const list = IRREGULAR_VERBS_BY_LESSON[lessonId] || [];
    for (const v of list) {
      const b = v.base.toLowerCase();
      if (pastSeenBases.has(b)) {
        w('irreg_repeat', `глагол ${b} повторяется в списке непр. (уже в предыдущем уроке) — требуется?`, lessonId);
      } else {
        pastSeenBases.add(b);
      }
    }
    // Покрытие «формы фразы ↔ раздел урока» слишком нетривиально (повтор в поздних уроках) — смотри prompts/irregular_verb_coverage.md
  }
}

function checkVocabPacks() {
  for (const [lid, _pack] of Object.entries(LESSON_VOCABULARIES)) {
    if (!Object.keys(LESSON_DATA).includes(lid)) w('vocab_orphan', `LESSON_VOCABULARIES[${lid}] нет в LESSON_DATA?`);
  }
}

function checkTheoryFile() {
  const p = join(REPO, 'app/lesson_help.tsx');
  if (!existsSync(p)) return;
  const t = readFileSync(p, 'utf8');
  for (const { re, hint } of BRITISH_PATTERNS) {
    re.lastIndex = 0;
    if (re.test(t)) w('theory_ame', `theory/lesson_help: ${hint} — просмотр AmE`, undefined);
  }
}

function main() {
  const lwPath = join(REPO, 'app/lesson_words.tsx');
  if (!existsSync(lwPath)) {
    console.error('lesson_words.tsx not found');
    process.exit(1);
  }
  const lw = readFileSync(lwPath, 'utf8');
  const lessonWordMap = parseWordsByLessonFromFile(lw);

  checkPhrasesAndWords();
  checkLessonCards();
  checkVocabPacks();
  checkVocabularyAndDedup(lessonWordMap);
  checkIrregularVerbs();
  checkTheoryFile();

  const report = findings.filter((f) => {
    if (LESSON_FILTER == null) return true;
    if (f.lessonId === LESSON_FILTER) return true;
    if (f.lessonId == null && f.check === 'theory_ame') return true;
    return false;
  });

  const err = report.filter((f) => f.severity === 'error');
  const warn = report.filter((f) => f.severity === 'warn');

  if (LESSON_FILTER != null) {
    console.log(`=== Урок ${LESSON_FILTER} (остальные уроки скрыты) ===\n`);
  }

  if (SUMMARY) {
    const by = new Map<string, number>();
    for (const f of report) by.set(f.check, (by.get(f.check) || 0) + 1);
    const lines = [...by.entries()].sort((a, b) => b[1] - a[1]);
    for (const [k, n] of lines) console.log(`${n}\t${k}`);
  } else {
    for (const f of report) {
      const tag = f.severity === 'error' ? 'ERR' : f.severity === 'warn' ? 'WRN' : 'INF';
      const loc = [f.lessonId != null ? `L${f.lessonId}` : '', f.phraseId != null ? `id=${f.phraseId}` : ''].filter(Boolean).join(' ');
      console.log(`[${tag}][${f.check}]${loc ? ' ' + loc : ''} ${f.detail}`);
    }
  }

  console.log('\n---');
  console.log(
    `Всего по отчёту: ${report.length} (${err.length} ошиб., ${warn.length} предупр.)` +
      (LESSON_FILTER != null ? ` [урок ${LESSON_FILTER}]` : ` — в базе ${findings.length} находок`) +
      (SUMMARY ? '' : ' — подробно без --summary')
  );
  if (WARN_ONLY) {
    process.exit(0);
  }
  process.exit(err.length > 0 ? 1 : 0);
}

main();
