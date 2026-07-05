import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'admin');
const OUT_PATH = path.join(OUT_DIR, 'fr_admin_global_readiness_bridge_gate_v1.json');

const PATHS = {
  equivalenceMatrixAudit: path.join(OUT_DIR, 'admin_french_target_equivalence_matrix_audit_v1.json'),
  sourceLocaleWriteContractAudit: path.join(OUT_DIR, 'admin_source_locale_write_contract_audit_v1.json'),
  writePathIsolationGate: path.join(OUT_DIR, 'fr_admin_write_path_isolation_gate_audit_v1.json'),
  parityIsolationGate: path.join(OUT_DIR, 'fr_admin_parity_isolation_gate_audit_v1.json'),
  activationRollbackGate: path.join(OUT_DIR, 'fr_admin_activation_rollback_gate_audit_v1.json'),
};

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function blockerIds(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => (typeof item === 'string' ? item : item.blockerId)).filter(Boolean);
}

function assertSafetyClosed(artifact, label, blockers) {
  const safety = artifact.safety ?? {};
  for (const key of [
    'adminUiModifiedByThisScript',
    'adminStateModifiedByThisScript',
    'reviewerDecisionsImportedByThisScript',
    'firebaseOrServerUploadStarted',
    'runtimeDownloadsEnabled',
    'productionApplyApproved',
  ]) {
    if (safety[key] !== false) blockers.push(`${label}_${key}_NOT_FALSE`);
  }
  if (artifact.activationApproved !== false || ('activationApproved' in (artifact.summary ?? {}) && artifact.summary.activationApproved !== false)) {
    blockers.push(`${label}_ACTIVATION_APPROVED_NOT_FALSE`);
  }
}

