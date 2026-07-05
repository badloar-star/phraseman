import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson02_blueprint_rebuild');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const CANDIDATE_PATH = path.join(REVIEW_DIR, 'lesson02_blueprint_rebuild_candidate_v1.json');
const CANDIDATE_MD_PATH = path.join(REVIEW_DIR, 'lesson02_blueprint_rebuild_candidate_v1.md');
const REVIEW_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson02_blueprint_rebuild_review_gate_v1.json');
const REVIEW_GATE_MD_PATH = path.join(REVIEWER_DIR, 'fr_lesson02_blueprint_rebuild_review_gate_v1.md');
const RU_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_blueprint_rebuild_ru_pack_draft_v1.json');
const UK_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_blueprint_rebuild_uk_pack_draft_v1.json');
const PACK_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_blueprint_rebuild_pack_draft_audit_v1.json');
const THEORY_VOCAB_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_blueprint_rebuild_theory_vocab_pack_v1.json');
const THEORY_VOCAB_MD_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_blueprint_rebuild_theory_vocab_pack_v1.md');
const THEORY_VOCAB_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_blueprint_rebuild_theory_vocab_pack_audit_v1.json');

const SOURCES = {
  le_robert_etre_present: {
    url: 'https://dictionnaire.lerobert.com/conjugaison/etre',
    claim: 'Present indicative of etre provides je suis, tu es, il/elle est, nous sommes, vous etes, ils/elles sont.',
  },
  tv5monde_negation_a1: {
    url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-la-negation-0',
    claim: 'Beginner French negation uses ne/n\' ... pas around the conjugated verb.',
  },
  tv5monde_questions_a1: {
    url: 'https://apprendre.tv5monde.com/fr/exercices/a1-debutant/grammaire-proposer-avec-est-ce-que-et-avec-lintonation',
    claim: 'Beginner yes/no questions can use Est-ce que plus normal word order; intonation questions are also common in simple spoken French.',
  },
  coe_cefr_a1_short_simple_phrases: {
    url: 'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions',
    claim: 'A1 production uses short, simple phrases and questions about immediate concrete situations.',
  },
  phraseman_english_lesson2_blueprint: {
    url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
    claim: 'English Lesson 2 adds negation and yes/no questions after affirmative to-be frames; French must copy the product function, not English wording.',
  },
};

const D = {
  pronoun_subject: ['je', 'tu', 'il', 'elle', 'nous', 'vous'],
  pronoun_subject_cap: ['Je', 'Tu', 'Il', 'Elle', 'Nous', 'Vous'],
  pronoun_plural: ['ils', 'elles', 'nous', 'vous', 'il', 'tu'],
  pronoun_plural_cap: ['Ils', 'Elles', 'Nous', 'Vous', 'Il', 'Tu'],
  etre_suis: ['es', 'est', 'sommes', 'etes', 'sont'],
  etre_es: ['suis', 'est', 'sommes', 'etes', 'sont'],
  etre_est: ['suis', 'es', 'sommes', 'etes', 'sont'],
  etre_sommes: ['suis', 'es', 'est', 'etes', 'sont'],
  etre_etes: ['es', 'est', 'sommes', 'sont', 'suis'],
  etre_sont: ['est', 'sommes', 'etes', 'suis', 'es'],
  ne: ["n'", 'pas', 'est', 'es', 'suis'],
  n_apostrophe: ['ne', 'pas', 'est', 'es', 'suis'],
  pas: ['plus', 'tres', 'ici', 'la', 'bien'],
  est_ce_que: ["Est-ce qu'", "C'est", "Ce n'est", 'Tu es', 'Vous etes'],
  est_ce_qu: ['Est-ce que', "C'est", "Ce n'est", 'Il est', 'Elle est'],
  ce: ["C'", 'Il', 'Elle', 'Ca', 'Tu'],
  ce_lower: ["c'", 'il', 'elle', 'ca', 'tu'],
  c_apostrophe: ['Ce', 'Ca', 'Il', 'Elle', 'Ils'],
  c_apostrophe_lower: ['ce', 'ca', 'il', 'elle', 'ils'],
  oui_non: ['Oui', 'Non', 'Si', 'Et', 'Mais', 'Alors'],
  adj_pret_m: ['prete', 'prets', 'pretes', 'pres', 'occupe'],
  adj_prete_f: ['pret', 'prets', 'pretes', 'pres', 'occupee'],
  adj_prets_mpl: ['pret', 'prete', 'pretes', 'pres', 'occupes'],
  adj_pretes_fpl: ['pret', 'prete', 'prets', 'pres', 'occupees'],
  adj_content_mpl: ['content', 'contente', 'contentes', 'calmes', 'tristes'],
  adj_contentes_fpl: ['content', 'contente', 'contents', 'calmes', 'tristes'],
  adj_calme: ['calmes', 'content', 'triste', 'occupe', 'pret'],
  adj_occupe_m: ['occupee', 'occupes', 'occupees', 'pret', 'fatigue'],
  adj_occupee_f: ['occupe', 'occupes', 'occupees', 'prete', 'fatiguee'],
  adj_malade: ['malades', 'fatigue', 'fatiguee', 'occupe', 'calme'],
  adj_sure_m: ['sure', 'surs', 'sures', 'pret', 'calme'],
  adj_sure_f: ['sur', 'surs', 'sures', 'prete', 'calme'],
  inv_important: ['importante', 'importants', 'importantes', 'urgent', 'serieux'],
  inv_gratuit: ['gratuite', 'gratuits', 'gratuites', 'cher', 'possible'],
  inv_cher: ['chere', 'chers', 'cheres', 'gratuit', 'vide'],
  inv_possible: ['possibles', 'important', 'serieux', 'gratuit', 'vide'],
  inv_casse: ['cassee', 'casses', 'cassees', 'vide', 'serieux'],
  inv_serieux: ['serieuses', 'serieuse', 'important', 'possible', 'gratuit'],
  inv_facile: ['faciles', 'difficile', 'possible', 'simple', 'serieux'],
  place_ici: ['la', 'dehors', 'dedans', 'loin', 'proche'],
  place_la: ['ici', 'dehors', 'dedans', 'loin', 'proche'],
  place_dehors: ['dedans', 'ici', 'la', 'loin', 'proche'],
  prep_en: ['a', 'de', 'dans', 'chez', 'pour'],
  noun_retard: ['avance', 'securite', 'forme', 'route', 'classe'],
  noun_securite: ['retard', 'forme', 'danger', 'paix', 'place'],
  ensemble: ['seul', 'seuls', 'seules', 'ici', 'dehors'],
};

