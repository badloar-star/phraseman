import fs from 'node:fs';
import path from 'node:path';

import type { GeneratedPlanAudioAssetsResult } from '../app/personal_plan_audio_generated_assets';
import {
  buildPersonalPlanRuntimeAudioHumanApprovalRecords,
} from '../app/personal_plan_runtime_audio_human_approval_records';

const generatedAssetsPath = path.join(
  '.codex-tmp',
  'personal-plans',
  'runtime-generated-audio-assets.json',
);
const outputPath = path.join(
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
const approvalRecords = buildPersonalPlanRuntimeAudioHumanApprovalRecords({
  approvedAt: new Date().toISOString(),
  reviewerId: 'user-audio-review-2026-06-05',
  generatedAssets: generatedReport.generatedAssets.assets,
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(approvalRecords, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  outputPath,
  reviewerDecision: approvalRecords.reviewerDecision,
  generatedAssetCount: approvalRecords.generatedAssetCount,
  approvalRecordCount: approvalRecords.approvalRecordCount,
  nextRequiredStep: approvalRecords.nextRequiredStep,
}, null, 2));
