/*
 * Имя файла озвучки курса по тексту фразы — одна чистая функция для приложения и для скриптов выгрузки.
 *
 * зачем (владелец 11.11.2026, новая озвучка голосами ElevenLabs): прежняя озвучка держала в сборке карту
 * «фраза → ссылка» на 4971 запись (0.85 МБ, грузилась при старте — PM-216). Здесь путь к записи ВЫЧИСЛЯЕТСЯ
 * из языка и текста, карта не нужна: в сборке лежит только короткий список «какие фразы записаны»
 * (course_voice_lookup.ts), и тот грузится при первом обращении к языку.
 *
 * Ключ — два независимых 32-битных FNV-1a (16 hex): синхронно, без нативных модулей, совпадений на 11 499
 * записях нет (сборка scripts/course_voice_publish_build.cts падает, если совпадение появится).
 */
import { normalizePhraseAudioKey } from '../../app/phrase_audio_key';

export const COURSE_VOICE_LANGS = ['en', 'es', 'de', 'fr', 'it'] as const;
export type CourseVoiceLang = (typeof COURSE_VOICE_LANGS)[number];

/** Папка поколения записей на сервере. Перезаписал весь корпус другими голосами — подними номер. */
export const COURSE_VOICE_GENERATION = 'course-v1';

function fnv1a(value: string, seed: number): string {
  let hash = seed;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Текст → форма, по которой ищется запись.
 *
 * зачем: экран урока собирает произносимую строку из плиток, и она расходится с записанной фразой курса в знаках,
 * которые на звучание не влияют: «Yes I am.» ↔ «Yes, I am.», «Estás en casa?» ↔ «¿Estás en casa?» (замер 11.11:
 * без этого находилось 1513 из 1600 фраз английского и 1161 из 1600 немецкого). Знак КОНЦА (. ? !) остаётся —
 * «Estás en casa.» и «¿Estás en casa?» звучат по-разному и записаны отдельно.
 */
export function courseVoiceText(text: string): string {
  return normalizePhraseAudioKey(text)
    .replace(/[’‘`´]/g, "'")
    .replace(/[,;:¿¡«»"“”„()]/g, ' ')
    // зачем: в строке из плиток теряется и точка МЕЖДУ предложениями («I bought a lamp The lamp is broken.») — внутренние знаки не учитываем
    .replace(/[.?!…]+(?=\s)/g, ' ')
    .replace(/\s+([.?!…])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Ключ записи: первые 8 знаков — то, что лежит в списке «записано», все 16 — имя файла. Пустой текст → ''. */
export function courseVoiceKey(lang: CourseVoiceLang, text: string): string {
  const normalized = courseVoiceText(text);
  if (!normalized) return '';
  const identity = `${lang}\n${normalized}`;
  return fnv1a(identity, 2166136261) + fnv1a(identity, 0x9747b28c);
}
