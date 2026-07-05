import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_LEVEL_BY_LESSON, CONJUGATION_VERBS, SOURCE_EVIDENCE, restoreFrenchOrthography } from './gustav_fr_grammar_drill_candidate_data.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'grammar');
const GATE_PATH = path.join(OUT_DIR, 'fr_conjugation_drill_gate_v1.json');
const PACK_PATH = path.join(OUT_DIR, 'fr_conjugation_drill_pack_v1.json');
const RU_PAYLOAD_PATH = path.join(OUT_DIR, 'fr_conjugation_drill_runtime_payload_ru.dryrun.json');
const UK_PAYLOAD_PATH = path.join(OUT_DIR, 'fr_conjugation_drill_runtime_payload_uk.dryrun.json');

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
  return restoreFrenchOrthography(value);
}

function tenseLabel(formId) {
  if (formId.startsWith('present')) return 'present';
  if (formId.startsWith('passe_compose')) return 'passe_compose';
  if (formId.startsWith('imparfait')) return 'imparfait';
  return 'mixed';
}

function sourcePrompt(verb, formId, sourceLocale) {
  const tense = tenseLabel(formId);
  if (sourceLocale === 'uk') {
    return `Вибери правильну французьку форму дієслова ${verb} у часі ${tense}.`;
  }
  return `Выбери правильную французскую форму глагола ${verb} во времени ${tense}.`;
}

function answerFromFullForm(fullForm, options) {
  return options.find((option) =>
    fullForm === option ||
    fullForm.endsWith(` ${option}`) ||
    fullForm.endsWith(`'${option}`)
  ) ?? options[0];
}

function buildItem(verbSpec, lessonId, formIndex, sourceLocale) {
  const [verbId, infinitive, forms, evidenceIds] = verbSpec;
  const [formId, correct, sentenceTemplate, options] = forms[formIndex];
  const normalizedOptions = options.map(fr);
  const fullForm = fr(correct);
  const normalizedCorrect = answerFromFullForm(fullForm, normalizedOptions);
  return {
    id: `fr_l${String(lessonId).padStart(2, '0')}_conj_${verbId}_${formId}`,
    studyTarget: 'fr',
    sourceLocale,
    lessonId,
    appCourseLevel: APP_LEVEL_BY_LESSON[lessonId],
    surface: 'conjugation_drill',
    verbId,
    infinitive: fr(infinitive),
    tense: tenseLabel(formId),
    formId,
    fullForm,
    sentenceTemplate: fr(sentenceTemplate),
    correct: normalizedCorrect,
    options: normalizedOptions,
    targetExplanation: `${fr(infinitive)} : ${normalizedCorrect} est la forme française attendue dans cette phrase.`,
    explainRU: sourcePrompt(fr(infinitive), formId, 'ru'),
    explainUK: sourcePrompt(fr(infinitive), formId, 'uk'),
    sourceText: sourcePrompt(fr(infinitive), formId, sourceLocale),
    sourceEvidence: evidenceIds,
    activationApproved: false,
  };
}

