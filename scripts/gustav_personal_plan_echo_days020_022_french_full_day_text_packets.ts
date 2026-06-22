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
const DAY_INDICES = [20, 21, 22] as const;
const GENERATED_BY = 'gustav_personal_plan_echo_days020_022_french_full_day_text_packets' as const;

const DAY_PACKS: DayPack[] = [
  {
    dayIndex: 20,
    fields: [
      { fieldPath: 'topic', fieldKind: 'day_topic', frenchText: 'Dire ce que tu prévois de lire' },
      { fieldPath: 'outcome', fieldKind: 'day_outcome', frenchText: 'Tu peux parler de tes projets de lecture : ce que tu vas lire et quand.' },
      { fieldPath: 'intro[0].title', fieldKind: 'intro_title', frenchText: 'Comment dire que tu vas lire quelque chose' },
      { fieldPath: 'intro[0].body', fieldKind: 'intro_body', frenchText: 'Quand tu veux parler d’un livre que tu penses lire, utilise « will » ou « I am going to ». Dans cette leçon, nous utiliserons « will », idéal pour parler de plans décidés sur le moment.' },
      { fieldPath: 'intro[0].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Je commencerai ce livre demain.' },
      { fieldPath: 'intro[0].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Elle lira un nouveau roman cette semaine.' },
      { fieldPath: 'intro[1].title', fieldKind: 'intro_title', frenchText: 'Ajoute « je veux » ou « je devrais »' },
      { fieldPath: 'intro[1].body', fieldKind: 'intro_body', frenchText: 'Tu peux aussi utiliser « want to » (je veux) ou « should » (je devrais) pour indiquer si c’est un désir ou une nécessité. Ces mots viennent toujours avant l’action principale.' },
      { fieldPath: 'intro[1].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Je veux finir cet article ce soir.' },
      { fieldPath: 'intro[1].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Tu devrais lire ce magazine.' },
      { fieldPath: 'intro[2].title', fieldKind: 'intro_title', frenchText: 'Des mots pour dire quand' },
      { fieldPath: 'intro[2].body', fieldKind: 'intro_body', frenchText: 'Ajoute un mot de temps et le plan devient clair. Utilise tomorrow, next week, tonight, this weekend. Ces mots vont à la fin de la phrase.' },
      { fieldPath: 'intro[2].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'J’achèterai ce livre la semaine prochaine.' },
      { fieldPath: 'intro[2].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Il finira l’article ce soir.' },
      { fieldPath: 'phrases.echo_d20_p1.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: '« Will » pour parler d’un plan maintenant' },
      { fieldPath: 'phrases.echo_d20_p1.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Will + action exprime un plan ou une intention. La forme est la même pour tout le monde.' },
      { fieldPath: 'phrases.echo_d20_p1.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Tu parles de quelque chose que tu penses faire. Will start signifie « je commencerai ».' },
      { fieldPath: 'phrases.echo_d20_p1.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « I will to start » : après will, l’action vient directement, sans to.' },
      { fieldPath: 'phrases.echo_d20_p2.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: '« A » avant une première mention' },
      { fieldPath: 'phrases.echo_d20_p2.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'A va avant un nom quand on le mentionne pour la première fois et qu’on ne sait pas encore exactement lequel.' },
      { fieldPath: 'phrases.echo_d20_p2.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'A new novel signifie simplement un nouveau roman, sans dire encore lequel.' },
      { fieldPath: 'phrases.echo_d20_p2.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'N’oublie pas a : sans cet article, la phrase sonne comme si le roman était déjà connu.' },
      { fieldPath: 'phrases.echo_d20_p3.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: '« Want to » pour exprimer un désir' },
      { fieldPath: 'phrases.echo_d20_p3.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Want to + action exprime le désir de faire quelque chose.' },
      { fieldPath: 'phrases.echo_d20_p3.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Want to finish signifie « vouloir finir ». Tu parles d’une intention, pas d’une action immédiate.' },
      { fieldPath: 'phrases.echo_d20_p3.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « I want finish » : après want, il faut to avant l’action.' },
      { fieldPath: 'phrases.echo_d20_p4.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: '« Should » pour donner un conseil doux' },
      { fieldPath: 'phrases.echo_d20_p4.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Should + action sert à conseiller, pas à donner un ordre. C’est une suggestion polie.' },
      { fieldPath: 'phrases.echo_d20_p4.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'You should read signifie « tu devrais lire ». Tu recommandes sans imposer.' },
      { fieldPath: 'phrases.echo_d20_p4.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « You should to read » : après should, l’action vient directement, sans to.' },
      { fieldPath: 'phrases.echo_d20_p5.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: '« Next week » : un moment précis dans le futur' },
      { fieldPath: 'phrases.echo_d20_p5.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Les mots de temps comme next week ou tomorrow vont souvent à la fin de la phrase et précisent le plan.' },
      { fieldPath: 'phrases.echo_d20_p5.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Next week rend le plan précis : pas « un jour », mais la semaine prochaine.' },
      { fieldPath: 'phrases.echo_d20_p5.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne place pas next week au hasard : dans cette phrase, la position naturelle est à la fin.' },
      { fieldPath: 'phrases.echo_d20_p6.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: '« The » pour une chose précise et connue' },
      { fieldPath: 'phrases.echo_d20_p6.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'The va avant un nom quand les deux personnes savent déjà de quoi on parle.' },
      { fieldPath: 'phrases.echo_d20_p6.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'The article désigne un article précis, déjà mentionné ou connu.' },
      { fieldPath: 'phrases.echo_d20_p6.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne confonds pas a et the : a pour la première mention, the quand on sait déjà lequel.' },
      { fieldPath: 'vocabulary.start.translation', fieldKind: 'vocabulary_translation', frenchText: 'commencer' },
      { fieldPath: 'vocabulary.novel.translation', fieldKind: 'vocabulary_translation', frenchText: 'roman' },
      { fieldPath: 'vocabulary.article.translation', fieldKind: 'vocabulary_translation', frenchText: 'article' },
      { fieldPath: 'vocabulary.magazine.translation', fieldKind: 'vocabulary_translation', frenchText: 'magazine' },
      { fieldPath: 'vocabulary.buy.translation', fieldKind: 'vocabulary_translation', frenchText: 'acheter' },
      { fieldPath: 'vocabulary.finish.translation', fieldKind: 'vocabulary_translation', frenchText: 'finir, terminer' },
    ],
  },
  {
    dayIndex: 21,
    fields: [
      { fieldPath: 'topic', fieldKind: 'day_topic', frenchText: 'Révision : médias et opinions' },
      { fieldPath: 'outcome', fieldKind: 'day_outcome', frenchText: 'Tu pourras raconter ce que tu as lu, comparer deux sources et dire ce que tu prévois de regarder ou d’écouter ensuite.' },
      { fieldPath: 'intro[0].title', fieldKind: 'intro_title', frenchText: 'À quoi cela sert' },
      { fieldPath: 'intro[0].body', fieldKind: 'intro_body', frenchText: 'Aujourd’hui, tu révises trois compétences importantes : raconter ce que tu as déjà lu ou regardé, comparer deux contenus entre eux et partager tes plans pour la prochaine fois. Ce sont des conversations normales sur les nouvelles, les livres et les films.' },
      { fieldPath: 'intro[0].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Hier, j’ai lu un article intéressant.' },
      { fieldPath: 'intro[0].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Ce journal est plus détaillé que celui-là.' },
      { fieldPath: 'intro[1].title', fieldKind: 'intro_title', frenchText: 'Comment dire ce que tu as déjà fait' },
      { fieldPath: 'intro[1].body', fieldKind: 'intro_body', frenchText: 'Quand tu racontes ce que tu as déjà lu ou regardé, ajoute -ed au verbe. C’est ainsi que l’on forme le passé. Certains verbes changent autrement : see devient saw, read reste read, mais se prononce différemment.' },
      { fieldPath: 'intro[1].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'J’ai regardé les nouvelles hier soir.' },
      { fieldPath: 'intro[1].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Elle a terminé le livre dimanche.' },
      { fieldPath: 'intro[2].title', fieldKind: 'intro_title', frenchText: 'Comment comparer et faire des plans' },
      { fieldPath: 'intro[2].body', fieldKind: 'intro_body', frenchText: 'Pour comparer deux sources, utilise more ou ajoute -er à l’adjectif. Pour parler de plans, mets will avant le verbe. C’est simple et cela fonctionne dans n’importe quelle conversation.' },
      { fieldPath: 'intro[2].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Cet article est plus long que l’autre.' },
      { fieldPath: 'intro[2].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Je regarderai un documentaire demain.' },
      { fieldPath: 'phrases.echo_d21_p1.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Read au passé' },
      { fieldPath: 'phrases.echo_d21_p1.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Read ne change pas d’orthographe, mais au passé il se prononce « red », pas « reed ».' },
      { fieldPath: 'phrases.echo_d21_p1.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'C’est un verbe spécial : une seule forme écrite, deux prononciations. Il faut le savoir dès le début.' },
      { fieldPath: 'phrases.echo_d21_p1.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas readed : cette forme n’existe pas.' },
      { fieldPath: 'phrases.echo_d21_p2.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Comparer deux sources' },
      { fieldPath: 'phrases.echo_d21_p2.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Les mots longs se comparent avec more devant : more interesting, more important.' },
      { fieldPath: 'phrases.echo_d21_p2.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Les mots courts prennent -er, comme longer. Les mots longs prennent more. C’est la règle principale.' },
      { fieldPath: 'phrases.echo_d21_p2.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas more interestinger : c’est une double comparaison incorrecte.' },
      { fieldPath: 'phrases.echo_d21_p3.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Verbe avec -ed au passé' },
      { fieldPath: 'phrases.echo_d21_p3.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Avec un verbe régulier, on ajoute -ed : finish devient finished. On parle ainsi d’une action terminée.' },
      { fieldPath: 'phrases.echo_d21_p3.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Le mot ago indique que l’action a eu lieu dans le passé et qu’elle est terminée.' },
      { fieldPath: 'phrases.echo_d21_p3.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'N’oublie pas -ed : finish sans terminaison est le présent, pas le passé.' },
      { fieldPath: 'phrases.echo_d21_p4.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Adjectif court en comparaison' },
      { fieldPath: 'phrases.echo_d21_p4.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Le mot court long prend -er : longer. Ensuite, on met than et le deuxième élément comparé.' },
      { fieldPath: 'phrases.echo_d21_p4.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'La phrase est au passé, donc on utilise was, pas is. On compare deux films ou contenus entre eux.' },
      { fieldPath: 'phrases.echo_d21_p4.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas more longer : le mot est court et -er forme déjà le comparatif.' },
      { fieldPath: 'phrases.echo_d21_p5.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Des plans au futur avec will' },
      { fieldPath: 'phrases.echo_d21_p5.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Pour parler de plans, place will devant le verbe. Le verbe ne change pas.' },
      { fieldPath: 'phrases.echo_d21_p5.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Will indique que c’est dans le futur. Next week confirme que cela n’a pas encore eu lieu.' },
      { fieldPath: 'phrases.echo_d21_p5.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « I will watched » : après will, le verbe reste toujours en forme simple.' },
      { fieldPath: 'phrases.echo_d21_p6.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Comparer des sources par rapidité' },
      { fieldPath: 'phrases.echo_d21_p6.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Fast est court, donc il devient faster. Ensuite, on met than et ce que l’on compare.' },
      { fieldPath: 'phrases.echo_d21_p6.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'C’est un modèle utile pour parler de nouvelles et de sources d’information.' },
      { fieldPath: 'phrases.echo_d21_p6.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas more faster : fast est court et -er suffit déjà.' },
      { fieldPath: 'vocabulary.read.translation', fieldKind: 'vocabulary_translation', frenchText: 'ai lu' },
      { fieldPath: 'vocabulary.magazine.translation', fieldKind: 'vocabulary_translation', frenchText: 'magazine' },
      { fieldPath: 'vocabulary.finished.translation', fieldKind: 'vocabulary_translation', frenchText: 'a terminé' },
      { fieldPath: 'vocabulary.documentary.translation', fieldKind: 'vocabulary_translation', frenchText: 'documentaire' },
      { fieldPath: 'vocabulary.longer.translation', fieldKind: 'vocabulary_translation', frenchText: 'plus long' },
      { fieldPath: 'vocabulary.faster.translation', fieldKind: 'vocabulary_translation', frenchText: 'plus rapide' },
    ],
  },
  {
    dayIndex: 22,
    fields: [
      { fieldPath: 'topic', fieldKind: 'day_topic', frenchText: 'Demander le prix dans un magasin' },
      { fieldPath: 'outcome', fieldKind: 'day_outcome', frenchText: 'Tu pourras demander le prix et le mode de paiement en anglais.' },
      { fieldPath: 'intro[0].title', fieldKind: 'intro_title', frenchText: 'Comment demander le prix' },
      { fieldPath: 'intro[0].body', fieldKind: 'intro_body', frenchText: 'Pour demander le prix, dis : How much does this cost? Cela veut dire « Combien cela coûte ? ». Les mots How much vont toujours au début de la question.' },
      { fieldPath: 'intro[0].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Combien cela coûte ?' },
      { fieldPath: 'intro[0].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Combien coûte ce sac-là ?' },
      { fieldPath: 'intro[1].title', fieldKind: 'intro_title', frenchText: 'Comment demander pour le paiement' },
      { fieldPath: 'intro[1].body', fieldKind: 'intro_body', frenchText: 'Pour demander si tu peux payer par carte, utilise can : Can I pay by card? Can est une façon polie de demander la permission.' },
      { fieldPath: 'intro[1].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Puis-je payer par carte ?' },
      { fieldPath: 'intro[1].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Puis-je payer en espèces ?' },
      { fieldPath: 'intro[2].title', fieldKind: 'intro_title', frenchText: 'Mot utile : price' },
      { fieldPath: 'intro[2].body', fieldKind: 'intro_body', frenchText: 'Price signifie « prix ». Tu peux demander : What is the price? C’est une question plus simple si tu ne te souviens pas de how much does it cost.' },
      { fieldPath: 'intro[2].examples[0].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Quel est le prix ?' },
      { fieldPath: 'intro[2].examples[1].gloss', fieldKind: 'intro_example_gloss', frenchText: 'Le prix est de vingt dollars.' },
      { fieldPath: 'phrases.echo_d22_p1.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Question sur le prix' },
      { fieldPath: 'phrases.echo_d22_p1.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'How much sert à demander une quantité ou un prix. Il va au début de la question.' },
      { fieldPath: 'phrases.echo_d22_p1.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'C’est la question la plus courante dans un magasin. N’importe quel vendeur la comprendra.' },
      { fieldPath: 'phrases.echo_d22_p1.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas How many pour le prix : How many sert aux choses que l’on peut compter.' },
      { fieldPath: 'phrases.echo_d22_p2.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander la permission de payer' },
      { fieldPath: 'phrases.echo_d22_p2.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Can I...? sert à demander la permission de façon polie. En français : « Puis-je...? » ou « Est-ce que je peux...? »' },
      { fieldPath: 'phrases.echo_d22_p2.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Can I est la façon la plus simple de demander la permission. Les natifs l’utilisent tout le temps.' },
      { fieldPath: 'phrases.echo_d22_p2.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'May I pay est possible, mais trop formel pour un magasin ordinaire.' },
      { fieldPath: 'phrases.echo_d22_p3.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Une autre façon de demander le prix' },
      { fieldPath: 'phrases.echo_d22_p3.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'What is...? sert à demander ce qu’est quelque chose ou comment il est. La question commence par What.' },
      { fieldPath: 'phrases.echo_d22_p3.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'C’est un remplacement simple et clair de How much does it cost.' },
      { fieldPath: 'phrases.echo_d22_p3.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « What is price » : il faut l’article the, donc « the price ».' },
      { fieldPath: 'phrases.echo_d22_p4.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander si l’argent liquide est accepté' },
      { fieldPath: 'phrases.echo_d22_p4.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Do you...? sert à poser une question sur une action. Ici, cela veut dire « Acceptez-vous...? »' },
      { fieldPath: 'phrases.echo_d22_p4.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Demander à l’avance si les espèces sont acceptées est normal dans un endroit inconnu.' },
      { fieldPath: 'phrases.echo_d22_p4.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas seulement « You accept » : sans Do, cela sonne comme une affirmation, pas une question.' },
      { fieldPath: 'phrases.echo_d22_p5.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander un reçu' },
      { fieldPath: 'phrases.echo_d22_p5.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'Can I get...? sert à demander qu’on te donne quelque chose. Please rend la demande plus polie.' },
      { fieldPath: 'phrases.echo_d22_p5.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Le reçu est utile pour les retours ou la garantie. Il est important de savoir le demander.' },
      { fieldPath: 'phrases.echo_d22_p5.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « Can I have receipt » : il faut l’article a, donc a receipt.' },
      { fieldPath: 'phrases.echo_d22_p6.explanation.title', fieldKind: 'phrase_explanation_title', frenchText: 'Demander le prix d’un objet précis' },
      { fieldPath: 'phrases.echo_d22_p6.explanation.rule', fieldKind: 'phrase_explanation_rule', frenchText: 'That sert à parler de quelque chose qui est plus loin. This sert à parler de quelque chose qui est près de toi.' },
      { fieldPath: 'phrases.echo_d22_p6.explanation.why', fieldKind: 'phrase_explanation_why', frenchText: 'Dans un magasin, les objets peuvent être loin : savoir les désigner avec that est très utile.' },
      { fieldPath: 'phrases.echo_d22_p6.explanation.commonMistake', fieldKind: 'phrase_explanation_common_mistake', frenchText: 'Ne dis pas « that jackets » ici : jacket est singulier, c’est un seul article.' },
      { fieldPath: 'vocabulary.cost.translation', fieldKind: 'vocabulary_translation', frenchText: 'coûter' },
      { fieldPath: 'vocabulary.pay.translation', fieldKind: 'vocabulary_translation', frenchText: 'payer' },
      { fieldPath: 'vocabulary.price.translation', fieldKind: 'vocabulary_translation', frenchText: 'prix' },
      { fieldPath: 'vocabulary.cash.translation', fieldKind: 'vocabulary_translation', frenchText: 'espèces, argent liquide' },
      { fieldPath: 'vocabulary.receipt.translation', fieldKind: 'vocabulary_translation', frenchText: 'reçu, ticket de caisse' },
      { fieldPath: 'vocabulary.jacket.translation', fieldKind: 'vocabulary_translation', frenchText: 'veste' },
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
    '# GUSTAV Personal Plan Echo Days 020-022 French Full-Day Text Packets',
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
    '## Outputs',
    '',
    ...batchReport.dayReports.flatMap((report: any) => [
      `- Day ${padDay(report.summary.dayIndex)} rows: \`${report.outputs.rowsJsonl}\``,
      `- Day ${padDay(report.summary.dayIndex)} audit: \`${report.outputs.packetJson}\``,
    ]),
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
    throw new Error('Usage: npx tsx scripts/gustav_personal_plan_echo_days020_022_french_full_day_text_packets.ts --run <run-dir>');
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
  const batchJsonPath = path.join(auditsDir, 'personal_plan_echo_days020_022_french_full_day_text_packets.json');
  const batchMdPath = path.join(auditsDir, 'personal_plan_echo_days020_022_french_full_day_text_packets.md');
  const totalBlockers = dayReports.reduce((sum, report) => sum + report.summary.blockers, 0);
  const totalWarnings = dayReports.reduce((sum, report) => sum + report.summary.warnings, 0);
  const batchReport = {
    schemaVersion: 'gustav-personal-plan-echo-days020-022-french-full-day-text-packets-v0',
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

  console.log(`GUSTAV Echo days 020-022 French full-day text packets: ${batchReport.status}`);
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
