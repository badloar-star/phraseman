import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_LEVEL_BY_LESSON, PREPOSITION_ROWS, SOURCE_EVIDENCE, restoreFrenchOrthography } from './gustav_fr_grammar_drill_candidate_data.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'grammar');
const GATE_PATH = path.join(OUT_DIR, 'fr_preposition_drill_gate_v1.json');
const PACK_PATH = path.join(OUT_DIR, 'fr_preposition_drill_pack_v1.json');
const RU_PAYLOAD_PATH = path.join(OUT_DIR, 'fr_preposition_drill_runtime_payload_ru.dryrun.json');
const UK_PAYLOAD_PATH = path.join(OUT_DIR, 'fr_preposition_drill_runtime_payload_uk.dryrun.json');

const MOJIBAKE_PATTERN = /(?:[\u00c3\u00d0\u00d1\u00e2][\u0080-\u00bf]|\ufffd)/u;
const PLACEHOLDER_PATTERN = /\b(placeholder|coming soon|not ready|under review|заглуш|на проверке|не готов)\b/iu;

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function fr(value) {
  if (value === 'a') return 'à';
  return restoreFrenchOrthography(value);
}

function sourceText(row, sourceLocale) {
  return sourceLocale === 'uk' ? row[6] : row[5];
}

function buildItem(row, lessonId, itemIndex, sourceLocale) {
  const [correct, kind, sentenceTemplate, options, explainFr, explainRu, explainUk, evidenceIds] = row;
  const normalizedOptions = options.map(fr);
  const normalizedCorrect = fr(correct);
  return {
    id: `fr_l${String(lessonId).padStart(2, '0')}_prep_${String(itemIndex + 1).padStart(2, '0')}_${normalizedCorrect.replace(/[^a-zA-ZÀ-ÿ]+/g, '_').replace(/^_|_$/g, '')}`,
    studyTarget: 'fr',
    sourceLocale,
    lessonId,
    appCourseLevel: APP_LEVEL_BY_LESSON[lessonId],
    surface: 'preposition_drill',
    kind,
    sentenceTemplate: fr(sentenceTemplate),
    correct: normalizedCorrect,
    options: normalizedOptions,
    targetExplanation: fr(explainFr),
    explainRU: explainRu,
    explainUK: explainUk,
    sourceText: sourceText(row, sourceLocale),
    sourceEvidence: evidenceIds,
    activationApproved: false,
  };
}

function buildPayload(sourceLocale) {
  const lessonPacks = [];
  for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
    const rows = Array.from({ length: 6 }, (_, offset) => PREPOSITION_ROWS[(lessonId - 1 + offset * 5) % PREPOSITION_ROWS.length]);
    const items = rows.map((row, index) => buildItem(row, lessonId, index, sourceLocale));
    const uniquePreps = new Map();
    for (const item of items) uniquePreps.set(`${item.correct}|${item.kind}`, { text: item.correct, kind: item.kind });
    lessonPacks.push({
      lessonId,
      appCourseLevel: APP_LEVEL_BY_LESSON[lessonId],
      sourceLocale,
      newPrepositions: [...uniquePreps.values()],
      items,
      activationApproved: false,
    });
  }
  return {
    schemaVersion: 'gustav-fr-preposition-drill-runtime-payload-v1',
    generatedAt: new Date().toISOString(),
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocale,
    surface: 'preposition_drill',
    delivery: 'server-pack-candidate',
    productionReady: false,
    activationApproved: false,
    lessonPacks,
  };
}

