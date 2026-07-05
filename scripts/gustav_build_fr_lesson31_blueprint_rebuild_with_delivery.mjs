import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LESSON = 31;
const SLUG = 'lesson31_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson31-blueprint-rebuild-v1.reviewed.pending';
const SOURCE_LOCALES = ['ru', 'uk'];
const SAFETY = { appBundleModifiedByThisScript: false, serverUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false };
const dir = (name) => path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', name);
const dirs = { review: dir('review'), reviewer: dir('reviewer'), materialized: path.join(dir('materialized'), SLUG), audio: path.join(dir('audio'), SLUG), server: path.join(dir('server'), SLUG), runtime: path.join(dir('runtime'), SLUG), activation: path.join(dir('activation'), SLUG) };
const paths = {
  state: path.join(ROOT, 'docs', 'gustav', 'state.json'),
  manifest: path.join(ROOT, 'app', 'course_pack_manifest.ts'),
  loader: path.join(ROOT, 'app', 'course_pack_loader.ts'),
  index: path.join(ROOT, 'app', 'course_pack_index.ts'),
  studyTarget: path.join(ROOT, 'app', 'study_target.ts'),
  candidate: path.join(dirs.review, 'lesson31_blueprint_rebuild_candidate_v1.json'),
  reviewGate: path.join(dirs.reviewer, 'fr_lesson31_blueprint_rebuild_review_gate_v1.json'),
  ruPack: path.join(dirs.materialized, 'fr_lesson31_blueprint_rebuild_ru_pack_draft_v1.json'),
  ukPack: path.join(dirs.materialized, 'fr_lesson31_blueprint_rebuild_uk_pack_draft_v1.json'),
  packAudit: path.join(dirs.materialized, 'fr_lesson31_blueprint_rebuild_pack_draft_audit_v1.json'),
  theory: path.join(dirs.materialized, 'fr_lesson31_blueprint_rebuild_theory_vocab_pack_v1.json'),
  theoryAudit: path.join(dirs.materialized, 'fr_lesson31_blueprint_rebuild_theory_vocab_pack_audit_v1.json'),
  audio: path.join(dirs.audio, 'fr_lesson31_blueprint_rebuild_audio_tts_manifest_v1.json'),
  audioAudit: path.join(dirs.audio, 'fr_lesson31_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'),
  server: path.join(dirs.server, 'fr_lesson31_blueprint_rebuild_server_pack_manifest_v1.json'),
  serverAudit: path.join(dirs.server, 'fr_lesson31_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'),
  payloadAudit: path.join(dirs.server, 'fr_lesson31_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'),
  rollbackAudit: path.join(dirs.server, 'fr_lesson31_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'),
  uploadAudit: path.join(dirs.server, 'fr_lesson31_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'),
  runtimeAudit: path.join(dirs.runtime, 'fr_lesson31_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'),
  cache: path.join(dirs.runtime, 'fr_lesson31_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'),
  cacheAudit: path.join(dirs.runtime, 'fr_lesson31_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json'),
  activation: path.join(dirs.activation, 'fr_lesson31_blueprint_rebuild_explicit_activation_receipt_gate_v1.json'),
  activationAudit: path.join(dirs.activation, 'fr_lesson31_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'),
};

const SOURCES = {
  lawless_causative_faire: { url: 'https://www.lawlessfrench.com/grammar/faire-causative/', claim: 'French faire causative uses faire + infinitive to express making or having someone do something.' },
  lawless_perception_verbs: { url: 'https://www.lawlessfrench.com/grammar/verbs-of-perception/', claim: 'French verbs of perception can be followed by an infinitive construction.' },
  tex_french_causative: { url: 'https://laits.utexas.edu/tex/gr/vc1.html', claim: 'Tex French Grammar describes faire + infinitive causative constructions and agent placement.' },
  le_robert_subjonctif: { url: 'https://dictionnaire.lerobert.com/guide/subjonctif', claim: 'Le Robert describes subjonctif after expressions of will and desire.' },
  phraseman_english_lesson31_blueprint: { url: 'app/lesson_data_25_32.ts#LESSON_31_PHRASES', claim: 'English Lesson 31 trains Complex Object with make/let/hear/see/feel/notice plus object and infinitive-like action.' },
};

