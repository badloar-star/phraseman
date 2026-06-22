import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';

type Status = 'PASS' | 'BLOCK';
type FindingSeverity = 'blocker' | 'warning' | 'info';
type BundleId = 'movie_series' | 'phrasal_verbs';

type Finding = {
  severity: FindingSeverity;
  code: string;
  message: string;
  path?: string;
};

type BundleConfig = {
  id: BundleId;
  sourcePath: string;
  expectedCards: number;
  seedConstName: string;
  cardIdPrefix: string;
};

type SourceRow = {
  en: string;
  ru?: string;
  uk?: string;
  es?: string;
  sourceLocales?: Record<string, string>;
  meaningEs?: string;
  contextEs?: string;
  patternEs?: string;
  exampleEn: string;
  exampleEs?: string;
  level?: string;
};

type FrenchTranslation = {
  fr: string;
  meaningFr: string;
  contextFr?: string;
  sourcePatternEn?: string;
  exampleFr: string;
};

type GeneratedRow = {
  rowId: string;
  targetLocale: 'fr';
  bundleId: BundleId;
  sourceCardId: string;
  sourceIndex: number;
  en: string;
  fr: string;
  meaningFr: string;
  contextFr?: string;
  sourcePatternEn?: string;
  exampleEn: string;
  exampleFr: string;
  explanationFr: string;
  sourceLocales: Record<string, string>;
  sourcePreview: {
    ru?: string;
    uk?: string;
    es?: string;
  };
  reviewerStatus: 'needs_review';
  activationApproved: false;
  generatedBy: 'gustav_flashcard_bundle_french_generation_packet';
};

type BundleSummary = {
  bundleId: BundleId;
  expectedRows: number;
  sourceRows: number;
  generatedRows: number;
  rowsWithFrench: number;
  rowsWithExamplesFr: number;
  rowsWithReviewerNeedsReview: number;
  activationApprovedRows: number;
  duplicateEnglish: number;
  missingFrenchFields: number;
  cyrillicLeaksInFrenchFields: number;
  mojibakeFrenchFields: number;
  blockers: number;
  warnings: number;
};

type Report = {
  schemaVersion: 'gustav-flashcard-bundle-french-generation-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: {
    flashcardBundleContractPacket: string;
    nextSliceDecisionPacket: string;
    sourceFiles: string[];
  };
  outputs: {
    rowsJsonl: string;
    reviewerQueueTsv: string;
    packetJson: string;
    packetMd: string;
  };
  summary: {
    bundles: number;
    expectedRows: number;
    generatedRows: number;
    rowsWithFrench: number;
    rowsWithMeaningFr: number;
    rowsWithContextFrOrSourcePatternEn: number;
    rowsWithExampleFr: number;
    rowsWithReviewerNeedsReview: number;
    activationApprovedRows: number;
    duplicateEnglish: number;
    duplicateRowIds: number;
    missingFrenchFields: number;
    cyrillicLeaksInFrenchFields: number;
    mojibakeFrenchFields: number;
    blockers: number;
    warnings: number;
    readyForReviewer: boolean;
    readyForFrenchBundleReview: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  bundleSummaries: BundleSummary[];
  generationPolicy: string[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    sourceFlashcardFilesModifiedByThisScript: false;
    generatedFrenchLessonLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    readinessGateModifiedByThisScript: false;
    productionApplyApproved: false;
  };
};

const BUNDLES: BundleConfig[] = [
  {
    id: 'movie_series',
    sourcePath: 'app/flashcards/bundles/movie_series/movie_series_cards.ts',
    expectedCards: 60,
    seedConstName: 'SEEDS',
    cardIdPrefix: 'official_movie_series_en',
  },
  {
    id: 'phrasal_verbs',
    sourcePath: 'app/flashcards/bundles/phrasal_verbs/phrasal_verbs_cards.ts',
    expectedCards: 60,
    seedConstName: 'SEEDS',
    cardIdPrefix: 'official_phrasal_verbs_en',
  },
];

