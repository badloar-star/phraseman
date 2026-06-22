import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning';
type FieldKind =
  | 'day_topic'
  | 'day_outcome'
  | 'intro_title'
  | 'intro_body'
  | 'intro_example_gloss'
  | 'phrase_explanation_title'
  | 'phrase_explanation_rule'
  | 'phrase_explanation_why'
  | 'phrase_explanation_common_mistake'
  | 'vocabulary_translation';

type Finding = { severity: Severity; code: string; message: string; path?: string };
type TranslationField = { fieldPath: string; fieldKind: FieldKind; frenchText: string };
type DayPack = { dayIndex: number; fields: TranslationField[] };

const PLAN_ID = 'echo' as const;
const DAY_INDICES = [26, 27, 28] as const;
const GENERATED_BY = 'gustav_personal_plan_echo_days026_028_french_full_day_text_packets' as const;

const DAY_PACKS: DayPack[] = [
  {
    dayIndex: 26,
    fields: [
      { fieldPath: 'topic', fieldKind: 'day_topic', frenchText: 'Demander si tu peux essayer quelque chose' },
      { fieldPath: 'outcome', fieldKind: 'day_outcome', frenchText: 'Tu peux demander si tu peux essayer quelque chose et trouver la cabine d’essayage.' },
      { fieldPath: 'intro[0].title', fieldKind: 'intro_title', frenchText: 'Une phrase et tu es déjà à la cabine' },
      { fieldPath: 'intro[0].body', fieldKind: 'intro_body', frenchText: 'Quand tu veux essayer quelque chose dans un magasin, en anglais on dit : Can I try this on? C’est une question polie avec can, et le vendeur comprend tout de suite ce que tu veux.' },
      { fieldPath: 'intro[0].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Puis-je essayer ceci ?' },
      { fieldPath: 'intro[0].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Où est la cabine d’essayage ?' },
      { fieldPath: 'intro[1].title', fieldKind: 'intro_title', frenchText: '« Try on » signifie « essayer un vêtement »' },
      { fieldPath: 'intro[1].body', fieldKind: 'intro_body', frenchText: 'Try on signifie mettre quelque chose pour voir si cela va bien. Try this on veut dire essayer ce vêtement précis. C’est une expression fixe utilisée dans tous les magasins de vêtements.' },
      { fieldPath: 'intro[1].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Puis-je essayer ceci, s’il vous plaît ?' },
      { fieldPath: 'intro[1].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Où est la cabine d’essayage ?' },
      { fieldPath: 'intro[2].title', fieldKind: 'intro_title', frenchText: 'Comment demander poliment' },
      { fieldPath: 'intro[2].body', fieldKind: 'intro_body', frenchText: 'Dans les magasins anglophones, le vendeur demande souvent : Can I help you? Tu peux répondre : Yes, can I try this on? Ou demander directement : Where is the fitting room? On t’indiquera le chemin.' },
      { fieldPath: 'intro[2].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Oui, puis-je essayer ceci ?' },
      { fieldPath: 'intro[2].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'La cabine d’essayage est là-bas.' },
      { fieldPath: 'phrases.echo_d26_p1.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demande polie avec can' },
      { fieldPath: 'phrases.echo_d26_p1.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Can I + action? sert à demander la permission. Can I try this on? signifie « puis-je essayer ceci ? »' },
      { fieldPath: 'phrases.echo_d26_p1.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Can sonne simple et poli. C’est exactement comme on parle dans les magasins.' },
      { fieldPath: 'phrases.echo_d26_p1.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « I can try this on? » : la question commence par Can, pas par I.' },
      { fieldPath: 'phrases.echo_d26_p2.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Les questions avec Where' },
      { fieldPath: 'phrases.echo_d26_p2.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Where is + lieu? sert à demander où se trouve quelque chose.' },
      { fieldPath: 'phrases.echo_d26_p2.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Where + is est l’ordre standard pour demander « où ». Sans is, ce n’est pas une question correcte.' },
      { fieldPath: 'phrases.echo_d26_p2.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « Where the fitting room is? » : is va juste après Where.' },
      { fieldPath: 'phrases.echo_d26_p3.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Try on + nom du vêtement' },
      { fieldPath: 'phrases.echo_d26_p3.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Tu peux nommer le vêtement : try on this jacket signifie essayer cette veste.' },
      { fieldPath: 'phrases.echo_d26_p3.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Ainsi, tu dis exactement ce que tu veux essayer. C’est très utile dans une conversation.' },
      { fieldPath: 'phrases.echo_d26_p3.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne mélange pas l’ordre : try on this jacket est correct, pas « try this on jacket ».' },
      { fieldPath: 'phrases.echo_d26_p4.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'La réponse du vendeur : « là-bas »' },
      { fieldPath: 'phrases.echo_d26_p4.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Over there signifie « là-bas », un peu plus loin. Le vendeur indique la direction.' },
      { fieldPath: 'phrases.echo_d26_p4.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Over there est plus précis que there : cela indique que l’endroit est un peu éloigné.' },
      { fieldPath: 'phrases.echo_d26_p4.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas seulement « is over there » sans sujet : on ne comprend pas de quoi tu parles.' },
      { fieldPath: 'phrases.echo_d26_p5.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander une autre taille' },
      { fieldPath: 'phrases.echo_d26_p5.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Smaller signifie plus petit. Can I try a smaller size? veut dire demander une taille plus petite.' },
      { fieldPath: 'phrases.echo_d26_p5.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'La forme comparative aide à dire exactement ce qu’il te faut : bigger ou smaller.' },
      { fieldPath: 'phrases.echo_d26_p5.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « more small » : la forme correcte est smaller. Les mots courts n’utilisent pas more.' },
      { fieldPath: 'phrases.echo_d26_p6.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Where + can : demander où tu peux faire quelque chose' },
      { fieldPath: 'phrases.echo_d26_p6.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Where can I + action? signifie « où puis-je faire quelque chose ? ». C’est très utile dans un grand magasin.' },
      { fieldPath: 'phrases.echo_d26_p6.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Cette forme combine où et la possibilité en une seule question.' },
      { fieldPath: 'phrases.echo_d26_p6.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « Where I can find » : can va juste après Where, pas après I.' },
      { fieldPath: 'vocabulary.try.translation', fieldKind: 'vocabulary_translation', frenchText: 'essayer' },
      { fieldPath: 'vocabulary.fitting.translation', fieldKind: 'vocabulary_translation', frenchText: 'd’essayage' },
      { fieldPath: 'vocabulary.room.translation', fieldKind: 'vocabulary_translation', frenchText: 'salle, pièce' },
      { fieldPath: 'vocabulary.jacket.translation', fieldKind: 'vocabulary_translation', frenchText: 'veste' },
      { fieldPath: 'vocabulary.smaller.translation', fieldKind: 'vocabulary_translation', frenchText: 'plus petit' },
      { fieldPath: 'vocabulary.size.translation', fieldKind: 'vocabulary_translation', frenchText: 'taille' },
    ],
  },
  {
    dayIndex: 27,
    fields: [
      { fieldPath: 'topic', fieldKind: 'day_topic', frenchText: 'Rendre ou échanger un article' },
      { fieldPath: 'outcome', fieldKind: 'day_outcome', frenchText: 'Tu peux rendre un article et expliquer pourquoi il ne te convient pas.' },
      { fieldPath: 'intro[0].title', fieldKind: 'intro_title', frenchText: 'Comment demander un retour' },
      { fieldPath: 'intro[0].body', fieldKind: 'intro_body', frenchText: 'Quand un article ne te convient pas, dis : « I would like to return this » : je voudrais rendre ceci. Ou : « I would like to exchange this » : échanger ceci. Would like est une demande polie qui fonctionne toujours en magasin.' },
      { fieldPath: 'intro[0].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Je voudrais rendre ceci.' },
      { fieldPath: 'intro[0].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Je voudrais échanger cette veste.' },
      { fieldPath: 'intro[1].title', fieldKind: 'intro_title', frenchText: 'Comment expliquer pourquoi cela ne va pas' },
      { fieldPath: 'intro[1].body', fieldKind: 'intro_body', frenchText: 'Dis au vendeur quel est le problème. It does not fit : cela ne me va pas. It does not work : cela ne fonctionne pas. It is too big : c’est trop grand. I do not have a receipt : je n’ai pas le reçu.' },
      { fieldPath: 'intro[1].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Cela ne me va pas. C’est trop petit.' },
      { fieldPath: 'intro[1].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Cela ne fonctionne pas. Puis-je l’échanger ?' },
      { fieldPath: 'intro[2].title', fieldKind: 'intro_title', frenchText: 'Ce qu’il faut apporter au magasin' },
      { fieldPath: 'intro[2].body', fieldKind: 'intro_body', frenchText: 'Au magasin, on peut te demander : Do you have a receipt? Réponds : Yes, I have a receipt ou No, I do not have a receipt. En anglais, le reçu se dit receipt.' },
      { fieldPath: 'intro[2].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Avez-vous le reçu ?' },
      { fieldPath: 'intro[2].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Oui, j’ai le reçu.' },
      { fieldPath: 'phrases.echo_d27_p1.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demande polie pour un retour' },
      { fieldPath: 'phrases.echo_d27_p1.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Would like est une façon polie de demander quelque chose. C’est plus doux que I want.' },
      { fieldPath: 'phrases.echo_d27_p1.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Dans un magasin, would like sonne respectueux. Le vendeur comprend tout de suite.' },
      { fieldPath: 'phrases.echo_d27_p1.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « I want return » : la forme correcte est « I would like to return ».' },
      { fieldPath: 'phrases.echo_d27_p2.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Dire que la taille n’est pas correcte' },
      { fieldPath: 'phrases.echo_d27_p2.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Does not s’utilise avec it, he et she. Cela signifie que quelque chose ne fait pas ou ne convient pas.' },
      { fieldPath: 'phrases.echo_d27_p2.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Fit signifie aller ou convenir. Does not fit est la phrase clé pour rendre un vêtement.' },
      { fieldPath: 'phrases.echo_d27_p2.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « It not fit » : la forme correcte est « It does not fit ».' },
      { fieldPath: 'phrases.echo_d27_p3.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander une autre taille' },
      { fieldPath: 'phrases.echo_d27_p3.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Can I...? demande si quelque chose est possible ou permis. C’est simple et clair.' },
      { fieldPath: 'phrases.echo_d27_p3.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Exchange signifie échanger. Another size signifie une autre taille. C’est court et clair pour le vendeur.' },
      { fieldPath: 'phrases.echo_d27_p3.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « May you exchange » : c’est incorrect. Dis « Can I exchange ».' },
      { fieldPath: 'phrases.echo_d27_p4.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Dire que tu n’as pas le reçu' },
      { fieldPath: 'phrases.echo_d27_p4.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Do not have signifie que tu n’as pas quelque chose. Avec I et you, on utilise do not.' },
      { fieldPath: 'phrases.echo_d27_p4.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Receipt signifie reçu. Ce mot est important quand tu fais un retour en magasin.' },
      { fieldPath: 'phrases.echo_d27_p4.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « I not have » : la forme correcte est « I do not have ».' },
      { fieldPath: 'phrases.echo_d27_p5.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Expliquer le problème de taille' },
      { fieldPath: 'phrases.echo_d27_p5.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Too avant un adjectif signifie trop : too small, trop petit ; too big, trop grand.' },
      { fieldPath: 'phrases.echo_d27_p5.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Le vendeur comprend immédiatement le problème si tu dis too small ou too big.' },
      { fieldPath: 'phrases.echo_d27_p5.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas very small à la place de too small : too indique que la taille ne convient pas.' },
      { fieldPath: 'phrases.echo_d27_p6.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander le remboursement' },
      { fieldPath: 'phrases.echo_d27_p6.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Can I get... back? est la phrase habituelle quand tu veux récupérer quelque chose que tu as donné.' },
      { fieldPath: 'phrases.echo_d27_p6.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'My money back signifie mon argent rendu. Cette phrase se comprend dans les magasins partout.' },
      { fieldPath: 'phrases.echo_d27_p6.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « Can I take money back » : la forme correcte est « Can I get my money back ».' },
      { fieldPath: 'vocabulary.return.translation', fieldKind: 'vocabulary_translation', frenchText: 'rendre, retourner' },
      { fieldPath: 'vocabulary.exchange.translation', fieldKind: 'vocabulary_translation', frenchText: 'échanger' },
      { fieldPath: 'vocabulary.fit.translation', fieldKind: 'vocabulary_translation', frenchText: 'aller, convenir' },
      { fieldPath: 'vocabulary.receipt.translation', fieldKind: 'vocabulary_translation', frenchText: 'reçu, ticket de caisse' },
      { fieldPath: 'vocabulary.small.translation', fieldKind: 'vocabulary_translation', frenchText: 'petit' },
      { fieldPath: 'vocabulary.money.translation', fieldKind: 'vocabulary_translation', frenchText: 'argent' },
    ],
  },
  {
    dayIndex: 28,
    fields: [
      { fieldPath: 'topic', fieldKind: 'day_topic', frenchText: 'Révision : achats, tailles, paiement' },
      { fieldPath: 'outcome', fieldKind: 'day_outcome', frenchText: 'Tu pourras demander le prix, la taille et le mode de paiement dans un magasin.' },
      { fieldPath: 'intro[0].title', fieldKind: 'intro_title', frenchText: 'Comment demander le prix et la taille ?' },
      { fieldPath: 'intro[0].body', fieldKind: 'intro_body', frenchText: 'Dans un magasin, tu dois demander le prix, la taille et comment payer. Trois questions simples, et tu peux déjà te débrouiller. Aujourd’hui, tu réunis tout cela.' },
      { fieldPath: 'intro[0].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Combien coûte cette veste ?' },
      { fieldPath: 'intro[0].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Puis-je payer par carte ?' },
      { fieldPath: 'intro[1].title', fieldKind: 'intro_title', frenchText: 'Comment expliquer ce dont tu as besoin ?' },
      { fieldPath: 'intro[1].body', fieldKind: 'intro_body', frenchText: 'Si la taille n’est pas la bonne, dis-le. Si tu veux une autre couleur, dis-le aussi. Une phrase courte vaut mieux que le silence.' },
      { fieldPath: 'intro[1].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Je cherche une taille plus grande.' },
      { fieldPath: 'intro[1].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Avez-vous ceci en bleu ?' },
      { fieldPath: 'intro[2].title', fieldKind: 'intro_title', frenchText: 'Comment demander de l’aide poliment ?' },
      { fieldPath: 'intro[2].body', fieldKind: 'intro_body', frenchText: 'Le mot can rend ta demande polie et claire. Mets-le au début et le vendeur comprend que tu demandes, pas que tu exiges.' },
      { fieldPath: 'intro[2].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Puis-je essayer ceci ?' },
      { fieldPath: 'intro[2].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Pouvez-vous me montrer un autre modèle ?' },
      { fieldPath: 'phrases.echo_d28_p1.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander le prix' },
      { fieldPath: 'phrases.echo_d28_p1.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'How much sert à demander le prix. Ensuite, on met is et on nomme l’objet.' },
      { fieldPath: 'phrases.echo_d28_p1.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'C’est la façon la plus courte de demander le prix dans n’importe quel magasin.' },
      { fieldPath: 'phrases.echo_d28_p1.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « How much costs » : l’ordre des mots est incorrect.' },
      { fieldPath: 'phrases.echo_d28_p2.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Dire que tu as besoin d’une autre taille' },
      { fieldPath: 'phrases.echo_d28_p2.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Am looking for indique que tu cherches maintenant. Bigger signifie plus grand.' },
      { fieldPath: 'phrases.echo_d28_p2.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'La phrase sonne polie et claire : c’est une explication, pas une exigence.' },
      { fieldPath: 'phrases.echo_d28_p2.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « I look for bigger » : il faut am looking, sinon cela sonne étrange.' },
      { fieldPath: 'phrases.echo_d28_p3.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander le mode de paiement' },
      { fieldPath: 'phrases.echo_d28_p3.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Can I est une question polie pour demander la permission. Pay signifie payer, by card signifie par carte.' },
      { fieldPath: 'phrases.echo_d28_p3.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Dans différents pays, les cartes ne sont pas toujours acceptées. Il vaut mieux demander avant.' },
      { fieldPath: 'phrases.echo_d28_p3.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas May I pay dans un magasin ordinaire : May sonne trop formel.' },
      { fieldPath: 'phrases.echo_d28_p4.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander où est la cabine' },
      { fieldPath: 'phrases.echo_d28_p4.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Where is sert à demander le lieu. Avec cette forme, tu trouves ce dont tu as besoin dans un magasin.' },
      { fieldPath: 'phrases.echo_d28_p4.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Une question courte suffit, et tu n’as pas besoin de chercher partout toi-même.' },
      { fieldPath: 'phrases.echo_d28_p4.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « Where are the fitting room » : c’est une seule cabine, donc on utilise is.' },
      { fieldPath: 'phrases.echo_d28_p5.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander la taille nécessaire' },
      { fieldPath: 'phrases.echo_d28_p5.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Do you have demande si quelque chose est disponible. In small signifie en petite taille.' },
      { fieldPath: 'phrases.echo_d28_p5.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Il est plus simple de demander que de chercher seul la taille dans les rayons.' },
      { fieldPath: 'phrases.echo_d28_p5.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « Have you this » : on dit Do you have, sinon cela sonne incorrect.' },
      { fieldPath: 'phrases.echo_d28_p6.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Expliquer pourquoi tu es venu' },
      { fieldPath: 'phrases.echo_d28_p6.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Am buying indique que tu achètes maintenant. Someone désigne n’importe quelle personne.' },
      { fieldPath: 'phrases.echo_d28_p6.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Quand tu expliques ton but, le vendeur peut te proposer les bonnes options.' },
      { fieldPath: 'phrases.echo_d28_p6.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « I buy a gift now » : il faut am buying parce que cela se passe maintenant.' },
      { fieldPath: 'vocabulary.shirt.translation', fieldKind: 'vocabulary_translation', frenchText: 'chemise' },
      { fieldPath: 'vocabulary.bigger.translation', fieldKind: 'vocabulary_translation', frenchText: 'plus grand' },
      { fieldPath: 'vocabulary.card.translation', fieldKind: 'vocabulary_translation', frenchText: 'carte' },
      { fieldPath: 'vocabulary.fitting room.translation', fieldKind: 'vocabulary_translation', frenchText: 'cabine d’essayage' },
      { fieldPath: 'vocabulary.small.translation', fieldKind: 'vocabulary_translation', frenchText: 'petit, taille S' },
      { fieldPath: 'vocabulary.gift.translation', fieldKind: 'vocabulary_translation', frenchText: 'cadeau' },
    ],
  },
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function padDay(dayIndex: number): string {
  return String(dayIndex).padStart(3, '0');
}

function phraseLedgerName(dayIndex: number): string {
  const start = Math.floor((dayIndex - 1) / 10) * 10 + 1;
  const end = Math.min(start + 9, 84);
  return `echo_days_${padDay(start)}_${padDay(end)}_phrase_fr_rows.jsonl`;
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasCyrillic(value: string): boolean {
  return /[\u0400-\u04FF]/.test(value);
}

function hasMojibake(value: string): boolean {
  return /(?:\u00c2|\u00c3|\u00d0|\u00d1|\ufffd|\?{3,})/.test(value);
}

function tsvCell(value: unknown): string {
  return String(value ?? '').replace(/\r?\n/g, ' ').replace(/\t/g, ' ').trim();
}

function lineCount(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  const text = fs.readFileSync(filePath, 'utf8').trim();
  return text ? text.split(/\r?\n/).length : 0;
}

function rowIdFromPath(dayIndex: number, fieldPath: string): string {
  return `fr_echo_d${padDay(dayIndex)}_${fieldPath.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase()}`;
}

function resolveSource(day: any, fieldPath: string): any {
  if (fieldPath === 'topic') return day.topic;
  if (fieldPath === 'outcome') return day.outcome;

  let match = fieldPath.match(/^intro\[(\d+)\]\.(title|body)$/);
  if (match) return day.intro?.[Number(match[1])]?.[match[2]];

  match = fieldPath.match(/^intro\[(\d+)\]\.examples\[(\d+)\]\.gloss$/);
  if (match) return day.intro?.[Number(match[1])]?.examples?.[Number(match[2])]?.gloss;

  match = fieldPath.match(/^phrases\.([^.]+)\.explanation\.(title|rule|why|commonMistake)$/);
  if (match) return day.phrases?.find((phrase: any) => phrase.id === match?.[1])?.explanation?.[match[2]];

  match = fieldPath.match(/^vocabulary\.(.+)\.translation$/);
  if (match) return day.vocabulary?.find((vocab: any) => vocab.word === match?.[1])?.translation;

  return undefined;
}

function resolveEnglishAnchor(day: any, fieldPath: string): string | undefined {
  let match = fieldPath.match(/^intro\[(\d+)\]\.examples\[(\d+)\]\.gloss$/);
  if (match) return day.intro?.[Number(match[1])]?.examples?.[Number(match[2])]?.en;

  match = fieldPath.match(/^phrases\.([^.]+)\.explanation\./);
  if (match) return day.phrases?.find((phrase: any) => phrase.id === match?.[1])?.english;

  match = fieldPath.match(/^vocabulary\.(.+)\.translation$/);
  if (match) return day.vocabulary?.find((vocab: any) => vocab.word === match?.[1])?.example;

  return undefined;
}

async function readEchoDays(repoRoot: string): Promise<any[]> {
  const sourcePath = path.resolve(repoRoot, 'app/plan_content_echo.ts');
  const mod = await import(pathToFileURL(sourcePath).href);
  const days = mod.ECHO_CONTENT_DAYS ?? mod.default?.ECHO_CONTENT_DAYS;
  return Array.isArray(days) ? days : [];
}

function renderMarkdown(report: any): string {
  return [
    `# GUSTAV Personal Plan Echo Day ${padDay(report.summary.dayIndex)} French Full-Day Text Packet`,
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    ...Object.entries(report.summary).map(([key, value]) => `- ${key}: \`${value}\``),
    '',
    '## Field Kind Counts',
    '',
    ...Object.entries(report.fieldKindCounts).map(([key, value]) => `- \`${key}\`: ${value}`),
    '',
    '## Outputs',
    '',
    `- Rows JSONL: \`${report.outputs.rowsJsonl}\``,
    `- Reviewer queue TSV: \`${report.outputs.reviewerQueueTsv}\``,
    `- Packet JSON: \`${report.outputs.packetJson}\``,
    `- Packet MD: \`${report.outputs.packetMd}\``,
    '',
    '## Findings',
    '',
    ...(report.findings.length ? report.findings.map((finding: Finding) => `- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`) : ['- None.']),
    '',
    '## Safety',
    '',
    '- This packet did not modify production app files.',
    '- This packet did not modify source plan files.',
    '- This packet did not write reviewer decisions.',
    '- This packet does not authorize production app apply.',
    '',
  ].join('\n');
}

function renderBatchMarkdown(batchReport: any): string {
  return [
    '# GUSTAV Personal Plan Echo Days 026-028 French Full-Day Text Packets',
    '',
    `Run: \`${batchReport.runId}\``,
    '',
    `Status: \`${batchReport.status}\``,
    '',
    `Generated at: ${batchReport.generatedAt}`,
    '',
    '## Summary',
    '',
    ...Object.entries(batchReport.summary).map(([key, value]) => `- ${key}: \`${value}\``),
    '',
    '## Day Results',
    '',
    ...batchReport.dayReports.map((report: any) => `- Day ${padDay(report.summary.dayIndex)}: \`${report.status}\`, rows \`${report.summary.generatedRows}/${report.summary.expectedRows}\`, reviewers \`${report.summary.rowsWithReviewerNeedsReview}\`, apply \`${report.summary.readyForApply}\``),
    '',
  ].join('\n');
}

function buildRows(day: any, pack: DayPack, findings: Finding[], sourcePath: string, repoRoot: string): any[] {
  return pack.fields.map((field) => {
    const source = resolveSource(day, field.fieldPath);
    if (!hasText(source?.ru) && !hasText(source?.es)) addFinding(findings, 'blocker', 'full_day_source_field_missing', `Missing source text for ${field.fieldPath}.`, rel(repoRoot, sourcePath));
    return {
      rowId: rowIdFromPath(pack.dayIndex, field.fieldPath),
      targetLocale: 'fr',
      planId: PLAN_ID,
      dayIndex: pack.dayIndex,
      fieldPath: field.fieldPath,
      fieldKind: field.fieldKind,
      englishAnchor: resolveEnglishAnchor(day, field.fieldPath),
      sourcePreview: { ru: source?.ru, uk: source?.uk, es: source?.es },
      frenchText: field.frenchText,
      reviewerStatus: 'needs_review',
      activationApproved: false,
      generatedBy: GENERATED_BY,
    };
  });
}

async function generateDay(repoRoot: string, runDir: string, pack: DayPack, day: any): Promise<any> {
  const dayPad = padDay(pack.dayIndex);
  const outDir = path.join(runDir, 'generated', 'fr', 'app_domains', 'personal_plan', 'echo', 'full_day');
  const auditsDir = path.join(runDir, 'audits');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(auditsDir, { recursive: true });

  const sourcePath = path.resolve(repoRoot, 'app/plan_content_echo.ts');
  const phraseMeaningRowsPath = path.join(runDir, 'generated', 'fr', 'app_domains', 'personal_plan', 'echo', phraseLedgerName(pack.dayIndex));
  const rowsPath = path.join(outDir, `echo_day_${dayPad}_full_day_fr_rows.jsonl`);
  const reviewerQueuePath = path.join(outDir, `echo_day_${dayPad}_full_day_fr_reviewer_queue.tsv`);
  const packetJsonPath = path.join(auditsDir, `personal_plan_echo_day${dayPad}_french_full_day_text_packet.json`);
  const packetMdPath = path.join(auditsDir, `personal_plan_echo_day${dayPad}_french_full_day_text_packet.md`);

  const findings: Finding[] = [];
  if (!day) addFinding(findings, 'blocker', `echo_day_${dayPad}_missing`, `Echo day ${pack.dayIndex} is missing from source content.`, rel(repoRoot, sourcePath));

  let existingPhraseMeaningRowsForDay = 0;
  if (!fs.existsSync(phraseMeaningRowsPath)) {
    addFinding(findings, 'blocker', 'phrase_meaning_rows_missing', `Echo day ${pack.dayIndex} phrase meaning rows are missing.`, rel(repoRoot, phraseMeaningRowsPath));
  } else {
    const phraseRows = fs.readFileSync(phraseMeaningRowsPath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
    existingPhraseMeaningRowsForDay = phraseRows.filter((row) => row.dayIndex === pack.dayIndex && row.reviewerStatus === 'needs_review' && row.activationApproved === false).length;
    if (existingPhraseMeaningRowsForDay !== 6) addFinding(findings, 'blocker', `phrase_meaning_rows_day_${dayPad}_incomplete`, `Expected 6 reviewer-needed phrase meaning rows for Echo day ${pack.dayIndex} but found ${existingPhraseMeaningRowsForDay}.`, rel(repoRoot, phraseMeaningRowsPath));
  }

  const rows = day ? buildRows(day, pack, findings, sourcePath, repoRoot) : [];
  const expectedRows = pack.fields.length;
  const duplicateFieldPaths = rows.length - new Set(rows.map((row) => row.fieldPath)).size;
  const duplicateRowIds = rows.length - new Set(rows.map((row) => row.rowId)).size;
  const missingSourceFields = rows.filter((row) => !hasText(row.sourcePreview.ru) && !hasText(row.sourcePreview.es)).length;
  const missingFrenchFields = rows.filter((row) => !hasText(row.frenchText)).length;
  const cyrillicLeaksInFrenchFields = rows.filter((row) => hasCyrillic(row.frenchText)).length;
  const mojibakeFrenchFields = rows.filter((row) => hasMojibake(row.frenchText)).length;
  const activationApprovedRows = rows.filter((row) => row.activationApproved).length;

  if (rows.length !== expectedRows) addFinding(findings, 'blocker', 'full_day_generated_row_count_mismatch', `Generated ${rows.length} rows; expected ${expectedRows}.`);
  if (duplicateFieldPaths > 0) addFinding(findings, 'blocker', 'full_day_duplicate_field_paths', `Generated rows have ${duplicateFieldPaths} duplicate field paths.`);
  if (duplicateRowIds > 0) addFinding(findings, 'blocker', 'full_day_duplicate_row_ids', `Generated rows have ${duplicateRowIds} duplicate row ids.`);
  if (missingSourceFields > 0) addFinding(findings, 'blocker', 'full_day_missing_source_fields', `Generated rows have ${missingSourceFields} missing source fields.`);
  if (missingFrenchFields > 0) addFinding(findings, 'blocker', 'full_day_missing_french_fields', `Generated rows have ${missingFrenchFields} missing French fields.`);
  if (cyrillicLeaksInFrenchFields > 0) addFinding(findings, 'blocker', 'full_day_cyrillic_leak_in_french_fields', `Generated rows have ${cyrillicLeaksInFrenchFields} Cyrillic leaks in French fields.`);
  if (mojibakeFrenchFields > 0) addFinding(findings, 'blocker', 'full_day_mojibake_in_french_fields', `Generated rows have ${mojibakeFrenchFields} mojibake markers in French fields.`);
  if (activationApprovedRows > 0) addFinding(findings, 'blocker', 'full_day_rows_activation_approved', 'Generated full-day rows must not be activation-approved.');

  fs.writeFileSync(rowsPath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
  const tsvHeader = ['rowId', 'targetLocale', 'planId', 'dayIndex', 'fieldPath', 'fieldKind', 'englishAnchor', 'sourceEs', 'frenchText', 'reviewerStatus', 'activationApproved'];
  const tsvRows = rows.map((row) => [
    row.rowId,
    row.targetLocale,
    row.planId,
    row.dayIndex,
    row.fieldPath,
    row.fieldKind,
    row.englishAnchor ?? '',
    row.sourcePreview.es ?? '',
    row.frenchText,
    row.reviewerStatus,
    row.activationApproved,
  ].map(tsvCell).join('\t'));
  fs.writeFileSync(reviewerQueuePath, `${tsvHeader.join('\t')}\n${tsvRows.join('\n')}\n`, 'utf8');

  const jsonlRows = lineCount(rowsPath);
  const tsvLineCount = lineCount(reviewerQueuePath);
  if (jsonlRows !== rows.length) addFinding(findings, 'blocker', 'jsonl_row_count_mismatch', `Rows JSONL has ${jsonlRows} lines; expected ${rows.length}.`, rel(repoRoot, rowsPath));
  if (tsvLineCount !== rows.length + 1) addFinding(findings, 'blocker', 'reviewer_tsv_row_count_mismatch', `Reviewer TSV has ${tsvLineCount} lines; expected ${rows.length + 1}.`, rel(repoRoot, reviewerQueuePath));

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const rowsWithReviewerNeedsReview = rows.filter((row) => row.reviewerStatus === 'needs_review').length;
  const fieldKindCounts = rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.fieldKind] = (counts[row.fieldKind] ?? 0) + 1;
    return counts;
  }, {});

  const report = {
    schemaVersion: `gustav-personal-plan-echo-day${dayPad}-french-full-day-text-packet-v0`,
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' as Status : 'BLOCK' as Status,
    inputs: { sourceFile: rel(repoRoot, sourcePath), phraseMeaningRows: rel(repoRoot, phraseMeaningRowsPath), planId: PLAN_ID, dayIndex: pack.dayIndex },
    outputs: { rowsJsonl: rel(repoRoot, rowsPath), reviewerQueueTsv: rel(repoRoot, reviewerQueuePath), packetJson: rel(repoRoot, packetJsonPath), packetMd: rel(repoRoot, packetMdPath) },
    summary: {
      planId: PLAN_ID,
      dayIndex: pack.dayIndex,
      expectedRows,
      generatedRows: rows.length,
      rowsWithFrench: rows.filter((row) => hasText(row.frenchText)).length,
      rowsWithReviewerNeedsReview,
      activationApprovedRows,
      duplicateFieldPaths,
      duplicateRowIds,
      missingSourceFields,
      missingFrenchFields,
      cyrillicLeaksInFrenchFields,
      mojibakeFrenchFields,
      existingPhraseMeaningRowsForDay,
      blockers,
      warnings,
      readyForReviewer: blockers === 0 && rowsWithReviewerNeedsReview === rows.length,
      readyForFrenchFullDayTextReview: blockers === 0 && rows.length === expectedRows,
      readyForFullPlanActivation: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    fieldKindCounts,
    generationPolicy: [
      `This packet translates Echo day ${pack.dayIndex} full-day text fields except phrase meanings, which are already covered by the phrase-meaning layer.`,
      'Generated rows are reviewer-needed by default.',
      'No generated full-day row is activation-approved.',
      'Source plan files are read-only inputs.',
      'This packet writes only GUSTAV pipeline outputs and audit artifacts.',
      'Production app apply remains blocked until reviewer decisions and explicit app-write approval exist.',
    ],
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      sourcePlanFilesModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      productionApplyApproved: false,
    },
  };

  fs.writeFileSync(packetJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(packetMdPath, `${renderMarkdown(report)}\n`, 'utf8');

  return report;
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_personal_plan_echo_days026_028_french_full_day_text_packets.ts --run <run-dir>');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const days = await readEchoDays(repoRoot);
  const dayReports = [];

  for (const pack of DAY_PACKS) {
    const day = days.find((item) => item.planId === PLAN_ID && item.dayIndex === pack.dayIndex);
    dayReports.push(await generateDay(repoRoot, runDir, pack, day));
  }

  const auditsDir = path.join(runDir, 'audits');
  const batchJsonPath = path.join(auditsDir, 'personal_plan_echo_days026_028_french_full_day_text_packets.json');
  const batchMdPath = path.join(auditsDir, 'personal_plan_echo_days026_028_french_full_day_text_packets.md');
  const totalBlockers = dayReports.reduce((sum, report) => sum + report.summary.blockers, 0);
  const totalWarnings = dayReports.reduce((sum, report) => sum + report.summary.warnings, 0);
  const batchReport = {
    schemaVersion: 'gustav-personal-plan-echo-days026-028-french-full-day-text-packets-v0',
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status: totalBlockers === 0 ? 'PASS' as Status : 'BLOCK' as Status,
    days: [...DAY_INDICES],
    summary: {
      daysCovered: dayReports.length,
      expectedRows: dayReports.reduce((sum, report) => sum + report.summary.expectedRows, 0),
      generatedRows: dayReports.reduce((sum, report) => sum + report.summary.generatedRows, 0),
      rowsWithFrench: dayReports.reduce((sum, report) => sum + report.summary.rowsWithFrench, 0),
      rowsWithReviewerNeedsReview: dayReports.reduce((sum, report) => sum + report.summary.rowsWithReviewerNeedsReview, 0),
      activationApprovedRows: dayReports.reduce((sum, report) => sum + report.summary.activationApprovedRows, 0),
      blockers: totalBlockers,
      warnings: totalWarnings,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    dayReports,
  };

  fs.writeFileSync(batchJsonPath, `${JSON.stringify(batchReport, null, 2)}\n`, 'utf8');
  fs.writeFileSync(batchMdPath, `${renderBatchMarkdown(batchReport)}\n`, 'utf8');

  console.log(`GUSTAV Echo days 026-028 French full-day text packets: ${batchReport.status}`);
  console.log(`Generated rows: ${batchReport.summary.generatedRows}/${batchReport.summary.expectedRows}`);
  console.log(`Rows with French: ${batchReport.summary.rowsWithFrench}`);
  console.log(`Rows needing reviewer: ${batchReport.summary.rowsWithReviewerNeedsReview}`);
  console.log(`Activation-approved rows: ${batchReport.summary.activationApprovedRows}`);
  console.log(`Blockers: ${batchReport.summary.blockers}`);
  console.log(`Warnings: ${batchReport.summary.warnings}`);
  console.log(`Ready for apply: ${batchReport.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${batchReport.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, batchJsonPath)}`);

  if (batchReport.status !== 'PASS') process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
