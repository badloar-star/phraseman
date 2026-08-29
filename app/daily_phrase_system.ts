/**
 * Система "Фраза дня"
 * Идиомы показываются по кругу — каждый день следующая по порядку.
 * Когда все закончатся — начинаются снова с первой.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { dailyPhraseContentAvailableForTarget } from './daily_phrase_target_gate';
import {
  ensureFrenchRemoteFlashcards,
  getCachedFrenchRemoteFlashcards,
} from './french_flashcard_remote_runtime';
import {
  ensureFrenchRemoteDailyPhrases,
  getCachedFrenchRemoteDailyPhraseForDay,
} from './french_daily_phrase_remote_runtime';
import type { Idiom, IdiomSourceLocaleMap } from './idioms_data';
import { getIdiomsSync } from './idioms_lazy';
import type { SourceLocale } from './source_locales';
import {
  dailyPhraseKey,
  dailyPhraseLastDateKey,
  storageSourceLocale,
  storageStudyTarget,
  type RuntimeSourceLocale,
  type RuntimeStudyTarget,
} from './target_storage_keys';
import type { CardItem } from './flashcards/types';
import { DebugLogger } from './debug-logger';

export interface DailyPhrase {
  id: string;
  english: string;
  literal: string;
  meaning: string;
  text: string;
  literal_uk: string;
  meaning_uk: string;
  text_uk: string;
  literal_es?: string;
  meaning_es?: string;
  text_es?: string;
  sourceLocales?: IdiomSourceLocaleMap;
  date: string;
  allowSave: boolean;
  order?: number;
  scheduledDate?: string;
  active?: boolean;
  savedCount?: number;
}

const DAILY_PHRASE_KEY = 'daily_phrase_v3';
const LAST_PHRASE_DATE_KEY = 'last_phrase_date_v3';
const REMOTE_DAILY_PHRASE_CACHE_KEY = 'daily_phrase_remote_cache_v1';
const DAILY_PHRASES_COLLECTION = 'daily_phrases';
const FUNCTIONS_REGION = 'us-central1';
const REMOTE_DAILY_PHRASE_QUERY_LIMIT = 10;

type RemoteDailyPhraseDoc = Partial<Omit<DailyPhrase, 'date'>> & {
  id?: string;
  active?: boolean;
  allowSave?: boolean;
  order?: number;
  scheduledDate?: string;
  savedCount?: number;
};

function normalizeSourceLocales(raw: unknown): IdiomSourceLocaleMap | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: IdiomSourceLocaleMap = {};
  for (const [locale, value] of Object.entries(raw as Record<string, unknown>)) {
    if (
      (locale === 'es' || locale === 'pt-BR' || locale === 'vi' || locale === 'id' || locale === 'tr' || locale === 'pl') &&
      value &&
      typeof value === 'object'
    ) {
      const copy = value as Record<string, unknown>;
      const literal = typeof copy.literal === 'string' ? copy.literal : '';
      const meaning = typeof copy.meaning === 'string' ? copy.meaning : '';
      const text = typeof copy.text === 'string' ? copy.text : '';
      if (literal.trim() || meaning.trim() || text.trim()) {
        out[locale] = { literal, meaning, text };
      }
    }
  }
  return Object.keys(out).length ? out : undefined;
}

// Считаем номер дня с эпохи (UTC) для стабильного порядка
const getDayIndex = (): number => {
  const MS_PER_DAY = 86400000;
  return Math.floor(Date.now() / MS_PER_DAY);
};

const idiomForDay = (): Idiom => {
  const all = getIdiomsSync();
  const idx = getDayIndex() % all.length;
  return all[idx];
};

function todayKey(): string {
  return new Date().toISOString().split('T')[0]!;
}

function phraseFromIdiom(idiom: Idiom, date = todayKey()): DailyPhrase {
  return {
    id: `local-${idiom.id}`,
    english: idiom.english,
    literal: idiom.literal,
    meaning: idiom.meaning,
    text: idiom.text,
    literal_uk: idiom.literal_uk,
    meaning_uk: idiom.meaning_uk,
    text_uk: idiom.text_uk,
    literal_es: idiom.literal_es,
    meaning_es: idiom.meaning_es,
    text_es: idiom.text_es,
    sourceLocales: idiom.sourceLocales,
    date,
    scheduledDate: date,
    allowSave: true,
    active: true,
    order: idiom.id,
  };
}

function phraseFromFrenchFlashcard(card: CardItem, date = todayKey()): DailyPhrase {
  const sourceLocales = card.sourceLocales as Partial<Record<'ru' | 'uk', string>> | undefined;
  const ru = card.ru?.trim() || sourceLocales?.ru?.trim() || '';
  const uk = card.uk?.trim() || sourceLocales?.uk?.trim() || '';
  const sourceText = ru || uk;
  const targetText = card.en?.trim();
  return {
    id: `fr-daily-${card.id}`,
    english: targetText,
    literal: ru || sourceText,
    meaning: ru || sourceText,
    text: card.description?.trim() || ru || sourceText,
    literal_uk: uk || sourceText,
    meaning_uk: uk || sourceText,
    text_uk: card.description?.trim() || uk || sourceText,
    sourceLocales: undefined,
    date,
    scheduledDate: date,
    allowSave: true,
    active: true,
    order: getDayIndex(),
  };
}

function frenchFlashcardForDay(sourceLocale: RuntimeSourceLocale): DailyPhrase | null {
  const cards = getCachedFrenchRemoteFlashcards(sourceLocale)
    .filter((card) => card.isSystem && card.en?.trim() && (card.ru?.trim() || card.uk?.trim()));
  if (cards.length === 0) return null;
  const idx = getDayIndex() % cards.length;
  const card = cards[idx];
  return card ? phraseFromFrenchFlashcard(card) : null;
}

function frenchRemoteDailyPhraseForDay(sourceLocale: RuntimeSourceLocale): DailyPhrase | null {
  return getCachedFrenchRemoteDailyPhraseForDay(sourceLocale, getDayIndex(), todayKey());
}

async function getTodayFrenchPhrase(sourceLocaleInput?: RuntimeSourceLocale): Promise<DailyPhrase | null> {
  const sourceLocale = storageSourceLocale(sourceLocaleInput);
  const today = todayKey();
  const phraseKey = dailyPhraseKey('fr');
  const lastDateKey = dailyPhraseLastDateKey('fr');
  const cachedDate = await AsyncStorage.getItem(lastDateKey).catch(() => null);
  if (cachedDate === today) {
    const cached = await AsyncStorage.getItem(phraseKey).catch(() => null);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as DailyPhrase;
        if (parsed?.id?.startsWith('fr-daily-') && parsed.english?.trim()) return parsed;
      } catch (e) {
      // ignore corrupt French daily cache and rebuild from the remote pack below
      DebugLogger.error('daily_phrase_system:parsed', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    }
  }

  await ensureFrenchRemoteDailyPhrases(sourceLocale);
  const remoteDailyPhrase = frenchRemoteDailyPhraseForDay(sourceLocale);
  if (remoteDailyPhrase) {
    await AsyncStorage.setItem(phraseKey, JSON.stringify(remoteDailyPhrase));
    await AsyncStorage.setItem(lastDateKey, today);
    return remoteDailyPhrase;
  }

  await ensureFrenchRemoteFlashcards(sourceLocale);
  const phrase = frenchFlashcardForDay(sourceLocale);
  if (!phrase) return null;
  await AsyncStorage.setItem(phraseKey, JSON.stringify(phrase));
  await AsyncStorage.setItem(lastDateKey, today);
  return phrase;
}

function normalizeRemotePhrase(id: string, raw: RemoteDailyPhraseDoc, date: string): DailyPhrase | null {
  const english = typeof raw.english === 'string' ? raw.english.trim() : '';
  if (!english) return null;
  return {
    id,
    english,
    literal: typeof raw.literal === 'string' ? raw.literal : '',
    meaning: typeof raw.meaning === 'string' ? raw.meaning : '',
    text: typeof raw.text === 'string' ? raw.text : '',
    literal_uk: typeof raw.literal_uk === 'string' ? raw.literal_uk : '',
    meaning_uk: typeof raw.meaning_uk === 'string' ? raw.meaning_uk : '',
    text_uk: typeof raw.text_uk === 'string' ? raw.text_uk : '',
    literal_es: typeof raw.literal_es === 'string' ? raw.literal_es : undefined,
    meaning_es: typeof raw.meaning_es === 'string' ? raw.meaning_es : undefined,
    text_es: typeof raw.text_es === 'string' ? raw.text_es : undefined,
    sourceLocales: normalizeSourceLocales(raw.sourceLocales),
    date,
    scheduledDate: typeof raw.scheduledDate === 'string' ? raw.scheduledDate : date,
    allowSave: raw.allowSave !== false,
    active: raw.active !== false,
    order: typeof raw.order === 'number' ? raw.order : undefined,
    savedCount: typeof raw.savedCount === 'number' ? Math.max(0, raw.savedCount) : 0,
  };
}

export type DailyPhraseInterfaceLang = SourceLocale;

const firstText = (...values: Array<string | undefined>): string => {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return '';
};

export function dailyPhraseCopyForLang(phrase: DailyPhrase, lang: DailyPhraseInterfaceLang) {
  if (lang === 'uk') {
    return {
      literal: firstText(phrase.literal_uk, phrase.literal),
      meaning: firstText(phrase.meaning_uk, phrase.meaning),
      text: firstText(phrase.text_uk, phrase.text),
      isFallback: false,
    };
  }
  if (lang === 'es') {
    const hasCompleteSpanishCopy = !!(
      firstText(phrase.literal_es) &&
      firstText(phrase.meaning_es) &&
      firstText(phrase.text_es)
    );
    return {
      literal: firstText(phrase.literal_es, phrase.literal),
      meaning: firstText(phrase.meaning_es, phrase.meaning),
      text: firstText(phrase.text_es, phrase.text),
      isFallback: !hasCompleteSpanishCopy,
    };
  }
  if (lang !== 'ru') {
    const copy = phrase.sourceLocales?.[lang];
    const hasCompleteCopy = !!(
      firstText(copy?.literal) &&
      firstText(copy?.meaning) &&
      firstText(copy?.text)
    );
    return {
      literal: firstText(copy?.literal, phrase.literal),
      meaning: firstText(copy?.meaning, phrase.meaning),
      text: firstText(copy?.text, phrase.text),
      isFallback: !hasCompleteCopy,
    };
  }
  return {
    literal: firstText(phrase.literal),
    meaning: firstText(phrase.meaning),
    text: firstText(phrase.text),
    isFallback: false,
  };
}

function getFirestore(): any | null {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
}

function callable<TReq, TRes>(name: string): ((data: TReq) => Promise<{ data: TRes }>) | null {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
    return httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name) as (data: TReq) => Promise<{ data: TRes }>;
  } catch {
    return null;
  }
}

async function ensureCloudAuth(): Promise<void> {
  try {
    const mod = await import('./cloud_sync');
    await mod.ensureAnonUser().catch(() => null);
  } catch (e) {
      // best-effort
      DebugLogger.error('daily_phrase_system:mod', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

async function readRemoteTodayPhrase(date: string): Promise<DailyPhrase | null> {
  const db = getFirestore();
  if (!db) return null;
  try {
    await ensureCloudAuth();
    const snap = await db
      .collection(DAILY_PHRASES_COLLECTION)
      .where('scheduledDate', '==', date)
      .orderBy('order', 'asc')
      .limit(REMOTE_DAILY_PHRASE_QUERY_LIMIT)
      .get();
    let phrase: DailyPhrase | null = null;
    snap.forEach((docSnap: { id: string; data: () => RemoteDailyPhraseDoc }) => {
      if (phrase) return;
      const raw = docSnap.data();
      if (!raw || raw.active === false || raw.scheduledDate !== date) return;
      phrase = normalizeRemotePhrase(docSnap.id, raw, date);
    });
    if (phrase) {
      await AsyncStorage.setItem(REMOTE_DAILY_PHRASE_CACHE_KEY, JSON.stringify({ date, phrase }));
    }
    return phrase;
  } catch {
    return null;
  }
}

async function readCachedRemotePhrase(date: string): Promise<DailyPhrase | null> {
  try {
    const raw = await AsyncStorage.getItem(REMOTE_DAILY_PHRASE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { date?: string; phrase?: DailyPhrase };
    if (parsed.date !== date || !parsed.phrase?.english) return null;
    return parsed.phrase;
  } catch {
    return null;
  }
}

// ── Peek-кэш «фразы дня» ─────────────────────────────────────────────────────
// зачем (ускорение сплэша, 2026-08-25): первый кадр Главной раньше синхронно
// поднимал ВЕСЬ каталог идиом (610 КБ JS) ради одной фразы. Теперь сегодняшняя
// (и заранее завтрашняя) фраза лежит в AsyncStorage, гидрируется в bootstrap-
// пачке _layout.tsx до первого кадра, и sync-путь отдаёт её из памяти БЕЗ
// загрузки каталога. Каталог грузится лениво и только вне критического пути:
// пропущен день (нет пред-вычисленной фразы), квест деталей, уведомления.
const DAILY_PHRASE_PEEK_KEY = 'daily_phrase_peek_v1';
let peekPhraseToday: DailyPhrase | null = null;

export async function hydrateDailyPhrasePeekFromStorage(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_PHRASE_PEEK_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, DailyPhrase | undefined>;
    const todays = parsed?.[todayKey()];
    if (todays?.english?.trim()) peekPhraseToday = todays;
  } catch (e) {
      // best-effort: без peek sync-путь честно поднимет каталог, как раньше
      DebugLogger.error('daily_phrase_system:todays', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

function rememberPeekPhrases(today: DailyPhrase): void {
  peekPhraseToday = today;
  const map: Record<string, DailyPhrase> = { [today.date]: today };
  try {
    // Завтрашняя локальная фраза детерминирована (dayIndex+1 по кругу каталога):
    // считаем её здесь, в фоне, чтобы ЗАВТРАШНИЙ холодный старт тоже не грузил
    // каталог. Если завтра админ назначит remote-фразу — async-путь заменит её
    // после первого кадра (та же механика, что была у sync→remote всегда).
    const all = getIdiomsSync();
    const tomorrowIdiom = all[(getDayIndex() + 1) % all.length];
    const tomorrowDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]!;
    if (tomorrowIdiom) map[tomorrowDate] = phraseFromIdiom(tomorrowIdiom, tomorrowDate);
  } catch (e) {
      // каталог недоступен — сохраним хотя бы сегодняшнюю
      DebugLogger.error('daily_phrase_system:tomorrowDate', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  void AsyncStorage.setItem(DAILY_PHRASE_PEEK_KEY, JSON.stringify(map)).catch(() => {});
}

/** Sync phrase for first paint; matches idiomForDay() / cloud logic without I/O. */
export function getTodayPhraseSync(): DailyPhrase {
  if (peekPhraseToday && peekPhraseToday.date === todayKey()) return peekPhraseToday;
  const idiom = idiomForDay();
  return phraseFromIdiom(idiom);
}