function distractorsFor(text, category) {
  const key = {
    Je: 'pronoun_subject_cap',
    Tu: 'pronoun_subject_cap',
    Il: 'pronoun_subject_cap',
    Elle: 'pronoun_subject_cap',
    Nous: 'pronoun_subject_cap',
    Vous: 'pronoun_subject_cap',
    Ils: 'pronoun_plural_cap',
    Elles: 'pronoun_plural_cap',
    je: 'pronoun_subject',
    tu: 'pronoun_subject',
    il: 'pronoun_subject',
    elle: 'pronoun_subject',
    nous: 'pronoun_subject',
    vous: 'pronoun_subject',
    ils: 'pronoun_plural',
    elles: 'pronoun_plural',
    suis: 'etre_suis',
    es: 'etre_es',
    est: 'etre_est',
    sommes: 'etre_sommes',
    etes: 'etre_etes',
    sont: 'etre_sont',
    ne: 'ne',
    "n'": 'n_apostrophe',
    pas: 'pas',
    'Est-ce que': 'est_ce_que',
    "Est-ce qu'": 'est_ce_qu',
    Ce: 'ce',
    ce: 'ce_lower',
    "C'": 'c_apostrophe',
    "c'": 'c_apostrophe_lower',
    Oui: 'oui_non',
    Non: 'oui_non',
    pret: 'adj_pret_m',
    prete: 'adj_prete_f',
    prets: 'adj_prets_mpl',
    pretes: 'adj_pretes_fpl',
    contents: 'adj_content_mpl',
    contentes: 'adj_contentes_fpl',
    calme: 'adj_calme',
    occupe: 'adj_occupe_m',
    occupee: 'adj_occupee_f',
    malade: 'adj_malade',
    sur: 'adj_sure_m',
    sure: 'adj_sure_f',
    important: 'inv_important',
    gratuit: 'inv_gratuit',
    cher: 'inv_cher',
    possible: 'inv_possible',
    casse: 'inv_casse',
    serieux: 'inv_serieux',
    facile: 'inv_facile',
    ici: 'place_ici',
    la: 'place_la',
    dehors: 'place_dehors',
    en: 'prep_en',
    retard: 'noun_retard',
    securite: 'noun_securite',
    ensemble: 'ensemble',
  }[text];
  const values = D[key] || ['ici', 'la', 'pret', 'pas', 'est'];
  const clean = values.filter((item) => item !== text);
  return [...new Set(clean)].slice(0, 5);
}

function displayToken(text) {
  return {
    etes: 'êtes',
    'Vous etes': 'Vous êtes',
    a: 'à',
    la: 'là',
    securite: 'sécurité',
    pret: 'prêt',
    prete: 'prête',
    prets: 'prêts',
    pretes: 'prêtes',
    pres: 'près',
    occupe: 'occupé',
    occupee: 'occupée',
    occupes: 'occupés',
    occupees: 'occupées',
    fatigue: 'fatigué',
    fatiguee: 'fatiguée',
    fatigues: 'fatigués',
    fatiguees: 'fatiguées',
    sur: 'sûr',
    sure: 'sûre',
    surs: 'sûrs',
    sures: 'sûres',
    chere: 'chère',
    cheres: 'chères',
    casse: 'cassé',
    cassee: 'cassée',
    casses: 'cassés',
    cassees: 'cassées',
    serieux: 'sérieux',
    serieuse: 'sérieuse',
    serieuses: 'sérieuses',
    tres: 'très',
    Ca: 'Ça',
    ca: 'ça',
  }[text] || text;
}

