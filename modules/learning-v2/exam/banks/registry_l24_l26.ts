// registry_l24_l26.ts — подключённые банки экзамена главы v2: уроки 24–26. Хозяин файла — 5 · Вход.
// зачем (слово владельца 26.10: «банки для всех уроков и всех глав — в обнову 2.0.3»; координатор: 7 сессий пишут параллельно): у каждой
// сессии свой реестр, общий индекс ./index.ts собирает их все — чужие файлы при подключении не трогаются. Подключать банк (import + строка
// в список) — только когда зелёные оба сторожа: tests/learning_v2_chapter_exam_v2_banks_rules.test.ts и
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Файл банка — chapter_exam_v2_lNN_cM.ts рядом, ключ главы — из его полей.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';
import { CHAPTER_EXAM_V2_BANK_L24_C1 } from './chapter_exam_v2_l24_c1';
import { CHAPTER_EXAM_V2_BANK_L24_C2 } from './chapter_exam_v2_l24_c2';
import { CHAPTER_EXAM_V2_BANK_L24_C3 } from './chapter_exam_v2_l24_c3';
import { CHAPTER_EXAM_V2_BANK_L24_C4 } from './chapter_exam_v2_l24_c4';
import { CHAPTER_EXAM_V2_BANK_L24_C5 } from './chapter_exam_v2_l24_c5';
import { CHAPTER_EXAM_V2_BANK_L24_C6 } from './chapter_exam_v2_l24_c6';
import { CHAPTER_EXAM_V2_BANK_L24_C7 } from './chapter_exam_v2_l24_c7';
import { CHAPTER_EXAM_V2_BANK_L25_C1 } from './chapter_exam_v2_l25_c1';
import { CHAPTER_EXAM_V2_BANK_L25_C2 } from './chapter_exam_v2_l25_c2';
import { CHAPTER_EXAM_V2_BANK_L25_C3 } from './chapter_exam_v2_l25_c3';
import { CHAPTER_EXAM_V2_BANK_L25_C4 } from './chapter_exam_v2_l25_c4';
import { CHAPTER_EXAM_V2_BANK_L25_C5 } from './chapter_exam_v2_l25_c5';
import { CHAPTER_EXAM_V2_BANK_L25_C6 } from './chapter_exam_v2_l25_c6';
import { CHAPTER_EXAM_V2_BANK_L25_C7 } from './chapter_exam_v2_l25_c7';
import { CHAPTER_EXAM_V2_BANK_L26_C1 } from './chapter_exam_v2_l26_c1';
import { CHAPTER_EXAM_V2_BANK_L26_C2 } from './chapter_exam_v2_l26_c2';
import { CHAPTER_EXAM_V2_BANK_L26_C3 } from './chapter_exam_v2_l26_c3';
import { CHAPTER_EXAM_V2_BANK_L26_C4 } from './chapter_exam_v2_l26_c4';
import { CHAPTER_EXAM_V2_BANK_L26_C5 } from './chapter_exam_v2_l26_c5';
import { CHAPTER_EXAM_V2_BANK_L26_C6 } from './chapter_exam_v2_l26_c6';
import { CHAPTER_EXAM_V2_BANK_L26_C7 } from './chapter_exam_v2_l26_c7';

// зачем (координатор 26.10, «банки для всех уроков и глав — в 2.0.3»): 21 банк уроков 24–26 подключён после зелёных
// learning_v2_chapter_exam_v2_banks_rules и owner_locks_exam_episode_words. Читабельный вид — docs/work/exam-banks/l24.md … l26.md.
export const BANKS_L24_L26: readonly ChapterExamV2Bank[] = [
  CHAPTER_EXAM_V2_BANK_L24_C1,
  CHAPTER_EXAM_V2_BANK_L24_C2,
  CHAPTER_EXAM_V2_BANK_L24_C3,
  CHAPTER_EXAM_V2_BANK_L24_C4,
  CHAPTER_EXAM_V2_BANK_L24_C5,
  CHAPTER_EXAM_V2_BANK_L24_C6,
  CHAPTER_EXAM_V2_BANK_L24_C7,
  CHAPTER_EXAM_V2_BANK_L25_C1,
  CHAPTER_EXAM_V2_BANK_L25_C2,
  CHAPTER_EXAM_V2_BANK_L25_C3,
  CHAPTER_EXAM_V2_BANK_L25_C4,
  CHAPTER_EXAM_V2_BANK_L25_C5,
  CHAPTER_EXAM_V2_BANK_L25_C6,
  CHAPTER_EXAM_V2_BANK_L25_C7,
  CHAPTER_EXAM_V2_BANK_L26_C1,
  CHAPTER_EXAM_V2_BANK_L26_C2,
  CHAPTER_EXAM_V2_BANK_L26_C3,
  CHAPTER_EXAM_V2_BANK_L26_C4,
  CHAPTER_EXAM_V2_BANK_L26_C5,
  CHAPTER_EXAM_V2_BANK_L26_C6,
  CHAPTER_EXAM_V2_BANK_L26_C7,
];