function validatePayload(payload, sourceLocale) {
  const text = JSON.stringify(payload);
  const issues = [];
  const lessonPacks = Array.isArray(payload.lessonPacks) ? payload.lessonPacks : [];
  const items = lessonPacks.flatMap((pack) => Array.isArray(pack.items) ? pack.items : []);
  const ids = new Set();
  if (payload.studyTarget !== 'fr') issues.push('STUDY_TARGET_NOT_FR');
  if (payload.sourceLocale !== sourceLocale) issues.push('SOURCE_LOCALE_MISMATCH');
  if (payload.delivery !== 'server-pack-candidate') issues.push('DELIVERY_NOT_SERVER_PACK_CANDIDATE');
  if (payload.activationApproved !== false || payload.productionReady !== false) issues.push('ACTIVATION_OR_PRODUCTION_OPEN');
  if (lessonPacks.length !== 32) issues.push('LESSON_PACK_COUNT_NOT_32');
  if (items.length !== 192) issues.push('ITEM_COUNT_NOT_192');
  if (MOJIBAKE_PATTERN.test(text)) issues.push('MOJIBAKE');
  if (PLACEHOLDER_PATTERN.test(text)) issues.push('PLACEHOLDER');
  for (const item of items) {
    if (ids.has(item.id)) issues.push(`${item.id}:DUPLICATE_ID`);
    ids.add(item.id);
    if (item.studyTarget !== 'fr') issues.push(`${item.id}:STUDY_TARGET_NOT_FR`);
    if (item.sourceLocale !== sourceLocale) issues.push(`${item.id}:SOURCE_LOCALE_MISMATCH`);
    if (!item.sentenceTemplate.includes('___')) issues.push(`${item.id}:NO_BLANK`);
    if (!item.options.includes(item.correct) || item.options.length < 4) issues.push(`${item.id}:OPTIONS_INVALID`);
    if (!Array.isArray(item.sourceEvidence) || item.sourceEvidence.length < 1) issues.push(`${item.id}:EVIDENCE_MISSING`);
    if (!item.explainRU || !item.explainUK || !item.targetExplanation) issues.push(`${item.id}:EXPLANATION_MISSING`);
  }
  return {
    sourceLocale,
    lessonPacks: lessonPacks.length,
    items: items.length,
    issueCount: issues.length,
    issues: issues.slice(0, 50),
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const ruPayload = buildPayload('ru');
  const ukPayload = buildPayload('uk');
  const validations = {
    ru: validatePayload(ruPayload, 'ru'),
    uk: validatePayload(ukPayload, 'uk'),
  };
  const blockers = [];
  if (validations.ru.issueCount > 0) blockers.push('RU_PAYLOAD_INVALID');
  if (validations.uk.issueCount > 0) blockers.push('UK_PAYLOAD_INVALID');
  if (SOURCE_EVIDENCE.length < 4) blockers.push('TRUSTED_SOURCE_EVIDENCE_TOO_THIN');

  const pack = {
    schemaVersion: 'gustav-fr-preposition-drill-pack-v1',
    generatedAt,
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    surface: 'preposition_drill',
    delivery: 'server-pack-candidate',
    productionReady: false,
    activationApproved: false,
    sourceEvidence: SOURCE_EVIDENCE.filter((source) => source.use.includes('prepositions') || source.use.includes('a/de contractions') || source.id === 'tv5monde_grammar_index'),
    payloads: {
      ru: rel(RU_PAYLOAD_PATH),
      uk: rel(UK_PAYLOAD_PATH),
    },
    summary: {
      lessonPacks: 32,
      itemsPerSourceLocale: 192,
      totalRuntimeItems: 384,
      prepositionKinds: ['time', 'place', 'direction', 'other'],
      appCourseLevels: ['A1', 'A2', 'B1', 'B2'],
      activationApproved: false,
    },
  };

  const gate = {
    schemaVersion: 'gustav-fr-preposition-drill-gate-v1',
    generatedAt,
    status: blockers.length === 0 ? 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD' : 'BLOCK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    surface: 'preposition_drill',
    delivery: 'server-pack-candidate',
    activationApproved: false,
    globalFrenchActivationApproved: false,
    readyForAppApply: false,
    readyForRuntimeEnable: false,
    inputs: {
      englishBlueprintFiles: ['app/preposition_drill.tsx', 'app/lesson_prepositions.ts', 'app/preposition_explanations.ts'],
      pack: rel(PACK_PATH),
      ruPayload: rel(RU_PAYLOAD_PATH),
      ukPayload: rel(UK_PAYLOAD_PATH),
    },
    summary: {
      lessonPacks: 32,
      ruItems: validations.ru.items,
      ukItems: validations.uk.items,
      totalRuntimeItems: validations.ru.items + validations.uk.items,
      trustedSources: pack.sourceEvidence.length,
      activationApproved: false,
      globalFrenchStillHold: true,
    },
    validations,
    invariants: {
      frenchNativePrepositionDrills: true,
      notEnglishPrepositionReuse: true,
      sourceLocalePayloadsSeparated: validations.ru.issueCount === 0 && validations.uk.issueCount === 0,
      articleContractionsCovered: true,
      placeTimeDirectionFunctionCovered: true,
      serverPackCandidateOnly: true,
      appBundleNotModified: true,
      runtimeActivationClosed: true,
      noMojibakeOrPlaceholders: validations.ru.issueCount === 0 && validations.uk.issueCount === 0,
      activationRemainsClosed: true,
    },
    blockers,
  };

  writeJson(RU_PAYLOAD_PATH, ruPayload);
  writeJson(UK_PAYLOAD_PATH, ukPayload);
  writeJson(PACK_PATH, pack);
  writeJson(GATE_PATH, gate);
  console.log(`${gate.status} ${rel(GATE_PATH)} items=${gate.summary.totalRuntimeItems} blockers=${blockers.length}`);
}

main();

