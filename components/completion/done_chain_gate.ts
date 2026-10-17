// ═══════════════════════════════════════════════════════════════════════════
// done_chain_gate.ts — m10 «Итог урока — цепная реакция» (эталон engagement-moments-v3-all.html, `result3`): когда играть «семь ударов» и что показать в строках
// «Серия» и «Сегодня · Пройти урок».
//
// зачем (координатор 15.10, ТЗ ETALON_MOMENTS_V3_TRANSFER m10): одно занятие двигает все счётчики — и это видно за 5 секунд. Цепочка играет только при moments_v3,
// на итоге обычного урока (не комбо), когда счёт посчитан. Решение принимается ОДИН раз — в момент показа итога (экран его защёлкивает), чтобы вид не переключался
// посреди показа; монеты, если ещё досчитываются, строка «+N» просто догонит — она всплывает только на 2,8 с. Строки серии и задачи не выдумывают данных: «до» снимается синхронно с первого кадра
// экрана итога — ДО того, как он сам отправит recordTodayTaskActivity (она же засчитывает день серии), «после» — живые сторы. Анимация «5 → 6, огонь зажёгся»
// и «0/1 → 1/1» играет, только если переход сделал ИМЕННО этот урок; иначе строка показывается в итоговом виде; данных нет — строки нет.
// Всё локально (память процесса), ни одного чтения Firestore. Чистые функции — причина решения уходит в журнал [MOMENT-m10].
// ═══════════════════════════════════════════════════════════════════════════
import { peekStreakDayState, type StreakDayState } from '../../app/streak_day_signal';
import { todayTaskProgress, TODAY_TASK_RULES, type TodayTasksDayState } from '../../modules/today-tasks/today_tasks_core';
import { peekTodayTasks } from '../../modules/today-tasks/today_tasks_store';

export const DONE_CHAIN_LOG = '[MOMENT-m10]';

/**
 * Тайминги образца, мс. Восемь блоков `[data-b]` всплывают с 300 мс каждые 620 мс (emUp 500 мс, cubic-bezier(.2,1,.3,1), сдвиг 18 → 0).
 * Блоки: 0 «Урок пройден», 1 звёзды, 2 название урока, 3 верно/ошибки/точность, 4 монеты, 5 серия, 6 «Сегодня», 7 кнопки.
 */
export const DONE_CHAIN_TIMELINE = {
  first: 300,
  step: 620,
  beats: 8,
  enter: 500,
  rise: 18,
  /** Звёзды — по 150 мс друг за другом (emPop 500 мс). */
  starStep: 150,
  starPop: 500,
  /** «+N монет»: счёт 0 → N за 700 мс; шесть монет летят в баланс с 200 мс через 60 мс по 900 мс; баланс бежит с 900 мс за 600 мс. */
  coinCount: 700,
  flyCount: 6,
  flyDelay: 200,
  flyStep: 60,
  flyDuration: 900,
  balanceAt: 900,
  balanceCount: 600,
  /** Серия и задача «Сегодня» меняют вид через 300 мс после появления строки. */
  flipAt: 300,
} as const;

export const DONE_CHAIN_BEAT = { title: 0, stars: 1, name: 2, stats: 3, coins: 4, streak: 5, today: 6, foot: 7 } as const;

/** Момент появления блока i от старта цепочки. */
export function doneChainBeatAt(i: number): number {
  return DONE_CHAIN_TIMELINE.first + i * DONE_CHAIN_TIMELINE.step;
}

export type DoneChainInput = Readonly<{
  momentsV3: boolean;
  isCombo: boolean;
  /** Верных и неверных ответов прохода; null — итог ещё не посчитан. */
  counts: Readonly<{ correct: number; wrong: number }> | null;
  /** Звёзды урока; null — у итога звёзд нет. */
  stars: number | null;
}>;

export type DoneChainDecision = Readonly<{ play: boolean; reason: string }>;

/** Играть ли «семь ударов»; причина — для журнала (какое значение решило). */
export function decideDoneChain(input: DoneChainInput): DoneChainDecision {
  if (!input.momentsV3) return { play: false, reason: 'флаг moments_v3 выключен — прежний итог' }; // guard-ok: log-only reason
  if (input.isCombo) return { play: false, reason: 'комбо-итог — прежний вид' }; // guard-ok: log-only reason
  if (!input.counts) return { play: false, reason: 'счёт урока ещё не посчитан (counts=null)' }; // guard-ok: log-only reason
  if (input.stars == null) return { play: false, reason: 'у итога нет звёзд (stars=null)' }; // guard-ok: log-only reason
  return { play: true, reason: `цепочка: звёзды=${input.stars} верно=${input.counts.correct} ошибок=${input.counts.wrong}` }; // guard-ok: log-only reason
}

