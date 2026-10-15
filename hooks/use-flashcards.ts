import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVerifiedPremiumAccessStatus } from '../app/premium_guard';
import {
  flashcardsSavedKey,
  storageStudyTarget,
  type RuntimeStudyTarget,
} from '../app/target_storage_keys';
import type { StudyTarget } from '../app/study_target';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from '../app/account_generation';
import { accountScopeKey } from '../app/account_scope_key';
import { captureAccountsV2OwnerUid, produceAccountsV2ChangeIfEnabled } from '../app/accounts_v2_client_flag';
import { normalizePackLanguage, PACK_LANGUAGES, type PackLanguage } from '../app/flashcards/pack_languages';
import { FREE_CUSTOM_CARD_LIMIT, PLUS_CUSTOM_CARD_LIMIT } from '../app/flashcards/custom_card_access';
import { forgetCardDeletions, recordCardDeletions } from '../app/flashcards/card_deletion_journal';
import { noteSwallowed, noteSwallowedAs } from '../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

export interface Flashcard {
  id: string;
  en: string;
  ru: string;
  uk: string;
  es?: string;
  sourceLocales?: Record<string, string | undefined>;
  transcription?: string;
  // зачем: транскрипция хранится в карточке навсегда, а генератор чинился
  // (репорт 21.09.2026 про guests → /gdʒʌːsts/). Версия движка — единственный
  // надёжный признак, что запись сделана старым генератором и её надо
  // перегенерировать: по виду строки выдумку от правды не отличить.
  transcriptionEngineVersion?: number;
  source: 'lesson' | 'word' | 'verb' | 'dialog' | 'daily_phrase' | 'video_phrase' | 'pack';
  sourceId?: string;
  sourceTitle?: string;
  addedAt: number;
  /** Account V2, 7E — освежается «Вернуть», если запись журнала удалений не снялась. */
  updatedAt?: number;
  // Rich detail fields — populated when saving from enriched sources (daily phrase, marketplace packs)
  literalRu?: string;
  literalUk?: string;
  literalEs?: string;
  explanationRu?: string;
  explanationUk?: string;
  explanationEs?: string;
  exampleEn?: string;
  exampleRu?: string;
  exampleUk?: string;
  exampleEs?: string;
  usageNoteRu?: string;
  usageNoteUk?: string;
  usageNoteEs?: string;
  register?: string;
  level?: string;
  /** Independent language contour for user/community packs; legacy cards omit it and mean English. */
  packLanguage?: PackLanguage;
  studyTarget?: StudyTarget;
}

export const FLASHCARDS_KEY = 'flashcards_v1';

/** In-memory list after first read or any save — avoids 50× AsyncStorage on vocabulary screen. */
let cardsInMemoryByScope = new Map<string, Flashcard[]>();
let loadInFlightByScope = new Map<string, {
  promise: Promise<Flashcard[]>;
  accountToken: AccountGenerationToken;
}>();

/** All read-modify-write must run one at a time, or rapid taps drop cards (last save overwrote previous). */
let writeQueueByAccount = new Map<string, {
  tail: Promise<unknown>;
  accountToken: AccountGenerationToken;
}>();
const FLASHCARD_CACHE_MAX_SCOPES = 8;
const FLASHCARD_PENDING_MAX_SCOPES = 8;

type PersistFlashcardsSkipReason =
  | 'account_not_current'
  | 'scope_unavailable'
  | 'account_changed_before_commit'
  | 'commit_not_current'
  | 'storage_write_failed';

/** Diagnostics for discarded writes; deliberately contains no card text or account identity. */
function persistFlashcardsSkip(reason: PersistFlashcardsSkipReason): void {
  console.warn(`[FLASHCARDS] persist skipped reason=${reason}`);
}

function setBoundedCache(key: string, cards: Flashcard[]): void {
  cardsInMemoryByScope.delete(key);
  cardsInMemoryByScope.set(key, cards);
  while (cardsInMemoryByScope.size > FLASHCARD_CACHE_MAX_SCOPES) {
    const oldest = cardsInMemoryByScope.keys().next().value as string | undefined;
    if (!oldest) break;
    cardsInMemoryByScope.delete(oldest);
  }
}

