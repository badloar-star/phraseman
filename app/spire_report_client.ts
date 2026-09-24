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

/** Записать результат ступени на диск (очередь). Сеть не трогает. */
export function spireRecordStepResult(uid: string, lang: SpireLang, report: SpireStepReport) {
  return spireRecordStep(store, { uid, lang, report, logger });
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
