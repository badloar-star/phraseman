import React from 'react';
import ReportErrorButton from '../../components/ReportErrorButton';
import { useLang } from '../../components/LangContext';
import { triLang } from '../../constants/i18n';
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
        ru: 'Сообщить об ошибке в задании Шпиля', uk: 'Повідомити про помилку в завданні Шпиля', en: 'Report a mistake in this Spire task',
        es: 'Informar de un error en esta tarea de la Aguja', 'pt-BR': 'Relatar um erro nesta tarefa da Torre', vi: 'Báo lỗi trong nhiệm vụ Tháp này',
        id: 'Laporkan kesalahan di tugas Menara ini', tr: 'Bu Kule görevindeki hatayı bildir', pl: 'Zgłoś błąd w tym zadaniu Wieży',
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
        return result.serverConfirmed || safeLocalRemoval ? 'sent' : 'failed';
      }}
    />
  );
}

export default SpireTaskReportButton;