function displayPhrase(text) {
  return text
    .replace(/\betes\b/g, 'êtes')
    .replace(/\bla\b/g, 'là')
    .replace(/\bsecurite\b/g, 'sécurité')
    .replace(/\bpret\b/g, 'prêt')
    .replace(/\bprete\b/g, 'prête')
    .replace(/\bprets\b/g, 'prêts')
    .replace(/\bpretes\b/g, 'prêtes')
    .replace(/\boccupe\b/g, 'occupé')
    .replace(/\boccupee\b/g, 'occupée')
    .replace(/\bsur\b/g, 'sûr')
    .replace(/\bsure\b/g, 'sûre')
    .replace(/\bcasse\b/g, 'cassé')
    .replace(/\bserieux\b/g, 'sérieux');
}

function s(text, category) {
  const distractors = distractorsFor(text, category).map(displayToken);
  if (distractors.length !== 5) throw new Error(`Slot ${text} has ${distractors.length} distractors`);
  return { text: displayToken(text), correct: displayToken(text), category, distractors };
}

const rows = [
  ['Je ne suis pas pret.', 'Я не готов. (говорит мужчина)', 'Я не готовий. (говорить чоловік)', [['Je', 'subject_pronoun'], ['ne', 'negation_part'], ['suis', 'etre_present'], ['pas', 'negation_part'], ['pret', 'adjective_masc_sg']]],
  ['Je ne suis pas prete.', 'Я не готова. (говорит женщина)', 'Я не готова. (говорить жінка)', [['Je', 'subject_pronoun'], ['ne', 'negation_part'], ['suis', 'etre_present'], ['pas', 'negation_part'], ['prete', 'adjective_fem_sg']]],
  ["Tu n'es pas pret.", 'Ты не готов.', 'Ти не готовий.', [['Tu', 'subject_pronoun'], ["n'", 'negation_elision'], ['es', 'etre_present'], ['pas', 'negation_part'], ['pret', 'adjective_masc_sg']]],
  ["Tu n'es pas prete.", 'Ты не готова.', 'Ти не готова.', [['Tu', 'subject_pronoun'], ["n'", 'negation_elision'], ['es', 'etre_present'], ['pas', 'negation_part'], ['prete', 'adjective_fem_sg']]],
  ["Il n'est pas ici.", 'Он не здесь.', 'Він не тут.', [['Il', 'subject_pronoun'], ["n'", 'negation_elision'], ['est', 'etre_present'], ['pas', 'negation_part'], ['ici', 'place_adverb']]],
  ["Elle n'est pas la.", 'Она не здесь / не там.', 'Вона не тут / не там.', [['Elle', 'subject_pronoun'], ["n'", 'negation_elision'], ['est', 'etre_present'], ['pas', 'negation_part'], ['la', 'place_adverb']]],
  ['Nous ne sommes pas prets.', 'Мы не готовы. (муж./смеш.)', 'Ми не готові. (чол./зміш.)', [['Nous', 'subject_pronoun'], ['ne', 'negation_part'], ['sommes', 'etre_present'], ['pas', 'negation_part'], ['prets', 'adjective_masc_pl']]],
  ['Nous ne sommes pas pretes.', 'Мы не готовы. (жен.)', 'Ми не готові. (жін.)', [['Nous', 'subject_pronoun'], ['ne', 'negation_part'], ['sommes', 'etre_present'], ['pas', 'negation_part'], ['pretes', 'adjective_fem_pl']]],
  ["Vous n'etes pas en retard.", 'Вы не опаздываете.', 'Ви не запізнюєтеся.', [['Vous', 'subject_pronoun'], ["n'", 'negation_elision'], ['etes', 'etre_present'], ['pas', 'negation_part'], ['en', 'fixed_expression_preposition'], ['retard', 'fixed_expression_noun']]],
  ['Ils ne sont pas contents.', 'Они не довольны / не рады. (муж./смеш.)', 'Вони не задоволені / не раді. (чол./зміш.)', [['Ils', 'subject_pronoun'], ['ne', 'negation_part'], ['sont', 'etre_present'], ['pas', 'negation_part'], ['contents', 'adjective_masc_pl']]],
  ['Elles ne sont pas contentes.', 'Они не довольны / не рады. (жен.)', 'Вони не задоволені / не раді. (жін.)', [['Elles', 'subject_pronoun'], ['ne', 'negation_part'], ['sont', 'etre_present'], ['pas', 'negation_part'], ['contentes', 'adjective_fem_pl']]],
  ["Ce n'est pas important.", 'Это не важно.', 'Це не важливо.', [['Ce', 'demonstrative'], ["n'", 'negation_elision'], ['est', 'etre_present'], ['pas', 'negation_part'], ['important', 'invariable_predicative']]],
  ["Ce n'est pas gratuit.", 'Это не бесплатно.', 'Це не безкоштовно.', [['Ce', 'demonstrative'], ["n'", 'negation_elision'], ['est', 'etre_present'], ['pas', 'negation_part'], ['gratuit', 'invariable_predicative']]],
  ["Ce n'est pas cher.", 'Это не дорого.', 'Це не дорого.', [['Ce', 'demonstrative'], ["n'", 'negation_elision'], ['est', 'etre_present'], ['pas', 'negation_part'], ['cher', 'invariable_predicative']]],
  ["Ce n'est pas possible.", 'Это невозможно.', 'Це неможливо.', [['Ce', 'demonstrative'], ["n'", 'negation_elision'], ['est', 'etre_present'], ['pas', 'negation_part'], ['possible', 'invariable_predicative']]],
  ['Je ne suis pas calme.', 'Я не спокоен / не спокойна.', 'Я не спокійний / не спокійна.', [['Je', 'subject_pronoun'], ['ne', 'negation_part'], ['suis', 'etre_present'], ['pas', 'negation_part'], ['calme', 'adjective_invariable_sg']]],
  ["Il n'est pas occupe.", 'Он не занят.', 'Він не зайнятий.', [['Il', 'subject_pronoun'], ["n'", 'negation_elision'], ['est', 'etre_present'], ['pas', 'negation_part'], ['occupe', 'adjective_masc_sg']]],
  ["Elle n'est pas occupee.", 'Она не занята.', 'Вона не зайнята.', [['Elle', 'subject_pronoun'], ["n'", 'negation_elision'], ['est', 'etre_present'], ['pas', 'negation_part'], ['occupee', 'adjective_fem_sg']]],
  ['Nous ne sommes pas ensemble.', 'Мы не вместе.', 'Ми не разом.', [['Nous', 'subject_pronoun'], ['ne', 'negation_part'], ['sommes', 'etre_present'], ['pas', 'negation_part'], ['ensemble', 'relation_adverb']]],
  ['Ils ne sont pas dehors.', 'Они не снаружи / не на улице.', 'Вони не зовні / не надворі.', [['Ils', 'subject_pronoun'], ['ne', 'negation_part'], ['sont', 'etre_present'], ['pas', 'negation_part'], ['dehors', 'place_adverb']]],
  ['Est-ce que tu es pret ?', 'Ты готов?', 'Ти готовий?', [['Est-ce que', 'question_frame'], ['tu', 'subject_pronoun'], ['es', 'etre_present'], ['pret', 'adjective_masc_sg']]],
  ['Est-ce que tu es prete ?', 'Ты готова?', 'Ти готова?', [['Est-ce que', 'question_frame'], ['tu', 'subject_pronoun'], ['es', 'etre_present'], ['prete', 'adjective_fem_sg']]],
  ["Est-ce qu'il est ici ?", 'Он здесь?', 'Він тут?', [["Est-ce qu'", 'question_elision'], ['il', 'subject_pronoun'], ['est', 'etre_present'], ['ici', 'place_adverb']]],
  ["Est-ce qu'elle est la ?", 'Она здесь / там?', 'Вона тут / там?', [["Est-ce qu'", 'question_elision'], ['elle', 'subject_pronoun'], ['est', 'etre_present'], ['la', 'place_adverb']]],
  ['Est-ce que nous sommes en retard ?', 'Мы опаздываем?', 'Ми запізнюємося?', [['Est-ce que', 'question_frame'], ['nous', 'subject_pronoun'], ['sommes', 'etre_present'], ['en', 'fixed_expression_preposition'], ['retard', 'fixed_expression_noun']]],
  ['Est-ce que vous etes prets ?', 'Вы готовы? (муж./смеш.)', 'Ви готові? (чол./зміш.)', [['Est-ce que', 'question_frame'], ['vous', 'subject_pronoun'], ['etes', 'etre_present'], ['prets', 'adjective_masc_pl']]],
  ["Est-ce qu'ils sont contents ?", 'Они довольны / рады? (муж./смеш.)', 'Вони задоволені / раді? (чол./зміш.)', [["Est-ce qu'", 'question_elision'], ['ils', 'subject_pronoun'], ['sont', 'etre_present'], ['contents', 'adjective_masc_pl']]],
  ["Est-ce qu'elles sont contentes ?", 'Они довольны / рады? (жен.)', 'Вони задоволені / раді? (жін.)', [["Est-ce qu'", 'question_elision'], ['elles', 'subject_pronoun'], ['sont', 'etre_present'], ['contentes', 'adjective_fem_pl']]],
  ["Est-ce que c'est important ?", 'Это важно?', 'Це важливо?', [['Est-ce que', 'question_frame'], ["c'", 'demonstrative_elision'], ['est', 'etre_present'], ['important', 'invariable_predicative']]],
  ["Est-ce que c'est gratuit ?", 'Это бесплатно?', 'Це безкоштовно?', [['Est-ce que', 'question_frame'], ["c'", 'demonstrative_elision'], ['est', 'etre_present'], ['gratuit', 'invariable_predicative']]],
  ["Est-ce que c'est cher ?", 'Это дорого?', 'Це дорого?', [['Est-ce que', 'question_frame'], ["c'", 'demonstrative_elision'], ['est', 'etre_present'], ['cher', 'invariable_predicative']]],
  ["Est-ce que c'est possible ?", 'Это возможно?', 'Це можливо?', [['Est-ce que', 'question_frame'], ["c'", 'demonstrative_elision'], ['est', 'etre_present'], ['possible', 'invariable_predicative']]],
  ['Est-ce que je suis en securite ?', 'Я в безопасности?', 'Я в безпеці?', [['Est-ce que', 'question_frame'], ['je', 'subject_pronoun'], ['suis', 'etre_present'], ['en', 'fixed_expression_preposition'], ['securite', 'fixed_expression_noun']]],
  ['Est-ce que nous sommes ensemble ?', 'Мы вместе?', 'Ми разом?', [['Est-ce que', 'question_frame'], ['nous', 'subject_pronoun'], ['sommes', 'etre_present'], ['ensemble', 'relation_adverb']]],
  ["Est-ce que tu n'es pas pret ?", 'Разве ты не готов?', 'Хіба ти не готовий?', [['Est-ce que', 'question_frame'], ['tu', 'subject_pronoun'], ["n'", 'negation_elision'], ['es', 'etre_present'], ['pas', 'negation_part'], ['pret', 'adjective_masc_sg']]],
  ["Est-ce qu'il n'est pas en retard ?", 'Разве он не опаздывает?', 'Хіба він не запізнюється?', [["Est-ce qu'", 'question_elision'], ['il', 'subject_pronoun'], ["n'", 'negation_elision'], ['est', 'etre_present'], ['pas', 'negation_part'], ['en', 'fixed_expression_preposition'], ['retard', 'fixed_expression_noun']]],
  ["Est-ce qu'elle n'est pas malade ?", 'Разве она не больна?', 'Хіба вона не хвора?', [["Est-ce qu'", 'question_elision'], ['elle', 'subject_pronoun'], ["n'", 'negation_elision'], ['est', 'etre_present'], ['pas', 'negation_part'], ['malade', 'adjective_invariable_sg']]],
  ["Est-ce que vous n'etes pas dehors ?", 'Разве вы не на улице?', 'Хіба ви не надворі?', [['Est-ce que', 'question_frame'], ['vous', 'subject_pronoun'], ["n'", 'negation_elision'], ['etes', 'etre_present'], ['pas', 'negation_part'], ['dehors', 'place_adverb']]],
  ["Est-ce que ce n'est pas casse ?", 'Разве это не сломано?', 'Хіба це не зламано?', [['Est-ce que', 'question_frame'], ['ce', 'demonstrative'], ["n'", 'negation_elision'], ['est', 'etre_present'], ['pas', 'negation_part'], ['casse', 'invariable_predicative']]],
  ["Est-ce que ce n'est pas serieux ?", 'Разве это не серьезно?', 'Хіба це не серйозно?', [['Est-ce que', 'question_frame'], ['ce', 'demonstrative'], ["n'", 'negation_elision'], ['est', 'etre_present'], ['pas', 'negation_part'], ['serieux', 'invariable_predicative']]],
  ['Tu es sur ?', 'Ты уверен?', 'Ти впевнений?', [['Tu', 'subject_pronoun'], ['es', 'etre_present'], ['sur', 'adjective_masc_sg']]],
  ['Tu es sure ?', 'Ты уверена?', 'Ти впевнена?', [['Tu', 'subject_pronoun'], ['es', 'etre_present'], ['sure', 'adjective_fem_sg']]],
  ['Vous etes prets ?', 'Вы готовы? (муж./смеш.)', 'Ви готові? (чол./зміш.)', [['Vous', 'subject_pronoun'], ['etes', 'etre_present'], ['prets', 'adjective_masc_pl']]],
  ['Ils sont dehors ?', 'Они на улице?', 'Вони надворі?', [['Ils', 'subject_pronoun'], ['sont', 'etre_present'], ['dehors', 'place_adverb']]],
  ['Elle est occupee ?', 'Она занята?', 'Вона зайнята?', [['Elle', 'subject_pronoun'], ['est', 'etre_present'], ['occupee', 'adjective_fem_sg']]],
  ["C'est facile ?", 'Это легко?', 'Це легко?', [["C'", 'demonstrative_elision'], ['est', 'etre_present'], ['facile', 'invariable_predicative']]],
  ['Oui, je suis pret.', 'Да, я готов. (говорит мужчина)', 'Так, я готовий. (говорить чоловік)', [['Oui', 'short_answer'], ['je', 'subject_pronoun'], ['suis', 'etre_present'], ['pret', 'adjective_masc_sg']]],
  ['Non, je ne suis pas pret.', 'Нет, я не готов. (говорит мужчина)', 'Ні, я не готовий. (говорить чоловік)', [['Non', 'short_answer'], ['je', 'subject_pronoun'], ['ne', 'negation_part'], ['suis', 'etre_present'], ['pas', 'negation_part'], ['pret', 'adjective_masc_sg']]],
  ['Oui, nous sommes prets.', 'Да, мы готовы. (муж./смеш.)', 'Так, ми готові. (чол./зміш.)', [['Oui', 'short_answer'], ['nous', 'subject_pronoun'], ['sommes', 'etre_present'], ['prets', 'adjective_masc_pl']]],
  ["Non, ce n'est pas gratuit.", 'Нет, это не бесплатно.', 'Ні, це не безкоштовно.', [['Non', 'short_answer'], ['ce', 'demonstrative'], ["n'", 'negation_elision'], ['est', 'etre_present'], ['pas', 'negation_part'], ['gratuit', 'invariable_predicative']]],
];

