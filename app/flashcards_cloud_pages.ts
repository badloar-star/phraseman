/**
 * Облачное хранение сохранённых карточек ВНЕ документа users/{stableId}.
 *
 * зачем: progress.flashcards_v1 рос без предела внутри документа и у трёх самых
 * активных аккаунтов пробил жёсткий лимит Firestore в 1 МБ — документ перестал
 * принимать ЛЮБУЮ запись ("cannot be written because its size exceeds the maximum
 * allowed size"), то есть у людей молча переставал сохраняться весь прогресс
 * целиком, а не только карточки. Поэтому карточки уезжают в подколлекцию
 * users/{stableId}/flashcard_pages/{target}_{n}.
 *
 * зачем страницами, а не документ-на-карточку: у пострадавших 1453..2685 карточек.
 * Документ-на-карточку превратил бы одно чтение словаря в 2685 чтений на человека
 * (правило проекта «Firebase-экономия»). Страница по CARDS_PER_PAGE карточек даёт
 * ~14 чтений на самом тяжёлом аккаунте и оставляет запас до лимита документа
 * примерно в 10 раз (200 карточек × ~425 Б ≈ 85 КБ при лимите 1 МБ).
 *
 * Локальный AsyncStorage остаётся единственным источником для UI (hooks/use-flashcards.ts):
 * облако — только зеркало для восстановления на новом устройстве. Поэтому здесь нет
 * ни кэшей, ни Optimistic UI: отклик интерфейса обеспечивает локальная запись,
 * а этот модуль работает фоном на общем такте cloud_sync.
 */
import { IS_EXPO_GO, CLOUD_SYNC_ENABLED } from './config';
import { DebugLogger } from './debug-logger';
import type { StudyTarget } from './study_target';

const LOG = '[FLASHCARDS-CLOUD]';

/** Подколлекция документа users/{stableId}. */
export const FLASHCARD_PAGES_COLLECTION = 'flashcard_pages';

/**
 * Сколько карточек кладём в один документ-страницу.
 *
 * зачем именно 200: замер боевой базы 2026-09-01 дал медиану карточки ~266..363 Б
 * и максимум 2105 Б. Даже если ВСЕ 200 карточек страницы окажутся максимального
 * размера — это ~410 КБ, всё ещё меньше лимита в 1 МБ. Менять это число вниз можно
 * свободно, вверх — только пересчитав худший случай (см. tests/flashcards_cloud_pages.test.ts).
 */
export const CARDS_PER_PAGE = 200;

/**
 * Жёсткий предел на документ-страницу, страхующий от возврата исходной аварии.
 * Больше этого числа в один документ не пишем НИКОГДА — вместо этого открывается
 * следующая страница.
 */
export const MAX_CARDS_PER_PAGE_HARD_LIMIT = 400;

type CloudDb = {
  collection: (path: string) => any;
  batch: () => any;
} | null;

function getFirestore(): CloudDb {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch (error) {
    // зачем: немой catch уже однажды скрыл эту аварию на месяцы — причина пишется всегда.
    DebugLogger.warn(LOG, `firestore module unavailable: ${String(error)}`);
    return null;
  }
}

/**
 * Разложить плоский список карточек по страницам.
 * Чистая функция — вынесена ради теста-сторожа, который не даёт странице разрастись.
 */
export function chunkCardsIntoPages<T>(cards: readonly T[], perPage: number = CARDS_PER_PAGE): T[][] {
  const size = Math.max(1, Math.min(Math.floor(perPage), MAX_CARDS_PER_PAGE_HARD_LIMIT));
  const pages: T[][] = [];
  for (let i = 0; i < cards.length; i += size) {
    pages.push(cards.slice(i, i + size));
  }
  return pages;
}

/** Идентификатор страницы: язык изучения + порядковый номер, чтобы en и fr не смешивались. */
export function flashcardPageDocId(target: StudyTarget, index: number): string {
  return `${target}_${String(index).padStart(4, '0')}`;
}

/**
 * Записать полный список карточек одного языка в подколлекцию.
 * Возвращает число записанных страниц, либо null если запись не выполнялась.
 *
 * Лишние страницы прошлой (более длинной) версии удаляются в том же батче —
 * иначе после удаления карточек «хвост» остался бы жить и вернулся при чтении.
 */
