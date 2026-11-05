// classic_irregular_verbs.ts — «Неправильные глаголы» классических курсов fr/es/de/it.
// зачем (владелец 05.11: «Неправильные глаголы и аналог для es/fr/de/it — в 150, по урокам, только новые в уроке, без повторов, по образцу
// английского»): данные лежат в modules/classic-irregular-verbs/<lang>.json (сборщик scripts/classic_irregular_verbs_build.mjs —
// глагол попадает в урок, где ВПЕРВЫЕ встретилась его форма во фразах курса). Здесь они превращаются в тот же тип IrregularVerb, что у
// английского экрана, — экран и меню работают без второй копии логики. Три ячейки тренажёра base → past → pp получают формы курса из
// поля `train` (fr: инфинитив / настоящее / причастие; es: инфинитив / прошедшее / причастие; de: инфинитив / претерит / Partizip II;
// it: инфинитив / настоящее / причастие) и свои подписи. Английский список под чужим курсом не подставляется никогда.
import { triLang, type Lang } from '../constants/i18n';
import { lazyContent } from './content_lazy';
import { classicCourseActiveFor } from './classic_course_phrases';
import type { IrregularVerb } from './irregular_verbs_data';

export type ClassicVerbsLang = 'es' | 'fr' | 'de' | 'it';

type Meaning = Readonly<Partial<Record<'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl', string>>>;
type RawEntry = Readonly<{
  lemma: string;
  meaning: Meaning;
  train: Readonly<{ base: string; past: string; pp: string }>;
  examples?: readonly string[];
}>;
type RawFile = Readonly<{ schema: string; lang: string; lessons: Readonly<Record<string, readonly RawEntry[]>> }>;

// Статические require — Metro вшивает файлы; выполняются лениво (холодный старт не платит).
const filesOf = lazyContent('classic_irregular_verbs', () => ({
  /* eslint-disable @typescript-eslint/no-require-imports */
  es: require('../modules/classic-irregular-verbs/es.json') as RawFile,
  fr: require('../modules/classic-irregular-verbs/fr.json') as RawFile,
  de: require('../modules/classic-irregular-verbs/de.json') as RawFile,
  it: require('../modules/classic-irregular-verbs/it.json') as RawFile,
  /* eslint-enable @typescript-eslint/no-require-imports */
}));

export function isClassicVerbsLang(target: unknown): target is ClassicVerbsLang {
  return target === 'es' || target === 'fr' || target === 'de' || target === 'it';
}

// зачем (слово владельца 05.11 вечером: «НЕПРАВИЛЬНЫЕ ГЛАГОЛЫ НЕ ОТЛОЖЕНЫ! ОНИ ИДУТ В ЭТУ (150)!»): раздел fr/es/de/it включён.
// Выключатель оставлен: false — пункт меню скрыт, английский список под чужим курсом не подставляется никогда.
export const CLASSIC_IRREGULAR_VERBS_ENABLED = true;

/** true — у курса свой список неправильных глаголов и раздел можно показывать. */
export function classicVerbsActiveFor(target: unknown): target is ClassicVerbsLang {
  return CLASSIC_IRREGULAR_VERBS_ENABLED && isClassicVerbsLang(target) && classicCourseActiveFor(target);
}

function toVerb(e: RawEntry, course: ClassicVerbsLang): IrregularVerb {
  const ru = e.meaning.ru ?? e.lemma;
  const en = e.meaning.en ?? e.lemma;
  return {
    base: e.train.base,
    past: e.train.past,
    pp: e.train.pp,
    ru,
    uk: e.meaning.uk ?? ru,
    en,
    // зачем (владелец 05.11: «переводы на 9 языков интерфейса»): свой перевод языка интерфейса; нет — английский (запасной вариант)
    es: e.meaning.es ?? en,
    'pt-BR': e.meaning['pt-BR'] ?? en,
    vi: e.meaning.vi ?? en,
    id: e.meaning.id ?? en,
    tr: e.meaning.tr ?? en,
    pl: e.meaning.pl ?? en,
    classicCourse: course,
  };
}

const byLessonCache = new Map<ClassicVerbsLang, Record<number, IrregularVerb[]>>();

/** Глаголы курса по урокам: в уроке N — только глаголы, впервые встретившиеся в уроке N. Пустой объект — файла нет или он битый. */
export function classicIrregularVerbsByLesson(course: ClassicVerbsLang): Record<number, IrregularVerb[]> {
  const cached = byLessonCache.get(course);
  if (cached) return cached;
  const out: Record<number, IrregularVerb[]> = {};
  try {
    const file = filesOf()[course];
    if (!file || file.schema !== 'phraseman.classic-irregular-verbs/1') {
      console.warn('[CLASSIC-VERBS] schema mismatch', course, file?.schema); // guard-ok: причина пустого раздела
    } else {
      const seen = new Set<string>();
      for (const [key, list] of Object.entries(file.lessons ?? {})) {
        const lessonId = Number(key);
        if (!Number.isInteger(lessonId) || !Array.isArray(list)) continue;
        // зачем (владелец 05.11: «только новые в уроке, без повторов»): лемма, уже встреченная раньше, второй раз не показывается
        const verbs = list.filter((e) => {
          const k = e.lemma.toLocaleLowerCase();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        }).map((e) => toVerb(e, course));
        if (verbs.length > 0) out[lessonId] = verbs;
      }
    }
  } catch (error: unknown) {
    console.warn('[CLASSIC-VERBS] load failed', course, error instanceof Error ? error.message : String(error)); // guard-ok: причина пустого раздела
  }
  byLessonCache.set(course, out);
  return out;
}

/** Озвучка форм — голосом языка курса (у английского экрана — en-US). */
export function classicVerbsSpeechLanguage(course: ClassicVerbsLang): string {
  return { fr: 'fr-FR', es: 'es-ES', de: 'de-DE', it: 'it-IT' }[course];
}

const INFINITIVE = { ru: 'инфинитив', uk: 'інфінітив', en: 'infinitive', es: 'infinitivo', 'pt-BR': 'infinitivo', vi: 'nguyên mẫu', id: 'infinitif', tr: 'mastar', pl: 'bezokolicznik' } as const;
const PRESENT = { ru: 'настоящее', uk: 'теперішнє', en: 'present', es: 'presente', 'pt-BR': 'presente', vi: 'hiện tại', id: 'sekarang', tr: 'şimdiki', pl: 'teraźniejszy' } as const;
const PAST = { ru: 'прошлое', uk: 'минуле', en: 'past', es: 'pasado', 'pt-BR': 'passado', vi: 'quá khứ', id: 'lampau', tr: 'geçmiş', pl: 'przeszły' } as const;
const PARTICIPLE = { ru: 'причастие', uk: 'дієприкметник', en: 'participle', es: 'participio', 'pt-BR': 'particípio', vi: 'phân từ', id: 'partisip', tr: 'ortaç', pl: 'imiesłów' } as const;

/** Подписи трёх ячеек тренажёра (base / past / pp) на языке интерфейса — по смыслу формы курса. */
export function classicVerbsSlotCaptions(course: ClassicVerbsLang, lang: Lang): { base: string; past: string; pp: string } {
  const second = course === 'fr' || course === 'it' ? PRESENT : PAST;
  return { base: triLang(lang, INFINITIVE), past: triLang(lang, second), pp: triLang(lang, PARTICIPLE) };
}

/* expo-router route shim: модуль лежит в app/ — без этого роутер ругается на файл без экрана */
export default function __ClassicIrregularVerbsRouteShim() { return null; }
