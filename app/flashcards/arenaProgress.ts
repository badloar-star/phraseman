import AsyncStorage from '@react-native-async-storage/async-storage';
import { flashcardsSwipeMemoryKey, type RuntimeStudyTarget } from '../target_storage_keys';
import type { ArenaAnswer } from './arenaQuiz';

/**
 * Запись результата арены в общий прогресс карточек.
 *
 * зачем (решение владельца): арена показывала счёт и слабые слова, но НИЧЕГО
 * не меняла — можно было десять раз провалить слово, а в коллекции оно так и
 * висело «новым». Теперь три режима (свайп, аудио, арена) копят один прогресс:
 * ошибка в арене делает карточку «слабой», серия верных приближает к «освоено».
 *
 * Пишем в ТОТ ЖЕ ключ, что свайп (`flashcardsSwipeMemoryKey`) и в том же
 * формате — иначе цветные точки в коллекции разошлись бы с реальностью, а
 * cloud_sync пришлось бы учить второму хранилищу.
 *
 * FIREBASE: только локальный AsyncStorage. Синхронизацию облака делает
 * существующий cloud_sync по своему расписанию — новых запросов ноль.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** Шкала интервалов повторения — дословно как в свайпе (nextDueAfterMastery). */
const INTERVALS_DAYS = [1, 3, 7, 14, 30, 60];

export interface ArenaMemoryRow {
  correct: number;
  wrong: number;
  hints: number;
  seen: number;
  mastered: number;
  lastSeenAt: number;
  nextDueAt: number;
  ease: number;
}

export type ArenaMemory = Record<string, ArenaMemoryRow>;

export function defaultArenaRow(): ArenaMemoryRow {
  return { correct: 0, wrong: 0, hints: 0, seen: 0, mastered: 0, lastSeenAt: 0, nextDueAt: 0, ease: 2.2 };
}

/**
 * Применяет один ответ к строке прогресса.
 *
 * Верный ответ: +1 к серии освоения, срок следующего повтора отодвигается по
 * шкале интервалов. Неверный: серия обнуляется (карточка снова в работе),
 * ease понижается — она будет всплывать чаще, срок повтора «завтра».
 *
 * Чистая функция — вся арифметика под тестом.
 */
export function applyArenaAnswer(
  row: ArenaMemoryRow | undefined,
  correct: boolean,
  now: number,
): ArenaMemoryRow {
  const base = row ?? defaultArenaRow();
  const seen = base.seen + 1;
  const lastSeenAt = now;

  if (correct) {
    const mastered = base.mastered + 1;
    // ease растёт медленно и упирается в потолок — иначе интервалы
    // разлетаются после пары удачных забегов.
    const ease = Math.min(2.8, base.ease + 0.08);
    const idx = Math.min(INTERVALS_DAYS.length - 1, Math.max(0, mastered));
    const easeBoost = Math.max(0.75, Math.min(1.6, ease / 2.2));
    return {
      ...base,
      correct: base.correct + 1,
      seen,
      mastered,
      ease,
      lastSeenAt,
      nextDueAt: now + Math.round(INTERVALS_DAYS[idx]! * easeBoost * DAY_MS),
    };
  }

  return {
    ...base,
    wrong: base.wrong + 1,
    seen,
    // Серия сбивается полностью: слово не освоено, раз промахнулись.
    mastered: 0,
    // Пол по ease, чтобы карточка не застряла в бесконечном «завтра».
    ease: Math.max(1.6, base.ease - 0.15),
    lastSeenAt,
    nextDueAt: now + DAY_MS,
  };
}

/**
 * Записывает весь забег в прогресс. Читает-меняет-пишет один раз, а не по
 * ответу — забег это 10 вопросов, отдельная запись на каждый била бы по диску.
 *
 * Ошибки хранилища проглатываем: прогресс — не деньги, из-за него экран итогов
 * падать не должен. Возвращаем true/false, чтобы вызывающий мог решить сам.
 */
export async function saveArenaRun(
  answers: readonly ArenaAnswer[],
  studyTarget: RuntimeStudyTarget,
  now: number = Date.now(),
): Promise<boolean> {
  if (answers.length === 0) return true;
  const key = flashcardsSwipeMemoryKey(studyTarget);
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    const memory: ArenaMemory =
      parsed && typeof parsed === 'object' ? ({ ...(parsed as ArenaMemory) }) : {};

    for (const a of answers) {
      memory[a.cardId] = applyArenaAnswer(memory[a.cardId], a.correct, now);
    }

    await AsyncStorage.setItem(key, JSON.stringify(memory));
    return true;
  } catch {
    return false;
  }
}
