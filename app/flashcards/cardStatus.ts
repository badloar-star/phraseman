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
 * Читает прогресс свайпа и отдаёт карту «id карточки → статус».
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
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const r = value as Record<string, unknown>;
      out[id] = statusFromMemoryRow(
        {
          correct: typeof r.correct === 'number' ? r.correct : 0,
          wrong: typeof r.wrong === 'number' ? r.wrong : 0,
          seen: typeof r.seen === 'number' ? r.seen : 0,
          mastered: typeof r.mastered === 'number' ? r.mastered : 0,
          nextDueAt: typeof r.nextDueAt === 'number' ? r.nextDueAt : 0,
        },
        now,
      );
    }
    return out;
  } catch {
    return {};
  }
}
