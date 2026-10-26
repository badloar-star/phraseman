// index.ts — все подключённые банки экзамена главы v2. Сам файл при подключении нового банка не правится: у каждой сессии свой
// реестр registry_lNN_lMM.ts (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3», координатор: 7 сессий параллельно).
// Ключ главы берётся из полей банка (lessonOrdinal / chapterOrdinal), а не из имени файла.
// зачем (Ревизор 26.10, ⚡): реестры НЕ импортируются статически — иначе первое открытие экзамена вычисляет весь курс (~490 КБ сейчас,
// ~1,5 МБ на 210 глав). Каждый реестр грузится require() при первом обращении к его урокам и кэшируется; Metro держит модуль в бандле,
// но не исполняет его, пока не позовут.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

type BankRegistryLoader = Readonly<{ key: string; fromLesson: number; toLesson: number; load: () => readonly ChapterExamV2Bank[] }>;

/* eslint-disable @typescript-eslint/no-require-imports -- ленивый require по статическому пути (Metro), см. «зачем» выше */
export const CHAPTER_EXAM_V2_BANK_LOADERS: readonly BankRegistryLoader[] = [
  { key: 'l01_l03', fromLesson: 1, toLesson: 3, load: () => (require('./registry_l01_l03') as typeof import('./registry_l01_l03')).BANKS_L01_L03 },
  { key: 'l04_l07', fromLesson: 4, toLesson: 7, load: () => (require('./registry_l04_l07') as typeof import('./registry_l04_l07')).BANKS_L04_L07 },
  { key: 'l08_l11', fromLesson: 8, toLesson: 11, load: () => (require('./registry_l08_l11') as typeof import('./registry_l08_l11')).BANKS_L08_L11 },
  { key: 'l12_l15', fromLesson: 12, toLesson: 15, load: () => (require('./registry_l12_l15') as typeof import('./registry_l12_l15')).BANKS_L12_L15 },
  { key: 'l16_l19', fromLesson: 16, toLesson: 19, load: () => (require('./registry_l16_l19') as typeof import('./registry_l16_l19')).BANKS_L16_L19 },
  { key: 'l20_l23', fromLesson: 20, toLesson: 23, load: () => (require('./registry_l20_l23') as typeof import('./registry_l20_l23')).BANKS_L20_L23 },
  { key: 'l24_l26', fromLesson: 24, toLesson: 26, load: () => (require('./registry_l24_l26') as typeof import('./registry_l24_l26')).BANKS_L24_L26 },
  { key: 'l27_l30', fromLesson: 27, toLesson: 30, load: () => (require('./registry_l27_l30') as typeof import('./registry_l27_l30')).BANKS_L27_L30 },
];
/* eslint-enable @typescript-eslint/no-require-imports */

const loaded = new Map<string, readonly ChapterExamV2Bank[]>();

function loadRegistry(loader: BankRegistryLoader): readonly ChapterExamV2Bank[] {
  const cached = loaded.get(loader.key);
  if (cached) return cached;
  const banks = loader.load();
  loaded.set(loader.key, banks);
  return banks;
}

/** Банки одного урока: грузится только реестр, в диапазон которого входит урок. Нет реестра — пустой список (прежний экзамен). */
export function chapterExamV2BanksForLesson(lessonOrdinal: number): readonly ChapterExamV2Bank[] {
  const loader = CHAPTER_EXAM_V2_BANK_LOADERS.find((l) => lessonOrdinal >= l.fromLesson && lessonOrdinal <= l.toLesson);
  if (!loader) return [];
  return loadRegistry(loader).filter((b) => b.lessonOrdinal === lessonOrdinal);
}

/** Все банки курса — для сторожей и инструментов, не для экрана экзамена. */
export function allChapterExamV2Banks(): readonly ChapterExamV2Bank[] {
  return CHAPTER_EXAM_V2_BANK_LOADERS.flatMap((l) => loadRegistry(l));
}
