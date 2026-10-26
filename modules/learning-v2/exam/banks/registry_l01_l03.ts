// registry_l01_l03.ts — подключённые банки экзамена главы v2: уроки 1–3. Хозяин файла — Learning V2.
// зачем (слово владельца 26.10: «банки для всех уроков и всех глав — в обнову 2.0.3»; координатор: 7 сессий пишут параллельно): у каждой
// сессии свой реестр, общий индекс ./index.ts собирает их все — чужие файлы при подключении не трогаются. Подключать банк (import + строка
// в список) — только когда зелёные оба сторожа: tests/learning_v2_chapter_exam_v2_banks_rules.test.ts и
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Файл банка — chapter_exam_v2_lNN_cM.ts рядом, ключ главы — из его полей.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';
import { CHAPTER_EXAM_V2_BANK_L01_C1 } from './chapter_exam_v2_l01_c1';
import { CHAPTER_EXAM_V2_BANK_L01_C2 } from './chapter_exam_v2_l01_c2';
import { CHAPTER_EXAM_V2_BANK_L01_C3 } from './chapter_exam_v2_l01_c3';
import { CHAPTER_EXAM_V2_BANK_L01_C4 } from './chapter_exam_v2_l01_c4';
import { CHAPTER_EXAM_V2_BANK_L01_C5 } from './chapter_exam_v2_l01_c5';
import { CHAPTER_EXAM_V2_BANK_L01_C6 } from './chapter_exam_v2_l01_c6';
import { CHAPTER_EXAM_V2_BANK_L01_C7 } from './chapter_exam_v2_l01_c7';
import { CHAPTER_EXAM_V2_BANK_L02_C1 } from './chapter_exam_v2_l02_c1';
import { CHAPTER_EXAM_V2_BANK_L02_C2 } from './chapter_exam_v2_l02_c2';
import { CHAPTER_EXAM_V2_BANK_L02_C3 } from './chapter_exam_v2_l02_c3';
import { CHAPTER_EXAM_V2_BANK_L02_C4 } from './chapter_exam_v2_l02_c4';
import { CHAPTER_EXAM_V2_BANK_L02_C5 } from './chapter_exam_v2_l02_c5';
import { CHAPTER_EXAM_V2_BANK_L02_C6 } from './chapter_exam_v2_l02_c6';
import { CHAPTER_EXAM_V2_BANK_L02_C7 } from './chapter_exam_v2_l02_c7';
import { CHAPTER_EXAM_V2_BANK_L03_C1 } from './chapter_exam_v2_l03_c1';
import { CHAPTER_EXAM_V2_BANK_L03_C2 } from './chapter_exam_v2_l03_c2';
import { CHAPTER_EXAM_V2_BANK_L03_C3 } from './chapter_exam_v2_l03_c3';
import { CHAPTER_EXAM_V2_BANK_L03_C4 } from './chapter_exam_v2_l03_c4';
import { CHAPTER_EXAM_V2_BANK_L03_C5 } from './chapter_exam_v2_l03_c5';
import { CHAPTER_EXAM_V2_BANK_L03_C6 } from './chapter_exam_v2_l03_c6';
import { CHAPTER_EXAM_V2_BANK_L03_C7 } from './chapter_exam_v2_l03_c7';

export const BANKS_L01_L03: readonly ChapterExamV2Bank[] = [
  CHAPTER_EXAM_V2_BANK_L01_C1,
  CHAPTER_EXAM_V2_BANK_L01_C2,
  CHAPTER_EXAM_V2_BANK_L01_C3,
  CHAPTER_EXAM_V2_BANK_L01_C4,
  CHAPTER_EXAM_V2_BANK_L01_C5,
  CHAPTER_EXAM_V2_BANK_L01_C6,
  CHAPTER_EXAM_V2_BANK_L01_C7,
  CHAPTER_EXAM_V2_BANK_L02_C1,
  CHAPTER_EXAM_V2_BANK_L02_C2,
  CHAPTER_EXAM_V2_BANK_L02_C3,
  CHAPTER_EXAM_V2_BANK_L02_C4,
  CHAPTER_EXAM_V2_BANK_L02_C5,
  CHAPTER_EXAM_V2_BANK_L02_C6,
  CHAPTER_EXAM_V2_BANK_L02_C7,
  CHAPTER_EXAM_V2_BANK_L03_C1,
  CHAPTER_EXAM_V2_BANK_L03_C2,
  CHAPTER_EXAM_V2_BANK_L03_C3,
  CHAPTER_EXAM_V2_BANK_L03_C4,
  CHAPTER_EXAM_V2_BANK_L03_C5,
  CHAPTER_EXAM_V2_BANK_L03_C6,
  CHAPTER_EXAM_V2_BANK_L03_C7,
];
