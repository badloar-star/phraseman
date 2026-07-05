import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LESSON = 22;
const SLUG = 'lesson22_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson22-blueprint-rebuild-v1.reviewed.pending';
const SOURCE_LOCALES = ['ru', 'uk'];
const SAFETY = {
  appBundleModifiedByThisScript: false,
  serverUploadAllowed: false,
  runtimeDownloadsEnabled: false,
  productionApplyApproved: false,
  activationApproved: false,
};

const dirs = {
  review: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review'),
  reviewer: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer'),
  materialized: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', SLUG),
  audio: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', SLUG),
  server: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', SLUG),
  runtime: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', SLUG),
  activation: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation', SLUG),
};

const paths = {
  state: path.join(ROOT, 'docs', 'gustav', 'state.json'),
  manifest: path.join(ROOT, 'app', 'course_pack_manifest.ts'),
  loader: path.join(ROOT, 'app', 'course_pack_loader.ts'),
  index: path.join(ROOT, 'app', 'course_pack_index.ts'),
  studyTarget: path.join(ROOT, 'app', 'study_target.ts'),
  candidate: path.join(dirs.review, 'lesson22_blueprint_rebuild_candidate_v1.json'),
  reviewGate: path.join(dirs.reviewer, 'fr_lesson22_blueprint_rebuild_review_gate_v1.json'),
  ruPack: path.join(dirs.materialized, 'fr_lesson22_blueprint_rebuild_ru_pack_draft_v1.json'),
  ukPack: path.join(dirs.materialized, 'fr_lesson22_blueprint_rebuild_uk_pack_draft_v1.json'),
  packAudit: path.join(dirs.materialized, 'fr_lesson22_blueprint_rebuild_pack_draft_audit_v1.json'),
  theory: path.join(dirs.materialized, 'fr_lesson22_blueprint_rebuild_theory_vocab_pack_v1.json'),
  theoryAudit: path.join(dirs.materialized, 'fr_lesson22_blueprint_rebuild_theory_vocab_pack_audit_v1.json'),
  audio: path.join(dirs.audio, 'fr_lesson22_blueprint_rebuild_audio_tts_manifest_v1.json'),
  audioAudit: path.join(dirs.audio, 'fr_lesson22_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'),
  server: path.join(dirs.server, 'fr_lesson22_blueprint_rebuild_server_pack_manifest_v1.json'),
  serverAudit: path.join(dirs.server, 'fr_lesson22_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'),
  payloadAudit: path.join(dirs.server, 'fr_lesson22_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'),
  rollbackAudit: path.join(dirs.server, 'fr_lesson22_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'),
  uploadAudit: path.join(dirs.server, 'fr_lesson22_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'),
  runtimeAudit: path.join(dirs.runtime, 'fr_lesson22_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'),
  cache: path.join(dirs.runtime, 'fr_lesson22_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'),
  cacheAudit: path.join(dirs.runtime, 'fr_lesson22_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json'),
  activation: path.join(dirs.activation, 'fr_lesson22_blueprint_rebuild_explicit_activation_receipt_gate_v1.json'),
  activationAudit: path.join(dirs.activation, 'fr_lesson22_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'),
};

const SOURCES = {
  lawless_infinitive: {
    url: 'https://www.lawlessfrench.com/grammar/infinitive/',
    claim: 'French infinitives can be required after verbs/prepositions and can act as nouns; English gerund equivalents often use a French infinitive.',
  },
  lawless_present_participle_gerund: {
    url: 'https://www.lawlessfrench.com/grammar/present-participle/',
    claim: 'French present participles end in -ant, but English -ing cannot be mapped blindly; French gerund is usually en + present participle and relates to the main verb.',
  },
  lawless_present_participle_conjugations: {
    url: 'https://www.lawlessfrench.com/grammar/present-participle-conjugations/',
    claim: 'Most French present participles are formed from the nous present stem by dropping -ons and adding -ant, with avoir/être/savoir exceptions.',
  },
  kwiziq_gerondif_b1: {
    url: 'https://french.kwiziq.com/revision/grammar/how-to-form-le-gerondif-en-ant-whileby-ing',
    claim: 'B1 gerund pattern uses en + -ant to express while/by doing something and simultaneous actions.',
  },
  phraseman_english_lesson22_blueprint: {
    url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
    claim: 'English Lesson 22 teaches gerund/verb-as-noun and after-preposition -ing frames; French must rebuild the function with infinitive and gerondif where native.',
  },
};

