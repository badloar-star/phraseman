import React from 'react';
import ReportErrorButton from '../../components/ReportErrorButton';
import { useLang } from '../../components/LangContext';
import { triLang } from '../../constants/i18n';
import { spireReportSubmitVerdict } from './spire_report_verdict';
import {
  buildSpireTaskReportSubmission,
  type SpireTaskReportSubmissionInput,
} from './task_report_client';

export type SpireTaskReportButtonProps = Readonly<{
  claim: Omit<SpireTaskReportSubmissionInput, 'reason'>;
  removeFromRemainingRun(taskId: string): void;
  taskText?: string;
  testID?: string;
}>;

/**
 * Standard flag UX mounted by the real Spire step renderer. A confirmed report
 * quarantines the task on the server and removes the local report action.
 */
export function SpireTaskReportButton({
  claim,
  removeFromRemainingRun,
  taskText,
  testID,
}: SpireTaskReportButtonProps) {
  const { lang } = useLang();
  return (
    <ReportErrorButton
      screen="spire"
      dataId={claim.taskId}
      dataText={taskText ?? claim.taskId}
      variant="icon-flag"
      // зачем (аудит 11.10): подпись для скринридера на языке интерфейса и под именем раздела «Шпиль», а не «Spire» по-русски
      accessibilityLabel={triLang(lang, {
        ru: 'Сообщить об ошибке в задании Пика', uk: 'Повідомити про помилку в завданні Піка', en: 'Report a mistake in this Peak task',
        es: 'Informar de un error en esta tarea del Pico', 'pt-BR': 'Relatar um erro nesta tarefa do Pico', vi: 'Báo lỗi trong nhiệm vụ Đỉnh này',
        id: 'Laporkan kesalahan di tugas Puncak ini', tr: 'Bu Zirve görevindeki hatayı bildir', pl: 'Zgłoś błąd w tym zadaniu Szczytu',
      })}
      testID={testID}
      submitOverride={async ({ comment }) => {
        let safeLocalRemoval = false;
        const result = await buildSpireTaskReportSubmission({ ...claim, reason: comment }).submit({
          removeFromRemainingRun: (taskId) => {
            safeLocalRemoval = true;
            removeFromRemainingRun(taskId);
          },
        });
        return spireReportSubmitVerdict({ serverConfirmed: result.serverConfirmed, queuedAndRemoved: safeLocalRemoval, taskId: claim.taskId });
      }}
    />
  );
}

export default SpireTaskReportButton;
