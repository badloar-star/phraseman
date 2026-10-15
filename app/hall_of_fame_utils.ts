// зачем (§122, замер 04.10: streak_count ×8 multiGet, last_active_date ×9 за старт): чтения серии — через снапшот; запись
// (setItem/multiSet) идёт как раньше и выбрасывает ключ из снапшота, так что обновление серии видит актуальные значения.
import { readStoredItem, readStoredItems } from './storage_snapshot';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistLegacyPersonalProgressScalar } from '../modules/phone-state/legacy_mirror';

const IS_DEV_RUNTIME = typeof __DEV__ !== 'undefined' && __DEV__;
import { checkAchievements } from './achievements';
import { emitAppEvent } from './events';
import { logStreakExtended, logStreakLost } from './firebase';
import { incrementStreakLostCount } from './paywall_personalization';
import { foregroundActiveRunEndingAt, previousDateKey, repairDevSeededStreakInStorage } from './streak_safety';
import { isStreakFreezeActiveToday } from './streak_freeze';
import { emitPlusFreezeLimitToast, isAutoFreezeUndecided, resolveStreakFreezePending, writeStreakFreezePending } from './streak_freeze_pending';
import { STREAK_WEEK_MARKERS_KEY, addDaysToDateKey, recordStreakWeekMarker } from './streak_week_markers';
import { markActiveDay } from './friends_together/together_days';
import { classifyStreakTouch, hydrateStreakDayState, markStreakDayCounted, peekStreakDayState, resolveLegacyRuleDay } from './streak_day_signal';
import {
  dayKeyRelation,
  getLocalDayKey,
  getUtcDayKey,
  isDayBeforeYesterdayFlexible,
  isSameLocalOrUtcDay,
  isYesterdayFlexible,
} from './local_date';
import type { Lang } from '../constants/i18n';
import { resolveNotificationLang } from './notification_lang';
import type { AccountGenerationToken } from './account_generation';
import { DebugLogger } from './debug-logger';
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

// зачем (§AUTH-0110): прежде `uk ? uk : es ? es : ru` — пуш «серия потеряна» по-русски для 6 языков интерфейса.
const notificationLangFromStorageValue = (value: string | null): Lang => resolveNotificationLang(value, 'streak_lost');

function sendStreakWarningLazy(streak: number, lang: Lang): void {
  void import('./notifications')
    .then(({ sendStreakWarning }) => sendStreakWarning(streak, lang))
    .catch(noteSwallowedHandler('hall_of_fame_utils:promise_1'));
}

// ── Leaderboard (накопительный за всё время) ─────────────────────────────────
export interface LeaderEntry { name: string; points: number; lang: string; avatar?: string; uid?: string; }
export const LEADERBOARD_KEY = 'leaderboard';

export const loadLeaderboard = async (): Promise<LeaderEntry[]> => {
  try {
    const s = await AsyncStorage.getItem(LEADERBOARD_KEY);
    if (!s) return [];
    const parsed = JSON.parse(s);
    if (!Array.isArray(parsed)) return [];
    const arr: LeaderEntry[] = parsed;
    // Deduplicate: merge entries with same name (case-insensitive)
    const seen = new Map<string, LeaderEntry>();
    for (const e of arr) {
      if (!e || typeof e.name !== 'string') continue;
      const key = e.name.trim().toLowerCase();
      const existing = seen.get(key);
      if (existing) {
        existing.points += e.points;
        if (e.avatar) existing.avatar = e.avatar;
      } else {
        seen.set(key, { ...e, name: e.name.trim() });
      }
    }
    return Array.from(seen.values()).sort((a, b) => b.points - a.points);
  } catch (e) {
    if (IS_DEV_RUNTIME) console.warn('[hall_of_fame_utils]', e);
    return [];
  }
};

