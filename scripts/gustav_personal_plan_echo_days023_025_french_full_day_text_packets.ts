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

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type TranslationField = {
  fieldPath: string;
  fieldKind: FieldKind;
  frenchText: string;
};

type DayPack = {
  dayIndex: number;
  fields: TranslationField[];
};

const PLAN_ID = 'echo' as const;
const DAY_INDICES = [23, 24, 25] as const;
const GENERATED_BY = 'gustav_personal_plan_echo_days023_025_french_full_day_text_packets' as const;

const DAY_PACKS: DayPack[] = [
  {
    dayIndex: 23,
    fields: [
      { fieldPath: 'topic', fieldKind: 'day_topic', frenchText: 'Demander une autre taille ou couleur' },
      { fieldPath: 'outcome', fieldKind: 'day_outcome', frenchText: 'Tu peux demander dans un magasin s’ils ont ta taille ou ta couleur, et expliquer que ce que tu as ne te va pas bien.' },
      { fieldPath: 'intro[0].title', fieldKind: 'intro_title', frenchText: 'Comment demander une autre couleur ou taille' },
      { fieldPath: 'intro[0].body', fieldKind: 'intro_body', frenchText: 'Dans un magasin, il est facile de demander une autre couleur ou taille. Commence par « Do you have this in...? » : cela signifie « Avez-vous ceci en...? ». Ensuite, dis la couleur ou la taille.' },
      { fieldPath: 'intro[0].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Avez-vous ceci en bleu ?' },
      { fieldPath: 'intro[0].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Avez-vous une taille plus grande ?' },
      { fieldPath: 'intro[1].title', fieldKind: 'intro_title', frenchText: 'Des mots pour les tailles et les couleurs' },
      { fieldPath: 'intro[1].body', fieldKind: 'intro_body', frenchText: 'Tailles : small, medium, large. Pour comparer : smaller, larger. Couleurs : blue, red, black, white, green. Ces mots viennent après « in ».' },
      { fieldPath: 'intro[1].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Puis-je essayer une taille plus petite ?' },
      { fieldPath: 'intro[1].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'J’ai besoin de ceci en taille M, s’il vous plaît.' },
      { fieldPath: 'intro[2].title', fieldKind: 'intro_title', frenchText: 'Comment dire que la taille ne te va pas' },
      { fieldPath: 'intro[2].body', fieldKind: 'intro_body', frenchText: 'Si quelque chose ne te va pas bien, dis : « This is too small » ou « too large ». Too signifie « trop », pas seulement « très ». C’est une différence importante.' },
      { fieldPath: 'intro[2].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Celui-ci est trop petit pour moi.' },
      { fieldPath: 'intro[2].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'En quelles couleurs existe ce modèle ?' },
      { fieldPath: 'phrases.echo_d23_p1.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander une couleur' },
      { fieldPath: 'phrases.echo_d23_p1.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Do you have...? est la façon habituelle de demander si quelque chose est disponible.' },
      { fieldPath: 'phrases.echo_d23_p1.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Le mot Do au début transforme l’affirmation en question. C’est le modèle normal.' },
      { fieldPath: 'phrases.echo_d23_p1.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « Have you this? » : en anglais courant, on dit « Do you have this? ».' },
      { fieldPath: 'phrases.echo_d23_p2.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander à essayer une autre taille' },
      { fieldPath: 'phrases.echo_d23_p2.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Can I...? est une demande polie de permission. Smaller signifie plus petit que la taille actuelle.' },
      { fieldPath: 'phrases.echo_d23_p2.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Can rend la question aimable, pas exigeante. C’est très naturel dans un magasin.' },
      { fieldPath: 'phrases.echo_d23_p2.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « Can I try smaller size? » : il faut l’article a avant smaller size.' },
      { fieldPath: 'phrases.echo_d23_p3.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander une taille plus grande' },
      { fieldPath: 'phrases.echo_d23_p3.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Larger signifie « plus grand ». Mets-le avant size pour préciser la taille.' },
      { fieldPath: 'phrases.echo_d23_p3.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'A larger size n’est pas seulement une grande taille : c’est une taille plus grande que celle que tu as.' },
      { fieldPath: 'phrases.echo_d23_p3.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « more large size » : la forme correcte est « a larger size ».' },
      { fieldPath: 'phrases.echo_d23_p4.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander les couleurs disponibles' },
      { fieldPath: 'phrases.echo_d23_p4.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'What colours does this come in? signifie littéralement « en quelles couleurs cela vient ? », donc « quelles couleurs sont disponibles ? »' },
      { fieldPath: 'phrases.echo_d23_p4.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Come in est ici une expression fixe : être disponible dans une couleur ou une version.' },
      { fieldPath: 'phrases.echo_d23_p4.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « What colours has this? » : la forme naturelle est « does this come in ».' },
      { fieldPath: 'phrases.echo_d23_p5.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Dire que la taille ne convient pas' },
      { fieldPath: 'phrases.echo_d23_p5.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Too signifie « trop » : quelque chose pose problème. Too small veut dire trop petit, donc il faut plus grand.' },
      { fieldPath: 'phrases.echo_d23_p5.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Too et very ne sont pas identiques : very small veut seulement dire très petit, sans forcément dire que c’est un problème.' },
      { fieldPath: 'phrases.echo_d23_p5.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne remplace pas too par very si tu veux dire que la taille ne va pas.' },
      { fieldPath: 'phrases.echo_d23_p6.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Dire la taille dont tu as besoin' },
      { fieldPath: 'phrases.echo_d23_p6.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'I need this in medium indique exactement ce qu’il te faut. C’est direct et clair.' },
      { fieldPath: 'phrases.echo_d23_p6.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'In medium fonctionne comme « en taille M » : la préposition in vient avant la taille.' },
      { fieldPath: 'phrases.echo_d23_p6.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « I need this medium » : la préposition in est obligatoire avant la taille.' },
      { fieldPath: 'vocabulary.blue.translation', fieldKind: 'vocabulary_translation', frenchText: 'bleu' },
      { fieldPath: 'vocabulary.smaller.translation', fieldKind: 'vocabulary_translation', frenchText: 'plus petit' },
      { fieldPath: 'vocabulary.larger.translation', fieldKind: 'vocabulary_translation', frenchText: 'plus grand' },
      { fieldPath: 'vocabulary.colours.translation', fieldKind: 'vocabulary_translation', frenchText: 'couleurs' },
      { fieldPath: 'vocabulary.small.translation', fieldKind: 'vocabulary_translation', frenchText: 'petit' },
      { fieldPath: 'vocabulary.medium.translation', fieldKind: 'vocabulary_translation', frenchText: 'moyen, taille M' },
    ],
  },
  {
    dayIndex: 24,
    fields: [
      { fieldPath: 'topic', fieldKind: 'day_topic', frenchText: 'Décrire ce que tu cherches' },
      { fieldPath: 'outcome', fieldKind: 'day_outcome', frenchText: 'Tu peux expliquer au vendeur exactement ce dont tu as besoin : couleur, taille, article.' },
      { fieldPath: 'intro[0].title', fieldKind: 'intro_title', frenchText: 'Comment dire ce que tu cherches' },
      { fieldPath: 'intro[0].body', fieldKind: 'intro_body', frenchText: 'Quand tu cherches quelque chose dans un magasin, dis : I am looking for... puis nomme la chose. Cela fonctionne toujours : une veste, des chaussures, une taille précise.' },
      { fieldPath: 'intro[0].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Je cherche une veste bleue.' },
      { fieldPath: 'intro[0].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Elle cherche la taille M.' },
      { fieldPath: 'intro[1].title', fieldKind: 'intro_title', frenchText: 'Précise la couleur ou la taille' },
      { fieldPath: 'intro[1].body', fieldKind: 'intro_body', frenchText: 'Ajoute un adjectif avant le nom et le vendeur comprendra exactement. I am looking for a red bag. I need a large size. Simple et clair.' },
      { fieldPath: 'intro[1].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Je cherche un sac rouge.' },
      { fieldPath: 'intro[1].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'J’ai besoin d’une grande taille.' },
      { fieldPath: 'intro[2].title', fieldKind: 'intro_title', frenchText: 'Utile à savoir' },
      { fieldPath: 'intro[2].body', fieldKind: 'intro_body', frenchText: 'Do you have...? signifie « Avez-vous...? ». C’est une question au vendeur. I am looking for... est une explication. Utilise les deux et on te comprendra sans problème.' },
      { fieldPath: 'intro[2].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Avez-vous ceci en noir ?' },
      { fieldPath: 'intro[2].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Je cherche une chemise blanche.' },
      { fieldPath: 'phrases.echo_d24_p1.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'La formule I am looking for' },
      { fieldPath: 'phrases.echo_d24_p1.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'I am + looking indique ce que tu fais maintenant dans le magasin.' },
      { fieldPath: 'phrases.echo_d24_p1.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Ainsi, le vendeur comprend que tu cherches déjà quelque chose et que tu as besoin d’aide.' },
      { fieldPath: 'phrases.echo_d24_p1.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « I look for » dans cette situation : cela sonne étrange dans une vraie conversation en magasin.' },
      { fieldPath: 'phrases.echo_d24_p2.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'La formule She is looking for' },
      { fieldPath: 'phrases.echo_d24_p2.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Avec she ou he, on utilise is, pas am. She is looking signifie qu’elle cherche maintenant.' },
      { fieldPath: 'phrases.echo_d24_p2.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Le mot is change selon la personne. C’est essentiel pour être compris.' },
      { fieldPath: 'phrases.echo_d24_p2.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « She am » ni « She are » : avec she, on utilise toujours is.' },
      { fieldPath: 'phrases.echo_d24_p3.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Do you have... in...?' },
      { fieldPath: 'phrases.echo_d24_p3.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Do you have + objet + in + couleur sert à demander s’ils ont la version dont tu as besoin.' },
      { fieldPath: 'phrases.echo_d24_p3.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'In black, in red, in large : c’est une façon pratique de préciser sans longues phrases.' },
      { fieldPath: 'phrases.echo_d24_p3.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « Have you this » : do you have est correct et naturel.' },
      { fieldPath: 'phrases.echo_d24_p4.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'I need a larger...' },
      { fieldPath: 'phrases.echo_d24_p4.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'I need + adjectif en -er sert à demander quelque chose de plus grand, plus petit ou meilleur.' },
      { fieldPath: 'phrases.echo_d24_p4.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Larger signifie plus grand : un seul mot évite de devoir expliquer avec des gestes.' },
      { fieldPath: 'phrases.echo_d24_p4.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « more large » : la forme correcte est larger.' },
      { fieldPath: 'phrases.echo_d24_p5.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'La formule We are looking for' },
      { fieldPath: 'phrases.echo_d24_p5.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Avec we, on utilise are, pas am ni is. We are looking signifie que nous cherchons maintenant.' },
      { fieldPath: 'phrases.echo_d24_p5.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Quand tu es accompagné, dis we are et le vendeur comprendra tout de suite.' },
      { fieldPath: 'phrases.echo_d24_p5.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « We is » ni « We am » : avec we, on utilise toujours are.' },
      { fieldPath: 'phrases.echo_d24_p6.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Couleur + vêtement' },
      { fieldPath: 'phrases.echo_d24_p6.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'La couleur va avant le nom : white shirt, blue jacket, red bag. C’est toujours cet ordre.' },
      { fieldPath: 'phrases.echo_d24_p6.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'En anglais, l’adjectif va avant le nom. Apprends cette règle une fois et utilise-la partout.' },
      { fieldPath: 'phrases.echo_d24_p6.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « shirt white » : en anglais, la couleur vient d’abord, puis le vêtement.' },
      { fieldPath: 'vocabulary.looking.translation', fieldKind: 'vocabulary_translation', frenchText: 'en train de chercher' },
      { fieldPath: 'vocabulary.jacket.translation', fieldKind: 'vocabulary_translation', frenchText: 'veste' },
      { fieldPath: 'vocabulary.size.translation', fieldKind: 'vocabulary_translation', frenchText: 'taille' },
      { fieldPath: 'vocabulary.larger.translation', fieldKind: 'vocabulary_translation', frenchText: 'plus grand' },
      { fieldPath: 'vocabulary.shoes.translation', fieldKind: 'vocabulary_translation', frenchText: 'chaussures' },
      { fieldPath: 'vocabulary.shirt.translation', fieldKind: 'vocabulary_translation', frenchText: 'chemise' },
    ],
  },
  {
    dayIndex: 25,
    fields: [
      { fieldPath: 'topic', fieldKind: 'day_topic', frenchText: 'Acheter de la nourriture au marché' },
      { fieldPath: 'outcome', fieldKind: 'day_outcome', frenchText: 'Tu pourras demander un produit au marché, poser une question sur la quantité et le prix.' },
      { fieldPath: 'intro[0].title', fieldKind: 'intro_title', frenchText: 'Comment demander quelque chose poliment' },
      { fieldPath: 'intro[0].body', fieldKind: 'intro_body', frenchText: 'Au marché, il est utile de commencer une demande par « I would like », qui signifie « je voudrais ». Cela sonne poli et n’importe quel vendeur le comprend. Ensuite, dis ce dont tu as besoin.' },
      { fieldPath: 'intro[0].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Je voudrais des tomates, s’il vous plaît.' },
      { fieldPath: 'intro[0].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Je voudrais deux kilos de pommes, s’il vous plaît.' },
      { fieldPath: 'intro[1].title', fieldKind: 'intro_title', frenchText: 'Ce qu’il y a à vendre : there is et there are' },
      { fieldPath: 'intro[1].body', fieldKind: 'intro_body', frenchText: 'Pour dire que quelque chose est disponible, utilise there is pour une chose ou there are pour plusieurs. Le vendeur peut te dire ce qu’il y a, ou tu peux poser la question.' },
      { fieldPath: 'intro[1].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Il y a des oranges fraîches aujourd’hui.' },
      { fieldPath: 'intro[1].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Il ne reste plus de pain.' },
      { fieldPath: 'intro[2].title', fieldKind: 'intro_title', frenchText: 'Comment demander le prix et la quantité' },
      { fieldPath: 'intro[2].body', fieldKind: 'intro_body', frenchText: 'Les deux questions les plus utiles au marché sont « How much? », qui signifie « combien ça coûte ? », et « Can I have...? », qui signifie « puis-je avoir...? ». Les deux sont courtes et fonctionnent à n’importe quel stand.' },
      { fieldPath: 'intro[2].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Combien coûte un kilo de pommes de terre ?' },
      { fieldPath: 'intro[2].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Puis-je avoir un sac, s’il vous plaît ?' },
      { fieldPath: 'phrases.echo_d25_p1.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demande polie : I would like' },
      { fieldPath: 'phrases.echo_d25_p1.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'I would like est une façon polie de dire « je veux ». Tu le dis, puis tu ajoutes ce dont tu as besoin.' },
      { fieldPath: 'phrases.echo_d25_p1.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'I want peut sonner brusque. I would like est aimable et respectueux.' },
      { fieldPath: 'phrases.echo_d25_p1.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « two kilo » après un nombre : au pluriel, on dit kilos.' },
      { fieldPath: 'phrases.echo_d25_p2.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Dire ce qui est disponible : there are' },
      { fieldPath: 'phrases.echo_d25_p2.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'There are sert à dire qu’il y a plusieurs choses à un endroit.' },
      { fieldPath: 'phrases.echo_d25_p2.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Sans there are, on ne comprend pas clairement que ces choses sont disponibles là-bas.' },
      { fieldPath: 'phrases.echo_d25_p2.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « There is fresh vegetables » : pour plusieurs objets, utilise there are.' },
      { fieldPath: 'phrases.echo_d25_p3.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander le prix : How much is...?' },
      { fieldPath: 'phrases.echo_d25_p3.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'How much is est une question courte sur le prix. Ensuite, tu nommes le produit.' },
      { fieldPath: 'phrases.echo_d25_p3.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'C’est la façon la plus simple de demander le prix. Un vendeur la comprendra partout.' },
      { fieldPath: 'phrases.echo_d25_p3.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « How much costs? » : la forme correcte est « How much is...? ».' },
      { fieldPath: 'phrases.echo_d25_p4.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander quelque chose : Can I have...?' },
      { fieldPath: 'phrases.echo_d25_p4.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Can I have sert à demander quelque chose de précis. C’est poli et clair.' },
      { fieldPath: 'phrases.echo_d25_p4.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'C’est plus court que I would like et très pratique pour de petites demandes au comptoir.' },
      { fieldPath: 'phrases.echo_d25_p4.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « a bags » : après a, le nom doit être singulier, donc a bag.' },
      { fieldPath: 'phrases.echo_d25_p5.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Dire qu’il n’y a plus quelque chose : there is no' },
      { fieldPath: 'phrases.echo_d25_p5.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'There is no sert à dire que quelque chose n’existe pas ou n’est pas disponible.' },
      { fieldPath: 'phrases.echo_d25_p5.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'C’est plus court et plus naturel que « There is not any bread ».' },
      { fieldPath: 'phrases.echo_d25_p5.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « There are no bread » : bread ne se compte pas ici, donc there is no bread.' },
      { fieldPath: 'phrases.echo_d25_p6.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander une quantité indéfinie : some' },
      { fieldPath: 'phrases.echo_d25_p6.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Some devant de la nourriture signifie « un peu » ou « une certaine quantité ». Pas besoin de mesure exacte.' },
      { fieldPath: 'phrases.echo_d25_p6.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Some est utile quand tu ne connais pas le mot exact pour la mesure.' },
      { fieldPath: 'phrases.echo_d25_p6.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas any dans une demande positive : any sert surtout aux questions et aux négations, some sert aux demandes.' },
      { fieldPath: 'vocabulary.market.translation', fieldKind: 'vocabulary_translation', frenchText: 'marché' },
      { fieldPath: 'vocabulary.kilo.translation', fieldKind: 'vocabulary_translation', frenchText: 'kilo' },
      { fieldPath: 'vocabulary.vegetables.translation', fieldKind: 'vocabulary_translation', frenchText: 'légumes' },
      { fieldPath: 'vocabulary.apples.translation', fieldKind: 'vocabulary_translation', frenchText: 'pommes' },
      { fieldPath: 'vocabulary.bread.translation', fieldKind: 'vocabulary_translation', frenchText: 'pain' },
      { fieldPath: 'vocabulary.fish.translation', fieldKind: 'vocabulary_translation', frenchText: 'poisson' },
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

  match = fieldPath.match(/^vocabulary\.([^.]+)\.translation$/);
  if (match) return day.vocabulary?.find((vocab: any) => vocab.word === match?.[1])?.translation;

  return undefined;
}

function resolveEnglishAnchor(day: any, fieldPath: string): string | undefined {
  let match = fieldPath.match(/^intro\[(\d+)\]\.examples\[(\d+)\]\.gloss$/);
  if (match) return day.intro?.[Number(match[1])]?.examples?.[Number(match[2])]?.en;

  match = fieldPath.match(/^phrases\.([^.]+)\.explanation\./);
  if (match) return day.phrases?.find((phrase: any) => phrase.id === match?.[1])?.english;

  match = fieldPath.match(/^vocabulary\.([^.]+)\.translation$/);
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
    '# GUSTAV Personal Plan Echo Days 023-025 French Full-Day Text Packets',
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
    throw new Error('Usage: npx tsx scripts/gustav_personal_plan_echo_days023_025_french_full_day_text_packets.ts --run <run-dir>');
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
  const batchJsonPath = path.join(auditsDir, 'personal_plan_echo_days023_025_french_full_day_text_packets.json');
  const batchMdPath = path.join(auditsDir, 'personal_plan_echo_days023_025_french_full_day_text_packets.md');
  const totalBlockers = dayReports.reduce((sum, report) => sum + report.summary.blockers, 0);
  const totalWarnings = dayReports.reduce((sum, report) => sum + report.summary.warnings, 0);
  const batchReport = {
    schemaVersion: 'gustav-personal-plan-echo-days023-025-french-full-day-text-packets-v0',
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

  console.log(`GUSTAV Echo days 023-025 French full-day text packets: ${batchReport.status}`);
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
