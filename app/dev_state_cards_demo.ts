/**
 * DEV-фикстура «наполненный аккаунт Карточек» — phraseman://dev_state?cards=demo.
 *
 * зачем (координатор 11.10, съёмка Карточек 2.0): кадры docs/design/v2-app/cards-v2.html нарисованы на наполненном
 * аккаунте, а гость пустой — почти каждый кадр давал «расхождение по данным». Фикстура кладёт те же значения:
 *   64 сохранённые карточки (слова макета), 4 своих набора (Путешествия 40 · A2 «На проверке», B2 глаголы 49,
 *   Работа 22 · B1, Фразовые глаголы 31 · B1), «Продолжить» Путешествия · 12 из 40, 5 роликов «Из видео»
 *   с длительностью, 5 наборов сообщества (Лучшее у сообщества).
 * Только устройство: сама в Firestore не пишет (кэши каталога и роликов засеваются как свежие, сеть 6 ч не нужна).
 * ⚠️ Обычная фоновая синхронизация может скопировать сохранённые карточки в облачную копию ЭТОГО тестового аккаунта —
 * запускать на тестовом госте. Только dev: вызывается из dev_state_fixtures (вырезан из стор-сборки).
 * Логи: [DEV-STATE] cards.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Flashcard } from '../hooks/use-flashcards';
import type { CardItem } from './flashcards/types';
import { IS_STORE_RELEASE } from './config';
import type { FlashcardMarketPack } from './flashcards/marketplace';
import type { CommunityPackCardPayload } from './community_packs/schema';
import type { PackLevel } from './flashcards/pack_deck_meta';

const TARGET = 'en' as const;
const NOW_BASE = Date.UTC(2026, 9, 1);

/** Слова кадра «Сохранённые» (W в макете), по порядку. */
const MOCK_SAVED: readonly (readonly [string, string])[] = [
  ['Layover', 'пересадка'], ['Gate', 'выход на посадку'], ['Delay', 'задержка'], ['Visa', 'виза'], ['Luggage', 'багаж'],
  ['Boarding', 'посадка'], ['Check in', 'регистрация'], ['Customs', 'таможня'], ['Fare', 'стоимость проезда'], ['Aisle', 'проход'],
  ['Receipt', 'чек'], ['Refund', 'возврат денег'], ['Booking', 'бронь'], ['Convince', 'убеждать'], ['Claim', 'утверждать'],
  ['Afford', 'позволить себе'], ['Borrow', 'занимать'], ['Deserve', 'заслуживать'], ['Avoid', 'избегать'], ['Admit', 'признавать'],
  ['Achieve', 'достигать'], ['Expect', 'ожидать'], ['Improve', 'улучшать'], ['Mention', 'упоминать'], ['Suggest', 'предлагать'],
  ['Explain', 'объяснять'], ['Remind', 'напоминать'], ['Refuse', 'отказываться'], ['Rely on', 'полагаться'], ['Figure out', 'разобраться'],
  ['Give up', 'сдаваться'], ['Look after', 'присматривать'], ['Run out', 'закончиться'], ['Set off', 'отправиться'], ['Turn down', 'отклонить'],
  ['Bring up', 'поднять тему'], ['Catch up', 'наверстать'], ['Put off', 'откладывать'], ['Lay', 'класть'], ['Pitch in', 'вложиться'],
  // До 64 — слова наборов «Работа» и «Небольшой разговор» из того же макета.
  ['Follow up', 'уточнить позже'], ['Deadline', 'срок'], ['Meeting', 'встреча'], ['Schedule', 'расписание'], ['Invoice', 'счёт'],
  ['Colleague', 'коллега'], ['Promotion', 'повышение'], ['Salary', 'зарплата'], ['Resign', 'уволиться'], ['Hire', 'нанять'],
  ['Task', 'задача'], ['Report', 'отчёт'], ['Budget', 'бюджет'], ['Feedback', 'отзыв'], ['Remote', 'удалённо'],
  ['How come', 'как так'], ['No way', 'не может быть'], ['Fair enough', 'справедливо'], ['Never mind', 'неважно'], ['My bad', 'моя ошибка'],
  ['Sounds good', 'звучит хорошо'], ['Take care', 'береги себя'], ['Hang on', 'подожди'], ['Mother', 'мама'],
];

