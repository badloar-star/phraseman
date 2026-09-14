/**
 * [ENERGY-SPEND-LAT] Трассировка задержки числовой анимации на старте активности.
 *
 * зачем (владелец, 2026-09-02): «анимация минус энергия иногда не сразу
 * срабатывает, она должна срабатывать мгновенно, только урок начался».
 * По правилу «сперва логи, потом починка» здесь стоит измеритель, который
 * показывает, КАКОЕ звено съело время между входом в урок и сменой числа.
 *
 * Цепочка от входа на экран до анимации:
 *   экран смонтирован
 *     └─ ждём energyReady          ← гейт: эффект списания вообще не стартует
 *          └─ confirmSpendOne
 *               └─ (при холодном контексте) await load()   ← чтение диска
 *                    └─ withAccountTransitionLock          ← ОБЩИЙ замок аккаунта
 *                         └─ commitEnergySessionStart      ← SHA-256 + ~10 обращений
 *                              │                             к AsyncStorage,
 *                              │                             включая getAllKeys()
 *                              └─ energyVisualTransactions.publish → анимация каждой цифры
 *
 * Каждое звено печатает свою длительность, чтобы не гадать, а знать.
 *
 * Стоимость: несколько отметок времени на один старт активности. В release
 * трассировка ВЫКЛЮЧЕНА, если не задан EXPO_PUBLIC_ENERGY_SPEND_TRACE=1.
 *
 * Как читать: grep '[ENERGY-SPEND-LAT]' в .expo/metro-console.log (dev) либо
 * logcat / Console.app (release с флагом).
 */

export const ENERGY_SPEND_TRACE_ENABLED: boolean =
  __DEV__ || process.env.EXPO_PUBLIC_ENERGY_SPEND_TRACE === '1';

const LOG_PREFIX = '[ENERGY-SPEND-LAT]';
/** Выше этого порога задержка уже заметна глазу — помечаем строку как медленную. */
const SLOW_TOTAL_MS = 120;
const RING_SIZE = 40;

/** Монотонные миллисекунды; в RN есть performance.now(), иначе Date.now(). */
function nowMs(): number {
  const perf = (globalThis as { performance?: { now?: () => number } }).performance;
  return typeof perf?.now === 'function' ? perf.now() : Date.now();
}

type Stage = Readonly<{ label: string; at: number }>;

export type EnergySpendSample = Readonly<{
  /** Экран/активность, которая платила за старт. */
  screen: string;
  /** Отрезки цепочки: имя звена → сколько заняло, мс. */
  stages: ReadonlyArray<Readonly<{ label: string; ms: number }>>;
  /** Вход на экран → старт числовой анимации, мс. */
  totalMs: number;
  /** Чем закончилось: spent / insufficient / unlimited / cancelled. */
  outcome: string;
  at: number;
}>;

let recent: ReadonlyArray<EnergySpendSample> = [];

/** Живые цепочки: ключ — экран, значение — отметки её звеньев. */
const openRuns = new Map<string, { startedAt: number; stages: Stage[] }>();

/**
 * Начало цепочки: экран смонтирован и хочет списать энергию.
 * Повторный вызов по тому же ключу перезапускает замер (новый заход на экран).
 */
export function beginEnergySpendTrace(screen: string): void {
  if (!ENERGY_SPEND_TRACE_ENABLED) return;
  const at = nowMs();
  openRuns.set(screen, { startedAt: at, stages: [{ label: 'start', at }] });
}

/**
 * Отметка звена. Печатает не сам факт, а ЗНАЧЕНИЕ, которое решило ветвление
 * (например energyReady=false), — иначе лог бесполезен.
 */
export function markEnergySpendStage(screen: string, label: string): void {
  if (!ENERGY_SPEND_TRACE_ENABLED) return;
  const run = openRuns.get(screen);
  if (!run) return;
  run.stages.push({ label, at: nowMs() });
}

/** Конец цепочки: числовая анимация запущена (или старта не было — outcome скажет почему). */
export function endEnergySpendTrace(screen: string, outcome: string): void {
  if (!ENERGY_SPEND_TRACE_ENABLED) return;
  const run = openRuns.get(screen);
  if (!run) {
    // зачем: молчаливый выход — это тот самый немой catch, который скрывает баги.
    console.log(`${LOG_PREFIX} ${screen}: end without start (outcome=${outcome}) - chain was not marked`);
    return;
  }
  openRuns.delete(screen);
  const finishedAt = nowMs();
  const stages: Array<{ label: string; ms: number }> = [];
  for (let i = 1; i < run.stages.length; i++) {
    stages.push({ label: run.stages[i].label, ms: Math.round(run.stages[i].at - run.stages[i - 1].at) });
  }
  const totalMs = Math.round(finishedAt - run.startedAt);
  const sample: EnergySpendSample = {
    screen, stages, totalMs, outcome, at: Date.now(),
  };
  recent = [sample, ...recent].slice(0, RING_SIZE);
  const chain = stages.map(s => `${s.label}=${s.ms}ms`).join(' | ');
  const flag = totalMs >= SLOW_TOTAL_MS ? ' [SLOW]' : '';
  console.log(`${LOG_PREFIX} ${screen} outcome=${outcome} total=${totalMs}ms${flag} | ${chain}`);
}

/** Последние замеры для DEV-панели. */
export function getRecentEnergySpendSamples(): ReadonlyArray<EnergySpendSample> {
  return recent;
}

/** Сброс между тестами. */
export function resetEnergySpendTrace(): void {
  openRuns.clear();
  recent = [];
}