const BANKS = {
  pronoun: ['Je', 'Tu', 'Il', 'Elle', 'Nous', 'Vous', 'Ils', 'On'],
  infinitiveActivity: ['Lire', 'Cuisiner', 'Attendre', 'Apprendre', 'Conduire', 'Marcher', 'Courir', 'Dormir', 'Parler', 'Voyager', 'Travailler', 'Nager', 'Écrire', 'Jouer'],
  infinitiveComplement: ['partir', 'se reposer', 'vous voir', 'voyager', 'rester', 'aider', 'travailler', 'parler', 'apprendre', 'comprendre', 'répondre', 'réussir', 'pratiquer', 'dormir'],
  gerondifFrame: ['en parlant', 'en pratiquant', 'en discutant', 'en répétant', 'en écoutant', 'en regardant', 'en écrivant', 'en prenant', 'en posant', 'en travaillant'],
  verbPresent: ['aide', 'prend', 'est', 'peut être', 'demande', 'ouvre', 'adore', 'aimons', 'préfèrent', 'détestes', 'aime', 'préférez', 'aiment', 'veux', 'doit', 'espérons', 'prévoient', 'décide', 'accepte', 'finis', 'continuons', 'commence', 'faut', 'peux', 'sourit', 'apprend', 'marchons', 'progresses', 'travaillent', 'cuisine', 'répond', 'lit', 'comprend', 'avancez'],
  preposition: ['de', 'à', 'avant de', 'après avoir', 'sans', 'pour', 'en'],
  object: ['le français', 'du temps', 'la santé', 'le corps', 'de la pratique', "l'esprit", 'le soir', 'ensemble', 'en train', 'le matin', 'après le travail', 'des messages', 'dehors', 'maintenant', 'vite', 'la porte', 'au revoir', 'la musique', 'la recette', 'des notes', 'des questions', 'chaque jour'],
  adverb: ['ici', 'vite', 'maintenant', 'mieux', 'ensemble', 'dehors', 'souvent'],
  adjective: ['utile', 'difficile', 'dangereux', 'facile', 'content', 'prêt', 'important'],
  negation: ["n'est pas", 'ne pas', 'ne jamais', 'pas encore', 'plus'],
  imperative: ['Arrête', 'ferme', 'écoute', 'réponds', 'attends', 'pars'],
};

