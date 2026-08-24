import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { EPISODE_01_SESSION_01_WORD_FIRST_PHRASES } from './episode_01_session_01_phrases_word_first_v1';
import { EPISODE_01_SESSION_02_WORD_FIRST_PHRASES } from './episode_01_session_02_phrases_word_first_v1';
import { EPISODE_01_SESSION_03_WORD_FIRST_PHRASES } from './episode_01_session_03_phrases_word_first_v1';
import { EPISODE_01_SESSION_04_WORD_FIRST_PHRASES } from './episode_01_session_04_phrases_word_first_v1';
import { EPISODE_01_SESSION_06_WORD_FIRST_PHRASES } from './episode_01_session_06_phrases_word_first_v1';

const KNOWN = [
  ...EPISODE_01_SESSION_01_WORD_FIRST_PHRASES,
  ...EPISODE_01_SESSION_02_WORD_FIRST_PHRASES,
  ...EPISODE_01_SESSION_03_WORD_FIRST_PHRASES,
  ...EPISODE_01_SESSION_04_WORD_FIRST_PHRASES,
  ...EPISODE_01_SESSION_06_WORD_FIRST_PHRASES,
] as const;

const ORDER = [
  'I am here', 'I am ready', 'I am not here', 'I am happy', "I'm tired",
  'I am not ready', "I'm busy", 'I am a teacher', "I'm an artist",
  'I am fine', "I'm ready", 'I am not sad', "I'm happy", 'I am tired', "I'm not busy",
] as const;

function knownPhrase(english: string, index: number): EpisodeSourcePhrase {
  const source = KNOWN.find((phrase) => phrase.english === english);
  if (!source) throw new Error(`episode_01_session_07_known_phrase_missing:${english}`);
  return Object.freeze({
    ...source,
    id: `e01-s07-voice-${String(index + 1).padStart(2, '0')}`,
  });
}

/**
 * Voice intentionally reuses exact locked phrases: the learning target is
 * fluent spoken retrieval, not hidden vocabulary. Their manual localized
 * meanings, word traps and diagnostic feedback remain attached verbatim.
 */
export const EPISODE_01_SESSION_07_VOICE_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(ORDER.map(knownPhrase));