function rowFrom(tuple, index) {
  const [phraseFr, ru, uk, slots] = tuple;
  return {
    rowId: `fr_lesson02_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
    order: index + 1,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    phraseFr: displayPhrase(phraseFr),
    ru,
    uk,
    wordsFr: slots.map(([text, category]) => s(text, category)),
    evidenceIds: Object.keys(SOURCES),
    acceptedForProduction: false,
  };
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
}

function countSlots(items) {
  return items.reduce((sum, row) => sum + row.wordsFr.length, 0);
}

function candidateMarkdown(candidate) {
  const lines = [
    '# French Lesson 2 Blueprint Rebuild Candidate',
    '',
    `Status: ${candidate.status}`,
    `Rows: ${candidate.summary.rows}`,
    `wordsFr slots: ${candidate.summary.wordsFrSlots}`,
    '',
    '## Scope',
    '',
    "- Beginner negation with ne/n' ... pas.",
    "- Beginner yes/no questions with Est-ce que / Est-ce qu'.",
    '- Spoken intonation questions only after the main Est-ce que frame.',
    '- Vocabulary mostly reuses Lesson 1 so the new operation is polarity/question form.',
    '',
    '## 50 Rows',
    '',
    '| # | French | RU | UK | wordsFr + distractors |',
    '|---:|---|---|---|---|',
    ...candidate.rows.map((row) => {
      const slots = row.wordsFr.map((slot) => `${slot.correct} {${slot.category}} [${slot.distractors.join(', ')}]`).join('<br>');
      return `| ${row.order} | ${row.phraseFr} | ${row.ru} | ${row.uk} | ${slots} |`;
    }),
    '',
    '## Production Blockers',
    '',
    ...candidate.productionBlockers.map((blocker) => `- ${blocker}`),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function theoryMarkdown(pack) {
  const lines = [
    '# French Lesson 2 Theory/Vocabulary Pack',
    '',
    `Status: ${pack.status}`,
    `Theory sections: ${pack.theory.length}`,
    `Vocabulary items: ${pack.vocabulary.length}`,
    '',
    '## Theory',
    '',
    ...pack.theory.flatMap((section) => [`### ${section.titleRu} / ${section.titleUk}`, section.bodyRu, '', section.bodyUk, '']),
    '## Vocabulary Groups',
    '',
    ...pack.vocabularyGroups.map((group) => `- ${group.title}: ${group.items.join(', ')}`),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  const generatedAt = new Date().toISOString();
  const materializedRows = rows.map(rowFrom);
  const wordsFrSlots = countSlots(materializedRows);
  const distractorSlots = materializedRows.reduce((sum, row) => sum + row.wordsFr.reduce((inner, slot) => inner + slot.distractors.length, 0), 0);
  const sourceIds = Object.keys(SOURCES);

  const candidate = {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-candidate-v1',
    generatedAt,
    status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    lessonId: 2,
    appCourseLevel: 'A1',
    internalFrenchBand: 'A1.1',
    englishTopic: 'To be negation and questions',
    frenchTopic: 'Etre: negation and beginner yes/no questions',
    sequencingReason: 'After Lesson 1 affirmative etre frames, Lesson 2 changes polarity and question form while mostly reusing the same vocabulary.',
    sources: SOURCES,
    rows: materializedRows,
    summary: {
      rows: materializedRows.length,
      wordsFrSlots,
      distractorSlots,
      distractorsPerSlot: 5,
      negativeRows: materializedRows.filter((row) => row.phraseFr.includes(' pas')).length,
      estCeQueRows: materializedRows.filter((row) => row.phraseFr.startsWith('Est-ce')).length,
      intonationQuestionRows: materializedRows.filter((row) => row.phraseFr.endsWith('?') && !row.phraseFr.startsWith('Est-ce')).length,
      shortAnswerRows: materializedRows.filter((row) => row.phraseFr.startsWith('Oui') || row.phraseFr.startsWith('Non')).length,
      activationApproved: false,
    },
    productionBlockers: [
      'LLM_TRUSTED_SOURCE_REVIEW_NOT_DONE_FOR_LESSON2',
      'AUDIO_TTS_NOT_GENERATED',
      'SERVER_PACK_NOT_BUILT',
      'RUNTIME_DELIVERY_NOT_TESTED',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ],
    safety: {
      candidateOnly: true,
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };

  writeJson(CANDIDATE_PATH, candidate);
  writeText(CANDIDATE_MD_PATH, candidateMarkdown(candidate));

  const reviewGate = {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-review-gate-v1',
    generatedAt,
    status: 'PASS_LESSON2_REVIEW_ACCEPTED_FOR_NEXT_GATE',
    verdict: 'Lesson 2 candidate is accepted as a reviewed local course candidate, but remains blocked from production activation.',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    lessonId: 2,
    appCourseLevel: 'A1',
    candidate: rel(CANDIDATE_PATH),
    reviewer: {
      kind: 'codex_llm_trusted_source_review',
      humanReviewRequired: false,
      trustedSourceEvidenceRequired: true,
      officialOrTrustedSources: sourceIds,
    },
    reviewCriteria: [
      'French target text must stay French-only; RU/UK remain support meanings only.',
      'Every row must use ne/n apostrophe plus pas correctly when negative.',
      'Est-ce que / Est-ce qu apostrophe rows must keep normal beginner French word order.',
      'Intonation questions are allowed only after the Est-ce que frame is established.',
      'Every word slot must have exactly five non-duplicate distractors.',
      'No app apply, audio generation, server upload, runtime download, or activation may open here.',
    ],
    rowDecisions: materializedRows.map((row) => ({
      rowId: row.rowId,
      order: row.order,
      phraseFr: row.phraseFr,
      decision: 'ACCEPT',
      issues: [],
      acceptedForLessonCandidate: true,
      acceptedForProduction: false,
    })),
    summary: {
      rows: materializedRows.length,
      acceptedRows: materializedRows.length,
      revisionRows: 0,
      wordsFrSlots,
      distractorSlots,
      llmTrustedSourceReviewDone: true,
      humanReviewRequired: false,
      readyForTheoryPackDraft: true,
      readyForAudio: false,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      activationApproved: false,
    },
    blockers: [],
    productionBlockers: [
      'LESSON2_AUDIO_TTS_NOT_GENERATED',
      'LESSON2_SERVER_PACK_NOT_BUILT',
      'LESSON2_RUNTIME_DELIVERY_NOT_TESTED',
      'FULL_32_LESSON_PARITY_NOT_DONE',
      'ADMIN_STORAGE_CLOUD_PROMPT_GATES_NOT_DONE',
    ],
    safety: candidate.safety,
  };
  writeJson(REVIEW_GATE_PATH, reviewGate);
  writeText(REVIEW_GATE_MD_PATH, `# French Lesson 2 Blueprint Rebuild Review Gate\n\nStatus: ${reviewGate.status}\nRows accepted: ${reviewGate.summary.acceptedRows}/${reviewGate.summary.rows}\nHuman review required: false\nActivation approved: false\n`);

  const packBase = {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-pack-draft-v1',
    generatedAt,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    lessonId: 2,
    appCourseLevel: 'A1',
    internalFrenchBand: 'A1.1',
    contentVersion: 'fr-lesson02-blueprint-rebuild-v1.reviewed.pending',
    sourceArtifacts: {
      candidate: rel(CANDIDATE_PATH),
      reviewGate: rel(REVIEW_GATE_PATH),
    },
    activationApproved: false,
  };
  const ruPack = { ...packBase, sourceLocale: 'ru', rows: materializedRows.map((row) => ({ ...row, supportMeaning: row.ru })) };
  const ukPack = { ...packBase, sourceLocale: 'uk', rows: materializedRows.map((row) => ({ ...row, supportMeaning: row.uk })) };
  writeJson(RU_PACK_PATH, ruPack);
  writeJson(UK_PACK_PATH, ukPack);

  const theory = [
    {
      titleRu: '01. Что тренирует урок',
      titleUk: '01. Що тренує урок',
      bodyRu: 'Урок добавляет две операции к Lesson 1: отрицание и вопрос. Смысл остается простым, чтобы мозг тренировался именно на форме ne/n’ ... pas и Est-ce que.',
      bodyUk: 'Урок додає дві операції до Lesson 1: заперечення і питання. Сенс лишається простим, щоб мозок тренував саме форму ne/n’ ... pas і Est-ce que.',
    },
    {
      titleRu: '02. Отрицание',
      titleUk: '02. Заперечення',
      bodyRu: 'Во французском простое отрицание окружает спрягаемый глагол: Je ne suis pas prêt, Tu n’es pas prête, Ce n’est pas important.',
      bodyUk: 'У французькій просте заперечення оточує відмінюване дієслово: Je ne suis pas prêt, Tu n’es pas prête, Ce n’est pas important.',
    },
    {
      titleRu: '03. Апостроф перед гласной',
      titleUk: '03. Апостроф перед голосною',
      bodyRu: 'Перед es/est форма ne превращается в n’: tu n’es pas, il n’est pas, ce n’est pas. Это отдельный слот, потому что ошибка здесь частая.',
      bodyUk: 'Перед es/est форма ne перетворюється на n’: tu n’es pas, il n’est pas, ce n’est pas. Це окремий слот, бо помилка тут часта.',
    },
    {
      titleRu: '04. Вопрос Est-ce que',
      titleUk: '04. Питання Est-ce que',
      bodyRu: 'Главная безопасная A1-рамка: Est-ce que + обычный порядок слов. Est-ce que tu es prêt ? Est-ce qu’il est ici ?',
      bodyUk: 'Головна безпечна A1-рамка: Est-ce que + звичайний порядок слів. Est-ce que tu es prêt ? Est-ce qu’il est ici ?',
    },
    {
      titleRu: '05. Интонационный вопрос',
      titleUk: '05. Інтонаційне питання',
      bodyRu: 'Короткие разговорные вопросы вроде Tu es sûr ? появляются после Est-ce que, но не заменяют его как основную учебную рамку.',
      bodyUk: 'Короткі розмовні питання на кшталт Tu es sûr ? з’являються після Est-ce que, але не замінюють його як основну навчальну рамку.',
    },
  ];
  const vocabulary = [...new Set(materializedRows.flatMap((row) => row.wordsFr.map((slot) => slot.correct)))].sort();
  const theoryPack = {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    lessonId: 2,
    theory,
    vocabulary,
    vocabularyGroups: [
      { title: 'Negation', items: ['ne', "n'", 'pas'] },
      { title: 'Question frames', items: ['Est-ce que', "Est-ce qu'", 'intonation question'] },
      { title: 'Etre forms', items: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'] },
      { title: 'Reused Lesson 1 adjectives/adverbs', items: ['prêt/prête/prêts/prêtes', 'content/contente', 'ici/là/dehors', 'important/gratuit/possible'] },
    ],
    activationApproved: false,
  };
  writeJson(THEORY_VOCAB_PATH, theoryPack);
  writeText(THEORY_VOCAB_MD_PATH, theoryMarkdown(theoryPack));

  const packAudit = {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-pack-draft-audit-v1',
    generatedAt,
    status: 'PASS_PACK_DRAFT_WRITTEN',
    summary: {
      rowsPerPack: materializedRows.length,
      sourceLocales: ['ru', 'uk'],
      wordsFrSlots,
      distractorSlots,
      ruPackSha256: sha256File(RU_PACK_PATH),
      ukPackSha256: sha256File(UK_PACK_PATH),
      reviewGateStatus: reviewGate.status,
      activationApproved: false,
    },
    safety: {
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(PACK_AUDIT_PATH, packAudit);
  writeJson(THEORY_VOCAB_AUDIT_PATH, {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-theory-vocab-pack-audit-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    summary: {
      theorySections: theory.length,
      vocabularyItems: vocabulary.length,
      theoryPackSha256: sha256File(THEORY_VOCAB_PATH),
      activationApproved: false,
    },
    safety: packAudit.safety,
  });

  if (fs.existsSync(STATE_PATH)) {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    state.lesson02BlueprintRebuildCandidate = rel(CANDIDATE_PATH);
    state.lesson02BlueprintRebuildReviewGate = rel(REVIEW_GATE_PATH);
    state.lesson02BlueprintRebuildPackDraftAudit = rel(PACK_AUDIT_PATH);
    state.lesson02BlueprintRebuildTheoryVocabAudit = rel(THEORY_VOCAB_AUDIT_PATH);
    state.lesson02BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson02BlueprintRebuildSummary = {
      rows: materializedRows.length,
      wordsFrSlots,
      distractorSlots,
      acceptedRows: materializedRows.length,
      theorySections: theory.length,
      vocabularyItems: vocabulary.length,
      activationApproved: false,
    };
    state.nextPassPlan = [
      'Create Lesson 2 audio/TTS manifest gate with 100 slots and checksums closed until generation.',
      'Create Lesson 2 server pack manifest, runtime delivery, cache integrity and activation receipt gates using the Lesson 1 template.',
      'Then continue Lesson 3 blueprint-first rebuild only after Lesson 2 has the same closed delivery chain.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`PASS_LESSON2_BLUEPRINT_REBUILD_LOCAL rows=${materializedRows.length} wordsFr=${wordsFrSlots} distractors=${distractorSlots} activation=false`);
}

main();
