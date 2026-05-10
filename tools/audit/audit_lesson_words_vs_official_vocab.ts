/**
 * Сверяет app/lesson_words.tsx с официальными LESSON_*_VOCABULARY в lesson_data_*.ts.
 * Пишет отчёт: несовпадение RU/UK при том же EN, дубликаты EN, слова из официального словаря без карточки.
 *
 * Запуск: npx tsx tools/audit/audit_lesson_words_vs_official_vocab.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parseFullWordsByLessonFromFile, parseFullWordLine } from '../lesson_qa/parse_lesson_words_text';
import {
  LESSON_4_VOCABULARY,
  LESSON_5_VOCABULARY,
  LESSON_6_VOCABULARY,
  LESSON_7_VOCABULARY,
  LESSON_8_VOCABULARY,
} from '../../app/lesson_data_1_8';
import {
  LESSON_9_VOCABULARY,
  LESSON_10_VOCABULARY,
  LESSON_11_VOCABULARY,
  LESSON_12_VOCABULARY,
  LESSON_16_VOCABULARY,
} from '../../app/lesson_data_9_16';
import {
  LESSON_17_VOCABULARY,
  LESSON_18_VOCABULARY,
  LESSON_19_VOCABULARY,
  LESSON_20_VOCABULARY,
  LESSON_21_VOCABULARY,
  LESSON_22_VOCABULARY,
  LESSON_23_VOCABULARY,
  LESSON_24_VOCABULARY,
} from '../../app/lesson_data_17_24';
import {
  LESSON_25_VOCABULARY,
  LESSON_26_VOCABULARY,
  LESSON_27_VOCABULARY,
  LESSON_28_VOCABULARY,
  LESSON_29_VOCABULARY,
  LESSON_30_VOCABULARY,
  LESSON_31_VOCABULARY,
  LESSON_32_VOCABULARY,
} from '../../app/lesson_data_25_32';

type VRow = { english: string; russian: string; ukrainian: string };

function normEn(s: string): string {
  return s.trim().toLowerCase();
}

function normRuUk(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Делит подсказку на значимые части (синонимы, варианты). */
function parts(s: string): string[] {
  return normRuUk(s)
    .split(/[/|·,;]+/)
    .map((p) => p.replace(/[()]/g, ' ').trim())
    .filter((p) => p.length > 1);
}

/** Мягкое совпадение: общий значимый токен или вхождение одной строки в другую. */
function compatible(official: string, card: string): boolean {
  const o = normRuUk(official);
  const c = normRuUk(card);
  if (!o || !c) return true;
  if (o === c) return true;
  if (c.includes(o) || o.includes(c)) return true;
  const po = parts(official);
  const pc = parts(card);
  for (const a of po) {
    for (const b of pc) {
      if (a.length < 2 || b.length < 2) continue;
      if (a === b) return true;
      if (a.length >= 4 && b.includes(a)) return true;
      if (b.length >= 4 && a.includes(b)) return true;
    }
  }
  return false;
}

function buildOfficialMap(): Map<number, Map<string, VRow>> {
  const rows: [number, VRow[]][] = [
    [4, LESSON_4_VOCABULARY],
    [5, LESSON_5_VOCABULARY],
    [6, LESSON_6_VOCABULARY],
    [7, LESSON_7_VOCABULARY],
    [8, LESSON_8_VOCABULARY],
    [9, LESSON_9_VOCABULARY],
    [10, LESSON_10_VOCABULARY],
    [11, LESSON_11_VOCABULARY],
    [12, LESSON_12_VOCABULARY],
    [16, LESSON_16_VOCABULARY],
    [17, LESSON_17_VOCABULARY],
    [18, LESSON_18_VOCABULARY],
    [19, LESSON_19_VOCABULARY],
    [20, LESSON_20_VOCABULARY],
    [21, LESSON_21_VOCABULARY],
    [22, LESSON_22_VOCABULARY],
    [23, LESSON_23_VOCABULARY],
    [24, LESSON_24_VOCABULARY],
    [25, LESSON_25_VOCABULARY],
    [26, LESSON_26_VOCABULARY],
    [27, LESSON_27_VOCABULARY],
    [28, LESSON_28_VOCABULARY],
    [29, LESSON_29_VOCABULARY],
    [30, LESSON_30_VOCABULARY],
    [31, LESSON_31_VOCABULARY],
    [32, LESSON_32_VOCABULARY],
  ];
  const map = new Map<number, Map<string, VRow>>();
  for (const [lessonId, list] of rows) {
    const m = new Map<string, VRow>();
    for (const row of list) {
      m.set(normEn(row.english), row);
    }
    map.set(lessonId, m);
  }
  return map;
}

