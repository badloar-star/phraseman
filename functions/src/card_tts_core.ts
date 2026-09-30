// ═══════════════════════════════════════════════════════════════════════════
// card_tts_core.ts — озвучка карточек через OpenAI TTS (чистая логика).
//
// зачем: D128 (владелец 2026-09-30) — карточки звучат нужным языком голосом
// OpenAI, а не чужим голосом устройства. Одобренный набор озвучивается сразу
// на сервере; официальные наборы — отдельным скриптом с оценкой стоимости.
//
// Ключ клипа = хэш(версия стиля + язык + голос + модель + нормализованный
// текст). Путь в Storage и download-токен выводятся из ключа ДЕТЕРМИНИРОВАННО,
// поэтому:
//   - одна и та же фраза в разных наборах оплачивается ОДИН раз (глобальный
//     дедуп по наличию объекта в Storage);
//   - клиент считает ту же ссылку сам, без чтения Firestore на каждую карточку
//     (зеркало: app/flashcards/card_tts_audio.ts; сторож
//     tests/card_tts_client_server_parity.test.ts).
//
// Сеть и Firebase здесь не трогаются — модуль покрыт тестами без эмулятора.
// ═══════════════════════════════════════════════════════════════════════════

import { createHash } from 'crypto';
import { communityPackTtsLanguage, type CommunityStudyPackLanguage } from './community_pack_language';

export type CardTtsLanguage = CommunityStudyPackLanguage;

/** Модель — та же, что у корпуса фраз и турниров (scripts/regen_phrase_audio_storage.mjs). */
export const CARD_TTS_MODEL = 'gpt-4o-mini-tts';

/**
 * Голос на язык.
 *
 * зачем такие: en — `echo`, как весь корпус фраз уроков: человек слышит в
 * карточках тот же тембр, что и на занятиях. Для es/fr/de/it — `marin`:
 * новейший голос OpenAI с самой естественной многоязычной речью (уже
 * используется в проекте для русской сводки директора и MAX). Язык задаёт
 * текст + инструкция ниже, голос у gpt-4o-mini-tts многоязычный.
 * Меняешь голос — поднимай CARD_TTS_STYLE_VERSION (иначе дедуп вернёт старый звук).
 */
export const CARD_TTS_VOICE_BY_LANGUAGE: Readonly<Record<CardTtsLanguage, string>> = Object.freeze({
  en: 'echo',
  es: 'marin',
  fr: 'marin',
  de: 'marin',
  it: 'marin',
});

/** Спокойный учительский темп корпуса фраз (0.92). */
export const CARD_TTS_SPEED = 0.92;

const LANGUAGE_NAME: Readonly<Record<CardTtsLanguage, string>> = Object.freeze({
  en: 'English',
  es: 'Spanish as spoken in Spain',
  fr: 'French as spoken in France',
  de: 'German as spoken in Germany',
  it: 'Italian as spoken in Italy',
});

export function cardTtsInstructions(language: CardTtsLanguage): string {
  return `Read this short ${LANGUAGE_NAME[language]} flashcard text for a language learner. `
    + 'Calm and steady, slightly slower than conversational, with clean articulation. '
    + 'Keep the tone even and grounded — no brightness, no theatrics. Read it exactly as written.';
}

/**
 * Версия «стиля» (голос/скорость/инструкция). Входит в ключ: смена стиля
 * порождает новые пути, старые клипы не подменяются молча.
 */
export const CARD_TTS_STYLE_VERSION = 'v1';

/** Предохранитель: длиннее — не озвучиваем (карточка, а не абзац). */
export const CARD_TTS_MAX_CHARS = 300;

/** Префикс объектов в Storage. */
export const CARD_TTS_STORAGE_PREFIX = 'card-audio';

/** Боевой бакет — клиент строит ту же ссылку (app/flashcards/card_tts_audio.ts). */
export const CARD_TTS_DEFAULT_BUCKET = 'phraseman-ea0b3.firebasestorage.app';

/**
 * Оценка цены: $0.015 за 1000 символов — та же ставка, что в
 * scripts/voice_missing_phrase_audio.mjs для gpt-4o-mini-tts.
 * Допущение: реальный счёт OpenAI для gpt-4o-mini-tts идёт токенами
 * ($0.60/M текст на вход + $12/M аудио на выход ≈ $0.015 за минуту звука);
 * для коротких карточек символьная оценка даёт верхнюю планку того же порядка.
 */
export const CARD_TTS_USD_PER_1K_CHARS = 0.015;

/** Потолок символов на один прогон (набор: максимум 50 карточек × 300). */
export const CARD_TTS_MAX_CHARS_PER_RUN = 15_000;
/** Глобальный суточный потолок символов (~$4.5/сутки по оценке выше). */
export const CARD_TTS_DAILY_CHAR_CAP = 300_000;
/** Сколько раз в сутки можно озвучивать один набор (защита от правок-по-кругу). */
export const CARD_TTS_MAX_RUNS_PER_PACK_PER_DAY = 4;
/** Параллельных запросов к OpenAI в одном прогоне. */
export const CARD_TTS_CONCURRENCY = 4;
/** Тайм-аут одного запроса TTS (потолок функции 300 с, до 13 волн по 4). */
export const CARD_TTS_FETCH_TIMEOUT_MS = 20_000;

