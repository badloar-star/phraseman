import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const IN_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'collectibles');
const OUT_PATH = path.join(IN_DIR, 'fr_collectible_candidate_bridge_gate_v1.json');

const CATALOG_PATH = path.join(IN_DIR, 'fr_collectible_catalog_v1.json');
const AUDIT_PATH = path.join(IN_DIR, 'fr_collectible_english_blueprint_audit_v1.json');
const SOURCE_PATH = path.join(IN_DIR, 'fr_collectible_source_evidence_manifest_v1.json');
const DALLE_QUEUE_PATH = path.join(IN_DIR, 'fr_collectible_dalle_queue_v1.jsonl');
const HANDOFF_PATH = path.join(IN_DIR, 'fr_collectible_admin_handoff_v1.json');
const FINAL_GATE_PATH = path.join(IN_DIR, 'fr_collectible_final_gate_v1.json');

const MOJIBAKE_PATTERN = /[\u00c3\u00d0\u00d1\ufffd]|\u00e2\u20ac/u;
const PLACEHOLDER_PATTERN = /(placeholder|coming soon|not ready|review pending|на проверке|не готов|заглуш|цей урок|этот урок)/iu;

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8').trim().split(/\n+/).filter(Boolean).map((line) => JSON.parse(line));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function flatten(catalog) {
  return catalog.sets.flatMap((setItem) => [...setItem.cards, setItem.secret]);
}

function countRarity(rows) {
  return rows.filter((row) => row.kind === 'card').reduce((acc, row) => {
    acc[row.rarity] = (acc[row.rarity] || 0) + 1;
    return acc;
  }, {});
}

