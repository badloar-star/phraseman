// registry_l12_l15.ts — подключённые банки экзамена главы v2: уроки 12–15. Хозяин файла — 8 · Моменты.
// зачем (слово владельца 26.10: «банки для всех уроков и всех глав — в обнову 2.0.3»; координатор: 7 сессий пишут параллельно): у каждой
// сессии свой реестр, общий индекс ./index.ts собирает их все — чужие файлы при подключении не трогаются. Подключать банк (import + строка
// в список) — только когда зелёные оба сторожа: tests/learning_v2_chapter_exam_v2_banks_rules.test.ts и
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Файл банка — chapter_exam_v2_lNN_cM.ts рядом, ключ главы — из его полей.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';
import { CHAPTER_EXAM_V2_BANK_L12_C1 } from './chapter_exam_v2_l12_c1';
import { CHAPTER_EXAM_V2_BANK_L12_C2 } from './chapter_exam_v2_l12_c2';
import { CHAPTER_EXAM_V2_BANK_L12_C3 } from './chapter_exam_v2_l12_c3';
import { CHAPTER_EXAM_V2_BANK_L12_C4 } from './chapter_exam_v2_l12_c4';
import { CHAPTER_EXAM_V2_BANK_L12_C5 } from './chapter_exam_v2_l12_c5';
import { CHAPTER_EXAM_V2_BANK_L12_C6 } from './chapter_exam_v2_l12_c6';
import { CHAPTER_EXAM_V2_BANK_L12_C7 } from './chapter_exam_v2_l12_c7';
import { CHAPTER_EXAM_V2_BANK_L13_C1 } from './chapter_exam_v2_l13_c1';
import { CHAPTER_EXAM_V2_BANK_L13_C2 } from './chapter_exam_v2_l13_c2';
import { CHAPTER_EXAM_V2_BANK_L13_C3 } from './chapter_exam_v2_l13_c3';
import { CHAPTER_EXAM_V2_BANK_L13_C4 } from './chapter_exam_v2_l13_c4';
import { CHAPTER_EXAM_V2_BANK_L13_C5 } from './chapter_exam_v2_l13_c5';
import { CHAPTER_EXAM_V2_BANK_L13_C6 } from './chapter_exam_v2_l13_c6';
import { CHAPTER_EXAM_V2_BANK_L13_C7 } from './chapter_exam_v2_l13_c7';
import { CHAPTER_EXAM_V2_BANK_L14_C1 } from './chapter_exam_v2_l14_c1';
import { CHAPTER_EXAM_V2_BANK_L14_C2 } from './chapter_exam_v2_l14_c2';
import { CHAPTER_EXAM_V2_BANK_L14_C3 } from './chapter_exam_v2_l14_c3';
import { CHAPTER_EXAM_V2_BANK_L14_C4 } from './chapter_exam_v2_l14_c4';
import { CHAPTER_EXAM_V2_BANK_L14_C5 } from './chapter_exam_v2_l14_c5';
import { CHAPTER_EXAM_V2_BANK_L14_C6 } from './chapter_exam_v2_l14_c6';
import { CHAPTER_EXAM_V2_BANK_L14_C7 } from './chapter_exam_v2_l14_c7';
import { CHAPTER_EXAM_V2_BANK_L15_C1 } from './chapter_exam_v2_l15_c1';
import { CHAPTER_EXAM_V2_BANK_L15_C2 } from './chapter_exam_v2_l15_c2';
import { CHAPTER_EXAM_V2_BANK_L15_C3 } from './chapter_exam_v2_l15_c3';
import { CHAPTER_EXAM_V2_BANK_L15_C4 } from './chapter_exam_v2_l15_c4';
import { CHAPTER_EXAM_V2_BANK_L15_C5 } from './chapter_exam_v2_l15_c5';
import { CHAPTER_EXAM_V2_BANK_L15_C6 } from './chapter_exam_v2_l15_c6';
import { CHAPTER_EXAM_V2_BANK_L15_C7 } from './chapter_exam_v2_l15_c7';

// зачем (владелец 26.10, координатор): уроки 12–15, все 7 глав каждого; подключены после зелёных сторожей слов и правил
export const BANKS_L12_L15: readonly ChapterExamV2Bank[] = [
  CHAPTER_EXAM_V2_BANK_L12_C1,
  CHAPTER_EXAM_V2_BANK_L12_C2,
  CHAPTER_EXAM_V2_BANK_L12_C3,
  CHAPTER_EXAM_V2_BANK_L12_C4,
  CHAPTER_EXAM_V2_BANK_L12_C5,
  CHAPTER_EXAM_V2_BANK_L12_C6,
  CHAPTER_EXAM_V2_BANK_L12_C7,
  CHAPTER_EXAM_V2_BANK_L13_C1,
  CHAPTER_EXAM_V2_BANK_L13_C2,
  CHAPTER_EXAM_V2_BANK_L13_C3,
  CHAPTER_EXAM_V2_BANK_L13_C4,
  CHAPTER_EXAM_V2_BANK_L13_C5,
  CHAPTER_EXAM_V2_BANK_L13_C6,
  CHAPTER_EXAM_V2_BANK_L13_C7,
  CHAPTER_EXAM_V2_BANK_L14_C1,
  CHAPTER_EXAM_V2_BANK_L14_C2,
  CHAPTER_EXAM_V2_BANK_L14_C3,
  CHAPTER_EXAM_V2_BANK_L14_C4,
  CHAPTER_EXAM_V2_BANK_L14_C5,
  CHAPTER_EXAM_V2_BANK_L14_C6,
  CHAPTER_EXAM_V2_BANK_L14_C7,
  CHAPTER_EXAM_V2_BANK_L15_C1,
  CHAPTER_EXAM_V2_BANK_L15_C2,
  CHAPTER_EXAM_V2_BANK_L15_C3,
  CHAPTER_EXAM_V2_BANK_L15_C4,
  CHAPTER_EXAM_V2_BANK_L15_C5,
  CHAPTER_EXAM_V2_BANK_L15_C6,
  CHAPTER_EXAM_V2_BANK_L15_C7,
];
