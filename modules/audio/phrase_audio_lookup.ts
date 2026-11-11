import { normalizePhraseAudioKey } from '../../app/phrase_audio_key';
import { normalizeLessonAssemblyAnswer } from '../../constants/contractions';
import { courseVoiceUrl } from './course_voice_lookup';
import type { CourseVoiceLang } from './course_voice_key';

// зачем (владелец 11.11.2026): утром — «удали всю озвучку»: карта «фраза → mp3» прежнего голоса (4971 запись)
// удалена вместе со скриптами её генерации. Вечером того же дня владелец выбрал свои голоса ElevenLabs,
// прослушал новую запись курсов и сказал «чисто, дальше» — подключаем её. Карты в сборке по-прежнему нет:
// путь к записи вычисляется из текста (course_voice_lookup.ts), в сборке только список «что записано».
//
// Этот модуль — единая точка для плеера и докачки (hooks/phrase_audio_player.ts, hooks/phrase_audio_prefetch.ts,
// hooks/phrase_audio_ahead_prefetch.ts): undefined = «записи нет» → они сами уходят в голос телефона и ничего не качают.
//
// Язык — второй аргумент (владелец 11.11, «Да, включай»: записи для es/de/fr/it): его даёт язык произносимой фразы
// (hooks/use-audio.ts) или язык курса (докачка). Без аргумента — английский, как было до включения остальных языков.

export function phraseAudioSpokenKey(text: string): string {
  return normalizeLessonAssemblyAnswer(normalizePhraseAudioKey(text));
}

/** Ссылка на запись фразы курса на языке `lang`; undefined → вызывающий говорит голосом устройства. */
export function getPlayablePhraseAudioUrl(text: string, lang: CourseVoiceLang = 'en'): string | undefined {
  return courseVoiceUrl(text, lang);
}