const MOVIE_FR: Array<[fr: string, exampleFr: string]> = [
  ["Qu'est-ce qui se passe ?", "Qu'est-ce qui se passe ? Pourquoi tout le monde court ?"],
  ['Tu vas y arriver.', 'Respire. Tu vas y arriver.'],
  ['Je me retire.', "Si c'est ton plan, je me retire."],
  ['Ne gâche pas tout.', "C'est notre seule chance. Ne gâche pas tout."],
  ["Ce n'est pas ça le sujet.", "Ce n'est pas ça le sujet. Le sujet, c'est que tu as menti."],
  ['Tu plaisantes ?', 'Tu plaisantes ? On vient juste de réparer ça.'],
  ['Laisse-moi souffler.', "Laisse-moi souffler. J'ai fait tout ce que je pouvais."],
  ['Je te dois une fière chandelle.', "Merci de m'avoir couvert. Je te dois une fière chandelle."],
  ["Il faut qu'on parle.", "Il faut qu'on parle. Pas ici."],
  ["C'est compliqué.", "Vous êtes ensemble ? C'est compliqué."],
  ['Pour faire court.', 'Pour faire court, on a perdu la voiture.'],
  ['Pour ce que ça vaut.', 'Pour ce que ça vaut, je te crois.'],
  ["Je ne m'y attendais pas.", "C'était lui l'espion ? Je ne m'y attendais pas."],
  ['Ne le prends pas personnellement.', 'Ne le prends pas personnellement, mais ce plan ne marchera pas.'],
  ['Je dis ça comme ça.', "Je dis ça comme ça, peut-être qu'on devrait attendre."],
  ["Ça n'a aucun sens.", "Ça n'a aucun sens. Il était avec nous toute la nuit."],
  ['Tu as dépassé les limites.', 'Tu as dépassé les limites quand tu as lu mes messages.'],
  ['Je te couvre.', 'Entre le premier. Je te couvre.'],
  ['Ne te mêle pas de ça.', "Ne te mêle pas de ça. C'est entre lui et moi."],
  ["Je m'en occupe.", "Tu peux réparer ça ? Je m'en occupe."],
  ["Ce n'est pas encore fini.", "Ce n'est pas encore fini. Il nous reste un coup."],
  ['Laisse-moi gérer ça.', 'Laisse-moi gérer ça. Je sais quoi dire.'],
  ["Qu'est-ce que tu attends de moi ?", "Qu'est-ce que tu attends de moi ? Je t'ai dit la vérité."],
  ["Je n'avais pas le choix.", "Je n'avais pas le choix. Ils t'auraient trouvé."],
  ["C'est ma faute.", "C'est ma faute. J'aurais dû vérifier."],
  ["Tu n'imagines même pas.", "Tu n'imagines même pas ce que j'ai traversé."],
  ["J'en ai fini.", "J'en ai fini. Je ne peux plus faire ça."],
  ['Ne me pousse pas.', "Ne me pousse pas. J'ai dit non."],
  ['Je suis sérieux.', 'Pars maintenant. Je suis sérieux.'],
  ['Recule.', 'Recule. Elle a dit non.'],
  ["C'est censé être drôle ?", "C'est censé être drôle ? Parce que ça ne l'est pas."],
  ['Je me rattraperai.', 'Je suis désolé. Je me rattraperai.'],
  ['Tu vaux mieux que ça.', 'Ne fais pas ça. Tu vaux mieux que ça.'],
  ['Je peux expliquer.', 'Attends, je peux expliquer.'],
  ['Ça change tout.', "S'il est vivant, ça change tout."],
  ['On manque de temps.', 'On manque de temps. Bouge !'],
  ['Il me faut une minute.', "Il me faut une minute. C'est beaucoup à encaisser."],
  ["Ne fais pas l'innocent.", "Ne fais pas l'innocent. Tu sais où c'est."],
  ["Je sais ce que j'ai vu.", "Je sais ce que j'ai vu, et ce n'était pas humain."],
  ['Tu ne peux pas être sérieux.', "Tu ne peux pas être sérieux. C'est impossible."],
  ['Laisse tomber.', "Laisse tomber. C'était il y a des années."],
  ["Je n'y crois pas.", "Belle histoire, mais je n'y crois pas."],
  ["Ça vaut le coup d'essayer.", "Ça peut échouer, mais ça vaut le coup d'essayer."],
  ['Où est le piège ?', 'Des billets gratuits ? Où est le piège ?'],
  ['Je tente ma chance.', "Si c'est le seul moyen, je tente ma chance."],
  ['Comme tu veux.', 'Comme tu veux. Moi, je pars quand même.'],
  ['Ne rends pas les choses plus difficiles.', 'S’il te plaît, ne rends pas les choses plus difficiles que nécessaire.'],
  ['On avait un accord.', 'On avait un accord. Tu avais promis.'],
  ['Je ne bouge pas.', 'Je ne bouge pas. On affronte ça ensemble.'],
  ['Tu avais raison.', "Tu avais raison. J'aurais dû t'écouter."],
  ["J'ai tout gâché.", "J'ai tout gâché, et je suis désolé."],
  ['Ça ne se reproduira plus.', 'Ça ne se reproduira plus. Tu as ma parole.'],
  ['J’ai besoin que tu me fasses confiance.', 'J’ai besoin que tu me fasses confiance et que tu coures.'],
  ['Tu caches quelque chose.', 'Tu caches quelque chose. Je le vois.'],
  ['Ça reste entre nous.', 'Ça reste entre nous. Personne d’autre ne doit savoir.'],
  ['Je reviens tout de suite.', 'Attends ici. Je reviens tout de suite.'],
  ['Là, ça devient intéressant.', 'Tu as trouvé les clés ? Là, ça devient intéressant.'],
  ['Ne te méprends pas.', "Ne te méprends pas, je l'aime bien. Je ne lui fais simplement pas confiance."],
  ["On l'a échappé belle.", "On l'a échappé belle. On a failli se faire prendre."],
  ['Point final.', 'Tu ne pars pas seul. Point final.'],
];

