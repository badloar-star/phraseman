// ═══════════════════════════════════════════════════════════════════════════
// first_dialog_gate.ts — когда на итоге диалога показывать m17 «Первый диалог пройден».
//
// зачем (координатор 15.10, ТЗ m17): один раз на изучаемый язык, после первого ЗАСЧИТАННОГО диалога. «Засчитан» ровно как в dialogue_v2_session.tsx: диалог закончил собеседник (endedBy = bot) и у ученика была
// хотя бы одна реплика. «Первый» = в локальном наборе пройденных диалогов этого языка (dialogue_v2_done_store) ровно один сценарий — этот. Цифры момента (реплики, цели) берутся из итога: нет итога с целями
// — момент не выдумываем и не показываем. Чистая функция: причина решения уходит в журнал [FIRST-DIALOG].
// ═══════════════════════════════════════════════════════════════════════════

export type FirstDialogInput = Readonly<{
  momentsV3: boolean;
  endedBy: 'bot' | 'limit' | 'manual';
  learnerTurns: number;
  scenarioId: string | null;
  /** Набор пройденных сценариев этого языка (память процесса). */
  doneIds: ReadonlySet<string>;
  /** Итог диалога готов и в нём есть цели. */
  goalsTotal: number;
  /** Отметка «уже показывали»: null — ещё читается / аккаунт не определён. */
  alreadyShown: boolean | null;
}>;

export type FirstDialogDecision = Readonly<{ show: boolean; reason: string }>;

export function decideFirstDialogMoment(input: FirstDialogInput): FirstDialogDecision {
  if (!input.momentsV3) return { show: false, reason: 'флаг moments_v3 выключен' }; // guard-ok: log-only reason
  if (input.endedBy !== 'bot') return { show: false, reason: `диалог не засчитан: endedBy=${input.endedBy}` }; // guard-ok: log-only reason
  if (input.learnerTurns <= 0) return { show: false, reason: `диалог не засчитан: реплик ${input.learnerTurns}` }; // guard-ok: log-only reason
  if (!input.scenarioId) return { show: false, reason: 'нет id сценария' }; // guard-ok: log-only reason
  if (input.goalsTotal <= 0) return { show: false, reason: 'итог без целей — цифры момента выдумывать нельзя' }; // guard-ok: log-only reason
  if (!input.doneIds.has(input.scenarioId)) return { show: false, reason: `сценарий ${input.scenarioId} не отмечен пройденным` }; // guard-ok: log-only reason
  if (input.doneIds.size !== 1) return { show: false, reason: `не первый: пройдено сценариев ${input.doneIds.size}` }; // guard-ok: log-only reason
  if (input.alreadyShown === null) return { show: false, reason: 'отметка показа ещё читается' }; // guard-ok: log-only reason
  if (input.alreadyShown) return { show: false, reason: 'для этого языка уже показывали' }; // guard-ok: log-only reason
  return { show: true, reason: `первый засчитанный диалог языка: реплик=${input.learnerTurns} целей=${input.goalsTotal}` }; // guard-ok: log-only reason
}
