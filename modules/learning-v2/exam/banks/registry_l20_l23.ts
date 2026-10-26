// registry_l20_l23.ts — подключённые банки экзамена главы v2: уроки 20–23. Хозяин файла — 3 · Макеты.
// зачем (слово владельца 26.10: «банки для всех уроков и всех глав — в обнову 2.0.3»; координатор: 7 сессий пишут параллельно): у каждой
// сессии свой реестр, общий индекс ./index.ts собирает их все — чужие файлы при подключении не трогаются. Подключать банк (import + строка
// в список) — только когда зелёные оба сторожа: tests/learning_v2_chapter_exam_v2_banks_rules.test.ts и
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Файл банка — chapter_exam_v2_lNN_cM.ts рядом, ключ главы — из его полей.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';
import { CHAPTER_EXAM_V2_BANK_L20_C1 } from './chapter_exam_v2_l20_c1';
import { CHAPTER_EXAM_V2_BANK_L20_C2 } from './chapter_exam_v2_l20_c2';
import { CHAPTER_EXAM_V2_BANK_L20_C3 } from './chapter_exam_v2_l20_c3';
import { CHAPTER_EXAM_V2_BANK_L20_C4 } from './chapter_exam_v2_l20_c4';
import { CHAPTER_EXAM_V2_BANK_L20_C5 } from './chapter_exam_v2_l20_c5';
import { CHAPTER_EXAM_V2_BANK_L20_C6 } from './chapter_exam_v2_l20_c6';
import { CHAPTER_EXAM_V2_BANK_L20_C7 } from './chapter_exam_v2_l20_c7';
import { CHAPTER_EXAM_V2_BANK_L21_C1 } from './chapter_exam_v2_l21_c1';
import { CHAPTER_EXAM_V2_BANK_L21_C2 } from './chapter_exam_v2_l21_c2';
import { CHAPTER_EXAM_V2_BANK_L21_C3 } from './chapter_exam_v2_l21_c3';
import { CHAPTER_EXAM_V2_BANK_L21_C4 } from './chapter_exam_v2_l21_c4';
import { CHAPTER_EXAM_V2_BANK_L21_C5 } from './chapter_exam_v2_l21_c5';
import { CHAPTER_EXAM_V2_BANK_L21_C6 } from './chapter_exam_v2_l21_c6';
import { CHAPTER_EXAM_V2_BANK_L21_C7 } from './chapter_exam_v2_l21_c7';
import { CHAPTER_EXAM_V2_BANK_L22_C1 } from './chapter_exam_v2_l22_c1';
import { CHAPTER_EXAM_V2_BANK_L22_C2 } from './chapter_exam_v2_l22_c2';
import { CHAPTER_EXAM_V2_BANK_L22_C3 } from './chapter_exam_v2_l22_c3';
import { CHAPTER_EXAM_V2_BANK_L22_C4 } from './chapter_exam_v2_l22_c4';
import { CHAPTER_EXAM_V2_BANK_L22_C5 } from './chapter_exam_v2_l22_c5';
import { CHAPTER_EXAM_V2_BANK_L22_C6 } from './chapter_exam_v2_l22_c6';
import { CHAPTER_EXAM_V2_BANK_L22_C7 } from './chapter_exam_v2_l22_c7';
import { CHAPTER_EXAM_V2_BANK_L23_C1 } from './chapter_exam_v2_l23_c1';
import { CHAPTER_EXAM_V2_BANK_L23_C2 } from './chapter_exam_v2_l23_c2';
import { CHAPTER_EXAM_V2_BANK_L23_C3 } from './chapter_exam_v2_l23_c3';
import { CHAPTER_EXAM_V2_BANK_L23_C4 } from './chapter_exam_v2_l23_c4';
import { CHAPTER_EXAM_V2_BANK_L23_C5 } from './chapter_exam_v2_l23_c5';
import { CHAPTER_EXAM_V2_BANK_L23_C6 } from './chapter_exam_v2_l23_c6';
import { CHAPTER_EXAM_V2_BANK_L23_C7 } from './chapter_exam_v2_l23_c7';

export const BANKS_L20_L23: readonly ChapterExamV2Bank[] = [
  CHAPTER_EXAM_V2_BANK_L20_C1,
  CHAPTER_EXAM_V2_BANK_L20_C2,
  CHAPTER_EXAM_V2_BANK_L20_C3,
  CHAPTER_EXAM_V2_BANK_L20_C4,
  CHAPTER_EXAM_V2_BANK_L20_C5,
  CHAPTER_EXAM_V2_BANK_L20_C6,
  CHAPTER_EXAM_V2_BANK_L20_C7,
  CHAPTER_EXAM_V2_BANK_L21_C1,
  CHAPTER_EXAM_V2_BANK_L21_C2,
  CHAPTER_EXAM_V2_BANK_L21_C3,
  CHAPTER_EXAM_V2_BANK_L21_C4,
  CHAPTER_EXAM_V2_BANK_L21_C5,
  CHAPTER_EXAM_V2_BANK_L21_C6,
  CHAPTER_EXAM_V2_BANK_L21_C7,
  CHAPTER_EXAM_V2_BANK_L22_C1,
  CHAPTER_EXAM_V2_BANK_L22_C2,
  CHAPTER_EXAM_V2_BANK_L22_C3,
  CHAPTER_EXAM_V2_BANK_L22_C4,
  CHAPTER_EXAM_V2_BANK_L22_C5,
  CHAPTER_EXAM_V2_BANK_L22_C6,
  CHAPTER_EXAM_V2_BANK_L22_C7,
  CHAPTER_EXAM_V2_BANK_L23_C1,
  CHAPTER_EXAM_V2_BANK_L23_C2,
  CHAPTER_EXAM_V2_BANK_L23_C3,
  CHAPTER_EXAM_V2_BANK_L23_C4,
  CHAPTER_EXAM_V2_BANK_L23_C5,
  CHAPTER_EXAM_V2_BANK_L23_C6,
  CHAPTER_EXAM_V2_BANK_L23_C7,
];