export const saveLeaderboard = async (entries: LeaderEntry[]) => {
  try { await AsyncStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries)); } catch (e) { if (IS_DEV_RUNTIME) console.warn('[hall_of_fame_utils]', e); }
};

// ── Week leaderboard (только за текущую неделю) ──────────────────────────────
export interface WeekEntry { name: string; points: number; lang: string; }
export const WEEK_BOARD_KEY = 'week_leaderboard';

export const loadWeekLeaderboard = async (): Promise<WeekEntry[]> => {
  try {
    const s = await AsyncStorage.getItem(WEEK_BOARD_KEY);
    if (!s) return [];
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    if (IS_DEV_RUNTIME) console.warn('[hall_of_fame_utils]', e);
    return [];
  }
};

export function parseWeekPointsForWeek(raw: string | null | undefined, weekKey: string = getWeekKey(new Date())): number {
  try {
    if (!raw) return 0;
    const data: { weekKey?: string; points?: number } = JSON.parse(raw);
    if (data.weekKey !== weekKey) return 0;
    const points = Number(data.points ?? 0);
    return Number.isFinite(points) ? points : 0;
  } catch (e) {
    if (IS_DEV_RUNTIME) console.warn('[hall_of_fame_utils]', e);
    return 0;
  }
}

export const resetWeekPointsIfStale = async (): Promise<void> => {
  try {
    const currentWeekKey = getWeekKey(new Date());
    const raw = await AsyncStorage.getItem('week_points_v2');
    if (!raw) return;
    const data: { weekKey?: string; points?: number } = JSON.parse(raw);
    if (data.weekKey !== currentWeekKey) {
      await AsyncStorage.multiSet([
        // Сохраняем финал завершившейся недели до обнуления для истории
        // недельного топа; данные не участвуют в удалённой лиговой механике.
        ['week_points_last_final', JSON.stringify({ weekKey: data.weekKey ?? '', points: Number(data.points ?? 0) || 0 })],
        ['week_points_v2', JSON.stringify({ weekKey: currentWeekKey, points: 0 })],
        ['week_points', '0'],
      ]);
    }
  } catch (e) {
    if (IS_DEV_RUNTIME) console.warn('[hall_of_fame_utils]', e);
  }
};

// Возвращает финальные очки завершившейся недели, сохранённые resetWeekPointsIfStale,
// если сохранённый weekKey совпадает с запрошенным weekId; иначе null.
export const getLastWeekFinalPoints = async (weekId: string): Promise<number | null> => {
  try {
    const raw = await AsyncStorage.getItem('week_points_last_final');
    if (!raw) return null;
    const data: { weekKey?: string; points?: number } = JSON.parse(raw);
    if (data.weekKey !== weekId) return null;
    const points = Number(data.points ?? 0);
    return Number.isFinite(points) ? points : null;
  } catch (e) {
    if (__DEV__) console.warn('[hall_of_fame_utils]', e);
    return null;
  }
};

const saveWeekLeaderboard = async (entries: WeekEntry[]) => {
  try { await AsyncStorage.setItem(WEEK_BOARD_KEY, JSON.stringify(entries)); } catch (e) { if (IS_DEV_RUNTIME) console.warn('[hall_of_fame_utils]', e); }
};