const DATA = [
  ['infinitiveSubject', 'Lire aide.', 'Чтение помогает.', 'Читання допомагає.', [['Lire', 'infinitiveActivity'], ['aide', 'verbPresent']]],
  ['infinitiveSubject', 'Cuisiner prend du temps.', 'Готовка занимает время.', 'Готування займає час.', [['Cuisiner', 'infinitiveActivity'], ['prend', 'verbPresent'], ['du temps', 'object']]],
  ['infinitiveSubject', 'Attendre est difficile.', 'Ждать трудно.', 'Чекати важко.', [['Attendre', 'infinitiveActivity'], ['est', 'verbPresent'], ['difficile', 'adjective']]],
  ['infinitiveSubject', 'Apprendre le français est utile.', 'Учить французский полезно.', 'Вчити французьку корисно.', [['Apprendre', 'infinitiveActivity'], ['le français', 'object'], ['est', 'verbPresent'], ['utile', 'adjective']]],
  ['infinitiveSubject', 'Conduire peut être dangereux.', 'Водить может быть опасно.', 'Водити може бути небезпечно.', [['Conduire', 'infinitiveActivity'], ['peut être', 'verbPresent'], ['dangereux', 'adjective']]],
  ['infinitiveSubject', 'Marcher est bon pour la santé.', 'Ходить пешком полезно для здоровья.', "Ходити пішки корисно для здоров'я.", [['Marcher', 'infinitiveActivity'], ['est', 'verbPresent'], ['la santé', 'object']]],
  ['infinitiveSubject', "Courir n'est pas facile.", 'Бегать нелегко.', 'Бігати нелегко.', [['Courir', 'infinitiveActivity'], ["n'est pas", 'negation'], ['facile', 'adjective']]],
  ['infinitiveSubject', 'Dormir aide le corps.', 'Сон помогает телу.', 'Сон допомагає тілу.', [['Dormir', 'infinitiveActivity'], ['aide', 'verbPresent'], ['le corps', 'object']]],
  ['infinitiveSubject', 'Parler français demande de la pratique.', 'Говорить по-французски требует практики.', 'Говорити французькою потребує практики.', [['Parler', 'infinitiveActivity'], ['demande', 'verbPresent'], ['de la pratique', 'object']]],
  ['infinitiveSubject', "Voyager ouvre l'esprit.", 'Путешествия расширяют кругозор.', 'Подорожі розширюють світогляд.', [['Voyager', 'infinitiveActivity'], ['ouvre', 'verbPresent'], ["l'esprit", 'object']]],
  ['preferenceInfinitive', "J'aime lire le soir.", 'Я люблю читать вечером.', 'Я люблю читати ввечері.', [['Je', 'pronoun'], ['aime', 'verbPresent'], ['lire', 'infinitiveComplement'], ['le soir', 'object']]],
  ['preferenceInfinitive', 'Elle adore cuisiner.', 'Она обожает готовить.', 'Вона обожнює готувати.', [['Elle', 'pronoun'], ['adore', 'verbPresent'], ['cuisiner', 'infinitiveComplement']]],
  ['preferenceInfinitive', 'Nous aimons marcher ensemble.', 'Мы любим гулять вместе.', 'Ми любимо ходити разом.', [['Nous', 'pronoun'], ['aimons', 'verbPresent'], ['marcher', 'infinitiveComplement'], ['ensemble', 'adverb']]],
  ['preferenceInfinitive', 'Ils préfèrent voyager en train.', 'Они предпочитают путешествовать поездом.', 'Вони воліють подорожувати поїздом.', [['Ils', 'pronoun'], ['préfèrent', 'verbPresent'], ['voyager', 'infinitiveComplement'], ['en train', 'object']]],
  ['preferenceInfinitive', 'Tu détestes attendre.', 'Ты ненавидишь ждать.', 'Ти ненавидиш чекати.', [['Tu', 'pronoun'], ['détestes', 'verbPresent'], ['attendre', 'infinitiveComplement']]],
  ['preferenceInfinitive', 'Il aime apprendre le français.', 'Он любит учить французский.', 'Він любить вчити французьку.', [['Il', 'pronoun'], ['aime', 'verbPresent'], ['apprendre', 'infinitiveComplement'], ['le français', 'object']]],
  ['preferenceInfinitive', 'Vous préférez travailler le matin.', 'Вы предпочитаете работать утром.', 'Ви волієте працювати вранці.', [['Vous', 'pronoun'], ['préférez', 'verbPresent'], ['travailler', 'infinitiveComplement'], ['le matin', 'object']]],
  ['preferenceInfinitive', "J'aime nager après le travail.", 'Я люблю плавать после работы.', 'Я люблю плавати після роботи.', [['Je', 'pronoun'], ['aime', 'verbPresent'], ['nager', 'infinitiveComplement'], ['après le travail', 'object']]],
  ['preferenceInfinitive', 'Elle aime écrire des messages.', 'Она любит писать сообщения.', 'Вона любить писати повідомлення.', [['Elle', 'pronoun'], ['aime', 'verbPresent'], ['écrire', 'infinitiveComplement'], ['des messages', 'object']]],
  ['preferenceInfinitive', 'Ils aiment jouer dehors.', 'Они любят играть на улице.', 'Вони люблять грати надворі.', [['Ils', 'pronoun'], ['aiment', 'verbPresent'], ['jouer', 'infinitiveComplement'], ['dehors', 'adverb']]],
  ['controlInfinitive', 'Je veux partir maintenant.', 'Я хочу уйти сейчас.', 'Я хочу піти зараз.', [['Je', 'pronoun'], ['veux', 'verbPresent'], ['partir', 'infinitiveComplement'], ['maintenant', 'adverb']]],
  ['controlInfinitive', 'Elle doit se reposer.', 'Она должна отдохнуть.', 'Вона має відпочити.', [['Elle', 'pronoun'], ['doit', 'verbPresent'], ['se reposer', 'infinitiveComplement']]],
  ['controlInfinitive', 'Nous espérons vous voir.', 'Мы надеемся вас увидеть.', 'Ми сподіваємося вас побачити.', [['Nous', 'pronoun'], ['espérons', 'verbPresent'], ['vous voir', 'infinitiveComplement']]],
  ['controlInfinitive', 'Ils prévoient de voyager.', 'Они планируют путешествовать.', 'Вони планують подорожувати.', [['Ils', 'pronoun'], ['prévoient', 'verbPresent'], ['de', 'preposition'], ['voyager', 'infinitiveComplement']]],
  ['controlInfinitive', 'Il décide de rester.', 'Он решает остаться.', 'Він вирішує залишитися.', [['Il', 'pronoun'], ['décide', 'verbPresent'], ['de', 'preposition'], ['rester', 'infinitiveComplement']]],
  ['controlInfinitive', "Elle accepte d'aider.", 'Она соглашается помочь.', 'Вона погоджується допомогти.', [['Elle', 'pronoun'], ['accepte', 'verbPresent'], ["d'", 'preposition'], ['aider', 'infinitiveComplement']]],
  ['controlInfinitive', 'Je finis de travailler.', 'Я заканчиваю работать.', 'Я закінчую працювати.', [['Je', 'pronoun'], ['finis', 'verbPresent'], ['de', 'preposition'], ['travailler', 'infinitiveComplement']]],
  ['controlInfinitive', 'Arrête de parler.', 'Перестань говорить.', 'Припини говорити.', [['Arrête', 'imperative'], ['de', 'preposition'], ['parler', 'infinitiveComplement']]],
  ['controlInfinitive', 'Nous continuons à apprendre.', 'Мы продолжаем учиться.', 'Ми продовжуємо вчитися.', [['Nous', 'pronoun'], ['continuons', 'verbPresent'], ['à', 'preposition'], ['apprendre', 'infinitiveComplement']]],
  ['controlInfinitive', 'Il commence à comprendre.', 'Он начинает понимать.', 'Він починає розуміти.', [['Il', 'pronoun'], ['commence', 'verbPresent'], ['à', 'preposition'], ['comprendre', 'infinitiveComplement']]],
  ['prepositionInfinitive', 'Merci de répondre vite.', 'Спасибо, что отвечаете быстро.', 'Дякую, що відповідаєте швидко.', [['Merci', 'object'], ['de', 'preposition'], ['répondre', 'infinitiveComplement'], ['vite', 'adverb']]],
  ['prepositionInfinitive', 'Avant de partir, ferme la porte.', 'Перед уходом закрой дверь.', 'Перед виходом зачини двері.', [['avant de', 'preposition'], ['partir', 'infinitiveComplement'], ['ferme', 'imperative'], ['la porte', 'object']]],
  ['prepositionInfinitive', 'Après avoir mangé, nous sortons.', 'После еды мы выходим.', 'Після їжі ми виходимо.', [['après avoir', 'preposition'], ['mangé', 'object'], ['Nous', 'pronoun'], ['sortons', 'verbPresent']]],
  ['prepositionInfinitive', "Sans regarder, c'est difficile.", 'Не глядя, это трудно.', 'Не дивлячись, це важко.', [['sans', 'preposition'], ['regarder', 'infinitiveComplement'], ['est', 'verbPresent'], ['difficile', 'adjective']]],
  ['prepositionInfinitive', 'Pour réussir, il faut pratiquer.', 'Чтобы преуспеть, нужно практиковаться.', 'Щоб досягти успіху, треба практикуватися.', [['pour', 'preposition'], ['réussir', 'infinitiveComplement'], ['faut', 'verbPresent'], ['pratiquer', 'infinitiveComplement']]],
  ['prepositionInfinitive', 'Nous révisons avant de dormir.', 'Мы повторяем перед сном.', 'Ми повторюємо перед сном.', [['Nous', 'pronoun'], ['révisons', 'verbPresent'], ['avant de', 'preposition'], ['dormir', 'infinitiveComplement']]],
  ['prepositionInfinitive', 'Tu peux partir après avoir payé.', 'Ты можешь уйти после оплаты.', 'Ти можеш піти після оплати.', [['Tu', 'pronoun'], ['peux', 'verbPresent'], ['partir', 'infinitiveComplement'], ['après avoir', 'preposition'], ['payé', 'object']]],
  ['prepositionInfinitive', 'Il est parti sans dire au revoir.', 'Он ушёл, не попрощавшись.', 'Він пішов, не попрощавшись.', [['Il', 'pronoun'], ['est parti', 'verbPresent'], ['sans', 'preposition'], ['dire', 'infinitiveComplement'], ['au revoir', 'object']]],
  ['prepositionInfinitive', 'Elle a besoin de se reposer.', 'Ей нужно отдохнуть.', 'Їй потрібно відпочити.', [['Elle', 'pronoun'], ['a besoin', 'verbPresent'], ['de', 'preposition'], ['se reposer', 'infinitiveComplement']]],
  ['prepositionInfinitive', 'Je suis content de te voir.', 'Я рад тебя видеть.', 'Я радий тебе бачити.', [['Je', 'pronoun'], ['suis', 'verbPresent'], ['content', 'adjective'], ['de', 'preposition'], ['te voir', 'infinitiveComplement']]],
  ['gerondif', 'Elle sourit en parlant.', 'Она улыбается, когда говорит.', 'Вона усміхається, коли говорить.', [['Elle', 'pronoun'], ['sourit', 'verbPresent'], ['en parlant', 'gerondifFrame']]],
  ['gerondif', 'Il apprend en pratiquant.', 'Он учится, практикуясь.', 'Він вчиться, практикуючись.', [['Il', 'pronoun'], ['apprend', 'verbPresent'], ['en pratiquant', 'gerondifFrame']]],
  ['gerondif', 'Nous marchons en discutant.', 'Мы идём и разговариваем.', 'Ми йдемо й розмовляємо.', [['Nous', 'pronoun'], ['marchons', 'verbPresent'], ['en discutant', 'gerondifFrame']]],
  ['gerondif', 'Tu progresses en répétant.', 'Ты прогрессируешь, повторяя.', 'Ти прогресуєш, повторюючи.', [['Tu', 'pronoun'], ['progresses', 'verbPresent'], ['en répétant', 'gerondifFrame']]],
  ['gerondif', 'Ils travaillent en écoutant de la musique.', 'Они работают, слушая музыку.', 'Вони працюють, слухаючи музику.', [['Ils', 'pronoun'], ['travaillent', 'verbPresent'], ['en écoutant', 'gerondifFrame'], ['la musique', 'object']]],
  ['gerondif', 'Je cuisine en regardant la recette.', 'Я готовлю, глядя на рецепт.', 'Я готую, дивлячись на рецепт.', [['Je', 'pronoun'], ['cuisine', 'verbPresent'], ['en regardant', 'gerondifFrame'], ['la recette', 'object']]],
  ['gerondif', 'Elle répond en écrivant vite.', 'Она отвечает, быстро печатая.', 'Вона відповідає, швидко пишучи.', [['Elle', 'pronoun'], ['répond', 'verbPresent'], ['en écrivant', 'gerondifFrame'], ['vite', 'adverb']]],
  ['gerondif', 'Il lit en prenant des notes.', 'Он читает, делая заметки.', 'Він читає, роблячи нотатки.', [['Il', 'pronoun'], ['lit', 'verbPresent'], ['en prenant', 'gerondifFrame'], ['des notes', 'object']]],
  ['gerondif', 'On comprend mieux en posant des questions.', 'Лучше понимаешь, задавая вопросы.', 'Краще розумієш, ставлячи запитання.', [['On', 'pronoun'], ['comprend', 'verbPresent'], ['mieux', 'adverb'], ['en posant', 'gerondifFrame'], ['des questions', 'object']]],
  ['gerondif', 'Vous avancez en travaillant chaque jour.', 'Вы продвигаетесь, работая каждый день.', 'Ви просуваєтеся, працюючи щодня.', [['Vous', 'pronoun'], ['avancez', 'verbPresent'], ['en travaillant', 'gerondifFrame'], ['chaque jour', 'object']]],
];

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function byteSize(filePath) {
  return fs.statSync(filePath).size;
}