export function normalizeCardTtsText(text: unknown): string {
  return String(text ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
}

/** Ключ клипа: sha256 → 40 hex. Регистр сохраняем (немецкие существительные, имена). */
export function cardTtsKey(language: CardTtsLanguage, text: string): string {
  const voice = CARD_TTS_VOICE_BY_LANGUAGE[language];
  const material = [
    `card-tts-${CARD_TTS_STYLE_VERSION}`,
    language,
    voice,
    CARD_TTS_MODEL,
    normalizeCardTtsText(text),
  ].join('\n');
  return createHash('sha256').update(material, 'utf8').digest('hex').slice(0, 40);
}

export function cardTtsObjectPath(language: CardTtsLanguage, key: string): string {
  return `${CARD_TTS_STORAGE_PREFIX}/${CARD_TTS_STYLE_VERSION}/${language}/${key}.mp3`;
}

/**
 * Детерминированный download-токен из пути (приём tournament_audio.ts):
 * перезапись файла не ломает ссылки, клиент вычисляет тот же токен сам.
 * Токен не секрет — это публичный учебный звук, как phrase-audio.
 */
export function cardTtsDownloadToken(objectPath: string): string {
  const hex = createHash('sha256').update(`card-audio-token:${objectPath}`, 'utf8').digest('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join('-');
}

export function cardTtsDownloadUrl(bucketName: string, objectPath: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}`
    + `/o/${encodeURIComponent(objectPath)}?alt=media&token=${cardTtsDownloadToken(objectPath)}`;
}

/** Что именно звучит у карточки: целевой текст (targetText, иначе en). */
export function cardTtsTextOfCard(card: unknown): string {
  if (!card || typeof card !== 'object') return '';
  const c = card as Record<string, unknown>;
  return normalizeCardTtsText(c.targetText) || normalizeCardTtsText(c.en);
}

export type CardTtsItem = Readonly<{
  text: string;
  language: CardTtsLanguage;
  key: string;
  objectPath: string;
}>;

export type CardTtsPlanSkipReason = 'empty' | 'too_long';

export type CardTtsPackPlan =
  | Readonly<{ ok: false; reason: 'pack_language_none' | 'not_published' | 'no_cards' }>
  | Readonly<{
    ok: true;
    language: CardTtsLanguage;
    items: readonly CardTtsItem[];
    revision: string;
    skipped: Readonly<Record<CardTtsPlanSkipReason, number>>;
    cardCount: number;
  }>;

export function planCardTtsItems(
  language: CardTtsLanguage,
  texts: readonly string[],
): { items: CardTtsItem[]; skipped: Record<CardTtsPlanSkipReason, number> } {
  const skipped: Record<CardTtsPlanSkipReason, number> = { empty: 0, too_long: 0 };
  const byKey = new Map<string, CardTtsItem>();
  for (const raw of texts) {
    const text = normalizeCardTtsText(raw);
    if (!text) { skipped.empty += 1; continue; }
    if (text.length > CARD_TTS_MAX_CHARS) { skipped.too_long += 1; continue; }
    const key = cardTtsKey(language, text);
    if (!byKey.has(key)) byKey.set(key, { text, language, key, objectPath: cardTtsObjectPath(language, key) });
  }
  return { items: [...byKey.values()], skipped };
}

/**
 * План озвучки опубликованного набора. Приватные/снятые наборы не озвучиваются
 * (D128 privacy: в OpenAI уходит только текст ОПУБЛИКОВАННЫХ карточек), наборы
 * «без языка» — тоже (D127, communityPackTtsLanguage → null).
 */
export function planPackCardTts(packId: string, pack: Record<string, unknown> | null | undefined): CardTtsPackPlan {
  if (!pack || pack.listingStatus !== 'published') return { ok: false, reason: 'not_published' };
  const language = communityPackTtsLanguage(pack.packLanguage, { packId });
  if (!language) return { ok: false, reason: 'pack_language_none' };
  const cards = Array.isArray(pack.cards) ? pack.cards : [];
  if (cards.length === 0) return { ok: false, reason: 'no_cards' };
  const { items, skipped } = planCardTtsItems(language, cards.map(cardTtsTextOfCard));
  return { ok: true, language, items, revision: cardTtsRevision(language, items), skipped, cardCount: cards.length };
}

/** Ревизия = язык + отсортированные ключи. Та же ревизия = озвучивать нечего. */
export function cardTtsRevision(language: CardTtsLanguage, items: readonly CardTtsItem[]): string {
  const keys = items.map((item) => item.key).sort();
  return createHash('sha256')
    .update(`${CARD_TTS_STYLE_VERSION}\n${language}\n${keys.join(',')}`, 'utf8')
    .digest('hex')
    .slice(0, 32);
}

export function cardTtsCharCount(items: readonly Pick<CardTtsItem, 'text'>[]): number {
  return items.reduce((sum, item) => sum + item.text.length, 0);
}

export function cardTtsEstimateUsd(chars: number): number {
  return Math.round((chars / 1000) * CARD_TTS_USD_PER_1K_CHARS * 10_000) / 10_000;
}

/** UTC-день для суточного бюджета. */
export function cardTtsDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/** Ограниченная параллельность без зависимостей: порядок результатов = порядок входа. */
export async function mapWithConcurrency<T, R>(
  input: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(input.length);
  let cursor = 0;
  const lanes = Math.max(1, Math.min(Math.floor(limit) || 1, input.length));
  await Promise.all(Array.from({ length: lanes }, async () => {
    while (cursor < input.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(input[index] as T, index); // guard-ok: не Firestore, воркер TTS/Storage
    }
  }));
  return results;
}