/**
 * Источники сохранённых карточек для кадров фильтра («Уроки» → Урок 1/3/12, «Прочее» → Глаголы, Диалоги, Слова, Фраза дня, Фразы из видео).
 * Раньше все 64 были «Слова» — группы фильтра не появлялись (cards-gap-023/024). Применяется только при cards=demo_lessons.
 */
export function demoCardSource(index: number): Readonly<{ source: Flashcard['source']; sourceId?: string }> {
  if (index < 4) return { source: 'lesson', sourceId: '1' };
  if (index < 8) return { source: 'lesson', sourceId: '3' };
  if (index < 12) return { source: 'lesson', sourceId: '12' };
  if (index < 18) return { source: 'verb' };
  if (index < 24) return { source: 'dialog' };
  if (index < 28) return { source: 'daily_phrase' };
  if (index < 32) return { source: 'video_phrase', sourceId: `devDemoVid0:${index}` };
  return { source: 'word' };
}

export function demoSavedFlashcards(lessons = false): Flashcard[] {
  return MOCK_SAVED.slice(0, 64).map(([en, ru], i) => ({
    id: `dev_demo_saved_${String(i + 1).padStart(2, '0')}`,
    en,
    ru,
    uk: ru,
    ...(lessons ? demoCardSource(i) : { source: 'word' as const }),
    // Новее — выше: порядок кадра «Сохранённые» (Layover первым).
    addedAt: NOW_BASE + (64 - i) * 60_000,
    packLanguage: 'en',
    studyTarget: TARGET,
  }));
}

type DemoOwnPack = Readonly<{ packId: string; title: string; count: number; level?: PackLevel; words: readonly string[]; pending?: boolean }>;

export const DEMO_TRAVEL_PACK_ID = 'local_pack_dev_demo_travel';

export const DEMO_OWN_PACKS: readonly DemoOwnPack[] = [
  { packId: DEMO_TRAVEL_PACK_ID, title: 'Путешествия', count: 40, level: 'A2', words: ['Layover', 'Gate', 'Customs'], pending: true },
  { packId: 'local_pack_dev_demo_b2', title: 'B2 глаголы', count: 49, level: 'B2', words: ['Convince', 'Claim', 'Afford'] },
  { packId: 'local_pack_dev_demo_work', title: 'Работа', count: 22, level: 'B1', words: ['Follow up', 'Deadline', 'Refund'] },
  { packId: 'local_pack_dev_demo_phrasal', title: 'Фразовые глаголы', count: 31, level: 'B1', words: ['Give up', 'Run out', 'Set off'] },
];

/** Карточки набора: сперва слова колоды макета, затем слова сохранённых по кругу — до нужного числа. */
export function demoPackCards(pack: DemoOwnPack): CommunityPackCardPayload[] {
  const byEn = new Map(MOCK_SAVED.map(([en, ru]) => [en, ru]));
  const head = pack.words.map((en) => [en, byEn.get(en) ?? en] as const);
  const rest = MOCK_SAVED.filter(([en]) => !pack.words.includes(en));
  const rows = [...head, ...rest].slice(0, pack.count);
  return rows.map(([en, ru], i) => ({ id: `c${i + 1}`, en, ru, uk: ru }));
}

/** Ролики кадра «Из видео»: название, длительность, число фраз. */
export const DEMO_VIDEOS: readonly (readonly [string, string, number])[] = [
  ['Заказ в кафе', '4:12', 18], ['Собеседование', '7:38', 24], ['В аэропорту', '5:05', 21], ['Первое свидание', '6:20', 16], ['Сериал: офис', '3:47', 12],
];

