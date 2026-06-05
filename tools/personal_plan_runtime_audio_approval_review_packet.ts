import fs from 'node:fs';
import path from 'node:path';

import type { GeneratedPlanAudioAssetsResult } from '../app/personal_plan_audio_generated_assets';
import {
  buildPersonalPlanRuntimeAudioApprovalReviewPacket,
} from '../app/personal_plan_runtime_audio_approval_review_packet';

const generatedAssetsPath = path.join(
  '.codex-tmp',
  'personal-plans',
  'runtime-generated-audio-assets.json',
);
const outputPath = path.join(
  '.codex-tmp',
  'personal-plans',
  'runtime-audio-approval-review-packet.json',
);

type RuntimeGeneratedAudioAssetsReport = {
  generatedAssets: GeneratedPlanAudioAssetsResult;
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

const generatedReport = readJson<RuntimeGeneratedAudioAssetsReport>(generatedAssetsPath);
const packet = buildPersonalPlanRuntimeAudioApprovalReviewPacket({
  generatedAt: new Date().toISOString(),
  reviewOwnerId: 'runtime-audio-approval-review',
  generatedAssets: generatedReport.generatedAssets.assets,
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(packet, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  outputPath,
  status: packet.status,
  generatedAssetCount: packet.generatedAssetCount,
  reviewRowCount: packet.reviewRowCount,
  invalidGeneratedAssetCount: packet.invalidGeneratedAssetCount,
  approvalRecordCount: packet.approvalRecordCount,
  nextRequiredStep: packet.nextRequiredStep,
}, null, 2));