function accountOperationKey(token: AccountGenerationToken): string | null {
  return token.stableId ? accountScopeKey(token) : null;
}

function isAccountOperationCurrent(token: AccountGenerationToken): boolean {
  return isCurrentAccountGeneration(token);
}

function scopedTargetKey(token: AccountGenerationToken, target: StudyTarget): string | null {
  const accountKey = accountOperationKey(token);
  return accountKey ? `${accountKey}|target:${target}` : null;
}

function pruneStalePendingRegistries(): void {
  for (const [key, entry] of loadInFlightByScope) {
    if (!isAccountOperationCurrent(entry.accountToken)) loadInFlightByScope.delete(key);
  }
  for (const [key, entry] of writeQueueByAccount) {
    if (!isAccountOperationCurrent(entry.accountToken)) writeQueueByAccount.delete(key);
  }
}

function withWriteLock<T>(
  token: AccountGenerationToken,
  fn: () => Promise<T>,
  capacityFallback: T,
): Promise<T> {
  const accountKey = accountOperationKey(token);
  if (!accountKey) return Promise.resolve(capacityFallback);
  pruneStalePendingRegistries();
  const existing = writeQueueByAccount.get(accountKey);
  if (!existing && writeQueueByAccount.size >= FLASHCARD_PENDING_MAX_SCOPES) {
    return Promise.resolve(capacityFallback);
  }
  const previous = existing?.tail ?? Promise.resolve();
  const result = previous.then(() => fn());
  const tail = result.catch(noteSwallowedAs('use-flashcards:promise_1', undefined)).finally(() => {
    if (writeQueueByAccount.get(accountKey)?.tail === tail) writeQueueByAccount.delete(accountKey);
  });
  writeQueueByAccount.set(accountKey, { tail, accountToken: token });
  return result;
}

/**
 * Test-only: drop the module-level caches so a fresh AsyncStorage read happens next.
 * The in-memory caches above intentionally persist for the app lifetime; unit tests that
 * swap the AsyncStorage mock between cases must reset them so each case reads its own fixture.
 */
export function __resetFlashcardCacheForTests(): void {
  cardsInMemoryByScope = new Map();
  loadInFlightByScope = new Map();
  writeQueueByAccount = new Map();
}

function parseStored(raw: string | null): Flashcard[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((c: Flashcard) => ({ ...c, uk: c.uk || c.ru }));
  } catch {
    return [];
  }
}

function normalizeEn(en: string) {
  return en.trim().toLowerCase();
}

function hasEnInCards(en: string, cards: Flashcard[], language?: RuntimeStudyTarget) {
  const n = normalizeEn(en);
  return cards.some(c => normalizeEn(c.en) === n && normalizePackLanguage(c.packLanguage ?? c.studyTarget) === normalizePackLanguage(language));
}

const SAVED_FLASHCARD_CONTENT_REPAIRS: Record<string, Partial<Pick<Flashcard, 'ru' | 'uk' | 'es'>>> = {
  shower: {
    ru: 'Душ',
    uk: 'Душ',
    es: 'ducha',
  },
  'they cleaned their room last sunday': {
    ru: 'Они убрали свою комнату в прошлое воскресенье',
    uk: 'Вони прибрали свою кімнату минулої неділі',
    es: 'Limpiaron su habitación el domingo pasado.',
  },
  'we cleaned up rooms yesterday': {
    ru: 'Мы убрали комнаты вчера',
    uk: 'Ми прибрали кімнати вчора',
    es: 'Ayer limpiamos las habitaciones.',
  },
};

export function repairSavedFlashcardContent(card: Flashcard): Flashcard {
  const normalizedCard = card.uk ? card : { ...card, uk: card.ru };
  if (normalizePackLanguage(card.packLanguage ?? card.studyTarget) !== 'en') return normalizedCard;
  const repair = SAVED_FLASHCARD_CONTENT_REPAIRS[normalizeEn(normalizedCard.en)];
  if (!repair) return normalizedCard;
  return {
    ...normalizedCard,
    ru: repair.ru ?? normalizedCard.ru,
    uk: repair.uk ?? normalizedCard.uk,
    es: repair.es ?? normalizedCard.es,
  };
}