function durationToSec(mmss: string): number {
  const [m, s] = mmss.split(':').map(Number);
  return (m || 0) * 60 + (s || 0);
}

function demoTitles(title: string) {
  return {
    codeName: title, titleRu: title, titleUk: title, titleEs: title,
    titlePtBr: title, titleVi: title, titleId: title, titleTr: title, titlePl: title,
    descriptionRu: '', descriptionUk: '', descriptionEs: '',
  };
}

export function demoVideoPacks(): FlashcardMarketPack[] {
  return DEMO_VIDEOS.map(([title, duration, phrases], i) => {
    const videoId = `devDemoVid${i}`; // 11 символов — формат id YouTube
    return {
      id: `video:${videoId}`,
      ...demoTitles(title),
      category: 'daily',
      cardCount: phrases,
      priceShards: 0,
      salesCount: 0,
      authorName: '',
      isOfficial: true,
      packLanguage: 'en',
      listingStatus: 'published',
      videoId,
      videoTitle: title,
      videoDurationSec: durationToSec(duration),
      updatedAt: new Date(NOW_BASE - i * 86_400_000).toISOString(),
    } as FlashcardMarketPack;
  });
}

/** Наборы кадра «Лучшее у сообщества»: название, автор, карточек, уровень, лайки, первое слово. */
export const DEMO_COMMUNITY: readonly (readonly [string, string, number, PackLevel, number, string])[] = [
  ['Family', 'Лидия', 20, 'A1', 4, 'Mother'], ['B2 глаголы', 'Ирина', 49, 'B2', 3, 'Convince'], ['Антоніми дієслів', 'Natalia', 30, 'B1', 1, 'Arrive'],
  ['Small talk', 'Олег', 26, 'A2', 7, 'How come'], ['Офис и созвоны', 'Мария', 34, 'B1', 5, 'Follow up'],
];

export function demoCommunityPacks(): FlashcardMarketPack[] {
  return DEMO_COMMUNITY.map(([title, author, count, level, likes, word], i) => ({
    id: `dev_demo_community_${i + 1}`,
    ...demoTitles(title),
    category: 'daily',
    cardCount: count,
    priceShards: 0,
    salesCount: 0,
    likesCount: likes,
    authorName: author,
    isOfficial: false,
    isCommunityUgc: true,
    packLanguage: 'en',
    listingStatus: 'published',
    level,
    previewWords: [word],
    updatedAt: new Date(NOW_BASE - i * 3_600_000).toISOString(),
  } as FlashcardMarketPack));
}

export type CardsDemoResult = Readonly<{ applied: Record<string, string>; skipped: Record<string, string> }>;

// ───────────────────────── новые переключатели (координатор 12.10) ─────────────────────────
// Всё ниже — только локальные ключи устройства; в Firestore фикстура не пишет. Вызывается из applyDevState, но сама тоже проверяет сборку.
function assertDevBuild(what: string): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__ || IS_STORE_RELEASE) {
    console.warn('[DEV-STATE]', what, 'отклонено: не dev-сборка'); // guard-ok: ранний выход логируется
    throw new Error('dev_state: not a dev build');
  }
}

export const DEMO_CUSTOM_COUNT = 50;

/** 50 своих карточек — лимит Free (cards-v2-046): categoryId 'custom', не системные. */
export function demoCustomCards(count: number = DEMO_CUSTOM_COUNT): CardItem[] {
  return MOCK_SAVED.slice(0, count).map(([en, ru], i) => ({
    id: `dev_demo_custom_${String(i + 1).padStart(2, '0')}`,
    en,
    ru,
    uk: ru,
    categoryId: 'custom',
    isSystem: false,
    addedAt: NOW_BASE + (count - i) * 60_000,
    studyTarget: TARGET,
  } as CardItem));
}

