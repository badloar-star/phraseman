/**
 * Выгрузка только: (1) фразы уроков, (2) теория с экрана «Теория» (lesson_help.tsx).
 * Интро-слайды перед уроком сюда не входят.
 *
 * Папка: exports/lesson-theory-dump/
 * npm run dump:lesson-intros-json
 * npm run dump:lesson-content  (то же)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { LessonPhrase } from "../app/lesson_data_types";

import {
  LESSON_1_PHRASES,
  LESSON_2_PHRASES,
  LESSON_3_PHRASES,
  LESSON_4_PHRASES,
  LESSON_5_PHRASES,
  LESSON_6_PHRASES,
  LESSON_7_PHRASES,
  LESSON_8_PHRASES,
} from "../app/lesson_data_1_8";

import {
  LESSON_9_PHRASES,
  LESSON_10_PHRASES,
  LESSON_11_PHRASES,
  LESSON_12_PHRASES,
  LESSON_13_PHRASES,
  LESSON_14_PHRASES,
  LESSON_15_PHRASES,
  LESSON_16_PHRASES,
} from "../app/lesson_data_9_16";

import {
  LESSON_17_PHRASES,
  LESSON_18_PHRASES,
  LESSON_19_PHRASES,
  LESSON_20_PHRASES,
  LESSON_21_PHRASES,
  LESSON_22_PHRASES,
  LESSON_23_PHRASES,
  LESSON_24_PHRASES,
} from "../app/lesson_data_17_24";

import {
  LESSON_25_PHRASES,
  LESSON_26_PHRASES,
  LESSON_27_PHRASES,
  LESSON_28_PHRASES,
  LESSON_29_PHRASES,
  LESSON_30_PHRASES,
  LESSON_31_PHRASES,
  LESSON_32_PHRASES,
} from "../app/lesson_data_25_32";

import { extractTheoryHelpFromDisk } from "./extract_lesson_theory_help";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = path.resolve(__dirname, "..");

const EXPORT_DIR = path.join(root, "exports", "lesson-theory-dump");

fs.mkdirSync(EXPORT_DIR, { recursive: true });

function compactPhrase(p: LessonPhrase): {
  id: string | number;
  english: string;
  russian: string;
  ukrainian: string;
  spanish?: string;
} {
  const row: {
    id: string | number;
    english: string;
    russian: string;
    ukrainian: string;
    spanish?: string;
  } = {
    id: p.id,
    english: p.english,
    russian: p.russian,
    ukrainian: p.ukrainian,
  };
  if (p.spanish != null && String(p.spanish).trim() !== "") {
    row.spanish = p.spanish;
  }
  return row;
}

const phrasesPayload = {
  _about:
    "Фразы уроков: id, english, russian, ukrainian, spanish (если есть). Без words/distractors. Без интро-слайдов. Перегенерация: npm run dump:lesson-content",
  phrasesByLessonId: Object.fromEntries(
    (
      [
        [1, LESSON_1_PHRASES],
        [2, LESSON_2_PHRASES],
        [3, LESSON_3_PHRASES],
        [4, LESSON_4_PHRASES],
        [5, LESSON_5_PHRASES],
        [6, LESSON_6_PHRASES],
        [7, LESSON_7_PHRASES],
        [8, LESSON_8_PHRASES],
        [9, LESSON_9_PHRASES],
        [10, LESSON_10_PHRASES],
        [11, LESSON_11_PHRASES],
        [12, LESSON_12_PHRASES],
        [13, LESSON_13_PHRASES],
        [14, LESSON_14_PHRASES],
        [15, LESSON_15_PHRASES],
        [16, LESSON_16_PHRASES],
        [17, LESSON_17_PHRASES],
        [18, LESSON_18_PHRASES],
        [19, LESSON_19_PHRASES],
        [20, LESSON_20_PHRASES],
        [21, LESSON_21_PHRASES],
        [22, LESSON_22_PHRASES],
        [23, LESSON_23_PHRASES],
        [24, LESSON_24_PHRASES],
        [25, LESSON_25_PHRASES],
        [26, LESSON_26_PHRASES],
        [27, LESSON_27_PHRASES],
        [28, LESSON_28_PHRASES],
        [29, LESSON_29_PHRASES],
        [30, LESSON_30_PHRASES],
        [31, LESSON_31_PHRASES],
        [32, LESSON_32_PHRASES],
      ] as const
    ).map(([n, arr]) => [String(n), arr.map(compactPhrase)]),
  ),
};

fs.writeFileSync(
  path.join(EXPORT_DIR, "lesson_phrases.json"),
  JSON.stringify(phrasesPayload, null, 2),
  "utf8",
);

console.log("Wrote exports/lesson-theory-dump/lesson_phrases.json");

const theory = extractTheoryHelpFromDisk();
(theory as Record<string, unknown>)._about =
  `${String((theory as Record<string, unknown>)._about)} Папка: exports/lesson-theory-dump/. Перегенерация: npm run dump:lesson-content.`;

fs.writeFileSync(
  path.join(EXPORT_DIR, "lesson_theory_help.json"),
  JSON.stringify(theory, null, 2),
  "utf8",
);

console.log("Wrote exports/lesson-theory-dump/lesson_theory_help.json");
