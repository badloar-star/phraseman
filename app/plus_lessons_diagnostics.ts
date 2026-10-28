// plus_lessons_diagnostics.ts — [PLUS-LESSONS]: какое решение о доступе к уроку принято, для кого и по какой ветке.
//
// зачем (владелец 28.10 ~21:05 «Plus открывает все 32»; жалобы #3/#8/#11 «урок не открывается»): console в релизе в обращения не попадает, поэтому решение
// пишется ещё и событием журнала обращений (recordSupportDiagnostic → «Поддержка» → админка): feature_action, экран /lessons,
//   action plus:lessons:<site>:<decision>:<branch>:l<id>
//   site: unlock (общая функция замка Plus: меню, охранник) | gate (охранник lesson1, ветки не-Plus) | continue (карточка «Продолжить» на Главной)
//   decision: available | premium_required | level_required | progress_required;  branch: plus_all | plus_matrix | free_matrix | earned | tester | error
// Без идентификаторов человека: только номер урока, тариф (true/false) и ветка. Белый список сервера (safeDiagnosticAction) формат пропускает
// (≤ 80 знаков, нет «слова» из 20+ знаков) — замок в tests/plus_lessons_all_open_owner_lock_2026_10_28.test.ts. Повтор одного решения в 10 с не пишется.
import { recordSupportDiagnostic } from './support_diagnostics';

const LOG = '[PLUS-LESSONS]';
const DEDUPE_MS = 10_000;
const lastAt = new Map<string, number>();

export type PlusLessonsSite = 'unlock' | 'gate' | 'continue';
export type PlusLessonsDecision = 'available' | 'premium_required' | 'level_required' | 'progress_required';
export type PlusLessonsBranch = 'plus_all' | 'plus_matrix' | 'free_matrix' | 'earned' | 'tester' | 'error';

export function plusLessonsAction(site: PlusLessonsSite, decision: PlusLessonsDecision, branch: PlusLessonsBranch, lessonId: number): string {
  return `plus:lessons:${site}:${decision}:${branch}:l${Math.trunc(lessonId)}`.slice(0, 80);
}

export function notePlusLessonsDecision(
  site: PlusLessonsSite,
  lessonId: number,
  premiumNow: boolean | null,
  decision: PlusLessonsDecision,
  branch: PlusLessonsBranch,
  nowMs: number = Date.now(),
): void {
  const key = `${site}:${lessonId}:${decision}:${branch}:${String(premiumNow)}`;
  const prev = lastAt.get(key);
  if (prev !== undefined && nowMs - prev < DEDUPE_MS) return; // повтор того же решения — не шумим (причина очевидна: ключ тот же)
  lastAt.set(key, nowMs); // guard-ok: Map в памяти процесса (дедупликация записей журнала), не документ и не баланс
  console.log(`${LOG} решение`, JSON.stringify({ site, lessonId, premiumNow, decision, branch })); // guard-ok: одна строка на решение
  void recordSupportDiagnostic({
    event: 'feature_action',
    action: plusLessonsAction(site, decision, branch, lessonId),
    screen: '/lessons',
    result: decision === 'available' ? 'success' : 'blocked',
    subject: 'app',
    atMs: nowMs,
  }).catch((error: unknown) => {
    console.warn(`${LOG} журнал обращений: запись не удалась`, error instanceof Error ? error.message : String(error)); // guard-ok: сбой записи журнала не ломает доступ
  });
}

export function resetPlusLessonsDiagnosticsForTests(): void {
  lastAt.clear();
}

export default function __RouteShim() { return null; }
