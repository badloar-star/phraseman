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
  getCachedFrenchRemoteDailyPhrasePool,
  getCachedFrenchRemoteDailyPhraseForDay,
} from './french_daily_phrase_remote_runtime';
import {
  ensureTargetRemoteDailyPhrases,
  getCachedTargetRemoteDailyPhraseForDay,
  getCachedTargetRemoteDailyPhrasePool,
} from './multilingual_daily_phrase_remote_runtime';
import type { Idiom, IdiomSourceLocaleMap } from './idioms_data';
import { getIdiomsSync, isIdiomsCatalogLoaded } from './idioms_lazy';
import { InteractionManager } from 'react-native';
import type { SourceLocale } from './source_locales';
import type { StudyTarget } from './study_target';
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
import { rnfbInstance } from './rnfb_modular';
import { noteSwallowedHandler, noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

export type DailyPhraseQuizDistractor = {
  id: string;
  text: string;
  misconceptionCode: string;
  feedback: string;
};

export type DailyPhraseQuiz = {
  correctFeedback: string;
  distractors: readonly DailyPhraseQuizDistractor[];
};

export type DailyPhraseQuestPoolItem = {
  id: string | number;
  meaning: string;
  meaning_uk?: string;
  meaning_es?: string;
  sourceLocales?: IdiomSourceLocaleMap;
};

export interface DailyPhrase {
  id: string;
  studyTarget: StudyTarget;
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
  quiz_ru?: DailyPhraseQuiz;
  quiz_uk?: DailyPhraseQuiz;
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
    studyTarget: 'en',
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
    studyTarget: 'fr',
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
  const cachedDate = await AsyncStorage.getItem(lastDateKey).catch(noteSwallowedAs('daily_phrase_system:promise_1', null));
  if (cachedDate === today) {
    const cached = await AsyncStorage.getItem(phraseKey).catch(noteSwallowedAs('daily_phrase_system:promise_2', null));
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

function targetRemoteDailyPhraseForDay(
  studyTarget: Extract<RuntimeStudyTarget, 'es' | 'de' | 'it'>,
  sourceLocale: RuntimeSourceLocale,
): DailyPhrase | null {
  return getCachedTargetRemoteDailyPhraseForDay(studyTarget, sourceLocale, getDayIndex(), todayKey());
}

async function getTodayTargetRemotePhrase(
  studyTarget: Extract<RuntimeStudyTarget, 'es' | 'de' | 'it'>,
  sourceLocaleInput?: RuntimeSourceLocale,
): Promise<DailyPhrase | null> {
  const sourceLocale = storageSourceLocale(sourceLocaleInput);
  const today = todayKey();
  const phraseKey = dailyPhraseKey(studyTarget);
  const lastDateKey = dailyPhraseLastDateKey(studyTarget);
  const cachedDate = await AsyncStorage.getItem(lastDateKey)
    .catch(noteSwallowedAs('daily_phrase_system:target_remote_date', null));
  if (cachedDate === today) {
    const cached = await AsyncStorage.getItem(phraseKey)
      .catch(noteSwallowedAs('daily_phrase_system:target_remote_phrase', null));
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as DailyPhrase;
        // зачем (координатор 12.10: «строк asset: read в журнале нет — откуда пакет?»): выход по кэшу дня был немым —
        // пакет .dpk в этот день не читается вовсе. Источник фразы — в журнал.
        if (parsed.studyTarget === studyTarget && parsed.english?.trim()) {
          console.log('[DAILY-PHRASE-GATE] today: source=day_cache', JSON.stringify({ studyTarget, sourceLocale, date: today, id: parsed.id ?? null })); // guard-ok: источник фразы дня
          return parsed;
        }
        console.log('[DAILY-PHRASE-GATE] today: day_cache_rejected', JSON.stringify({ studyTarget, cachedTarget: parsed.studyTarget ?? null, hasText: Boolean(parsed.english?.trim()) })); // guard-ok: отказ кэша называет причину
      } catch (e) {
        DebugLogger.error(
          'daily_phrase_system:target_remote_cache',
          e instanceof Error ? e : new Error(String(e)),
          'warning',
        );
      }
    }
  }

  const packStartedAt = Date.now();
  await ensureTargetRemoteDailyPhrases(studyTarget, sourceLocale);
  const phrase = targetRemoteDailyPhraseForDay(studyTarget, sourceLocale);
  if (!phrase) {
    console.warn('[DAILY-PHRASE-GATE] today: no_phrase', JSON.stringify({ studyTarget, sourceLocale, date: today, cachedDate, ms: Date.now() - packStartedAt })); // guard-ok: ранний выход называет причину
    return null;
  }
  console.log('[DAILY-PHRASE-GATE] today: source=pack', JSON.stringify({ studyTarget, sourceLocale, date: today, id: phrase.id ?? null, ms: Date.now() - packStartedAt })); // guard-ok: источник фразы дня
  await AsyncStorage.setItem(phraseKey, JSON.stringify(phrase));
  await AsyncStorage.setItem(lastDateKey, today);
  return phrase;
}

function normalizeRemotePhrase(id: string, raw: RemoteDailyPhraseDoc, date: string): DailyPhrase | null {
  const english = typeof raw.english === 'string' ? raw.english.trim() : '';
  if (!english) return null;
  return {
    id,
    studyTarget: 'en',
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

/**
 * Gives the quest only same-target candidates. A French card can therefore
 * never receive English-idiom distractors while its remote pack is loading or
 * after it has loaded.
 */
export function getDailyPhraseQuestPoolForTarget(
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
): readonly DailyPhraseQuestPoolItem[] {
  const target = studyTarget == null ? 'en' : studyTarget;
  switch (target) {
    case 'en':
      return getIdiomsSync();
    case 'fr':
      return getCachedFrenchRemoteDailyPhrasePool(sourceLocale);
    case 'es':
    case 'de':
    case 'it':
      return getCachedTargetRemoteDailyPhrasePool(target, sourceLocale);
    default:
      return [];
  }
}

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
    // зачем (координатор §67): модульный экземпляр — без «use getApp()» на вызов.
    return rnfbInstance(require('@react-native-firebase/firestore'), 'getFirestore');
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
    await mod.ensureAnonUser().catch(noteSwallowedAs('daily_phrase_system:promise_3', null));
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
    // зачем (координатор §67): тот же запрос с теми же where/orderBy/limit, модульным API.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fsMod = require('@react-native-firebase/firestore');
    const snap = await fsMod.getDocs(
      fsMod.query(
        fsMod.collection(db, DAILY_PHRASES_COLLECTION),
        fsMod.where('scheduledDate', '==', date),
        fsMod.orderBy('order', 'asc'),
        fsMod.limit(REMOTE_DAILY_PHRASE_QUERY_LIMIT),
      ),
    );
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
  } catch (error) {
    // зачем (правило «немой catch запрещён»): битый кэш = идём дальше по цепочке, но причина видна.
    console.warn(`[DAILY-PHRASE] day_cache read failed — ${error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120)}`);
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
/** Снимок с диска целиком ({сегодня, завтра}) — чтобы «завтра», посчитанное прошлым запуском, не требовало каталога. */
let peekStoredMap: Record<string, DailyPhrase | undefined> | null = null;

// зачем (координатор 11.10, «сперва логи»): первый кадр Главной поднимал полный каталог идиом (627 мс). Снимок
// фразы дня существует ровно чтобы этого не было — видно, в каком состоянии он был в момент промаха.
let peekHydrationState: 'pending' | 'empty' | 'no_today' | 'ready' | 'failed' = 'pending';
const peekHydratedListeners = new Set<() => void>();

/** Снимок фразы ещё читается с диска (первый кадр не должен ради фразы поднимать каталог идиом). */
export function isDailyPhrasePeekPending(): boolean {
  return peekHydrationState === 'pending';
}

/** Сообщить, когда чтение снимка закончилось (с любым итогом) — карточка подставит фразу без каталога. */
export function subscribeDailyPhrasePeekHydrated(listener: () => void): () => void {
  peekHydratedListeners.add(listener);
  return () => { peekHydratedListeners.delete(listener); };
}

function notifyPeekHydrated(): void {
  for (const listener of [...peekHydratedListeners]) {
    try { listener(); } catch (error) { console.warn('[DAILY-PHRASE-PEEK] listener failed', error instanceof Error ? error.message : String(error)); }
  }
}

export async function hydrateDailyPhrasePeekFromStorage(): Promise<void> {
  const startedAt = Date.now();
  try {
    const raw = await AsyncStorage.getItem(DAILY_PHRASE_PEEK_KEY);
    if (!raw) {
      peekHydrationState = 'empty';
      console.log('[DAILY-PHRASE-PEEK] hydrate', JSON.stringify({ state: peekHydrationState, ms: Date.now() - startedAt }));
      notifyPeekHydrated();
      return;
    }
    const parsed = JSON.parse(raw) as Record<string, DailyPhrase | undefined>;
    peekStoredMap = parsed ?? null;
    const todays = parsed?.[todayKey()];
    if (todays?.english?.trim()) peekPhraseToday = todays;
    peekHydrationState = peekPhraseToday ? 'ready' : 'no_today';
    console.log('[DAILY-PHRASE-PEEK] hydrate', JSON.stringify({
      state: peekHydrationState, ms: Date.now() - startedAt, today: todayKey(), keys: Object.keys(parsed ?? {}),
    }));
    notifyPeekHydrated();
  } catch (e) {
      peekHydrationState = 'failed';
      notifyPeekHydrated();
      // best-effort: без peek sync-путь честно поднимет каталог, как раньше
      DebugLogger.error('daily_phrase_system:todays', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

/**
 * зачем (координатор 13.10, профили Сверки f0d559796: getIdiomsSync ← rememberPeekPhrases 50–60 мс в окне +5…+12 с холодного
 * старта): ради одной «завтрашней» фразы каждый запуск поднимал каталог идиом (610 КБ JS). Сегодняшняя фраза пишется сразу;
 * завтрашняя — из прошлого снимка, или сразу если каталог уже поднят, иначе отложенно (пауза + конец взаимодействий).
 */
const TOMORROW_PEEK_DEFER_MS = 10_000;
let tomorrowPeekTimer: ReturnType<typeof setTimeout> | null = null;

function tomorrowPeekDateKey(): string {
  return new Date(Date.now() + 86400000).toISOString().split('T')[0]!;
}

function writePeekMap(map: Record<string, DailyPhrase>): void {
  peekStoredMap = map;
  void AsyncStorage.setItem(DAILY_PHRASE_PEEK_KEY, JSON.stringify(map)).catch(noteSwallowedHandler('daily_phrase_system:promise_4'));
}

/** Завтрашняя локальная фраза детерминирована (dayIndex+1 по кругу каталога). Если завтра админ назначит remote — async-путь заменит. */
function computeTomorrowPeek(tomorrowDate: string): DailyPhrase | null {
  try {
    const all = getIdiomsSync();
    const tomorrowIdiom = all[(getDayIndex() + 1) % all.length];
    return tomorrowIdiom ? phraseFromIdiom(tomorrowIdiom, tomorrowDate) : null;
  } catch (e) {
    // каталог недоступен — сохраним хотя бы сегодняшнюю
    DebugLogger.error('daily_phrase_system:tomorrowDate', e instanceof Error ? e : new Error(String(e)), 'warning');
    return null;
  }
}

function rememberPeekPhrases(today: DailyPhrase): void {
  peekPhraseToday = today;
  const tomorrowDate = tomorrowPeekDateKey();
  const map: Record<string, DailyPhrase> = { [today.date]: today };
  const known = peekStoredMap?.[tomorrowDate];
  if (tomorrowPeekTimer) { clearTimeout(tomorrowPeekTimer); tomorrowPeekTimer = null; }
  if (known?.english?.trim()) {
    map[tomorrowDate] = known;
    console.log('[IDIOMS-LAZY] tomorrow source=peek — каталог не нужен', JSON.stringify({ today: today.date, tomorrow: tomorrowDate }));
    writePeekMap(map);
    return;
  }
  if (isIdiomsCatalogLoaded()) {
    const tomorrow = computeTomorrowPeek(tomorrowDate);
    if (tomorrow) map[tomorrowDate] = tomorrow;
    console.log('[IDIOMS-LAZY] tomorrow source=catalog_already_loaded', JSON.stringify({ today: today.date, tomorrow: tomorrowDate, ok: Boolean(tomorrow) }));
    writePeekMap(map);
    return;
  }
  writePeekMap(map);
  console.log('[IDIOMS-LAZY] tomorrow deferred — сегодняшняя записана, каталог позже', JSON.stringify({ today: today.date, tomorrow: tomorrowDate, delayMs: TOMORROW_PEEK_DEFER_MS }));
  tomorrowPeekTimer = setTimeout(() => {
    tomorrowPeekTimer = null;
    // InteractionManager есть всегда в приложении; в тестовой среде (частичный мок react-native) его может не быть — тогда сразу.
    const afterInteractions = (task: () => void) => (InteractionManager?.runAfterInteractions ? InteractionManager.runAfterInteractions(task) : task());
    afterInteractions(() => {
      const current = peekPhraseToday;
      if (!current) {
        console.log('[IDIOMS-LAZY] tomorrow skip reason=no_today_phrase');
        return;
      }
      const startedAt = Date.now();
      const tomorrow = computeTomorrowPeek(tomorrowDate);
      const next: Record<string, DailyPhrase> = { [current.date]: current };
      if (tomorrow) next[tomorrowDate] = tomorrow;
      console.log('[IDIOMS-LAZY] tomorrow source=deferred_load', JSON.stringify({ tomorrow: tomorrowDate, ok: Boolean(tomorrow), ms: Date.now() - startedAt }));
      writePeekMap(next);
    });
  }, TOMORROW_PEEK_DEFER_MS);
}

/** Sync phrase for first paint; matches idiomForDay() / cloud logic without I/O. */
export function getTodayPhraseSync(): DailyPhrase {
  if (peekPhraseToday && peekPhraseToday.date === todayKey()) return peekPhraseToday;
  console.log('[DAILY-PHRASE-PEEK] miss — поднимаю каталог', JSON.stringify({
    reason: peekPhraseToday ? 'date_mismatch' : 'no_peek',
    hydration: peekHydrationState,
    peekDate: peekPhraseToday?.date ?? null,
    today: todayKey(),
  }));
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
  const target = storageStudyTarget(studyTarget);
  if (target === 'es' || target === 'de' || target === 'it') {
    return targetRemoteDailyPhraseForDay(target, storageSourceLocale(sourceLocaleInput));
  }
  // зачем (Сверка 11.10: [DAILY-PHRASE-PEEK] miss hydration=pending → каталог идиом 610 КБ на первом кадре): пока
  // снимок фразы читается, отдаём «фразы пока нет» — карточка держит место той же высоты, а после чтения снимка
  // подставит фразу сама (subscribeDailyPhrasePeekHydrated). Каталог поднимается только если снимка нет совсем.
  if (peekHydrationState === 'pending' && !(peekPhraseToday && peekPhraseToday.date === todayKey())) {
    console.log('[DAILY-PHRASE-PEEK] defer — снимок ещё читается, каталог не поднимаю', JSON.stringify({ today: todayKey() }));
    return null;
  }
  return getTodayPhraseSync();
}

export const getTodayPhrase = async (): Promise<DailyPhrase> => {
  const today = todayKey();
  try {
    // зачем (смета Firebase R1, п.11): запрос daily_phrases (where+orderBy+limit 10) уходил на КАЖДОМ старте и в каждом планировании
    // пушей, хотя сегодняшняя фраза с сервера уже лежала в дневном кэше. Есть фраза на сегодня — сеть не трогаем.
    const dayCached = await readCachedRemotePhrase(today);
    if (dayCached) {
      console.log(`[DAILY-PHRASE] source=day_cache date=${today} — без сети`);
      rememberPeekPhrases(dayCached);
      return dayCached;
    }
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
  } catch (error) {
    // Немой catch запрещён: фраза дня по умолчанию — причина в журнал.
    console.warn('[DAILY-PHRASE-PEEK] getTodayPhrase failed — фраза по умолчанию', error instanceof Error ? error.message : String(error));
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
  const target = storageStudyTarget(studyTarget);
  if (target === 'es' || target === 'de' || target === 'it') {
    return getTodayTargetRemotePhrase(target, sourceLocaleInput);
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
