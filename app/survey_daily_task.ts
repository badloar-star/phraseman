// ════════════════════════════════════════════════════════════════════════════
// survey_daily_task.ts — опрос как 4-е задание «Вызовов дня».
//
// Опрос показывается 4-й плашкой в списке заданий (когда активен). Награда «за
// все задания» даётся за любые 3 из 4 (см. areAllDailyTaskObjectivesDone с
// requiredCount). Здесь — локальная метка «опрос пройден сегодня» и хук, который
// сообщает экрану заданий { present, done }, чтобы посчитать 4-ю плашку.
//
// Почему локальная метка: сервер getActiveShardSurvey перестаёт отдавать опрос
// после прохождения (фильтрует пройденные), поэтому «present» становится false —
// а нам ещё нужно показать плашку как ВЫПОЛНЕННУЮ до конца дня. Метку пишем при
// успешном submit; читаем на экране заданий.
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayKey } from './daily_tasks';

const SURVEY_DONE_KEY = 'shard_survey_done_daykey_v1';

/** Пометить, что опрос пройден в текущий день (UTC-независимый локальный ключ). */
export async function markSurveyDailyTaskDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(SURVEY_DONE_KEY, getTodayKey());
  } catch {
    /* метка не критична — best-effort */
  }
}

/** Пройден ли опрос сегодня (метка совпадает с текущим днём). */
export async function isSurveyDailyTaskDoneToday(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(SURVEY_DONE_KEY);
    return v === getTodayKey();
  } catch {
    return false;
  }
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
