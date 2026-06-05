import {
  buildGavanWeek1CanonicalPlan,
} from '../app/personal_plan_gavan_week1_canonical_plan';
import {
  buildGavanWeek1PronunciationReferenceAdapter,
} from '../app/personal_plan_gavan_week1_pronunciation_reference_adapter';
import {
  buildGavanWeek1PronunciationScoringReadinessPacket,
} from './personal_plan_gavan_week1_pronunciation_scoring_readiness_packet';
import {
  GAVAN_WEEK1_PRONUNCIATION_SCORING_PROVIDER_CONTRACT_PATH,
  type GavanWeek1PronunciationScoringProviderMetadata,
  writeGavanWeek1PronunciationScoringProviderContract,
} from './personal_plan_gavan_week1_pronunciation_scoring_provider_contract';
import {
  GAVAN_WEEK1_PRONUNCIATION_SCORED_ATTEMPT_EVIDENCE_INTAKE_REPORT_PATH,
  writeGavanWeek1PronunciationScoredAttemptEvidenceIntakeReport,
} from './personal_plan_gavan_week1_pronunciation_scored_attempt_evidence_intake_report';
import {
  GAVAN_WEEK1_PRONUNCIATION_PRODUCTION_READINESS_GATE_PATH,
  writeGavanWeek1PronunciationProductionReadinessGate,
} from './personal_plan_gavan_week1_pronunciation_production_readiness_gate';

const generatedAt = new Date().toISOString();
const provider: GavanWeek1PronunciationScoringProviderMetadata = {
  providerId: 'openai' as const,
  scorerId: 'pronunciation-scorer:openai:gavan-week1:v1',
  scoringVersion: 'gavan-week1-openai-pronunciation-v1',
  resultFields: ['score', 'pronunciationScore', 'fluencyScore', 'intonationScore'],
  minimumConfidence: 0.75,
  approvedForScoredAttemptValidation: true,
  productionReady: false,
  finalScoringReady: false,
  liveEditsAllowed: false,
};

const adapter = buildGavanWeek1PronunciationReferenceAdapter({
  plan: buildGavanWeek1CanonicalPlan(),
});
const readinessPacketResult = buildGavanWeek1PronunciationScoringReadinessPacket(adapter, {
  generatedAt,
});

if (!readinessPacketResult.packet) {
  console.log(JSON.stringify({
    status: 'blocked_readiness_packet',
    issues: readinessPacketResult.issues,
  }, null, 2));
  process.exit(1);
}

const contractResult = writeGavanWeek1PronunciationScoringProviderContract(
  readinessPacketResult.packet,
  {
    generatedAt,
    provider,
    targetPath: GAVAN_WEEK1_PRONUNCIATION_SCORING_PROVIDER_CONTRACT_PATH,
  },
);

if (!contractResult.valid || !contractResult.contract) {
  console.log(JSON.stringify({
    status: 'blocked_provider_contract',
    issues: contractResult.issues,
  }, null, 2));
  process.exit(1);
}

const intakeResult = writeGavanWeek1PronunciationScoredAttemptEvidenceIntakeReport(
  contractResult.contract,
  {},
  {
    generatedAt,
    evidenceOwnerId: 'pronunciation-openai-contract-refresh',
    targetPath: GAVAN_WEEK1_PRONUNCIATION_SCORED_ATTEMPT_EVIDENCE_INTAKE_REPORT_PATH,
  },
);

if (!intakeResult.valid || !intakeResult.report) {
  console.log(JSON.stringify({
    status: 'blocked_scored_attempt_intake',
    issues: intakeResult.issues,
  }, null, 2));
  process.exit(1);
}

const gateResult = writeGavanWeek1PronunciationProductionReadinessGate(
  contractResult.contract,
  {},
  {
    generatedAt,
    evidenceOwnerId: 'pronunciation-openai-contract-refresh',
    readinessOwnerId: 'pronunciation-production-readiness',
    targetPath: GAVAN_WEEK1_PRONUNCIATION_PRODUCTION_READINESS_GATE_PATH,
  },
);

console.log(JSON.stringify({
  contractPath: contractResult.targetPath,
  contractStatus: contractResult.contract.status,
  intakePath: intakeResult.targetPath,
  intakeStatus: intakeResult.report.status,
  intakeSummary: intakeResult.report.summary,
  gatePath: gateResult.targetPath,
  gateStatus: gateResult.gate.status,
  gateSummary: gateResult.gate.summary,
}, null, 2));
