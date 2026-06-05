import fs from 'node:fs';
import path from 'node:path';

import type { GeneratedPlanAudioAssetsResult } from '../app/personal_plan_audio_generated_assets';
import {
  buildPersonalPlanRuntimeAudioApprovalIntake,
} from '../app/personal_plan_runtime_audio_approval_intake';
import type { PersonalPlanRuntimeAudioHumanApprovalRecords } from '../app/personal_plan_runtime_audio_human_approval_records';

const generatedAssetsPath = path.join(
  '.codex-tmp',
  'personal-plans',
  'runtime-generated-audio-assets.json',
);
const outputPath = path.join(
  '.codex-tmp',
  'personal-plans',
  'runtime-audio-approval-intake.json',
);
const approvalRecordsPath = path.join(
  '.codex-tmp',
  'personal-plans',
  'runtime-audio-human-approval-records.json',
);

type RuntimeGeneratedAudioAssetsReport = {
  generatedAssets: GeneratedPlanAudioAssetsResult;
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

const generatedReport = readJson<RuntimeGeneratedAudioAssetsReport>(generatedAssetsPath);
const approvalRecords = fs.existsSync(approvalRecordsPath)
  ? readJson<PersonalPlanRuntimeAudioHumanApprovalRecords>(approvalRecordsPath)
  : null;
const intake = buildPersonalPlanRuntimeAudioApprovalIntake({
  generatedAt: new Date().toISOString(),
  approvalOwnerId: 'runtime-audio-approval-intake',
  generatedAssets: generatedReport.generatedAssets.assets,
  approvalInput: approvalRecords?.approvalInput ?? {
    kind: 'plan_audio_approval_input',
    approvals: [],
  },
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(intake, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  outputPath,
  status: intake.status,
  generatedAssetCount: intake.generatedAssetCount,
  approvalRecordCount: intake.approvalRecordCount,
  approvedFinalAssetCount: intake.approvedFinalAssetCount,
  missingApprovalRecordCount: intake.missingApprovalRecordCount,
  invalidApprovalRecordCount: intake.invalidApprovalRecordCount,
}, null, 2));