export async function applyCustomCards(count: number = DEMO_CUSTOM_COUNT): Promise<string> {
  assertDevBuild('cards=custom50');
  const { updateCustomCards } = await import('./flashcards/custom_cards_store');
  const cards = demoCustomCards(count);
  await updateCustomCards(() => cards, TARGET);
  console.log('[DEV-STATE] custom cards', JSON.stringify({ count: cards.length })); // guard-ok: единичный лог на ссылку
  return String(cards.length);
}

/** Каталог сообщества в локальном кэше: пустой (cards-048, «Здесь появятся наборы после публикации.») или демо-наборы. */
export async function applyCatalog(kind: 'empty' | 'demo'): Promise<string> {
  assertDevBuild(`catalog=${kind}`);
  const { seedCommunityCatalogForDev } = await import('./community_packs/communityFirestore');
  const packs = kind === 'empty' ? [] : demoCommunityPacks();
  if (!seedCommunityCatalogForDev(TARGET, packs)) throw new Error('seed_refused');
  console.log('[DEV-STATE] catalog', JSON.stringify({ kind, packs: packs.length })); // guard-ok: единичный лог на ссылку
  return `${kind}:${packs.length}`;
}

export const TRAINING_LIMIT_DEV = 30;

/** Запись счётчика «30 тренировок в месяц» в формате app/monthly_training_sessions.ts (version 1, period, starts). Чистая функция. */
export function trainingQuotaRecord(period: string, used: number): Readonly<{ version: 1; period: string; starts: readonly string[] }> {
  const n = Math.max(0, Math.min(TRAINING_LIMIT_DEV, Math.floor(used)));
  return { version: 1, period, starts: Array.from({ length: n }, (_, i) => `dev_demo_start_${String(i + 1).padStart(2, '0')}`) };
}

/** quota=N (использовано N из 30) | exhausted (30) | reset (счётчик стёрт). Только локальный ключ training_sessions:v1:<stableId>. */
export async function applyTrainingQuota(stableId: string, mode: number | 'exhausted' | 'reset'): Promise<string> {
  assertDevBuild(`quota=${String(mode)}`);
  const { MONTHLY_TRAINING_SESSION_STORAGE_PREFIX, resolveMonthlyTrainingSessionWindow } = await import('./monthly_training_sessions');
  const key = `${MONTHLY_TRAINING_SESSION_STORAGE_PREFIX}${encodeURIComponent(stableId)}`;
  if (mode === 'reset') {
    await AsyncStorage.removeItem(key);
    console.log('[DEV-STATE] training quota reset', JSON.stringify({ key })); // guard-ok: единичный лог на ссылку
    return 'reset';
  }
  const used = mode === 'exhausted' ? TRAINING_LIMIT_DEV : mode;
  const window = resolveMonthlyTrainingSessionWindow(Date.now(), Intl.DateTimeFormat().resolvedOptions().timeZone);
  await AsyncStorage.setItem(key, JSON.stringify(trainingQuotaRecord(window.period, used)));
  console.log('[DEV-STATE] training quota', JSON.stringify({ key, period: window.period, used })); // guard-ok: единичный лог на ссылку
  return `${used}/${TRAINING_LIMIT_DEV}`;
}

/** Первое число следующего месяца 00:00 UTC — формат resetAtMs зеркала лимита реплик диалогов (проверяется isUtcCalendarMonthBoundary). */
export function nextUtcMonthStartMs(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0);
}

/** Зеркало месячного лимита реплик AI-диалогов (app/ai_dialog_daily_quota.ts, schemaVersion 3). Чистая функция. */
export function dialogQuotaMirror(remaining: number, nowMs: number): Readonly<Record<string, unknown>> {
  const left = Math.max(0, Math.min(TRAINING_LIMIT_DEV, Math.floor(remaining)));
  return {
    schemaVersion: 3,
    quotaPeriod: 'calendar_month',
    remaining: left,
    limit: TRAINING_LIMIT_DEV,
    resetAtMs: nextUtcMonthStartMs(nowMs),
    quotaVersion: nowMs, // новее любого серверного наблюдения, чтобы запись не отбросили как устаревшую
    updatedAtMs: nowMs,
  };
}