/** Снимок «до» — первый кадр экрана итога, до записи задачи дня и серии. */
export type DoneChainBefore = Readonly<{
  /** null — сверка серии ещё не прошла (неизвестно). */
  streak: StreakDayState | null;
  /** Прогресс задачи «Пройти урок» до урока; null — задачи нет в пуле дня / стор пуст. */
  lessonProgress: number | null;
  dayKey: string | null;
}>;

function lessonProgressOf(state: TodayTasksDayState | null): number | null {
  const task = state?.tasks.find((t) => t.kind === 'lesson');
  return task ? todayTaskProgress(task) : null;
}

export function captureDoneChainBefore(): DoneChainBefore {
  const tasks = peekTodayTasks();
  const streak = peekStreakDayState();
  // зачем (Сверка 15.10, «Серия — 0 дней»): снимок «до» берётся на первом кадре итога — видно, успела ли запись дня раньше него
  console.log(`[STREAK-RESULT] before:snapshot ${streak ? `{days=${streak.days} counted=${String(streak.counted)} day=${streak.dayKey}}` : 'null(серия ещё не сверена)'} задачиДня=${tasks ? tasks.dayKey : 'null'}`); // guard-ok: единичный журнал снимка
  return Object.freeze({ streak, lessonProgress: lessonProgressOf(tasks), dayKey: tasks?.dayKey ?? null });
}

/** «После» — состояние сторов серии и задач дня; в бою живое, в dev-превью — готовое. */
/** `balance` — только dev-превью: баланс после урока вместо кошелька устройства (в бою не задаётся). */
export type DoneChainAfter = Readonly<{ streak: StreakDayState | null; today: TodayTasksDayState | null; balance?: number }>;

export type DoneChainStreakRow = Readonly<{
  /** Что показать при появлении строки (дни и засчитан ли сегодня). */
  from: Readonly<{ days: number; counted: boolean }>;
  /** Что показать через 300 мс; равно from — строка статична. */
  to: Readonly<{ days: number; counted: boolean }>;
  animate: boolean;
  reason: string;
}>;

/** Строка «Серия — N дней». null — серия неизвестна (до сверки), строку не рисуем. */
export function deriveStreakRow(before: StreakDayState | null, after: StreakDayState | null): DoneChainStreakRow | null {
  if (!after) return null;
  const to = { days: Math.max(0, after.days), counted: after.counted };
  if (after.counted && before && !before.counted && before.dayKey === after.dayKey) {
    // зачем: «до» берём из снимка (вчерашняя серия), а если серия сбросилась — честно «N−1 → N» не выдумываем: показываем то, что было
    const fromDays = Math.max(0, Math.min(before.days, to.days));
    return { from: { days: fromDays, counted: false }, to, animate: true, reason: `день засчитан этим уроком: ${fromDays} → ${to.days}` }; // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
  }
  return { from: to, to, animate: false, reason: after.counted ? `день уже был засчитан раньше (до=${before ? String(before.counted) : 'неизвестно'})` : 'день ещё не засчитан' }; // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
}

export type DoneChainTodayRow = Readonly<{
  from: number;
  to: number;
  target: number;
  animate: boolean;
  reason: string;
}>;

/** Строка «Сегодня · Пройти урок N/1». null — задачи «урок» нет в пуле дня. */
export function deriveTodayRow(before: DoneChainBefore, after: TodayTasksDayState | null): DoneChainTodayRow | null {
  const to = lessonProgressOf(after);
  if (to == null) return null;
  const target = TODAY_TASK_RULES.lesson.target;
  const sameDay = before.dayKey == null || after?.dayKey === before.dayKey;
  const from = sameDay && before.lessonProgress != null ? Math.min(before.lessonProgress, to) : to;
  const animate = from < to;
  return { from, to, target, animate, reason: animate ? `задачу продвинул этот урок: ${from}/${target} → ${to}/${target}` : `без изменений ${to}/${target} (до=${String(before.lessonProgress)})` }; // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
}