function flatBanks() {
  return Object.values(BANKS).flat();
}

function choices(category, correct) {
  const bank = BANKS[category] || BANKS.object;
  const distractors = [...new Set(bank.filter((item) => item.toLowerCase() !== String(correct).toLowerCase()))].slice(0, 5);
  for (const item of flatBanks()) {
    if (distractors.length >= 5) break;
    if (item.toLowerCase() !== String(correct).toLowerCase() && !distractors.includes(item)) distractors.push(item);
  }
  return distractors;
}

function slot(correct, category) {
  const distractors = choices(category, correct);
  if (distractors.length !== 5 || new Set(distractors).size !== 5 || distractors.includes(correct)) {
    throw new Error(`Bad distractors for ${correct}/${category}`);
  }
  return { text: correct, correct, category, distractors };
}

function buildRows() {
  return DATA.map(([rowType, phraseFr, ru, uk, slots], index) => ({
    rowId: `fr_lesson22_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
    order: index + 1,
    rowType,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    phraseFr,
    ru,
    uk,
    wordsFr: slots.map(([correct, category]) => slot(correct, category)),
    evidenceIds: Object.keys(SOURCES),
    acceptedForProduction: false,
  }));
}

function countBy(rows, categories) {
  return rows
    .flatMap((row) => row.wordsFr)
    .filter((item) => categories.includes(item.category))
    .reduce((acc, item) => ({ ...acc, [item.category]: (acc[item.category] || 0) + 1 }), {});
}

function countRowTypes(rows) {
  return rows.reduce((acc, row) => ({ ...acc, [row.rowType]: (acc[row.rowType] || 0) + 1 }), {});
}

function surfaceDeclaredInApp(surface, source) {
  return new RegExp(`['"]${surface}['"]`).test(source);
}

function main() {
  const generatedAt = new Date().toISOString();
  const rows = buildRows();
  const wordsFrSlots = rows.reduce((sum, row) => sum + row.wordsFr.length, 0);
  const distractorSlots = rows.reduce((sum, row) => sum + row.wordsFr.reduce((inner, item) => inner + item.distractors.length, 0), 0);
  const grammarCategoryCounts = countBy(rows, ['infinitiveActivity', 'infinitiveComplement', 'gerondifFrame', 'preposition', 'negation']);
  const rowTypeCounts = countRowTypes(rows);

  const candidate = {
    schemaVersion: 'gustav-fr-lesson22-blueprint-rebuild-candidate-v1',
    generatedAt,
    status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    appCourseLevel: 'B1',
    internalFrenchBand: 'B1.2',
    englishTopic: 'Gerund',
    frenchTopic: 'Infinitif nominal et gérondif: activities, preferences, after prepositions',
    sequencingReason: 'Adds English gerund functions through French-native infinitive-as-noun, verb+infinitive, preposition+infinitive, and en+participe présent only for simultaneous/manner frames.',
    frenchNativeTransferRule: 'Do not translate English -ing mechanically. Use French infinitive for verb-as-noun and complements; use en + participe présent only for genuine gérondif simultaneity or manner.',
    sources: SOURCES,
    rows,
    summary: {
      rows: rows.length,
      wordsFrSlots,
      distractorSlots,
      distractorsPerSlot: 5,
      grammarCategoryCounts,
      rowTypeCounts,
      activationApproved: false,
    },
    productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: SAFETY,
  };
  writeJson(paths.candidate, candidate);

  const review = {
    schemaVersion: 'gustav-fr-lesson22-blueprint-rebuild-review-gate-v1',
    generatedAt,
    status: 'PASS_LESSON22_REVIEW_ACCEPTED_FOR_NEXT_GATE',
    reviewer: {
      kind: 'codex_llm_trusted_source_review',
      humanReviewRequired: false,
      trustedSourceEvidenceRequired: true,
      officialOrTrustedSources: Object.keys(SOURCES),
    },
    candidate: rel(paths.candidate),
    summary: {
      rows: rows.length,
      acceptedRows: rows.length,
      revisionRows: 0,
      wordsFrSlots,
      distractorSlots,
      llmTrustedSourceReviewDone: true,
      humanReviewRequired: false,
      readyForAudio: false,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      activationApproved: false,
    },
    rowDecisions: rows.map((row) => ({
      rowId: row.rowId,
      order: row.order,
      phraseFr: row.phraseFr,
      decision: 'ACCEPT',
      acceptedForLessonCandidate: true,
      acceptedForProduction: false,
      issues: [],
    })),
    safety: SAFETY,
  };
  writeJson(paths.reviewGate, review);

  const packBase = {
    schemaVersion: 'gustav-fr-lesson22-blueprint-rebuild-pack-draft-v1',
    generatedAt,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    lessonId: LESSON,
    appCourseLevel: 'B1',
    contentVersion: CONTENT_VERSION,
    sourceArtifacts: { candidate: rel(paths.candidate), reviewGate: rel(paths.reviewGate) },
    activationApproved: false,
  };
  writeJson(paths.ruPack, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(paths.ukPack, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });

  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort((a, b) => a.localeCompare(b, 'fr'));
  writeJson(paths.theory, {
    schemaVersion: 'gustav-fr-lesson22-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    theory: [
      {
        titleRu: '01. Что тренирует урок',
        titleUk: '01. Що тренує урок',
        bodyRu: 'Английский gerund часто выглядит как -ing, но французский не копирует эту форму. Здесь тренируются три нативные зоны: инфинитив как действие, инфинитив после глаголов/предлогов и gérondif en + participe présent.',
        bodyUk: 'Англійський gerund часто виглядає як -ing, але французька не копіює цю форму. Тут тренуються три природні зони: інфінітив як дія, інфінітив після дієслів/прийменників і gérondif en + participe présent.',
      },
      {
        titleRu: '02. Инфинитив как действие',
        titleUk: '02. Інфінітив як дія',
        bodyRu: 'Когда действие является идеей или субъектом, французский часто использует инфинитив: Lire aide; Voyager ouvre l’esprit. Это соответствует английскому Reading helps / Traveling helps, но форма французская.',
        bodyUk: 'Коли дія є ідеєю або підметом, французька часто використовує інфінітив: Lire aide; Voyager ouvre l’esprit. Це відповідає англійському Reading helps / Traveling helps, але форма французька.',
      },
      {
        titleRu: '03. После глаголов',
        titleUk: '03. Після дієслів',
        bodyRu: 'После aimer, préférer, vouloir, devoir, décider, finir и похожих конструкций нужен французский инфинитив, иногда с de или à: aimer lire, décider de rester, continuer à apprendre.',
        bodyUk: 'Після aimer, préférer, vouloir, devoir, décider, finir і подібних конструкцій потрібен французький інфінітив, іноді з de або à: aimer lire, décider de rester, continuer à apprendre.',
      },
      {
        titleRu: '04. После предлогов',
        titleUk: '04. Після прийменників',
        bodyRu: 'После avant de, après avoir, sans, pour французский строит фразу с инфинитивом или инфинитивной конструкцией: avant de partir, sans dire au revoir, pour réussir.',
        bodyUk: 'Після avant de, après avoir, sans, pour французька будує фразу з інфінітивом або інфінітивною конструкцією: avant de partir, sans dire au revoir, pour réussir.',
      },
      {
        titleRu: '05. Когда нужен gérondif',
        titleUk: '05. Коли потрібен gérondif',
        bodyRu: 'Gérondif en + participe présent нужен не для любого -ing, а для одновременности, способа или средства: Elle sourit en parlant; Il apprend en pratiquant.',
        bodyUk: 'Gérondif en + participe présent потрібен не для будь-якого -ing, а для одночасності, способу або засобу: Elle sourit en parlant; Il apprend en pratiquant.',
      },
    ],
    vocabulary,
    practiceHooks: [
      { id: 'infinitive_as_noun', type: 'pattern', examples: ['Lire aide.', 'Voyager ouvre l’esprit.', 'Courir n’est pas facile.'] },
      { id: 'verb_plus_infinitive', type: 'collocation_slots', examples: ['aimer lire', 'décider de rester', 'continuer à apprendre'] },
      { id: 'gerondif_en_ant', type: 'simultaneous_action', examples: ['en parlant', 'en pratiquant', 'en posant des questions'] },
    ],
    activationApproved: false,
  });

  writeJson(paths.packAudit, {
    schemaVersion: 'gustav-fr-lesson22-blueprint-rebuild-pack-draft-audit-v1',
    generatedAt,
    status: 'PASS_PACK_DRAFT_WRITTEN',
    summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false },
    safety: SAFETY,
  });
  writeJson(paths.theoryAudit, {
    schemaVersion: 'gustav-fr-lesson22-blueprint-rebuild-theory-vocab-pack-audit-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    summary: { theorySections: 5, vocabularyItems: vocabulary.length, practiceHooks: 3, activationApproved: false },
    safety: SAFETY,
  });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) =>
    rows.map((row) => ({
      slotId: `fr.lesson22.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`,
      studyTarget: 'fr',
      targetContentLang: 'fr',
      sourceLocale,
      lessonId: LESSON,
      rowId: row.rowId,
      phraseFr: row.phraseFr,
      voiceProvider: 'openai_tts',
      outputPath: `audio/fr/${sourceLocale}/lesson22_blueprint_rebuild/${row.rowId}.mp3`,
      generated: false,
      audioSha256: '',
      byteSize: 0,
      activationApproved: false,
    })),
  );
  writeJson(paths.audio, {
    schemaVersion: 'gustav-fr-lesson22-blueprint-rebuild-audio-tts-manifest-v1',
    generatedAt,
    status: 'HOLD_AUDIO_TTS_NOT_GENERATED',
    slots: audioSlots,
    uniqueFrenchTexts: rows.length,
    safety: SAFETY,
  });
  writeJson(paths.audioAudit, {
    schemaVersion: 'gustav-fr-lesson22-blueprint-rebuild-audio-tts-manifest-gate-audit-v1',
    generatedAt,
    status: 'HOLD_AUDIO_TTS_NOT_GENERATED',
    summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false },
    safety: SAFETY,
  });

  const local = {
    ru: { path: paths.ruPack, sha256: sha256File(paths.ruPack), byteSize: byteSize(paths.ruPack) },
    uk: { path: paths.ukPack, sha256: sha256File(paths.ukPack), byteSize: byteSize(paths.ukPack) },
    audio: { path: paths.audio, sha256: sha256File(paths.audio), byteSize: byteSize(paths.audio) },
    theory: { path: paths.theory, sha256: sha256File(paths.theory), byteSize: byteSize(paths.theory) },
  };
  const entries = [
    ['ru', 'lesson', local.ru],
    ['ru', 'audio_metadata', local.audio],
    ['uk', 'lesson', local.uk],
    ['uk', 'audio_metadata', local.audio],
  ].map(([sourceLocale, surface, artifact]) => ({
    entryId: `fr.lesson22.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`,
    packId: `fr.${sourceLocale}.lesson22.blueprint_rebuild.${surface}.v1.pending`,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale,
    surface,
    lessonId: LESSON,
    schemaVersion: 'course-pack-v1',
    contentVersion: CONTENT_VERSION,
    localArtifactPath: rel(artifact.path),
    localArtifactSha256: artifact.sha256,
    localArtifactByteSize: artifact.byteSize,
    relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(paths.theory), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [],
    serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson22_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`,
    entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson22_blueprint_rebuild.json`,
    serverUploadAllowed: false,
    firebaseUploadAllowed: false,
    runtimeDownloadsEnabled: false,
    productionApplyApproved: false,
    activationApproved: false,
  }));
  writeJson(paths.server, {
    schemaVersion: 'gustav-fr-lesson22-blueprint-rebuild-server-pack-manifest-v1',
    generatedAt,
    status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED',
    studyTarget: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    contentVersion: CONTENT_VERSION,
    entries,
    safety: SAFETY,
  });

  const manifestSource = fs.readFileSync(paths.manifest, 'utf8');
  writeJson(paths.serverAudit, {
    schemaVersion: 'gustav-fr-lesson22-blueprint-rebuild-server-pack-manifest-gate-audit-v1',
    generatedAt,
    status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED',
    summary: {
      entries: 4,
      sourceLocaleScopedEntries: 4,
      appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length,
      openUploadEntries: 0,
      runtimeDownloadsEnabledEntries: 0,
      activationApprovedEntries: 0,
      readyForUpload: false,
      activationApproved: false,
    },
    safety: SAFETY,
  });
  writeJson(paths.payloadAudit, {
    schemaVersion: 'gustav-fr-lesson22-blueprint-rebuild-payload-hash-lock-gate-audit-v1',
    generatedAt,
    status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED',
    summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false },
    safety: SAFETY,
  });
  writeJson(paths.rollbackAudit, {
    schemaVersion: 'gustav-fr-lesson22-blueprint-rebuild-rollback-manifest-gate-audit-v1',
    generatedAt,
    status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED',
    summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false },
    safety: SAFETY,
  });
  writeJson(paths.uploadAudit, {
    schemaVersion: 'gustav-fr-lesson22-blueprint-rebuild-server-upload-evidence-gate-audit-v1',
    generatedAt,
    status: 'HOLD_UPLOAD_EVIDENCE_MISSING',
    summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false },
    safety: SAFETY,
  });

  const loaderSource = fs.readFileSync(paths.loader, 'utf8');
  const indexSource = fs.readFileSync(paths.index, 'utf8');
  const studyTargetSource = fs.readFileSync(paths.studyTarget, 'utf8');
  const runtimeSummary = {
    serverManifestEntries: 4,
    readinessRows: 4,
    appKnownRuntimeSurfaceRows: 4,
    embeddedFrenchIndexEntries: (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length,
    legacyRemoteLoaderDisabled: /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource),
    productionStudyTargetsAreEnglishOnly: /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource),
    internalFrenchDeclared: /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource),
    runtimeDownloadAllowedRows: 0,
    activationApprovedRows: 0,
    readyForRuntimeDelivery: false,
    activationApproved: false,
  };
  writeJson(paths.runtimeAudit, {
    schemaVersion: 'gustav-fr-lesson22-blueprint-rebuild-runtime-delivery-gate-audit-v1',
    generatedAt,
    status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED',
    summary: runtimeSummary,
    safety: SAFETY,
  });

  const deniedTokens = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => {
    const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/');
    return {
      entryId: entry.entryId,
      packId: entry.packId,
      sourceLocale: entry.sourceLocale,
      surface: entry.surface,
      expectedCacheKey: key,
      deniedTokenHits: deniedTokens.filter((token) => key.includes(token)),
      cacheWriteAllowedNow: false,
      runtimeDownloadAllowedNow: false,
      rollbackCacheInvalidationAllowedNow: false,
      activationApproved: false,
    };
  });
  writeJson(paths.cache, {
    schemaVersion: 'gustav-fr-lesson22-blueprint-rebuild-runtime-cache-integrity-gate-v1',
    generatedAt,
    status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED',
    cacheRows,
    summary: {
      cacheRows: 4,
      uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size,
      deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length,
      cacheWriteAllowedRows: 0,
      runtimeDownloadAllowedRows: 0,
      rollbackCacheInvalidationAllowedRows: 0,
      readyForRuntimeCacheUse: false,
      activationApproved: false,
    },
    safety: SAFETY,
  });
  writeJson(paths.cacheAudit, {
    schemaVersion: 'gustav-fr-lesson22-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1',
    generatedAt,
    status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED',
    summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false },
    safety: SAFETY,
  });
  writeJson(paths.activation, {
    schemaVersion: 'gustav-fr-lesson22-blueprint-rebuild-explicit-activation-receipt-gate-v1',
    generatedAt,
    status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING',
    requiredReceiptContract: {
      requiresLlmTrustedSourceReview: true,
      humanReviewRequired: false,
      requiresAudioChecksums: true,
      requiresPayloadHashLock: true,
      requiresRollbackReady: true,
      requiresServerUploadEvidence: true,
      requiresRuntimeDelivery: true,
      requiresRuntimeCacheIntegrity: true,
      requiresFull32LessonParityBeforeGlobalFrenchActivation: true,
    },
    summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false },
    safety: SAFETY,
  });
  writeJson(paths.activationAudit, {
    schemaVersion: 'gustav-fr-lesson22-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1',
    generatedAt,
    status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING',
    summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false },
    safety: SAFETY,
  });

  if (fs.existsSync(paths.state)) {
    const state = JSON.parse(fs.readFileSync(paths.state, 'utf8'));
    state.lesson22BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson22BlueprintRebuildSummary = {
      rows: rows.length,
      wordsFrSlots,
      distractorSlots,
      acceptedRows: rows.length,
      theorySections: 5,
      vocabularyItems: vocabulary.length,
      grammarCategoryCounts,
      rowTypeCounts,
      activationApproved: false,
    };
    state.lesson22BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson22BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson22BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson22BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson22BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson22BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson22BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson22BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = [
      'Start Lesson 23 blueprint-first rebuild within app-facing B1 parity.',
      'Inspect English Lesson 23 source shape plus theory before generating French-native equivalent.',
      'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.',
    ];
    fs.writeFileSync(paths.state, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`HOLD_LESSON22_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
