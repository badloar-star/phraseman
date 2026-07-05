import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const PACK_AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01', 'fr_lesson01_pack_candidate_audit_v1.json');
const REVIEW_DRAFT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review', 'lesson01_full_review_draft.json');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01');
const THEORY_PATH = path.join(OUT_DIR, 'fr_lesson01_theory_candidate_v1.json');
const CONTRACT_PATH = path.join(OUT_DIR, 'fr_lesson01_theory_materialization_contract_v1.json');
const AUDIT_PATH = path.join(OUT_DIR, 'fr_lesson01_theory_materialization_audit_v1.json');
const MD_PATH = path.join(OUT_DIR, 'fr_lesson01_theory_materialization_v1.md');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const EXPECTED_BLOCK_KINDS = ['body', 'formula', 'examples', 'fix', 'tip'];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

function theorySections() {
  return [
    {
      num: '01',
      titleRu: 'Что ты тренируешь в этом уроке',
      titleUk: 'Що ти тренуєш у цьому уроці',
      defaultOpen: true,
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'В этом уроке французский начинается не с перевода английского to be, а с настоящих первых ситуаций: поздороваться, представиться, спросить имя и сказать простое состояние или происхождение.',
          uk: 'У цьому уроці французька починається не з перекладу англійського to be, а з реальних перших ситуацій: привітатися, представитися, запитати ім’я і сказати простий стан або походження.',
        },
        {
          kind: 'examples',
          examples: [
            { fr: 'Bonjour.', ru: 'Здравствуйте.', uk: 'Вітаю.', hi: 'Bonjour' },
            { fr: "Je m'appelle Marie.", ru: 'Меня зовут Мари.', uk: 'Мене звати Марі.', hi: "m'appelle" },
            { fr: 'Je suis étudiant.', ru: 'Я студент.', uk: 'Я студент.', hi: 'suis' },
            { fr: 'Je viens de Paris.', ru: 'Я из Парижа.', uk: 'Я з Парижа.', hi: 'viens de' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Главная цель: собрать маленькую французскую фразу как готовый блок, а не переводить слово за словом.',
          uk: 'Головна мета: зібрати маленьку французьку фразу як готовий блок, а не перекладати слово за словом.',
        },
      ],
    },
    {
      num: '02',
      titleRu: 'Главная формула: кто + être + описание',
      titleUk: 'Головна формула: хто + être + опис',
      defaultOpen: true,
      exampleCount: 6,
      blocks: [
        {
          kind: 'body',
          ru: 'Французский часто требует явную форму être там, где русский или украинский звучит короче: я здесь, он спокоен, мы вместе. В уроке ты видишь формы suis, es, est, sommes, êtes, sont.',
          uk: 'Французька часто потребує явну форму être там, де українська або російська звучить коротше: я тут, він спокійний, ми разом. В уроці ти бачиш форми suis, es, est, sommes, êtes, sont.',
        },
        {
          kind: 'formula',
          formula: ['кто / кто именно', 'être: suis / es / est / sommes / êtes / sont', 'описание, место или роль'],
        },
        {
          kind: 'examples',
          examples: [
            { fr: 'Je suis ici.', ru: 'Я здесь.', uk: 'Я тут.', hi: 'suis' },
            { fr: 'Tu es là.', ru: 'Ты здесь.', uk: 'Ти тут.', hi: 'es' },
            { fr: 'Il est calme.', ru: 'Он спокоен.', uk: 'Він спокійний.', hi: 'est' },
            { fr: 'Nous sommes ensemble.', ru: 'Мы вместе.', uk: 'Ми разом.', hi: 'sommes' },
            { fr: 'Vous êtes prêt.', ru: 'Вы готовы.', uk: 'Ви готові.', hi: 'êtes' },
            { fr: 'Ils sont ici.', ru: 'Они здесь.', uk: 'Вони тут.', hi: 'sont' },
          ],
        },
        {
          kind: 'fix',
          fixes: [
            { wrong: 'Je ici', right: 'Je suis ici' },
            { wrong: 'Vous prêt', right: 'Vous êtes prêt' },
          ],
        },
      ],
    },
    {
      num: '03',
      titleRu: 'Формы être в настоящем времени',
      titleUk: 'Форми être у теперішньому часі',
      exampleCount: 6,
      blocks: [
        {
          kind: 'body',
          ru: 'Être меняется по лицу. Не пытайся выбирать форму по русскому слову “есть”: выбирай по французскому подлежащему.',
          uk: 'Être змінюється за особою. Не намагайся вибирати форму за словом “є”: вибирай за французьким підметом.',
        },
        {
          kind: 'examples',
          examples: [
            { fr: 'je suis', ru: 'я есть / я являюсь', uk: 'я є', hi: 'suis' },
            { fr: 'tu es', ru: 'ты есть / ты являешься', uk: 'ти є', hi: 'es' },
            { fr: 'il / elle est', ru: 'он / она есть', uk: 'він / вона є', hi: 'est' },
            { fr: 'nous sommes', ru: 'мы есть', uk: 'ми є', hi: 'sommes' },
            { fr: 'vous êtes', ru: 'вы есть', uk: 'ви є', hi: 'êtes' },
            { fr: 'ils / elles sont', ru: 'они есть', uk: 'вони є', hi: 'sont' },
          ],
        },
        {
          kind: 'tip',
          ru: 'В упражнении форма être должна совпадать с подлежащим: je → suis, tu → es, vous → êtes.',
          uk: 'У вправі форма être має збігатися з підметом: je → suis, tu → es, vous → êtes.',
        },
      ],
    },
    {
      num: '04',
      titleRu: 'Как представиться',
      titleUk: 'Як представитися',
      exampleCount: 5,
      blocks: [
        {
          kind: 'body',
          ru: 'Для имени французский использует готовые конструкции. Je m’appelle звучит нейтрально, Moi, c’est звучит проще и разговорнее.',
          uk: 'Для імені французька використовує готові конструкції. Je m’appelle звучить нейтрально, Moi, c’est звучить простіше і розмовніше.',
        },
        {
          kind: 'examples',
          examples: [
            { fr: "Je m'appelle Marie.", ru: 'Меня зовут Мари.', uk: 'Мене звати Марі.', hi: "m'appelle" },
            { fr: 'Moi, c’est Lina.', ru: 'Я Лина.', uk: 'Я Ліна.', hi: "c’est" },
            { fr: 'Comment tu t’appelles ?', ru: 'Как тебя зовут?', uk: 'Як тебе звати?', hi: "t’appelles" },
            { fr: 'Comment vous appelez-vous ?', ru: 'Как вас зовут?', uk: 'Як вас звати?', hi: 'appelez-vous' },
            { fr: 'Enchanté.', ru: 'Очень приятно.', uk: 'Дуже приємно.', hi: 'Enchanté' },
          ],
        },
        {
          kind: 'fix',
          fixes: [
            { wrong: 'Je suis appelle Marie', right: "Je m'appelle Marie" },
            { wrong: 'Comment tu appelles ?', right: 'Comment tu t’appelles ?' },
          ],
        },
      ],
    },
    {
      num: '05',
      titleRu: 'Tu и vous: не смешивай обращение',
      titleUk: 'Tu і vous: не змішуй звертання',
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Tu — неформальное “ты”. Vous — вежливое “вы” или обращение к нескольким людям. В одном маленьком диалоге лучше не прыгать между tu и vous без причины.',
          uk: 'Tu — неформальне “ти”. Vous — ввічливе “ви” або звертання до кількох людей. В одному маленькому діалозі краще не стрибати між tu і vous без причини.',
        },
        {
          kind: 'examples',
          examples: [
            { fr: 'Et toi ?', ru: 'А ты?', uk: 'А ти?', hi: 'toi' },
            { fr: 'Et vous ?', ru: 'А вы?', uk: 'А ви?', hi: 'vous' },
            { fr: "S'il te plaît.", ru: 'Пожалуйста.', uk: 'Будь ласка.', hi: 'te' },
            { fr: "S'il vous plaît.", ru: 'Пожалуйста.', uk: 'Будь ласка.', hi: 'vous' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Если в задании уже стоит vous, выбирай формы и вежливые выражения вокруг vous.',
          uk: 'Якщо в завданні вже стоїть vous, обирай форми й ввічливі вирази навколо vous.',
        },
      ],
    },
    {
      num: '06',
      titleRu: 'Род и согласование в первых фразах',
      titleUk: 'Рід і узгодження в перших фразах',
      exampleCount: 6,
      blocks: [
        {
          kind: 'body',
          ru: 'Во французском некоторые слова меняются по роду: étudiant/étudiante, français/française, prêt/prête. В первом уроке это не вся грамматика рода, а первый сигнал: форма слова зависит от того, о ком говорят.',
          uk: 'У французькій деякі слова змінюються за родом: étudiant/étudiante, français/française, prêt/prête. У першому уроці це не вся граматика роду, а перший сигнал: форма слова залежить від того, про кого говорять.',
        },
        {
          kind: 'examples',
          examples: [
            { fr: 'Je suis étudiant.', ru: 'Я студент.', uk: 'Я студент.', hi: 'étudiant' },
            { fr: 'Je suis étudiante.', ru: 'Я студентка.', uk: 'Я студентка.', hi: 'étudiante' },
            { fr: 'Je suis français.', ru: 'Я француз.', uk: 'Я француз.', hi: 'français' },
            { fr: 'Je suis française.', ru: 'Я француженка.', uk: 'Я француженка.', hi: 'française' },
            { fr: 'Il est calme.', ru: 'Он спокоен.', uk: 'Він спокійний.', hi: 'calme' },
            { fr: 'Elle est calme.', ru: 'Она спокойна.', uk: 'Вона спокійна.', hi: 'calme' },
          ],
        },
      ],
    },
    {
      num: '07',
      titleRu: 'De и à в первых местах',
      titleUk: 'De і à у перших місцях',
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'De в этом уроке помогает сказать происхождение: из города или страны. À помогает сказать место в городе. Это первые маленькие куски, а не полный урок по предлогам.',
          uk: 'De в цьому уроці допомагає сказати походження: з міста або країни. À допомагає сказати місце в місті. Це перші маленькі блоки, а не повний урок з прийменників.',
        },
        {
          kind: 'examples',
          examples: [
            { fr: 'Je suis de Kyiv.', ru: 'Я из Киева.', uk: 'Я з Києва.', hi: 'de' },
            { fr: 'Je viens de Paris.', ru: 'Я из Парижа.', uk: 'Я з Парижа.', hi: 'de' },
            { fr: "J'habite à Lyon.", ru: 'Я живу в Лионе.', uk: 'Я живу в Ліоні.', hi: 'à' },
            { fr: 'Je suis ici.', ru: 'Я здесь.', uk: 'Я тут.', hi: 'ici' },
          ],
        },
        {
          kind: 'fix',
          fixes: [
            { wrong: 'J’habite a Lyon', right: "J'habite à Lyon" },
            { wrong: 'Je viens à Paris', right: 'Je viens de Paris' },
          ],
        },
      ],
    },
  ];
}

