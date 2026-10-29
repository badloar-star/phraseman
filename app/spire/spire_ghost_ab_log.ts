// spire_ghost_ab_log.ts — журнал пробы «призрака друга» (владелец 29.10 ~09:30, «Да, проба на 2 недели»): какая корзина у человека и что показано.
//
// зачем: сравнивать группы «видят / не видят» надо по ЖУРНАЛУ и по существующим событиям (возврат на следующий день, число ступеней), а не по памяти. Событие журнала
// обращений (recordSupportDiagnostic → «Поддержка» → админка): feature_action, экран /spire, action spire:ghost:<shown|hidden>:<bucket>, bucket — a (показываем) | b (не показываем).
// Пишется ТОЛЬКО когда проба идёт (флаг «Пульта» ghost_friend_ab включён и у человека есть id): при выключенном флаге ступень как раньше, ни строчки. Один раз за процесс
// на действие: событий журнал хранит ≤ 200 и ступеней за день много. Идентификаторов в событии нет — корзина восстанавливается формулой из uid (docs/work/spire-ghost-ab-2026-10-29.md).
// Префикс [SPIRE] — сторож spire_game_source_contract: весь код в app/spire/ пишет с ним; метка задачи [SPIRE-GHOST-AB].
import { recordSupportDiagnostic } from '../support_diagnostics';
import type { SpireGhostDecision } from '../../components/spire/spire_ghost_flag';

const SPIRE = '[SPIRE]';
const TAG = '[SPIRE-GHOST-AB]';
const noted = new Set<string>();

export function spireGhostAbAction(decision: Pick<SpireGhostDecision, 'shown' | 'bucket'>): string | null {
  if (decision.bucket === null) return null;
  return `spire:ghost:${decision.shown ? 'shown' : 'hidden'}:${decision.bucket}`;
}

export function noteSpireGhostExperiment(decision: SpireGhostDecision, nowMs: number = Date.now()): void {
  if (decision.source !== 'experiment') {
    // выкл флаг / подмена Сверки / константа / нет id — пробы нет; причина видна в консоли только при no_uid (остальное — штатно и шумно)
    if (decision.source === 'no_uid') console.log(SPIRE, TAG, 'проба включена, но id аккаунта ещё нет — призрака не показываем, в журнал не пишем'); // guard-ok: ранний выход называет причину
    return;
  }
  const action = spireGhostAbAction(decision);
  if (action === null || noted.has(action)) return;
  noted.add(action);
  console.log(SPIRE, TAG, 'проба 50/50', JSON.stringify({ bucket: decision.bucket, shown: decision.shown, action })); // guard-ok: одна строка на действие за процесс
  void recordSupportDiagnostic({
    event: 'feature_action',
    action,
    screen: '/spire',
    result: 'info',
    subject: 'app',
    atMs: nowMs,
  }).catch((error: unknown) => {
    console.warn(SPIRE, TAG, 'запись в журнал обращений не удалась', error instanceof Error ? error.message : String(error)); // guard-ok: сбой записи журнала не ломает ступень
  });
}

export function resetSpireGhostAbLogForTests(): void {
  noted.clear();
}

/* expo-router: утилита, не экран */
export default function __SpireGhostAbLogRouteShim() { return null; }
