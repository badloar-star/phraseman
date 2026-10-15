// зачем (§137, 04.10, решение Fable B): день серии засчитывается за первое ЗАВЕРШЁННОЕ учебное
// действие дня (урок, тренировка карточек, «Мои ошибки»), а не за открытие приложения — иначе
// серии «пустые» и непонятно, как считаются. Здесь — правило, мягкий переход и единый локальный
// сигнал «день засчитан» для серии, Главной и «Твоих результатов» (без сети, мгновенно).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';
import { getLocalDayKey } from './local_date';
import { recordStreakMilestoneStory } from '../modules/story_events/story_event_sources';
import { isStreakMilestone } from '../components/streak/moments/streak_milestones';
import { noteStreakMilestonePending } from './streak_milestone_pending';
import { onAccountOwnerChanged } from './account_owner_change';

/**
 * Вид задания «Сегодня» для ступеней Шпиля. Шпиль по смыслу тоже засчитывает день, но это зона Codex:
 * подключение — одной строкой, добавить STREAK_DAY_SPIRE_KIND в набор ниже (решение координатора 04.10).
 */
export const STREAK_DAY_SPIRE_KIND = 'spire_steps';

/**
 * Действия, которые засчитывают день серии (§137): урок, тренировка карточек, «Мои ошибки» и
 * завершённый разговор (диалог — настоящая речевая практика, координатор 04.10). Видео — нет (пассивно).
 */
// зачем (R35, Ревизор 15.10): ступень Пика засчитывала день «в обход» (updateStreakOnActivity напрямую) — огонь контурный,
// нет «День засчитан», рубежа, истории и синка серии. Теперь Пик идёт общим путём touchStreakForToday('activity:spire_steps').
export const STREAK_DAY_ACTIVITY_KINDS: ReadonlySet<string> = new Set(['lesson', 'cards', 'mistakes', 'dialog', STREAK_DAY_SPIRE_KIND]);

/** День первого запуска с правилом §137: в этот день открытие ещё засчитывается по старому правилу. */
export const STREAK_RULE_V137_SINCE_KEY = 'streak_rule_v137_since';

export type StreakTouchKind =
  | Readonly<{ mode: 'count'; activity: string }>
  | Readonly<{ mode: 'passive'; source: string }>;

/** `activity:<kind>` засчитывает день только для учебных видов; остальное — пассивная сверка. */
export function classifyStreakTouch(reason: string): StreakTouchKind {
  if (reason.startsWith('activity:')) {
    const activity = reason.slice('activity:'.length);
    if (STREAK_DAY_ACTIVITY_KINDS.has(activity)) return { mode: 'count', activity };
  }
  return { mode: 'passive', source: reason };
}

/**
 * Мягкий переход: в день установки обновления открытие засчитывается по старому правилу.
 * `since` — сохранённый день первого запуска с §137 (null — первый запуск сейчас).
 */
export function isLegacyRuleDay(since: string | null, today: string): boolean {
  return since === null || since === today;
}

/** Читает/записывает день перехода. Сбой хранилища — считаем днём перехода (не теряем день). */
export async function resolveLegacyRuleDay(today: string = getLocalDayKey()): Promise<boolean> {
  try {
    const since = await AsyncStorage.getItem(STREAK_RULE_V137_SINCE_KEY);
    if (since === null) await AsyncStorage.setItem(STREAK_RULE_V137_SINCE_KEY, today);
    const legacy = isLegacyRuleDay(since, today);
    console.log(`[STREAK-DAY] migration since=${String(since)} today=${today} legacyRuleDay=${legacy}`);
    return legacy;
  } catch (error: unknown) {
    console.warn('[STREAK-DAY] migration:read_failed — день считаем по старому правилу', error instanceof Error ? error.message : String(error));
    return true;
  }
}

export type StreakDayState = Readonly<{ dayKey: string; counted: boolean; days: number }>;

let state: StreakDayState | null = null;
const listeners = new Set<(next: StreakDayState) => void>();
// зачем (координатор 15.10, LOGOUT_WIPE_AUDIT 🔴): кэш в памяти принадлежит владельцу — при смене аккаунта без перезапуска JS B видел данные A.
onAccountOwnerChanged('streak_day_signal', () => { state = null; });

/**
 * Синхронно: засчитан ли сегодняшний день. null — ещё неизвестно (до первой сверки на старте):
 * UI в этом случае не показывает «не засчитано», чтобы не мигать ложным состоянием.
 */
export function peekStreakDayState(): StreakDayState | null {
  if (!state) return null;
  if (state.dayKey !== getLocalDayKey()) return { dayKey: getLocalDayKey(), counted: false, days: state.days };
  return state;
}

export function subscribeStreakDayState(listener: (next: StreakDayState) => void): () => void {
  listeners.add(listener); // guard-ok: подписка в памяти, не запись данных
  return () => { listeners.delete(listener); };
}

function publish(next: StreakDayState): void {
  state = next;
  for (const listener of Array.from(listeners)) {
    try { listener(next); } catch (error: unknown) {
      console.warn('[STREAK-DAY] listener_failed', error instanceof Error ? error.message : String(error));
    }
  }
}

/** Сверка на старте/возврате: заполняет состояние из сохранённых значений, ничего не засчитывая. */
export function hydrateStreakDayState(lastActive: string | null, days: number, today: string = getLocalDayKey()): void {
  const next = { dayKey: today, counted: lastActive === today, days };
  console.log(`[STREAK-DAY] hydrate lastActive=${String(lastActive)} today=${today} counted=${next.counted} days=${days}`);
  publish(next);
}

/**
 * День засчитан. Событие `streak_day_counted` стреляет ТОЛЬКО на переходе «не засчитан → засчитан»
 * (первое действие дня), локально, до любой синхронизации с сервером.
 */
export function markStreakDayCounted(input: Readonly<{ wasCountedBefore: boolean; days: number; source: string; today?: string }>): void {
  const today = input.today ?? getLocalDayKey();
  publish({ dayKey: today, counted: true, days: input.days });
  if (input.wasCountedBefore) {
    console.log(`[STREAK-DAY] counted:already source=${input.source} days=${input.days}`);
    return;
  }
  console.log(`[STREAK-DAY] counted:first source=${input.source} days=${input.days} day=${today}`);
  emitAppEvent('streak_day_counted', { days: input.days, dayKey: today, source: input.source });
  // зачем (координатор 15.10): рубеж ждёт показа в памяти до экрана итога (урок/разговор), окно покажет StreakMilestoneHost за флагом moments_v3; на диск не пишется
  if (isStreakMilestone(input.days)) noteStreakMilestonePending(input.days, today);
  void recordStreakMilestoneStory(input.days, today); // зачем (D192): факт → история у аватарки на Главной; за флагом stories_v1, без сети, поведение места не меняется.
}

/** Только для тестов. */
export function __resetStreakDayStateForTests(): void {
  state = null;
  listeners.clear();
}
