import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const RUN_DIR = path.join(ROOT, 'docs', 'gustav', 'runs', '2026-07-04_fr_flashcard_phrase_packs_v1');
const BUILD_DIR = path.join(RUN_DIR, 'build');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'flashcards');
const OUT_PATH = path.join(OUT_DIR, 'fr_flashcard_global_readiness_bridge_gate_v1.json');

const CANDIDATE_PATH = path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_candidates.json');
const DUPLICATE_AUDIT_PATH = path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_duplicate_audit.json');
const SOURCE_EVIDENCE_PATH = path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_source_evidence.json');
const DESCRIPTION_STYLE_PATH = path.join(BUILD_DIR, 'fr_flashcard_description_style_gate.json');
const FINAL_GATE_PATH = path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_final_gate.json');
const SERVER_MANIFEST_PATH = path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_server_manifest.json');
const RUNTIME_ISOLATION_PATH = path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_runtime_isolation.json');
const ADMIN_WORKFLOW_PATH = path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_admin_workflow_manifest.json');
const ROLLBACK_MANIFEST_PATH = path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_rollback_manifest.json');
const READINESS_GATE_PATH = path.join(BUILD_DIR, 'fr_flashcard_packs_activation_readiness_final_gate.json');
const RUNTIME_EVIDENCE_PATH = path.join(BUILD_DIR, 'fr_flashcard_packs_runtime_activation_evidence.json');
const ADMIN_HANDOFF_PATH = path.join(BUILD_DIR, 'fr_flashcard_packs_admin_activation_handoff.json');
const RU_PAYLOAD_PATH = path.join(BUILD_DIR, 'server_payloads', 'fr_flashcard_phrase_packs_ru.json');
const UK_PAYLOAD_PATH = path.join(BUILD_DIR, 'server_payloads', 'fr_flashcard_phrase_packs_uk.json');

const MOJIBAKE_PATTERN = /(Ã|Ã‘|Ãƒ|Ã¢â‚¬â„¢|Ã¢â‚¬Å“|Ã¢â‚¬|ï¿½|\u00c3|\u00d0|\u00d1|\ufffd)/u;
const PLACEHOLDER_PATTERN = /(placeholder|coming soon|not ready|review pending|на проверке|не готов|заглуш|цей урок|этот урок)/iu;

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

function packsFromPayload(payload) {
  return Array.isArray(payload.packs) ? payload.packs : [];
}

function cardsFromPacks(packs) {
  return packs.flatMap((pack) => Array.isArray(pack.cards) ? pack.cards : []);
}

