// registry_l16_l19.ts — подключённые банки экзамена главы v2: уроки 16–19. Хозяин файла — 2 · Дизайн.
// зачем (слово владельца 26.10: «банки для всех уроков и всех глав — в обнову 2.0.3»; координатор: 7 сессий пишут параллельно): у каждой
// сессии свой реестр, общий индекс ./index.ts собирает их все — чужие файлы при подключении не трогаются. Подключать банк (import + строка
// в список) — только когда зелёные оба сторожа: tests/learning_v2_chapter_exam_v2_banks_rules.test.ts и
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Файл банка — chapter_exam_v2_lNN_cM.ts рядом, ключ главы — из его полей.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';
import { CHAPTER_EXAM_V2_BANK_L16_C1 } from './chapter_exam_v2_l16_c1';
import { CHAPTER_EXAM_V2_BANK_L16_C2 } from './chapter_exam_v2_l16_c2';
import { CHAPTER_EXAM_V2_BANK_L16_C3 } from './chapter_exam_v2_l16_c3';
import { CHAPTER_EXAM_V2_BANK_L16_C4 } from './chapter_exam_v2_l16_c4';
import { CHAPTER_EXAM_V2_BANK_L16_C5 } from './chapter_exam_v2_l16_c5';
import { CHAPTER_EXAM_V2_BANK_L16_C6 } from './chapter_exam_v2_l16_c6';
import { CHAPTER_EXAM_V2_BANK_L16_C7 } from './chapter_exam_v2_l16_c7';
import { CHAPTER_EXAM_V2_BANK_L17_C1 } from './chapter_exam_v2_l17_c1';
import { CHAPTER_EXAM_V2_BANK_L17_C2 } from './chapter_exam_v2_l17_c2';
import { CHAPTER_EXAM_V2_BANK_L17_C3 } from './chapter_exam_v2_l17_c3';
import { CHAPTER_EXAM_V2_BANK_L17_C4 } from './chapter_exam_v2_l17_c4';
import { CHAPTER_EXAM_V2_BANK_L17_C5 } from './chapter_exam_v2_l17_c5';
import { CHAPTER_EXAM_V2_BANK_L17_C6 } from './chapter_exam_v2_l17_c6';
import { CHAPTER_EXAM_V2_BANK_L17_C7 } from './chapter_exam_v2_l17_c7';
import { CHAPTER_EXAM_V2_BANK_L18_C1 } from './chapter_exam_v2_l18_c1';
import { CHAPTER_EXAM_V2_BANK_L18_C2 } from './chapter_exam_v2_l18_c2';
import { CHAPTER_EXAM_V2_BANK_L18_C3 } from './chapter_exam_v2_l18_c3';
import { CHAPTER_EXAM_V2_BANK_L18_C4 } from './chapter_exam_v2_l18_c4';
import { CHAPTER_EXAM_V2_BANK_L18_C5 } from './chapter_exam_v2_l18_c5';
import { CHAPTER_EXAM_V2_BANK_L18_C6 } from './chapter_exam_v2_l18_c6';
import { CHAPTER_EXAM_V2_BANK_L18_C7 } from './chapter_exam_v2_l18_c7';

export const BANKS_L16_L19: readonly ChapterExamV2Bank[] = [
  CHAPTER_EXAM_V2_BANK_L16_C1,
  CHAPTER_EXAM_V2_BANK_L16_C2,
  CHAPTER_EXAM_V2_BANK_L16_C3,
  CHAPTER_EXAM_V2_BANK_L16_C4,
  CHAPTER_EXAM_V2_BANK_L16_C5,
  CHAPTER_EXAM_V2_BANK_L16_C6,
  CHAPTER_EXAM_V2_BANK_L16_C7,
  CHAPTER_EXAM_V2_BANK_L17_C1,
  CHAPTER_EXAM_V2_BANK_L17_C2,
  CHAPTER_EXAM_V2_BANK_L17_C3,
  CHAPTER_EXAM_V2_BANK_L17_C4,
  CHAPTER_EXAM_V2_BANK_L17_C5,
  CHAPTER_EXAM_V2_BANK_L17_C6,
  CHAPTER_EXAM_V2_BANK_L17_C7,
  CHAPTER_EXAM_V2_BANK_L18_C1,
  CHAPTER_EXAM_V2_BANK_L18_C2,
  CHAPTER_EXAM_V2_BANK_L18_C3,
  CHAPTER_EXAM_V2_BANK_L18_C4,
  CHAPTER_EXAM_V2_BANK_L18_C5,
  CHAPTER_EXAM_V2_BANK_L18_C6,
  CHAPTER_EXAM_V2_BANK_L18_C7,
];