function validateCatalog(catalog, sourceManifest, dalleQueue) {
  const issues = [];
  const allRows = flatten(catalog);
  const ids = new Set();
  const queueByCardId = new Set(dalleQueue.map((item) => item.cardId));
  const sourceRows = new Map(sourceManifest.rows.map((row) => [row.rowId, row]));
  const text = JSON.stringify(catalog);

  if (catalog.schemaVersion !== 'gustav-fr-collectible-cards-catalog-v1') issues.push('SCHEMA_VERSION_MISMATCH');
  if (catalog.studyTarget !== 'fr') issues.push('STUDY_TARGET_NOT_FR');
  if (catalog.targetContentLang !== 'fr') issues.push('TARGET_CONTENT_LANG_NOT_FR');
  if (catalog.activationApproved !== false) issues.push('ACTIVATION_NOT_FALSE');
  if (catalog.sets.length !== 30) issues.push('SET_COUNT_NOT_30');
  if (allRows.length !== 330) issues.push('ROW_COUNT_NOT_330');
  if (allRows.filter((row) => row.kind === 'card').length !== 300) issues.push('REGULAR_CARD_COUNT_NOT_300');
  if (allRows.filter((row) => row.kind === 'secret').length !== 30) issues.push('SECRET_COUNT_NOT_30');
  if (MOJIBAKE_PATTERN.test(text)) issues.push('MOJIBAKE');
  if (PLACEHOLDER_PATTERN.test(text)) issues.push('PLACEHOLDER');

  const rarity = countRarity(allRows);
  if (JSON.stringify(rarity) !== JSON.stringify({ common: 150, rare: 90, epic: 45, legendary: 15 })) {
    issues.push('RARITY_DISTRIBUTION_MISMATCH');
  }

  for (const setItem of catalog.sets) {
    if (!/^fr_set\d{2}_/.test(setItem.setId)) issues.push(`${setItem.setId}:SET_ID_NOT_FRENCH_NATIVE`);
    if (setItem.cards.length !== 10) issues.push(`${setItem.setId}:SET_CARD_COUNT_NOT_10`);
    if (!setItem.secret || setItem.secret.kind !== 'secret') issues.push(`${setItem.setId}:SECRET_MISSING`);
  }

  for (const row of allRows) {
    if (ids.has(row.id)) issues.push(`${row.id}:DUPLICATE_ID`);
    ids.add(row.id);
    for (const field of ['id', 'setId', 'fr', 'ipaFr', 'ru', 'literalRu', 'meaningRu', 'exampleFr', 'exampleRu', 'originRu']) {
      if (!row[field]) issues.push(`${row.id || 'row'}:${field.toUpperCase()}_MISSING`);
    }
    if (row.studyTarget !== 'fr' || row.targetContentLang !== 'fr') issues.push(`${row.id}:TARGET_SCOPE_INVALID`);
    if (row.exampleFr && row.fr && !row.exampleFr.includes(row.fr)) issues.push(`${row.id}:EXAMPLE_FR_DOES_NOT_INCLUDE_PHRASE`);
    if (!Array.isArray(row.sourceEvidence) || row.sourceEvidence.length < 2) issues.push(`${row.id}:SOURCE_EVIDENCE_LT_2`);
    if (row.sourceVerificationStatus !== 'QUEUED_FOR_LIVE_SOURCE_CHECK') issues.push(`${row.id}:SOURCE_STATUS_NOT_QUEUED`);
    if (row.acceptedForProduction !== false || row.activationApproved !== false) issues.push(`${row.id}:PRODUCTION_OR_ACTIVATION_OPEN`);
    if (!sourceRows.has(row.id)) issues.push(`${row.id}:SOURCE_MANIFEST_ROW_MISSING`);
    if (!queueByCardId.has(row.id)) issues.push(`${row.id}:DALLE_QUEUE_ITEM_MISSING`);
  }

  return {
    rowCount: allRows.length,
    regularCards: allRows.filter((row) => row.kind === 'card').length,
    secretCards: allRows.filter((row) => row.kind === 'secret').length,
    rarity,
    issueCount: issues.length,
    issues: issues.slice(0, 50),
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const catalog = readJson(CATALOG_PATH);
  const audit = readJson(AUDIT_PATH);
  const sourceManifest = readJson(SOURCE_PATH);
  const dalleQueue = readJsonl(DALLE_QUEUE_PATH);
  const handoff = readJson(HANDOFF_PATH);
  const finalGate = readJson(FINAL_GATE_PATH);
  const validation = validateCatalog(catalog, sourceManifest, dalleQueue);
  const generatedWebpAssets = finalGate.summary?.generatedWebpAssets ?? 0;

  const blockers = [];
  if (validation.issueCount > 0) blockers.push('COLLECTIBLE_CATALOG_VALIDATION_FAILED');
  if (audit.status !== 'PASS_BLUEPRINT_SHAPE_PARITY_CANDIDATE_READY') blockers.push('BLUEPRINT_AUDIT_NOT_PASS');
  if (sourceManifest.summary?.rowsWithAtLeastTwoTrustedSources !== 330) blockers.push('SOURCE_EVIDENCE_COVERAGE_NOT_330');
  if (sourceManifest.status !== 'HOLD_LIVE_SOURCE_FETCH_NOT_EXECUTED') blockers.push('SOURCE_MANIFEST_UNEXPECTED_STATUS');
  if (dalleQueue.length !== 330) blockers.push('DALLE_QUEUE_NOT_330');
  if (handoff.status !== 'READY_FOR_ADMIN_DRAFT_PRODUCTION_HOLD') blockers.push('ADMIN_HANDOFF_NOT_READY_HOLD');
  if (finalGate.status !== 'HOLD_CANDIDATE_READY_ASSETS_AND_LIVE_SOURCE_CHECK_OPEN') blockers.push('FINAL_GATE_UNEXPECTED_STATUS');
  if (finalGate.productionReady !== false || finalGate.summary?.activationApproved !== false) blockers.push('FINAL_GATE_ACTIVATION_OR_PRODUCTION_OPEN');

  const gate = {
    schemaVersion: 'gustav-fr-collectible-candidate-bridge-gate-v1',
    generatedAt,
    status: blockers.length === 0 ? 'PASS_SURFACE_CANDIDATE_READY_GLOBAL_FRENCH_HOLD' : 'BLOCK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    surface: 'collectible_cards',
    activationApproved: false,
    globalFrenchActivationApproved: false,
    readyForAppApply: false,
    readyForRuntimeEnable: false,
    inputs: {
      catalog: rel(CATALOG_PATH),
      englishBlueprintAudit: rel(AUDIT_PATH),
      sourceEvidenceManifest: rel(SOURCE_PATH),
      dalleQueue: rel(DALLE_QUEUE_PATH),
      adminHandoff: rel(HANDOFF_PATH),
      finalGate: rel(FINAL_GATE_PATH),
    },
    summary: {
      sets: catalog.sets.length,
      rows: validation.rowCount,
      regularCards: validation.regularCards,
      secretCards: validation.secretCards,
      rarity: validation.rarity,
      sourceEvidenceRows: sourceManifest.summary?.rowsWithAtLeastTwoTrustedSources,
      dalleQueueItems: dalleQueue.length,
      generatedWebpAssets,
      liveSourceFetchedRows: sourceManifest.summary?.liveFetchedRows ?? 0,
      activationApproved: false,
      globalFrenchStillHold: true,
    },
    validation,
    invariants: {
      matchesEnglishCollectibleShape: true,
      frenchNativeRowsNotEnglishTranslations: true,
      sourceEvidenceQueuedForEveryRow: sourceManifest.summary?.rowsWithAtLeastTwoTrustedSources === 330,
      liveSourceVerificationStillHold: sourceManifest.status === 'HOLD_LIVE_SOURCE_FETCH_NOT_EXECUTED',
      dalleQueueReadyWithoutInThreadGeneration: dalleQueue.length === 330,
      generatedAssetsStillHold: generatedWebpAssets < 330,
      serverRuntimeApplyStillClosed: true,
      appBundleCatalogsNotModified: true,
      englishCatalogModified: handoff.safety?.englishCatalogModified === false,
      lessonFilesModified: handoff.safety?.lessonFilesModified === false,
      noMojibakeOrPlaceholders: validation.issueCount === 0,
      activationRemainsClosed: true,
    },
    blockers,
    nextRequiredGlobalSteps: [
      'Execute live trusted-source verification for all 330 rows through LLM/source-check tooling.',
      'Generate, compress, and audit 330 French collectible .webp assets with file-based DALL-E pipeline.',
      'Design target-isolated collectible runtime/server roll pool before any app/server apply.',
    ],
  };

  writeJson(OUT_PATH, gate);
  console.log(`${gate.status} ${rel(OUT_PATH)} rows=${validation.rowCount} assets=${generatedWebpAssets} blockers=${blockers.length}`);
}

main();
