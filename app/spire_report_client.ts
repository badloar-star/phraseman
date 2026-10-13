// ═══════════════════════════════════════════════════════════════════════════
// spire_report_client.ts — склейка очереди отчётов Шпиля с устройством (PM-275).
//
// зачем: чистая логика живёт в modules/spire/report_queue.ts + report_store.ts;
// здесь только три реальные зависимости — AsyncStorage (очередь переживает
// перезапуск и офлайн), callable spireReportSteps (одна пачка = один вызов) и
// DebugLogger (правило «сперва логи», префикс [SPIRE-REPORT]).
//
// Как этим пользуется экран Шпиля (делает отдельная сессия интерфейса):
//   1. ступень закончилась (phase 'passed' | 'failed') → spireReportFromStepState
//      → СРАЗУ spireApplyStepReport в своём состоянии (маркер вверх, optimistic)
//      → spireRecordStepResult(...) фоном (диск, без сети);
//   2. уход с экрана / приложение в фон / вход в Шпиль → spireFlushNow(trigger);
//   3. пока экран открыт — spireFlushNow('interval') раз в минуту: реальная
//      отправка не чаще раза в 5 минут решается внутри (spireShouldFlush).
//
// Энергия: TODO(PM-274) — списание ОДНОЙ энергии за ступень при СТАРТЕ ступени
// (TOWER.md §4.2: «одно списание по id ступени, при старте; сбой подготовки до
// первого задания энергию не тратит; возврата за провал нет») идёт через
// confirmActivityStart (components/EnergyContext.tsx) и НЕ относится к отчёту.
// Заблокировано до эпика E08 (единая энергия 5/1/10). Здесь не списываем.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { peekCoinRank } from './coin_rank_state_v1';
import { DebugLogger } from './debug-logger';
import { getLocalDayKey } from './local_date';
import { peekStableId } from './stable_id';
import { spireCurrentWeekKey } from '../components/spire/spire_tower_model';
import {
  type SpireFlushResponse,
  type SpireFlushTrigger,
  type SpireLang,
  type SpireStepReport,
  type SpireWeekLocal,
} from '../modules/spire/report_queue';
import {
  spireFlushReports,
  spireLoadWeekLocal,
  spireRecordStep,
  type SpireFlushOutcome,
  type SpireKeyValueStore,
  type SpireReportLogger,
} from '../modules/spire/report_store';

const FUNCTIONS_REGION = 'us-central1';
const LOG = '[SPIRE-REPORT]';

const store: SpireKeyValueStore = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
};

const logger: SpireReportLogger = {
  info: (context, message) => DebugLogger.info(context, message),
  warn: (context, message) => DebugLogger.warn(context, message),
};

async function callSpireReportSteps(payload: Readonly<Record<string, unknown>>): Promise<SpireFlushResponse> {
  const { getApp } = await import('@react-native-firebase/app');
  const { getFunctions, httpsCallable } = await import('@react-native-firebase/functions');
  const fn = httpsCallable<Readonly<Record<string, unknown>>, SpireFlushResponse>(
    getFunctions(getApp(), FUNCTIONS_REGION),
    'spireReportSteps',
  );
  const res = await fn(payload);
  return res.data ?? { ok: false, reason: 'empty_response' };
}

/**
 * День серии уже засчитан Шпилем в этом процессе — ключ локального дня.
 * зачем: updateStreakOnActivity читает/пишет ~10 ключей AsyncStorage; звать её
 * на каждой ступени незачем — день засчитывается один раз, остальные ступени
 * дня серию уже не меняют. Память процесса, не диск: после перезапуска первая
 * ступень дня позовёт функцию ещё раз, а та сама увидит «сегодня уже был».
 */
let spireStreakDayMarked: string | null = null;

/**
 * T38 (владелец 2026-09-24): пройденная ступень засчитывает день серии, как урок.
 * Тот же механизм, что у остальных активностей — updateStreakOnActivity
 * (заморозки, щиты, починка, week_days_done). Шпиль не выдаёт старые игровые
 * очки, поэтому зовём сам механизм серии без дополнительной награды. Ленивый импорт: модуль
 * серии тяжёлый и не нужен экрану Шпиля до первой пройденной ступени.
 */