const PHRASAL_FR: Array<[fr: string, sourcePatternEn: string, exampleFr: string]> = [
  ["se réveiller / réveiller quelqu'un", "wake up ; wake someone up", 'Je me réveille généralement à sept heures.'],
  ['se lever', 'get up ; get someone up', 'Nous devons nous lever tôt demain.'],
  ['sortir', 'go out ; go out with someone', 'Tu veux sortir ce soir ?'],
  ['revenir', 'come back to a place', 'Reviens, s’il te plaît, avant minuit.'],
  ['retourner', 'go back to a place', 'Je dois retourner au bureau.'],
  ['revenir / récupérer', 'get back ; get something back', "J'ai récupéré mon téléphone hier."],
  ['entrer', 'come in ; come into a place', 'Entre et ferme la porte.'],
  ['entrer', 'go in ; go into a place', 'Il fait froid dehors ; entrons.'],
  ['sortir / paraître', 'come out ; come out in public', 'Le nouvel épisode sort vendredi.'],
  ["partir / s'éloigner", 'go away ; go away for a while', 'Je dois partir quelques jours.'],
  ["s'asseoir", 'sit down ; sit down next to someone', 'Assieds-toi et détends-toi.'],
  ['se lever', 'stand up ; stand up for someone', "Tout le monde s'est levé quand elle est entrée."],
  ['ramasser / venir chercher', 'pick something up ; pick someone up', 'Tu peux venir me chercher à six heures ?'],
  ['poser / noter', 'put something down ; put down a name', 'Pose ton sac ici.'],
  ['mettre / allumer', 'put something on', 'Mets une veste, il y a du vent.'],
  ['enlever / décoller', 'take something off ; the plane takes off', 'Enlève tes chaussures, s’il te plaît.'],
  ['allumer', 'turn something on', 'Tu peux allumer les lumières ?'],
  ['éteindre', 'turn something off', 'Éteins la télé avant de dormir.'],
  ['monter / apparaître', 'turn something up ; turn up somewhere', 'Monte le volume, s’il te plaît.'],
  ['baisser / refuser', 'turn something down ; turn someone down', "Elle a refusé l'offre d'emploi."],
  ['chercher', 'look for something or someone', 'Je cherche mes clés.'],
  ['découvrir / apprendre', 'find out something ; find out that...', 'J’ai appris que la réunion avait été annulée.'],
  ['comprendre / trouver une solution', 'figure out something ; figure out how to...', 'Nous devons comprendre le problème.'],
  ['chercher dans une source', 'look something up', 'Cherche l’adresse avant de partir.'],
  ["s'occuper de", 'look after someone or something', "Tu peux t'occuper de mon chien ?"],
  ['examiner', 'look into a matter or issue', 'Le manager va examiner ça.'],
  ['avoir hâte de', 'look forward to something ; look forward to doing something', 'J’ai hâte de vous rencontrer.'],
  ['se passer / continuer', 'go on ; go on with something', "Qu'est-ce qui se passe ici ?"],
  ['continuer', 'carry on ; carry on doing something', 'Continue à travailler pendant mon absence.'],
  ['continuer sans arrêt', 'keep on doing something', 'Il continue à poser la même question.'],
  ['abandonner / arrêter', 'give up ; give up doing something', "N'abandonne pas maintenant."],
  ['céder', 'give in ; give in to pressure', 'Elle a fini par céder et accepter.'],
  ['rendre', 'give something back ; give something back to someone', 'Rends-moi mon chargeur, s’il te plaît.'],
  ['retirer / reprendre', 'take something back', 'Je retire ce que j’ai dit.'],
  ['évoquer / élever', 'bring something up ; bring someone up', "N'aborde pas l'argent pendant le dîner."],
  ['faire revenir / rappeler', 'bring something back', 'Cette chanson me rappelle des souvenirs.'],
  ['surgir', 'come up ; something comes up', "Quelque chose d'urgent est arrivé."],
  ['trouver / imaginer', 'come up with an idea or solution', 'Nous avons trouvé un meilleur plan.'],
  ['manquer de / ne plus avoir', 'run out of something', "Nous n'avons plus de café."],
  ['remplir / remplacer', 'fill in a form ; fill in for someone', 'Remplis ce formulaire, s’il te plaît.'],
  ['remplir', 'fill out a form, application, survey', 'Remplis la candidature en ligne.'],
  ['mettre en place / organiser', 'set something up ; set up a meeting', "J'ai organisé un appel pour lundi."],
  ['se présenter / arriver', 'show up ; show up late', "Il ne s'est pas présenté à la réunion."],
  ['traîner / passer du temps', 'hang out with someone ; hang out somewhere', 'On traîne ensemble après les cours.'],
  ['rattraper / prendre des nouvelles', 'catch up on something ; catch up with someone', 'On se donne des nouvelles ce week-end.'],
  ["bien s'entendre", 'get along with someone', "Tu t'entends bien avec ton équipe ?"],
  ['se remettre de', 'get over something or someone', "Il a fallu des mois pour s'en remettre."],
  ['traverser / joindre', 'get through something ; get through to someone', 'On va traverser ça ensemble.'],
  ['gérer / s’occuper de', 'deal with something or someone', "Je vais m'occuper de la plainte."],
  ['marcher / résoudre / faire du sport', 'work out ; work something out', "J'espère que tout va s'arranger."],
  ['reporter', 'put something off ; put off doing something', 'Ne reporte pas la décision.'],
  ['annuler', 'call something off', 'Ils ont annulé le match.'],
  ['réduire', 'cut down on something', 'Je dois réduire le sucre.'],
  ['passer par / examiner', 'go through something', 'Passons la liste en revue.'],
  ['regarder / vérifier', 'check something out ; check out of a hotel', 'Regarde cette nouvelle appli.'],
  ['déposer / s’endormir', 'drop someone off ; drop something off', 'Je te déposerai à la gare.'],
  ['prendre soin de / s’occuper de', 'take care of someone or something', 'Je m’occuperai des billets.'],
  ['patienter / tenir bon', 'hold on ; hold on to something', 'Attends, je vais vérifier.'],
  ['finir par', 'end up somewhere ; end up doing something', 'On a fini par commander une pizza.'],
  ['inventer / se réconcilier / constituer', 'make something up ; make up with someone', "N'invente pas d'excuses."],
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function b(value: Record<string, unknown>, key: string): boolean {
  return value[key] === true;
}

function addFinding(findings: Finding[], severity: FindingSeverity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function evalPropertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
}

function evalExpression(expr: ts.Expression): unknown {
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text;
  if (ts.isNumericLiteral(expr)) return Number(expr.text);
  if (expr.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expr.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr) || ts.isSatisfiesExpression(expr)) return evalExpression(expr.expression);
  if (ts.isArrayLiteralExpression(expr)) return expr.elements.map((element) => evalExpression(element as ts.Expression));
  if (ts.isObjectLiteralExpression(expr)) {
    const out: Record<string, unknown> = {};
    for (const prop of expr.properties) {
      if (ts.isPropertyAssignment(prop)) {
        const key = evalPropertyName(prop.name);
        if (key) out[key] = evalExpression(prop.initializer);
      }
    }
    return out;
  }
  if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    return `${evalExpression(expr.left) ?? ''}${evalExpression(expr.right) ?? ''}`;
  }
  if (ts.isTemplateExpression(expr)) {
    return [expr.head.text, ...expr.templateSpans.map((span) => span.literal.text)].join('');
  }
  return undefined;
}

