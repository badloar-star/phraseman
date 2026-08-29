import {
  getPhraseAudioUrl,
  normalizePhraseAudioKey,
  PHRASE_AUDIO_URL_MAP,
} from '../../app/phrase_audio_url_map.generated';
import { normalizeLessonAssemblyAnswer } from '../../constants/contractions';

let spokenAliases: ReadonlyMap<string, string | null> | null = null;

export function phraseAudioSpokenKey(text: string): string {
  return normalizeLessonAssemblyAnswer(normalizePhraseAudioKey(text));
}

function getSpokenAliases(): ReadonlyMap<string, string | null> {
  if (spokenAliases) return spokenAliases;
  const aliases = new Map<string, string | null>();
  for (const [text, url] of Object.entries(PHRASE_AUDIO_URL_MAP)) {
    const spokenKey = phraseAudioSpokenKey(text);
    const existing = aliases.get(spokenKey);
    if (existing === undefined) aliases.set(spokenKey, url);
    else if (existing !== url) aliases.set(spokenKey, null);
  }
  spokenAliases = aliases;
  return aliases;
}

/**
 * Prefer an exact recording. If only accepted lesson equivalence differs
 * (punctuation, contraction, safe BrE/AmE form), reuse a clip only when that
 * spoken form maps to one unambiguous URL across the entire corpus.
 */
export function getPlayablePhraseAudioUrl(text: string): string | undefined {
  const exact = getPhraseAudioUrl(text);
  if (exact) return exact;
  return getSpokenAliases().get(phraseAudioSpokenKey(text)) ?? undefined;
}