function main() {
  const generatedAt = new Date().toISOString();
  const equivalenceMatrixAudit = readJson(PATHS.equivalenceMatrixAudit);
  const sourceLocaleWriteContractAudit = readJson(PATHS.sourceLocaleWriteContractAudit);
  const writePathIsolationGate = readJson(PATHS.writePathIsolationGate);
  const parityIsolationGate = readJson(PATHS.parityIsolationGate);
  const activationRollbackGate = readJson(PATHS.activationRollbackGate);
  const structuralBlockers = [];

  for (const [label, artifact] of Object.entries({
    equivalenceMatrixAudit,
    sourceLocaleWriteContractAudit,
    writePathIsolationGate,
    parityIsolationGate,
    activationRollbackGate,
  })) {
    if (artifact.status !== 'HOLD') structuralBlockers.push(`${label.toUpperCase()}_STATUS_NOT_HOLD`);
    if (artifact.summary?.checksPassed !== artifact.summary?.checksTotal) {
      structuralBlockers.push(`${label.toUpperCase()}_CHECKS_NOT_ALL_PASS`);
    }
    if ((artifact.summary?.blockers ?? 0) !== 0 || (artifact.blockers?.length ?? 0) !== 0) {
      structuralBlockers.push(`${label.toUpperCase()}_STRUCTURAL_BLOCKERS_PRESENT`);
    }
    assertSafetyClosed(artifact, label.toUpperCase(), structuralBlockers);
  }

  const missingSurfaceBlockers = [
    ...blockerIds(parityIsolationGate.productionBlockers),
    ...blockerIds(equivalenceMatrixAudit.productionBlockers),
    ...blockerIds(sourceLocaleWriteContractAudit.productionBlockers),
    ...blockerIds(writePathIsolationGate.productionBlockers),
  ];
  const activationBlockers = blockerIds(activationRollbackGate.productionBlockers);
  const productionBlockers = [...new Set([
    ...missingSurfaceBlockers,
    ...activationBlockers,
    'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD',
  ])];

  const officialSurfacesObserved = parityIsolationGate.summary?.observedOfficialFrenchAdminSurfaces ?? 0;
  const officialSurfacesRequired = parityIsolationGate.summary?.requiredOfficialFrenchAdminSurfaces ?? 5;
  const sourceLocaleProvenRows = equivalenceMatrixAudit.summary?.sourceLocaleProvenRows ?? 0;
  const blockedRows = equivalenceMatrixAudit.summary?.blockedRows ?? 0;
  const adminSurfaceEvidenceReady =
    structuralBlockers.length === 0 &&
    officialSurfacesObserved === officialSurfacesRequired &&
    sourceLocaleProvenRows >= (equivalenceMatrixAudit.summary?.sourceLocaleRequiredRows ?? 5) &&
    blockedRows === 0 &&
    (parityIsolationGate.summary?.dangerousOfficialFrenchAdminWrites ?? 0) === 0 &&
    (writePathIsolationGate.summary?.officialCoursePackCandidateRows ?? 0) === 0 &&
    (writePathIsolationGate.summary?.officialFrenchWritePatternMatches ?? 0) === 0;
  const allAdminSurfacesReady =
    adminSurfaceEvidenceReady &&
    activationRollbackGate.summary?.allUpstreamReady === true &&
    activationRollbackGate.summary?.activeApprovalReceiptExists === true &&
    activationRollbackGate.summary?.activeHashLockManifestExists === true;

  const gate = {
    schemaVersion: 'gustav-fr-admin-global-readiness-bridge-gate-v1',
    generatedAt,
    status: allAdminSurfacesReady
      ? 'PASS_ADMIN_SURFACES_READY_FOR_FINAL_ACTIVATION'
      : adminSurfaceEvidenceReady
        ? 'PASS_ADMIN_SURFACES_READY_GLOBAL_FRENCH_HOLD'
        : 'HOLD_ADMIN_SURFACES_NOT_READY',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    surface: 'admin_surfaces',
    activationApproved: false,
    readyForAppApply: false,
    readyForRuntimeEnable: false,
    inputs: Object.fromEntries(Object.entries(PATHS).map(([key, filePath]) => [key, rel(filePath)])),
    summary: {
      equivalenceRows: equivalenceMatrixAudit.summary?.rows ?? 0,
      equivalenceBlockedRows: blockedRows,
      genericTargetAwareRows: equivalenceMatrixAudit.summary?.genericTargetAwareRows ?? 0,
      sourceLocaleRequiredRows: equivalenceMatrixAudit.summary?.sourceLocaleRequiredRows ?? 0,
      sourceLocaleProvenRows,
      officialFrenchAdminSurfacesRequired: officialSurfacesRequired,
      officialFrenchAdminSurfacesObserved: officialSurfacesObserved,
      missingOfficialFrenchAdminSurfaces: parityIsolationGate.summary?.missingOfficialFrenchAdminSurfaces ?? 0,
      dangerousOfficialFrenchAdminWrites: parityIsolationGate.summary?.dangerousOfficialFrenchAdminWrites ?? 0,
      officialCoursePackCandidateRows: writePathIsolationGate.summary?.officialCoursePackCandidateRows ?? 0,
      officialFrenchWritePatternMatches: writePathIsolationGate.summary?.officialFrenchWritePatternMatches ?? 0,
      fixtureProbesPassed:
        (sourceLocaleWriteContractAudit.summary?.fixtureProbesPassed ?? 0) +
        (activationRollbackGate.summary?.fixtureProbesPassed ?? 0),
      fixtureProbes:
        (sourceLocaleWriteContractAudit.summary?.fixtureProbes ?? 0) +
        (activationRollbackGate.summary?.fixtureProbes ?? 0),
      upstreamReadyCount: activationRollbackGate.summary?.upstreamReadyCount ?? 0,
      upstreamGateCount: activationRollbackGate.summary?.upstreamGateCount ?? 0,
      activeApprovalReceiptExists: activationRollbackGate.summary?.activeApprovalReceiptExists === true,
      activeHashLockManifestExists: activationRollbackGate.summary?.activeHashLockManifestExists === true,
      adminSurfaceEvidenceReady,
      readyForApply: false,
      activationApproved: false,
    },
    invariants: {
      adminUiBibleLoaded: equivalenceMatrixAudit.checks?.adminUiBibleLoaded === true,
      noHumanReviewGate: true,
      llmTrustedSourceReviewInstead: true,
      sourceLocaleRequiredForOfficialFrenchWrites: writePathIsolationGate.summary?.sourceLocaleRequiredForFutureOfficialWrites === true,
      uiLocaleCannotDriveStudyTargetOrSourceLocale: true,
      marketplaceCardPacksSeparatedFromOfficialFrenchPacks: true,
      ugcCommunityPacksSeparatedFromOfficialFrenchPacks: true,
      activationRollbackSourceLocaleScoped: activationRollbackGate.checks?.rollbackScopesSourceScoped === true,
      unsafeRollbackScopesRejected: activationRollbackGate.checks?.deniedRollbackScopesPresent === true,
      noOfficialFrenchWritesOpened: writePathIsolationGate.summary?.officialFrenchWritesOpened === false,
      noAdminWritesOpenedByBridge: true,
      runtimeDownloadsClosed: true,
      activationRemainsClosed: true,
    },
    structuralBlockers,
    productionBlockers,
    missingSurfaces: (parityIsolationGate.surfaceMatrix ?? [])
      .filter((row) => row.requiredForProduction && !row.observedInCurrentAdmin)
      .map((row) => row.id),
    nextRequiredWork: [
      'Add/prove official French course-pack status surface in admin with studyTarget=fr and sourceLocale=ru|uk.',
      'Add/prove French LLM reviewer queue/import status surface; keep import disabled until decision import gate passes.',
      'Add/prove French admin diagnostics surface for runtime/server/storage/cloud gates.',
      'Add/prove sourceLocale selector/manifest row contract for any future official French write path.',
      'Keep activation rollback blocked until upstream gates, explicit receipt and hash lock manifest exist.',
    ],
    safety: {
      readOnly: true,
      productionAppFilesModifiedByThisScript: false,
      adminUiModifiedByThisScript: false,
      adminStateModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    },
  };

  writeJson(OUT_PATH, gate);
  console.log(`${gate.status} ${rel(OUT_PATH)} missingSurfaces=${gate.missingSurfaces.length} blockers=${gate.productionBlockers.length}`);
}

main();
