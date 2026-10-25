/**
 * [SPIRE-GOLD] «Золотое задание» внутри ступени Пика — обвязка раннера (правило — modules/spire/golden_task.ts).
 *
 * зачем (владелец 25.10: «золотое задание — двойные монеты за верный ответ, со звоном»; координатор 25.10; ТЗ
 * docs/work/tasks/spire-engagement-2026-10-25.md §3; живой макет docs/design/v2-app/spire-step-live.html, сцена «Золотое ×2»):
 * в ступени может быть одно золотое задание (3…9). Верно с первой попытки → отчёт ступени несёт goldenHit, монеты ступени ×2
 * сразу на телефоне (spireStepCoinsNow), сервер считает то же правило сам и платит одну ставку ступени сверху.
 * Флаг `spire_gold` — реестр «Пульта» (app/remote_flags.ts), по умолчанию ВЫКЛ, читается раз на ступень.
 * Потолок 3 золотых в день (UTC) — тот же, что у сервера; счётчик дня на телефоне, чтобы не показывать золото, за которое
 * сервер уже не заплатит (иначе цифра монет «прыгнула» бы вниз после ответа сервера).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SPIRE_GOLD_DAILY_CAP, spireGoldDayKey, spireGoldenTaskIndex } from '../../modules/spire/golden_task';
import type { SpireStepReport } from '../../modules/spire/report_queue';
import { hapticSuccess } from '../../hooks/use-haptics';
import { DebugLogger } from '../debug-logger';
import { getRemoteBool, hasRemoteBoolOverride } from '../remote_flags';

// зачем (сторож spire_game_source_contract: префикс [SPIRE] во всех файлах app/spire): контекст [SPIRE], метка задачи в строке
const SPIRE = '[SPIRE]';
const TAG = '[SPIRE-GOLD]';
export const SPIRE_GOLD_FLAG_KEY = 'spire_gold';
const DAY_KEY = 'spire_gold_day_v1';

type DayCount = Readonly<{ day: string; count: number }>;
const dayMemory = new Map<string, DayCount>();

async function readDay(stableId: string): Promise<DayCount> {
  const today = spireGoldDayKey(Date.now());
  const mem = dayMemory.get(stableId);
  if (mem) return mem.day === today ? mem : { day: today, count: 0 };
  try {
    const raw = await AsyncStorage.getItem(`${DAY_KEY}::${stableId}`);
    const parsed = raw ? JSON.parse(raw) as Partial<DayCount> : null;
    const value: DayCount = parsed && parsed.day === today && Number.isSafeInteger(parsed.count) ? { day: today, count: Number(parsed.count) } : { day: today, count: 0 };
    dayMemory.set(stableId, value);
    return value;
  } catch (error) {
    DebugLogger.warn(SPIRE, `${TAG} счётчик дня не прочитался → считаем 0 (${error instanceof Error ? error.message : String(error)})`);
    return { day: today, count: 0 };
  }
}

function bumpDay(stableId: string, atMs: number): void {
  const day = spireGoldDayKey(atMs);
  const mem = dayMemory.get(stableId);
  const next: DayCount = { day, count: (mem && mem.day === day ? mem.count : 0) + 1 };
  dayMemory.set(stableId, next);
  DebugLogger.info(SPIRE, `${TAG} день ${day}: золото засчитано на телефоне ${next.count}/${SPIRE_GOLD_DAILY_CAP}`);
  void AsyncStorage.setItem(`${DAY_KEY}::${stableId}`, JSON.stringify(next)).catch((error: unknown) => {
    DebugLogger.warn(SPIRE, `${TAG} счётчик дня не записался — только в памяти (${error instanceof Error ? error.message : String(error)})`);
  });
}

export type SpireGoldView = Readonly<{
  /** Индекс золотого задания этой ступени или null. */
  goldIndex: number | null;
  /** Золотое решено верно с первой попытки. */
  hit: boolean;
}>;