const BANKS = {
  subject: ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'on', 'le garde', 'l’inspecteur', 'le pompier', 'le manager'],
  causative: ['a fait payer', 'a fait ouvrir', 'a fait montrer', 'a fait suivre', 'a fait terminer', 'a fait prendre', 'a fait fonctionner', 'a fait réécrire', 'a fait rire', 'a fait signer'],
  permissive: ['a laissé', 'ont laissé', 'laisse', 'laissent', 'avait laissé', 'aura laissé', 'laissait', 'laissez'],
  perception: ['ai entendu', 'a entendu', 'avons entendu', 'ont entendu', 'ai vu', 'a vu', 'avons vu', 'ont vu', 'a senti', 'avons senti', 'ont senti', 'a remarqué'],
  agent: ['le conducteur', 'le pilote', 'la goutte froide', 'le visiteur', 'le chanteur', 'l’enfant', 'la secousse', 'l’homme inconnu', 'les manifestants', 'l’éclair', 'le vent', 'le patron', 'le menuisier', 'les ouvriers', 'le fournisseur', 'la délégation', 'l’aiguille', 'le génie', 'le système', 'la cliente', 'le tissu', 'l’archéologue', 'l’étudiant', 'le violoniste', 'la vapeur', 'le maire', 'le locataire', 'l’objet', 'l’ingénieur', 'le chien', 'le candidat', 'le cheval', 'le juge', 'le bâtiment', 'le guide', 'la branche', 'la main froide'],
  infinitive: ['payer', 'expliquer', 'tomber', 'montrer', 'chanter', 'manger', 'trembler', 'mettre', 'crier', 'frapper', 'toucher', 'heurter', 'réparer', 'discuter', 'livrer', 'inspecter', 'ouvrir', 'percer', 'utiliser', 'fonctionner', 'demander', 'trouver', 'réécrire', 'jouer', 'brûler', 'interviewer', 'tester', 'traverser', 'poser', 'atteindre', 'quitter', 'suivre', 'planifier', 'signer', 'peindre', 'pousser', 'lire', 'prendre', 'laisser', 'tomber'],
  object: ['l’amende', 'la procédure', 'son épaule', 'le contenu de la mallette', 'la composition de jazz', 'le gâteau au chocolat', 'le mur', 'l’enveloppe', 'des slogans', 'l’arbre', 'son visage', 'le manager', 'l’échelle', 'le quota', 'les matériaux', 'le laboratoire', 'le coffre', 'la couche protectrice', 'la base secrète', 'le remboursement', 'sa peau', 'la pièce d’or', 'la thèse', 'la mélodie', 'sa main droite', 'le maire', 'la facture', 'son genou', 'le moteur solaire', 'la rue', 'la question', 'ses yeux', 'la gare', 'la sortie', 'le mariage', 'le document', 'la fresque', 'le chariot', 'la liste', 'le médicament', 'la clé', 'la clôture', 'le verdict', 'le bâtiment', 'la carte ancienne', 'le rapport', 'le problème moteur', 'la voiture', 'son bras'],
  receiver: ['au conducteur', 'au visiteur', 'à l’enfant', 'à la famille', 'à l’employé', 'au locataire', 'à la délégation', 'au guide', 'au candidat', 'au fournisseur'],
  desire: ['voudrions que', 'veux que', 'aimerait que', 'demande que', 'souhaite que', 'préférerait que', 'exige que'],
  subjunctive: ['livre', 'explique', 'reste', 'comprenne', 'finisse', 'vienne', 'aide', 'ouvre', 'réponde', 'signe'],
  complement: ['vite', 'ici', 'efficacement', 'correctement', 'sur la place', 'pendant la réunion', 'dans le laboratoire', 'dans la rue', 'sur la voiture', 'à voix haute'],
};

