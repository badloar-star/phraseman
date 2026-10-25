/**
 * [SPIRE-STREAK-HEART] «Сердечко за серию» внутри ступени Пика — обвязка раннера (правило — modules/spire/streak_heart.ts).
 *
 * зачем (владелец 25.10 выбрал идею, координатор 25.10 — задача на 2.0.3; ТЗ docs/work/tasks/spire-engagement-2026-10-25.md §2,
 * живой макет docs/design/v2-app/spire-step-live.html): 5 верных подряд возвращают одно потерянное сердце, раз за ступень.
 * Только телефон — монет нет, сервер и Firestore не трогаем. Под удалённым флагом `spire_streak_heart` в remote_config/app.bools,
 * по умолчанию ВЫКЛ (только явное true). Флаг читается из уже лежащего кэша конфига, без сети.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpireStepState } from '../../modules/spire/step_machine';
import { SPIRE_STEP_MAX_HEARTS } from '../../modules/spire/step_machine';
import { SPIRE_STREAK_HEART_START, spireStreakHeartStep, type SpireStreakHeartState } from '../../modules/spire/streak_heart';
import { tryPlayV2Event } from '../../modules/sound_v2/legacy_bridge';
import { hapticSuccess } from '../../hooks/use-haptics';
import { DebugLogger } from '../debug-logger';
import { readRemoteConfigCacheRaw } from '../remote_config_client';

// зачем (сторож spire_game_source_contract: префикс [SPIRE] во всех файлах app/spire): контекст [SPIRE], метка задачи в строке
const SPIRE = '[SPIRE]';
const TAG = '[SPIRE-STREAK-HEART]';
export const SPIRE_STREAK_HEART_FLAG_KEY = 'spire_streak_heart';

/** Флаг: только явное true в remote_config/app.bools (нет ключа, битый кэш — выключено). */
export function isSpireStreakHeartEnabled(bools: Readonly<Record<string, unknown>> | null | undefined): boolean {
  return bools?.[SPIRE_STREAK_HEART_FLAG_KEY] === true;
}

async function readFlag(): Promise<boolean> {
  try {
    const raw = await readRemoteConfigCacheRaw();
    const bools = raw ? (JSON.parse(raw) as { bools?: Record<string, unknown> }).bools ?? null : null;
    const on = isSpireStreakHeartEnabled(bools);
    DebugLogger.info(SPIRE, `${TAG} флаг ${SPIRE_STREAK_HEART_FLAG_KEY}=${String(bools?.[SPIRE_STREAK_HEART_FLAG_KEY] ?? 'нет ключа')} кэш=${raw ? 'есть' : 'нет'} → ${on ? 'ВКЛ' : 'ВЫКЛ'}`);
    return on;
  } catch (error) {
    DebugLogger.warn(SPIRE, `${TAG} кэш конфига не прочитался → ВЫКЛ (${error instanceof Error ? error.message : String(error)})`);
    return false;
  }
}

export type SpireStreakHeartView = Readonly<{
  enabled: boolean;
  streak: number;
  given: boolean;
  /** Растёт на каждом возврате сердца — экран запускает вспышку один раз на значение. */
  refillSeq: number;
}>;

export function useSpireStreakHeart(runId: string): Readonly<{ view: SpireStreakHeartView; apply: (next: SpireStepState, ok: boolean, taskNo: number) => SpireStepState }> {
  const enabledRef = useRef(false);
  const stateRef = useRef<SpireStreakHeartState>(SPIRE_STREAK_HEART_START);
  const [view, setView] = useState<SpireStreakHeartView>({ enabled: false, streak: 0, given: false, refillSeq: 0 });

  useEffect(() => {
    let alive = true;
    void readFlag().then((on) => {
      if (!alive) { DebugLogger.info(SPIRE, `${TAG} флаг пришёл после ухода со ступени ${runId} — пропуск`); return; }
      enabledRef.current = on;
      setView((v) => ({ ...v, enabled: on }));
    });
    return () => { alive = false; };
  }, [runId]);

  const apply = useCallback((next: SpireStepState, ok: boolean, taskNo: number): SpireStepState => {
    if (!enabledRef.current) return next;
    const prev = stateRef.current;
    const step = spireStreakHeartStep(prev, ok, next.hearts, SPIRE_STEP_MAX_HEARTS);
    stateRef.current = step.state;
    DebugLogger.info(SPIRE, `${TAG} ступень ${runId} задание ${taskNo} ok=${String(ok)} серия ${prev.streak}→${step.state.streak} сердца ${next.hearts}→${step.hearts} уже давали=${String(prev.given)}${step.refilled ? ' → СЕРДЦЕ ВЕРНУЛОСЬ' : ''}${step.skip ? ` пропуск=${step.skip}` : ''}`);
    setView((v) => ({ enabled: v.enabled, streak: step.state.streak, given: step.state.given, refillSeq: v.refillSeq + (step.refilled ? 1 : 0) }));
    if (!step.refilled) return next;
    // зачем (ТЗ §2): звук plus и вибрация success — событие возврата сердца, а не плитка ответа (правило вибрации владельца)
    tryPlayV2Event('plus', 'spire_streak_heart');
    void hapticSuccess();
    return { ...next, hearts: step.hearts };
  }, [runId]);

  return { view, apply };
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
