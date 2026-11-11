/*
 * Есть ли запись озвучки курса для фразы и где она лежит.
 *
 * зачем (владелец 11.11.2026): «сделать, чтобы юзеры не ждали загрузку, а она воспроизводилась сразу же после
 * ответа… но при этом не в бандле, потому что вес будет большой». Записи лежат на сервере (папка phrase-audio —
 * открыта только на чтение, storage.rules), приложение докачивает их заранее существующими механизмами
 * (hooks/phrase_audio_prefetch.ts — при входе в урок, hooks/phrase_audio_ahead_prefetch.ts — до входа) и играет
 * с диска. В сборке — только список «какие фразы записаны»: по 8 знаков на фразу, грузится при первом обращении
 * к языку. Нет в списке → undefined → вызывающий сразу говорит голосом телефона, сеть не трогается.
 */
import { lazyContent } from '../../app/content_lazy';
import { COURSE_VOICE_GENERATION, courseVoiceKey, type CourseVoiceLang } from './course_voice_key';

const BASE = 'https://firebasestorage.googleapis.com/v0/b/phraseman-ea0b3.firebasestorage.app/o/phrase-audio%2F';
const INDEX_KEY_LENGTH = 8;

type IndexFile = Readonly<{ schema: string; lang: string; count: number; keys: string }>;

const INDEX_LOADERS: Readonly<Record<CourseVoiceLang, () => IndexFile>> = {
  en: lazyContent('course-voice-index:en', () => require('./course-voice-index/en.json') as IndexFile),
  es: lazyContent('course-voice-index:es', () => require('./course-voice-index/es.json') as IndexFile),
  de: lazyContent('course-voice-index:de', () => require('./course-voice-index/de.json') as IndexFile),
  fr: lazyContent('course-voice-index:fr', () => require('./course-voice-index/fr.json') as IndexFile),
  it: lazyContent('course-voice-index:it', () => require('./course-voice-index/it.json') as IndexFile),
};

const brokenIndexLogged = new Set<string>();

/** Отсортированная строка ключей по 8 знаков; '' — список не прочитался (причина уже в журнале). */
function indexKeys(lang: CourseVoiceLang): string {
  try {
    const file = INDEX_LOADERS[lang]();
    if (file?.schema === 'phraseman.course-voice-index/1' && typeof file.keys === 'string' && file.keys.length % INDEX_KEY_LENGTH === 0) return file.keys;
    if (!brokenIndexLogged.has(lang)) {
      brokenIndexLogged.add(lang);
      console.warn('[COURSE-VOICE] index:schema_mismatch — озвучка языка выключена, говорит голос телефона', JSON.stringify({ lang, schema: file?.schema ?? null })); // guard-ok: причина тишины записей
    }
  } catch (error: unknown) {
    if (!brokenIndexLogged.has(lang)) {
      brokenIndexLogged.add(lang);
      console.warn('[COURSE-VOICE] index:load_failed — озвучка языка выключена, говорит голос телефона', JSON.stringify({ lang, error: error instanceof Error ? error.message : String(error) })); // guard-ok: причина тишины записей
    }
  }
  return '';
}

function hasKey(keys: string, shortKey: string): boolean {
  let low = 0;
  let high = keys.length / INDEX_KEY_LENGTH - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const candidate = keys.substr(middle * INDEX_KEY_LENGTH, INDEX_KEY_LENGTH);
    if (candidate === shortKey) return true;
    if (candidate < shortKey) low = middle + 1;
    else high = middle - 1;
  }
  return false;
}

/** Ссылка на запись фразы курса или undefined, если такая фраза не записана. */
export function courseVoiceUrl(text: string, lang: CourseVoiceLang): string | undefined {
  const key = courseVoiceKey(lang, text);
  if (!key) return undefined;
  if (!hasKey(indexKeys(lang), key.slice(0, INDEX_KEY_LENGTH))) return undefined;
  return `${BASE}${COURSE_VOICE_GENERATION}%2F${lang}%2F${key}.mp3?alt=media`;
}
