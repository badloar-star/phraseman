/**
 * [SPIRE-STREAK-HEART] «Сердечко за серию» внутри ступени Пика — обвязка раннера (правило — modules/spire/streak_heart.ts).
 *
 * зачем (владелец 25.10 выбрал идею, координатор 25.10 — задача на 2.0.3; ТЗ docs/work/tasks/spire-engagement-2026-10-25.md §2,
 * живой макет docs/design/v2-app/spire-step-live.html): 5 верных подряд возвращают одно потерянное сердце, раз за ступень.
 * Только телефон — монет нет, сервер и облачная база не трогаются. Флаг `spire_streak_heart` — реестр app/remote_flags.ts
 * (переключатель «Пульта», координатор 25.10; по умолчанию ВЫКЛ). Значение читается на старте каждой ступени — включение
 * в «Пульте» доходит живым снимком конфига без новой сборки и без отдельных запросов.
 */
import { useCallback, useRef, useState } from 'react';
import type { SpireStepState } from '../../modules/spire/step_machine';
import { SPIRE_STEP_MAX_HEARTS } from '../../modules/spire/step_machine';
import { SPIRE_STREAK_HEART_START, spireStreakHeartStep, type SpireStreakHeartState } from '../../modules/spire/streak_heart';
import { hapticSuccess } from '../../hooks/use-haptics';
import { DebugLogger } from '../debug-logger';
import { getRemoteBool, hasRemoteBoolOverride } from '../remote_flags';

// зачем (сторож spire_game_source_contract: префикс [SPIRE] во всех файлах app/spire): контекст [SPIRE], метка задачи в строке
const SPIRE = '[SPIRE]';
const TAG = '[SPIRE-STREAK-HEART]';
export const SPIRE_STREAK_HEART_FLAG_KEY = 'spire_streak_heart';

/** Флаг из реестра «Пульта»: снимок есть — его значение, нет — по умолчанию false. Одна строка журнала на ступень. */
export function readSpireStreakHeartFlag(runId: string): boolean {
  const on = getRemoteBool(SPIRE_STREAK_HEART_FLAG_KEY) === true;
  DebugLogger.info(SPIRE, `${TAG} ступень ${runId}: флаг ${SPIRE_STREAK_HEART_FLAG_KEY}=${on ? 'ВКЛ' : 'ВЫКЛ'} источник=${hasRemoteBoolOverride(SPIRE_STREAK_HEART_FLAG_KEY) ? 'пульт' : 'по умолчанию'}`);
  return on;
}

export type SpireStreakHeartView = Readonly<{
  enabled: boolean;
  streak: number;
  given: boolean;
  /** Растёт на каждом возврате сердца — экран запускает вспышку один раз на значение. */
  refillSeq: number;
}>;

export function useSpireStreakHeart(runId: string): Readonly<{ view: SpireStreakHeartView; apply: (next: SpireStepState, ok: boolean, taskNo: number) => SpireStepState }> {
  // зачем: флаг берём один раз на ступень — переключение «Пульта» посреди ступени не меняет её правила
  const [enabled] = useState(() => readSpireStreakHeartFlag(runId));
  const enabledRef = useRef(enabled);
  const stateRef = useRef<SpireStreakHeartState>(SPIRE_STREAK_HEART_START);
  const [view, setView] = useState<SpireStreakHeartView>({ enabled, streak: 0, given: false, refillSeq: 0 });

  const apply = useCallback((next: SpireStepState, ok: boolean, taskNo: number): SpireStepState => {
    if (!enabledRef.current) return next;
    const prev = stateRef.current;
    const step = spireStreakHeartStep(prev, ok, next.hearts, SPIRE_STEP_MAX_HEARTS);
    stateRef.current = step.state;
    DebugLogger.info(SPIRE, `${TAG} ступень ${runId} задание ${taskNo} ok=${String(ok)} серия ${prev.streak}→${step.state.streak} сердца ${next.hearts}→${step.hearts} уже давали=${String(prev.given)}${step.refilled ? ' → СЕРДЦЕ ВЕРНУЛОСЬ' : ''}${step.skip ? ` пропуск=${step.skip}` : ''}`);
    setView((v) => ({ enabled: v.enabled, streak: step.state.streak, given: step.state.given, refillSeq: v.refillSeq + (step.refilled ? 1 : 0) }));
    if (!step.refilled) return next;
    // зачем (ЗАМОК ВЛАДЕЛЬЦА 25.10): сердце возвращается на верном ответе — без звука; вибрация success остаётся
    void hapticSuccess();
    return { ...next, hearts: step.hearts };
  }, [runId]);

  return { view, apply };
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