function buildTheory(draft, generatedAt) {
  return {
    schemaVersion: 'gustav-fr-lesson01-theory-candidate-v1',
    generatedAt,
    status: 'THEORY_CANDIDATE_HOLD',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    lessonId: 1,
    appCourseLevel: draft.appCourseLevel,
    internalFrenchBand: draft.internalFrenchBand,
    englishBlueprintShape: {
      appSource: 'app/theory_content_lesson1.ts',
      registrySource: 'app/theory_content_registry.ts',
      titleFields: ['titleRu', 'titleUk'],
      sectionFields: ['num', 'titleRu', 'titleUk', 'exampleCount', 'defaultOpen', 'blocks'],
      blockKindsPreserved: EXPECTED_BLOCK_KINDS,
    },
    titleRu: 'Французский старт: приветствия, представление и être',
    titleUk: 'Французький старт: вітання, представлення і être',
    sections: theorySections(),
    sourceEvidenceIds: [
      'coe_cefr_a1_global_scale',
      'tv5monde_introducing_yourself',
      'tv5monde_greetings_a1',
      'le_robert_etre_present',
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
  if (theory.sections.length < 7) errors.push('expected at least 7 theory sections');
  if (hasMojibake(JSON.stringify(theory))) errors.push('mojibake detected in theory candidate');
  if (theory.studyTarget !== 'fr' || theory.targetContentLang !== 'fr') errors.push('language identity mismatch');
  if (theory.safety.serverUploadAllowed || theory.safety.runtimeDownloadsEnabled || theory.safety.productionApplyApproved || theory.safety.activationApproved) {
    errors.push('production flag opened');
  }
  for (const section of theory.sections) {
    if (!section.num || !section.titleRu || !section.titleUk) errors.push(`${section.num}: missing section title`);
    if (!Array.isArray(section.blocks) || section.blocks.length < 2) errors.push(`${section.num}: too few blocks`);
    for (const block of section.blocks) {
      if (!EXPECTED_BLOCK_KINDS.includes(block.kind)) errors.push(`${section.num}: unexpected block kind ${block.kind}`);
      if (block.kind === 'examples') {
        for (const example of block.examples ?? []) {
          if (!example.fr || !example.ru || !example.uk) errors.push(`${section.num}: example missing fr/ru/uk`);
          if (hasCyrillicFrench(example.fr)) errors.push(`${section.num}: Cyrillic in French example`);
        }
      }
    }
  }
  return errors;
}

function hasCyrillicFrench(value) {
  return /[А-Яа-яЁёІіЇїЄєҐґ]/.test(String(value));
}

function buildMarkdown(theory, audit) {
  const lines = [
    '# French Lesson 1 Theory Candidate',
    '',
    `Status: ${audit.status}`,
    `Sections: ${audit.summary.sections}`,
    `Blocks: ${audit.summary.blocks}`,
    '',
    '## Title',
    '',
    `- RU: ${theory.titleRu}`,
    `- UK: ${theory.titleUk}`,
    '',
    '## Sections',
    '',
    ...theory.sections.map((section) => `- ${section.num}: ${section.titleRu} / ${section.titleUk}`),
    '',
    '## Safety',
    '',
    `- appBundleModifiedByThisScript: ${theory.safety.appBundleModifiedByThisScript}`,
    `- serverUploadAllowed: ${theory.safety.serverUploadAllowed}`,
    `- runtimeDownloadsEnabled: ${theory.safety.runtimeDownloadsEnabled}`,
    `- activationApproved: ${theory.safety.activationApproved}`,
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  const generatedAt = new Date().toISOString();
  const packAudit = readJson(PACK_AUDIT_PATH);
  const draft = readJson(REVIEW_DRAFT_PATH);
  const blockers = [];

  if (packAudit.status !== 'PASS_PACK_CANDIDATE_WRITTEN') blockers.push('pack candidate audit is not pass');
  if (draft.schemaVersion !== 'gustav-fr-lesson01-full-review-draft-v2') blockers.push('draft schema mismatch');

  const theory = buildTheory(draft, generatedAt);
  blockers.push(...validateTheory(theory));
  writeJson(THEORY_PATH, theory);

  const contract = {
    schemaVersion: 'gustav-fr-lesson01-theory-materialization-contract-v1',
    generatedAt,
    status: blockers.length === 0 ? 'THEORY_CANDIDATE_READY_FOR_NEXT_GATES' : 'BLOCK',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    theoryCandidate: {
      path: rel(THEORY_PATH),
      sha256: sha256File(THEORY_PATH),
    },
    packCandidateAudit: {
      path: rel(PACK_AUDIT_PATH),
      sha256: sha256File(PACK_AUDIT_PATH),
    },
    nextRequiredGates: [
      'lesson01_theory_runtime_shape_gate',
      'lesson01_theory_source_review_gate',
      'lesson01_theory_server_pack_manifest_gate',
      'lesson01_theory_admin_visibility_gate',
    ],
    safety: theory.safety,
  };

  const audit = {
    schemaVersion: 'gustav-fr-lesson01-theory-materialization-audit-v1',
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

  writeJson(CONTRACT_PATH, contract);
  writeJson(AUDIT_PATH, audit);
  fs.writeFileSync(MD_PATH, buildMarkdown(theory, audit), 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson01TheoryMaterializationContract = rel(CONTRACT_PATH);
    state.lesson01TheoryMaterializationAudit = rel(AUDIT_PATH);
    state.lesson01TheoryMaterializationSummary = audit.summary;
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${audit.status} ${rel(THEORY_PATH)} sections=${audit.summary.sections} blocks=${audit.summary.blocks} blockers=${blockers.length}`);
  if (blockers.length > 0) process.exitCode = 1;
}

main();
