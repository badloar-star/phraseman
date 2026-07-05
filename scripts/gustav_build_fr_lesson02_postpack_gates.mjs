import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson02');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson02');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');

const RU_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_ru_pack_candidate_v1.json');
const UK_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_uk_pack_candidate_v1.json');
const PACK_CONTRACT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_pack_candidate_contract_v1.json');
const PACK_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_pack_candidate_audit_v1.json');
const DECISIONS_PATH = path.join(REVIEWER_DIR, 'fr_lesson02_review_draft_llm_decisions_v1.jsonl');
const DECISION_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson02_review_draft_llm_decision_gate_audit_v1.json');

const THEORY_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_theory_candidate_v1.json');
const THEORY_CONTRACT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_theory_materialization_contract_v1.json');
const THEORY_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_theory_materialization_audit_v1.json');
const AUDIO_MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson02_audio_tts_manifest_v1.json');
const AUDIO_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson02_audio_tts_manifest_gate_audit_v1.json');
const INTEGRITY_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_integrity_gate_audit_v1.json');
const INTEGRITY_MD_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_integrity_gate_audit_v1.md');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const SOURCE_LOCALES = ['ru', 'uk'];
const EXPECTED_BLOCK_KINDS = ['body', 'formula', 'examples', 'fix', 'tip'];
const VOICE_POLICY = {
  provider: 'openai',
  voiceFamily: 'french_friendly_clear_a1',
  requiredFormat: 'mp3',
  requiredSampleRateHz: 24000,
  exactVoiceMustBeChosenBeforeExecution: true,
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function hasMojibake(value) {
  return /[�ÃÐÑÒ]/u.test(String(value));
}

function hasCyrillic(value) {
  return /[А-Яа-яЁёІіЇїЄєҐґ]/.test(String(value));
}

function productionFlagOpened(value) {
  return Boolean(
    value?.activationApproved ||
    value?.productionApplyApproved ||
    value?.readyForApply ||
    value?.readyForServerUpload ||
    value?.readyForRuntimeDelivery ||
    value?.runtimeDownloadsEnabled ||
    value?.serverUploadAllowed ||
    value?.firebaseUploadAllowed ||
    value?.downloadablePacksPublished
  );
}

function theorySections() {
  return [
    {
      num: '01',
      titleRu: 'Что добавляет второй урок',
      titleUk: 'Що додає другий урок',
      defaultOpen: true,
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Во втором уроке ты берешь формы из первого урока и учишься делать две новые операции: отрицание и простой вопрос. Это не перевод английского порядка слов, а французские рамки ne ... pas и Est-ce que.',
          uk: 'У другому уроці ти береш форми з першого уроку і вчишся робити дві нові операції: заперечення і просте питання. Це не переклад англійського порядку слів, а французькі рамки ne ... pas і Est-ce que.',
        },
        {
          kind: 'examples',
          examples: [
            { fr: 'Je ne suis pas prêt.', ru: 'Я не готов.', uk: 'Я не готовий.', hi: 'ne ... pas' },
            { fr: 'Est-ce que tu es prêt ?', ru: 'Ты готов?', uk: 'Ти готовий?', hi: 'Est-ce que' },
            { fr: "Est-ce qu'il est ici ?", ru: 'Он здесь?', uk: 'Він тут?', hi: "Est-ce qu'" },
            { fr: 'Tu es prêt ?', ru: 'Ты готов?', uk: 'Ти готовий?', hi: '?' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Главная идея урока: не менять весь словарь, а научиться поворачивать уже знакомые фразы в “нет” и “вопрос”.',
          uk: 'Головна ідея уроку: не міняти весь словник, а навчитися повертати вже знайомі фрази в “ні” і “питання”.',
        },
      ],
    },
    {
      num: '02',
      titleRu: 'Отрицание ne ... pas',
      titleUk: 'Заперечення ne ... pas',
      defaultOpen: true,
      exampleCount: 5,
      blocks: [
        {
          kind: 'body',
          ru: 'Базовое французское отрицание строится вокруг спрягаемого глагола: ne + форма глагола + pas. Если глагол начинается с гласной, ne становится n’.',
          uk: 'Базове французьке заперечення будується навколо відмінюваного дієслова: ne + форма дієслова + pas. Якщо дієслово починається з голосної, ne стає n’.',
        },
        {
          kind: 'formula',
          formula: ['кто', 'ne / n’', 'форма глагола', 'pas', 'описание'],
        },
        {
          kind: 'examples',
          examples: [
            { fr: 'Je ne suis pas prêt.', ru: 'Я не готов.', uk: 'Я не готовий.', hi: 'ne ... pas' },
            { fr: "Tu n'es pas ici.", ru: 'Ты не здесь.', uk: 'Ти не тут.', hi: "n' ... pas" },
            { fr: "Elle n'est pas là.", ru: 'Она не здесь.', uk: 'Вона не тут.', hi: "n' ... pas" },
            { fr: 'Nous ne sommes pas prêts.', ru: 'Мы не готовы.', uk: 'Ми не готові.', hi: 'ne ... pas' },
            { fr: 'Ils ne sont pas ici.', ru: 'Они не здесь.', uk: 'Вони не тут.', hi: 'ne ... pas' },
          ],
        },
        {
          kind: 'fix',
          fixes: [
            { wrong: 'Je suis pas prêt', right: 'Je ne suis pas prêt' },
            { wrong: 'Tu ne es pas ici', right: "Tu n'es pas ici" },
          ],
        },
      ],
    },
    {
      num: '03',
      titleRu: 'Ce n’est pas: когда “это не ...”',
      titleUk: 'Ce n’est pas: коли “це не ...”',
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Для “это не ...” в уроке используется готовый блок Ce n’est pas. Это удобно для коротких оценок: не важно, не легко, не хорошо, не мой друг.',
          uk: 'Для “це не ...” в уроці використовується готовий блок Ce n’est pas. Це зручно для коротких оцінок: не важливо, не легко, не добре, не мій друг.',
        },
        {
          kind: 'examples',
          examples: [
            { fr: "Ce n'est pas important.", ru: 'Это не важно.', uk: 'Це не важливо.', hi: "Ce n'est pas" },
            { fr: "Ce n'est pas facile.", ru: 'Это не легко.', uk: 'Це не легко.', hi: "Ce n'est pas" },
            { fr: "Ce n'est pas bon.", ru: 'Это нехорошо.', uk: 'Це недобре.', hi: "Ce n'est pas" },
            { fr: "Ce n'est pas mon ami.", ru: 'Это не мой друг.', uk: 'Це не мій друг.', hi: "Ce n'est pas" },
          ],
        },
      ],
    },
    {
      num: '04',
      titleRu: 'Вопрос через Est-ce que',
      titleUk: 'Питання через Est-ce que',
      defaultOpen: true,
      exampleCount: 5,
      blocks: [
        {
          kind: 'body',
          ru: 'Est-ce que ставится перед обычной фразой и превращает ее в вопрос. Перед il, elle, ils, elles удобнее форма Est-ce qu’.',
          uk: 'Est-ce que ставиться перед звичайною фразою і перетворює її на питання. Перед il, elle, ils, elles зручніша форма Est-ce qu’.',
        },
        {
          kind: 'formula',
          formula: ['Est-ce que / Est-ce qu’', 'обычная фраза', '?'],
        },
        {
          kind: 'examples',
          examples: [
            { fr: 'Est-ce que tu es prêt ?', ru: 'Ты готов?', uk: 'Ти готовий?', hi: 'Est-ce que' },
            { fr: "Est-ce qu'il est ici ?", ru: 'Он здесь?', uk: 'Він тут?', hi: "Est-ce qu'" },
            { fr: "Est-ce qu'elle est là ?", ru: 'Она здесь?', uk: 'Вона тут?', hi: "Est-ce qu'" },
            { fr: 'Est-ce que vous comprenez ?', ru: 'Вы понимаете?', uk: 'Ви розумієте?', hi: 'Est-ce que' },
            { fr: 'Est-ce que vous habitez à Lyon ?', ru: 'Вы живете в Лионе?', uk: 'Ви живете в Ліоні?', hi: 'Est-ce que' },
          ],
        },
        {
          kind: 'fix',
          fixes: [
            { wrong: 'Est-ce que il est ici ?', right: "Est-ce qu'il est ici ?" },
            { wrong: 'Est-ce vous êtes prêt ?', right: 'Est-ce que vous êtes prêt ?' },
          ],
        },
      ],
    },
    {
      num: '05',
      titleRu: 'Интонационный вопрос',
      titleUk: 'Інтонаційне питання',
      exampleCount: 5,
      blocks: [
        {
          kind: 'body',
          ru: 'В разговорной речи простая фраза может стать вопросом через интонацию и знак вопроса. Для первого уровня это удобно, но Est-ce que остается более явной учебной рамкой.',
          uk: 'У розмовній мові проста фраза може стати питанням через інтонацію і знак питання. Для першого рівня це зручно, але Est-ce que лишається більш явною навчальною рамкою.',
        },
        {
          kind: 'examples',
          examples: [
            { fr: 'Tu es prêt ?', ru: 'Ты готов?', uk: 'Ти готовий?', hi: '?' },
            { fr: 'Vous êtes prêts ?', ru: 'Вы готовы?', uk: 'Ви готові?', hi: '?' },
            { fr: 'Il est calme ?', ru: 'Он спокоен?', uk: 'Він спокійний?', hi: '?' },
            { fr: 'Nous sommes ensemble ?', ru: 'Мы вместе?', uk: 'Ми разом?', hi: '?' },
            { fr: 'Ils sont là ?', ru: 'Они здесь?', uk: 'Вони тут?', hi: '?' },
          ],
        },
      ],
    },
    {
      num: '06',
      titleRu: 'Tu и vous остаются стабильными',
      titleUk: 'Tu і vous залишаються стабільними',
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Во втором уроке особенно важно не смешивать обращение. Если вопрос начинается с tu, дальше держи “ты”. Если начинается с vous, держи “вы”.',
          uk: 'У другому уроці особливо важливо не змішувати звертання. Якщо питання починається з tu, далі тримай “ти”. Якщо починається з vous, тримай “ви”.',
        },
        {
          kind: 'examples',
          examples: [
            { fr: 'Est-ce que tu es prêt ?', ru: 'Ты готов?', uk: 'Ти готовий?', hi: 'tu' },
            { fr: 'Est-ce que vous êtes prêt ?', ru: 'Вы готовы?', uk: 'Ви готові?', hi: 'vous' },
            { fr: 'Est-ce que tu comprends ?', ru: 'Ты понимаешь?', uk: 'Ти розумієш?', hi: 'tu' },
            { fr: 'Est-ce que vous comprenez ?', ru: 'Вы понимаете?', uk: 'Ви розумієте?', hi: 'vous' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Если в вариантах ответа рядом стоят tu и vous, сначала реши, к кому обращаются.',
          uk: 'Якщо у варіантах відповіді поруч стоять tu і vous, спочатку виріши, до кого звертаються.',
        },
      ],
    },
    {
      num: '07',
      titleRu: 'Что проверяют дистракторы',
      titleUk: 'Що перевіряють дистрактори',
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Дистракторы во втором уроке тренируют не случайные слова, а точные слоты: форму être, рамку отрицания, вопросительную рамку, местоимение или согласование.',
          uk: 'Дистрактори в другому уроці тренують не випадкові слова, а точні слоти: форму être, рамку заперечення, питальну рамку, займенник або узгодження.',
        },
        {
          kind: 'examples',
          examples: [
            { fr: 'suis / es / est / sommes / êtes / sont', ru: 'формы être', uk: 'форми être', hi: 'être' },
            { fr: 'ne ... pas / n’ ... pas', ru: 'рамка отрицания', uk: 'рамка заперечення', hi: 'pas' },
            { fr: 'Est-ce que / Est-ce qu’', ru: 'рамка вопроса', uk: 'рамка питання', hi: 'Est-ce que' },
            { fr: 'prêt / prête / prêts / contentes', ru: 'согласование', uk: 'узгодження', hi: 'accord' },
          ],
        },
      ],
    },
  ];
}

