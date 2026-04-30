/**
 * Комплексный аудит:
 *  A) lesson_words.tsx — дубликаты EN в уроке, множественные UK для одного EN, утечки RU↔UK,
 *     отсутствие кириллицы в переводах.
 *  B) LESSON_DATA — один набор distractors переиспользуется для разных грамм. классов correct,
 *     предлог correct без category preposition, общеизвестный «rhyme pack» не у alone/wrong.
 *
 * Запуск: node scripts/audit_vocab_and_distractors.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const WORDS_FILE = path.join(ROOT, 'app', 'lesson_words.tsx');
const OUT_DIR = path.join(ROOT, 'docs', 'reports');

function loadTsModule(absPath) {
  const code = fs.readFileSync(absPath, 'utf8');
  const out = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: absPath,
  });
  const module = { exports: {} };
  const requireShim = (rel) => {
    if (rel === './lesson_data_types' || rel.endsWith('lesson_data_types')) return {};
    if (rel.startsWith('./')) {
      const next = path.resolve(path.dirname(absPath), `${rel}.ts`);
      if (fs.existsSync(next)) return loadTsModule(next);
    }
    return {};
  };
  // eslint-disable-next-line no-new-func
  const fn = new Function('module', 'exports', 'require', out.outputText);
  fn(module, module.exports, requireShim);
  return module.exports;
}

const CYR_UK = /[А-ЩЬЮЯа-щьюяІіЇїЄєҐґ]/;
const RU_MARKERS_IN_UK = /[ыэъёЫЭЪЁ]/;
const UK_MARKERS_IN_RU = /[іїєґІЇЄҐ]/;

/** Предлоги без near (near часто адверб в «near here»). */
const PREP_FOR_CATEGORY_AUDIT = new Set([
  'at', 'in', 'on', 'to', 'for', 'by', 'with', 'from', 'of', 'into', 'onto',
  'over', 'under', 'between', 'among', 'through', 'during', 'before', 'after',
  'without', 'against', 'about', 'around', 'behind', 'beside', 'beyond',
]);

const BE_SET = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being']);
const MODAL_SET = new Set(['can', 'could', 'must', 'should', 'would', 'will', 'may', 'might', 'cannot']);
const ARTICLE_SET = new Set(['a', 'an', 'the']);
const PRONOUN_SET = new Set([
  'i', 'you', 'he', 'she', 'we', 'they', 'it',
  'my', 'your', 'his', 'her', 'our', 'their',
  'me', 'him', 'them', 'us',
  'mine', 'yours', 'hers', 'ours', 'theirs',
]);

/** Известный ошибочный набор дистракторов (рифмы к alone), если correct не alone/wrong */
const ALONE_RHYME_FP = ['adore', 'along', 'aloud', 'clone', 'lone'].sort().join('|');

function normTok(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[.?!,;:]+$/g, '')
    .trim();
}

/** Грубый класс правильного слова — чтобы ловить чужие наборы дистракторов между классами. */
function coarseBucket(correctRaw) {
  const x = normTok(correctRaw);
  if (!x || x === '-') return 'marker';
  if (PREP_FOR_CATEGORY_AUDIT.has(x)) return 'prep';
  if (BE_SET.has(x)) return 'be';
  if (MODAL_SET.has(x)) return 'modal';
  if (PRONOUN_SET.has(x)) return 'pronoun';
  if (['not', 'no', 'nor'].includes(x)) return 'neg';
  if (ARTICLE_SET.has(x)) return 'article';
  return 'open';
}

function distractorFingerprint(distractors) {
  if (!Array.isArray(distractors)) return '';
  return [...distractors.map((d) => normTok(d))].filter(Boolean).sort().join('|');
}