async function loadFlashcardsForAccount(
  studyTarget: RuntimeStudyTarget | undefined,
  accountToken: AccountGenerationToken,
): Promise<Flashcard[]> {
  const target = cacheTarget(studyTarget);
  const scopeKey = scopedTargetKey(accountToken, target);
  if (!scopeKey || !isAccountOperationCurrent(accountToken)) return [];
  const cached = cardsInMemoryByScope.get(scopeKey);
  if (cached !== undefined) {
    return cached.map(c => ({ ...repairSavedFlashcardContent(c) }));
  }
  pruneStalePendingRegistries();
  if (!loadInFlightByScope.has(scopeKey)) {
    if (loadInFlightByScope.size >= FLASHCARD_PENDING_MAX_SCOPES) return [];
    const request = (async () => {
      try {
        const raw = await AsyncStorage.getItem(flashcardsSavedKey(target));
        if (!isAccountOperationCurrent(accountToken)) return [];
        const parsed = parseStored(raw).map(card => ({ ...card, studyTarget: target, packLanguage: normalizePackLanguage(card.packLanguage ?? card.studyTarget ?? target) }));
        let dirty = false;
        const repaired = parsed.map(card => {
          const fixed = repairSavedFlashcardContent(card);
          if (fixed !== card) dirty = true;
          return fixed;
        });
        setBoundedCache(scopeKey, repaired);
        if (dirty) {
          if (!isAccountOperationCurrent(accountToken)) return [];
          const committed = await withAccountTransitionLock(async () => {
            if (!isAccountOperationCurrent(accountToken)) return false;
            await AsyncStorage.setItem(flashcardsSavedKey(target), JSON.stringify(repaired));
            return isAccountOperationCurrent(accountToken);
          });
          if (!committed) return [];
        }
        return cardsInMemoryByScope.get(scopeKey) ?? [];
      } catch {
        if (!isAccountOperationCurrent(accountToken)) return [];
        setBoundedCache(scopeKey, []);
        return [];
      } finally {
        loadInFlightByScope.delete(scopeKey);
      }
    })();
    loadInFlightByScope.set(scopeKey, { promise: request, accountToken });
  }
  const base = await loadInFlightByScope.get(scopeKey)!.promise;
  if (!isAccountOperationCurrent(accountToken)) return [];
  return base.map(c => ({ ...repairSavedFlashcardContent(c) }));
}

export function __getFlashcardPendingRegistrySizesForTests(): { loads: number; writes: number } {
  return { loads: loadInFlightByScope.size, writes: writeQueueByAccount.size };
}

export const loadFlashcards = async (studyTarget?: RuntimeStudyTarget): Promise<Flashcard[]> => {
  return loadFlashcardsForAccount(studyTarget, captureAccountGeneration());
};

/** Logical language contours over existing sync-compatible device stores. */
// зачем (аудит кнопок Карточек #1, координатор 15.10): сохранённые карточки es/de/it НЕ загружались — читались только en и fr. Теперь все пять языков наборов (PACK_LANGUAGES).
export const loadAllSavedFlashcards = async (): Promise<Flashcard[]> => {
  const token = captureAccountGeneration();
  const lists = await Promise.all(PACK_LANGUAGES.map(target => loadFlashcardsForAccount(target, token)));
  return isAccountOperationCurrent(token) ? lists.flat() : [];
};

export const peekFlashcardsCache = (studyTarget?: RuntimeStudyTarget): Flashcard[] | null => {
  const target = cacheTarget(studyTarget);
  const scopeKey = scopedTargetKey(captureAccountGeneration(), target);
  if (!scopeKey) return null;
  const cached = cardsInMemoryByScope.get(scopeKey);
  if (cached === undefined) return null;
  return cached.map(c => ({ ...repairSavedFlashcardContent(c) }));
};

