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
const DAY_INDICES = [29, 30, 31] as const;
const GENERATED_BY = 'gustav_personal_plan_echo_days029_031_french_full_day_text_packets' as const;

const DAY_PACKS: DayPack[] = [
  {
    dayIndex: 29,
    fields: [
      { fieldPath: 'topic', fieldKind: 'day_topic', frenchText: 'Commander dans un café' },
      { fieldPath: 'outcome', fieldKind: 'day_outcome', frenchText: 'Tu pourras commander dans un café en anglais de façon polie et claire.' },
      { fieldPath: 'intro[0].title', fieldKind: 'intro_title', frenchText: 'Comment commander poliment dans un café' },
      { fieldPath: 'intro[0].body', fieldKind: 'intro_body', frenchText: 'Dans un café en anglais, il est pratique de dire : I would like... Cela signifie « je voudrais... ». C’est poli et n’importe quel serveur le comprend. Tu peux ajouter please à la fin : cela sonne encore mieux.' },
      { fieldPath: 'intro[0].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Je voudrais un café, s’il vous plaît.' },
      { fieldPath: 'intro[0].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Je voudrais un sandwich, s’il vous plaît.' },
      { fieldPath: 'intro[1].title', fieldKind: 'intro_title', frenchText: 'Can I have... : une autre façon simple de commander' },
      { fieldPath: 'intro[1].body', fieldKind: 'intro_body', frenchText: 'Une autre formule pratique est Can I have...? Cela veut dire « puis-je avoir...? ». C’est naturel et cela se comprend dans n’importe quel café ou restaurant.' },
      { fieldPath: 'intro[1].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Puis-je avoir le menu, s’il vous plaît ?' },
      { fieldPath: 'intro[1].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Puis-je avoir un verre d’eau ?' },
      { fieldPath: 'intro[2].title', fieldKind: 'intro_title', frenchText: 'Des mots qui t’aideront dans un café' },
      { fieldPath: 'intro[2].body', fieldKind: 'intro_body', frenchText: 'Quelques mots utiles dans un café : coffee, tea, sandwich, water, menu, please, thank you. Avec cela, tu peux déjà faire presque n’importe quelle commande simple.' },
      { fieldPath: 'intro[2].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Je voudrais un thé, s’il vous plaît.' },
      { fieldPath: 'intro[2].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Merci beaucoup.' },
      { fieldPath: 'phrases.echo_d29_p1.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Une façon polie de demander un café' },
      { fieldPath: 'phrases.echo_d29_p1.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'I would like + ce que tu veux est une demande polie. On l’utilise à la place de I want.' },
      { fieldPath: 'phrases.echo_d29_p1.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Would like sonne plus doux et plus poli que want. Les serveurs l’entendent très souvent.' },
      { fieldPath: 'phrases.echo_d29_p1.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « I want coffee » si tu veux être poli : dis plutôt « I would like a coffee ».' },
      { fieldPath: 'phrases.echo_d29_p2.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Comment demander le menu' },
      { fieldPath: 'phrases.echo_d29_p2.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Can I have + ce dont tu as besoin? sert à demander qu’on te donne quelque chose.' },
      { fieldPath: 'phrases.echo_d29_p2.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Can I have est l’une des phrases les plus courantes dans un café en anglais.' },
      { fieldPath: 'phrases.echo_d29_p2.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « Give me the menu » : c’est brusque. Can I have sonne poli.' },
      { fieldPath: 'phrases.echo_d29_p3.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Ajouter quelque chose à la commande' },
      { fieldPath: 'phrases.echo_d29_p3.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Too à la fin signifie « aussi ». Tu peux l’ajouter à une demande au café.' },
      { fieldPath: 'phrases.echo_d29_p3.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Too aide à ajouter un autre élément à la commande sans phrase longue.' },
      { fieldPath: 'phrases.echo_d29_p3.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne confonds pas too, « aussi », et two, « deux ». Ils se prononcent pareil, mais s’écrivent différemment.' },
      { fieldPath: 'phrases.echo_d29_p4.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander s’ils ont quelque chose au menu' },
      { fieldPath: 'phrases.echo_d29_p4.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Do you have + ce que tu cherches? signifie « avez-vous...? ». C’est très utile au café.' },
      { fieldPath: 'phrases.echo_d29_p4.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'C’est ainsi qu’on demande si un produit ou un plat est disponible.' },
      { fieldPath: 'phrases.echo_d29_p4.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « You have hot chocolate? » sans Do au début : cela sonne incorrect.' },
      { fieldPath: 'phrases.echo_d29_p5.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Choisir une place dans le café' },
      { fieldPath: 'phrases.echo_d29_p5.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'We can + action signifie « nous pouvons... ». On l’utilise pour parler de ce qui est possible.' },
      { fieldPath: 'phrases.echo_d29_p5.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Can exprime une possibilité ou une suggestion. C’est utile pour choisir une place.' },
      { fieldPath: 'phrases.echo_d29_p5.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « We can to sit » : après can, le verbe vient sans to.' },
      { fieldPath: 'phrases.echo_d29_p6.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Dire que quelque chose est bon' },
      { fieldPath: 'phrases.echo_d29_p6.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Sujet + tastes + description sert à parler du goût. The coffee tastes good signifie que le café est bon.' },
      { fieldPath: 'phrases.echo_d29_p6.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Tastes good est une phrase standard pour complimenter une boisson ou un plat.' },
      { fieldPath: 'phrases.echo_d29_p6.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas taste good sans s : avec the coffee, il faut tastes.' },
      { fieldPath: 'vocabulary.coffee.translation', fieldKind: 'vocabulary_translation', frenchText: 'café' },
      { fieldPath: 'vocabulary.sandwich.translation', fieldKind: 'vocabulary_translation', frenchText: 'sandwich' },
      { fieldPath: 'vocabulary.menu.translation', fieldKind: 'vocabulary_translation', frenchText: 'menu' },
      { fieldPath: 'vocabulary.chocolate.translation', fieldKind: 'vocabulary_translation', frenchText: 'chocolat' },
      { fieldPath: 'vocabulary.window.translation', fieldKind: 'vocabulary_translation', frenchText: 'fenêtre' },
      { fieldPath: 'vocabulary.tastes.translation', fieldKind: 'vocabulary_translation', frenchText: 'a bon goût' },
    ],
  },
  {
    dayIndex: 30,
    fields: [
      { fieldPath: 'topic', fieldKind: 'day_topic', frenchText: 'Demander ce que contient le plat' },
      { fieldPath: 'outcome', fieldKind: 'day_outcome', frenchText: 'Tu peux demander au serveur ce que contient le plat et confirmer les ingrédients.' },
      { fieldPath: 'intro[0].title', fieldKind: 'intro_title', frenchText: 'Comment demander ce que contient le plat' },
      { fieldPath: 'intro[0].body', fieldKind: 'intro_body', frenchText: 'Pour savoir ce que contient un plat, commence la question avec Does. Dis ensuite this dish ou this soup, puis have et le nom de l’ingrédient. C’est une formule simple et polie que tout serveur comprend.' },
      { fieldPath: 'intro[0].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Cette soupe contient-elle de la viande ?' },
      { fieldPath: 'intro[0].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Ce plat contient-il des œufs ?' },
      { fieldPath: 'intro[1].title', fieldKind: 'intro_title', frenchText: 'Confirme encore plus simplement' },
      { fieldPath: 'intro[1].body', fieldKind: 'intro_body', frenchText: 'Si tu ne comprends pas la réponse, tu peux demander directement : It has chicken? Ou simplement répéter le mot avec une intonation de question. Les serveurs ont l’habitude d’aider, n’aie pas peur de redemander.' },
      { fieldPath: 'intro[1].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Est-ce qu’il y a des noix dedans ?' },
      { fieldPath: 'intro[1].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Je ne mange pas de viande.' },
      { fieldPath: 'intro[2].title', fieldKind: 'intro_title', frenchText: 'C’est utile à savoir' },
      { fieldPath: 'intro[2].body', fieldKind: 'intro_body', frenchText: 'Dans les cafés et restaurants à l’étranger, demander les ingrédients d’un plat est tout à fait normal. Surtout si tu as une allergie ou si tu ne manges pas certains aliments. Parle calmement et poliment, et on t’aidera.' },
      { fieldPath: 'intro[2].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Cette salade contient-elle du fromage ?' },
      { fieldPath: 'intro[2].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'J’ai une allergie au poisson.' },
      { fieldPath: 'phrases.echo_d30_p1.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander s’il y a de la viande' },
      { fieldPath: 'phrases.echo_d30_p1.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Does + ce plat + have + ingrédient sert à poser une question sur les ingrédients.' },
      { fieldPath: 'phrases.echo_d30_p1.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Does transforme une affirmation en question sur un fait.' },
      { fieldPath: 'phrases.echo_d30_p1.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « Is this dish have » : c’est incorrect. Utilise Does.' },
      { fieldPath: 'phrases.echo_d30_p2.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Confirmer un ingrédient précis' },
      { fieldPath: 'phrases.echo_d30_p2.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'In it à la fin signifie « dedans ». Cela rend la question plus naturelle et familière.' },
      { fieldPath: 'phrases.echo_d30_p2.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'C’est une façon très courante de parler dans un café ou un restaurant.' },
      { fieldPath: 'phrases.echo_d30_p2.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « have chicken inside » : in it sonne plus naturel dans la conversation.' },
      { fieldPath: 'phrases.echo_d30_p3.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Dire ce que tu ne manges pas' },
      { fieldPath: 'phrases.echo_d30_p3.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'I do not eat + ingrédient permet de dire au serveur que tu ne manges pas cet aliment.' },
      { fieldPath: 'phrases.echo_d30_p3.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'C’est une phrase courte et claire : le serveur comprend et peut t’aider.' },
      { fieldPath: 'phrases.echo_d30_p3.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « I not eat » : il faut do not avant le verbe.' },
      { fieldPath: 'phrases.echo_d30_p4.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander s’il y a des œufs' },
      { fieldPath: 'phrases.echo_d30_p4.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'La même formule Does + plat + have fonctionne pour n’importe quel ingrédient.' },
      { fieldPath: 'phrases.echo_d30_p4.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Une seule formule permet de poser beaucoup de questions : tu changes seulement le nom de l’ingrédient.' },
      { fieldPath: 'phrases.echo_d30_p4.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « Do this salad » : pour une chose au singulier, utilise Does.' },
      { fieldPath: 'phrases.echo_d30_p5.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Parler d’une allergie' },
      { fieldPath: 'phrases.echo_d30_p5.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'I have + a + nom du problème sert à parler de ta situation.' },
      { fieldPath: 'phrases.echo_d30_p5.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Le serveur comprend tout de suite et peut vérifier les ingrédients pour toi.' },
      { fieldPath: 'phrases.echo_d30_p5.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « I am allergy » : dis « I have an allergy » ou « I have a nut allergy ».' },
      { fieldPath: 'phrases.echo_d30_p6.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Question courte sur les ingrédients' },
      { fieldPath: 'phrases.echo_d30_p6.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Does it have any + ingrédient sert à poser une question courte quand le plat a déjà été mentionné.' },
      { fieldPath: 'phrases.echo_d30_p6.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Any dans une question signifie « même un peu ». Cela sonne poli et doux.' },
      { fieldPath: 'phrases.echo_d30_p6.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « Does it has » : après does, on utilise have.' },
      { fieldPath: 'vocabulary.meat.translation', fieldKind: 'vocabulary_translation', frenchText: 'viande' },
      { fieldPath: 'vocabulary.chicken.translation', fieldKind: 'vocabulary_translation', frenchText: 'poulet' },
      { fieldPath: 'vocabulary.fish.translation', fieldKind: 'vocabulary_translation', frenchText: 'poisson' },
      { fieldPath: 'vocabulary.eggs.translation', fieldKind: 'vocabulary_translation', frenchText: 'œufs' },
      { fieldPath: 'vocabulary.allergy.translation', fieldKind: 'vocabulary_translation', frenchText: 'allergie' },
      { fieldPath: 'vocabulary.cheese.translation', fieldKind: 'vocabulary_translation', frenchText: 'fromage' },
    ],
  },
  {
    dayIndex: 31,
    fields: [
      { fieldPath: 'topic', fieldKind: 'day_topic', frenchText: 'Demander l’addition' },
      { fieldPath: 'outcome', fieldKind: 'day_outcome', frenchText: 'Tu pourras demander l’addition poliment dans un café ou un restaurant.' },
      { fieldPath: 'intro[0].title', fieldKind: 'intro_title', frenchText: 'Comment demander l’addition poliment' },
      { fieldPath: 'intro[0].body', fieldKind: 'intro_body', frenchText: 'Dans un café, il ne faut pas crier ni faire de grands signes. Il suffit de dire « Can I have the bill, please? » et le serveur comprend. Le mot can transforme la phrase en demande polie, pas en exigence.' },
      { fieldPath: 'intro[0].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Puis-je avoir l’addition, s’il vous plaît ?' },
      { fieldPath: 'intro[0].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'L’addition est-elle prête ?' },
      { fieldPath: 'intro[1].title', fieldKind: 'intro_title', frenchText: 'Can et have : une excellente paire' },
      { fieldPath: 'intro[1].body', fieldKind: 'intro_body', frenchText: 'Can I have...? est une formule prête pour presque n’importe quelle demande. Can signifie « puis-je ? » et have signifie « avoir ». Ensemble, ils sonnent doux et naturels dans n’importe quel café.' },
      { fieldPath: 'intro[1].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Puis-je avoir un peu d’eau, s’il vous plaît ?' },
      { fieldPath: 'intro[1].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Puis-je avoir le menu, s’il vous plaît ?' },
      { fieldPath: 'intro[2].title', fieldKind: 'intro_title', frenchText: 'Bill ou check ?' },
      { fieldPath: 'intro[2].body', fieldKind: 'intro_body', frenchText: 'Bill est l’addition en anglais britannique. Check est la version américaine. Les deux mots sont compris presque partout. Dans ce cours, nous utilisons bill : c’est court et courant dans les cafés d’Europe.' },
      { fieldPath: 'intro[2].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Puis-je avoir l’addition, s’il vous plaît ?' },
      { fieldPath: 'intro[2].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Puis-je avoir l’addition, s’il vous plaît ?' },
      { fieldPath: 'phrases.echo_d31_p1.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demande polie avec can' },
      { fieldPath: 'phrases.echo_d31_p1.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Can I have...? sert à demander quelque chose poliment. Can vient d’abord, puis I, puis have.' },
      { fieldPath: 'phrases.echo_d31_p1.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Sans can, la phrase sonne brusque : « I have the bill » est une affirmation, pas une demande.' },
      { fieldPath: 'phrases.echo_d31_p1.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « I can have » : l’ordre des mots change le sens et la demande disparaît.' },
      { fieldPath: 'phrases.echo_d31_p2.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Dire que le repas est terminé' },
      { fieldPath: 'phrases.echo_d31_p2.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Have + finished indique que tu viens de terminer quelque chose. We have signifie « nous avons ».' },
      { fieldPath: 'phrases.echo_d31_p2.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Ainsi, le serveur comprend que tu es prêt à payer et que tu attends l’addition.' },
      { fieldPath: 'phrases.echo_d31_p2.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas seulement « We finished our meal » ici : avec have, cela sonne plus naturel dans ce contexte.' },
      { fieldPath: 'phrases.echo_d31_p3.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander si l’addition est prête' },
      { fieldPath: 'phrases.echo_d31_p3.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Do you have...? sert à demander si quelqu’un a quelque chose. Do vient avant you.' },
      { fieldPath: 'phrases.echo_d31_p3.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Ready indique que l’addition est déjà calculée et qu’il n’y a pas besoin d’attendre.' },
      { fieldPath: 'phrases.echo_d31_p3.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « Have you the bill » : sans do, la question sonne incorrecte.' },
      { fieldPath: 'phrases.echo_d31_p4.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander une seule addition pour le groupe' },
      { fieldPath: 'phrases.echo_d31_p4.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Can we...? sert à demander la permission au nom d’un groupe. We signifie nous.' },
      { fieldPath: 'phrases.echo_d31_p4.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Together indique qu’il y a une seule addition pour tout le monde, sans séparation.' },
      { fieldPath: 'phrases.echo_d31_p4.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne confonds pas Can we et Can I : we est pour le groupe, I seulement pour toi.' },
      { fieldPath: 'phrases.echo_d31_p5.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Dire que tu es prêt à payer par carte' },
      { fieldPath: 'phrases.echo_d31_p5.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'I have + objet indique que tu as quelque chose avec toi maintenant.' },
      { fieldPath: 'phrases.echo_d31_p5.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'With me précise que la carte n’est pas à la maison, mais ici avec toi.' },
      { fieldPath: 'phrases.echo_d31_p5.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne traduis pas littéralement depuis ta langue : with me est simple et naturel ici.' },
      { fieldPath: 'phrases.echo_d31_p6.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander le mode de paiement' },
      { fieldPath: 'phrases.echo_d31_p6.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Can I pay by...? sert à demander si tu peux utiliser ce moyen de paiement.' },
      { fieldPath: 'phrases.echo_d31_p6.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'By card signifie par carte, sans espèces. Tous les cafés n’acceptent pas les cartes.' },
      { fieldPath: 'phrases.echo_d31_p6.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « Can I pay with card » sans the : la forme habituelle est by card.' },
      { fieldPath: 'vocabulary.bill.translation', fieldKind: 'vocabulary_translation', frenchText: 'addition' },
      { fieldPath: 'vocabulary.pay.translation', fieldKind: 'vocabulary_translation', frenchText: 'payer' },
      { fieldPath: 'vocabulary.card.translation', fieldKind: 'vocabulary_translation', frenchText: 'carte' },
      { fieldPath: 'vocabulary.ready.translation', fieldKind: 'vocabulary_translation', frenchText: 'prêt' },
      { fieldPath: 'vocabulary.together.translation', fieldKind: 'vocabulary_translation', frenchText: 'ensemble' },
      { fieldPath: 'vocabulary.finished.translation', fieldKind: 'vocabulary_translation', frenchText: 'terminé' },
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
    '# GUSTAV Personal Plan Echo Days 029-031 French Full-Day Text Packets',
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
    throw new Error('Usage: npx tsx scripts/gustav_personal_plan_echo_days029_031_french_full_day_text_packets.ts --run <run-dir>');
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
  const batchJsonPath = path.join(auditsDir, 'personal_plan_echo_days029_031_french_full_day_text_packets.json');
  const batchMdPath = path.join(auditsDir, 'personal_plan_echo_days029_031_french_full_day_text_packets.md');
  const totalBlockers = dayReports.reduce((sum, report) => sum + report.summary.blockers, 0);
  const totalWarnings = dayReports.reduce((sum, report) => sum + report.summary.warnings, 0);
  const batchReport = {
    schemaVersion: 'gustav-personal-plan-echo-days029-031-french-full-day-text-packets-v0',
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

  console.log(`GUSTAV Echo days 029-031 French full-day text packets: ${batchReport.status}`);
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
