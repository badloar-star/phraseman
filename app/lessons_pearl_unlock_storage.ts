/**
 * lessons_pearl_unlock_storage.ts — ТОЛЬКО чтение списка уроков, купленных за
 * жемчужины, и имя ключа. Ни строки про деньги.
 *
 * зачем отдельным файлом (аудит скорости этой же правки): проверки доступа
 * (`lesson_lock_system`) грузит Главная. Если бы они импортировали модуль
 * покупки, за ними на холодный старт приехала бы вся экономика —
 * `shards_system` + леджер операций, больше 4000 строк, ради одного
 * `getItem`. Покупка (`lessons_pearl_unlock.ts`) импортирует этот файл, а не
 * наоборот, поэтому тяжёлый код подтягивается только на экране, где реально
 * жмут кнопку.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import { DebugLogger } from './debug-logger';

export const PURCHASED_LESSONS_KEY_PREFIX = 'lessons_pearl_unlocked_v1';

/** Ключ списка купленных уроков. Французский курс считается отдельно. */
export function purchasedLessonsKey(studyTarget?: RuntimeStudyTarget): string {
  const target = storageStudyTarget(studyTarget);
  return target === 'fr' ? `${PURCHASED_LESSONS_KEY_PREFIX}_fr` : PURCHASED_LESSONS_KEY_PREFIX;
}

/** Разбор списка id уроков. Всё, что не похоже на урок 1..32, отбрасываем. */
export function parsePurchasedLessonList(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed.filter(
          (n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 32,
        ),
      ),
    ).sort((a, b) => a - b);
  } catch (error: unknown) {
    // зачем: немой catch запрещён — битый список молча превратил бы купленный
    // урок в закрытый, и человек решил бы, что у него пропали жемчужины.
    DebugLogger.error(
      'lessons_pearl_unlock:parse',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    return [];
  }
}

/** Список купленных уроков (отсортирован, без повторов). */
export async function readPurchasedLessons(
  studyTarget?: RuntimeStudyTarget,
): Promise<number[]> {
  try {
    return parsePurchasedLessonList(await AsyncStorage.getItem(purchasedLessonsKey(studyTarget)));
  } catch (error: unknown) {
    DebugLogger.error(
      'lessons_pearl_unlock:read',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    return [];
  }
}

export async function isLessonPurchasedWithPearls(
  lessonId: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> {
  return (await readPurchasedLessons(studyTarget)).includes(lessonId);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