async function persistFlashcards(
  cards: Flashcard[],
  studyTarget: RuntimeStudyTarget | undefined,
  accountToken: AccountGenerationToken,
): Promise<boolean> {
  const target = cacheTarget(studyTarget);
  const snapshot = cards.map(c => ({ ...c }));
  // зачем (6F ремонт №1, P2): владелец V2-операции — аккаунт в момент записи, не в момент постановки.
  const v2Owner = captureAccountsV2OwnerUid();
  if (!isAccountOperationCurrent(accountToken)) {
    persistFlashcardsSkip('account_not_current');
    return false;
  }
  const scopeKey = scopedTargetKey(accountToken, target);
  if (!scopeKey) {
    persistFlashcardsSkip('scope_unavailable');
    return false;
  }
  try {
    if (!isAccountOperationCurrent(accountToken)) {
      persistFlashcardsSkip('account_changed_before_commit');
      return false;
    }
    const committed = await withAccountTransitionLock(async () => {
      if (!isAccountOperationCurrent(accountToken)) {
        persistFlashcardsSkip('account_changed_before_commit');
        return false;
      }
      await AsyncStorage.setItem(flashcardsSavedKey(target), JSON.stringify(snapshot));
      return isAccountOperationCurrent(accountToken);
    });
    if (!committed) {
      persistFlashcardsSkip('commit_not_current');
      return false;
    }
    setBoundedCache(scopeKey, snapshot);
    // зачем (Account V2, 6F, dual-write): снимок сохранённых карточек → операции V2
    // (добавление/правка/удаление — разницей с зеркалом области). Фоном, за флагом.
    produceAccountsV2ChangeIfEnabled(v2Owner, () => ({ kind: 'card_snapshot', target, list: 'saved', cards: snapshot }));
    return true;
  } catch {
    persistFlashcardsSkip('storage_write_failed');
    return false;
  }
}

export const saveFlashcards = async (
  cards: Flashcard[],
  studyTarget?: RuntimeStudyTarget,
): Promise<void> => {
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) return;
  await withWriteLock(accountToken, () => persistFlashcards(cards, studyTarget, accountToken), false);
};

/**
 * Repair cards saved before video channels started forwarding their language.
 * `sourceId` starts with the immutable YouTube video id, so a channel that owns
 * that video can safely restore the missing logical language contour.
 */
export const alignSavedVideoFlashcardsWithChannel = async (input: {
  videoId: string;
  packLanguage: PackLanguage;
  sourceTitle?: string;
}): Promise<number> => {
  const videoId = input.videoId.trim();
  if (!videoId) return 0;
  const language = normalizePackLanguage(input.packLanguage);
  const sourceTitle = input.sourceTitle?.trim() || undefined;
  const sourcePrefix = `${videoId}:`;
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) return 0;

  return withWriteLock(accountToken, async () => {
    let changedCount = 0;
    for (const target of PACK_LANGUAGES) { // зачем (аудит #1): все пять языков, а не только en и fr
      const current = await loadFlashcardsForAccount(target, accountToken);
      if (!isAccountOperationCurrent(accountToken)) return 0;
      const next = current.map((card) => {
        if (card.source !== 'video_phrase' || !card.sourceId?.startsWith(sourcePrefix)) return card;
        const titleChanged = !!sourceTitle && card.sourceTitle !== sourceTitle;
        if (normalizePackLanguage(card.packLanguage ?? card.studyTarget) === language && !titleChanged) return card;
        changedCount += 1;
        return {
          ...card,
          packLanguage: language,
          ...(sourceTitle ? { sourceTitle } : {}),
        };
      });
      if (JSON.stringify(next) !== JSON.stringify(current)) {
        const committed = await persistFlashcards(next, target, accountToken);
        if (!committed) throw new Error('Could not align saved video cards with their channel');
      }
    }
    return changedCount;
  }, 0);
};

