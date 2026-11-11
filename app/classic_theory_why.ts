// classic_theory_why.ts — объяснения «почему?» к заданиям теории классических курсов.
// зачем (владелец 11.11: «нажимаешь "почему" — написана просто фраза без объяснения почему»): раньше в поле «почему» подставлялась сама
// правильная фраза. Объяснения лежат ОТДЕЛЬНЫМ файлом modules/classic-courses/<lang>/theory_why.json (а не в theory.json), чтобы их можно было
// дописывать по курсам, не трогая большой файл теории, который правят другие сессии. Ключ: `<урок>:<id главы>:<answerId задания>`.
// Нет объяснения → null → кнопка «почему?» не рисуется (не обещаем того, чего нет).
import { lazyContent } from './content_lazy';
import type { IntroI18nText } from './lesson_data_types';

type WhyEntry = Readonly<{ ru?: unknown; uk?: unknown; en?: unknown }>;
type WhyFile = { data?: Record<string, WhyEntry> };

// Курсы, для которых объяснения уже написаны. Добавляя курс — добавить сюда require его файла.
const filesOf = lazyContent('classic_theory_why_files', (): Readonly<Record<string, WhyFile>> => ({
  /* eslint-disable @typescript-eslint/no-require-imports */
  en: require('../modules/classic-courses/en/theory_why.json') as WhyFile,
  // es/fr/de/it: объяснения есть только у уроков НОВОГО формата (plain:true); уроки старого формата идут без кнопки «почему?»
  es: require('../modules/classic-courses/es/theory_why.json') as WhyFile,
  fr: require('../modules/classic-courses/fr/theory_why.json') as WhyFile,
  de: require('../modules/classic-courses/de/theory_why.json') as WhyFile,
  it: require('../modules/classic-courses/it/theory_why.json') as WhyFile,
  /* eslint-enable @typescript-eslint/no-require-imports */
}));

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** Объяснение к заданию или null, если его нет в данных. Локали без своего текста получают английский (как команды заданий). */
export function classicTheoryWhy(target: string, lessonId: number, chapterId: string, answerId: string): IntroI18nText | null {
  let entry: WhyEntry | undefined;
  try {
    entry = filesOf()[target]?.data?.[`${lessonId}:${chapterId}:${answerId}`];
  } catch (error: unknown) {
    console.warn('[THEORY-WHY] файл объяснений не загрузился', target, lessonId, error instanceof Error ? error.message : String(error)); // guard-ok: причина
    return null;
  }
  const ru = str(entry?.ru);
  const en = str(entry?.en) || ru;
  if (!ru) return null; // обычный случай для курсов без объяснений — кнопка просто скрыта
  const uk = str(entry?.uk) || ru;
  return { ru, uk, en, es: en, ptBr: en, vi: en, id: en, tr: en, pl: en };
}

export default function __ClassicTheoryWhyRouteShim() {
  return null;
}