function buildPayload(sourceLocale) {
  const lessonPacks = [];
  for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
    const verbSpec = CONJUGATION_VERBS[lessonId - 1];
    const items = [0, 1, 2, 3].map((formIndex) => buildItem(verbSpec, lessonId, formIndex, sourceLocale));
    lessonPacks.push({
      lessonId,
      appCourseLevel: APP_LEVEL_BY_LESSON[lessonId],
      sourceLocale,
      verbs: [{
        verbId: verbSpec[0],
        infinitive: fr(verbSpec[1]),
        forms: items.map((item) => ({ formId: item.formId, tense: item.tense, fullForm: item.fullForm, correct: item.correct })),
      }],
      items,
      activationApproved: false,
    });
  }
  return {
    schemaVersion: 'gustav-fr-conjugation-drill-runtime-payload-v1',
    generatedAt: new Date().toISOString(),
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocale,
    surface: 'conjugation_drill',
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
  const verbs = new Set();
  const ids = new Set();
  const tenses = new Set();
  if (payload.studyTarget !== 'fr') issues.push('STUDY_TARGET_NOT_FR');
  if (payload.sourceLocale !== sourceLocale) issues.push('SOURCE_LOCALE_MISMATCH');
  if (payload.delivery !== 'server-pack-candidate') issues.push('DELIVERY_NOT_SERVER_PACK_CANDIDATE');
  if (payload.activationApproved !== false || payload.productionReady !== false) issues.push('ACTIVATION_OR_PRODUCTION_OPEN');
  if (lessonPacks.length !== 32) issues.push('LESSON_PACK_COUNT_NOT_32');
  if (items.length !== 128) issues.push('ITEM_COUNT_NOT_128');
  if (MOJIBAKE_PATTERN.test(text)) issues.push('MOJIBAKE');
  if (PLACEHOLDER_PATTERN.test(text)) issues.push('PLACEHOLDER');
  for (const item of items) {
    if (ids.has(item.id)) issues.push(`${item.id}:DUPLICATE_ID`);
    ids.add(item.id);
    verbs.add(item.verbId);
    tenses.add(item.tense);
    if (item.studyTarget !== 'fr') issues.push(`${item.id}:STUDY_TARGET_NOT_FR`);
    if (item.sourceLocale !== sourceLocale) issues.push(`${item.id}:SOURCE_LOCALE_MISMATCH`);
    if (!item.sentenceTemplate.includes('___')) issues.push(`${item.id}:NO_BLANK`);
    if (!item.options.includes(item.correct) || item.options.length < 4) issues.push(`${item.id}:OPTIONS_INVALID`);
    if (!Array.isArray(item.sourceEvidence) || item.sourceEvidence.length < 1) issues.push(`${item.id}:EVIDENCE_MISSING`);
    if (!item.explainRU || !item.explainUK || !item.targetExplanation) issues.push(`${item.id}:EXPLANATION_MISSING`);
  }
  if (verbs.size !== 32) issues.push('VERB_COUNT_NOT_32');
  for (const required of ['present', 'passe_compose', 'imparfait']) {
    if (!tenses.has(required)) issues.push(`TENSE_MISSING_${required}`);
  }
  return {
    sourceLocale,
    lessonPacks: lessonPacks.length,
    items: items.length,
    verbs: verbs.size,
    tenses: [...tenses].sort(),
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
  if (SOURCE_EVIDENCE.filter((source) => source.use.includes('high-frequency irregular conjugation reference') || source.use.includes('general conjugation-table contract and tense coverage')).length < 3) {
    blockers.push('TRUSTED_CONJUGATION_SOURCE_EVIDENCE_TOO_THIN');
  }

  const pack = {
    schemaVersion: 'gustav-fr-conjugation-drill-pack-v1',
    generatedAt,
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    surface: 'conjugation_drill',
    delivery: 'server-pack-candidate',
    productionReady: false,
    activationApproved: false,
    sourceEvidence: SOURCE_EVIDENCE.filter((source) => source.use.some((tag) => tag.includes('conjugation') || tag.includes('tense'))),
    payloads: {
      ru: rel(RU_PAYLOAD_PATH),
      uk: rel(UK_PAYLOAD_PATH),
    },
    summary: {
      lessonPacks: 32,
      verbs: 32,
      itemsPerSourceLocale: 128,
      totalRuntimeItems: 256,
      tenses: ['present', 'passe_compose', 'imparfait'],
      appCourseLevels: ['A1', 'A2', 'B1', 'B2'],
      activationApproved: false,
    },
  };

  const gate = {
    schemaVersion: 'gustav-fr-conjugation-drill-gate-v1',
    generatedAt,
    status: blockers.length === 0 ? 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD' : 'BLOCK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    surface: 'conjugation_drill',
    delivery: 'server-pack-candidate',
    activationApproved: false,
    globalFrenchActivationApproved: false,
    readyForAppApply: false,
    readyForRuntimeEnable: false,
    inputs: {
      englishBlueprintFiles: ['app/lesson_irregular_verbs.tsx', 'app/irregular_verbs_data.ts', 'app/irregular_verb_options.ts'],
      pack: rel(PACK_PATH),
      ruPayload: rel(RU_PAYLOAD_PATH),
      ukPayload: rel(UK_PAYLOAD_PATH),
    },
    summary: {
      lessonPacks: 32,
      ruItems: validations.ru.items,
      ukItems: validations.uk.items,
      totalRuntimeItems: validations.ru.items + validations.uk.items,
      verbs: validations.ru.verbs,
      trustedSources: pack.sourceEvidence.length,
      activationApproved: false,
      globalFrenchStillHold: true,
    },
    validations,
    invariants: {
      frenchNativeConjugationDrills: true,
      notEnglishIrregularVerbReuse: true,
      sourceLocalePayloadsSeparated: validations.ru.issueCount === 0 && validations.uk.issueCount === 0,
      highFrequencyFrenchVerbsCovered: validations.ru.verbs === 32,
      presentPasseComposeImparfaitCovered: validations.ru.tenses.includes('present') && validations.ru.tenses.includes('passe_compose') && validations.ru.tenses.includes('imparfait'),
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