/** Merge enrichment only into cards that still exist; a delayed migration cannot undo a deletion. */
export const mergeSavedFlashcardRepairs = async (updates: Flashcard[], accountToken: AccountGenerationToken): Promise<void> => {
  await withWriteLock(accountToken, async () => {
    for (const target of PACK_LANGUAGES) { // зачем (аудит #1): все пять языков, а не только en и fr
      const current = await loadFlashcardsForAccount(target, accountToken);
      if (!isAccountOperationCurrent(accountToken)) return;
      const byId = new Map(updates.filter(card => card.studyTarget === target).map(card => [card.id, card]));
      const next = current.map(card => {
        const update = byId.get(card.id);
        // зачем: версию движка транскрипции переносим вместе с самой
        // транскрипцией. Без неё карточка осталась бы «старой» навсегда и
        // миграция перезаписывала бы её при КАЖДОМ заходе на экран —
        // бесконечные записи в Firestore на ровном месте.
        return update
          ? {
              ...card,
              uk: update.uk,
              transcription: update.transcription,
              transcriptionEngineVersion: update.transcriptionEngineVersion,
            }
          : card;
      });
      if (JSON.stringify(next) !== JSON.stringify(current) && !await persistFlashcards(next, target, accountToken)) throw new Error('Could not enrich saved cards');
    }
  }, undefined);
};

/**
 * Account V2, Пакет 6G — гидрация: сохранённые карточки из своей учётки V2.
 * зачем: новая установка / новый телефон получает карточки, которых на телефоне
 * нет. Правило «не затирать локальное»: существующую карточку (тот же id ИЛИ та
 * же фраза в том же языке) НЕ трогаем — добавляем лишь недостающее. Лимит
 * бесплатных карточек не режет восстановление (это уже сохранённые карточки
 * человека). Возвращает число добавленных; -1 — аккаунт сменился / запись не прошла.
 */
export const mergeSavedFlashcardsFromAccountsV2 = async (
  target: StudyTarget,
  incoming: readonly Flashcard[],
): Promise<number> => {
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) {
    console.warn('[ACCOUNT-V2] hydrate saved_cards skip reason=account_not_current');
    return -1;
  }
  return withWriteLock(accountToken, async () => {
    const current = await loadFlashcardsForAccount(target, accountToken);
    if (!isAccountOperationCurrent(accountToken)) return -1;
    const ids = new Set(current.map((card) => card.id));
    const additions: Flashcard[] = [];
    for (const card of incoming) {
      if (ids.has(card.id) || hasEnInCards(card.en, [...current, ...additions], target)) continue;
      additions.push({ ...card, studyTarget: target, packLanguage: normalizePackLanguage(card.packLanguage ?? target) });
      ids.add(card.id);
    }
    if (additions.length === 0) return 0;
    const committed = await persistFlashcards([...current, ...additions], target, accountToken);
    if (!committed) console.warn(`[ACCOUNT-V2] hydrate saved_cards persist_failed count=${additions.length}`);
    return committed ? additions.length : -1;
  }, -1);
};

/**
 * Account V2, Пакет 7D — гидрация: убрать «воскресшие» сохранённые карточки.
 * зачем: карточка, удалённая на другом устройстве (tombstone V2) или здесь же
 * (журнал удалений), но возвращённая старым restore/переносом, иначе жила бы
 * вечно. Решение «убрать/оставить» принимает вызывающий (`decide`) по СВЕЖЕЙ
 * карточке внутри очереди записи — удаление побеждает только если оно свежее
 * локальной правки. Возвращает число убранных; -1 — аккаунт сменился / запись не прошла.
 * Журнал удалений НЕ пишется: это не действие человека, а применение уже известного удаления.
 */
export const removeSavedFlashcardsFromAccountsV2 = async (
  target: StudyTarget,
  decide: (card: Readonly<Flashcard>) => boolean,
): Promise<number> => {
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) {
    console.warn('[ACCOUNT-V2] hydrate saved_cards_remove skip reason=account_not_current');
    return -1;
  }
  return withWriteLock(accountToken, async () => {
    const current = await loadFlashcardsForAccount(target, accountToken);
    if (!isAccountOperationCurrent(accountToken)) return -1;
    const next = current.filter((card) => !decide(card));
    if (next.length === current.length) return 0;
    const committed = await persistFlashcards(next, target, accountToken);
    if (!committed) console.warn(`[ACCOUNT-V2] hydrate saved_cards_remove persist_failed count=${current.length - next.length}`);
    return committed ? current.length - next.length : -1;
  }, -1);
};