function findVariableInitializer(sourceFile: ts.SourceFile, name: string): ts.Expression | undefined {
  let found: ts.Expression | undefined;
  function visit(node: ts.Node): void {
    if (found) return;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) {
      found = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return found;
}

function readSeedRows(repoRoot: string, config: BundleConfig): SourceRow[] {
  const filePath = path.resolve(repoRoot, config.sourcePath);
  const text = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(config.sourcePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const initializer = findVariableInitializer(sourceFile, config.seedConstName);
  const value = initializer ? evalExpression(initializer) : [];
  return Array.isArray(value) ? value as SourceRow[] : [];
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasCyrillic(value: string): boolean {
  return /[\u0400-\u04FF]/.test(value);
}

function hasMojibake(value: string): boolean {
  return /(?:Ð|Ñ|�|\?{3,})/.test(value);
}

function tsvCell(value: unknown): string {
  return String(value ?? '').replace(/\r?\n/g, ' ').replace(/\t/g, ' ').trim();
}

function lineCount(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  const text = fs.readFileSync(filePath, 'utf8').trim();
  return text ? text.split(/\r?\n/).length : 0;
}

function translationFor(config: BundleConfig, index: number): FrenchTranslation {
  if (config.id === 'movie_series') {
    const entry = MOVIE_FR[index];
    if (!entry) {
      return { fr: '', meaningFr: '', contextFr: '', exampleFr: '' };
    }
    const [fr, exampleFr] = entry;
    return {
      fr,
      meaningFr: `Expression naturelle qui signifie : ${fr}`,
      contextFr: 'À utiliser dans une scène de film, de série ou une conversation naturelle, quand une réplique courte doit transmettre toute l’intention.',
      exampleFr,
    };
  }

  const entry = PHRASAL_FR[index];
  if (!entry) {
    return { fr: '', meaningFr: '', sourcePatternEn: '', exampleFr: '' };
  }
  const [fr, sourcePatternEn, exampleFr] = entry;
  return {
    fr,
    meaningFr: `Équivalent français courant : ${fr}`,
    sourcePatternEn,
    exampleFr,
  };
}

function makeExplanation(config: BundleConfig, row: SourceRow, translation: FrenchTranslation): string {
  if (config.id === 'movie_series') {
    return `${row.en} = ${translation.fr}. ${translation.contextFr} Exemple : ${row.exampleEn} -> ${translation.exampleFr}`;
  }
  return `${row.en} = ${translation.fr}. Modèle anglais source : ${translation.sourcePatternEn}. Exemple : ${row.exampleEn} -> ${translation.exampleFr}`;
}

function generateBundleRows(repoRoot: string, config: BundleConfig, findings: Finding[]): GeneratedRow[] {
  const seedRows = readSeedRows(repoRoot, config);
  if (seedRows.length < config.expectedCards) {
    addFinding(findings, 'blocker', 'flashcard_source_rows_missing', `${config.id} has ${seedRows.length} seed rows; expected at least ${config.expectedCards}.`, config.sourcePath);
  }

  const rows = seedRows.slice(0, config.expectedCards);
  return rows.map((row, index) => {
    const sourceIndex = index + 1;
    const translation = translationFor(config, index);
    const sourceCardId = `${config.cardIdPrefix}_${String(sourceIndex).padStart(2, '0')}`;
    return {
      rowId: `fr_${sourceCardId}`,
      targetLocale: 'fr',
      bundleId: config.id,
      sourceCardId,
      sourceIndex,
      en: row.en,
      fr: translation.fr,
      meaningFr: translation.meaningFr,
      contextFr: translation.contextFr,
      sourcePatternEn: translation.sourcePatternEn,
      exampleEn: row.exampleEn,
      exampleFr: translation.exampleFr,
      explanationFr: makeExplanation(config, row, translation),
      sourceLocales: row.sourceLocales ?? {},
      sourcePreview: {
        ru: row.ru,
        uk: row.uk,
        es: row.es,
      },
      reviewerStatus: 'needs_review',
      activationApproved: false,
      generatedBy: 'gustav_flashcard_bundle_french_generation_packet',
    };
  });
}

function validateBundle(config: BundleConfig, rows: GeneratedRow[], findings: Finding[]): BundleSummary {
  let missingFrenchFields = 0;
  let cyrillicLeaksInFrenchFields = 0;
  let mojibakeFrenchFields = 0;
  const english = rows.map((row) => row.en.trim()).filter(Boolean);
  const duplicateEnglish = english.length - new Set(english).size;

  for (const row of rows) {
    const frenchFields = config.id === 'movie_series'
      ? [row.fr, row.meaningFr, row.contextFr, row.exampleFr, row.explanationFr]
      : [row.fr, row.meaningFr, row.exampleFr, row.explanationFr];
    for (const value of frenchFields) {
      if (!hasText(value)) missingFrenchFields += 1;
      if (typeof value === 'string' && hasCyrillic(value)) cyrillicLeaksInFrenchFields += 1;
      if (typeof value === 'string' && hasMojibake(value)) mojibakeFrenchFields += 1;
    }
  }

  if (rows.length !== config.expectedCards) {
    addFinding(findings, 'blocker', 'flashcard_generated_row_count_mismatch', `${config.id} generated ${rows.length} rows; expected ${config.expectedCards}.`);
  }
  if (duplicateEnglish > 0) {
    addFinding(findings, 'blocker', 'flashcard_duplicate_english', `${config.id} has ${duplicateEnglish} duplicate English values in generated rows.`);
  }
  if (missingFrenchFields > 0) {
    addFinding(findings, 'blocker', 'flashcard_missing_french_fields', `${config.id} has ${missingFrenchFields} missing French fields.`);
  }
  if (cyrillicLeaksInFrenchFields > 0) {
    addFinding(findings, 'blocker', 'flashcard_cyrillic_leak_in_french_fields', `${config.id} has ${cyrillicLeaksInFrenchFields} Cyrillic leaks in French fields.`);
  }
  if (mojibakeFrenchFields > 0) {
    addFinding(findings, 'blocker', 'flashcard_mojibake_in_french_fields', `${config.id} has ${mojibakeFrenchFields} mojibake markers in French fields.`);
  }
  if (config.id === 'movie_series' && rows.some((row) => !hasText(row.contextFr))) {
    addFinding(findings, 'blocker', 'flashcard_missing_french_context', 'movie_series rows must carry French contextFr values.');
  }
  if (config.id === 'phrasal_verbs' && rows.some((row) => !hasText(row.sourcePatternEn))) {
    addFinding(findings, 'blocker', 'flashcard_missing_source_pattern_en', 'phrasal_verbs rows must carry sourcePatternEn values.');
  }

  const bundleFindings = findings.filter((finding) => finding.message.includes(config.id));
  return {
    bundleId: config.id,
    expectedRows: config.expectedCards,
    sourceRows: rows.length,
    generatedRows: rows.length,
    rowsWithFrench: rows.filter((row) => hasText(row.fr)).length,
    rowsWithExamplesFr: rows.filter((row) => hasText(row.exampleFr)).length,
    rowsWithReviewerNeedsReview: rows.filter((row) => row.reviewerStatus === 'needs_review').length,
    activationApprovedRows: rows.filter((row) => row.activationApproved).length,
    duplicateEnglish,
    missingFrenchFields,
    cyrillicLeaksInFrenchFields,
    mojibakeFrenchFields,
    blockers: bundleFindings.filter((finding) => finding.severity === 'blocker').length,
    warnings: bundleFindings.filter((finding) => finding.severity === 'warning').length,
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Flashcard Bundle French Generation Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Bundles: ${report.summary.bundles}`,
    `- Expected rows: ${report.summary.expectedRows}`,
    `- Generated rows: ${report.summary.generatedRows}`,
    `- Rows with French: ${report.summary.rowsWithFrench}`,
    `- Rows with meaningFr: ${report.summary.rowsWithMeaningFr}`,
    `- Rows with contextFr/sourcePatternEn: ${report.summary.rowsWithContextFrOrSourcePatternEn}`,
    `- Rows with exampleFr: ${report.summary.rowsWithExampleFr}`,
    `- Rows needing reviewer: ${report.summary.rowsWithReviewerNeedsReview}`,
    `- Activation-approved rows: ${report.summary.activationApprovedRows}`,
    `- Duplicate English: ${report.summary.duplicateEnglish}`,
    `- Duplicate row ids: ${report.summary.duplicateRowIds}`,
    `- Missing French fields: ${report.summary.missingFrenchFields}`,
    `- Cyrillic leaks in French fields: ${report.summary.cyrillicLeaksInFrenchFields}`,
    `- Mojibake French fields: ${report.summary.mojibakeFrenchFields}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for French bundle review: ${report.summary.readyForFrenchBundleReview ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Bundle Summaries',
    '',
  ];

  for (const bundle of report.bundleSummaries) {
    lines.push(`- \`${bundle.bundleId}\`: ${bundle.generatedRows}/${bundle.expectedRows} rows, French ${bundle.rowsWithFrench}, reviewer ${bundle.rowsWithReviewerNeedsReview}, blockers ${bundle.blockers}`);
  }

  lines.push('', '## Outputs', '');
  lines.push(`- Rows JSONL: \`${report.outputs.rowsJsonl}\``);
  lines.push(`- Reviewer queue TSV: \`${report.outputs.reviewerQueueTsv}\``);
  lines.push(`- Packet JSON: \`${report.outputs.packetJson}\``);
  lines.push(`- Packet MD: \`${report.outputs.packetMd}\``);

  lines.push('', '## Generation Policy', '');
  for (const policy of report.generationPolicy) lines.push(`- ${policy}`);

  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
    }
  }

  lines.push(
    '',
    '## Safety',
    '',
    '- This packet did not modify production app files.',
    '- This packet did not modify source flashcard files.',
    '- This packet did not modify generated French lesson ledgers.',
    '- This packet did not write reviewer decisions.',
    '- This packet did not edit `scripts/gustav_readiness_gate.ts`.',
    '- This packet does not authorize production app apply.',
    '',
  );

  return `${lines.join('\n')}\n`;
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_flashcard_bundle_french_generation_packet.ts --run <run-dir>');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const outDir = path.join(runDir, 'generated', 'fr', 'app_domains', 'flashcard_bundles');
  const auditsDir = path.join(runDir, 'audits');
  ensureDir(outDir);
  ensureDir(auditsDir);

  const flashcardContractPath = path.join(auditsDir, 'flashcard_bundle_contract_packet.json');
  const nextDecisionPath = path.join(auditsDir, 'next_algorithm_expansion_slice_decision_packet.json');
  const rowsPath = path.join(outDir, 'flashcard_bundle_fr_rows.jsonl');
  const reviewerQueuePath = path.join(outDir, 'flashcard_bundle_fr_reviewer_queue.tsv');
  const packetJsonPath = path.join(auditsDir, 'flashcard_bundle_french_generation_packet.json');
  const packetMdPath = path.join(auditsDir, 'flashcard_bundle_french_generation_packet.md');

  const findings: Finding[] = [];
  if (!fs.existsSync(flashcardContractPath)) {
    addFinding(findings, 'blocker', 'flashcard_contract_missing', 'P5 flashcard bundle contract packet is missing.', rel(repoRoot, flashcardContractPath));
  } else {
    const contract = readJson<Record<string, unknown>>(flashcardContractPath);
    const summary = object(contract.summary);
    if (contract.status !== 'PASS' || !b(summary, 'readyForP8ReadinessExtension')) {
      addFinding(findings, 'blocker', 'flashcard_contract_not_ready', 'P5 flashcard bundle contract is not PASS/ready.', rel(repoRoot, flashcardContractPath));
    }
  }

  if (!fs.existsSync(nextDecisionPath)) {
    addFinding(findings, 'blocker', 'next_slice_decision_missing', 'P10 next-slice decision packet is missing.', rel(repoRoot, nextDecisionPath));
  } else {
    const decision = readJson<Record<string, unknown>>(nextDecisionPath);
    const summary = object(decision.summary);
    if (decision.status !== 'PASS' || summary.selectedSliceId !== 'P11_FLASHCARD_BUNDLE_FRENCH_GENERATION_PACKET') {
      addFinding(findings, 'blocker', 'next_slice_decision_not_flashcards', 'P10 decision packet does not select flashcard bundle French generation.', rel(repoRoot, nextDecisionPath));
    }
  }

  if (MOVIE_FR.length !== 60) addFinding(findings, 'blocker', 'movie_translation_count_mismatch', `Movie translation table has ${MOVIE_FR.length} rows; expected 60.`);
  if (PHRASAL_FR.length !== 60) addFinding(findings, 'blocker', 'phrasal_translation_count_mismatch', `Phrasal translation table has ${PHRASAL_FR.length} rows; expected 60.`);

  const generatedRows = BUNDLES.flatMap((config) => generateBundleRows(repoRoot, config, findings));
  const bundleSummaries = BUNDLES.map((config) => validateBundle(config, generatedRows.filter((row) => row.bundleId === config.id), findings));

  const duplicateRowIds = generatedRows.length - new Set(generatedRows.map((row) => row.rowId)).size;
  const duplicateEnglish = generatedRows.length - new Set(generatedRows.map((row) => row.en.trim())).size;
  if (duplicateRowIds > 0) addFinding(findings, 'blocker', 'duplicate_generated_row_ids', `Generated rows have ${duplicateRowIds} duplicate row ids.`);
  if (duplicateEnglish > 0) addFinding(findings, 'blocker', 'duplicate_generated_english', `Generated rows have ${duplicateEnglish} duplicate English values.`);

  const rowsWithMeaningFr = generatedRows.filter((row) => hasText(row.meaningFr)).length;
  const rowsWithContextFrOrSourcePatternEn = generatedRows.filter((row) => hasText(row.contextFr) || hasText(row.sourcePatternEn)).length;
  const rowsWithExampleFr = generatedRows.filter((row) => hasText(row.exampleFr)).length;
  const rowsWithReviewerNeedsReview = generatedRows.filter((row) => row.reviewerStatus === 'needs_review').length;
  const activationApprovedRows = generatedRows.filter((row) => row.activationApproved).length;
  if (activationApprovedRows > 0) addFinding(findings, 'blocker', 'generated_rows_activation_approved', 'Generated flashcard rows must not be activation-approved.');

  fs.writeFileSync(rowsPath, `${generatedRows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
  const tsvHeader = ['rowId', 'targetLocale', 'bundleId', 'sourceCardId', 'sourceIndex', 'en', 'fr', 'meaningFr', 'contextFr', 'sourcePatternEn', 'exampleEn', 'exampleFr', 'reviewerStatus', 'activationApproved'];
  const tsvRows = generatedRows.map((row) => [
    row.rowId,
    row.targetLocale,
    row.bundleId,
    row.sourceCardId,
    row.sourceIndex,
    row.en,
    row.fr,
    row.meaningFr,
    row.contextFr ?? '',
    row.sourcePatternEn ?? '',
    row.exampleEn,
    row.exampleFr,
    row.reviewerStatus,
    row.activationApproved,
  ].map(tsvCell).join('\t'));
  fs.writeFileSync(reviewerQueuePath, `${tsvHeader.join('\t')}\n${tsvRows.join('\n')}\n`, 'utf8');

  const jsonlRows = lineCount(rowsPath);
  const tsvLineCount = lineCount(reviewerQueuePath);
  if (jsonlRows !== generatedRows.length) addFinding(findings, 'blocker', 'jsonl_row_count_mismatch', `Rows JSONL has ${jsonlRows} lines; expected ${generatedRows.length}.`, rel(repoRoot, rowsPath));
  if (tsvLineCount !== generatedRows.length + 1) addFinding(findings, 'blocker', 'reviewer_tsv_row_count_mismatch', `Reviewer TSV has ${tsvLineCount} lines; expected ${generatedRows.length + 1}.`, rel(repoRoot, reviewerQueuePath));

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const missingFrenchFields = bundleSummaries.reduce((sum, bundle) => sum + bundle.missingFrenchFields, 0);
  const cyrillicLeaksInFrenchFields = bundleSummaries.reduce((sum, bundle) => sum + bundle.cyrillicLeaksInFrenchFields, 0);
  const mojibakeFrenchFields = bundleSummaries.reduce((sum, bundle) => sum + bundle.mojibakeFrenchFields, 0);

  const report: Report = {
    schemaVersion: 'gustav-flashcard-bundle-french-generation-packet-v0',
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' : 'BLOCK',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      flashcardBundleContractPacket: rel(repoRoot, flashcardContractPath),
      nextSliceDecisionPacket: rel(repoRoot, nextDecisionPath),
      sourceFiles: BUNDLES.map((bundle) => bundle.sourcePath),
    },
    outputs: {
      rowsJsonl: rel(repoRoot, rowsPath),
      reviewerQueueTsv: rel(repoRoot, reviewerQueuePath),
      packetJson: rel(repoRoot, packetJsonPath),
      packetMd: rel(repoRoot, packetMdPath),
    },
    summary: {
      bundles: BUNDLES.length,
      expectedRows: BUNDLES.reduce((sum, bundle) => sum + bundle.expectedCards, 0),
      generatedRows: generatedRows.length,
      rowsWithFrench: generatedRows.filter((row) => hasText(row.fr)).length,
      rowsWithMeaningFr,
      rowsWithContextFrOrSourcePatternEn,
      rowsWithExampleFr,
      rowsWithReviewerNeedsReview,
      activationApprovedRows,
      duplicateEnglish,
      duplicateRowIds,
      missingFrenchFields,
      cyrillicLeaksInFrenchFields,
      mojibakeFrenchFields,
      blockers,
      warnings,
      readyForReviewer: blockers === 0 && rowsWithReviewerNeedsReview === generatedRows.length,
      readyForFrenchBundleReview: blockers === 0 && generatedRows.length === 120,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    bundleSummaries,
    generationPolicy: [
      'Generated rows are reviewer-needed by default.',
      'No generated flashcard row is activation-approved.',
      'English phrasal-verb source patterns are stored as sourcePatternEn, never as *Fr target fields.',
      'Source flashcard files are read-only inputs.',
      'This packet writes only GUSTAV pipeline outputs and audit artifacts.',
      'Production app apply remains blocked until reviewer decisions and explicit app-write approval exist.',
    ],
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      sourceFlashcardFilesModifiedByThisScript: false,
      generatedFrenchLessonLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      readinessGateModifiedByThisScript: false,
      productionApplyApproved: false,
    },
  };

  fs.writeFileSync(packetJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(packetMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV flashcard bundle French generation packet: ${report.status}`);
  console.log(`Generated rows: ${report.summary.generatedRows}/${report.summary.expectedRows}`);
  console.log(`Rows with French: ${report.summary.rowsWithFrench}`);
  console.log(`Rows needing reviewer: ${report.summary.rowsWithReviewerNeedsReview}`);
  console.log(`Activation-approved rows: ${report.summary.activationApprovedRows}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Ready for French bundle review: ${report.summary.readyForFrenchBundleReview ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, packetJsonPath)}`);

  if (report.status !== 'PASS') {
    process.exitCode = 1;
  }
}

main();