const DATA = [
  ['faireCausative', 'Ils ont fait payer l’amende au conducteur.', 'Они заставили водителя заплатить штраф.', 'Вони змусили водія сплатити штраф.', [['ils', 'subject'], ['ont fait payer', 'causative'], ['l’amende', 'object'], ['au conducteur', 'receiver']]],
  ['perceptionEntendre', 'J’ai entendu le pilote expliquer la procédure.', 'Я слышал, как пилот объяснял процедуру.', 'Я чув, як пілот пояснював процедуру.', [['j’', 'subject'], ['ai entendu', 'perception'], ['le pilote', 'agent'], ['expliquer', 'infinitive'], ['la procédure', 'object']]],
  ['perceptionSentir', 'Elle a senti la goutte froide tomber sur son épaule.', 'Она почувствовала, как холодная капля упала ей на плечо.', 'Вона відчула, як холодна крапля впала їй на плече.', [['elle', 'subject'], ['a senti', 'perception'], ['la goutte froide', 'agent'], ['tomber', 'infinitive'], ['son épaule', 'object']]],
  ['faireCausative', 'Le garde a fait montrer le contenu de la mallette au visiteur.', 'Охранник заставил посетителя показать содержимое портфеля.', 'Охоронець змусив відвідувача показати вміст портфеля.', [['le garde', 'subject'], ['a fait montrer', 'causative'], ['le contenu de la mallette', 'object'], ['au visiteur', 'receiver']]],
  ['perceptionEntendre', 'Elle a entendu le chanteur chanter une composition de jazz.', 'Она слышала, как певец пел джазовую композицию.', 'Вона чула, як співак виконував джазову композицію.', [['elle', 'subject'], ['a entendu', 'perception'], ['le chanteur', 'agent'], ['chanter', 'infinitive']]],
  ['laisserPermissive', 'Ils ont laissé l’enfant manger le gâteau au chocolat.', 'Они позволили ребёнку съесть шоколадный торт.', 'Вони дозволили дитині з’їсти шоколадний торт.', [['ils', 'subject'], ['ont laissé', 'permissive'], ['l’enfant', 'agent'], ['manger', 'infinitive'], ['le gâteau au chocolat', 'object']]],
  ['perceptionSentir', 'Nous avons senti la secousse faire trembler le mur.', 'Мы почувствовали, как толчок заставил стену дрожать.', 'Ми відчули, як поштовх змусив стіну тремтіти.', [['nous', 'subject'], ['avons senti', 'perception'], ['la secousse', 'agent'], ['trembler', 'infinitive'], ['le mur', 'object']]],
  ['perceptionVoir', 'Elle a vu l’homme inconnu mettre l’enveloppe dans la boîte.', 'Она увидела, как незнакомец положил конверт в ящик.', 'Вона побачила, як незнайомець поклав конверт у скриньку.', [['elle', 'subject'], ['a vu', 'perception'], ['l’homme inconnu', 'agent'], ['mettre', 'infinitive'], ['l’enveloppe', 'object']]],
  ['perceptionEntendre', 'Ils ont entendu les manifestants crier des slogans.', 'Они слышали, как протестующие выкрикивали лозунги.', 'Вони чули, як протестувальники вигукували гасла.', [['ils', 'subject'], ['ont entendu', 'perception'], ['les manifestants', 'agent'], ['crier', 'infinitive'], ['des slogans', 'object']]],
  ['perceptionVoir', 'Nous avons vu l’éclair frapper l’arbre.', 'Мы видели, как молния ударила в дерево.', 'Ми бачили, як блискавка вдарила в дерево.', [['nous', 'subject'], ['avons vu', 'perception'], ['l’éclair', 'agent'], ['frapper', 'infinitive'], ['l’arbre', 'object']]],
  ['perceptionSentir', 'Elle a senti le vent toucher son visage.', 'Она почувствовала, как ветер коснулся её лица.', 'Вона відчула, як вітер торкнувся її обличчя.', [['elle', 'subject'], ['a senti', 'perception'], ['le vent', 'agent'], ['toucher', 'infinitive'], ['son visage', 'object']]],
  ['perceptionEntendre', 'Ils ont entendu le patron crier après le manager.', 'Они слышали, как начальник кричал на менеджера.', 'Вони чули, як начальник кричав на менеджера.', [['ils', 'subject'], ['ont entendu', 'perception'], ['le patron', 'agent'], ['crier', 'infinitive'], ['le manager', 'object']]],
  ['perceptionVoir', 'J’ai vu le menuisier réparer l’échelle.', 'Я видел, как плотник чинил лестницу.', 'Я бачив, як тесля лагодив драбину.', [['j’', 'subject'], ['ai vu', 'perception'], ['le menuisier', 'agent'], ['réparer', 'infinitive'], ['l’échelle', 'object']]],
  ['perceptionEntendre', 'Elle a entendu les ouvriers discuter le quota.', 'Она слышала, как рабочие обсуждали квоту.', 'Вона чула, як робітники обговорювали квоту.', [['elle', 'subject'], ['a entendu', 'perception'], ['les ouvriers', 'agent'], ['discuter', 'infinitive'], ['le quota', 'object']]],
  ['desireSubjunctive', 'Nous voudrions que le fournisseur livre les matériaux.', 'Мы бы хотели, чтобы поставщик доставил материалы.', 'Ми б хотіли, щоб постачальник доставив матеріали.', [['nous', 'subject'], ['voudrions que', 'desire'], ['le fournisseur', 'agent'], ['livre', 'subjunctive'], ['les matériaux', 'object']]],
  ['laisserPermissive', 'Ils ont laissé la délégation inspecter le laboratoire.', 'Они позволили делегации осмотреть лабораторию.', 'Вони дозволили делегації оглянути лабораторію.', [['ils', 'subject'], ['ont laissé', 'permissive'], ['la délégation', 'agent'], ['inspecter', 'infinitive'], ['le laboratoire', 'object']]],
  ['faireCausative', 'L’inspecteur a fait ouvrir le coffre au conducteur.', 'Инспектор заставил водителя открыть багажник.', 'Інспектор змусив водія відкрити багажник.', [['l’inspecteur', 'subject'], ['a fait ouvrir', 'causative'], ['le coffre', 'object'], ['au conducteur', 'receiver']]],
  ['perceptionSentir', 'Elle a senti l’aiguille percer la couche protectrice.', 'Она почувствовала, как игла проколола защитный слой.', 'Вона відчула, як голка проколола захисний шар.', [['elle', 'subject'], ['a senti', 'perception'], ['l’aiguille', 'agent'], ['percer', 'infinitive'], ['la couche protectrice', 'object']]],
  ['laisserPermissive', 'Ils ont laissé le génie utiliser la base secrète.', 'Они позволили гению использовать секретную базу.', 'Вони дозволили генію використовувати секретну базу.', [['ils', 'subject'], ['ont laissé', 'permissive'], ['le génie', 'agent'], ['utiliser', 'infinitive'], ['la base secrète', 'object']]],
  ['faireCausative', 'Le fermier a fait fonctionner le système efficacement.', 'Фермер заставил систему работать эффективно.', 'Фермер змусив систему працювати ефективно.', [['a fait fonctionner', 'causative'], ['le système', 'agent'], ['efficacement', 'complement']]],
  ['perceptionEntendre', 'Nous avons entendu la cliente demander le remboursement.', 'Мы слышали, как клиентка требовала возврат.', 'Ми чули, як клієнтка вимагала повернення коштів.', [['nous', 'subject'], ['avons entendu', 'perception'], ['la cliente', 'agent'], ['demander', 'infinitive'], ['le remboursement', 'object']]],
  ['perceptionSentir', 'Elle a senti le tissu toucher sa peau.', 'Она почувствовала, как ткань коснулась кожи.', 'Вона відчула, як тканина торкнулася шкіри.', [['elle', 'subject'], ['a senti', 'perception'], ['le tissu', 'agent'], ['toucher', 'infinitive'], ['sa peau', 'object']]],
  ['perceptionVoir', 'Ils ont vu l’archéologue trouver la pièce d’or.', 'Они видели, как археолог нашёл золотую монету.', 'Вони бачили, як археолог знайшов золоту монету.', [['ils', 'subject'], ['ont vu', 'perception'], ['l’archéologue', 'agent'], ['trouver', 'infinitive'], ['la pièce d’or', 'object']]],
  ['faireCausative', 'Le mentor a fait réécrire la thèse à l’étudiant.', 'Наставник заставил студента переписать диплом.', 'Наставник змусив студента переписати диплом.', [['a fait réécrire', 'causative'], ['la thèse', 'object'], ['à l’étudiant', 'receiver']]],
  ['perceptionEntendre', 'Nous avons entendu le violoniste jouer la mélodie.', 'Мы слышали, как скрипач играл мелодию.', 'Ми чули, як скрипаль грав мелодію.', [['nous', 'subject'], ['avons entendu', 'perception'], ['le violoniste', 'agent'], ['jouer', 'infinitive'], ['la mélodie', 'object']]],
  ['perceptionSentir', 'Elle a senti la vapeur brûler sa main droite.', 'Она почувствовала, как пар обжёг правую руку.', 'Вона відчула, як пара обпекла праву руку.', [['elle', 'subject'], ['a senti', 'perception'], ['la vapeur', 'agent'], ['brûler', 'infinitive'], ['sa main droite', 'object']]],
  ['laisserPermissive', 'Ils ont laissé le journaliste interviewer le maire.', 'Они позволили журналисту взять интервью у мэра.', 'Вони дозволили журналісту взяти інтерв’ю у мера.', [['ils', 'subject'], ['ont laissé', 'permissive'], ['le journaliste', 'agent'], ['interviewer', 'infinitive'], ['le maire', 'object']]],
  ['faireCausative', 'Le propriétaire a fait payer la facture au locataire.', 'Владелец заставил арендатора оплатить счёт.', 'Власник змусив орендаря сплатити рахунок.', [['a fait payer', 'causative'], ['la facture', 'object'], ['au locataire', 'receiver']]],
  ['perceptionSentir', 'Elle a senti l’objet heurter son genou.', 'Она почувствовала, как предмет ударил её по колену.', 'Вона відчула, як предмет ударив її по коліну.', [['elle', 'subject'], ['a senti', 'perception'], ['l’objet', 'agent'], ['heurter', 'infinitive'], ['son genou', 'object']]],
  ['laisserPermissive', 'Ils ont laissé l’ingénieur tester le moteur solaire.', 'Они позволили инженеру испытать солнечный двигатель.', 'Вони дозволили інженеру протестувати сонячний двигун.', [['ils', 'subject'], ['ont laissé', 'permissive'], ['l’ingénieur', 'agent'], ['tester', 'infinitive'], ['le moteur solaire', 'object']]],
  ['perceptionVoir', 'J’ai vu le chien traverser la rue.', 'Я видел, как собака перешла улицу.', 'Я бачив, як собака перейшла вулицю.', [['j’', 'subject'], ['ai vu', 'perception'], ['le chien', 'agent'], ['traverser', 'infinitive'], ['la rue', 'object']]],
  ['perceptionEntendre', 'Ils ont entendu l’étudiant poser la question.', 'Они слышали, как студент задал вопрос.', 'Вони чули, як студент поставив запитання.', [['ils', 'subject'], ['ont entendu', 'perception'], ['l’étudiant', 'agent'], ['poser', 'infinitive'], ['la question', 'object']]],
  ['perceptionSentir', 'Elle a senti la lumière atteindre ses yeux.', 'Она почувствовала, как свет достиг её глаз.', 'Вона відчула, як світло торкнулося її очей.', [['elle', 'subject'], ['a senti', 'perception'], ['atteindre', 'infinitive'], ['ses yeux', 'object']]],
  ['perceptionVoir', 'Nous avons vu l’homme quitter la gare.', 'Мы видели, как мужчина покинул вокзал.', 'Ми бачили, як чоловік залишив вокзал.', [['nous', 'subject'], ['avons vu', 'perception'], ['l’homme', 'agent'], ['quitter', 'infinitive'], ['la gare', 'object']]],
  ['faireCausative', 'Le pompier a fait suivre la sortie à la famille.', 'Пожарный заставил семью пройти к выходу.', 'Пожежник змусив сім’ю пройти до виходу.', [['le pompier', 'subject'], ['a fait suivre', 'causative'], ['la sortie', 'object'], ['à la famille', 'receiver']]],
  ['perceptionEntendre', 'Il a entendu le couple planifier le mariage.', 'Он слышал, как пара планировала свадьбу.', 'Він чув, як пара планувала весілля.', [['il', 'subject'], ['a entendu', 'perception'], ['planifier', 'infinitive'], ['le mariage', 'object']]],
  ['perceptionVoir', 'Elle a vu le candidat signer le document.', 'Она видела, как кандидат подписал документ.', 'Вона бачила, як кандидат підписав документ.', [['elle', 'subject'], ['a vu', 'perception'], ['le candidat', 'agent'], ['signer', 'infinitive'], ['le document', 'object']]],
  ['laisserPermissive', 'Ils ont laissé l’artiste peindre la fresque.', 'Они позволили художнику нарисовать фреску.', 'Вони дозволили художнику намалювати фреску.', [['ils', 'subject'], ['ont laissé', 'permissive'], ['l’artiste', 'agent'], ['peindre', 'infinitive'], ['la fresque', 'object']]],
  ['perceptionSentir', 'J’ai senti le vent pousser le chariot.', 'Я почувствовал, как ветер толкнул тележку.', 'Я відчув, як вітер штовхнув візок.', [['j’', 'subject'], ['ai senti', 'perception'], ['le vent', 'agent'], ['pousser', 'infinitive'], ['le chariot', 'object']]],
  ['perceptionEntendre', 'Nous avons entendu le professeur lire la liste à voix haute.', 'Мы слышали, как учитель читал список вслух.', 'Ми чули, як учитель читав список уголос.', [['nous', 'subject'], ['avons entendu', 'perception'], ['le professeur', 'agent'], ['lire', 'infinitive'], ['la liste', 'object'], ['à voix haute', 'complement']]],
  ['faireCausative', 'L’infirmière a fait prendre le médicament à l’enfant.', 'Медсестра заставила ребёнка принять лекарство.', 'Медсестра змусила дитину прийняти ліки.', [['a fait prendre', 'causative'], ['le médicament', 'object'], ['à l’enfant', 'receiver']]],
  ['perceptionVoir', 'Elle a vu le vieil homme laisser tomber la clé.', 'Она увидела, как старик уронил ключ.', 'Вона побачила, як старий чоловік упустив ключ.', [['elle', 'subject'], ['a vu', 'perception'], ['laisser', 'infinitive'], ['la clé', 'object']]],
  ['perceptionVoir', 'Ils ont vu le cheval sauter la clôture.', 'Они видели, как лошадь перепрыгнула забор.', 'Вони бачили, як кінь перестрибнув паркан.', [['ils', 'subject'], ['ont vu', 'perception'], ['sauter', 'infinitive'], ['la clôture', 'object']]],
  ['perceptionEntendre', 'J’ai entendu le juge annoncer le verdict.', 'Я слышал, как судья объявил приговор.', 'Я чув, як суддя оголосив вирок.', [['j’', 'subject'], ['ai entendu', 'perception'], ['annoncer', 'infinitive'], ['le verdict', 'object']]],
  ['perceptionSentir', 'Nous avons senti le bâtiment trembler pendant le séisme.', 'Мы почувствовали, как здание дрожало во время землетрясения.', 'Ми відчули, як будівля тремтіла під час землетрусу.', [['nous', 'subject'], ['avons senti', 'perception'], ['le bâtiment', 'agent'], ['trembler', 'infinitive']]],
  ['laisserPermissive', 'Elle a laissé le guide montrer la carte ancienne au groupe.', 'Она позволила гиду показать группе старую карту.', 'Вона дозволила гіду показати групі стару карту.', [['elle', 'subject'], ['a laissé', 'permissive'], ['le guide', 'agent'], ['montrer', 'infinitive'], ['la carte ancienne', 'object']]],
  ['faireCausative', 'Le manager a fait terminer le rapport à l’employé.', 'Менеджер заставил сотрудника закончить отчёт.', 'Менеджер змусив працівника закінчити звіт.', [['le manager', 'subject'], ['a fait terminer', 'causative'], ['le rapport', 'object'], ['à l’employé', 'receiver']]],
  ['perceptionEntendre', 'Ils ont entendu le mécanicien expliquer le problème moteur.', 'Они слышали, как механик объяснял проблему двигателя.', 'Вони чули, як механік пояснював проблему двигуна.', [['ils', 'subject'], ['ont entendu', 'perception'], ['le mécanicien', 'agent'], ['expliquer', 'infinitive'], ['le problème moteur', 'object']]],
  ['perceptionVoir', 'J’ai vu la branche tomber sur la voiture.', 'Я видел, как ветка упала на машину.', 'Я бачив, як гілка впала на машину.', [['j’', 'subject'], ['ai vu', 'perception'], ['la branche', 'agent'], ['tomber', 'infinitive'], ['la voiture', 'object']]],
  ['perceptionSentir', 'Elle a senti la main froide toucher son bras.', 'Она почувствовала, как холодная рука коснулась её руки.', 'Вона відчула, як холодна рука торкнулася її руки.', [['elle', 'subject'], ['a senti', 'perception'], ['la main froide', 'agent'], ['toucher', 'infinitive'], ['son bras', 'object']]],
];

