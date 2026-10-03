/*
 * Нормализация ключа фразы для озвучки — отдельно от 310-КБ карты ссылок.
 *
 * зачем (PM-216, [CONTENT-LAZY]): плееру фраз (hooks/phrase_audio_player.ts) нужна только эта строка-функция, но она жила
 * в app/phrase_audio_url_map.generated.ts, и ради неё при старте выполнялась вся карта «фраза → mp3» (4971 запись).
 * Здесь — тот же алгоритм, что в сгенерированном файле; сторож tests/phrase_audio_key_parity.test.ts не даёт им разойтись.
 */
export function normalizePhraseAudioKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/* expo-router: keep this utility from being treated as a screen */
export default function __PhraseAudioKeyRouteShim() {
  return null;
}
