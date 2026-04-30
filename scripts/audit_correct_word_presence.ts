/**
 * Ищем места, где пользователь может не увидеть «правильное слово» среди вариантов или где
 * слот фразы не соответствует английскому предложению (типичная причина «нет верного ответа»).
 *
 * Проверки:
 *  1) Число слотов phrase.words vs tokenize english (getPhraseWords) — при несовпадении слоты поехали.
 *  2) tokens[i] vs words[i].correct — правильное слово для слота не то, что в предложении.
 *  3) Пустой correct.
 *  4) correct дублируется в distractors (путаница / ошибка данных).
 *  5) Словарь lesson_words: детерминированная симуляция makeOptions — correct.en всегда в списке из 6.
 *
 * Запуск из корня: npx tsx scripts/audit_correct_word_presence.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { LESSON_DATA } from '../app/lesson_data_all';
import { getPhraseWords } from '../app/lesson1_smart_options';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'docs', 'reports');

type IssueKind =
  | 'EMPTY_CORRECT'
  | 'TOKEN_LEN_MISMATCH'
  | 'TOKEN_CORRECT_MISMATCH'
  | 'CORRECT_IN_DISTRACTORS'
  | 'VOCAB_OPTIONS_MISSING_CORRECT';

interface Issue {
  kind: IssueKind;
  lesson: number;
  phraseId: string;
  english: string;
  slot: number;
  msg: string;
}

function stripTok(s: string): string {
  return String(s ?? '')
    .trim()
    .replace(/^[/«»]+/, '')
    .replace(/[.,!?;:]+$/g, '')
    .trim();
}

function eqTok(a: string, b: string): boolean {
  return stripTok(a).toLowerCase() === stripTok(b).toLowerCase();
}

function auditLessonPhrases(): Issue[] {
  const issues: Issue[] = [];
  for (let lessonId = 1; lessonId <= 32; lessonId++) {
    const lesson = LESSON_DATA[lessonId];
    if (!lesson?.phrases) continue;
    for (const p of lesson.phrases) {
      const english = String(p.english ?? '');
      const phraseId = String(p.id ?? '?');
      const words = p.words ?? [];
      let tokens: string[] = [];
      try {
        tokens = getPhraseWords(english);
      } catch {
        issues.push({
          kind: 'TOKEN_LEN_MISMATCH',
          lesson: lessonId,
          phraseId,
          english,
          slot: -1,
          msg: `getPhraseWords упал для english`,
        });
        continue;
      }

      if (tokens.length !== words.length) {
        issues.push({
          kind: 'TOKEN_LEN_MISMATCH',
          lesson: lessonId,
          phraseId,
          english,
          slot: -1,
          msg: `токенов=${tokens.length}, words=${words.length}; tokens=[${tokens.join('|')}]`,
        });
      }

      const n = Math.min(tokens.length, words.length);
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const correctRaw = w?.correct ?? w?.text ?? '';
        if (!String(correctRaw).trim()) {
          issues.push({
            kind: 'EMPTY_CORRECT',
            lesson: lessonId,
            phraseId,
            english,
            slot: i,
            msg: `пустой correct/text`,
          });
          continue;
        }

        if (i < n && !eqTok(tokens[i], correctRaw)) {
          issues.push({
            kind: 'TOKEN_CORRECT_MISMATCH',
            lesson: lessonId,
            phraseId,
            english,
            slot: i,
            msg: `ожидали токен «${tokens[i]}», в данных correct «${correctRaw}»`,
          });
        }

        const distractors = w?.distractors ?? [];
        if (distractors.some((d) => eqTok(d, correctRaw))) {
          issues.push({
            kind: 'CORRECT_IN_DISTRACTORS',
            lesson: lessonId,
            phraseId,
            english,
            slot: i,
            msg: `correct «${correctRaw}» также в distractors`,
          });
        }

      }
    }
  }
  return issues;
}

/** Парсер WORDS_BY_LESSON из lesson_words.tsx — только { en, ru, uk, pos } подряд */
function parseLessonWordsRows(): Map<number, { en: string; ru: string; uk: string; pos: string }[]> {
  const src = fs.readFileSync(path.join(ROOT, 'app', 'lesson_words.tsx'), 'utf8');
  const start = src.indexOf('const WORDS_BY_LESSON');
  if (start < 0) throw new Error('WORDS_BY_LESSON not found');
  const obj = src.slice(start);
  const headerRe = /^\s{0,4}(\d+):\s*\[\s*$/gm;
  const headers: { id: number; after: number; idx: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(obj))) headers.push({ id: Number(m[1]), idx: m.index, after: headerRe.lastIndex });

  const itemRe =
    /\{\s*en:\s*(['"])((?:\\.|(?!\1).)*?)\1\s*,\s*ru:\s*(['"])((?:\\.|(?!\3).)*?)\3\s*,\s*uk:\s*(['"])((?:\\.|(?!\5).)*?)\5\s*,\s*pos:\s*(['"])((?:\\.|(?!\7).)*?)\7\s*\}/g;

  const result = new Map<number, { en: string; ru: string; uk: string; pos: string }[]>();
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const next = i + 1 < headers.length ? headers[i + 1].idx : obj.length;
    const block = obj.slice(h.after, next);
    const endIdx = block.indexOf('\n  ],');
    const body = endIdx >= 0 ? block.slice(0, endIdx) : block;
    const items: { en: string; ru: string; uk: string; pos: string }[] = [];
    let im: RegExpExecArray | null;
    while ((im = itemRe.exec(body))) {
      items.push({
        en: im[2].replace(/\\'/g, "'").replace(/\\"/g, '"'),
        ru: im[4].replace(/\\'/g, "'").replace(/\\"/g, '"'),
        uk: im[6].replace(/\\'/g, "'").replace(/\\"/g, '"'),
        pos: im[8],
      });
    }
    result.set(h.id, items);
  }
  return result;
}

/** Детерминированная симуляция makeOptions (lesson_words): правильное слово всегда в массиве */
function auditVocabOptionsInvariant(): Issue[] {
  const issues: Issue[] = [];
  const byLesson = parseLessonWordsRows();
  const ALL_FLAT: { en: string; pos: string }[] = [];
  const seenEn = new Set<string>();
  for (const [, rows] of byLesson) {
    for (const r of rows) {
      if (!seenEn.has(r.en)) {
        seenEn.add(r.en);
        ALL_FLAT.push({ en: r.en, pos: r.pos });
      }
    }
  }
  ALL_FLAT.sort((a, b) => a.en.localeCompare(b.en));

  for (const [lessonId, rows] of byLesson) {
    for (let idx = 0; idx < rows.length; idx++) {
      const correctRow = rows[idx];
      const correct = correctRow.en;
      const notMe = (w: { en: string }) => w.en !== correct;
      const lessonSamePos = rows.filter((w) => notMe(w) && w.pos === correctRow.pos).sort((a, b) => a.en.localeCompare(b.en));
      const fromLesson = lessonSamePos.slice(0, Math.min(3, lessonSamePos.length));
      const crossPool = ALL_FLAT.filter(
        (w) => notMe(w) && w.pos === correctRow.pos && !fromLesson.some((l) => l.en === w.en),
      ).sort((a, b) => a.en.localeCompare(b.en));
      const fromCross = crossPool.slice(0, Math.max(0, 5 - fromLesson.length));
      let combined = [...fromLesson, ...fromCross];
      if (combined.length < 5) {
        const fallback = [...rows, ...ALL_FLAT]
          .filter((w) => notMe(w) && !combined.some((c) => c.en === w.en))
          .sort((a, b) => a.en.localeCompare(b.en));
        combined = [...combined, ...fallback].slice(0, 5);
      }
      const opts = [...combined.slice(0, 5).map((w) => w.en), correct];
      const hasCorrect = opts.some((o) => o === correct);
      if (!hasCorrect) {
        issues.push({
          kind: 'VOCAB_OPTIONS_MISSING_CORRECT',
          lesson: lessonId,
          phraseId: `lesson_words_L${lessonId}[${idx}]`,
          english: correct,
          slot: idx,
          msg: `makeOptions не включает correct.en «${correct}»`,
        });
      }
    }
  }
  return issues;
}

function dedupeLessonIssues(raw: Issue[]): Issue[] {
  const phraseLenMismatch = new Set(
    raw.filter((i) => i.kind === 'TOKEN_LEN_MISMATCH').map((i) => `${i.lesson}:${i.phraseId}`),
  );
  return raw.filter(
    (i) =>
      !(
        i.kind === 'TOKEN_CORRECT_MISMATCH' &&
        phraseLenMismatch.has(`${i.lesson}:${i.phraseId}`)
      ),
  );
}

function main() {
  const phraseIssues = dedupeLessonIssues(auditLessonPhrases());
  const vocabIssues = auditVocabOptionsInvariant();
  const issues = [...phraseIssues, ...vocabIssues];

  const byKind: Record<string, number> = {};
  for (const i of issues) byKind[i.kind] = (byKind[i.kind] ?? 0) + 1;

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const mdPath = path.join(REPORT_DIR, `audit_correct_word_presence_${stamp}.md`);
  const jsonPath = path.join(REPORT_DIR, `audit_correct_word_presence_${stamp}.json`);

  const lines: string[] = [];
  lines.push(`# Аудит: правильное слово в данных и соответствие фразе (${stamp})`);
  lines.push('');
  lines.push('Запуск: `npx tsx scripts/audit_correct_word_presence.ts`');
  lines.push('');
  lines.push('## Зачем этот отчёт');
  lines.push('');
  lines.push(
    'Почти всегда это несовпадение «как режется» предложение (`getPhraseWords`, включая слияние фразовых глаголов в один токен) и того, как записаны слоты в `phrase.words`. Тогда для каждого шага показываются кнопки **не для того слова**, и кажется, что правильного варианта нет.',
  );
  lines.push('');
  lines.push('## Сводка');
  for (const [k, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
    lines.push(`- **${k}**: ${n}`);
  }
  lines.push('');
  lines.push(`**Всего:** ${issues.length}`);
  lines.push('');
  lines.push('## Детали (до 500 строк)');
  for (const i of issues.slice(0, 500)) {
    lines.push(`- \`${i.kind}\` L${i.lesson} \`${i.phraseId}\` slot=${i.slot} — ${i.msg}`);
    lines.push(`  - EN: ${i.english.slice(0, 120)}${i.english.length > 120 ? '…' : ''}`);
  }
  if (issues.length > 500) lines.push(`\n… ещё ${issues.length - 500} записей в JSON.`);

  fs.writeFileSync(mdPath, lines.join('\n'), 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify({ stamp, byKind, issues }, null, 2), 'utf8');

  console.log(lines.join('\n'));
  console.log(`\nWritten:\n  ${mdPath}\n  ${jsonPath}`);
}

main();
