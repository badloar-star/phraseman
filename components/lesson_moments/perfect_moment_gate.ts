// ═══════════════════════════════════════════════════════════════════════════
// perfect_moment_gate.ts — когда на итоге урока показывать m09 «Идеальный урок» и «один раз за прохождение».
//
// зачем (координатор 15.10, ТЗ ETALON_MOMENTS_V3_TRANSFER m09): момент показывается только при включённом moments_v3, на итоге обычного урока (не комбо), если в проходе не было ни одной
// ошибки, и только когда число монет уже посчитано (руны урока досчитаны — иначе «+N» прыгнуло бы после показа). «Один раз» держится в памяти процесса по ключу прохождения
// (урок + язык + попытка), НЕ в хранилище: празднование не ставится в durable-очередь (ФУНДАМЕНТ владельца 01.09) — повторный заход на тот же итог не повторяет штамп.
// Чистые функции: вызывающий (app/lesson_complete.tsx) только передаёт значения, а причина решения уходит в журнал [LESSON-PERFECT].
// ═══════════════════════════════════════════════════════════════════════════

export type PerfectMomentInput = Readonly<{
  momentsV3: boolean;
  isCombo: boolean;
  /** Верных и неверных ответов прохода; null — итог ещё не посчитан. */
  counts: Readonly<{ correct: number; wrong: number }> | null;
  /** Руны урока ещё читаются / досчитываются. */
  coinsHydrating: boolean;
}>;

export type PerfectMomentDecision = Readonly<{ show: boolean; reason: string }>;

/** Показывать ли штамп «ИДЕАЛ»; причина — для журнала (какое значение решило). */
export function decidePerfectMoment(input: PerfectMomentInput): PerfectMomentDecision {
  if (!input.momentsV3) return { show: false, reason: 'флаг moments_v3 выключен' }; // guard-ok: log-only reason
  if (input.isCombo) return { show: false, reason: 'комбо-итог без идеала' }; // guard-ok: log-only reason
  if (!input.counts) return { show: false, reason: 'итог ещё не посчитан' }; // guard-ok: log-only reason
  if (input.counts.correct <= 0) return { show: false, reason: `верных ответов нет (correct=${input.counts.correct})` }; // guard-ok: log-only reason
  if (input.counts.wrong > 0) return { show: false, reason: `были ошибки (wrong=${input.counts.wrong})` }; // guard-ok: log-only reason
  if (input.coinsHydrating) return { show: false, reason: 'монеты урока ещё считаются' }; // guard-ok: log-only reason
  return { show: true, reason: `идеал: верно=${input.counts.correct} ошибок=0` }; // guard-ok: log-only reason
}

const shownInThisProcess = new Set<string>();

/** Ключ прохождения: урок + изучаемый язык + попытка. */
export function perfectMomentKey(lessonId: number, studyTarget: string, attemptId: string): string {
  return `${lessonId}:${studyTarget}:${attemptId}`;
}

/** true — этот проход ещё не праздновали, и пометка поставлена; false — уже показывали (повторный заход на тот же итог). */
export function claimPerfectMoment(key: string): boolean {
  if (shownInThisProcess.has(key)) return false;
  shownInThisProcess.add(key);
  return true;
}

export function resetPerfectMomentForTests(): void {
  shownInThisProcess.clear();
}
