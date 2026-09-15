/**
 * Награда за урок с Максом: опыт и защита от фарма.
 *
 * зачем: урок закрывался карточкой «Урок пройден» и не давал НИЧЕГО — ни опыта,
 * ни следа в прогрессе. Обычный диалог за то же время начисляет опыт, и человек
 * быстро понял бы, что учиться у Макса невыгодно. Класс бага знакомый: экран
 * показали, награду не начислили.
 *
 * Почему дедуп по ДНЮ, а не по сценарию (как у диалогов): сценарий проходят
 * один раз, поэтому там ключ по id сценария. Урок с Максом повторяем по замыслу
 * — он каждый раз про новое. Запрет «один раз навсегда» убил бы саму фичу, а
 * отсутствие запрета сделал бы её фермой: закрыть урок можно быстро.
 * Компромисс — опыт раз в сутки, остальные уроки идут ради самого обучения.
 *
 * Модуль чистый (без React): расчёт проверяется тестом, экран получает готовое
 * решение.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAX_DIALOG_XP } from './config';

/** Ключ последнего дня, за который начислен опыт урока. */
const LAST_AWARD_DAY_KEY = 'tutor_lesson_xp_day_v1';

/**
 * Опыт за урок. Равен полному опыту успешного диалога: урок стоит той же
 * дневной реплики и того же времени, поэтому платить за него меньше — значит
 * подталкивать человека прочь от обучения к ролевой игре.
 */
export const TUTOR_LESSON_XP = MAX_DIALOG_XP;

/** Локальный день (не UTC): сутки считаются по часам человека, а не сервера. */
export function localDayKey(nowMs: number): string {
  const d = new Date(nowMs);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export interface TutorRewardDecision {
  /** Сколько опыта начислить (0 — сегодня уже начисляли). */
  xp: number;
  /** Причина решения — уходит в лог, чтобы «почему не дали» было видно. */
  reason: 'granted' | 'already_today';
  /** День, которым помечаем начисление. */
  dayKey: string;
}

/**
 * Решение о награде по последнему начисленному дню. Чистая функция: вход —
 * прочитанное значение, выход — что делать. Ввод/вывод делает вызывающий.
 */
export function decideTutorReward(lastAwardedDay: string | null, nowMs: number): TutorRewardDecision {
  const dayKey = localDayKey(nowMs);
  if (lastAwardedDay === dayKey) {
    return { xp: 0, reason: 'already_today', dayKey };
  }
  return { xp: TUTOR_LESSON_XP, reason: 'granted', dayKey };
}

/**
 * Читает день последнего начисления. Сбой чтения трактуем как «не начисляли»:
 * лучше выдать опыт дважды за сутки, чем молча не выдать вовсе — второе человек
 * воспримет как обман, первое он даже не заметит.
 */
export async function readLastTutorAwardDay(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_AWARD_DAY_KEY);
  } catch (error) {
    console.log('[TUTOR-REWARD] read failed', String((error as { message?: unknown })?.message ?? error));
    return null;
  }
}

/** Помечает день как оплаченный. Сбой записи логируем, но урок не ломаем. */
export async function markTutorAwardDay(dayKey: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_AWARD_DAY_KEY, dayKey);
  } catch (error) {
    console.log('[TUTOR-REWARD] write failed', String((error as { message?: unknown })?.message ?? error));
  }
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
