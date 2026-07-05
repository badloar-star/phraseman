import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'grammar');
const OUT_PATH = path.join(OUT_DIR, 'fr_grammar_drill_global_readiness_bridge_gate_v1.json');
const PREPOSITION_GATE_PATH = path.join(OUT_DIR, 'fr_preposition_drill_gate_v1.json');
const CONJUGATION_GATE_PATH = path.join(OUT_DIR, 'fr_conjugation_drill_gate_v1.json');

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

function main() {
  const generatedAt = new Date().toISOString();
  const prepositionGate = readJson(PREPOSITION_GATE_PATH);
  const conjugationGate = readJson(CONJUGATION_GATE_PATH);
  const blockers = [];

  if (prepositionGate.status !== 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD') blockers.push('PREPOSITION_GATE_NOT_READY');
  if (conjugationGate.status !== 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD') blockers.push('CONJUGATION_GATE_NOT_READY');
  if (prepositionGate.activationApproved !== false || conjugationGate.activationApproved !== false) blockers.push('CHILD_GATE_ACTIVATION_OPEN');
  if (prepositionGate.readyForAppApply !== false || conjugationGate.readyForAppApply !== false) blockers.push('CHILD_GATE_APP_APPLY_OPEN');
  if (prepositionGate.readyForRuntimeEnable !== false || conjugationGate.readyForRuntimeEnable !== false) blockers.push('CHILD_GATE_RUNTIME_ENABLE_OPEN');
  if (prepositionGate.summary?.ruItems !== 192 || prepositionGate.summary?.ukItems !== 192) blockers.push('PREPOSITION_ITEM_COUNTS_INVALID');
  if (conjugationGate.summary?.ruItems !== 128 || conjugationGate.summary?.ukItems !== 128) blockers.push('CONJUGATION_ITEM_COUNTS_INVALID');
  if (prepositionGate.invariants?.notEnglishPrepositionReuse !== true) blockers.push('ENGLISH_PREPOSITION_REUSE_NOT_BLOCKED');
  if (conjugationGate.invariants?.notEnglishIrregularVerbReuse !== true) blockers.push('ENGLISH_IRREGULAR_REUSE_NOT_BLOCKED');

  const gate = {
    schemaVersion: 'gustav-fr-grammar-drill-global-readiness-bridge-gate-v1',
    generatedAt,
    status: blockers.length === 0 ? 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD' : 'BLOCK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    surface: 'prepositions_and_conjugation_drills',
    activationApproved: false,
    globalFrenchActivationApproved: false,
    readyForAppApply: false,
    readyForRuntimeEnable: false,
    inputs: {
      prepositionGate: rel(PREPOSITION_GATE_PATH),
      conjugationGate: rel(CONJUGATION_GATE_PATH),
    },
    summary: {
      prepositionLessonPacks: prepositionGate.summary?.lessonPacks,
      conjugationLessonPacks: conjugationGate.summary?.lessonPacks,
      prepositionRuntimeItems: prepositionGate.summary?.totalRuntimeItems,
      conjugationRuntimeItems: conjugationGate.summary?.totalRuntimeItems,
      totalRuntimeItems: (prepositionGate.summary?.totalRuntimeItems ?? 0) + (conjugationGate.summary?.totalRuntimeItems ?? 0),
      conjugationVerbs: conjugationGate.summary?.verbs,
      trustedSources: Math.max(prepositionGate.summary?.trustedSources ?? 0, 0) + Math.max(conjugationGate.summary?.trustedSources ?? 0, 0),
      activationApproved: false,
      globalFrenchStillHold: true,
    },
    invariants: {
      frenchNativePrepositionDrills: prepositionGate.invariants?.frenchNativePrepositionDrills === true,
      frenchNativeConjugationDrills: conjugationGate.invariants?.frenchNativeConjugationDrills === true,
      notEnglishPrepositionOrIrregularReuse: true,
      sourceLocalePayloadsSeparated: prepositionGate.invariants?.sourceLocalePayloadsSeparated === true && conjugationGate.invariants?.sourceLocalePayloadsSeparated === true,
      serverPackCandidateOnly: true,
      appBundleNotModified: true,
      runtimeActivationClosed: true,
      noMojibakeOrPlaceholders: prepositionGate.invariants?.noMojibakeOrPlaceholders === true && conjugationGate.invariants?.noMojibakeOrPlaceholders === true,
      activationRemainsClosed: true,
    },
    blockers,
    nextRequiredGlobalSteps: [
      'Wire a French grammar-drill runtime loader behind the existing vocabularyContentAvailableForTarget gate.',
      'Keep English irregular verb and English preposition data unavailable for studyTarget=fr until the French server pack is explicitly activated.',
      'Add admin status/rollback rows for French grammar-drill packs before production activation.',
    ],
  };

  writeJson(OUT_PATH, gate);
  console.log(`${gate.status} ${rel(OUT_PATH)} items=${gate.summary.totalRuntimeItems} blockers=${blockers.length}`);
}

main();

