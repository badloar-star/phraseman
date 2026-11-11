/*
 * Нормализация ключа фразы для озвучки — отдельно от 310-КБ карты ссылок.
 *
 * зачем (PM-216, [CONTENT-LAZY]): плееру фраз (hooks/phrase_audio_player.ts) нужна только эта строка-функция, но она жила
 * в app/phrase_audio_url_map.generated.ts, и ради неё при старте выполнялась вся карта «фраза → mp3» (4971 запись).
 * 11.11.2026 (владелец, «удали всю озвучку»): карта клипов удалена, готовых клипов фраз нет. Ключ остался для
 * modules/audio/phrase_audio_lookup.ts (сравнение произнесённых форм) и плеера hooks/phrase_audio_player.ts.
 */
export function normalizePhraseAudioKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/* expo-router: keep this utility from being treated as a screen */
export default function __PhraseAudioKeyRouteShim() {
  return null;
}
