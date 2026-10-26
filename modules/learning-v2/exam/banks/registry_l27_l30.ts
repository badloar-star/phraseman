// registry_l27_l30.ts — подключённые банки экзамена главы v2: уроки 27–30. Хозяин файла — Learning V2.
// зачем (слово владельца 26.10: «банки для всех уроков и всех глав — в обнову 2.0.3»; координатор: 7 сессий пишут параллельно): у каждой
// сессии свой реестр, общий индекс ./index.ts собирает их все — чужие файлы при подключении не трогаются. Подключать банк (import + строка
// в список) — только когда зелёные оба сторожа: tests/learning_v2_chapter_exam_v2_banks_rules.test.ts и
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Файл банка — chapter_exam_v2_lNN_cM.ts рядом, ключ главы — из его полей.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';
import { CHAPTER_EXAM_V2_BANK_L27_C1 } from './chapter_exam_v2_l27_c1';
import { CHAPTER_EXAM_V2_BANK_L27_C2 } from './chapter_exam_v2_l27_c2';
import { CHAPTER_EXAM_V2_BANK_L27_C3 } from './chapter_exam_v2_l27_c3';
import { CHAPTER_EXAM_V2_BANK_L27_C4 } from './chapter_exam_v2_l27_c4';
import { CHAPTER_EXAM_V2_BANK_L27_C5 } from './chapter_exam_v2_l27_c5';
import { CHAPTER_EXAM_V2_BANK_L27_C6 } from './chapter_exam_v2_l27_c6';
import { CHAPTER_EXAM_V2_BANK_L27_C7 } from './chapter_exam_v2_l27_c7';
import { CHAPTER_EXAM_V2_BANK_L28_C1 } from './chapter_exam_v2_l28_c1';
import { CHAPTER_EXAM_V2_BANK_L28_C2 } from './chapter_exam_v2_l28_c2';
import { CHAPTER_EXAM_V2_BANK_L28_C3 } from './chapter_exam_v2_l28_c3';
import { CHAPTER_EXAM_V2_BANK_L28_C4 } from './chapter_exam_v2_l28_c4';
import { CHAPTER_EXAM_V2_BANK_L28_C5 } from './chapter_exam_v2_l28_c5';
import { CHAPTER_EXAM_V2_BANK_L28_C6 } from './chapter_exam_v2_l28_c6';
import { CHAPTER_EXAM_V2_BANK_L28_C7 } from './chapter_exam_v2_l28_c7';
import { CHAPTER_EXAM_V2_BANK_L29_C1 } from './chapter_exam_v2_l29_c1';
import { CHAPTER_EXAM_V2_BANK_L29_C2 } from './chapter_exam_v2_l29_c2';
import { CHAPTER_EXAM_V2_BANK_L29_C3 } from './chapter_exam_v2_l29_c3';

export const BANKS_L27_L30: readonly ChapterExamV2Bank[] = [
  CHAPTER_EXAM_V2_BANK_L27_C1,
  CHAPTER_EXAM_V2_BANK_L27_C2,
  CHAPTER_EXAM_V2_BANK_L27_C3,
  CHAPTER_EXAM_V2_BANK_L27_C4,
  CHAPTER_EXAM_V2_BANK_L27_C5,
  CHAPTER_EXAM_V2_BANK_L27_C6,
  CHAPTER_EXAM_V2_BANK_L27_C7,
  CHAPTER_EXAM_V2_BANK_L28_C1,
  CHAPTER_EXAM_V2_BANK_L28_C2,
  CHAPTER_EXAM_V2_BANK_L28_C3,
  CHAPTER_EXAM_V2_BANK_L28_C4,
  CHAPTER_EXAM_V2_BANK_L28_C5,
  CHAPTER_EXAM_V2_BANK_L28_C6,
  CHAPTER_EXAM_V2_BANK_L28_C7,
  CHAPTER_EXAM_V2_BANK_L29_C1,
  CHAPTER_EXAM_V2_BANK_L29_C2,
  CHAPTER_EXAM_V2_BANK_L29_C3,
];
