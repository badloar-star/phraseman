// registry_l08_l11.ts — подключённые банки экзамена главы v2: уроки 8–11. Хозяин файла — 4 · Темы.
// зачем (слово владельца 26.10: «банки для всех уроков и всех глав — в обнову 2.0.3»; координатор: 7 сессий пишут параллельно): у каждой
// сессии свой реестр, общий индекс ./index.ts собирает их все — чужие файлы при подключении не трогаются. Подключать банк (import + строка
// в список) — только когда зелёные оба сторожа: tests/learning_v2_chapter_exam_v2_banks_rules.test.ts и
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Файл банка — chapter_exam_v2_lNN_cM.ts рядом, ключ главы — из его полей.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';
import { CHAPTER_EXAM_V2_BANK_L08_C1 } from './chapter_exam_v2_l08_c1';
import { CHAPTER_EXAM_V2_BANK_L08_C2 } from './chapter_exam_v2_l08_c2';
import { CHAPTER_EXAM_V2_BANK_L08_C3 } from './chapter_exam_v2_l08_c3';
import { CHAPTER_EXAM_V2_BANK_L08_C4 } from './chapter_exam_v2_l08_c4';
import { CHAPTER_EXAM_V2_BANK_L08_C5 } from './chapter_exam_v2_l08_c5';
import { CHAPTER_EXAM_V2_BANK_L08_C6 } from './chapter_exam_v2_l08_c6';
import { CHAPTER_EXAM_V2_BANK_L08_C7 } from './chapter_exam_v2_l08_c7';
import { CHAPTER_EXAM_V2_BANK_L09_C1 } from './chapter_exam_v2_l09_c1';
import { CHAPTER_EXAM_V2_BANK_L09_C2 } from './chapter_exam_v2_l09_c2';
import { CHAPTER_EXAM_V2_BANK_L09_C3 } from './chapter_exam_v2_l09_c3';
import { CHAPTER_EXAM_V2_BANK_L09_C4 } from './chapter_exam_v2_l09_c4';
import { CHAPTER_EXAM_V2_BANK_L09_C5 } from './chapter_exam_v2_l09_c5';
import { CHAPTER_EXAM_V2_BANK_L09_C6 } from './chapter_exam_v2_l09_c6';
import { CHAPTER_EXAM_V2_BANK_L09_C7 } from './chapter_exam_v2_l09_c7';
import { CHAPTER_EXAM_V2_BANK_L10_C1 } from './chapter_exam_v2_l10_c1';
import { CHAPTER_EXAM_V2_BANK_L10_C2 } from './chapter_exam_v2_l10_c2';
import { CHAPTER_EXAM_V2_BANK_L10_C3 } from './chapter_exam_v2_l10_c3';
import { CHAPTER_EXAM_V2_BANK_L10_C4 } from './chapter_exam_v2_l10_c4';
import { CHAPTER_EXAM_V2_BANK_L10_C5 } from './chapter_exam_v2_l10_c5';
import { CHAPTER_EXAM_V2_BANK_L10_C6 } from './chapter_exam_v2_l10_c6';
import { CHAPTER_EXAM_V2_BANK_L10_C7 } from './chapter_exam_v2_l10_c7';
import { CHAPTER_EXAM_V2_BANK_L11_C1 } from './chapter_exam_v2_l11_c1';
import { CHAPTER_EXAM_V2_BANK_L11_C2 } from './chapter_exam_v2_l11_c2';
import { CHAPTER_EXAM_V2_BANK_L11_C3 } from './chapter_exam_v2_l11_c3';
import { CHAPTER_EXAM_V2_BANK_L11_C4 } from './chapter_exam_v2_l11_c4';
import { CHAPTER_EXAM_V2_BANK_L11_C5 } from './chapter_exam_v2_l11_c5';
import { CHAPTER_EXAM_V2_BANK_L11_C6 } from './chapter_exam_v2_l11_c6';
import { CHAPTER_EXAM_V2_BANK_L11_C7 } from './chapter_exam_v2_l11_c7';

export const BANKS_L08_L11: readonly ChapterExamV2Bank[] = [
  CHAPTER_EXAM_V2_BANK_L08_C1,
  CHAPTER_EXAM_V2_BANK_L08_C2,
  CHAPTER_EXAM_V2_BANK_L08_C3,
  CHAPTER_EXAM_V2_BANK_L08_C4,
  CHAPTER_EXAM_V2_BANK_L08_C5,
  CHAPTER_EXAM_V2_BANK_L08_C6,
  CHAPTER_EXAM_V2_BANK_L08_C7,
  CHAPTER_EXAM_V2_BANK_L09_C1,
  CHAPTER_EXAM_V2_BANK_L09_C2,
  CHAPTER_EXAM_V2_BANK_L09_C3,
  CHAPTER_EXAM_V2_BANK_L09_C4,
  CHAPTER_EXAM_V2_BANK_L09_C5,
  CHAPTER_EXAM_V2_BANK_L09_C6,
  CHAPTER_EXAM_V2_BANK_L09_C7,
  CHAPTER_EXAM_V2_BANK_L10_C1,
  CHAPTER_EXAM_V2_BANK_L10_C2,
  CHAPTER_EXAM_V2_BANK_L10_C3,
  CHAPTER_EXAM_V2_BANK_L10_C4,
  CHAPTER_EXAM_V2_BANK_L10_C5,
  CHAPTER_EXAM_V2_BANK_L10_C6,
  CHAPTER_EXAM_V2_BANK_L10_C7,
  CHAPTER_EXAM_V2_BANK_L11_C1,
  CHAPTER_EXAM_V2_BANK_L11_C2,
  CHAPTER_EXAM_V2_BANK_L11_C3,
  CHAPTER_EXAM_V2_BANK_L11_C4,
  CHAPTER_EXAM_V2_BANK_L11_C5,
  CHAPTER_EXAM_V2_BANK_L11_C6,
  CHAPTER_EXAM_V2_BANK_L11_C7,
];
