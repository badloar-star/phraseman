// classic_raw_phrases.ts — сырые фразы урока классического курса (с переводами на ВСЕ 9 языков интерфейса, включая английский).
// зачем: адаптер getClassicLessonPhrases() переводы en не сохраняет (у него поля ru/uk + es/pt-BR/vi/id/tr/pl), а теории и заданиям нужен перевод
// на любой язык интерфейса — иначе англоязычный интерфейс получил бы русский перевод.
import { CLASSIC_LESSON_LOADERS, type ClassicCourseLang } from './classic_course_registry.gen';

export type RawClassicTile = Readonly<{ text: string; correct: string; distractors: readonly string[] }>;
export type RawClassicPhrase = Readonly<{
  id: string;
  target: string;
  tiles: readonly RawClassicTile[];
  sourceLocales: Readonly<Record<string, string>>;
}>;

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const cache = new Map<string, readonly RawClassicPhrase[]>();

export function getRawClassicPhrases(target: ClassicCourseLang, lessonId: number): readonly RawClassicPhrase[] {
  const key = `${target}:${lessonId}`;
  const cached = cache.get(key);
  if (cached) return cached;
  let out: RawClassicPhrase[] = [];
  const loader = CLASSIC_LESSON_LOADERS[target]?.[lessonId];
  if (!loader) {
    console.log('[THEORY-DRILLS] raw phrases: нет загрузчика урока', JSON.stringify({ target, lessonId })); // guard-ok: ранний выход с причиной
  } else {
    try {
      const file = loader() as { phrases?: unknown[] };
      out = (file.phrases ?? []).flatMap((raw): RawClassicPhrase[] => {
        const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
        const tiles = (Array.isArray(r.tiles) ? r.tiles : []).flatMap((t): RawClassicTile[] => {
          const tr = (t && typeof t === 'object' ? t : {}) as Record<string, unknown>;
          const text = str(tr.text);
          if (!text) return [];
          return [{ text, correct: str(tr.correct) || text, distractors: (Array.isArray(tr.distractors) ? tr.distractors : []).filter((x): x is string => typeof x === 'string') }];
        });
        const sl = (r.sourceLocales && typeof r.sourceLocales === 'object' ? r.sourceLocales : {}) as Record<string, unknown>;
        const sourceLocales: Record<string, string> = {};
        for (const [k, v] of Object.entries(sl)) if (typeof v === 'string' && v) sourceLocales[k] = v;
        const id = str(r.id);
        const phraseTarget = str(r.target).trim();
        if (!id || !phraseTarget || tiles.length === 0) return [];
        return [{ id, target: phraseTarget, tiles, sourceLocales }];
      });
    } catch (error: unknown) {
      console.warn('[THEORY-DRILLS] raw phrases: загрузка не удалась', target, lessonId, error instanceof Error ? error.message : String(error)); // guard-ok: причина пустого списка
    }
  }
  cache.set(key, out);
  return out;
}

/** Перевод фразы на язык интерфейса: своя локаль → английская → русская. */
export function rawPhraseTranslation(phrase: RawClassicPhrase, locale: string): string {
  return phrase.sourceLocales[locale] || phrase.sourceLocales.en || phrase.sourceLocales.ru || '';
}

export default function __ClassicRawPhrasesRouteShim() {
  return null;
}