/**
 * Account V2, Пакет 8E — гидрация: применить более свежую серверную версию к уже
 * лежащим на телефоне сохранённым карточкам. `replace` получает СВЕЖУЮ карточку внутри
 * очереди записи и возвращает замену или null (оставить: например, человек успел её
 * изменить после решения). Возвращает число заменённых; -1 — аккаунт сменился / запись не прошла.
 */
export const replaceSavedFlashcardsFromAccountsV2 = async (
  target: StudyTarget,
  replace: (card: Readonly<Flashcard>) => Flashcard | null,
): Promise<number> => {
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) {
    console.warn('[ACCOUNT-V2] hydrate saved_cards_replace skip reason=account_not_current');
    return -1;
  }
  return withWriteLock(accountToken, async () => {
    const current = await loadFlashcardsForAccount(target, accountToken);
    if (!isAccountOperationCurrent(accountToken)) return -1;
    let replaced = 0;
    const next = current.map((card) => {
      const replacement = replace(card);
      if (replacement === null) return card;
      replaced += 1;
      return { ...replacement, studyTarget: target, packLanguage: normalizePackLanguage(replacement.packLanguage ?? target) };
    });
    if (replaced === 0) return 0;
    const committed = await persistFlashcards(next, target, accountToken);
    if (!committed) console.warn(`[ACCOUNT-V2] hydrate saved_cards_replace persist_failed count=${replaced}`);
    return committed ? replaced : -1;
  }, -1);
};

export const FREE_FLASHCARD_LIMIT = FREE_CUSTOM_CARD_LIMIT;

export type AddFlashcardResult = 'added' | 'duplicate' | 'limit_reached' | 'stale';

function cacheTarget(studyTarget?: RuntimeStudyTarget): StudyTarget {
  return storageStudyTarget(studyTarget);
}

// зачем (аудит «пропала сеть», Авторизация 13.10): проверка Plus стояла ВНУТРИ замка записи и для Free без свежего кэша шла до облака (premium_guard → restoreFromCloud без потолка) —
// на плохой сети сохранение и все другие записи карточек висели до ответа облака. Теперь: без облачного обновления (решает локальная лиза/кэш) и потолок 5 с;
// при потолке считаем по лимиту Free, причина — в журнале [FLASHCARDS-SAVE].
const PREMIUM_CHECK_CEILING_MS = 5_000;
async function premiumForSave(): Promise<boolean> {
  const startedAt = Date.now();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<'timeout'>((resolve) => { timer = setTimeout(() => resolve('timeout'), PREMIUM_CHECK_CEILING_MS); });
  try {
    const result = await Promise.race([getVerifiedPremiumAccessStatus({ allowCloudRefresh: false }), timeout]);
    if (result === 'timeout') {
      console.warn(`[FLASHCARDS-SAVE] проверка Plus внутри замка записи не ответила за ${PREMIUM_CHECK_CEILING_MS} мс — считаем по лимиту Free`);
      return false;
    }
    const ms = Date.now() - startedAt;
    if (ms > 1500) console.warn(`[FLASHCARDS-SAVE] проверка Plus внутри замка записи заняла ${ms} мс (решение: ${String(result)})`);
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const addFlashcard = async (
  card: Omit<Flashcard, 'id' | 'addedAt'>,
  studyTarget?: RuntimeStudyTarget,
): Promise<AddFlashcardResult> => {
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) return 'stale';
  return withWriteLock<AddFlashcardResult>(accountToken, async () => {
    const language = normalizePackLanguage(card.packLanguage ?? studyTarget);
    const target = cacheTarget(language);
    const cards = await loadFlashcardsForAccount(target, accountToken);
    if (!isAccountOperationCurrent(accountToken)) return 'stale';
    const normalizedEn = card.en.trim().toLowerCase();
    const duplicate = hasEnInCards(normalizedEn, cards, language);
    if (duplicate) return 'duplicate';

    // «Пульт»: если карточки переведены в «Фри» — лимит снят, замок не показываем.
    const isPremium = await premiumForSave();
    if (!isAccountOperationCurrent(accountToken)) return 'stale';
    const maxCards = isPremium ? PLUS_CUSTOM_CARD_LIMIT : FREE_FLASHCARD_LIMIT;
    if (cards.length >= maxCards) {
      return 'limit_reached';
    }

    const id = `${language}_${card.source}_${normalizedEn.replace(/\s+/g, '_').slice(0, 40)}_${Date.now()}`;
    const newCard: Flashcard = { ...card, id, addedAt: Date.now(), studyTarget: target, packLanguage: language };
    const committed = await persistFlashcards([...cards, newCard], target, accountToken);
    return committed ? 'added' : 'stale';
  }, 'stale');
};

export const removeFlashcard = async (id: string, studyTarget?: RuntimeStudyTarget): Promise<void> => {
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) return;
  return withWriteLock(accountToken, async () => {
    const target = cacheTarget(studyTarget);
    const cards = await loadFlashcardsForAccount(target, accountToken);
    if (!isAccountOperationCurrent(accountToken)) return;
    const had = cards.some(c => c.id === id);
    const committed = await persistFlashcards(cards.filter(c => c.id !== id), target, accountToken);
    // зачем (Account V2, 7D): факт явного удаления — в журнал, чтобы перенос/restore/гидрация
    // не вернули карточку. Только после успешной записи; фоном (UI не ждёт).
    if (committed && had) void recordCardDeletions(target, 'saved', [id]);
  }, undefined);
};

