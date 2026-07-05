import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CANDIDATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review', 'lesson01_blueprint_rebuild_candidate_v1.json');
const REVIEW_GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson01_blueprint_rebuild_review_gate_v1.json');
const PACK_AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01_blueprint_rebuild', 'fr_lesson01_blueprint_rebuild_pack_draft_audit_v1.json');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01_blueprint_rebuild');
const THEORY_VOCAB_PATH = path.join(OUT_DIR, 'fr_lesson01_blueprint_rebuild_theory_vocab_pack_v1.json');
const AUDIT_PATH = path.join(OUT_DIR, 'fr_lesson01_blueprint_rebuild_theory_vocab_pack_audit_v1.json');
const MD_PATH = path.join(OUT_DIR, 'fr_lesson01_blueprint_rebuild_theory_vocab_pack_v1.md');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

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

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'fr'));
}

function buildVocabulary(rows) {
  const slots = rows.flatMap((row) => row.wordsFr.map((word) => ({
    text: word.correct,
    category: word.category,
    examples: [row.phraseFr],
  })));
  const byKey = new Map();
  for (const slot of slots) {
    const key = `${slot.category}:${slot.text}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.examples = uniqueSorted([...existing.examples, ...slot.examples]).slice(0, 5);
    } else {
      byKey.set(key, slot);
    }
  }
  const items = [...byKey.values()];
  return {
    subjectPronouns: items.filter((item) => item.category === 'subject_pronoun').map((item) => item.text),
    etreForms: items.filter((item) => item.category === 'etre_present').map((item) => item.text),
    cEstPattern: items.filter((item) => item.category === 'demonstrative_elision').map((item) => item.text),
    placeWords: items.filter((item) => item.category.includes('place')).map((item) => item.text),
    fixedExpressions: uniqueSorted(rows.filter((row) => row.phraseFr.includes('en retard') || row.phraseFr.includes('en sécurité')).map((row) => row.phraseFr)),
    adjectiveAndStateWords: items.filter((item) => (
      item.category.includes('adjective') ||
      item.category.includes('predicative') ||
      item.category.startsWith('noun')
    )).map((item) => item.text),
    allItems: items,
  };
}

function markdownFor(pack, audit) {
  const lines = [
    '# French Lesson 1 Theory/Vocabulary Pack',
    '',
    `Status: ${audit.status}`,
    `Theory sections: ${audit.summary.theorySections}`,
    `Vocabulary items: ${audit.summary.vocabularyItems}`,
    '',
    '## Theory',
    '',
    ...pack.theory.sections.flatMap((section) => [
      `### ${section.num}. ${section.titleRu} / ${section.titleUk}`,
      section.ru,
      '',
      section.uk,
      '',
    ]),
    '## Vocabulary Groups',
    '',
    `- Pronouns: ${pack.vocabulary.subjectPronouns.join(', ')}`,
    `- Être forms: ${pack.vocabulary.etreForms.join(', ')}`,
    `- Places: ${pack.vocabulary.placeWords.join(', ')}`,
    `- Fixed expressions: ${pack.vocabulary.fixedExpressions.join(' | ')}`,
    '',
    '## Production Blockers',
    '',
    ...audit.productionBlockers.map((blocker) => `- ${blocker}`),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  const candidate = readJson(CANDIDATE_PATH);
  const reviewGate = readJson(REVIEW_GATE_PATH);
  const packAudit = readJson(PACK_AUDIT_PATH);
  const blockers = [];

  if (candidate.schemaVersion !== 'gustav-fr-lesson01-blueprint-rebuild-candidate-v1') blockers.push('CANDIDATE_SCHEMA_MISMATCH');
  if (reviewGate.status !== 'PASS_LESSON1_REVIEW_ACCEPTED_FOR_NEXT_GATE') blockers.push('REVIEW_GATE_NOT_PASS');
  if (packAudit.status !== 'PASS_PACK_DRAFT_WRITTEN') blockers.push('PACK_DRAFT_NOT_READY');
  if ((candidate.theory?.sections ?? []).length < 5) blockers.push('THEORY_SECTIONS_TOO_FEW');

  const vocabulary = buildVocabulary(candidate.rows ?? []);
  const requiredVocabulary = ['Je', 'Tu', 'Il', 'Elle', 'Nous', 'Vous', 'Ils', 'Elles', 'suis', 'es', 'est', 'sommes', 'êtes', 'sont'];
  const allVocabularyText = new Set(vocabulary.allItems.map((item) => item.text));
  for (const item of requiredVocabulary) {
    if (!allVocabularyText.has(item)) blockers.push(`REQUIRED_VOCAB_MISSING_${item}`);
  }
  if (!vocabulary.fixedExpressions.includes('Nous sommes en sécurité.')) blockers.push('FIXED_EXPRESSION_EN_SECURITE_MISSING');
  if (!vocabulary.fixedExpressions.includes('Vous êtes en retard.')) blockers.push('FIXED_EXPRESSION_EN_RETARD_MISSING');
  if (!vocabulary.placeWords.includes("l'intérieur")) blockers.push('PLACE_WORD_INTERIEUR_MISSING');

  const theoryVocabPack = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt: new Date().toISOString(),
    status: blockers.length === 0 ? 'THEORY_VOCAB_PACK_HOLD_READY_FOR_NEXT_GATES' : 'BLOCK_THEORY_VOCAB_PACK_INVALID',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    lessonId: 1,
    appCourseLevel: 'A1',
    internalFrenchBand: 'A1.1',
    sourceCandidatePath: rel(CANDIDATE_PATH),
    sourceReviewGatePath: rel(REVIEW_GATE_PATH),
    sourcePackAuditPath: rel(PACK_AUDIT_PATH),
    theory: candidate.theory,
    vocabulary,
    practiceHooks: [
      {
        id: 'etre_present_forms',
        type: 'conjugation_slots',
        targetForms: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'],
      },
      {
        id: 'adjective_gender_number_awareness',
        type: 'agreement_awareness',
        examples: ['prêt/prête/prêts/prêtes', 'content/contente/contents/contentes', 'fort/forte/forts/fortes'],
      },
      {
        id: 'c_est_neutral_statement',
        type: 'pattern',
        examples: ["C'est important.", "C'est facile.", "C'est possible."],
      },
    ],
    safety: {
      theoryVocabPackOnly: true,
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(THEORY_VOCAB_PATH, theoryVocabPack);

  const audit = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-theory-vocab-pack-audit-v1',
    generatedAt: new Date().toISOString(),
    status: blockers.length === 0 ? 'PASS_THEORY_VOCAB_PACK_WRITTEN' : 'BLOCK_THEORY_VOCAB_PACK_INVALID',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    theoryVocabPack: rel(THEORY_VOCAB_PATH),
    blockers,
    summary: {
      theorySections: candidate.theory.sections.length,
      vocabularyItems: vocabulary.allItems.length,
      subjectPronouns: vocabulary.subjectPronouns.length,
      etreForms: vocabulary.etreForms.length,
      placeWords: vocabulary.placeWords.length,
      fixedExpressions: vocabulary.fixedExpressions.length,
      practiceHooks: theoryVocabPack.practiceHooks.length,
      readyForAudioManifest: blockers.length === 0,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    },
    productionBlockers: [
      'AUDIO_TTS_NOT_GENERATED',
      'SERVER_PACK_NOT_BUILT',
      'RUNTIME_DELIVERY_NOT_TESTED',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ],
    safety: theoryVocabPack.safety,
  };
  writeJson(AUDIT_PATH, audit);
  fs.writeFileSync(MD_PATH, markdownFor(theoryVocabPack, audit), 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson01BlueprintRebuildTheoryVocabPack = rel(THEORY_VOCAB_PATH);
    state.lesson01BlueprintRebuildTheoryVocabPackAudit = rel(AUDIT_PATH);
    state.lesson01BlueprintRebuildTheoryVocabPackStatus = audit.status;
    state.lesson01BlueprintRebuildTheoryVocabPackSummary = audit.summary;
    state.nextPassPlan = [
      'Create Lesson 1 audio/TTS manifest from reviewed pack draft and theory/vocab pack, generation still closed.',
      'Create Lesson 1 server manifest draft with upload closed until audio checksums exist.',
      'Then start Lesson 2 blueprint-first rebuild using Lesson 1 gates as template.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${audit.status} theory=${audit.summary.theorySections} vocab=${audit.summary.vocabularyItems} blockers=${blockers.length}`);
  if (blockers.length > 0) process.exitCode = 1;
}

main();
