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
import { DebugLogger } from './debug-logger';
import { getLocalDayKey } from './local_date';
import {
  type SpireFlushResponse,
  type SpireFlushTrigger,
  type SpireLang,
  type SpireStepReport,
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

/** Записать результат ступени на диск (очередь). Сеть не трогает. */
export async function spireRecordStepResult(uid: string, lang: SpireLang, report: SpireStepReport) {
  const applied = await spireRecordStep(store, { uid, lang, report, logger });
  // Серия — только за ПРОЙДЕННУЮ и новую ступень (провал и повтор дня не дают).
  if (report.outcome === 'passed' && applied.effect !== 'duplicate_ignored') {
    void markSpireStreakDay(report);
  }
  return applied;
}

/** Текущее локальное состояние недели — для первого кадра экрана из снапшота. */
export function spireReadWeekLocal(uid: string, lang: SpireLang) {
  return spireLoadWeekLocal(store, uid, lang, logger);
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
      send: (payload) => callSpireReportSteps({ ...payload, stableId: input.stableId }),
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