export async function writeFlashcardPages(
  stableId: string,
  target: StudyTarget,
  cardsJson: string,
): Promise<number | null> {
  const db = getFirestore();
  if (!db) return null;
  if (!stableId) {
    DebugLogger.warn(LOG, 'write skipped: empty stableId');
    return null;
  }

  let cards: unknown[];
  try {
    const parsed = JSON.parse(cardsJson);
    if (!Array.isArray(parsed)) {
      DebugLogger.warn(LOG, `write skipped: payload is ${typeof parsed}, expected array`);
      return null;
    }
    cards = parsed;
  } catch (error) {
    DebugLogger.warn(LOG, `write skipped: unparsable payload (${String(error)})`);
    return null;
  }

  const started = Date.now();
  const pages = chunkCardsIntoPages(cards);
  const col = db.collection('users').doc(stableId).collection(FLASHCARD_PAGES_COLLECTION);

  try {
    // Что уже лежит в облаке — чтобы удалить страницы сверх нового количества.
    const existing = await col.get();
    const stalePrefix = `${target}_`;
    const staleDocs: string[] = [];
    existing.forEach((doc: { id: string }) => {
      if (!doc.id.startsWith(stalePrefix)) return;
      const index = Number.parseInt(doc.id.slice(stalePrefix.length), 10);
      if (!Number.isFinite(index) || index >= pages.length) staleDocs.push(doc.id);
    });

    const batch = db.batch();
    pages.forEach((page, index) => {
      batch.set(
        col.doc(flashcardPageDocId(target, index)),
        { target, index, count: page.length, cards: JSON.stringify(page), updatedAt: Date.now() },
        { merge: false },
      );
    });
    for (const id of staleDocs) batch.delete(col.doc(id));
    await batch.commit();

    DebugLogger.info(
      LOG,
      `write ok target=${target} cards=${cards.length} pages=${pages.length} stale_removed=${staleDocs.length} ms=${Date.now() - started}`,
    );
    return pages.length;
  } catch (error) {
    // зачем: критично — именно молчание этого пути и стоило людям прогресса.
    DebugLogger.error(`${LOG} write target=${target} cards=${cards.length}`, error, 'critical');
    return null;
  }
}

/**
 * Прочитать карточки одного языка из подколлекции.
 * Возвращает JSON-строку в том же формате, что лежала в progress.flashcards_v1,
 * либо null — если облачных страниц нет (значит истина осталась в documento/локально).
 */
export async function readFlashcardPages(
  stableId: string,
  target: StudyTarget,
): Promise<string | null> {
  const db = getFirestore();
  if (!db) return null;
  if (!stableId) {
    DebugLogger.warn(LOG, 'read skipped: empty stableId');
    return null;
  }

  const started = Date.now();
  try {
    const snap = await db
      .collection('users')
      .doc(stableId)
      .collection(FLASHCARD_PAGES_COLLECTION)
      .where('target', '==', target)
      .get();

    if (snap.empty) {
      DebugLogger.info(LOG, `read empty target=${target} ms=${Date.now() - started}`);
      return null;
    }

    const rows: Array<{ index: number; cards: unknown[] }> = [];
    snap.forEach((doc: { id: string; data: () => Record<string, unknown> }) => {
      const data = doc.data() ?? {};
      const index = typeof data.index === 'number' ? data.index : Number.NaN;
      const raw = data.cards;
      if (typeof raw !== 'string') {
        DebugLogger.warn(LOG, `read: page ${doc.id} has cards of type ${typeof raw} — skipped`);
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          DebugLogger.warn(LOG, `read: page ${doc.id} is not an array — skipped`);
          return;
        }
        rows.push({ index: Number.isFinite(index) ? index : rows.length, cards: parsed });
      } catch (error) {
        DebugLogger.warn(LOG, `read: page ${doc.id} unparsable (${String(error)}) — skipped`);
      }
    });

    if (rows.length === 0) {
      DebugLogger.warn(LOG, `read target=${target}: ${snap.size} pages found but none usable`);
      return null;
    }

    rows.sort((a, b) => a.index - b.index);
    const merged = rows.flatMap((row) => row.cards);
    DebugLogger.info(
      LOG,
      `read ok target=${target} pages=${rows.length} cards=${merged.length} ms=${Date.now() - started}`,
    );
    return JSON.stringify(merged);
  } catch (error) {
    DebugLogger.error(`${LOG} read target=${target}`, error, 'warning');
    return null;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
