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
import type { Flashcard } from '../hooks/use-flashcards';
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

export function demoSavedFlashcards(): Flashcard[] {
  return MOCK_SAVED.slice(0, 64).map(([en, ru], i) => ({
    id: `dev_demo_saved_${String(i + 1).padStart(2, '0')}`,
    en,
    ru,
    uk: ru,
    source: 'word',
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

/** Выставить наполненный аккаунт. Каждый шаг независим: сбой одного не мешает остальным и пишет причину. */
export async function applyCardsDemo(): Promise<CardsDemoResult> {
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
    const cards = demoSavedFlashcards();
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
