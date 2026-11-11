import { normalizePhraseAudioKey } from '../../app/phrase_audio_key';
import { normalizeLessonAssemblyAnswer } from '../../constants/contractions';

// зачем (владелец 11.11.2026, «удали всю озвучку»): заранее записанных клипов фраз больше нет —
// карта «фраза → mp3» (4971 запись) удалена вместе со скриптами её генерации. Фразы читает
// только встроенный голос телефона. Модуль оставлен как единая точка отказа: плеер и докачка
// (hooks/phrase_audio_player.ts, hooks/phrase_audio_prefetch.ts, hooks/phrase_audio_ahead_prefetch.ts)
// получают «клипа нет» и сами уходят в системный голос / ничего не качают.

export function phraseAudioSpokenKey(text: string): string {
  return normalizeLessonAssemblyAnswer(normalizePhraseAudioKey(text));
}

/** Готовых клипов нет: всегда undefined → вызывающий говорит голосом устройства. */
export function getPlayablePhraseAudioUrl(_text: string): string | undefined {
  return undefined;
}
