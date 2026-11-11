/**
 * зачем (владелец 04.11, классические курсы EN/ES/FR/DE/IT вшиваются в сборку и ЗАМЕНЯЮТ старый основной курс языка):
 * адаптер превращает рантайм-JSON (modules/classic-courses/<lang>/lessons-NN.json) в обычные LessonPhrase, чтобы весь
 * урок (lesson1, подсказки, экзамены) работал без веток по языкам: целевая строка → `english`, плитки → `words`,
 * переводы → russian/ukrainian/sourceLocales. Звука в данных нет (только системный TTS по speechLocale).
 * Мастер-выключатель CLASSIC_COURSES_RUNTIME_ENABLED пока false: данные подключены, но экраны старый курс не заменяют,
 * пока срезы не закрыты зелёными сторожами.
 */
import { CLASSIC_LESSON_LOADERS, type ClassicCourseLang } from './classic_course_registry.gen';
import type { ClassicLessonSourceLocales, LessonPhrase, LessonWord } from './lesson_data_types';

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
  const classicSourceLocales: ClassicLessonSourceLocales = {
    ru: str(sl.ru),
    uk: str(sl.uk),
    en: str(sl.en),
    es: str(sl.es),
    'pt-BR': str(sl['pt-BR']),
    vi: str(sl.vi),
    id: str(sl.id),
    tr: str(sl.tr),
    pl: str(sl.pl),
  };
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
      sourceLocales: classicSourceLocales,
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

// ─── Вступления урока (intro.json курса) ─────────────────────────────────────────────────────────────────────────────
// зачем (классические курсы 04.11): intro.json уже в форме LessonIntroScreen (titleRU/textRU/linesRU…); добавляем `examples` из фраз
// самого курса (иначе у es/de/fr/it примеры не показываются), остальное — как есть. Нет файла/урока → null (прежний путь).
import { CLASSIC_INTRO_LOADERS } from './classic_course_registry.gen';
import type { LessonIntroScreen } from './lesson_data_types';

type RawIntroBlock = Record<string, unknown> & { exampleIds?: unknown; examplesById?: unknown; exampleRefs?: unknown };
const introCache = new Map<ClassicCourseLang, Record<string, unknown>>();

function loadIntroFile(lang: ClassicCourseLang): Record<string, unknown> | null {
  const cached = introCache.get(lang);
  if (cached) return cached;
  const loader = CLASSIC_INTRO_LOADERS[lang];
  if (!loader) return null;
  try {
    const file = loader() as Record<string, unknown>;
    introCache.set(lang, file);
    return file;
  } catch (error) {
    console.warn('[CLASSIC-COURSE] intro:load_failed', lang, error instanceof Error ? error.message : String(error));
    return null;
  }
}

function introExampleIds(block: RawIntroBlock): string[] {
  const ids: string[] = [];
  if (Array.isArray(block.exampleIds)) ids.push(...strList(block.exampleIds));
  if (Array.isArray(block.examplesById)) ids.push(...strList(block.examplesById));
  if (Array.isArray(block.exampleRefs)) {
    for (const ref of block.exampleRefs as Array<{ phraseId?: unknown }>) if (typeof ref?.phraseId === 'string') ids.push(ref.phraseId);
  }
  return ids;
}

export function getClassicIntroScreens(lessonId: number, lang: ClassicCourseLang): LessonIntroScreen[] | null {
  const file = loadIntroFile(lang);
  const blocks = file?.[String(lessonId)];
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  const phrases = getClassicLessonPhrases(lessonId, lang);
  const find = (id: string): LessonPhrase | undefined => phrases.find((p) => String(p.id) === id || String(p.id).endsWith(`:${id}`) || String(p.id).endsWith(id));
  return (blocks as RawIntroBlock[]).map((block) => {
    // зачем (решение владельца 05.11, «Читается» под каждым примером вступления): данные готовит Теория — block.sayByLocale = { ru: { "<id фразы>": "…" }, uk: {…} }
    // (6fa0470af, 217/217 для en); кладём в example.reading, экран рисует строку только для RU/UK и только если запись есть — без пустого места
    const say = (block.sayByLocale ?? {}) as Record<string, Record<string, unknown> | undefined>;
    const sayOf = (loc: 'ru' | 'uk', id: string): string | undefined => { const v = say[loc]?.[id]; return typeof v === 'string' && v.trim() ? v.trim() : undefined; };
    const examples = introExampleIds(block).flatMap((id) => {
      const p = find(id);
      if (!p) return [];
      const reading = { ru: sayOf('ru', id), uk: sayOf('uk', id) };
      return [{
        en: p.english,
        trRU: p.russian,
        trUK: p.ukrainian,
        trES: p.sourceLocales?.es,
        trPtBr: p.sourceLocales?.['pt-BR'],
        trVi: p.sourceLocales?.vi,
        trId: p.sourceLocales?.id,
        trTr: p.sourceLocales?.tr,
        trPl: p.sourceLocales?.pl,
        ...(reading.ru || reading.uk ? { reading } : {}),
      }];
    });
    return { ...(block as unknown as LessonIntroScreen), examples };
  });
}
