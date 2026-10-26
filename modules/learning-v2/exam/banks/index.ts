// index.ts — все подключённые банки экзамена главы v2. Сам файл при подключении нового банка не правится: у каждой сессии свой
// реестр registry_lNN_lMM.ts (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3», координатор: 7 сессий параллельно).
// Ключ главы берётся из полей банка (lessonOrdinal / chapterOrdinal), а не из имени файла.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';
import { BANKS_L01_L03 } from './registry_l01_l03';
import { BANKS_L04_L07 } from './registry_l04_l07';
import { BANKS_L08_L11 } from './registry_l08_l11';
import { BANKS_L12_L15 } from './registry_l12_l15';
import { BANKS_L16_L19 } from './registry_l16_l19';
import { BANKS_L20_L23 } from './registry_l20_l23';
import { BANKS_L24_L26 } from './registry_l24_l26';
import { BANKS_L27_L30 } from './registry_l27_l30';

export const CHAPTER_EXAM_V2_BANK_REGISTRIES: Readonly<Record<string, readonly ChapterExamV2Bank[]>> = {
  l01_l03: BANKS_L01_L03,
  l04_l07: BANKS_L04_L07,
  l08_l11: BANKS_L08_L11,
  l12_l15: BANKS_L12_L15,
  l16_l19: BANKS_L16_L19,
  l20_l23: BANKS_L20_L23,
  l24_l26: BANKS_L24_L26,
  l27_l30: BANKS_L27_L30,
};

export const CHAPTER_EXAM_V2_BANKS: readonly ChapterExamV2Bank[] = Object.values(CHAPTER_EXAM_V2_BANK_REGISTRIES).flat();