async function markSpireStreakDay(report: SpireStepReport): Promise<void> {
  const today = getLocalDayKey();
  if (spireStreakDayMarked === today) return;
  try {
    const { updateStreakOnActivity } = await import('./hall_of_fame_utils');
    const streak = await updateStreakOnActivity();
    if (streak < 0) {
      // зачем (аудит Optimistic UI 13.10): -1 = серия не сохранена — день не помечаем, следующая ступень попробует снова.
      DebugLogger.warn(LOG, `streak: день ${today} не сохранён (серия=${streak}) — повтор на следующей ступени`);
      return;
    }
    spireStreakDayMarked = today;
    DebugLogger.info(LOG, `streak: день ${today} засчитан ступенью ${report.reportId}, серия=${streak}`);
  } catch (error) {
    // Не помечаем день — следующая пройденная ступень попробует снова.
    DebugLogger.warn(LOG, `streak: не удалось засчитать день ${today} (${error instanceof Error ? error.message : String(error)})`);
  }
}

/**
 * Последняя прочитанная с диска неделя по uid+языку — для первого кадра экрана Шпиля (peek).
 * зачем (аудит скорости Авторизации 13.10, п.1): неделя читалась только асинхронно, и маркер «ты здесь» с блоком этажа дорисовывались позже, а выбранный этаж
 * прыгал с 1 на настоящий. Память процесса, не диск: холодный старт читает как раньше, повторный заход рисует сразу.
 */
const weekMemory = new Map<string, SpireWeekLocal>();
const weekMemoryKey = (uid: string, lang: SpireLang): string => `${uid}|${lang}`;

/** Синхронно: локальная неделя ТЕКУЩЕЙ ISO-недели из памяти процесса или null (нет uid, не читали, неделя устарела). */
export function peekSpireWeekLocal(lang: SpireLang): SpireWeekLocal | null {
  const uid = CLOUD_SYNC_ENABLED ? peekStableId() : null;
  if (!uid) return null;
  const hit = weekMemory.get(weekMemoryKey(uid, lang)) ?? null;
  if (!hit) return null;
  const expected = spireCurrentWeekKey(Date.now());
  if (hit.weekKey !== expected) {
    DebugLogger.info(LOG, `peekWeek: в памяти неделя ${hit.weekKey}, сейчас ${expected} — первый кадр без недели`);
    return null;
  }
  return hit;
}

/** Записать результат ступени на диск (очередь). Сеть не трогает. */
export async function spireRecordStepResult(uid: string, lang: SpireLang, report: SpireStepReport) {
  const applied = await spireRecordStep(store, { uid, lang, report, logger });
  // зачем: после записи ступени память недели устарела — перечитываем фоном (локальный диск, 0 чтений облака), чтобы следующий вход нарисовал свежую.
  weekMemory.delete(weekMemoryKey(uid, lang));
  void spireReadWeekLocal(uid, lang).catch((error: unknown) => {
    DebugLogger.warn(LOG, `peekWeek: перечитать неделю после ступени не удалось (${error instanceof Error ? error.message : String(error)})`);
  });
  // Серия — только за ПРОЙДЕННУЮ и новую ступень (провал и повтор дня не дают).
  if (report.outcome === 'passed' && applied.effect !== 'duplicate_ignored') {
    void markSpireStreakDay(report);
  }
  return applied;
}

/** Текущее локальное состояние недели — для первого кадра экрана из снапшота. */
export function spireReadWeekLocal(uid: string, lang: SpireLang): Promise<SpireWeekLocal | null> {
  return spireLoadWeekLocal(store, uid, lang, logger).then((local) => {
    if (local) weekMemory.set(weekMemoryKey(uid, lang), local);
    else weekMemory.delete(weekMemoryKey(uid, lang));
    return local;
  });
}

/**
 * Дослать очередь пачкой. Безопасно звать часто: пустая очередь, backoff и
 * интервал 5 минут отсекаются локально, без сети; одновременные вызовы
 * склеиваются в одну отправку.
 */
export async function spireFlushNow(
  input: Readonly<{ uid: string; stableId: string; lang: SpireLang; trigger: SpireFlushTrigger }>,
): Promise<SpireFlushOutcome | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    DebugLogger.info(LOG, `flushNow: облако выключено (expoGo=${IS_EXPO_GO} cloudSync=${CLOUD_SYNC_ENABLED}) — очередь ждёт`);
    return null;
  }
  try {
    return await spireFlushReports(store, {
      uid: input.uid,
      lang: input.lang,
      trigger: input.trigger,
      nowMs: () => Date.now(),
      // зачем (владелец 13.10): свой ранг монеты едет с отчётом — сервер обновит аватар-монету в строке комнаты той же записью.
      send: (payload) => callSpireReportSteps({ ...payload, stableId: input.stableId, coinRank: peekCoinRank(input.stableId) }),
      logger,
    });
  } catch (error) {
    // зачем: отправка не должна ронять экран; очередь цела и уйдёт следующим триггером.
    DebugLogger.warn(LOG, `flushNow: неожиданная ошибка trigger=${input.trigger} (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
