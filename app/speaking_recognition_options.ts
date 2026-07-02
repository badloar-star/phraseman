// Single source of truth for how Phraseman starts on-device speech recognition
// in the speaking ("Устно") / pronunciation modes.
//
// Why centralize: three call sites (SpeakingPanel, the personal-plan recorder,
// and the dev spike screen) each used to call ExpoSpeechRecognitionModule.start()
// with slightly different, under-tuned options. The accuracy of recognizing a
// KNOWN target English phrase depends almost entirely on these options:
//   - contextualStrings  → bias the language model toward the expected words
//                          (Apple SFSpeechRecognitionRequest.contextualStrings,
//                           Android EXTRA_BIASING_STRINGS) — the single biggest lever.
//   - maxAlternatives     → ask for several hypotheses so the scorer can pick the
//                          one closest to the target instead of blindly trusting #1.
//   - iosTaskHint         → 'confirmation' for short prompts, 'dictation' for sentences.
//   - addsPunctuation     → cleaner formatted hypothesis.
//   - androidIntentOptions silence timers → stop the engine cutting slow speakers
//                          off mid-phrase (audience is 40+/50+ who pause).
//
// No React / native top-level imports here so this stays pure & unit-testable.
// `Platform` is the only RN import and is side-effect-free.
import { Platform } from 'react-native';

import { speakingTargetTokens } from './speaking_word_match';

/** Shape we pass to ExpoSpeechRecognitionModule.start(). Loose by design — the
 *  native module accepts a superset; we only set the accuracy-relevant keys. */
export type SpeakingRecognitionStartOptions = Record<string, unknown>;

export interface BuildSpeakingStartOptionsInput {
  /** BCP-47 recognition locale, e.g. 'en-US'. */
  lang: string;
  /** The exact phrase the learner must say — used to bias the recognizer. */
  targetText: string;
  /** Whether to stream interim results (live word reveal). Default true. */
  interimResults?: boolean;
  /** Enable the live volume meter for the equalizer. Default true. */
  volumeMeter?: boolean;
  /**
   * Volume event cadence in ms. 250ms is smooth enough for the equalizer while
   * cutting ~60% of the bridge traffic vs the old 100ms.
   */
  volumeIntervalMillis?: number;
  /**
   * When the recognizer supports on-device recognition, force it. Pass the
   * result of supportsOnDeviceRecognition() here. When undefined/false the
   * platform default (often cloud) is used.
   */
  onDevice?: boolean;
}

/** iOS task hint tuned to phrase length: short prompts confirm fast, sentences dictate. */
export function iosTaskHintForTarget(targetText: string): 'confirmation' | 'dictation' {
  const wordCount = speakingTargetTokens(targetText).length;
  return wordCount <= 2 ? 'confirmation' : 'dictation';
}

/** Contextual bias strings: the whole phrase plus its individual word tokens,
 *  de-duplicated, capped at Apple's documented 100-phrase limit. */
export function buildContextualStrings(targetText: string): string[] {
  const phrase = targetText.trim();
  const tokens = speakingTargetTokens(targetText);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [phrase, ...tokens]) {
    const v = s.trim();
    if (v && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      out.push(v);
    }
  }
  return out.slice(0, 100);
}

/**
 * Build the canonical start() options for a known-target speaking attempt.
 * Used by every speaking surface so a fix here fixes the whole app.
 */
export function buildSpeakingStartOptions(
  input: BuildSpeakingStartOptionsInput,
): SpeakingRecognitionStartOptions {
  const {
    lang,
    targetText,
    interimResults = true,
    volumeMeter = true,
    volumeIntervalMillis = 250,
    onDevice = false,
  } = input;

  const contextualStrings = buildContextualStrings(targetText);

  const base: SpeakingRecognitionStartOptions = {
    lang,
    interimResults,
    continuous: false,
    // Phrase biasing — the biggest accuracy lever for a fixed-phrase app.
    contextualStrings,
    // Ask for several hypotheses; the scorer picks the best match to the target.
    maxAlternatives: 5,
    // Cleaner formatted hypothesis (scorer strips punctuation anyway).
    addsPunctuation: true,
    // iOS: tune the engine to the expected utterance length.
    iosTaskHint: iosTaskHintForTarget(targetText),
  };

  // Android reliability first: `supportsOnDeviceRecognition()` can return true on
  // Android 12, while the package creates the real on-device recognizer only on
  // Android 13+. Forcing offline there can route through a device-specific
  // service/package and fail before listening starts. Let Android use the system
  // default recognizer; keep the hard on-device requirement for iOS.
  if (onDevice && Platform.OS !== 'android') base.requiresOnDeviceRecognition = true;

  if (volumeMeter) {
    base.volumeChangeEventOptions = { enabled: true, intervalMillis: volumeIntervalMillis };
  }

  // persist keeps the captured audio around (both platforms): it powers the
  // «Послушай себя» replay AND the unbiased control pass. The uri arrives in
  // the `audioend` event; the file lives in the app cache (wav).
  base.recordingOptions = { persist: true };

  if (Platform.OS === 'android') {
    // Stop the endpointer cutting slow speakers off on a mid-phrase pause.
    // NOTE: these are hints — some OEM recognizers ignore them, so the
    // "pick the most-complete hypothesis" guard in the UI stays as a backstop.
    base.androidIntentOptions = {
      EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 800,
      EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
      EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 3000,
    };
  }

  return base;
}

export interface BuildControlRecognitionOptionsInput {
  /** BCP-47 recognition locale, e.g. 'en-US'. */
  lang: string;
  /** file:// uri of the persisted attempt audio (from the `audioend` event). */
  uri: string;
}

/**
 * Options for the HONESTY control pass: re-recognize the persisted attempt
 * audio with a NEUTRAL engine — deliberately NO contextualStrings and no task
 * hints, so the result reflects what the speech actually sounded like without
 * us feeding the answer to the recognizer. Compared against the biased score
 * in speaking_honesty_check.
 */
export function buildControlRecognitionOptions(
  input: BuildControlRecognitionOptionsInput,
): SpeakingRecognitionStartOptions {
  return {
    lang: input.lang,
    interimResults: false,
    continuous: false,
    // Several hypotheses: the control verdict is the engine's BEST neutral
    // guess, not its first one — we're testing honesty, not luck.
    maxAlternatives: 5,
    addsPunctuation: false,
    audioSource: { uri: input.uri },
  };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
