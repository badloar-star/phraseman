import AsyncStorage from '@react-native-async-storage/async-storage';
import { flashcardsSwipeMemoryKey, type RuntimeStudyTarget } from '../target_storage_keys';

/**
 * Статус изучения карточки для цветных точек в коллекции
 * (макет flashcards-screens.html B1, элемент `.cdot`; палитра — хендоф §4.3).
 *
 * зачем: в списке коллекции все карточки выглядели ОДИНАКОВО — нельзя было
 * понять, что уже освоено, а что проваливается. Прогресс при этом давно
 * копится в свайп-тренировке, просто нигде не показывался.
 *
 * FIREBASE-ЭКОНОМИЯ: читаем ТОЛЬКО локальный AsyncStorage — тот самый ключ,
 * который свайп уже пишет, а cloud_sync уже синхронизирует по своему расписанию.
 * Ни одного нового запроса к Firestore и ни одного вызова функций.
 */

/** Статусы из макета §4.3 (порядок = порядок ухудшения/улучшения). */
export type FlashcardStatus = 'new' | 'learning' | 'review' | 'mastered' | 'weak';

/** Цвета статусов — дословно из хендофа §4.3 «Статусы карточек флешек». */
export const FLASHCARD_STATUS_COLOR: Record<FlashcardStatus, string> = {
  new: '#9FB4CC',
  learning: '#5AA6FF',
  review: '#F5C842',
  mastered: '#35D07F',
  weak: '#FF6B7E',
};

/**
 * Метки для скринридера: цвет точки незрячему пользователю ничего не говорит,
 * поэтому статус обязан звучать словом.
 */
export const FLASHCARD_STATUS_A11Y_LABEL: Record<FlashcardStatus, string> = {
  new: 'Новая карточка',
  learning: 'Учу',
  review: 'Пора повторить',
  mastered: 'Освоена',
  weak: 'Слабая карточка',
};

/** Сколько верных подряд считаем «освоено» (зеркалит шкалу интервалов свайпа). */
const MASTERED_AT = 4;

type MemoryRow = {
  correct: number;
  wrong: number;
  seen: number;
  mastered: number;
  nextDueAt: number;
};

export type FlashcardStatusMap = Record<string, FlashcardStatus>;

/**
 * Правила (в порядке проверки — первое совпадение выигрывает):
 *  - карточку не видели ни разу       → new
 *  - ошибок больше, чем верных        → weak (проблемная, её и надо тренировать)
 *  - mastered >= 4                    → mastered
 *  - срок повторения подошёл          → review
 *  - иначе                            → learning
 */
export function statusFromMemoryRow(row: MemoryRow | undefined, now: number): FlashcardStatus {
  if (!row || row.seen <= 0) return 'new';
  if (row.wrong > row.correct) return 'weak';
  if (row.mastered >= MASTERED_AT) return 'mastered';
  if (row.nextDueAt > 0 && row.nextDueAt <= now) return 'review';
  return 'learning';
}

/**
 * Достаёт id карточки из ключа памяти.
 *
 * зачем (НАЙДЕНО АУДИТОМ 2026-07-25): свайп индексирует память СОСТАВНЫМ
 * ключом `${source.id}:${card.id}` — например `saved:all:abc123`. Коллекция
 * же ищет статус по голому `item.id` (`abc123`). Из-за этого весь прогресс
 * свайпа в коллекции НЕ ОТОБРАЖАЛСЯ — точки статусов были почти всегда серые
 * («новая»), сколько бы юзер ни тренировался.
 *
 * Берём часть после последнего двоеточия: id карточек двоеточий не содержат,
 * а префикс источника — содержит (`saved:all`, `custom:all`, `pack:xyz`).
 */
export function cardIdFromMemoryKey(key: string): string {
  const idx = key.lastIndexOf(':');
  return idx >= 0 ? key.slice(idx + 1) : key;
}

/**
 * Читает прогресс и отдаёт карту «id карточки → статус».
 *
 * Понимает ОБА формата ключей: составной от свайпа (`saved:all:abc`) и голый
 * от арены (`abc`). Если одна карточка встречается в обоих — берём худший
 * статус: проблемную карточку нельзя прятать за хорошим результатом другого
 * режима.
 *
 * Ошибки хранилища не бросаем: статус — украшение списка, из-за него список
 * не должен падать. При сбое просто вернём пустую карту (все точки «new»).
 */
export async function loadFlashcardStatuses(
  studyTarget: RuntimeStudyTarget,
  now: number = Date.now(),
): Promise<FlashcardStatusMap> {
  try {
    const raw = await AsyncStorage.getItem(flashcardsSwipeMemoryKey(studyTarget));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: FlashcardStatusMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const r = value as Record<string, unknown>;
      const status = statusFromMemoryRow(
        {
          correct: typeof r.correct === 'number' ? r.correct : 0,
          wrong: typeof r.wrong === 'number' ? r.wrong : 0,
          seen: typeof r.seen === 'number' ? r.seen : 0,
          mastered: typeof r.mastered === 'number' ? r.mastered : 0,
          nextDueAt: typeof r.nextDueAt === 'number' ? r.nextDueAt : 0,
        },
        now,
      );
      const id = cardIdFromMemoryKey(key);
      const prev = out[id];
      out[id] = prev ? worstStatus(prev, status) : status;
    }
    return out;
  } catch {
    return {};
  }
}

/** Порядок «тревожности»: чем выше, тем важнее показать. */
const STATUS_SEVERITY: Record<FlashcardStatus, number> = {
  mastered: 0,
  new: 1,
  learning: 2,
  review: 3,
  weak: 4,
};

/** Из двух статусов одной карточки выбирает тот, что требует внимания. */
export function worstStatus(a: FlashcardStatus, b: FlashcardStatus): FlashcardStatus {
  return STATUS_SEVERITY[b] > STATUS_SEVERITY[a] ? b : a;
}