export function getTodayPhraseSyncForTarget(
  studyTarget?: RuntimeStudyTarget,
  sourceLocaleInput?: RuntimeSourceLocale,
): DailyPhrase | null {
  if (!dailyPhraseContentAvailableForTarget(studyTarget)) return null;
  if (storageStudyTarget(studyTarget) === 'fr') {
    const sourceLocale = storageSourceLocale(sourceLocaleInput);
    return frenchRemoteDailyPhraseForDay(sourceLocale) || frenchFlashcardForDay(sourceLocale);
  }
  return getTodayPhraseSync();
}

export const getTodayPhrase = async (): Promise<DailyPhrase> => {
  const today = todayKey();
  try {
    const remote = await readRemoteTodayPhrase(today);
    if (remote) {
      await AsyncStorage.setItem(DAILY_PHRASE_KEY, JSON.stringify(remote));
      await AsyncStorage.setItem(LAST_PHRASE_DATE_KEY, today);
      rememberPeekPhrases(remote);
      return remote;
    }
    const cachedRemote = await readCachedRemotePhrase(today);
    if (cachedRemote) {
      rememberPeekPhrases(cachedRemote);
      return cachedRemote;
    }

    const savedDate = await AsyncStorage.getItem(LAST_PHRASE_DATE_KEY);
    if (savedDate === today) {
      const phraseStr = await AsyncStorage.getItem(DAILY_PHRASE_KEY);
      if (phraseStr) {
        const saved = JSON.parse(phraseStr) as DailyPhrase;
        rememberPeekPhrases(saved);
        return saved;
      }
    }
    const idiom = idiomForDay();
    const phrase = phraseFromIdiom(idiom, today);
    await AsyncStorage.setItem(DAILY_PHRASE_KEY, JSON.stringify(phrase));
    await AsyncStorage.setItem(LAST_PHRASE_DATE_KEY, today);
    rememberPeekPhrases(phrase);
    return phrase;
  } catch {
    return getDefaultPhrase();
  }
};