function validatePayload(payload, sourceLocale) {
  const packs = packsFromPayload(payload);
  const cards = cardsFromPacks(packs);
  const text = JSON.stringify(payload);
  const issues = [];
  const ids = new Set();
  const targetTexts = new Set();

  if (payload.schemaVersion !== 'gustav-fr-flashcard-marketplace-payload-v1') issues.push('SCHEMA_VERSION_MISMATCH');
  if (payload.studyTarget !== 'fr') issues.push('STUDY_TARGET_NOT_FR');
  if (payload.sourceLocale !== sourceLocale) issues.push('SOURCE_LOCALE_MISMATCH');
  if (payload.activationApproved !== false) issues.push('ACTIVATION_NOT_FALSE');
  if (payload.productionReady !== false) issues.push('PAYLOAD_PRODUCTION_READY_NOT_FALSE');
  if (packs.length !== 5) issues.push('PACK_COUNT_NOT_5');
  if (cards.length !== 100) issues.push('CARD_COUNT_NOT_100');
  if (MOJIBAKE_PATTERN.test(text)) issues.push('MOJIBAKE');
  if (PLACEHOLDER_PATTERN.test(text)) issues.push('PLACEHOLDER');

  for (const pack of packs) {
    if (!pack.id || !pack.title || !pack.description || !pack.category) issues.push(`${pack.id || 'pack'}:PACK_COPY_MISSING`);
    if (!Array.isArray(pack.cards) || pack.cards.length !== 20) issues.push(`${pack.id || 'pack'}:CARD_COUNT_NOT_20`);
    for (const card of pack.cards || []) {
      if (ids.has(card.id)) issues.push(`${card.id}:DUPLICATE_ID`);
      ids.add(card.id);
      const normalizedTarget = String(card.targetText || '').normalize('NFC').toLocaleLowerCase('fr-FR').trim();
      if (targetTexts.has(normalizedTarget)) issues.push(`${card.id}:DUPLICATE_TARGET_TEXT`);
      targetTexts.add(normalizedTarget);
      for (const field of ['id', 'targetText', 'meaning', 'literal', 'explanation', 'exampleFr', 'exampleMeaning', 'register', 'level']) {
        if (!card[field]) issues.push(`${card.id || 'card'}:${field.toUpperCase()}_MISSING`);
      }
      if (!Array.isArray(card.evidence) || card.evidence.length < 1) issues.push(`${card.id || 'card'}:EVIDENCE_MISSING`);
      for (const source of card.evidence || []) {
        if (!source.sourceId || !source.url || !source.verified) issues.push(`${card.id || 'card'}:EVIDENCE_INCOMPLETE`);
      }
    }
  }

  return {
    sourceLocale,
    packCount: packs.length,
    cardCount: cards.length,
    issueCount: issues.length,
    issues: issues.slice(0, 50),
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const candidate = readJson(CANDIDATE_PATH);
  const duplicateAudit = readJson(DUPLICATE_AUDIT_PATH);
  const sourceEvidence = readJson(SOURCE_EVIDENCE_PATH);
  const descriptionStyle = readJson(DESCRIPTION_STYLE_PATH);
  const finalGate = readJson(FINAL_GATE_PATH);
  const serverManifest = readJson(SERVER_MANIFEST_PATH);
  const runtimeIsolation = readJson(RUNTIME_ISOLATION_PATH);
  const adminWorkflow = readJson(ADMIN_WORKFLOW_PATH);
  const rollbackManifest = readJson(ROLLBACK_MANIFEST_PATH);
  const readinessGate = readJson(READINESS_GATE_PATH);
  const runtimeEvidence = readJson(RUNTIME_EVIDENCE_PATH);
  const adminHandoff = readJson(ADMIN_HANDOFF_PATH);
  const ruPayload = readJson(RU_PAYLOAD_PATH);
  const ukPayload = readJson(UK_PAYLOAD_PATH);

  const validations = {
    ru: validatePayload(ruPayload, 'ru'),
    uk: validatePayload(ukPayload, 'uk'),
  };

  const blockers = [];
  if (candidate.studyTarget !== 'fr' || candidate.packCount !== 5 || candidate.cardCount !== 100) blockers.push('FLASHCARD_CANDIDATE_COUNTS_NOT_READY');
  if (candidate.productionReady !== false || candidate.activationApproved !== false) blockers.push('FLASHCARD_CANDIDATE_ACTIVATION_OPEN');
  if (duplicateAudit.status !== 'PASS') blockers.push('DUPLICATE_AUDIT_NOT_PASS');
  if (descriptionStyle.status !== 'PASS') blockers.push('DESCRIPTION_STYLE_NOT_PASS');
  if ((sourceEvidence.rowCoverage || []).length !== 100) blockers.push('SOURCE_EVIDENCE_ROW_COVERAGE_NOT_100');
  if (!sourceEvidence.sources || sourceEvidence.sourceCount < 10) blockers.push('SOURCE_EVIDENCE_TOO_THIN');
  if (finalGate.status !== 'PRODUCTION_CANDIDATE_READY_ACTIVATION_HOLD') blockers.push('CONTENT_FINAL_GATE_NOT_READY_HOLD');
  if (finalGate.productionCandidateReady !== true || finalGate.activationApproved !== false) blockers.push('CONTENT_FINAL_GATE_FLAGS_INVALID');
  if (serverManifest.status !== 'PASS_DRY_RUN' || serverManifest.uploadPerformed !== false) blockers.push('SERVER_MANIFEST_NOT_DRY_RUN');
  if (runtimeIsolation.status !== 'PASS') blockers.push('RUNTIME_ISOLATION_NOT_PASS');
  if (adminWorkflow.status !== 'PASS_DRY_RUN' || adminWorkflow.adminWriteAllowed !== false) blockers.push('ADMIN_WORKFLOW_NOT_DRY_RUN');
  if (rollbackManifest.status !== 'PASS_DRY_RUN' || rollbackManifest.rollbackExecuted !== false) blockers.push('ROLLBACK_MANIFEST_NOT_DRY_RUN');
  if (readinessGate.status !== 'READY_FOR_EXPLICIT_ACTIVATION_APPROVAL') blockers.push('READINESS_GATE_NOT_READY_FOR_EXPLICIT_APPROVAL');
  if (readinessGate.activationApproved !== false || readinessGate.liveUploadPerformed !== false) blockers.push('READINESS_GATE_ACTIVATION_OR_UPLOAD_OPEN');
  if (runtimeEvidence.status !== 'PASS' || runtimeEvidence.activationApproved !== false) blockers.push('RUNTIME_ACTIVATION_EVIDENCE_NOT_PASS');
  if (adminHandoff.status !== 'PASS' || adminHandoff.activationApproved !== false) blockers.push('ADMIN_HANDOFF_NOT_PASS');
  if (validations.ru.issueCount > 0) blockers.push('RU_PAYLOAD_VALIDATION_FAILED');
  if (validations.uk.issueCount > 0) blockers.push('UK_PAYLOAD_VALIDATION_FAILED');

  const gate = {
    schemaVersion: 'gustav-fr-flashcard-global-readiness-bridge-gate-v1',
    generatedAt,
    status: blockers.length === 0 ? 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD' : 'BLOCK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    surface: 'flashcards_and_marketplace_cards',
    activationApproved: false,
    globalFrenchActivationApproved: false,
    readyForAppApply: false,
    readyForRuntimeEnable: false,
    inputs: {
      runDir: rel(RUN_DIR),
      candidate: rel(CANDIDATE_PATH),
      duplicateAudit: rel(DUPLICATE_AUDIT_PATH),
      sourceEvidence: rel(SOURCE_EVIDENCE_PATH),
      descriptionStyle: rel(DESCRIPTION_STYLE_PATH),
      finalGate: rel(FINAL_GATE_PATH),
      serverManifest: rel(SERVER_MANIFEST_PATH),
      runtimeIsolation: rel(RUNTIME_ISOLATION_PATH),
      adminWorkflow: rel(ADMIN_WORKFLOW_PATH),
      rollbackManifest: rel(ROLLBACK_MANIFEST_PATH),
      activationReadiness: rel(READINESS_GATE_PATH),
      runtimeEvidence: rel(RUNTIME_EVIDENCE_PATH),
      adminHandoff: rel(ADMIN_HANDOFF_PATH),
      ruPayload: rel(RU_PAYLOAD_PATH),
      ukPayload: rel(UK_PAYLOAD_PATH),
    },
    summary: {
      packCount: candidate.packCount,
      cardCount: candidate.cardCount,
      ruPayloadPacks: validations.ru.packCount,
      ukPayloadPacks: validations.uk.packCount,
      ruPayloadCards: validations.ru.cardCount,
      ukPayloadCards: validations.uk.cardCount,
      sourceEvidenceRows: (sourceEvidence.rowCoverage || []).length,
      sourceCount: sourceEvidence.sourceCount,
      duplicateAudit: duplicateAudit.status,
      descriptionStyle: descriptionStyle.status,
      serverManifest: serverManifest.status,
      runtimeIsolation: runtimeIsolation.status,
      adminWorkflow: adminWorkflow.status,
      rollback: rollbackManifest.status,
      activationReadiness: readinessGate.status,
      activationApproved: false,
      globalFrenchStillHold: true,
    },
    validations,
    invariants: {
      frenchNativeMarketplacePacks: true,
      notLessonRowFanout: true,
      fiveOfficialPacksWithTwentyCardsEach: true,
      sourceEvidencePerCard: blockers.includes('SOURCE_EVIDENCE_ROW_COVERAGE_NOT_100') === false,
      duplicateTargetsBlocked: duplicateAudit.status === 'PASS',
      ruUkPayloadsSeparated: validations.ru.issueCount === 0 && validations.uk.issueCount === 0,
      serverPackCandidateOnly: true,
      appBundleAssetsNotModified: true,
      adminWritesClosed: adminWorkflow.adminWriteAllowed === false,
      liveUploadClosed: readinessGate.liveUploadPerformed === false,
      runtimeActivationClosed: finalGate.gates?.runtimeActivation === 'HOLD_CLOSED',
      rollbackExecutionClosed: rollbackManifest.rollbackExecuted === false,
      noMojibakeOrPlaceholders: validations.ru.issueCount === 0 && validations.uk.issueCount === 0,
      activationRemainsClosed: true,
    },
    blockers,
    nextRequiredGlobalSteps: [
      'Keep French marketplace packs server-pack based; do not copy them into bundled English marketplace assets.',
      'Wire French runtime loader only behind explicit activation approval and target/sourceLocale cache gates.',
      'Upload payloads only after global French activation gate authorizes live Firebase/server writes.',
    ],
  };

  writeJson(OUT_PATH, gate);
  console.log(`${gate.status} ${rel(OUT_PATH)} packs=${candidate.packCount} cards=${candidate.cardCount} blockers=${blockers.length}`);
}

main();
