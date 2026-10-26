// registry_l04_l07.ts — подключённые банки экзамена главы v2: уроки 4–7. Хозяин файла — 10 · Переводчик.
// зачем (слово владельца 26.10: «банки для всех уроков и всех глав — в обнову 2.0.3»; координатор: 7 сессий пишут параллельно): у каждой
// сессии свой реестр, общий индекс ./index.ts собирает их все — чужие файлы при подключении не трогаются. Подключать банк (import + строка
// в список) — только когда зелёные оба сторожа: tests/learning_v2_chapter_exam_v2_banks_rules.test.ts и
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Файл банка — chapter_exam_v2_lNN_cM.ts рядом, ключ главы — из его полей.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';
import { CHAPTER_EXAM_V2_BANK_L04_C1 } from './chapter_exam_v2_l04_c1';
import { CHAPTER_EXAM_V2_BANK_L04_C2 } from './chapter_exam_v2_l04_c2';
import { CHAPTER_EXAM_V2_BANK_L04_C3 } from './chapter_exam_v2_l04_c3';
import { CHAPTER_EXAM_V2_BANK_L04_C4 } from './chapter_exam_v2_l04_c4';
import { CHAPTER_EXAM_V2_BANK_L04_C5 } from './chapter_exam_v2_l04_c5';
import { CHAPTER_EXAM_V2_BANK_L04_C6 } from './chapter_exam_v2_l04_c6';
import { CHAPTER_EXAM_V2_BANK_L04_C7 } from './chapter_exam_v2_l04_c7';
import { CHAPTER_EXAM_V2_BANK_L05_C1 } from './chapter_exam_v2_l05_c1';
import { CHAPTER_EXAM_V2_BANK_L05_C2 } from './chapter_exam_v2_l05_c2';
import { CHAPTER_EXAM_V2_BANK_L05_C3 } from './chapter_exam_v2_l05_c3';
import { CHAPTER_EXAM_V2_BANK_L05_C4 } from './chapter_exam_v2_l05_c4';
import { CHAPTER_EXAM_V2_BANK_L05_C5 } from './chapter_exam_v2_l05_c5';
import { CHAPTER_EXAM_V2_BANK_L05_C6 } from './chapter_exam_v2_l05_c6';
import { CHAPTER_EXAM_V2_BANK_L05_C7 } from './chapter_exam_v2_l05_c7';
import { CHAPTER_EXAM_V2_BANK_L06_C1 } from './chapter_exam_v2_l06_c1';
import { CHAPTER_EXAM_V2_BANK_L06_C2 } from './chapter_exam_v2_l06_c2';
import { CHAPTER_EXAM_V2_BANK_L06_C3 } from './chapter_exam_v2_l06_c3';
import { CHAPTER_EXAM_V2_BANK_L06_C4 } from './chapter_exam_v2_l06_c4';
import { CHAPTER_EXAM_V2_BANK_L06_C5 } from './chapter_exam_v2_l06_c5';
import { CHAPTER_EXAM_V2_BANK_L06_C6 } from './chapter_exam_v2_l06_c6';
import { CHAPTER_EXAM_V2_BANK_L06_C7 } from './chapter_exam_v2_l06_c7';
import { CHAPTER_EXAM_V2_BANK_L07_C1 } from './chapter_exam_v2_l07_c1';
import { CHAPTER_EXAM_V2_BANK_L07_C2 } from './chapter_exam_v2_l07_c2';
import { CHAPTER_EXAM_V2_BANK_L07_C3 } from './chapter_exam_v2_l07_c3';
import { CHAPTER_EXAM_V2_BANK_L07_C4 } from './chapter_exam_v2_l07_c4';
import { CHAPTER_EXAM_V2_BANK_L07_C5 } from './chapter_exam_v2_l07_c5';
import { CHAPTER_EXAM_V2_BANK_L07_C6 } from './chapter_exam_v2_l07_c6';
import { CHAPTER_EXAM_V2_BANK_L07_C7 } from './chapter_exam_v2_l07_c7';

// зачем (координатор 26.10, 92b29de96): уроки 4–7, все 7 глав — оба сторожа зелёные (37750c1b1, f6ad3e8a1, 427ae4900, 640d9ea4f)
export const BANKS_L04_L07: readonly ChapterExamV2Bank[] = [
  CHAPTER_EXAM_V2_BANK_L04_C1,
  CHAPTER_EXAM_V2_BANK_L04_C2,
  CHAPTER_EXAM_V2_BANK_L04_C3,
  CHAPTER_EXAM_V2_BANK_L04_C4,
  CHAPTER_EXAM_V2_BANK_L04_C5,
  CHAPTER_EXAM_V2_BANK_L04_C6,
  CHAPTER_EXAM_V2_BANK_L04_C7,
  CHAPTER_EXAM_V2_BANK_L05_C1,
  CHAPTER_EXAM_V2_BANK_L05_C2,
  CHAPTER_EXAM_V2_BANK_L05_C3,
  CHAPTER_EXAM_V2_BANK_L05_C4,
  CHAPTER_EXAM_V2_BANK_L05_C5,
  CHAPTER_EXAM_V2_BANK_L05_C6,
  CHAPTER_EXAM_V2_BANK_L05_C7,
  CHAPTER_EXAM_V2_BANK_L06_C1,
  CHAPTER_EXAM_V2_BANK_L06_C2,
  CHAPTER_EXAM_V2_BANK_L06_C3,
  CHAPTER_EXAM_V2_BANK_L06_C4,
  CHAPTER_EXAM_V2_BANK_L06_C5,
  CHAPTER_EXAM_V2_BANK_L06_C6,
  CHAPTER_EXAM_V2_BANK_L06_C7,
  CHAPTER_EXAM_V2_BANK_L07_C1,
  CHAPTER_EXAM_V2_BANK_L07_C2,
  CHAPTER_EXAM_V2_BANK_L07_C3,
  CHAPTER_EXAM_V2_BANK_L07_C4,
  CHAPTER_EXAM_V2_BANK_L07_C5,
  CHAPTER_EXAM_V2_BANK_L07_C6,
  CHAPTER_EXAM_V2_BANK_L07_C7,
];
