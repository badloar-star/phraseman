import { ttsLocaleForProductionStudyTarget } from '../study_target';
import { storageStudyTarget, type RuntimeStudyTarget } from '../target_storage_keys';
import { resolveFlashcardBackText, type CardItem, type FlashcardContentLang } from './types';
import type { TrainingCard } from './trainingSources';

export type AudioFlashcardSide = 'front' | 'back';

export type AudioDeckOptions = {
  contentLang: FlashcardContentLang;
  shuffle?: boolean;
  limit?: number;
  random?: () => number;
};

export type AudioPlayerPosition = {
  index: number;
  side: AudioFlashcardSide;
};

const SOURCE_LOCALE_TO_TTS: Partial<Record<FlashcardContentLang, string>> = {
  ru: 'ru-RU',
  uk: 'uk-UA',
  es: 'es-ES',
  'pt-BR': 'pt-BR',
  vi: 'vi-VN',
  id: 'id-ID',
  tr: 'tr-TR',
  pl: 'pl-PL',
};

const CYRILLIC_TTS_BY_CONTENT_LANG: Partial<Record<FlashcardContentLang, string>> = {
  ru: 'ru-RU',
  uk: 'uk-UA',
};

const UK_MARKERS = /[іїєґІЇЄҐ]/;
const CYRILLIC_RE = /[\u0400-\u04FF]/;

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function audioTextForSide(
  card: CardItem,
  side: AudioFlashcardSide,
  contentLang: FlashcardContentLang,
): string {
  return side === 'front'
    ? cleanText(card.en)
    : cleanText(resolveFlashcardBackText(card, contentLang));
}

export function hasAudioForCard(card: CardItem, contentLang: FlashcardContentLang): boolean {
  return !!audioTextForSide(card, 'front', contentLang) && !!audioTextForSide(card, 'back', contentLang);
}

export function buildFlashcardAudioDeck<TMemory = unknown>(
  cards: TrainingCard<TMemory>[],
  options: AudioDeckOptions,
): TrainingCard<TMemory>[] {
  const limit = Number.isFinite(options.limit) && options.limit && options.limit > 0
    ? Math.floor(options.limit)
    : cards.length;
  const filtered = cards.filter((card) => hasAudioForCard(card, options.contentLang));
  const next = options.shuffle ? shuffleCards(filtered, options.random ?? Math.random) : filtered;
  return next.slice(0, Math.max(0, limit));
}

export function speechLanguageForSide(
  card: CardItem,
  side: AudioFlashcardSide,
  contentLang: FlashcardContentLang,
  studyTarget?: RuntimeStudyTarget,
): string {
  if (side === 'front') {
    return ttsLocaleForProductionStudyTarget(storageStudyTarget(studyTarget));
  }
  const text = audioTextForSide(card, 'back', contentLang);
  if (UK_MARKERS.test(text)) return 'uk-UA';
  if (CYRILLIC_RE.test(text)) return CYRILLIC_TTS_BY_CONTENT_LANG[contentLang] ?? SOURCE_LOCALE_TO_TTS[contentLang] ?? 'en-US';
  return SOURCE_LOCALE_TO_TTS[contentLang] ?? 'en-US';
}

export function estimateSpeechDurationMs(text: string, rate = 0.9): number {
  const normalized = cleanText(text);
  if (!normalized) return 0;
  const words = normalized.split(/\s+/).filter(Boolean).length;
  const punctuationPauses = (normalized.match(/[.!?;:]/g) ?? []).length * 110;
  const safeRate = Math.max(0.5, Math.min(1.2, Number.isFinite(rate) ? rate : 0.9));
  const spokenMs = (Math.max(1, words) / (135 * safeRate)) * 60_000;
  const charFloor = normalized.length * 35;
  return Math.round(Math.max(1_100, Math.min(14_000, spokenMs + charFloor + punctuationPauses + 450)));
}

export function nextAudioPosition(
  current: AudioPlayerPosition,
  deckLength: number,
): AudioPlayerPosition | null {
  if (deckLength <= 0) return null;
  if (current.side === 'front') return { index: current.index, side: 'back' };
  const nextIndex = current.index + 1;
  return nextIndex >= deckLength ? null : { index: nextIndex, side: 'front' };
}

function shuffleCards<T>(cards: T[], random: () => number): T[] {
  const next = [...cards];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export default function __RouteShim() { return null; }