function main() {
  const root = join(__dirname, '../..');
  const lwPath = join(root, 'app', 'lesson_words.tsx');
  const content = readFileSync(lwPath, 'utf8');
  const byLesson = parseFullWordsByLessonFromFile(content);
  const official = buildOfficialMap();

  const ruMismatches: string[] = [];
  const ukMismatches: string[] = [];
  const dupEn: string[] = [];
  const officialNotInLessonWords: string[] = [];
  const parseFailures: string[] = [];

  let totalCards = 0;
  for (const [lessonId, words] of byLesson) {
    totalCards += words.length;
    const seen = new Map<string, number>();
    const off = official.get(lessonId);
    for (const w of words) {
      const k = normEn(w.en);
      seen.set(k, (seen.get(k) ?? 0) + 1);
      if (!off) continue;
      const row = off.get(k);
      if (!row) continue;
      if (!compatible(row.russian, w.ru)) {
        ruMismatches.push(
          `L${lessonId} **${w.en}** | official.ru: «${row.russian}» | lesson_words.ru: «${w.ru}»`,
        );
      }
      if (!compatible(row.ukrainian, w.uk)) {
        ukMismatches.push(
          `L${lessonId} **${w.en}** | official.uk: «${row.ukrainian}» | lesson_words.uk: «${w.uk}»`,
        );
      }
    }
    for (const [k, n] of seen) {
      if (n > 1) dupEn.push(`L${lessonId}: **${k}** ×${n}`);
    }

    if (off) {
      for (const [enKey, row] of off) {
        if (!seen.has(enKey)) {
          officialNotInLessonWords.push(`L${lessonId}: **${row.english}**`);
        }
      }
    }
  }

  // Строки с { en: но без полного разбора
  for (const l of content.split('\n')) {
    if (!l.includes('{ en:')) continue;
    if (l.trim().startsWith('//')) continue;
    if (!parseFullWordLine(l)) parseFailures.push(l.trim().slice(0, 120));
    if (parseFailures.length >= 50) break;
  }

  const out: string[] = [];
  out.push('# Сверка lesson_words ↔ официальный LESSON_*_VOCABULARY');
  out.push('');
  out.push(`Карточек в lesson_words (разобрано): **${totalCards}**`);
  out.push(`Официальные списки: уроки 4–13, 16–32 (в \`lesson_data_9_16.ts\` нет отдельного VOCABULARY для 14–15).`);
  out.push('');
  out.push(
    '> **Как читать:** совпадение по смыслу проверяется мягко (общие корни / вхождение). ' +
      'Строки ниже — где формулировки **разошлись сильнее** с карточкой «методички»; часть из них — допустимые синонимы (fix ↔ починить), часть — явные ошибки данных (опечатки, неверный перевод).',
  );
  out.push('');
  out.push('## RU: официальный список vs lesson_words (мягкая проверка)');
  out.push('');
  out.push(ruMismatches.length ? ruMismatches.join('\n') : '_Несовпадений не найдено._');
  out.push('');
  out.push('## UK');
  out.push('');
  out.push(ukMismatches.length ? ukMismatches.join('\n') : '_Несовпадений не найдено._');
  out.push('');
  out.push('## Дубликаты en в одном уроке');
  out.push('');
  out.push(dupEn.length ? dupEn.join('\n') : '_Нет._');
  out.push('');
  out.push('## Официальный VOCABULARY: леммы без отдельной карточки в lesson_words');
  out.push('');
  out.push(
    `Всего **${officialNotInLessonWords.length}** — это нормально: тренажёр подтягивает слова из **фраз** урока, а официальный список короче и не обязан совпадать 1:1.`,
  );
  out.push('');
  out.push(
    officialNotInLessonWords.length <= 80
      ? officialNotInLessonWords.join('\n')
      : `${officialNotInLessonWords.slice(0, 80).join('\n')}\n\n… и ещё ${officialNotInLessonWords.length - 80} строк.`,
  );
  out.push('');
  out.push('## Строки с `{ en:` без полного парса (первые 50)');
  out.push('');
  out.push(parseFailures.length ? '```\n' + parseFailures.join('\n') + '\n```' : '_Нет._');

  const reportPath = join(__dirname, 'AUDIT_LESSON_WORDS_VOCAB.md');
  writeFileSync(reportPath, out.join('\n'), 'utf8');
  console.log(`Wrote ${reportPath}`);
  console.log(
    `ru mismatches: ${ruMismatches.length}, uk: ${ukMismatches.length}, dup en: ${dupEn.length}, official lemmas not in lw: ${officialNotInLessonWords.length}`,
  );
}

main();