function buildTheory(generatedAt) {
  return {
    schemaVersion: 'gustav-fr-lesson02-theory-candidate-v1',
    generatedAt,
    status: 'THEORY_CANDIDATE_HOLD',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    lessonId: 2,
    appCourseLevel: 'A1',
    internalFrenchBand: 'A1.1',
    englishBlueprintShape: {
      appSource: 'app/theory_content_lesson2.ts',
      registrySource: 'app/theory_content_registry.ts',
      titleFields: ['titleRu', 'titleUk'],
      sectionFields: ['num', 'titleRu', 'titleUk', 'exampleCount', 'defaultOpen', 'blocks'],
      blockKindsPreserved: EXPECTED_BLOCK_KINDS,
    },
    titleRu: 'Французский A1: отрицание и простые вопросы',
    titleUk: 'Французький A1: заперечення і прості питання',
    sections: theorySections(),
    sourceEvidenceIds: [
      'coe_cefr_a1_global_scale',
      'tv5monde_negation',
      'tv5monde_answering_negative_question',
      'le_robert_etre_present',
      'lawless_est_ce_que',
    ],
    safety: {
      theoryCandidateOnly: true,
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
}

function validateTheory(theory) {
  const errors = [];
  if (theory.sections.length !== 7) errors.push('expected 7 theory sections');
  if (hasMojibake(JSON.stringify(theory))) errors.push('mojibake detected in theory candidate');
  if (theory.studyTarget !== 'fr' || theory.targetContentLang !== 'fr') errors.push('language identity mismatch');
  if (productionFlagOpened(theory.safety)) errors.push('production flag opened in theory safety');
  for (const section of theory.sections) {
    if (!section.num || !section.titleRu || !section.titleUk) errors.push(`${section.num}: missing section title`);
    if (!Array.isArray(section.blocks) || section.blocks.length < 2) errors.push(`${section.num}: too few blocks`);
    for (const block of section.blocks) {
      if (!EXPECTED_BLOCK_KINDS.includes(block.kind)) errors.push(`${section.num}: unexpected block kind ${block.kind}`);
      if (block.kind === 'examples') {
        for (const example of block.examples ?? []) {
          if (!example.fr || !example.ru || !example.uk) errors.push(`${section.num}: example missing fr/ru/uk`);
          if (hasCyrillic(example.fr) || hasMojibake(example.fr + example.ru + example.uk)) errors.push(`${section.num}: example text leak/mojibake`);
        }
      }
    }
  }
  return errors;
}

function buildAudioSlots(pack) {
  return pack.rows.map((row) => ({
    slotId: `fr.lesson02.row${String(row.rowNumber).padStart(2, '0')}.tts.v1`,
    lessonId: 2,
    rowNumber: row.rowNumber,
    phraseId: row.phraseId,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale: pack.sourceLocale,
    textForTts: row.phraseFr,
    sourceMeaning: row.sourceMeaning,
    ttsProvider: VOICE_POLICY.provider,
    requiredFormat: VOICE_POLICY.requiredFormat,
    expectedAudioPath: `course-packs/fr/${pack.sourceLocale}/audio/lesson02/${row.phraseId}.mp3`,
    localAudioPath: '',
    audioGenerated: false,
    checksumReady: false,
    sha256: '',
    byteSize: 0,
    blockers: ['blocked_pending_openai_tts_generation_and_checksum'],
  }));
}

function inspectPack(pack, sourceLocale) {
  const errors = [];
  if (pack.schemaVersion !== 'gustav-fr-lesson-pack-candidate-v1') errors.push(`${sourceLocale}: pack schema mismatch`);
  if (pack.status !== 'PACK_CANDIDATE_HOLD') errors.push(`${sourceLocale}: pack status mismatch`);
  if (pack.studyTarget !== 'fr' || pack.targetContentLang !== 'fr') errors.push(`${sourceLocale}: pack language mismatch`);
  if (pack.sourceLocale !== sourceLocale) errors.push(`${sourceLocale}: sourceLocale mismatch`);
  if (pack.rows.length !== 50) errors.push(`${sourceLocale}: expected 50 rows`);
  if (productionFlagOpened(pack.safety)) errors.push(`${sourceLocale}: production flag opened`);
  for (const row of pack.rows) {
    if (row.studyTarget !== 'fr' || row.targetContentLang !== 'fr') errors.push(`${row.phraseId}: row language mismatch`);
    if (row.sourceLocale !== sourceLocale) errors.push(`${row.phraseId}: row sourceLocale mismatch`);
    if (row.lessonId !== 2 || row.appCourseLevel !== 'A1') errors.push(`${row.phraseId}: lesson/app level mismatch`);
    if (hasCyrillic(row.phraseFr) || hasMojibake(row.phraseFr) || hasMojibake(row.sourceMeaning)) errors.push(`${row.phraseId}: text leak/mojibake`);
  }
  return errors;
}

function main() {
  const generatedAt = new Date().toISOString();
  const ruPack = readJson(RU_PACK_PATH);
  const ukPack = readJson(UK_PACK_PATH);
  const packContract = readJson(PACK_CONTRACT_PATH);
  const packAudit = readJson(PACK_AUDIT_PATH);
  const decisions = readJsonl(DECISIONS_PATH);
  const decisionGate = readJson(DECISION_GATE_PATH);
  const blockers = [];

  if (packAudit.status !== 'PASS_PACK_CANDIDATE_WRITTEN') blockers.push('pack_candidate_audit_not_pass');
  if (decisionGate.status !== 'PASS_READY_FOR_MATERIALIZATION_CONTRACT') blockers.push('decision_gate_not_pass');
  if (packContract.packCandidates?.ru?.sha256 !== sha256File(RU_PACK_PATH)) blockers.push('ru_pack_sha_mismatch');
  if (packContract.packCandidates?.uk?.sha256 !== sha256File(UK_PACK_PATH)) blockers.push('uk_pack_sha_mismatch');
  blockers.push(...inspectPack(ruPack, 'ru'), ...inspectPack(ukPack, 'uk'));

  const acceptedDecisionIds = new Set(decisions.filter((decision) => decision.reviewerDecision === 'accept_review_draft').map((decision) => decision.requestId));
  if (acceptedDecisionIds.size !== 50) blockers.push('expected_50_accepted_review_decisions');

  const theory = buildTheory(generatedAt);
  blockers.push(...validateTheory(theory));
  writeJson(THEORY_PATH, theory);
  const theoryContract = {
    schemaVersion: 'gustav-fr-lesson02-theory-materialization-contract-v1',
    generatedAt,
    status: blockers.length === 0 ? 'THEORY_CANDIDATE_READY_FOR_NEXT_GATES' : 'BLOCK',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    theoryCandidate: { path: rel(THEORY_PATH), sha256: sha256File(THEORY_PATH) },
    packCandidateAudit: { path: rel(PACK_AUDIT_PATH), sha256: sha256File(PACK_AUDIT_PATH) },
    nextRequiredGates: [
      'lesson02_theory_runtime_shape_gate',
      'lesson02_theory_source_review_gate',
      'lesson02_audio_tts_manifest_gate',
      'lesson02_integrity_gate',
    ],
    safety: theory.safety,
  };
  writeJson(THEORY_CONTRACT_PATH, theoryContract);
  const theoryAudit = {
    schemaVersion: 'gustav-fr-lesson02-theory-materialization-audit-v1',
    generatedAt,
    status: blockers.length === 0 ? 'PASS_THEORY_CANDIDATE_WRITTEN' : 'BLOCK',
    blockers,
    summary: {
      sections: theory.sections.length,
      blocks: theory.sections.reduce((sum, section) => sum + section.blocks.length, 0),
      exampleBlocks: theory.sections.reduce((sum, section) => sum + section.blocks.filter((block) => block.kind === 'examples').length, 0),
      fixBlocks: theory.sections.reduce((sum, section) => sum + section.blocks.filter((block) => block.kind === 'fix').length, 0),
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    },
  };
  writeJson(THEORY_AUDIT_PATH, theoryAudit);

  const audioSlots = [...buildAudioSlots(ruPack), ...buildAudioSlots(ukPack)];
  const audioErrors = [];
  if (audioSlots.length !== 100) audioErrors.push(`expected 100 audio slots, got ${audioSlots.length}`);
  if (new Set(audioSlots.map((slot) => `${slot.phraseId}:${slot.textForTts}`)).size !== 50) audioErrors.push('expected 50 unique target phrase texts');
  for (const slot of audioSlots) {
    if (hasCyrillic(slot.textForTts) || hasMojibake(slot.textForTts + slot.sourceMeaning)) audioErrors.push(`${slot.slotId}: text leak/mojibake`);
    if (slot.audioGenerated || slot.checksumReady || slot.localAudioPath || slot.sha256 || Number(slot.byteSize) !== 0) audioErrors.push(`${slot.slotId}: audio readiness opened`);
  }
  const audioManifest = {
    schemaVersion: 'gustav-fr-lesson02-audio-tts-manifest-v1',
    generatedAt,
    status: 'HOLD_PENDING_TTS_GENERATION',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 2,
    voicePolicy: VOICE_POLICY,
    sourcePacks: {
      ru: { path: rel(RU_PACK_PATH), sha256: sha256File(RU_PACK_PATH) },
      uk: { path: rel(UK_PACK_PATH), sha256: sha256File(UK_PACK_PATH) },
    },
    slots: audioSlots,
    safety: {
      manifestOnly: true,
      ttsApiCalledByThisScript: false,
      audioFilesWrittenByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(AUDIO_MANIFEST_PATH, audioManifest);
  const audioAudit = {
    schemaVersion: 'gustav-fr-lesson02-audio-tts-manifest-gate-audit-v1',
    generatedAt,
    status: audioErrors.length === 0 ? 'HOLD_AUDIO_TTS_NOT_GENERATED' : 'BLOCK',
    blockers: audioErrors.length === 0 ? ['blocked_pending_openai_tts_generation_and_checksum'] : audioErrors,
    summary: {
      audioSlots: audioSlots.length,
      expectedSourceLocaleSlots: 100,
      uniqueTargetPhraseTexts: new Set(audioSlots.map((slot) => `${slot.phraseId}:${slot.textForTts}`)).size,
      generatedSlots: 0,
      checksumReadySlots: 0,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    },
    safety: audioManifest.safety,
  };
  writeJson(AUDIO_AUDIT_PATH, audioAudit);

  const integrityBlockers = [...blockers];
  if (theoryAudit.status !== 'PASS_THEORY_CANDIDATE_WRITTEN') integrityBlockers.push('theory_audit_not_pass');
  if (audioAudit.status !== 'HOLD_AUDIO_TTS_NOT_GENERATED') integrityBlockers.push('audio_audit_not_expected_hold');
  const ruRowsById = new Map(ruPack.rows.map((row) => [row.phraseId, row]));
  const ukRowsById = new Map(ukPack.rows.map((row) => [row.phraseId, row]));
  for (const [phraseId, ruRow] of ruRowsById) {
    const ukRow = ukRowsById.get(phraseId);
    if (!ukRow) integrityBlockers.push(`${phraseId}: missing uk row`);
    else if (ruRow.phraseFr !== ukRow.phraseFr || JSON.stringify(ruRow.wordsFr) !== JSON.stringify(ukRow.wordsFr)) {
      integrityBlockers.push(`${phraseId}: source-locale pack mismatch`);
    }
  }
  const productionBlockers = [
    'blocked_pending_openai_tts_generation_and_checksum',
    'blocked_pending_lesson02_server_pack_manifest_gate',
    'blocked_pending_lesson02_runtime_delivery_gate',
    'blocked_pending_admin_visibility_and_activation_gates',
    'blocked_until_full_32_lesson_course_parity',
  ];
  const integrityAudit = {
    schemaVersion: 'gustav-fr-lesson02-integrity-gate-audit-v1',
    generatedAt,
    status: integrityBlockers.length === 0 ? 'PASS_INTEGRITY_WITH_AUDIO_HOLD' : 'BLOCK',
    blockers: integrityBlockers,
    productionBlockers,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    lessonId: 2,
    appCourseLevel: 'A1',
    sourceLocales: SOURCE_LOCALES,
    inputs: {
      ruPack: { path: rel(RU_PACK_PATH), sha256: sha256File(RU_PACK_PATH) },
      ukPack: { path: rel(UK_PACK_PATH), sha256: sha256File(UK_PACK_PATH) },
      theory: { path: rel(THEORY_PATH), sha256: sha256File(THEORY_PATH) },
      audioManifest: { path: rel(AUDIO_MANIFEST_PATH), sha256: sha256File(AUDIO_MANIFEST_PATH) },
      reviewDecisionGate: { path: rel(DECISION_GATE_PATH), sha256: sha256File(DECISION_GATE_PATH) },
    },
    summary: {
      ruRows: ruPack.rows.length,
      ukRows: ukPack.rows.length,
      acceptedReviewDecisions: acceptedDecisionIds.size,
      theorySections: theory.sections.length,
      theoryBlocks: theoryAudit.summary.blocks,
      audioSlots: audioSlots.length,
      uniqueAudioPhraseTexts: audioAudit.summary.uniqueTargetPhraseTexts,
      generatedAudioSlots: 0,
      checksumReadySlots: 0,
      structuralIntegrityReady: integrityBlockers.length === 0,
      readyForAudioGeneration: integrityBlockers.length === 0,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    },
    safety: {
      readOnlyGate: true,
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(INTEGRITY_AUDIT_PATH, integrityAudit);
  fs.writeFileSync(INTEGRITY_MD_PATH, [
    '# French Lesson 2 Integrity Gate',
    '',
    `Status: ${integrityAudit.status}`,
    `Rows: RU ${integrityAudit.summary.ruRows}, UK ${integrityAudit.summary.ukRows}`,
    `Accepted review decisions: ${integrityAudit.summary.acceptedReviewDecisions}`,
    `Theory: ${integrityAudit.summary.theorySections} sections, ${integrityAudit.summary.theoryBlocks} blocks`,
    `Audio: ${integrityAudit.summary.audioSlots} slots, generated 0, checksum 0`,
    '',
    '## Production Blockers',
    '',
    ...productionBlockers.map((blocker) => `- ${blocker}`),
    '',
  ].join('\n') + '\n', 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson02PostpackGates = {
      theoryAudit: rel(THEORY_AUDIT_PATH),
      audioAudit: rel(AUDIO_AUDIT_PATH),
      integrityAudit: rel(INTEGRITY_AUDIT_PATH),
    };
    state.lesson02PostpackSummary = integrityAudit.summary;
    state.nextPassPlan = [
      'Start Lesson 3 review draft from English blueprint.',
      'Then run Lesson 3 review packet/decisions/pack candidate pipeline.',
      'Continue repeating the gated pattern through all 32 lessons before any activation.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  const finalBlockers = [...blockers, ...audioErrors, ...integrityBlockers];
  console.log(`${finalBlockers.length === 0 ? 'PASS_LESSON02_POSTPACK_GATES' : 'BLOCK'} theory=${theory.sections.length}/${theoryAudit.summary.blocks} audio=0/${audioSlots.length} integrity=${integrityAudit.status}`);
  if (finalBlockers.length > 0) process.exitCode = 1;
}

main();
