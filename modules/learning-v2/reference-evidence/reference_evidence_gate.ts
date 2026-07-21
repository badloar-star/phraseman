import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const SELECTED_REFERENCE_MODE_IDS = [
  'sound-discrimination',
  'guided-phrase-pronunciation',
  'prompted-translation-by-voice',
  'contextual-dialogue-mission',
  'speaking-club-mission',
] as const;

export type ReferenceEvidenceModeId = (typeof SELECTED_REFERENCE_MODE_IDS)[number];

const PREVIEW_STATES = [
  'prompt',
  'active',
  'processing',
  'success',
  'needs_work',
  'recovery',
] as const;

type JsonObject = Record<string, unknown>;

export interface ReferenceEvidenceGateResult {
  ready: boolean;
  blockers: string[];
  modeResults: Record<ReferenceEvidenceModeId, ReferenceEvidenceModeResult>;
}

export interface ReferenceEvidenceModeResult {
  ready: boolean;
  blockers: string[];
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readJson(filePath: string, blockers: string[], code: string): unknown {
  if (!fs.existsSync(filePath)) {
    blockers.push(code);
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  } catch {
    blockers.push(`${code}_invalid_json`);
    return undefined;
  }
}

function exactStrings(value: unknown, expected: readonly string[]): boolean {
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    expected.every((item) => value.includes(item)) &&
    value.every((item) => typeof item === 'string' && expected.includes(item))
  );
}

function sha256File(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function validateCapture(rootDir: string, capture: unknown): boolean {
  if (!isObject(capture) || capture.sourceTier !== 'A_first_hand_current') return false;
  const requiredStrings = [
    'evidenceId',
    'product',
    'activityName',
    'platform',
    'device',
    'osVersion',
    'appVersionBuild',
    'locale',
    'learnerLevel',
    'accountSubscriptionState',
    'captureDate',
    'captureMethod',
    'sourceProvenance',
    'rightsUseNote',
    'researcher',
    'rawArtifactPath',
    'rawSha256',
  ];
  if (requiredStrings.some((key) => typeof capture[key] !== 'string' || capture[key] === '')) {
    return false;
  }
  if (!String(capture.rawArtifactPath).startsWith('qa-artifacts/learning-v2/reference-evidence/')) {
    return false;
  }
  if (!/^[a-f0-9]{64}$/.test(String(capture.rawSha256))) return false;
  const rawEvidenceRoot = path.resolve(
    rootDir,
    'qa-artifacts',
    'learning-v2',
    'reference-evidence',
  );
  const rawArtifactPath = path.resolve(rootDir, String(capture.rawArtifactPath));
  if (!rawArtifactPath.startsWith(`${rawEvidenceRoot}${path.sep}`)) return false;
  if (!fs.existsSync(rawArtifactPath) || sha256File(rawArtifactPath) !== capture.rawSha256) {
    return false;
  }
  const states = capture.states;
  if (!Array.isArray(states) || states.length < 3) return false;
  const stateKinds = new Set(
    states
      .filter(isObject)
      .map((state) => state.previewState)
      .filter((state): state is string => typeof state === 'string'),
  );
  return (
    stateKinds.has('prompt') &&
    stateKinds.has('active') &&
    (stateKinds.has('success') || stateKinds.has('needs_work') || stateKinds.has('recovery'))
  );
}

export function evaluateReferenceEvidencePack(rootDir: string): ReferenceEvidenceGateResult {
  const blockers: string[] = [];
  const modeResults = {} as Record<ReferenceEvidenceModeId, ReferenceEvidenceModeResult>;
  for (const modeId of SELECTED_REFERENCE_MODE_IDS) {
    modeResults[modeId] = { ready: false, blockers: [] };
  }
  const evidenceDir = path.join(rootDir, 'docs', 'v2', 'reference-evidence');
  const ledger = readJson(
    path.join(evidenceDir, 'activity-mode-capture-ledger.json'),
    blockers,
    'capture_ledger_missing',
  );
  const reviews = readJson(
    path.join(evidenceDir, 'activity-mode-ui-review.json'),
    blockers,
    'ui_review_missing',
  );

  const ledgerModes =
    isObject(ledger) && Array.isArray(ledger.selectedModes) ? ledger.selectedModes : [];
  const ledgerModeIds = ledgerModes
    .filter(isObject)
    .map((mode) => mode.modeId)
    .filter((modeId): modeId is string => typeof modeId === 'string');
  if (!exactStrings(ledgerModeIds, SELECTED_REFERENCE_MODE_IDS)) {
    blockers.push('selected_mode_set_mismatch');
  }
  const hasSharedStructuralBlocker = blockers.length > 0;

  const decisions =
    isObject(reviews) && Array.isArray(reviews.decisions) ? reviews.decisions : [];

  for (const modeId of SELECTED_REFERENCE_MODE_IDS) {
    const modeBlockers = modeResults[modeId].blockers;
    const blockMode = (code: string): void => {
      blockers.push(code);
      modeBlockers.push(code);
    };
    const mode = ledgerModes.find(
      (candidate) => isObject(candidate) && candidate.modeId === modeId,
    );
    const captures = isObject(mode) && Array.isArray(mode.captures) ? mode.captures : [];
    if (!captures.some((capture) => validateCapture(rootDir, capture))) {
      blockMode(`${modeId}:lawful_first_hand_capture_missing`);
    }

    const designPath = path.join(evidenceDir, 'contact-sheets', `${modeId}.png`);
    const designExists = fs.existsSync(designPath);
    if (!designExists) {
      blockMode(`${modeId}:contact_sheet_missing`);
    }

    const decision = decisions.find(
      (candidate) => isObject(candidate) && candidate.modeId === modeId,
    );
    if (!isObject(decision) || decision.status !== 'approved') {
      blockMode(`${modeId}:current_owner_approval_missing`);
      continue;
    }
    const conditionCoverage = decision.conditionCoverage;
    if (
      typeof decision.wireframeRevision !== 'string' ||
      typeof decision.wireframeSha256 !== 'string' ||
      typeof decision.reviewer !== 'string' ||
      typeof decision.reviewedAt !== 'string' ||
      typeof decision.notes !== 'string' ||
      typeof decision.distinctivenessReview !== 'string' ||
      !isObject(conditionCoverage) ||
      !exactStrings(conditionCoverage.connectivity, ['online', 'offline']) ||
      !exactStrings(conditionCoverage.microphone, ['granted', 'denied', 'unavailable']) ||
      !exactStrings(conditionCoverage.signal, ['clean', 'noisy', 'silence', 'not_applicable']) ||
      !exactStrings(conditionCoverage.scorerOutcome, [
        'pass',
        'needs_work',
        'uncertain',
        'system_invalid',
        'not_applicable',
      ]) ||
      !exactStrings(conditionCoverage.motion, ['full', 'reduced']) ||
      !exactStrings(conditionCoverage.textScalePercent, ['100', '150', '200']) ||
      !exactStrings(conditionCoverage.colorScheme, ['light', 'dark']) ||
      typeof decision.frameCount !== 'number' ||
      decision.frameCount < 6 ||
      !exactStrings(decision.previewStates, PREVIEW_STATES) ||
      decision.competitorAssetDependencies !== 0
    ) {
      blockMode(`${modeId}:approval_record_incomplete`);
      continue;
    }
    if (designExists && sha256File(designPath) !== decision.wireframeSha256) {
      blockMode(`${modeId}:approval_stale_hash`);
    }
    modeResults[modeId].ready = !hasSharedStructuralBlocker && modeBlockers.length === 0;
  }

  return { ready: blockers.length === 0, blockers, modeResults };
}
