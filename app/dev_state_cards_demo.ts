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

// зачем (Макеты 18.10, замечание 18): кадр «Dos vídeos» в pt показывал русские названия — demoTitles клал ru во все языки.
// Названия демо-роликов — на 9 языках [uk, en, es, pt-BR, vi, id, tr, pl]; прочие демо-наборы (их «пишут авторы») — как были.
const DEMO_TITLE_I18N: Readonly<Record<string, readonly [string, string, string, string, string, string, string, string]>> = {
  'Заказ в кафе': ['Замовлення в кав’ярні', 'Ordering at a café', 'Pedir en una cafetería', 'Pedido no café', 'Gọi món ở quán cà phê', 'Memesan di kafe', 'Kafede sipariş', 'Zamawianie w kawiarni'],
  'Собеседование': ['Співбесіда', 'Job interview', 'Entrevista de trabajo', 'Entrevista de emprego', 'Phỏng vấn xin việc', 'Wawancara kerja', 'İş görüşmesi', 'Rozmowa o pracę'],
  'В аэропорту': ['В аеропорту', 'At the airport', 'En el aeropuerto', 'No aeroporto', 'Ở sân bay', 'Di bandara', 'Havalimanında', 'Na lotnisku'],
  'Первое свидание': ['Перше побачення', 'First date', 'Primera cita', 'Primeiro encontro', 'Buổi hẹn đầu tiên', 'Kencan pertama', 'İlk buluşma', 'Pierwsza randka'],
  'Сериал: офис': ['Серіал: офіс', 'TV series: the office', 'Serie: la oficina', 'Série: o escritório', 'Phim bộ: văn phòng', 'Serial: kantor', 'Dizi: ofis', 'Serial: biuro'],
};