export const getTodayPhraseForTarget = async (
  studyTarget?: RuntimeStudyTarget,
  sourceLocaleInput?: RuntimeSourceLocale,
): Promise<DailyPhrase | null> => {
  if (!dailyPhraseContentAvailableForTarget(studyTarget)) return null;
  if (storageStudyTarget(studyTarget) === 'fr') {
    return getTodayFrenchPhrase(sourceLocaleInput);
  }
  return getTodayPhrase();
};

const getDefaultPhrase = (): DailyPhrase => {
  const idiom = getIdiomsSync()[0];
  return phraseFromIdiom(idiom);
};

export async function setDailyPhraseSavedOnServer(phraseId: string | undefined, saved: boolean): Promise<void> {
  const id = String(phraseId || '').trim();
  if (!id || id.startsWith('local-')) return;
  const fn = callable<{ phraseId: string; saved: boolean }, { ok: boolean; savedCount?: number }>('dailyPhraseSetSaved');
  if (!fn) return;
  try {
    await ensureCloudAuth();
    await fn({ phraseId: id, saved });
  } catch (e) {
      // Count sync is best-effort; local flashcard save must never fail because of analytics.
      DebugLogger.error('daily_phrase_system:fn', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

export async function setDailyPhraseSavedOnServerForTarget(
  phraseId: string | undefined,
  saved: boolean,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  if (!dailyPhraseContentAvailableForTarget(studyTarget)) return;
  await setDailyPhraseSavedOnServer(phraseId, saved);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
