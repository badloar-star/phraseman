import {
  getPhraseAudioUrl,
  normalizePhraseAudioKey,
  PHRASE_AUDIO_URL_MAP,
} from '../../app/phrase_audio_url_map.generated';

const SPOKEN_PUNCTUATION_RE = /[.,;:!?"'()]/g;
let punctuationAliases: ReadonlyMap<string, string | null> | null = null;

export function phraseAudioSpokenKey(text: string): string {
  return normalizePhraseAudioKey(text)
    .replace(SPOKEN_PUNCTUATION_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPunctuationAliases(): ReadonlyMap<string, string | null> {
  if (punctuationAliases) return punctuationAliases;
  const aliases = new Map<string, string | null>();
  for (const [text, url] of Object.entries(PHRASE_AUDIO_URL_MAP)) {
    const spokenKey = phraseAudioSpokenKey(text);
    const existing = aliases.get(spokenKey);
    if (existing === undefined) aliases.set(spokenKey, url);
    else if (existing !== url) aliases.set(spokenKey, null);
  }
  punctuationAliases = aliases;
  return aliases;
}

/**
 * Prefer an exact recording. If only punctuation differs, reuse a clip only
 * when that spoken form maps to one unambiguous URL across the entire corpus.
 */
export function getPlayablePhraseAudioUrl(text: string): string | undefined {
  const exact = getPhraseAudioUrl(text);
  if (exact) return exact;
  return getPunctuationAliases().get(phraseAudioSpokenKey(text)) ?? undefined;
}
