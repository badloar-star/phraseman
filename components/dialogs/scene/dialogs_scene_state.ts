// ═══════════════════════════════════════════════════════════════════════════
// dialogs_scene_state.ts — какое состояние показывает «Сцена» в «Диалогах».
//
// зачем (владелец 21.10 «и так же диалоги»; эталон docs/design/v2-app/dialogs-scene-states.html, номер состояния = приоритет): чистая функция без React,
// хранилища и сети. Раздел передаёт только то, что телефон уже знает (согласие на AI-диалоги, сеть, остаток ответов месяца, пройденные диалоги,
// диалог засчитан сегодня) — новых чтений базы нет. Побеждает первое подходящее сверху вниз:
// consent → offline → limit → first → low → all_done → day_done → next.
// Функция отдаёт состояние и ПРИЧИНУ решения — её пишет журнал [DIALOGS-SCENE] (значения, а не голое true/false).
// ═══════════════════════════════════════════════════════════════════════════

/** Порядок = приоритет из таблицы эталона (1…8). */
export const DIALOGS_SCENE_STATES = ['consent', 'offline', 'limit', 'first', 'low', 'all_done', 'day_done', 'next'] as const;
export type DialogsSceneState = typeof DIALOGS_SCENE_STATES[number];

/** «Осталось мало ответов» — не больше трёх в месяц у Free (эталон: «Осталось 3 ответа в этом месяце»). */
export const DIALOGS_SCENE_LOW_QUOTA_MAX = 3;

export type DialogsSceneInput = Readonly<{
  /** Согласие на AI-диалоги; false — не дано; null — ещё не известно (не решаем «нет согласия» вслепую). */
  consent: boolean | null;
  /** Сети нет по данным системы; null — ещё не известно. */
  offline: boolean | null;
  plus: boolean;
  /** Остаток ответов месяца у Free; null — неизвестно (кэш пуст), тогда «закончились» и «мало» не показываем. У Plus не учитывается. */
  quotaRemaining: number | null;
  /** Пройдено диалогов за всё время; null — неизвестно. */
  doneCount: number | null;
  /** Всего диалогов в каталоге; null — неизвестно. */
  totalCount: number | null;
  /** Сегодня диалог засчитан («Потренировать диалог» 1/1); null — неизвестно. */
  dayDone: boolean | null;
}>;

export type DialogsSceneDecision = Readonly<{
  state: DialogsSceneState;
  /** Что решило выбор — значения, а не голое true/false; пишется в [DIALOGS-SCENE]. */
  reason: string;
}>;

export function pickDialogsSceneState(input: DialogsSceneInput): DialogsSceneDecision {
  const decide = (state: DialogsSceneState, reason: string): DialogsSceneDecision => Object.freeze({ state, reason });
  if (input.consent === false) return decide('consent', 'consent=false');
  if (input.offline === true) return decide('offline', 'offline=true');
  if (!input.plus && input.quotaRemaining !== null && input.quotaRemaining <= 0) return decide('limit', `plus=false quotaRemaining=${input.quotaRemaining}`);
  if (input.doneCount === 0) return decide('first', 'doneCount=0');
  if (!input.plus && input.quotaRemaining !== null && input.quotaRemaining <= DIALOGS_SCENE_LOW_QUOTA_MAX) return decide('low', `plus=false quotaRemaining=${input.quotaRemaining} max=${DIALOGS_SCENE_LOW_QUOTA_MAX}`);
  if (input.doneCount !== null && input.totalCount !== null && input.totalCount > 0 && input.doneCount >= input.totalCount) return decide('all_done', `doneCount=${input.doneCount} totalCount=${input.totalCount}`);
  if (input.dayDone === true) return decide('day_done', 'dayDone=true');
  return decide('next', `default consent=${String(input.consent)} offline=${String(input.offline)} plus=${String(input.plus)} quotaRemaining=${String(input.quotaRemaining)} doneCount=${String(input.doneCount)} dayDone=${String(input.dayDone)}`);
}

/** Сколько из десяти делений шкалы ответов закрашено (использовано): 30 из 30 → 10, осталось 3 из 30 → 9, нет данных → 0. */
export function dialogsSceneMeterUsed(remaining: number | null, total: number): number {
  if (remaining === null || total <= 0) return 0;
  const used = Math.max(0, Math.min(total, total - remaining));
  return Math.round((used / total) * 10);
}
