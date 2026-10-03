/**
 * зачем (дыра в экономике, 03.10): energyIntent больше не лежит в manifest (компактный формат
 * его не пропускает). Подтверждать энергию надо интентом, ЧЬЯ operationId совпадает с записью
 * журнала (`record.energyOperationId`): запись могла быть reused от прежней попытки
 * (другой attemptId) или ротирована после возврата (`:resume:N`). Списать «текущим» интентом при
 * несовпадении = две разные операции на одну запись → возврат потом уйдёт не по той операции
 * (потеря возврата или двойное списание). Поэтому интент ВОССТАНАВЛИВАЕТСЯ из записи так же, как
 * его строила исходная попытка; не получилось — явная ошибка `pending_grant_energy_intent_mismatch`
 * (экран уводит её в существующий fail-open, лог ниже).
 */
import { createEnergySessionIntent, type EnergySessionIntent } from '../energy_session_operation_ledger';

export const ENERGY_INTENT_MISMATCH_ERROR = 'pending_grant_energy_intent_mismatch';

type RecordEnergyView = Readonly<{
  energyOperationId: string;
  attemptId: string;
  energyKind: string;
  energySubjectId: string;
  energyAttemptOrdinal: number;
}>;

type ResolveInput = Readonly<{
  record: RecordEnergyView;
  currentIntent: EnergySessionIntent;
  /** kind/subject, с которыми экран строит свой интент (useEnergySessionIntent). */
  screenKind: string;
  screenSubjectId: string;
  /** Как экран строит attemptId интента из record.attemptId (по умолчанию — он сам). */
  attemptIdsFromRecordAttempt?: (recordAttemptId: string) => readonly string[];
  mode: string;
}>;

export function resolveEnergyIntentForRecord(input: ResolveInput): EnergySessionIntent {
  const { record, currentIntent, mode } = input;
  const log = (via: string): void => {
    console.log('[FC-PENDING-GRANT] energy_intent:resolved', JSON.stringify({
      mode, via, recordOp: record.energyOperationId, currentOp: currentIntent.operationId,
    }));
  };
  // 1) Запись создана именно этой попыткой экрана.
  if (record.energyOperationId === currentIntent.operationId) {
    log('current');
    return currentIntent;
  }
  // 2) Запись ротирована после возврата энергии: интент строит сам журнал (rotateRefundedEnergy).
  if (record.energyAttemptOrdinal > 0) {
    const rotated = createEnergySessionIntent(
      record.energyKind,
      record.energySubjectId,
      `${record.attemptId}:resume:${record.energyAttemptOrdinal}`,
    );
    if (rotated.operationId === record.energyOperationId) {
      log('rotated');
      return rotated;
    }
  }
  // 3) Запись от прежней попытки экрана: пересобираем интент по её attemptId.
  const attempts = input.attemptIdsFromRecordAttempt
    ? input.attemptIdsFromRecordAttempt(record.attemptId)
    : [record.attemptId];
  for (const attemptId of attempts) {
    const prior = createEnergySessionIntent(input.screenKind, input.screenSubjectId, attemptId);
    if (prior.operationId === record.energyOperationId) {
      log('prior_attempt');
      return prior;
    }
  }
  console.warn('[FC-PENDING-GRANT] energy_intent:mismatch', JSON.stringify({
    mode, recordOp: record.energyOperationId, currentOp: currentIntent.operationId,
    recordAttempt: record.attemptId, ordinal: record.energyAttemptOrdinal,
  }));
  throw new Error(ENERGY_INTENT_MISMATCH_ERROR);
}

/** зачем (ревью Opus, LOW 1): суффиксы ревизии 0..текущая ревизия экрана (+1 запас), потолок против разгона. */
const MAX_REVISION_CANDIDATES = 50;
export function attemptRevisionCandidates(attemptId: string, currentRevision: number): string[] {
  const top = Math.min(MAX_REVISION_CANDIDATES, Math.max(0, Math.floor(currentRevision)) + 1);
  const out: string[] = [];
  for (let revision = 0; revision <= top; revision += 1) out.push(`${attemptId}:${revision}`);
  return out;
}
