/**
 * Своя запись «Итога недели» (идея 6) — чтение дневных данных телефона и запись friends_week_v1.
 *
 * зачем (закон владельца «телефон решает и выдаёт сразу, сервер только хранит записи»; координатор 22.10): всё локально — занятия
 * по дням (stats_daily_breakdown по начатым языкам), дни активности (active_days_v1), серия (streak_count), этаж Пика идущей недели
 * (spire_week_v1:{uid}:{язык}). Запись поменялась — кладём её и просим синхронизацию: та склеивает вызовы раз в 5 минут, отдельных
 * записей в Firestore нет. Выключатель интерфейса «Вместе» выключен — ничего не пишем: друзья этих данных пока не видят.
 * Дневные счётчики занятий ведутся по дате UTC: у далёких поясов занятие около полуночи может попасть в соседний день — для итога
 * недели это допустимо (сумма за неделю почти всегда та же).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureAccountGeneration } from '../account_generation';
import { syncToCloud } from '../cloud_sync';
import { getLocalDayKey } from '../local_date';
import { statsDailyBreakdownKey } from '../target_storage_keys';
import { spireWeekLocalKey, type SpireLang } from '../../modules/spire/report_queue';
import { spireDecodeWeekLocal } from '../../modules/spire/report_store';
import {
  FRIEND_WEEK_STORAGE_KEY,
  isoWeekKeyUtc,
  nextMyFriendWeekRecord,
  parseFriendWeekRecord,
  serializeFriendWeekRecord,
  type FriendWeekRecord,
} from './friend_week';
import { FRIENDS_TOGETHER_UI_ENABLED } from './together_config';
import { decodeActiveDays, readMyActiveDays } from './together_store';

const LOG = '[FRIEND-WEEK]';
const SPIRE_LANGS: readonly SpireLang[] = ['en', 'es', 'de', 'fr', 'it'];

function parseObject(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    console.warn(`${LOG} дневные счётчики не разобрались (длина=${raw.length}) — считаем их пустыми`); // guard-ok: причина пустых данных
    return {};
  }
}

/** Занятия по дням — сумма по всем начатым языкам (у каждого свой ключ счётчиков). */
async function readLessonsByDay(): Promise<Record<string, number>> {
  let started: string[] = [];
  try {
    const raw = await AsyncStorage.getItem('study_languages_started_v1');
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    started = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch (error) {
    console.warn(`${LOG} начатые языки не прочитались (${error instanceof Error ? error.message : String(error)}) — только основной счётчик`); // guard-ok
  }
  const keys = [...new Set([statsDailyBreakdownKey(undefined), ...started.map((lang) => statsDailyBreakdownKey(lang))])];
  const rows = await AsyncStorage.multiGet(keys);
  const byDay: Record<string, number> = {};
  for (const [, raw] of rows) {
    for (const [day, row] of Object.entries(parseObject(raw))) {
      const n = Math.floor(Number((row as Record<string, unknown> | null)?.lessons_completed));
      if (Number.isFinite(n) && n > 0) byDay[day] = (byDay[day] ?? 0) + n;
    }
  }
  return byDay;
}

async function readStreakNow(): Promise<number> {
  const n = Math.floor(Number(await AsyncStorage.getItem('streak_count')));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Лучший этаж Пика идущей недели среди языков; null — запись другой недели или Пика не было. */
async function readFloorThisWeek(nowMs: number): Promise<number | null> {
  const uid = captureAccountGeneration().stableId;
  if (!uid) return null;
  const weekKey = isoWeekKeyUtc(nowMs);
  const rows = await AsyncStorage.multiGet(SPIRE_LANGS.map((lang) => spireWeekLocalKey(uid, lang)));
  let best: number | null = null;
  for (let i = 0; i < rows.length; i += 1) {
    const local = spireDecodeWeekLocal(rows[i]![1], SPIRE_LANGS[i]!);
    if (local && local.weekKey === weekKey && local.floor > 0) best = Math.max(best ?? 0, local.floor);
  }
  return best;
}

export async function readMyFriendWeek(): Promise<FriendWeekRecord | null> {
  return parseFriendWeekRecord(await AsyncStorage.getItem(FRIEND_WEEK_STORAGE_KEY));
}

/**
 * Пересчитать свою неделю и, если запись изменилась, положить её. Вызывается после занятия и при входе на вкладку «Друзья».
 * Возвращает актуальную запись (null — выключатель выключен или сбой; причина в журнале).
 */
export async function refreshMyFriendWeek(reason: string): Promise<FriendWeekRecord | null> {
  if (!FRIENDS_TOGETHER_UI_ENABLED) return null;
  const startedAt = Date.now();
  try {
    const [storedRaw, lessonsByDay, activeState, streakNow, floorThisWeek] = await Promise.all([
      AsyncStorage.getItem(FRIEND_WEEK_STORAGE_KEY),
      readLessonsByDay(),
      readMyActiveDays(),
      readStreakNow(),
      readFloorThisWeek(startedAt),
    ]);
    const stored = parseFriendWeekRecord(storedRaw);
    if (storedRaw && !stored) console.warn(`${LOG} своя запись не разобралась (длина=${storedRaw.length}) — пишем заново`); // guard-ok
    const next = nextMyFriendWeekRecord({
      todayKey: getLocalDayKey(),
      stored,
      lessonsByDay,
      activeDays: decodeActiveDays(activeState),
      streakNow,
      floorThisWeek,
    });
    const nextRaw = serializeFriendWeekRecord(next);
    if (storedRaw === nextRaw) return next;
    await AsyncStorage.setItem(FRIEND_WEEK_STORAGE_KEY, nextRaw);
    void syncToCloud();
    console.log( // guard-ok: редкая запись (меняется не чаще занятия) — что ушло в синхронизацию
      `${LOG} записано reason=${reason} cur=${next.cur?.week}:${next.cur?.lessons}з/${next.cur?.days}д/этаж=${next.cur?.floor ?? '—'} `
      + `prev=${next.prev ? `${next.prev.week}:${next.prev.lessons}з/${next.prev.days}д` : 'нет'} hidden=${next.hidden} ${Date.now() - startedAt}мс`,
    );
    return next;
  } catch (error) {
    console.warn(`${LOG} пересчёт не удался reason=${reason}: ${error instanceof Error ? error.message : String(error)}`); // guard-ok
    return null;
  }
}

/** «Показывать друзьям мою неделю»: hidden = true — сервер перестаёт отдавать запись друзьям. Мгновенно локально, в облако — синхронизацией. */
export async function setMyFriendWeekHidden(hidden: boolean): Promise<FriendWeekRecord | null> {
  try {
    const stored = (await readMyFriendWeek()) ?? { v: 1 as const, hidden: false, cur: null, prev: null };
    const next: FriendWeekRecord = { ...stored, hidden };
    await AsyncStorage.setItem(FRIEND_WEEK_STORAGE_KEY, serializeFriendWeekRecord(next));
    void syncToCloud();
    console.log(`${LOG} показ друзьям: hidden=${hidden}`); // guard-ok: действие человека
    return next;
  } catch (error) {
    console.warn(`${LOG} переключатель показа не сохранился hidden=${hidden}: ${error instanceof Error ? error.message : String(error)}`); // guard-ok
    return null;
  }
}

/* expo-router: служебный модуль, не экран. */
export default function __RouteShim() { return null; }
