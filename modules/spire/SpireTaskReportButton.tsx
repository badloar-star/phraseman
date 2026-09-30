import React from 'react';
import ReportErrorButton from '../../components/ReportErrorButton';
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
 * Standard flag UX for the future real Spire task renderer. This deliberately
 * is not mounted into a fabricated route: no learner task renderer exists yet.
 */
export function SpireTaskReportButton({
  claim,
  removeFromRemainingRun,
  taskText,
  testID,
}: SpireTaskReportButtonProps) {
  return (
    <ReportErrorButton
      screen="spire"
      dataId={claim.taskId}
      dataText={taskText ?? claim.taskId}
      variant="icon-flag"
      accessibilityLabel="Сообщить об ошибке в задании Spire"
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
