import { normalizePhraseAudioKey } from '../../app/phrase_audio_key';
import { normalizeLessonAssemblyAnswer } from '../../constants/contractions';
import { courseVoiceUrl } from './course_voice_lookup';

// зачем (владелец 11.11.2026): утром — «удали всю озвучку»: карта «фраза → mp3» прежнего голоса (4971 запись)
// удалена вместе со скриптами её генерации. Вечером того же дня владелец выбрал свои голоса ElevenLabs,
// прослушал новую запись курсов и сказал «чисто, дальше» — подключаем её. Карты в сборке по-прежнему нет:
// путь к записи вычисляется из текста (course_voice_lookup.ts), в сборке только список «что записано».
//
// Этот модуль — единая точка для плеера и докачки (hooks/phrase_audio_player.ts, hooks/phrase_audio_prefetch.ts,
// hooks/phrase_audio_ahead_prefetch.ts): undefined = «записи нет» → они сами уходят в голос телефона и ничего не качают.
//
// Язык здесь — английский: hooks/use-audio.ts пускает к записям только английскую речь
// (`canUseClip = isEnglish && !requestedVoice`, сторож tests/startup_audio_lazy_contract.test.ts). Записи es/de/fr/it
// уже лежат на сервере; чтобы они зазвучали, нужно решение владельца и правка use-audio.ts вместе со сторожем.

export function phraseAudioSpokenKey(text: string): string {
  return normalizeLessonAssemblyAnswer(normalizePhraseAudioKey(text));
}

/** Ссылка на запись фразы английского курса; undefined → вызывающий говорит голосом устройства. */
export function getPlayablePhraseAudioUrl(text: string): string | undefined {
  return courseVoiceUrl(text, 'en');
}