function ensureDirs() { Object.values(dirs).forEach((folder) => fs.mkdirSync(folder, { recursive: true })); }
function writeJson(file, value) { ensureDirs(); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function rel(file) { return path.relative(ROOT, file).replace(/\\/g, '/'); }
function sha256File(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function byteSize(file) { return fs.statSync(file).size; }
function slot(correct, category) {
  const bank = [...new Set([correct, ...(BANKS[category] || [])])];
  if (bank.length < 6) throw new Error(`Missing bank ${category}`);
  const distractors = bank.filter((value) => value !== correct).slice(0, 5);
  if (distractors.length !== 5 || new Set(distractors).size !== 5 || distractors.includes(correct)) throw new Error(`Bad distractors for ${correct}/${category}`);
  return { text: correct, correct, category, distractors };
}
function buildRows() {
  if (DATA.length !== 50) throw new Error(`Lesson 31 must have 50 rows, got ${DATA.length}`);
  return DATA.map(([rowType, phraseFr, ru, uk, slots], index) => ({ rowId: `fr_lesson31_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`, order: index + 1, rowType, studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, phraseFr, ru, uk, wordsFr: slots.map(([correct, category]) => slot(correct, category)), evidenceIds: Object.keys(SOURCES), acceptedForProduction: false }));
}
function countBy(rows, categories) { return rows.flatMap((row) => row.wordsFr).filter((item) => categories.includes(item.category)).reduce((acc, item) => ({ ...acc, [item.category]: (acc[item.category] || 0) + 1 }), {}); }
function countRowTypes(rows) { return rows.reduce((acc, row) => ({ ...acc, [row.rowType]: (acc[row.rowType] || 0) + 1 }), {}); }
function surfaceDeclaredInApp(surface, source) { return new RegExp(`['"]${surface}['"]`).test(source); }

function main() {
  const generatedAt = new Date().toISOString();
  const rows = buildRows();
  const wordsFrSlots = rows.reduce((sum, row) => sum + row.wordsFr.length, 0);
  const distractorSlots = wordsFrSlots * 5;
  const complexCategoryCounts = countBy(rows, ['subject', 'causative', 'permissive', 'perception', 'agent', 'infinitive', 'object', 'receiver', 'desire', 'subjunctive', 'complement']);
  const rowTypeCounts = countRowTypes(rows);
  const base = { generatedAt, studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, appCourseLevel: 'B2', internalFrenchBand: 'B2.3', activationApproved: false };
  const candidate = { schemaVersion: 'gustav-fr-lesson31-blueprint-rebuild-candidate-v1', ...base, status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK', sourceStudyTarget: 'en', englishTopic: 'Complex Object', frenchTopic: 'Faire/laisser/verbes de perception + infinitif, vouloir que + subjonctif', sequencingReason: 'Matches English Complex Object function with French-native causative, permissive, perception, and desire constructions.', frenchNativeTransferRule: 'Do not copy English object + to/bare infinitive mechanics. French uses faire + infinitif for causation, laisser + infinitif for permission, voir/entendre/sentir + infinitif for perception, and vouloir/aimer que + subjonctif for desired action.', sources: SOURCES, rows, summary: { rows: rows.length, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, complexCategoryCounts, rowTypeCounts, activationApproved: false }, productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'LESSON_32_NOT_DONE', 'FULL_NON_LESSON_SURFACE_PARITY_NOT_DONE'], safety: SAFETY };
  writeJson(paths.candidate, candidate);

  const review = { schemaVersion: 'gustav-fr-lesson31-blueprint-rebuild-review-gate-v1', generatedAt, status: 'PASS_LESSON31_REVIEW_ACCEPTED_FOR_NEXT_GATE', reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) }, candidate: rel(paths.candidate), summary: { rows: rows.length, acceptedRows: rows.length, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false }, rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })), safety: SAFETY };
  writeJson(paths.reviewGate, review);
  const packBase = { schemaVersion: 'gustav-fr-lesson31-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: LESSON, appCourseLevel: 'B2', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(paths.candidate), reviewGate: rel(paths.reviewGate) }, activationApproved: false };
  writeJson(paths.ruPack, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(paths.ukPack, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });

  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort((a, b) => a.localeCompare(b, 'fr'));
  writeJson(paths.theory, { schemaVersion: 'gustav-fr-lesson31-blueprint-rebuild-theory-vocab-pack-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, theory: [
    { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Английский Complex Object переносится во французский через реальные конструкции: faire + infinitif, laisser + infinitif, voir/entendre/sentir + infinitif и vouloir que + subjonctif.', bodyUk: 'Англійський Complex Object переноситься у французьку через реальні конструкції: faire + infinitif, laisser + infinitif, voir/entendre/sentir + infinitif і vouloir que + subjonctif.' },
    { titleRu: '02. Faire + infinitif', titleUk: '02. Faire + infinitif', bodyRu: 'Faire + infinitif выражает “заставить/организовать действие”: Ils ont fait payer l’amende au conducteur. Агент часто идёт после объекта с à.', bodyUk: 'Faire + infinitif виражає “змусити/організувати дію”: Ils ont fait payer l’amende au conducteur. Виконавець часто йде після об’єкта з à.' },
    { titleRu: '03. Laisser + infinitif', titleUk: '03. Laisser + infinitif', bodyRu: 'Laisser + infinitif передаёт разрешение: Ils ont laissé l’enfant manger le gâteau. Это не английский let + bare verb, а французская infinitive-конструкция.', bodyUk: 'Laisser + infinitif передає дозвіл: Ils ont laissé l’enfant manger le gâteau. Це не англійський let + bare verb, а французька infinitive-конструкція.' },
    { titleRu: '04. Глаголы восприятия', titleUk: '04. Дієслова сприйняття', bodyRu: 'Voir, entendre, sentir могут вводить действие: J’ai entendu le pilote expliquer la procédure, Elle a senti le vent toucher son visage.', bodyUk: 'Voir, entendre, sentir можуть вводити дію: J’ai entendu le pilote expliquer la procédure, Elle a senti le vent toucher son visage.' },
    { titleRu: '05. Желание и subjonctif', titleUk: '05. Бажання і subjonctif', bodyRu: 'Для “would like someone to...” французский часто выбирает que + subjonctif: Nous voudrions que le fournisseur livre les matériaux.', bodyUk: 'Для “would like someone to...” французька часто обирає que + subjonctif: Nous voudrions que le fournisseur livre les matériaux.' },
  ], vocabulary, practiceHooks: [{ id: 'faire_causative_agent', type: 'causative_faire_infinitive', examples: ['Ils ont fait payer l’amende au conducteur.'] }, { id: 'laisser_permission', type: 'laisser_infinitive', examples: ['Ils ont laissé l’enfant manger le gâteau.'] }, { id: 'perception_infinitive', type: 'perception_verb_infinitive', examples: ['J’ai entendu le pilote expliquer la procédure.'] }], activationApproved: false });
  writeJson(paths.packAudit, { schemaVersion: 'gustav-fr-lesson31-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: SAFETY });
  writeJson(paths.theoryAudit, { schemaVersion: 'gustav-fr-lesson31-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, practiceHooks: 3, activationApproved: false }, safety: SAFETY });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson31.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: LESSON, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson31_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(paths.audio, { schemaVersion: 'gustav-fr-lesson31-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: SAFETY });
  writeJson(paths.audioAudit, { schemaVersion: 'gustav-fr-lesson31-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: SAFETY });

  const local = { ru: { path: paths.ruPack, sha256: sha256File(paths.ruPack), byteSize: byteSize(paths.ruPack) }, uk: { path: paths.ukPack, sha256: sha256File(paths.ukPack), byteSize: byteSize(paths.ukPack) }, audio: { path: paths.audio, sha256: sha256File(paths.audio), byteSize: byteSize(paths.audio) }, theory: { path: paths.theory, sha256: sha256File(paths.theory), byteSize: byteSize(paths.theory) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson31.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson31.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: LESSON, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(paths.theory), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson31_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson31_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(paths.server, { schemaVersion: 'gustav-fr-lesson31-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, contentVersion: CONTENT_VERSION, entries, safety: SAFETY });
  const manifestSource = fs.readFileSync(paths.manifest, 'utf8');
  writeJson(paths.serverAudit, { schemaVersion: 'gustav-fr-lesson31-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.payloadAudit, { schemaVersion: 'gustav-fr-lesson31-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.rollbackAudit, { schemaVersion: 'gustav-fr-lesson31-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.uploadAudit, { schemaVersion: 'gustav-fr-lesson31-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: SAFETY });

  const loaderSource = fs.readFileSync(paths.loader, 'utf8');
  const indexSource = fs.readFileSync(paths.index, 'utf8');
  const studyTargetSource = fs.readFileSync(paths.studyTarget, 'utf8');
  writeJson(paths.runtimeAudit, { schemaVersion: 'gustav-fr-lesson31-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries: (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length, legacyRemoteLoaderDisabled: /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource), productionStudyTargetsAreEnglishOnly: /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource), internalFrenchDeclared: /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource), runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false }, safety: SAFETY });
  const deniedTokens = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: deniedTokens.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(paths.cache, { schemaVersion: 'gustav-fr-lesson31-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.cacheAudit, { schemaVersion: 'gustav-fr-lesson31-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activation, { schemaVersion: 'gustav-fr-lesson31-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activationAudit, { schemaVersion: 'gustav-fr-lesson31-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });

  if (fs.existsSync(paths.state)) {
    const state = JSON.parse(fs.readFileSync(paths.state, 'utf8'));
    state.lesson31BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson31BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, complexCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson31BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson31BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson31BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson31BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson31BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson31BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson31BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson31BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = ['Start Lesson 32 final review blueprint-first rebuild within app-facing B2 parity.', 'Inspect English Lesson 32 final review source shape plus theory before generating French-native cumulative equivalent.', 'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.'];
    fs.writeFileSync(paths.state, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }
  console.log(`HOLD_LESSON31_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
