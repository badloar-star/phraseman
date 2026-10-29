// learning_v2_placement_entry_diagnostics.ts — [PLACEMENT-ENTRY] в журнале обращений: видна ли «Не хочу с начала», почему скрыта,
// куда нажали, какую плашку показали на закрытой карте.
//
// зачем (жалоба №8, координатор 29.10): console.log в прод-сборке вырезается — без события журнала по жалобе «оплатила, всё закрыто»
// не видно, была ли у человека кнопка теста и почему нет. Коды (белый список сервера ^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$, без id):
//   placement:entry:<where>:<reason>:l<урок>    — решение показа (shown / used / used_unknown / beyond_cap), одно событие на смену
//   placement:tap:<where>                       — нажатие «Не хочу с начала» (cover / plaque)
//   placement:lockhint:<btn|text>:s<занятие>    — плашка «Откроется после занятия N» на тапе по закрытой карте
import { recordSupportDiagnostic } from './support_diagnostics';
import type { LearningV2PlacementEntryReasonV1 } from './learning_v2_placement_entry_v1';

export type PlacementEntryWhere = 'cover' | 'plaque';

const count = (value: number | null): number => Math.max(0, Math.min(99, Math.round(value ?? 0)));

export function placementEntryAction(where: PlacementEntryWhere, reason: LearningV2PlacementEntryReasonV1, lesson: number | null): string {
  return `placement:entry:${where}:${reason}:l${count(lesson)}`;
}

export function placementTapAction(where: PlacementEntryWhere): string {
  return `placement:tap:${where}`;
}

export function placementLockHintAction(withButton: boolean, session: number): string {
  return `placement:lockhint:${withButton ? 'btn' : 'text'}:s${count(session)}`;
}

let lastEntryAction = '';

function record(action: string, result: 'info' | 'blocked', nowMs: number): void {
  void recordSupportDiagnostic({ event: 'feature_action', action, screen: '/lessons', result, subject: 'app', atMs: nowMs }).catch((error: unknown) => {
    console.warn('[PLACEMENT-ENTRY] запись в журнал не удалась', action, error instanceof Error ? error.message : String(error));
  });
}

/** Решение показа кнопки. Пишется только при смене (рендер обложки частый). */
export function notePlacementEntryDecision(where: PlacementEntryWhere, reason: LearningV2PlacementEntryReasonV1, lesson: number | null, nowMs: number = Date.now()): void {
  const action = placementEntryAction(where, reason, lesson);
  if (action === lastEntryAction) return; // зачем: тот же итог уже записан
  lastEntryAction = action;
  console.warn('[PLACEMENT-ENTRY] decision', action); // guard-ok: одна строка на смену решения; warn — переживает прод-сборку
  record(action, reason === 'shown' ? 'info' : 'blocked', nowMs);
}

export function notePlacementEntryTap(where: PlacementEntryWhere, nowMs: number = Date.now()): void {
  const action = placementTapAction(where);
  console.warn('[PLACEMENT-ENTRY] tap', action); // guard-ok: одна строка на нажатие
  record(action, 'info', nowMs);
}

export function notePlacementLockHint(withButton: boolean, session: number, nowMs: number = Date.now()): void {
  const action = placementLockHintAction(withButton, session);
  console.warn('[PLACEMENT-ENTRY] lock hint', action); // guard-ok: одна строка на тап по закрытой карте
  record(action, 'blocked', nowMs);
}

/** Только для тестов. */
export function resetPlacementEntryDiagnosticsForTests(): void {
  lastEntryAction = '';
}

export default function __RouteShim() { return null; }