export type SpireGoldInput = Readonly<{ runId: string; stableId: string | undefined; weekKey: string; stepNumber: number | undefined }>;

export function useSpireGold(input: SpireGoldInput): Readonly<{
  view: SpireGoldView;
  onAnswer: (taskIndex: number, ok: boolean) => void;
  stamp: (report: SpireStepReport | null) => SpireStepReport | null;
}> {
  const [view, setView] = useState<SpireGoldView>({ goldIndex: null, hit: false });
  const goldRef = useRef<number | null>(null);
  const hitRef = useRef(false);
  const { runId, stableId, weekKey, stepNumber } = input;

  useEffect(() => {
    let alive = true;
    const on = getRemoteBool(SPIRE_GOLD_FLAG_KEY) === true;
    const source = hasRemoteBoolOverride(SPIRE_GOLD_FLAG_KEY) ? 'пульт' : 'по умолчанию';
    if (!on || !stableId || !stepNumber) {
      DebugLogger.info(SPIRE, `${TAG} ступень ${runId}: золота нет — флаг=${on ? 'ВКЛ' : 'ВЫКЛ'} (${source}) stableId=${stableId ? 'есть' : 'нет'} номер=${stepNumber ?? '-'}`);
      return undefined;
    }
    const index = spireGoldenTaskIndex(stableId, weekKey, stepNumber);
    if (index === null) {
      DebugLogger.info(SPIRE, `${TAG} ступень ${runId} №${stepNumber}: по хешу золота нет`);
      return undefined;
    }
    void readDay(stableId).then((day) => {
      if (!alive) { DebugLogger.info(SPIRE, `${TAG} ступень ${runId}: счётчик дня пришёл после ухода — пропуск`); return; }
      if (day.count >= SPIRE_GOLD_DAILY_CAP) {
        DebugLogger.info(SPIRE, `${TAG} ступень ${runId} №${stepNumber}: золото было бы на задании ${index + 1}, но потолок дня ${day.count}/${SPIRE_GOLD_DAILY_CAP}`);
        return;
      }
      goldRef.current = index;
      setView({ goldIndex: index, hit: false });
      DebugLogger.info(SPIRE, `${TAG} ступень ${runId} №${stepNumber}: золотое задание ${index + 1} (день ${day.count}/${SPIRE_GOLD_DAILY_CAP}, флаг ${source})`);
    });
    return () => { alive = false; };
  }, [runId, stableId, weekKey, stepNumber]);

  const onAnswer = useCallback((taskIndex: number, ok: boolean) => {
    if (goldRef.current === null || taskIndex !== goldRef.current) return;
    DebugLogger.info(SPIRE, `${TAG} ступень ${runId}: золотое задание ${taskIndex + 1} ok=${String(ok)}${ok ? ' → ×2 монеты ступени, звон' : ' → обычное, без штрафа'}`);
    if (!ok) return;
    hitRef.current = true;
    setView((v) => ({ ...v, hit: true }));
    // зачем (ЗАМОК ВЛАДЕЛЬЦА 25.10 «удалить звук … при правильных ответах в любых режимах»): звона нет; вибрация success,
    // «×2» и вспышка остаются (координатор 25.10)
    void hapticSuccess();
  }, [runId]);

  const stamp = useCallback((report: SpireStepReport | null): SpireStepReport | null => {
    if (!report || !hitRef.current) return report;
    if (report.outcome !== 'passed') {
      DebugLogger.info(SPIRE, `${TAG} ступень ${runId}: золото решено, но ступень ${report.outcome} — ×2 нет`);
      return report;
    }
    if (stableId) bumpDay(stableId, report.completedAtMs);
    DebugLogger.info(SPIRE, `${TAG} отчёт ${report.reportId}: goldenHit=true`);
    return { ...report, goldenHit: true };
  }, [runId, stableId]);

  return { view, onAnswer, stamp };
}

export function __resetSpireGoldDayForTests(): void {
  dayMemory.clear();
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
