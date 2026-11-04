/**
 * зачем (владелец 04.11, классические курсы EN/ES/FR/DE/IT вшиваются в сборку и ЗАМЕНЯЮТ старый основной курс языка):
 * адаптер превращает рантайм-JSON (modules/classic-courses/<lang>/lessons-NN.json) в обычные LessonPhrase, чтобы весь
 * урок (lesson1, подсказки, экзамены) работал без веток по языкам: целевая строка → `english`, плитки → `words`,
 * переводы → russian/ukrainian/sourceLocales. Звука в данных нет (только системный TTS по speechLocale).
 * Мастер-выключатель CLASSIC_COURSES_RUNTIME_ENABLED пока false: данные подключены, но экраны старый курс не заменяют,
 * пока срезы не закрыты зелёными сторожами.
 */
import { CLASSIC_LESSON_LOADERS, type ClassicCourseLang } from './classic_course_registry.gen';
import type { LessonPhrase, LessonWord } from './lesson_data_types';

export type { ClassicCourseLang };
export const CLASSIC_COURSE_LANGS: readonly ClassicCourseLang[] = ['en', 'es', 'fr', 'de', 'it'];
/** Системный TTS телефона (решение владельца: звук пока только обычный TTS). */
export const CLASSIC_TTS_LOCALE: Readonly<Record<ClassicCourseLang, string>> = {
  en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT',
};

/** Мастер-выключатель замены курсов. ВКЛЮЧЁН 04.11 (владелец: «включить курсы в любом случае», D202). Выключатель аварийный: false возвращает старые курсы. */
export const CLASSIC_COURSES_RUNTIME_ENABLED = true;

type RawTile = { text?: unknown; correct?: unknown; distractors?: unknown };
type RawPhrase = {
  id?: unknown; target?: unknown; tiles?: unknown; alternatives?: unknown; accepted?: unknown;
  sourceLocales?: Record<string, unknown>; clarifierKeys?: unknown; wordNoteKeys?: unknown; rev?: unknown; contextCue?: unknown;
};

export function isClassicCourseLang(value: unknown): value is ClassicCourseLang {
  return typeof value === 'string' && (CLASSIC_COURSE_LANGS as readonly string[]).includes(value);
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

function toWords(tiles: unknown): LessonWord[] {
  if (!Array.isArray(tiles)) return [];
  const out: LessonWord[] = [];
  for (const raw of tiles as RawTile[]) {
    const text = str(raw?.text);
    if (!text) continue;
    out.push({ text, correct: str(raw?.correct) || text, distractors: strList(raw?.distractors) });
  }
  return out;
}

/** Чистое преобразование одной записи курса. Пустая цель/плитки → null (фраза не показывается). */
export function classicPhraseFromRecord(raw: RawPhrase, lang: ClassicCourseLang): LessonPhrase | null {
  const target = str(raw?.target).trim();
  const words = toWords(raw?.tiles);
  const id = str(raw?.id);
  if (!id || !target || words.length === 0) {
    console.warn('[CLASSIC-COURSE] phrase:skipped', JSON.stringify({ lang, id, hasTarget: !!target, tiles: words.length })); // guard-ok: ранний выход с причиной
    return null;
  }
  const sl = raw.sourceLocales ?? {};
  const sourceLocales: NonNullable<LessonPhrase['sourceLocales']> = {};
  for (const key of ['es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    const v = str(sl[key]).trim();
    if (v) sourceLocales[key] = v;
  }
  const accepted = Array.isArray(raw.accepted) ? (raw.accepted as unknown[]).map(strList).filter((p) => p.length > 0) : undefined;
  return {
    id,
    english: target,
    alternatives: strList(raw.alternatives),
    russian: str(sl.ru),
    ukrainian: str(sl.uk),
    sourceLocales,
    words,
    classic: {
      lang,
      rev: str(raw.rev),
      accepted: accepted && accepted.length > 0 ? accepted : undefined,
      clarifierKeys: strList(raw.clarifierKeys),
      wordNoteKeys: strList(raw.wordNoteKeys),
      contextCue: str(raw.contextCue) || undefined,
    },
  };
}

const lessonCache = new Map<string, LessonPhrase[]>();

/** Фразы урока классического курса языка (ленивая загрузка одного файла). [] — урока/курса нет. */
export function getClassicLessonPhrases(lessonId: number, lang: ClassicCourseLang): LessonPhrase[] {
  const key = `${lang}:${lessonId}`;
  const cached = lessonCache.get(key);
  if (cached) return cached;
  const loader = CLASSIC_LESSON_LOADERS[lang]?.[lessonId];
  if (!loader) {
    console.log('[CLASSIC-COURSE] lesson:no_loader', JSON.stringify({ lang, lessonId })); // guard-ok: ранний выход с причиной
    return [];
  }
  try {
    const file = loader() as { phrases?: RawPhrase[] };
    const phrases = (file.phrases ?? []).map((p) => classicPhraseFromRecord(p, lang)).filter((p): p is LessonPhrase => p !== null);
    lessonCache.set(key, phrases);
    return phrases;
  } catch (error) {
    console.warn('[CLASSIC-COURSE] lesson:load_failed', lang, lessonId, error instanceof Error ? error.message : String(error));
    return [];
  }
}

/** Активен ли классический курс для языка прямо сейчас (мастер-выключатель + язык из списка). */
export function classicCourseActiveFor(target: unknown): target is ClassicCourseLang {
  return CLASSIC_COURSES_RUNTIME_ENABLED && isClassicCourseLang(target);
}