/** dquota=N (осталось N реплик из 30; 0 — «На этот месяц всё») | reset. Только локальный ключ ai_dialog_monthly_quota:v3:<stableId>. */
export async function applyDialogQuota(stableId: string, remaining: number | 'reset'): Promise<string> {
  assertDevBuild(`dquota=${String(remaining)}`);
  const { aiDialogMonthlyQuotaStorageKey } = await import('./ai_dialog_daily_quota');
  const key = aiDialogMonthlyQuotaStorageKey(TARGET, stableId);
  if (!key) throw new Error('quota_key_unavailable');
  if (remaining === 'reset') {
    await AsyncStorage.removeItem(key);
    console.log('[DEV-STATE] dialog quota reset', JSON.stringify({ key })); // guard-ok: единичный лог на ссылку
    return 'reset';
  }
  await AsyncStorage.setItem(key, JSON.stringify(dialogQuotaMirror(remaining, Date.now())));
  console.log('[DEV-STATE] dialog quota', JSON.stringify({ key, remaining })); // guard-ok: единичный лог на ссылку
  return `${remaining}/${TRAINING_LIMIT_DEV}`;
}

/** Выставить наполненный аккаунт. Каждый шаг независим: сбой одного не мешает остальным и пишет причину. */
export async function applyCardsDemo(options: Readonly<{ lessons?: boolean }> = {}): Promise<CardsDemoResult> {
  const applied: Record<string, string> = {};
  const skipped: Record<string, string> = {};
  const step = async (key: string, run: () => Promise<string>) => {
    try {
      applied[key] = await run();
    } catch (error) {
      skipped[key] = error instanceof Error ? error.message : String(error);
      console.warn('[DEV-STATE] cards step failed', key, skipped[key]); // guard-ok: сбой шага виден в логе
    }
  };

  await step('saved', async () => {
    const { saveFlashcards } = await import('../hooks/use-flashcards');
    const cards = demoSavedFlashcards(options.lessons === true);
    await saveFlashcards(cards, TARGET);
    return String(cards.length);
  });
  await step('own_packs', async () => {
    const { saveLocalAuthorPack } = await import('./community_packs/localAuthorPacks');
    for (const pack of DEMO_OWN_PACKS) { // guard-ok: локальная запись на устройство, Firestore не читается
      await saveLocalAuthorPack({
        title: pack.title,
        description: '',
        cards: demoPackCards(pack),
        packLanguage: 'en',
        studyTarget: TARGET,
        ...(pack.level ? { level: pack.level } : {}),
        // «На проверке»: заявка помечена к публикации, но на сервер фикстура её не шлёт.
        publishToCommunity: pack.pending === true ? true : false,
      }, { packId: pack.packId, studyTarget: TARGET, isPremium: true });
    }
    return String(DEMO_OWN_PACKS.length);
  });
  await step('continue', async () => {
    const { recordPackContinuePosition } = await import('./flashcards/pack_continue_position');
    recordPackContinuePosition(TARGET, { packId: DEMO_TRAVEL_PACK_ID, index: 12, total: 40, mode: 'blitz' });
    return 'Путешествия 12/40';
  });
  await step('videos', async () => {
    const { seedVideoPhraseSetPacksForDev } = await import('./video_phrase_set_packs');
    const packs = demoVideoPacks();
    if (!(await seedVideoPhraseSetPacksForDev(packs))) throw new Error('seed_refused');
    return String(packs.length);
  });
  await step('community', async () => {
    const { seedCommunityCatalogForDev } = await import('./community_packs/communityFirestore');
    const packs = demoCommunityPacks();
    if (!seedCommunityCatalogForDev(TARGET, packs)) throw new Error('seed_refused');
    return String(packs.length);
  });
  console.log('[DEV-STATE] cards demo', JSON.stringify({ applied, skipped }));
  return { applied, skipped };
}
