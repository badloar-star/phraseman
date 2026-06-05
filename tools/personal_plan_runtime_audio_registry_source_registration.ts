import fs from 'node:fs';
import path from 'node:path';

import type { PersonalPlanRuntimeAudioApprovalIntake } from '../app/personal_plan_runtime_audio_approval_intake';
import {
  buildPersonalPlanRuntimeAudioRegistrySourceRegistration,
} from '../app/personal_plan_runtime_audio_registry_source_registration';

const approvalIntakePath = path.join(
  '.codex-tmp',
  'personal-plans',
  'runtime-audio-approval-intake.json',
);
const outputPath = path.join(
  '.codex-tmp',
  'personal-plans',
  'runtime-audio-registry-source-registration.json',
);

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

const approvalIntake = readJson<PersonalPlanRuntimeAudioApprovalIntake>(approvalIntakePath);
const registration = buildPersonalPlanRuntimeAudioRegistrySourceRegistration({
  generatedAt: new Date().toISOString(),
  registrationOwnerId: 'runtime-audio-registry-source-registration',
  approvalIntake,
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(registration, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  outputPath,
  status: registration.status,
  sourceApprovalIntakeStatus: registration.sourceApprovalIntakeStatus,
  approvedFinalAssetCount: registration.approvedFinalAssetCount,
  registryCandidateCount: registration.registryCandidateCount,
  nextRequiredStep: registration.nextRequiredStep,
}, null, 2));