// ── ISO номер недели ──────────────────────────────────────────────────────────
export const getWeekKey = (d: Date): string => {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

// ── Получить недельные очки текущего пользователя ────────────────────────────
export const getMyWeekPoints = async (): Promise<number> => {
  return 0;
};

// ── Серия «раз в день» вне холодного старта ──────────────────────────────
// зачем (баг 01.10): серия обновлялась только на холодном старте и после Шпиля, поэтому
// день, прожитый из фона, её «сжигал». Возврат в приложение и любое завершённое занятие
// теперь тоже отмечают день — не чаще одного раза за локальный день (память процесса).
// §137 (04.10): день засчитывает только учебное действие (урок / карточки / «Мои ошибки»);
// открытие приложения и прочие действия лишь сверяют серию (сгорела → 0), см. streak_day_signal.ts.
let streakTouchedDayKey: string | null = null;
let streakSweptDayKey: string | null = null;
let streakCountInFlight: Promise<number> | null = null;
let streakPassiveInFlight: Promise<number> | null = null;
export function touchStreakForToday(reason: string): Promise<number> | null {
  const day = getLocalDayKey();
  if (streakTouchedDayKey === day) return null;
  const kind = classifyStreakTouch(reason);
  if (kind.mode === 'count') {
    if (streakCountInFlight) return streakCountInFlight;
    console.log(`[STREAK-DAY] touch reason=${reason} mode=count day=${day} afterPassive=${streakPassiveInFlight !== null}`);
    // зачем: учебное действие, пришедшее во время сверки, не теряется — засчитываем после неё.
    const afterPassive: Promise<unknown> = streakPassiveInFlight ?? Promise.resolve();
    streakCountInFlight = afterPassive
      .then(() => countStreakDay(reason, day))
      .finally(() => { streakCountInFlight = null; });
    return streakCountInFlight;
  }
  if (streakCountInFlight) return streakCountInFlight;
  if (streakPassiveInFlight) return streakPassiveInFlight;
  console.log(`[STREAK-DAY] touch reason=${reason} mode=passive day=${day}`);
  streakPassiveInFlight = resolveLegacyRuleDay(day)
    .then((legacy) => (legacy ? countStreakDay(`migration:${reason}`, day) : sweepStreakOnce(reason, day)))
    .finally(() => { streakPassiveInFlight = null; });
  return streakPassiveInFlight;
}

function sweepStreakOnce(reason: string, day: string): Promise<number> {
  if (streakSweptDayKey === day) {
    const known = peekStreakDayState();
    console.log(`[STREAK-DAY] sweep:skip already_swept reason=${reason} days=${String(known?.days ?? null)}`);
    return Promise.resolve(known?.days ?? -1);
  }
  return sweepStreakWithoutCounting(reason).then((streak) => {
    streakSweptDayKey = day;
    return streak;
  });
}

function countStreakDay(reason: string, day: string): Promise<number> {
  let wasCountedBefore = false;
  return readStoredItem('last_active_date')
    .then((lastActive) => { wasCountedBefore = lastActive === day; })
    .catch((error: unknown) => console.warn('[STREAK-DAY] count:read_last_failed', error instanceof Error ? error.message : String(error)))
    .then(() => updateStreakOnActivity())
    .then((streak) => {
      if (streak < 0) {
        // зачем (аудит Optimistic UI 13.10): запись серии не удалась — день НЕ помечаем (следующее учебное действие
        // попробует снова) и «засчитано» не публикуем, иначе тост врёт.
        console.warn(`[STREAK-DAY] count:not_saved reason=${reason} day=${day} — день не помечен, повтор при следующем действии`);
        return -1;
      }
      streakTouchedDayKey = day;
      streakSweptDayKey = day;
      markStreakDayCounted({ wasCountedBefore, days: streak, source: reason, today: day });
      // зачем (§59): раз в сутки отдать серию серверу, иначе облако отстаёт от телефона.
      void import('./streak_server_sync')
        .then(({ syncStreakToServerOncePerDay }) => syncStreakToServerOncePerDay(streak))
        .catch((error: unknown) => console.warn('[STREAK-SYNC] lazy_import_failed', String(error)));
      return streak;
    })
    .catch((error: unknown) => {
      console.warn('[STREAK-DAY] count:failed', error instanceof Error ? error.message : String(error));
      return -1;
    });
}

/**
 * §137: сверка без засчитывания дня (холодный старт, возврат, не-учебные действия).
 * Сгоревшая серия (пропущено ≥2 дней и журнал не лечит) → streak_count = 0; last_active_date
 * не трогаем — день засчитает только учебное действие. Пропуск ровно одного дня ждёт действия:
 * там решает заморозка Plus (без изменений).
 */
export const sweepStreakWithoutCounting = async (reason: string): Promise<number> => {
  try {
    const lastActive = await readStoredItem('last_active_date');
    const streak = parseInt(await readStoredItem('streak_count') || '0') || 0;
    const today = getLocalDayKey();
    if (!lastActive || isSameLocalOrUtcDay(lastActive) || isYesterdayFlexible(lastActive) || isDayBeforeYesterdayFlexible(lastActive)) {
      const branch = !lastActive ? 'no_history' : isSameLocalOrUtcDay(lastActive) ? 'counted_today' : isYesterdayFlexible(lastActive) ? 'alive_yesterday' : 'one_missed_await_activity';
      console.log(`[STREAK-DAY] sweep reason=${reason} branch=${branch} lastActive=${String(lastActive)} streak=${streak}`);
      hydrateStreakDayState(lastActive, streak, today);
      return streak;
    }
    let journalRunToYesterday = 0;
    try {
      const [{ getForegroundDailyMsMap }, { MIN_ACTIVE_MS }] = await Promise.all([
        import('./foreground_usage_ms'),
        import('../modules/stats_activity_rows'),
      ]);
      const utcToday = new Date().toISOString().split('T')[0]!;
      journalRunToYesterday = foregroundActiveRunEndingAt(await getForegroundDailyMsMap(), previousDateKey(utcToday), MIN_ACTIVE_MS);
    } catch (error) {
      console.warn('[STREAK-DAY] sweep:journal_read_failed', error instanceof Error ? error.message : String(error));
    }
    if (journalRunToYesterday >= 1 || streak <= 0) {
      console.log(`[STREAK-DAY] sweep reason=${reason} branch=${streak <= 0 ? 'already_zero' : 'journal_heal_await_activity'} lastActive=${lastActive} streak=${streak} journal=${journalRunToYesterday}`);
      hydrateStreakDayState(lastActive, streak, today);
      return streak;
    }
    console.warn(`[STREAK-DAY] sweep reason=${reason} branch=LOST lastActive=${lastActive} today=${today} ${streak}->0`);
    logStreakLost(streak);
    AsyncStorage.getItem('app_lang').then(l => sendStreakWarningLazy(streak, notificationLangFromStorageValue(l))).catch(noteSwallowedHandler('hall_of_fame_utils:sweep_warning'));
    incrementStreakLostCount();
    await persistLegacyPersonalProgressScalar(AsyncStorage, 'streak_count', 0);
    hydrateStreakDayState(lastActive, 0, today);
    return 0;
  } catch (e) {
    console.warn('[STREAK-DAY] sweep:failed', e instanceof Error ? e.message : String(e));
    return -1;
  }
};

/**
 * Закрыть отложенное решение заморозки Plus (streak_freeze_pending.ts). Не бросает: сбой — в журнал, серия как была.
 * Спасли → тот же звук, отметка недели и тост, что в обычной ветке заморозки; потеря → та же аналитика, что в ветке LOST.
 */
async function resolvePendingPlusFreeze(today: string): Promise<void> {
  try {
    await resolveStreakFreezePending(today, {
      tryFreeze: async (day) => (await import('./streak_auto_freeze')).tryAutoPremiumFreeze(day),
      readStreak: async () => parseInt(await readStoredItem('streak_count') || '0') || 0,
      writeStreak: (value) => persistLegacyPersonalProgressScalar(AsyncStorage, 'streak_count', value),
      onSaved: async (pending, streak) => {
        const freezeRaw = await AsyncStorage.getItem('streak_freeze');
        await AsyncStorage.setItem('streak_freeze', JSON.stringify({ ...(freezeRaw ? JSON.parse(freezeRaw) : {}), active: false }));
        import('../modules/audio/sound_director')
          .then(({ soundDirector }) => { soundDirector.request('pm.streak.saved', { scope: 'streak' }); })
          .catch((error: unknown) => console.warn('[STREAK-FREEZE] resolve:sound_failed', String(error)));
        await recordStreakWeekMarker(pending.gapDay, 'freeze').catch(noteSwallowedHandler('hall_of_fame_utils:pending_marker'));
        emitAppEvent('action_toast', {
          type: 'reward',
          messageRu: `Заморозка спасла цепочку ${streak} дн. 🧊`,
          messageUk: `Заморозка врятувала ланцюжок ${streak} дн. 🧊`,
          messageEs: `La congelación salvó tu racha de ${streak} días 🧊`,
        });
      },
      onLost: async (pending, reason) => {
        logStreakLost(pending.keptStreak);
        incrementStreakLostCount();
        if (reason === 'month_limit') emitPlusFreezeLimitToast();
      },
    });
  } catch (error) {
    console.warn('[STREAK-FREEZE] resolve:failed', error instanceof Error ? error.message : String(error));
  }
}

// ── Обновить цепочку дней подряд при активности ───────────────────────────
// Вызывать при ЛЮБОМ начислении опыта
export const updateStreakOnActivity = async (
  accountToken?: AccountGenerationToken,
): Promise<number> => {
  try {
    // зачем (баг 01.10): временная трассировка — вход и сырые значения до любых правок.
    const [[, rawStreak], [, rawLast], [, rawStreakLast]] = await readStoredItems(['streak_count', 'last_active_date', 'streak_last_date']);
    console.log(`[STREAK] update:called streak_count=${String(rawStreak)} last_active_date=${String(rawLast)} streak_last_date=${String(rawStreakLast)}`);
    // зачем: D107 — защита серии «Путешествием дня» и починка уроком удалены;
    // пропуск спасает только бесплатная заморозка Plus (streak_freeze ниже).
    const repaired = await repairDevSeededStreakInStorage();
    if (repaired !== null) console.warn(`[STREAK] update:dev_seed_repair -> ${repaired}`);

    // Ключ дня — ЛОКАЛЬНАЯ дата устройства: пользователь, занимающийся каждый
    // календарный день у себя дома вечером в UTC+N или утром в UTC-N, не должен
    // терять стрик из-за того, что его локальный день не совпал с UTC-днём.
    // isSameLocalOrUtcDay/isYesterdayFlexible/isDayBeforeYesterdayFlexible
    // на переходный период принимают И старый (UTC), И новый (локальный) ключ —
    // last_active_date, записанный ДО этого апдейта, ещё может быть в старой схеме.
    const today = getLocalDayKey();
    const lastActiveKey = 'last_active_date';
    // зачем (координатор 15.10, 🔴): заморозка Plus, отложенная из-за неизвестного статуса Plus, решается ДО чтения серии ниже.
    await resolvePendingPlusFreeze(today);
    const lastActive = await readStoredItem(lastActiveKey);

    let streak = parseInt(await readStoredItem('streak_count') || '0');
    // зачем (баг «Дизайна» 01.10: серия 1 при 6 днях подряд): временная трассировка [STREAK] —
    // вход, ветка и значения, что её решили. Убрать после диагноза, ранние выходы оставить.
    const streakBefore = streak;
    console.log(`[STREAK] update:enter today=${today} utcToday=${getUtcDayKey()} lastActive=${String(lastActive)} streak=${streak} relation=${dayKeyRelation(lastActive)} sameDay=${isSameLocalOrUtcDay(lastActive)} yesterday=${isYesterdayFlexible(lastActive)}`);

    // зачем (баг 01.10, диагноз по [STREAK]): серия обновлялась только на холодном старте —
    // день, прожитый без холодного старта (приложение из фона), не сдвигал last_active_date,
    // и следующий старт «сжигал» серию, хотя журнал времени в приложении помнил каждый день.
    // Сверяемся с тем же журналом и порогом, что неделя на «Твоих результатах».
    let journalRunToYesterday = 0;
    try {
      const [{ getForegroundDailyMsMap }, { MIN_ACTIVE_MS }] = await Promise.all([
        import('./foreground_usage_ms'),
        import('../modules/stats_activity_rows'),
      ]);
      const msByDate = await getForegroundDailyMsMap();
      // Ключи журнала — UTC-даты; «вчера» берём в той же шкале.
      const utcToday = new Date().toISOString().split('T')[0]!;
      journalRunToYesterday = foregroundActiveRunEndingAt(msByDate, previousDateKey(utcToday), MIN_ACTIVE_MS);
    } catch (error) {
      console.warn('[STREAK] update:journal_read_failed', error instanceof Error ? error.message : String(error));
    }
    console.log(`[STREAK] update:journal runToYesterday=${journalRunToYesterday}`);

    if (isSameLocalOrUtcDay(lastActive)) {
      // Уже активны сегодня — цепочку не меняем
      console.log(`[STREAK] update:branch=same_day keep=${streak}`);
    } else if (isYesterdayFlexible(lastActive)) {
      // Активны вчера — продолжаем цепочку
      streak += 1;
      console.log(`[STREAK] update:branch=yesterday ${streakBefore}->${streak}`);
      logStreakExtended(streak);
    } else {
      // Пропустили день — проверяем заморозку / починку цепочки
      const missedExactlyOneDay = lastActive !== null && isDayBeforeYesterdayFlexible(lastActive);

      const freezeRaw = await AsyncStorage.getItem('streak_freeze');
      const freeze = freezeRaw ? JSON.parse(freezeRaw) : null;

      // 1. Заморозка активна и пропущен ровно 1 день
      // зачем: если журнал помнит вчерашний день, заморозку не тратим — цепочка не рвалась.
      // Q94 (D107): у Plus заморозка применяется сама, без кнопки, в пределах месячного лимита.
      const canFreeze = journalRunToYesterday < 1 && lastActive !== null && missedExactlyOneDay;
      const manualFreeze = isStreakFreezeActiveToday(freeze, today);
      const autoResult = canFreeze && !manualFreeze
        ? await (await import('./streak_auto_freeze')).tryAutoPremiumFreeze(today)
        : null;
      const autoFreeze = autoResult?.applied === true;
      // зачем (координатор 15.10, 🔴): статус Plus неизвестен (долгая проверка, аккаунт не поднят, сбой записи) — НЕ сбрасываем.
      const autoUndecided = isAutoFreezeUndecided(autoResult);
      if (canFreeze) console.log(`[STREAK-FREEZE] update:freeze_check manual=${manualFreeze} auto=${autoResult ? (autoResult.applied ? 'applied' : autoResult.reason) : 'not_tried'} lastActive=${String(lastActive)} streak=${streak}`);
      if (canFreeze && lastActive && (manualFreeze || autoFreeze)) {
        await AsyncStorage.setItem('streak_freeze', JSON.stringify({ ...freeze, active: false }));
        import('../modules/audio/sound_director')
          .then(({ soundDirector }) => { soundDirector.request('pm.streak.saved', { scope: 'streak' }); })
          .catch((error: unknown) => console.warn('[STREAK] update:freeze_sound_failed', String(error)));
        await recordStreakWeekMarker(addDaysToDateKey(lastActive, 1), 'freeze').catch(noteSwallowedHandler('hall_of_fame_utils:promise_2'));
        // streak не меняем — заморозка спасла. Расходник потрачен — юзер должен узнать
        // (аудит «немых мест» 2026-06-11, находка №6).
        emitAppEvent('action_toast', {
          type: 'reward',
          messageRu: `Заморозка спасла цепочку ${streak} дн. 🧊`,
          messageUk: `Заморозка врятувала ланцюжок ${streak} дн. 🧊`,
          messageEs: `La congelación salvó tu racha de ${streak} días 🧊`,
        });
      }
      // 1б. Статус Plus неизвестен — серия цела, решение отложено до известного статуса (streak_freeze_pending.ts)
      else if (canFreeze && lastActive && autoUndecided && autoResult && !autoResult.applied) {
        console.warn(`[STREAK-FREEZE] update:branch=pending reason=${autoResult.reason} keep=${streak}`);
        await writeStreakFreezePending({ gapDay: addDaysToDateKey(lastActive, 1), keptStreak: streak, createdDay: today, reason: autoResult.reason });
      }
      // 2. Первый вход в приложение
      else if (lastActive === null) {
        console.log(`[STREAK] update:branch=first_launch ${streakBefore}->1`);
        streak = 1;
      }
      // 3. Журнал показывает, что вчера человек был активен — цепочка не прерывалась,
      //    просто вчерашний день прошёл без холодного старта.
      else if (journalRunToYesterday >= 1) {
        const healed = Math.max(streak + 1, journalRunToYesterday + 1);
        console.log(`[STREAK] update:branch=journal_continuity lastActive=${String(lastActive)} ${streakBefore}->${healed}`);
        streak = healed;
        logStreakExtended(streak);
      }
      // 4. Цепочка потеряна
      else {
        const prevStreak = streak;
        console.warn(`[STREAK] update:branch=LOST lastActive=${String(lastActive)} today=${today} missedExactlyOneDay=${missedExactlyOneDay} freezeActive=${isStreakFreezeActiveToday(freeze, today)} ${prevStreak}->1`);
        // зачем (§137): сверка на старте уже обнулила серию и отчиталась о потере — не дублируем.
        if (prevStreak > 0) {
          logStreakLost(prevStreak);
          AsyncStorage.getItem('app_lang').then(l => sendStreakWarningLazy(prevStreak, notificationLangFromStorageValue(l))).catch(noteSwallowedHandler('hall_of_fame_utils:promise_3'));
          // зачем: D101 — восстановление серии за жемчуг удалено: серия просто сбрасывается.
          incrementStreakLostCount();
        } else {
          console.log('[STREAK-DAY] update:lost_already_reported_by_sweep');
        }
        // зачем (координатор 15.10): Plus есть, а заморозки месяца кончились — человек должен понять, почему серия сгорела.
        if (autoResult && !autoResult.applied && autoResult.reason === 'month_limit') emitPlusFreezeLimitToast();
        streak = 1;
      }
    }

    // зачем (баг 01.10): уже сожжённая серия восстанавливается по журналу — если журнал
    // помнит больше дней подряд, чем счётчик, берём журнал (вчера + сегодня).
    if (journalRunToYesterday >= 1 && journalRunToYesterday + 1 > streak) {
      console.log(`[STREAK] update:heal_from_journal ${streak}->${journalRunToYesterday + 1}`);
      streak = journalRunToYesterday + 1;
    }

    // Сохраняем цепочку
    await persistLegacyPersonalProgressScalar(AsyncStorage, 'streak_count', streak);
    await AsyncStorage.setItem(lastActiveKey, today);

    // зачем («Вместе», friends_together): рядом с last_active_date копим ПОЛНУЮ
    // историю активных дней (окно 120 дней) — она нужна другим людям (друзьям),
    // не только своему стрику, чтобы посчитать пересечение "дней вместе". Не
    // трогает логику стрика выше — чисто аддитивная запись.
    try {
      const activeDaysRaw = await AsyncStorage.getItem('active_days_v1');
      const activeDaysState = activeDaysRaw ? (JSON.parse(activeDaysRaw) as { anchor?: unknown; bits?: unknown }) : null;
      const validState = activeDaysState && typeof activeDaysState.anchor === 'string' && typeof activeDaysState.bits === 'string'
        ? { anchor: activeDaysState.anchor, bits: activeDaysState.bits }
        : null;
      const nextActiveDays = markActiveDay(validState, today);
      if (nextActiveDays.anchor) {
        await AsyncStorage.setItem('active_days_v1', JSON.stringify(nextActiveDays));
      }
    } catch (e) {
      if (IS_DEV_RUNTIME) console.warn('[hall_of_fame_utils] active_days_v1', e);
    }

    // Достижения по цепочке (только при реальном изменении — не в firstLoads)
    if (!isSameLocalOrUtcDay(lastActive)) {
      checkAchievements({ type: 'active_day', activeDate: today, previousActiveDate: lastActive }, accountToken).catch(noteSwallowedHandler('hall_of_fame_utils:promise_4'));
      checkAchievements({ type: 'streak', streak }, accountToken).catch(noteSwallowedHandler('hall_of_fame_utils:promise_5'));
    }

    return streak;
  } catch (e) {
    // зачем: сбой обновления серии раньше был слышен только в dev — теперь всегда (catch не немой).
    console.warn('[STREAK] update:failed', e instanceof Error ? e.message : String(e));
    // зачем (аудит Optimistic UI 13.10): прежний `0` вызывающие принимали за успех — день помечался засчитанным, тост
    // «День засчитан 🔥 1» показывался, хотя ничего не записано. `-1` — общий знак «серии нет / не сохранено».
    return -1;
  }
};

/**
 * Проверяет, потеряет ли пользователь цепочку при следующей активности.
 * Вызывается из home.tsx при загрузке — НЕ изменяет storage.
 *
 * Возвращает { willLose: true } когда:
 *  - была цепочка > 1
 *  - пропущен ровно 1 день (заморозка ещё может помочь)
 *  - заморозка не активна
 *  - не premium
 *
 * Если пропущено 2+ дня — freeze всё равно не поможет, поэтому не предлагаем.
 */
export const checkStreakLossPending = async (): Promise<{ willLose: boolean; streakBefore: number }> => {
  try {
    const lastActive = await readStoredItem('last_active_date');
    // Уже активен сегодня или вчера — цепочка в порядке
    if (!lastActive || isSameLocalOrUtcDay(lastActive) || isYesterdayFlexible(lastActive)) {
      return { willLose: false, streakBefore: 0 };
    }
    // Пропущено более 1 дня — заморозка уже не поможет, не показываем
    if (!isDayBeforeYesterdayFlexible(lastActive)) {
      return { willLose: false, streakBefore: 0 };
    }

    const streak = parseInt(await readStoredItem('streak_count') || '0');
    if (streak <= 1) return { willLose: false, streakBefore: streak };

    const freezeRaw = await AsyncStorage.getItem('streak_freeze');
    const freeze = freezeRaw ? JSON.parse(freezeRaw) : null;
    const todayStr = getLocalDayKey();
    // Заморозка уже активна сегодня — цепочка сохранится автоматически
    if (isStreakFreezeActiveToday(freeze, todayStr)) return { willLose: false, streakBefore: streak };

    return { willLose: true, streakBefore: streak };
  } catch (e) {
    if (IS_DEV_RUNTIME) console.warn('[hall_of_fame_utils]', e);
    return { willLose: false, streakBefore: 0 };
  }
};

// ── Сбросить всю статистику (для отладки / по запросу) ───────────────────────
export const resetAllStats = async () => {
  const keys = [
    'leaderboard', 'week_leaderboard', 'week_board_meta',
    'week_points', 'week_points_v2',
    'daily_stats',
    'streak_count', 'last_active_date',
    STREAK_WEEK_MARKERS_KEY,
  ];
  for (const key of keys) {
    try { await AsyncStorage.removeItem(key); } catch (e) { if (IS_DEV_RUNTIME) console.warn('[hall_of_fame_utils]', e); }
  }
};

// Required by Expo Router — not a screen
export default {};