/** Разбор WORDS_BY_LESSON: только строки вида { en, ru, uk, pos } в этом порядке */
function parseWordsByLessonFull() {
  const src = fs.readFileSync(WORDS_FILE, 'utf8');
  const start = src.indexOf('const WORDS_BY_LESSON');
  if (start < 0) throw new Error('WORDS_BY_LESSON not found');
  const obj = src.slice(start);
  const headerRe = /^\s{0,4}(\d+):\s*\[\s*$/gm;
  const headers = [];
  let m;
  while ((m = headerRe.exec(obj))) headers.push({ id: Number(m[1]), idx: m.index, after: headerRe.lastIndex });

  const itemRe =
    /\{\s*en:\s*(['"])((?:\\.|(?!\1).)*?)\1\s*,\s*ru:\s*(['"])((?:\\.|(?!\3).)*?)\3\s*,\s*uk:\s*(['"])((?:\\.|(?!\5).)*?)\5\s*,\s*pos:\s*(['"])((?:\\.|(?!\7).)*?)\7\s*\}/g;

  const result = new Map();
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const next = i + 1 < headers.length ? headers[i + 1].idx : obj.length;
    const block = obj.slice(h.after, next);
    const endIdx = block.indexOf('\n  ],');
    const body = endIdx >= 0 ? block.slice(0, endIdx) : block;
    const items = [];
    let im;
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

function auditVocab(wordsByLesson) {
  const issues = [];

  /** @type {Map<string, Set<string>>} */
  const enToUk = new Map();

  for (const [lessonId, items] of wordsByLesson) {
    const seenEn = new Map();
    for (let idx = 0; idx < items.length; idx++) {
      const row = items[idx];
      const ctx = `lesson_words L${lessonId}[${idx}] en="${row.en}"`;
      const enL = normTok(row.en);
      if (!row.ru?.trim()) issues.push({ kind: 'V_EMPTY_RU', lesson: lessonId, ctx, msg: 'пустой ru' });
      if (!row.uk?.trim()) issues.push({ kind: 'V_EMPTY_UK', lesson: lessonId, ctx, msg: 'пустой uk' });
      if (row.ru?.trim() && !CYR_UK.test(row.ru)) issues.push({ kind: 'V_RU_NOT_CYR', lesson: lessonId, ctx, msg: `ru без кириллицы: «${row.ru}»` });
      if (
        row.uk?.trim()
        && !CYR_UK.test(row.uk)
        && !/^[-‑]\s*[a-z]+$/i.test(row.uk.trim())
        && !/&#/.test(row.uk)
      ) {
        issues.push({ kind: 'V_UK_NOT_CYR', lesson: lessonId, ctx, msg: `uk без кириллицы: «${row.uk}»` });
      }
      if (row.uk?.trim() && /&#(?:x?[0-9a-f]+|[a-z]+);?/i.test(row.uk)) {
        issues.push({ kind: 'V_HTML_ENTITY_IN_TRANSLATION', lesson: lessonId, ctx, msg: `HTML-сущность в uk: «${row.uk}»` });
      }
      if (RU_MARKERS_IN_UK.test(row.uk || '')) issues.push({ kind: 'V_RU_LEAK_IN_UK', lesson: lessonId, ctx, msg: `uk похож на русский (ы/э/ъ/ё): «${row.uk}»` });
      if (UK_MARKERS_IN_RU.test(row.ru || '')) issues.push({ kind: 'V_UK_LEAK_IN_RU', lesson: lessonId, ctx, msg: `ru похож на украинский (і/ї/є/ґ): «${row.ru}»` });

      if (!seenEn.has(enL)) seenEn.set(enL, []);
      seenEn.get(enL).push(idx);

      if (!enToUk.has(enL)) enToUk.set(enL, new Set());
      enToUk.get(enL).add(row.uk.trim());
    }
    for (const [enL, indices] of seenEn) {
      if (indices.length > 1) {
        issues.push({
          kind: 'V_DUP_EN_IN_LESSON',
          lesson: lessonId,
          ctx: `lesson_words L${lessonId}`,
          msg: `"${enL}" повторяется ${indices.length} раз (индексы ${indices.join(', ')})`,
        });
      }
    }
  }

  for (const [enL, ukSet] of enToUk) {
    if (ukSet.size >= 3) {
      issues.push({
        kind: 'V_MULTI_UK_GLOBAL',
        lesson: 0,
        ctx: `en="${enL}"`,
        msg: `${ukSet.size} разных uk по всем урокам: ${[...ukSet].join(' | ')}`,
      });
    }
  }

  return issues;
}

function auditLessonData(lessonData) {
  const issues = [];
  /** @type {Map<string, Array<{ lesson: number; phraseId: string; correct: string; fp: string; category?: string; english: string }>>} */
  const fpIndex = new Map();

  const ids = Object.keys(lessonData)
    .map(Number)
    .filter((n) => n >= 1 && n <= 32)
    .sort((a, b) => a - b);

  for (const lessonId of ids) {
    const lesson = lessonData[lessonId];
    const phrases = lesson?.phrases || [];
    for (const p of phrases) {
      const phraseId = p?.id ?? '?';
      const english = String(p?.english ?? '');
      const words = p?.words || [];
      for (let j = 0; j < words.length; j++) {
        const w = words[j];
        if (!w || typeof w !== 'object') continue;
        const correct = normTok(w.correct ?? w.text ?? '');
        const cat = (w.category || '').toLowerCase();
        const distractors = w.distractors || [];
        const fp = distractorFingerprint(distractors);

        if (PREP_FOR_CATEGORY_AUDIT.has(correct) && cat && cat !== 'preposition') {
          issues.push({
            kind: 'D_PREP_CATEGORY',
            lesson: lessonId,
            ctx: `${phraseId} words[${j}]`,
            msg: `correct="${correct}" похож на предлог, но category="${w.category}"`,
          });
        }

        if (fp === ALONE_RHYME_FP && correct !== 'alone' && correct !== 'wrong') {
          issues.push({
            kind: 'D_ALONE_RHYME_PACK',
            lesson: lessonId,
            ctx: `${phraseId} words[${j}]`,
            msg: `набор дистракторов как у «alone», но correct="${w.correct}" (${english.slice(0, 60)}…)`,
          });
        }

        if (fp.length > 0) {
          if (!fpIndex.has(fp)) fpIndex.set(fp, []);
          fpIndex.get(fp).push({
            lesson: lessonId,
            phraseId,
            correct: w.correct ?? w.text,
            fp,
            category: w.category,
            english,
          });
        }
      }
    }
  }

  for (const [, rows] of fpIndex) {
    if (rows.length < 2) continue;
    const uniqCorrect = [...new Set(rows.map((r) => normTok(r.correct)))];
    if (uniqCorrect.length <= 1) continue;
    const buckets = new Set(uniqCorrect.map((c) => coarseBucket(c)));
    if (buckets.size < 2) continue;
    const sample = rows
      .slice(0, 8)
      .map((r) => `L${r.lesson}:${r.phraseId}:${normTok(r.correct)}`)
      .join('; ');
    issues.push({
      kind: 'D_FP_CROSS_CLASS',
      lesson: rows[0].lesson,
      ctx: `fp=${rows[0].fp.length > 90 ? `${rows[0].fp.slice(0, 90)}…` : rows[0].fp}`,
      msg: `один distractor-set для разных грамм. классов [${[...buckets].sort().join(', ')}]: ${sample}${rows.length > 8 ? ' …' : ''}`,
    });
  }

  return issues;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const ALL = loadTsModule(path.join(ROOT, 'app', 'lesson_data_all.ts'));
  const LESSON_DATA = ALL.LESSON_DATA;

  const wordsByLesson = parseWordsByLessonFull();
  const issuesV = auditVocab(wordsByLesson);
  const issuesD = auditLessonData(LESSON_DATA);
  const issues = [...issuesV, ...issuesD];

  const byKind = {};
  for (const i of issues) byKind[i.kind] = (byKind[i.kind] || 0) + 1;

  const stamp = new Date().toISOString().slice(0, 10);
  const mdPath = path.join(OUT_DIR, `content_audit_vocab_distractors_${stamp}.md`);
  const jsonPath = path.join(OUT_DIR, `content_audit_vocab_distractors_${stamp}.json`);

  const lines = [];
  lines.push(`# Аудит словаря + дистракторов (${stamp})`);
  lines.push('');
  lines.push('Запуск: `node scripts/audit_vocab_and_distractors.mjs`');
  lines.push('');
  lines.push('## Сводка по типам');
  for (const [k, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
    lines.push(`- **${k}**: ${n}`);
  }
  lines.push('');
  lines.push(`**Всего замечаний:** ${issues.length}`);
  lines.push('');
  lines.push(
    '## Как читать `D_FP_CROSS_CLASS`\n\nОдин отпечаток набора distractors встречается у слотов с разными типами правильного слова (предлог vs местоимение, отрицание vs обычное слово и т.д.). Часть строк — следствие того, что в данных один и тот же пул дистракторов намеренно повторяют для разных форм (*are*/*is*). Строки с явным смешением (**prep** + **pronoun**, **prep** + **neg**) стоит проверять в первую очередь.',
  );
  lines.push('');
  lines.push('## Другие аудиты в репозитории');
  lines.push('');
  lines.push('- `npm run audit:lessons` — структура фраз, кодировки, число distractors (`scripts/audit_lessons_1_27.mjs`).');
  lines.push('- `npm run audit:translations` — эвристики по переводам фраз (`scripts/audit_translations_1_32.mjs`).');
  lines.push('- `npm run audit:correct-presence` — слоты фраз vs токены `getPhraseWords`, дубликат correct в distractors (`scripts/audit_correct_word_presence.ts`).');
  lines.push('- `node tools/audit/audit_lessons_1_32.mjs` — словарь vs фразы, дубликаты.');
  lines.push('- `node scripts/audit_fake_distractors.mjs` — не-словарные англ. distractors (пакет `an-array-of-english-words` в devDependencies).');
  lines.push('');
  lines.push('## Детали (до 400 строк)');
  for (const i of issues.slice(0, 400)) {
    lines.push(`- \`${i.kind}\` L${i.lesson} ${i.ctx} — ${i.msg}`);
  }
  if (issues.length > 400) lines.push(`\n… и ещё ${issues.length - 400} (см. JSON).`);

  fs.writeFileSync(mdPath, lines.join('\n'), 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify({ stamp, byKind, issues }, null, 2), 'utf8');

  console.log(lines.join('\n'));
  console.log(`\nWritten:\n  ${mdPath}\n  ${jsonPath}`);
}

main();