/**
 * cards-2.0 (E7): удаление со снапшотом — для undo-снекбара.
 * Возвращает удалённую карточку и её индекс (для восстановления на место)
 * или null, если карточки уже нет.
 */
export const removeFlashcardWithSnapshot = async (
  id: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<{ card: Flashcard; index: number } | null> => {
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) return null;
  return withWriteLock<{ card: Flashcard; index: number } | null>(accountToken, async () => {
    const target = cacheTarget(studyTarget);
    const cards = await loadFlashcardsForAccount(target, accountToken);
    if (!isAccountOperationCurrent(accountToken)) return null;
    const index = cards.findIndex(c => c.id === id);
    if (index < 0) return null;
    const card = cards[index];
    const next = [...cards];
    next.splice(index, 1);
    if (!await persistFlashcards(next, target, accountToken)) throw new Error('Could not delete saved card');
    // зачем (Account V2, 7D): явное удаление → журнал (см. removeFlashcard).
    void recordCardDeletions(target, 'saved', [id]);
    return { card: { ...card, studyTarget: target }, index };
  }, null);
};

/**
 * cards-2.0 (E7): undo удаления — вернуть карточку на прежнее место.
 * Идемпотентно: если id уже есть (двойной тап «Вернуть»), ничего не делает.
 * Лимит-20 намеренно НЕ проверяется: restore возвращает то, что юзер уже имел.
 */
export const restoreFlashcard = async (
  card: Flashcard,
  index?: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> => {
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) return;
  return withWriteLock(accountToken, async () => {
    const target = cacheTarget(studyTarget ?? card.studyTarget ?? card.packLanguage);
    const cards = await loadFlashcardsForAccount(target, accountToken);
    if (!isAccountOperationCurrent(accountToken)) return;
    if (cards.some(c => c.id === card.id)) {
      // зачем (7E): карточка уже на месте (двойной тап «Вернуть», гонка с restore) —
      // запись журнала всё равно снимаем, иначе гидрация убрала бы её как удалённую.
      forgetRestoredSavedCardDeletion(card.id, target, accountToken);
      return;
    }
    const next = [...cards];
    const at = index == null ? next.length : Math.max(0, Math.min(index, next.length));
    next.splice(at, 0, card);
    if (!await persistFlashcards(next, target, accountToken)) throw new Error('Could not restore saved card');
    // зачем (Account V2, 7D): «Вернуть» отменяет удаление — запись журнала снимаем,
    // иначе гидрация убрала бы возвращённую карточку как удалённую.
    forgetRestoredSavedCardDeletion(card.id, target, accountToken);
  }, undefined);
};

/**
 * 7E: снять запись журнала после «Вернуть»; не снялась — освежить время правки
 * карточки (updatedAt), чтобы гидрация сочла её правку свежее удаления и не убрала.
 * Фоном: «Вернуть» не ждёт хранилище журнала (мгновенный отклик экрана).
 */
