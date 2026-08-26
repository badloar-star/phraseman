/**
 * Widget bridge.
 *
 * Single responsibility: take the user's personal card decks (saved + created)
 * plus the active theme's chrome and publish a compact, presentation-ready
 * snapshot into platform shared storage so the native home-screen / lock-screen
 * widgets (iOS WidgetKit, Android Glance) render an exact visual match of the
 * in-app cards — without ever touching React Native.
 *
 * The native side only ever READS this snapshot. RN is the sole writer, and RN
 * is also the sole entitlement authority (`access: 'plus' | 'free'`).
 *
 * Data flow (live, schema v3):
 *   loadFlashcards + readCustomCards
 *     -> buildPersonalDeckWidgetPayload()  ->  PhraseWidget.setData()
 *              (this file)                      (native module)
 *
 * `buildWidgetPayload()` below is the DEAD schema-v2 "phrase of the day"
 * builder — kept only for its contract test; nothing in the app calls it.
 *
 * ⛔ Native cannot import these types, so a renamed/removed field does not break
 * the build — it silently kills the widget. That already happened once (see
 * docs/daily-phrase-widget.md → "Schema drift"). Change the payload and you MUST
 * update both native decoders in the same commit.
 *
 * Call sites: app start (root layout), foreground, study-target / theme / lang
 * change, and the DailyPhraseCard.
 */

import { dailyPhraseCopyForLang } from './daily_phrase_system';
import type { DailyPhrase, DailyPhraseInterfaceLang } from './daily_phrase_system';
import { Platform } from 'react-native';
import { dailyPhraseChromeFor } from './daily_phrase_chrome';
import { getTranscription } from './transcription';
import type { RuntimeStudyTarget } from './target_storage_keys';
import type { ThemeMode } from '../constants/theme';
import PhraseWidget from '../modules/phrase-widget';
import { getVerifiedPremiumStatus } from './premium_guard';
import { loadFlashcards, type Flashcard } from '../hooks/use-flashcards';
import { readCustomCards } from './flashcards/storage';
import { resolveFlashcardBackText, type CardItem } from './flashcards/types';
import type { WidgetDeckCardPayload, WidgetDeckPayload, WidgetDeckSource } from '../modules/phrase-widget/types';

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
export interface LegacyWidgetPayload {
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
): LegacyWidgetPayload {
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

export interface PersonalDeckWidgetInput {
  isPlus: boolean;
  lang: DailyPhraseInterfaceLang;
  mode: ThemeMode;
  now: number;
  saved: Array<Partial<Pick<Flashcard, 'id' | 'en' | 'ru' | 'uk' | 'es' | 'sourceLocales' | 'transcription'>>>;
  created: Array<Partial<CardItem>>;
}

function deckCard(
  source: WidgetDeckSource,
  card: Partial<CardItem>,
  lang: DailyPhraseInterfaceLang,
): WidgetDeckCardPayload | null {
  const id = String(card.id ?? '').trim();
  const english = String(card.en ?? '').trim();
  if (!id || !english) return null;
  const meaning = resolveFlashcardBackText({
    id,
    en: english,
    ru: String(card.ru ?? ''),
    uk: String(card.uk ?? card.ru ?? ''),
    es: typeof card.es === 'string' ? card.es : undefined,
    sourceLocales: card.sourceLocales,
    categoryId: source === 'saved' ? 'saved' : 'custom',
    isSystem: false,
  }, lang) || String(card.ru ?? card.uk ?? '').trim();
  return {
    id,
    english,
    meaning,
    transcription: String(card.transcription ?? getTranscription(english) ?? '').trim(),
    deepLink: `${SCHEME}://deck/${source}/${encodeURIComponent(id)}`,
  };
}

function deckPayload(
  source: WidgetDeckSource,
  cards: Array<Partial<CardItem>>,
  lang: DailyPhraseInterfaceLang,
): WidgetDeckPayload {
  const mapped = cards.map((card) => deckCard(source, card, lang)).filter((card): card is WidgetDeckCardPayload => card != null);
  return { empty: mapped.length === 0, cards: mapped };
}

/**
 * Builds the Plus-only personal-deck snapshot. The native layer receives both
 * deck lists but never entitlement secrets; it renders a local free/empty state
 * until RN next publishes an entitled snapshot.
 */
export function buildPersonalDeckWidgetPayload(input: PersonalDeckWidgetInput) {
  const empty: WidgetDeckPayload = { empty: true, cards: [] };
  return {
    schemaVersion: 3 as const,
    access: input.isPlus ? 'plus' as const : 'free' as const,
    decks: input.isPlus
      ? {
          saved: deckPayload('saved', input.saved as Array<Partial<CardItem>>, input.lang),
          created: deckPayload('created', input.created, input.lang),
        }
      : { saved: empty, created: empty },
    lang: input.lang,
    theme: themeFromMode(input.mode),
    updatedAt: input.now,
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

    const lang: DailyPhraseInterfaceLang = options?.lang ?? 'ru';
    const mode: ThemeMode = options?.themeMode ?? 'dark';
    const now = options?.now ?? Date.now();
    const isPlus = await getVerifiedPremiumStatus().catch(() => false);
    const [saved, created]: [Flashcard[], unknown[]] = isPlus
      ? await Promise.all([
          loadFlashcards(options?.studyTarget).catch((): Flashcard[] => []),
          readCustomCards(options?.studyTarget).catch((): unknown[] => []),
        ])
      : [[], []];
    const payload = buildPersonalDeckWidgetPayload({
      isPlus,
      lang,
      mode,
      now,
      saved,
      created: Array.isArray(created) ? created as Array<Partial<CardItem>> : [],
    });

    await PhraseWidget.setData(payload);
    await PhraseWidget.reloadAll();

    // On iOS the green "Break the ice" placeholder appears when the widget
    // extension cannot read this snapshot from the shared App Group. setData()
    // already read-back-verifies the write, but double-check the container is
    // genuinely shared so a misprovisioned App Group is loud, not silent.
    if (__DEV__ && Platform.OS === 'ios') {
      const shared = await PhraseWidget.hasSharedSnapshot().catch(() => false);
      if (!shared && PhraseWidget.isAvailable()) {
        console.warn(
          '[widget_bridge] App Group snapshot not readable after write — the iOS ' +
            'widget will show the placeholder. Verify "group.app.phraseman.widget" ' +
            'is provisioned for BOTH the app and the PhraseWidget extension App IDs ' +
            '(Apple Developer portal / EAS credentials), then rebuild.',
        );
      }
    }
    return true;
  } catch (error) {
    // Widget refresh must never break the host app — but it must never be silent
    // either.
    // зачем: этот catch однажды уже спрятал полностью мёртвый Android-виджет —
    // нативный мост отвергал каждый снимок схемы v3, а предупреждение было только
    // под __DEV__, поэтому в проде отказ не был виден никому. Логируем всегда:
    // console.warn дешёвый, вызывается редко (старт, foreground, смена темы).
    console.warn('[widget_bridge] syncWidgetData failed:', error);
    return false;
  }
}