function demoTitles(title: string) {
  const t = DEMO_TITLE_I18N[title];
  return {
    codeName: title, titleRu: title, titleUk: t?.[0] ?? title, titleEn: t?.[1] ?? title, titleEs: t?.[2] ?? title,
    titlePtBr: t?.[3] ?? title, titleVi: t?.[4] ?? title, titleId: t?.[5] ?? title, titleTr: t?.[6] ?? title, titlePl: t?.[7] ?? title,
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

/** Наборы кадра «Лучшее у сообщества»: название, автор, карточек, уровень, лайки, три слова превью (в образце cards-v2 №25 — три чипа в ряд). */
export const DEMO_COMMUNITY: readonly (readonly [string, string, number, PackLevel, number, readonly string[]])[] = [
  ['Family', 'Лидия', 20, 'A1', 4, ['Mother', 'Afford', 'Borrow']], ['B2 глаголы', 'Ирина', 49, 'B2', 3, ['Convince', 'Deserve', 'Avoid']], ['Антоніми дієслів', 'Natalia', 30, 'B1', 1, ['Arrive', 'Borrow', 'Deserve']],
  ['Small talk', 'Олег', 26, 'A2', 7, ['How come', 'Expect', 'Improve']], ['Офис и созвоны', 'Мария', 34, 'B1', 5, ['Follow up', 'Deadline', 'Refund']],
];

export function demoCommunityPacks(): FlashcardMarketPack[] {
  return DEMO_COMMUNITY.map(([title, author, count, level, likes, words], i) => ({
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
    previewWords: [...words],
    updatedAt: new Date(NOW_BASE - i * 3_600_000).toISOString(),
  } as FlashcardMarketPack));
}

/**
 * Демо-наборы сообщества С КАРТОЧКАМИ для режима «без сети» (dev_state `packcards=on`; координатор + Макеты 12.10, съёмка R1).
 * зачем: экран чужого/своего опубликованного набора и ролика берёт мету из кэша каталога, а карточки — из документа набора,
 * которого у демо нет. Здесь мета (с authorStableId, счётчиками, видео) + карточки; dev_cards_state держит их в памяти.
 * «B2 глаголы» — первые карточки как на образце cards-v2 №15/16 (Convince, Claim, Afford, Borrow, Deserve).
 */
export const DEMO_VIDEO_COMMUNITY_PACK_ID = 'video_devDemoVid0';

export function demoCommunityPackData(stableId: string): Readonly<{
  packs: ReadonlyMap<string, Readonly<{ meta: Readonly<Record<string, unknown>>; cards: readonly unknown[] }>>;
  catalog: FlashcardMarketPack[];
}> {
  const cardHeads: Readonly<Record<string, readonly string[]>> = { dev_demo_community_2: ['Convince', 'Claim', 'Afford', 'Borrow', 'Deserve'] };
  const community = demoCommunityPacks().map((pack, i) => ({
    ...pack,
    authorStableId: `dev_demo_author_${i + 1}`,
    addedCount: 5 + i,
    commentsCount: 3,
  } as FlashcardMarketPack));
  const published = {
    id: DEMO_PUBLISHED_PACK_ID,
    ...demoTitles('Мой опубликованный'),
    category: 'daily', cardCount: 10, priceShards: 0, salesCount: 0, likesCount: 12, addedCount: 5, commentsCount: 3,
    authorName: 'Ты', authorStableId: stableId, isOfficial: false, isCommunityUgc: true, packLanguage: 'en',
    listingStatus: 'published', level: 'B1', previewWords: ['Layover'], updatedAt: new Date(NOW_BASE).toISOString(),
  } as unknown as FlashcardMarketPack;
  const video = {
    id: DEMO_VIDEO_COMMUNITY_PACK_ID,
    ...demoTitles(DEMO_VIDEOS[0][0]),
    category: 'daily', cardCount: DEMO_VIDEOS[0][2], priceShards: 0, salesCount: 0, likesCount: 9, addedCount: 14, commentsCount: 0,
    authorName: 'Professor Lingman', authorStableId: 'dev_demo_author_video', isOfficial: false, isCommunityUgc: true, packLanguage: 'en',
    listingStatus: 'published', level: 'A2', previewWords: ['Receipt'], videoId: 'devDemoVid0', videoTitle: DEMO_VIDEOS[0][0],
    videoDurationSec: durationToSec(DEMO_VIDEOS[0][1]), updatedAt: new Date(NOW_BASE).toISOString(),
  } as unknown as FlashcardMarketPack;
  const packs = new Map<string, Readonly<{ meta: Readonly<Record<string, unknown>>; cards: readonly unknown[] }>>();
  community.forEach((pack, i) => {
    const words = cardHeads[pack.id] ?? (pack.previewWords ?? []);
    packs.set(pack.id, { meta: pack as unknown as Record<string, unknown>, cards: demoPackCards({ packId: pack.id, title: DEMO_COMMUNITY[i][0], count: pack.cardCount, words }) }); // guard-ok: Map в памяти процесса, не Firestore
  });
  packs.set(published.id, { meta: published as unknown as Record<string, unknown>, cards: demoPackCards({ packId: published.id, title: 'Мой опубликованный', count: 10, words: ['Layover', 'Gate', 'Customs'] }) }); // guard-ok: Map в памяти процесса, не Firestore
  const videoCards = demoPackCards({ packId: video.id, title: DEMO_VIDEOS[0][0], count: DEMO_VIDEOS[0][2], words: ['Receipt', 'Refund', 'Booking'] })
    .map((card, i) => ({ ...card, videoStartSec: 12 + i * 11 }));
  packs.set(video.id, { meta: video as unknown as Record<string, unknown>, cards: videoCards }); // guard-ok: Map в памяти процесса, не Firestore
  return { packs, catalog: [published, ...community, video] };
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

// зачем (координатор 12.10, безопасность): фикстуры, ПИШУЩИЕ карточки/наборы, работают только на анонимном госте — эти ключи уходят в облако
// (cloud_sync + Account V2 card_snapshot); на настоящем тестовом аккаунте №2/№3 пустой или демо-список затёр бы облачные данные.
// Проверка живёт в отдельном модуле (там чтение Firebase Auth; исходники этого файла сторожит тест «не ходят в сеть»).
async function assertWritableAccount(what: string): Promise<void> {
  assertDevBuild(what);
  const { assertDisposableGuest } = await import('./dev_state_account_guard');
  assertDisposableGuest(what);
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
  await assertWritableAccount('cards=custom50');
  await resetCardsViewPrefs(); // зачем (Макеты e68b81502, cards-010 снялся в режиме «Стопка»): вид и масштаб переживают перезапуск — каждая карточная фикстура начинает со списка
  const { updateCustomCards } = await import('./flashcards/custom_cards_store');
  const cards = demoCustomCards(count);
  await updateCustomCards(() => cards, TARGET);
  console.log('[DEV-STATE] custom cards', JSON.stringify({ count: cards.length })); // guard-ok: единичный лог на ссылку
  return String(cards.length);
}

export const DEMO_PUBLISHED_PACK_ID = 'dev_demo_published_own';
export const DEMO_PUBLISHED_LOCAL_ID = 'local_pack_dev_demo_published';

/**
 * Свой ОПУБЛИКОВАННЫЙ набор автора (R1 Н-5: cards-042/049/053, cards-gap-029/030/031/039): локальная копия с cloudPackId (ровно 10 карточек — «минимум 10»
 * при удалении) + набор в кэше каталога от моего stableId с чужими откликами, помеченный как мой в «Мои из сообщества». Сервер не вызывается.
 */
export async function applyDemoPublished(stableId: string): Promise<string> {
  await assertWritableAccount('cards=demo_published');
  await resetCardsViewPrefs(); // зачем: см. cards=custom50
  const own: DemoOwnPack = { packId: DEMO_PUBLISHED_LOCAL_ID, title: 'Мой опубликованный', count: 10, level: 'B1', words: ['Layover', 'Gate', 'Customs'] };
  const { saveLocalAuthorPack } = await import('./community_packs/localAuthorPacks');
  await saveLocalAuthorPack({
    title: own.title, description: '', cards: demoPackCards(own), packLanguage: 'en', studyTarget: TARGET, level: 'B1', publishToCommunity: true,
  }, { packId: own.packId, studyTarget: TARGET, cloudPackId: DEMO_PUBLISHED_PACK_ID, isPremium: true });
  const published = {
    id: DEMO_PUBLISHED_PACK_ID,
    ...demoTitles(own.title),
    category: 'daily',
    cardCount: own.count,
    priceShards: 0,
    salesCount: 0,
    likesCount: 12,
    addedCount: 5,
    commentsCount: 3,
    authorName: 'Ты',
    authorStableId: stableId,
    isOfficial: false,
    isCommunityUgc: true,
    packLanguage: 'en',
    listingStatus: 'published',
    level: 'B1',
    previewWords: ['Layover'],
    updatedAt: new Date(NOW_BASE).toISOString(),
  } as unknown as FlashcardMarketPack;
  const { seedCommunityCatalogForDev } = await import('./community_packs/communityFirestore');
  if (!seedCommunityCatalogForDev(TARGET, [published, ...demoCommunityPacks()])) throw new Error('seed_refused');
  const { addCommunityOwnedPackId } = await import('./community_packs/communityOwnedStorage');
  await addCommunityOwnedPackId(DEMO_PUBLISHED_PACK_ID, TARGET, { titleRu: own.title, titleUk: own.title, titleEs: own.title });
  console.log('[DEV-STATE] demo_published', JSON.stringify({ local: own.packId, cloud: DEMO_PUBLISHED_PACK_ID })); // guard-ok: единичный лог на ссылку
  return DEMO_PUBLISHED_PACK_ID;
}

/** Сохранённые карточки без перевода (R1 Н-11: cards-gap-007/008): `answerFor` пуст для любого языка интерфейса. */
export async function applyNoTranslationCards(): Promise<string> {
  await assertWritableAccount('cards=notranslation');
  await resetCardsViewPrefs(); // зачем: см. cards=custom50
  const { saveFlashcards } = await import('../hooks/use-flashcards');
  const words = ['Layover', 'Gate', 'Customs', 'Boarding', 'Luggage', 'Passport'];
  const cards = words.map((en, i) => ({
    id: `dev_demo_notr_${i + 1}`, en, ru: '', uk: '', es: '', source: 'word' as const, addedAt: NOW_BASE + (words.length - i) * 60_000, packLanguage: 'en', studyTarget: TARGET,
  })) as unknown as Flashcard[];
  await saveFlashcards(cards, TARGET);
  console.log('[DEV-STATE] notranslation', JSON.stringify({ count: cards.length })); // guard-ok: единичный лог на ссылку
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

// зачем (координатор 12.10, «уникальна»): режим просмотра «Сохранённых» и масштаб сетки переживают перезапуск (AsyncStorage + память процесса) — после кадра «5 колонок» или «Стопка»
// следующая строка с той же ссылкой открывалась бы не в исходном виде. Каждая фикстура Карточек начинает с чистого вида.
export async function resetCardsViewPrefs(): Promise<string> {
  assertDevBuild('cards view prefs');
  const { saveGalleryStep } = await import('../components/cards-grid/gallery_step_prefs');
  const { GALLERY_DEFAULT_STEP } = await import('../components/cards-grid/cardsGalleryLayout');
  const { setCollectionViewMode } = await import('./flashcards/collection_view_prefs');
  saveGalleryStep(GALLERY_DEFAULT_STEP);
  setCollectionViewMode('list');
  // зачем: черновик нового набора переживает перезапуск — кадр «Новый набор» после кадра «Новая карточка (Test)» открылся бы с чужим текстом
  const { clearCommunityPackCreateDraft } = await import('./community_packs/communityPackDraftStorage');
  await clearCommunityPackCreateDraft(TARGET);
  // зачем (Макеты cards-section-012, 12.10): разовая подсказка «Зажми карточку…» висела поверх сетки на кадрах свежего гостя; фикстуры карточек помечают её увиденной (кадр cards-033 возвращает её параметром hint=show)
  const { flashcardsDeleteHintSeenKey } = await import('./target_storage_keys');
  await AsyncStorage.setItem(flashcardsDeleteHintSeenKey(TARGET), '1');
  console.log('[DEV-STATE] cards view prefs', JSON.stringify({ galleryStep: GALLERY_DEFAULT_STEP, viewMode: 'list', packDraft: 'cleared', deleteHint: 'seen' })); // guard-ok: единичный лог на ссылку
  return `step=${GALLERY_DEFAULT_STEP},list,draft=cleared,hint=seen`;
}

/** hint=show | seen: разовая подсказка «Зажми карточку…» — вернуть (кадр cards-033) или пометить увиденной. Только анонимный гость (ключ синхронизируется). */
export async function applyDeleteHintState(mode: 'show' | 'seen'): Promise<string> {
  await assertWritableAccount(`hint=${mode}`);
  const { flashcardsDeleteHintSeenKey } = await import('./target_storage_keys');
  const key = flashcardsDeleteHintSeenKey(TARGET);
  if (mode === 'show') await AsyncStorage.removeItem(key);
  else await AsyncStorage.setItem(key, '1');
  console.log(`[DEV-STATE] cards: подсказка «Зажми карточку…» → ${mode}`); // guard-ok: единичный лог на ссылку
  return mode;
}

/**
 * Пустой аккаунт Карточек (cards-009/013, cards-v2-011/013, packs-simple-003): ни сохранённых, ни своих карточек, ни своих наборов.
 * Нужен, потому что «просто не применять cards=demo» не пусто: данные прошлого кадра лежат на устройстве.
 */
export async function applyCardsEmpty(): Promise<CardsDemoResult> {
  const applied: Record<string, string> = {};
  const skipped: Record<string, string> = {};
  const step = async (key: string, run: () => Promise<string>) => {
    try {
      applied[key] = await run();
    } catch (error) {
      skipped[key] = error instanceof Error ? error.message : String(error);
      console.warn('[DEV-STATE] cards empty step failed', key, skipped[key]); // guard-ok: сбой шага виден в логе
    }
  };
  try {
    await assertWritableAccount('cards=empty');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn('[DEV-STATE] cards=empty mode=refused', reason); // guard-ok: причина отказа
    return { applied, skipped: { refused: reason } };
  }
  await step('saved', async () => {
    const { saveFlashcards } = await import('../hooks/use-flashcards');
    await saveFlashcards([], TARGET);
    return '0';
  });
  await step('custom', async () => {
    const { updateCustomCards } = await import('./flashcards/custom_cards_store');
    await updateCustomCards(() => [], TARGET);
    return '0';
  });
  await step('own_packs', async () => {
    const { loadLocalAuthorPacks, removeLocalAuthorPack } = await import('./community_packs/localAuthorPacks');
    const packs = await loadLocalAuthorPacks(TARGET);
    for (const pack of packs) { // guard-ok: локальные ключи устройства, Firestore не читается
      await removeLocalAuthorPack(pack.id, TARGET);
    }
    return String(packs.length);
  });
  await step('view', resetCardsViewPrefs);
  console.log('[DEV-STATE] cards empty', JSON.stringify({ applied, skipped })); // guard-ok: единичный лог на ссылку
  return { applied, skipped };
}

/** Выставить наполненный аккаунт. Каждый шаг независим: сбой одного не мешает остальным и пишет причину. */
// зачем (cards-gap-019 «В какой набор? — своих наборов нет»): noPacks — те же 64 сохранённые, но без своих наборов и «Продолжить».
// зачем (Авторизация 12.10, съёмка R1 cards-026 «Мало карточек для блица»): `few` — в «Сохранённых» 3 карточки (меньше BLITZ_MIN_CARDS = 4), своих наборов нет,
// поэтому на подготовке Блица единственная колода даёт подсказку «нужно минимум 4 карточки».
export async function applyCardsDemo(options: Readonly<{ lessons?: boolean; noPacks?: boolean; few?: boolean }> = {}): Promise<CardsDemoResult> {
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

  try {
    await assertWritableAccount(options.lessons === true ? 'cards=demo_lessons' : options.few === true ? 'cards=demo_few' : 'cards=demo');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn('[DEV-STATE] cards=demo mode=refused', reason); // guard-ok: причина отказа
    return { applied, skipped: { refused: reason } };
  }
  await step('view', resetCardsViewPrefs);
  await step('saved', async () => {
    const { saveFlashcards } = await import('../hooks/use-flashcards');
    const cards = options.few === true ? demoSavedFlashcards(false).slice(0, 3) : demoSavedFlashcards(options.lessons === true);
    await saveFlashcards(cards, TARGET);
    return String(cards.length);
  });
  await step('own_packs', async () => {
    if (options.noPacks === true) return 'skipped:noPacks';
    if (options.few === true) return 'skipped:few';
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
    if (options.noPacks === true) return 'skipped:noPacks';
    if (options.few === true) return 'skipped:few';
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