function forgetRestoredSavedCardDeletion(id: string, target: StudyTarget, accountToken: AccountGenerationToken): void {
  void forgetCardDeletions(target, 'saved', [id]).then((forgotten) => {
    if (forgotten) return undefined;
    if (!isAccountOperationCurrent(accountToken)) {
      console.warn('[ACCOUNT-V2] journal restore_touch_skip reason=account_changed list=saved');
      return undefined;
    }
    console.warn('[ACCOUNT-V2] journal restore_forget_failed -> touch list=saved');
    return withWriteLock(accountToken, async () => {
      const cards = await loadFlashcardsForAccount(target, accountToken);
      if (!isAccountOperationCurrent(accountToken) || !cards.some(c => c.id === id)) {
        console.warn('[ACCOUNT-V2] journal restore_touch_skip reason=card_absent_or_account_changed list=saved');
        return;
      }
      const now = Date.now();
      const touched = await persistFlashcards(cards.map(c => (c.id === id ? { ...c, updatedAt: now } : c)), target, accountToken);
      if (!touched) console.warn('[ACCOUNT-V2] journal restore_touch_failed list=saved');
    }, undefined);
  }).catch((error: unknown) => {
    console.warn(`[ACCOUNT-V2] journal restore_touch_failed kind=${error instanceof Error ? error.name : typeof error} list=saved`);
  });
}

export const removeFlashcardByEnglish = async (
  en: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> => {
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) return false;
  return withWriteLock(accountToken, async () => {
    const target = cacheTarget(studyTarget);
    const cards = await loadFlashcardsForAccount(target, accountToken);
    if (!isAccountOperationCurrent(accountToken)) return false;
    const normalizedEn = en.trim().toLowerCase();
    const card = cards.find(c => c.en.trim().toLowerCase() === normalizedEn && normalizePackLanguage(c.packLanguage ?? c.studyTarget) === normalizePackLanguage(studyTarget));
    if (!card) return false;
    const committed = await persistFlashcards(cards.filter(c => c.id !== card.id), target, accountToken);
    // зачем (Account V2, 7D): явное удаление → журнал (см. removeFlashcard).
    if (committed) void recordCardDeletions(target, 'saved', [card.id]);
    return committed;
  }, false);
};

/** Sync — only correct after the cache is loaded. Before load, returns false. */
export const isEnSavedInCacheSync = (en: string, studyTarget?: RuntimeStudyTarget): boolean => {
  const target = cacheTarget(studyTarget);
  const scopeKey = scopedTargetKey(captureAccountGeneration(), target);
  if (!scopeKey) return false;
  const cached = cardsInMemoryByScope.get(scopeKey);
  if (cached === undefined) return false;
  return hasEnInCards(en, cached, studyTarget);
};

export const isFlashcardSaved = async (
  en: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> => {
  const target = cacheTarget(studyTarget);
  const scopeKey = scopedTargetKey(captureAccountGeneration(), target);
  if (!scopeKey) return false;
  const cached = cardsInMemoryByScope.get(scopeKey);
  if (cached !== undefined) {
    return hasEnInCards(en, cached, studyTarget);
  }
  const cards = await loadFlashcards(target);
  return hasEnInCards(en, cards, studyTarget);
};

export const clearAllFlashcards = async (studyTarget?: RuntimeStudyTarget): Promise<void> => {
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) return;
  return withWriteLock(accountToken, async () => {
    const target = cacheTarget(studyTarget);
    if (!isAccountOperationCurrent(accountToken)) return;
    const scopeKey = scopedTargetKey(accountToken, target);
    if (!scopeKey) return;
    setBoundedCache(scopeKey, []);
    try {
      await withAccountTransitionLock(async () => {
        if (!isAccountOperationCurrent(accountToken)) return;
        await AsyncStorage.removeItem(flashcardsSavedKey(target));
      });
    } catch (swallowedError) {
      // fail-soft
      noteSwallowed('use-flashcards:catch_1', swallowedError);
}
  }, undefined);
};
