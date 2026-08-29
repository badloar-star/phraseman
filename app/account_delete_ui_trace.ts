import { DebugLogger } from './debug-logger';

const MAX_STAGES = 24;
let stages: string[] | null = null;

function normalizeStage(stage: string): string {
  return stage.replace(/[^a-z0-9_:-]/gi, '_').slice(0, 80);
}

/**
 * Privacy-safe account deletion UI breadcrumb trail.
 *
 * The trace contains no uid, email, route params or account data. It survives
 * the local wipe in memory and is persisted only after the clean onboarding
 * actually renders (or the handoff reports a failure).
 */
export function startAccountDeleteUiTrace(): void {
  stages = [];
  traceAccountDeleteUi('confirm_pressed');
}

export function traceAccountDeleteUi(stage: string): void {
  if (!stages) return;
  const safeStage = normalizeStage(stage);
  if (stages.length < MAX_STAGES) stages.push(safeStage);
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.info(`[account-delete-ui] ${safeStage}`);
  }
}

export function finishAccountDeleteUiTrace(outcome: 'onboarding_visible' | 'handoff_failed'): void {
  if (!stages) return;
  traceAccountDeleteUi(outcome);
  const snapshot = stages.join('>');
  stages = null;
  // зачем (ИНЦИДЕНТ 2026-08-29): severity 'warning' НЕ доезжает до Firestore —
  // DebugLogger пишет туда только 'critical' (см. writeToFirestore в
  // app/debug-logger.ts). След удаления оставался на устройстве человека,
  // который уже ушёл, и владелец его никогда не видел. Удаление аккаунта —
  // необратимая операция, её обрыв обязан быть виден с сервера.
  //
  // Успешный исход остаётся локальным: писать в Firestore на КАЖДОЕ удачное
  // удаление — лишняя запись без диагностической ценности (серверная сторона
  // уже пишет свою диагностику в account_deletion_diagnostics).
  DebugLogger.error(
    'account_delete_ui:handoff',
    new Error(snapshot),
    outcome === 'handoff_failed' ? 'critical' : 'warning',
  );
}

