/**
 * Widget bridge.
 *
 * Single responsibility: take the current "phrase of the day" + the active
 * theme's chrome and publish a compact, presentation-ready snapshot into
 * platform shared storage so the native home-screen / lock-screen widgets
 * (iOS WidgetKit, Android Glance) render an exact visual match of the in-app
 * Daily Phrase card — without ever touching React Native.
 *
 * The native side only ever READS this snapshot. RN is the sole writer.
 *
 * Data flow:
 *   getTodayPhraseForTarget()  ->  buildWidgetPayload()  ->  PhraseWidget.setData()
 *        (daily_phrase_system)        (this file)            (native module)
 *
 * Call sites: app start (root layout), study-target / theme change, the
 * DailyPhraseCard, and (later) the expo-notifications background task.
 */

import { getTodayPhraseForTarget } from './daily_phrase_system';
import { dailyPhraseCopyForLang } from './daily_phrase_system';
import type { DailyPhrase, DailyPhraseInterfaceLang } from './daily_phrase_system';
import { dailyPhraseChromeFor } from './daily_phrase_chrome';
import { getTranscription } from './transcription';
import type { RuntimeStudyTarget } from './target_storage_keys';
import type { ThemeMode } from '../constants/theme';
import PhraseWidget from '../modules/phrase-widget';

/**
 * Theme palette carried into the snapshot so native renders the same look as the
 * in-app card for the active theme. Flat strings only (App Group UserDefaults /
 * SharedPreferences hold strings).
 */
export interface WidgetTheme {
  /** Active app theme id. */
  mode: ThemeMode;
  /** 3-stop vertical gradient top → bottom (hex). */
  gradientTop: string;
  gradientMid: string;
  gradientBottom: string;
  /** Hairline border (rgba/hex string). */
  border: string;
  /** Kicker / label color. */
  titleColor: string;
  /** English phrase color. */
  phraseColor: string;
  /** Meaning / sub text color. */
  subColor: string;
  /** Brand accent (ornament + play affordance). */
  accent: string;
  /** Icon/accent chip fill. */
  chipBg: string;
  /** Icon/accent chip border. */
  chipBorder: string;
  /** Soft ambient accent glow behind the card (top-right bloom). */
  glow: string;
}

/**
 * Shape written to shared storage. Versioned so a future native build can detect
 * and ignore snapshots it does not understand. Flat and small.
 */
export interface WidgetPayload {
  schemaVersion: 2;
  phraseId: string;
  /** Target language phrase (e.g. English idiom). */
  english: string;
  /** Native-language meaning, already resolved for the interface language. */
  meaning: string;
  /** Literal/word-for-word gloss, already resolved for the interface language. */
  literal: string;
  /** Phonetic transcription, when available. */
  transcription: string;
  /** Localized kicker shown above the phrase ("ФРАЗА ДНЯ" etc.). */
  kicker: string;
  /** Deep link the whole widget opens. */
  deepLink: string;
  /** Deep link the play button opens (app opens and auto-speaks on-device). */
  playDeepLink: string;
  /** Interface language the copy was rendered for. */
  lang: DailyPhraseInterfaceLang;
  /** Theme chrome so native matches the in-app card. */
  theme: WidgetTheme;
  /** ISO date (YYYY-MM-DD) the snapshot represents. */
  date: string;
  /** Epoch ms when written — lets native show "stale" state if RN never ran. */
  updatedAt: number;
}

const SCHEME = 'phraseman';

/** Localized "phrase of the day" kicker, matching the in-app card labels. */
const KICKER_BY_LANG: Record<string, string> = {
  ru: 'ФРАЗА ДНЯ',
  uk: 'ВИСЛІВ ДНЯ',
  es: 'FRASE DEL DÍA',
  'pt-BR': 'FRASE DO DIA',
  vi: 'CỤM TỪ HÔM NAY',
  id: 'FRASA HARI INI',
  tr: 'GÜNÜN İFADESİ',
  pl: 'FRAZA DNIA',
};

function firstNonEmpty(...values: Array<string | undefined | null>): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return '';
}

function themeFromMode(mode: ThemeMode): WidgetTheme {
  const c = dailyPhraseChromeFor(mode);
  return {
    mode,
    gradientTop: c.colors[0],
    gradientMid: c.colors[1],
    gradientBottom: c.colors[2],
    border: c.border,
    titleColor: c.title,
    phraseColor: c.phrase,
    subColor: c.sub,
    accent: c.ornament,
    chipBg: c.iconBg,
    chipBorder: c.iconBorder,
    glow: c.glow,
  };
}

/**
 * Build the immutable snapshot from a phrase + theme. Pure — no I/O — so it is
 * trivially testable and never throws on its own.
 */
export function buildWidgetPayload(
  phrase: DailyPhrase,
  lang: DailyPhraseInterfaceLang,
  mode: ThemeMode,
  now: number,
): WidgetPayload {
  const copy = dailyPhraseCopyForLang(phrase, lang);
  const encodedId = encodeURIComponent(phrase.id);

  return {
    schemaVersion: 2,
    phraseId: phrase.id,
    english: firstNonEmpty(phrase.english),
    meaning: firstNonEmpty(copy.meaning),
    literal: firstNonEmpty(copy.literal),
    // The DailyPhrase type carries no transcription, so derive it on-device from
    // the offline IPA generator (pure, no I/O — safe inside this pure builder).
    // This finally lights up the medium-widget transcription line, which was
    // permanently empty because nothing ever populated this field.
    transcription: firstNonEmpty(getTranscription(phrase.english)),
    kicker: KICKER_BY_LANG[lang] ?? KICKER_BY_LANG.ru,
    deepLink: `${SCHEME}://phrase/${encodedId}`,
    playDeepLink: `${SCHEME}://phrase/${encodedId}?play=1`,
    lang,
    theme: themeFromMode(mode),
    date: phrase.date,
    updatedAt: now,
  };
}

/**
 * Resolve today's phrase and publish it to the widget. Best-effort: failures are
 * contained (returns false) so a widget refresh never crashes the host app, but
 * they are surfaced in __DEV__ so they are observable.
 */
export async function syncWidgetData(options?: {
  studyTarget?: RuntimeStudyTarget;
  lang?: DailyPhraseInterfaceLang;
  themeMode?: ThemeMode;
  now?: number;
}): Promise<boolean> {
  try {
    if (!PhraseWidget.isAvailable()) return false;

    const phrase = await getTodayPhraseForTarget(options?.studyTarget);
    if (!phrase) return false;

    const lang: DailyPhraseInterfaceLang = options?.lang ?? 'ru';
    const mode: ThemeMode = options?.themeMode ?? 'dark';
    const now = options?.now ?? Date.now();
    const payload = buildWidgetPayload(phrase, lang, mode, now);

    await PhraseWidget.setData(payload);
    await PhraseWidget.reloadAll();
    return true;
  } catch (error) {
    // Widget refresh must never break the host app — but make it observable.
    if (__DEV__) {
      console.warn('[widget_bridge] syncWidgetData failed:', error);
    }
    return false;
  }
}
