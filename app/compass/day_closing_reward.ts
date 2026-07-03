/**
 * Компас — начисление награды за закрытие дня. Применяющий слой над
 * day_closing_reward_rules (чистые правила там, сайд-эффекты здесь).
 *
 * КАНАЛ: registerXP('daily_task_reward') с идемпотентным eventId — ритуал
 * закрытия дня и есть ежедневный ритуал-награда, сервер этот источник уже
 * принимает (новый XPSource не заводим, серверный контракт не трогаем).
 * Локальный guard-ключ на день дублирует идемпотентность на случай оффлайна.
 *
 * ИЗОЛЯЦИЯ: начисление только при compassEconomyOn(); при выключенном крыле
 * серия всё равно ведётся (это память ритуала, не экономика). Award-guard пишем
 * только после попытки начисления, чтобы transient XP-сбой не помечал награду
 * полученной навсегда.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../../constants/i18n';
import { registerXP } from '../xp_manager';
import { storageStudyTarget, type RuntimeStudyTarget } from '../target_storage_keys';
import { compassEconomyOn } from './compass_flags';
import type { DayClosingRitual } from './day_closing_ritual';
import {
  computeDayClosingRewardXp,
  nextDayClosingStreak,
  parseDayClosingStreak,
  type DayClosingStreak,
} from './day_closing_reward_rules';

const STREAK_KEY = 'compass_day_closing_streak_v1';
const AWARDED_PREFIX = 'compass_day_closing_awarded_v1';

function awardedKey(studyTarget: RuntimeStudyTarget, dateKey: string): string {
  return `${AWARDED_PREFIX}_${storageStudyTarget(studyTarget)}_${dateKey}`;
}

/** Текущая серия закрытых дней (для бейджа в шапке ритуала). */
export async function loadDayClosingStreak(): Promise<DayClosingStreak> {
  const raw = await AsyncStorage.getItem(STREAK_KEY).catch(() => null);
  return parseDayClosingStreak(raw);
}

export interface DayClosingAwardResult {
  /** Начисленный (или уже начисленный ранее) XP за этот день. */
  xp: number;
  /** Серия закрытых дней после этого закрытия. */
  streak: number;
  /** false = сегодня уже награждали (повторный вызов ничего не начислил). */
  awarded: boolean;
}

/**
 * Закрыть день с наградой: продвинуть серию + начислить XP ровно один раз за
 * dateKey. Повторный вызов в тот же день безопасен (idempotent).
 */
export async function awardDayClosingOnce(params: {
  studyTarget: RuntimeStudyTarget;
  ritual: DayClosingRitual;
  lang: Lang;
}): Promise<DayClosingAwardResult> {
  const { studyTarget, ritual, lang } = params;
  const xp = computeDayClosingRewardXp(ritual);

  const prev = await loadDayClosingStreak();
  const streak = nextDayClosingStreak(prev, ritual.dateKey);
  if (streak !== prev) {
    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(streak)).catch(() => {});
  }

  const guard = awardedKey(studyTarget, ritual.dateKey);
  const already = await AsyncStorage.getItem(guard).catch(() => null);
  if (already != null) return { xp, streak: streak.count, awarded: false };
  if (compassEconomyOn()) {
    const userName = (await AsyncStorage.getItem('user_name')) ?? '';
    await registerXP(xp, 'daily_task_reward', userName, lang, undefined, {
      eventId: `compass:day_close:${storageStudyTarget(studyTarget)}:${ritual.dateKey}`,
      payload: { studyTarget, dateKey: ritual.dateKey, kind: 'compass_day_closing' },
    });
  }

  await AsyncStorage.setItem(guard, '1').catch(() => {});
  return { xp, streak: streak.count, awarded: true };
}
