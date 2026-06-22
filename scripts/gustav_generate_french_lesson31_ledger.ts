import * as fs from 'node:fs';
import * as path from 'node:path';

type SourcePhrase = {
  id: string;
  lessonId: number;
  order?: number;
  targetText: string;
  sourcePrompts?: {
    ru?: string;
    uk?: string;
  };
  sourceRef?: {
    file?: string;
    line?: number;
  };
};

type SourceGraph = {
  phrases: SourcePhrase[];
};

type WordFr = {
  text: string;
  correct: string;
  distractors: string[];
  category: string;
};

type TranslationSpec = {
  proposedFrench: string;
  wordsFr: WordFr[];
};

const LESSON_ID = 31;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_causative_perception_infinitive_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'They made that inexperienced driver pay that huge fine.': item('Ils ont fait payer cette énorme amende à ce conducteur inexpérimenté.', 'Ils ont ___ payer cette énorme amende à ce conducteur inexpérimenté.', 'fait', ['font', 'faire', 'faisaient'], 'faire_causative'),
  'I heard that experienced pilot explain that complex flight procedure.': item("J'ai entendu ce pilote expérimenté expliquer cette procédure de vol complexe.", "J'ai ___ ce pilote expérimenté expliquer cette procédure de vol complexe.", 'entendu', ['entendre', 'écouté', 'entendais'], 'perception_entendre_infinitive'),
  'She felt that cold raindrop fall on her shoulder.': item('Elle a senti cette goutte de pluie froide tomber sur son épaule.', 'Elle a ___ cette goutte de pluie froide tomber sur son épaule.', 'senti', ['sentir', 'touché', 'sentait'], 'perception_sentir_infinitive'),
  'That strict guard made that suspicious visitor show the contents of that leather briefcase.': item('Ce garde strict a fait montrer le contenu de cette serviette en cuir à ce visiteur suspect.', 'Ce garde strict a ___ montrer le contenu de cette serviette en cuir à ce visiteur suspect.', 'fait', ['faites', 'faire', 'faisait'], 'faire_causative'),
  'She heard that famous singer sing that old jazz composition.': item('Elle a entendu ce chanteur célèbre chanter cette vieille composition de jazz.', 'Elle a ___ ce chanteur célèbre chanter cette vieille composition de jazz.', 'entendu', ['entendre', 'écouté', 'entendait'], 'perception_entendre_infinitive'),
  'They let that little child eat that huge chocolate cake.': item('Ils ont laissé ce petit enfant manger cet énorme gâteau au chocolat.', 'Ils ont ___ ce petit enfant manger cet énorme gâteau au chocolat.', 'laissé', ['laisser', 'laissent', 'laissaient'], 'laisser_infinitive'),
  'We felt that powerful earth tremor shake that old brick wall.': item('Nous avons senti ce puissant tremblement de terre secouer ce vieux mur de briques.', 'Nous avons ___ ce puissant tremblement de terre secouer ce vieux mur de briques.', 'senti', ['sentir', 'touché', 'sentions'], 'perception_sentir_infinitive'),
  'She noticed that unknown man quickly put that envelope into that mail slot.': item("Elle a remarqué cet homme inconnu glisser rapidement cette enveloppe dans cette fente à courrier.", "Elle a ___ cet homme inconnu glisser rapidement cette enveloppe dans cette fente à courrier.", 'remarqué', ['remarquer', 'vu', 'remarquait'], 'perception_remarquer_infinitive'),
  'They heard those angry protesters shout those loud political slogans.': item('Ils ont entendu ces manifestants en colère crier ces slogans politiques très fort.', 'Ils ont ___ ces manifestants en colère crier ces slogans politiques très fort.', 'entendu', ['entendre', 'écouté', 'entendaient'], 'perception_entendre_infinitive'),
  'We saw that bright lightning strike that lonely tree on that hill.': item('Nous avons vu cet éclair brillant frapper cet arbre solitaire sur cette colline.', 'Nous avons ___ cet éclair brillant frapper cet arbre solitaire sur cette colline.', 'vu', ['voir', 'regardé', 'voyions'], 'perception_voir_infinitive'),
  'She felt that sharp cold wind touch her pale face.': item('Elle a senti ce vent froid et vif toucher son visage pâle.', 'Elle a ___ ce vent froid et vif toucher son visage pâle.', 'senti', ['sentir', 'touché', 'sentait'], 'perception_sentir_infinitive'),
  'They heard that furious boss shout at that lazy manager.': item('Ils ont entendu ce patron furieux crier sur ce manager paresseux.', 'Ils ont ___ ce patron furieux crier sur ce manager paresseux.', 'entendu', ['entendre', 'écouté', 'entendaient'], 'perception_entendre_infinitive'),
  'I saw that skillful carpenter fix that broken wooden ladder.': item("J'ai vu ce menuisier habile réparer cette échelle en bois cassée.", "J'ai ___ ce menuisier habile réparer cette échelle en bois cassée.", 'vu', ['voir', 'regardé', 'voyais'], 'perception_voir_infinitive'),
  'She heard those tired workers discuss that new production quota.': item('Elle a entendu ces ouvriers fatigués discuter de ce nouveau quota de production.', 'Elle a ___ ces ouvriers fatigués discuter de ce nouveau quota de production.', 'entendu', ['entendre', 'écouté', 'entendait'], 'perception_entendre_infinitive'),
  'We would like this reliable supplier to deliver those necessary construction materials.': item('Nous voudrions que ce fournisseur fiable livre ces matériaux de construction nécessaires.', 'Nous voudrions que ce fournisseur fiable ___ ces matériaux de construction nécessaires.', 'livre', ['livrer', 'livrera', 'livrait'], 'vouloir_que_subjunctive'),
  'They let that foreign delegation inspect that modern chemical laboratory.': item('Ils ont laissé cette délégation étrangère inspecter ce laboratoire chimique moderne.', 'Ils ont ___ cette délégation étrangère inspecter ce laboratoire chimique moderne.', 'laissé', ['laisser', 'laissent', 'laissaient'], 'laisser_infinitive'),
  'That strict inspector made that nervous driver open that dirty trunk.': item('Cet inspecteur strict a fait ouvrir ce coffre sale à ce conducteur nerveux.', 'Cet inspecteur strict a ___ ouvrir ce coffre sale à ce conducteur nerveux.', 'fait', ['faire', 'faites', 'faisait'], 'faire_causative'),
  'She felt that sharp needle pierce that thick protective layer.': item('Elle a senti cette aiguille pointue percer cette épaisse couche protectrice.', 'Elle a ___ cette aiguille pointue percer cette épaisse couche protectrice.', 'senti', ['sentir', 'touché', 'sentait'], 'perception_sentir_infinitive'),
  'They let that young genius use that secret government base.': item('Ils ont laissé ce jeune génie utiliser cette base gouvernementale secrète.', 'Ils ont ___ ce jeune génie utiliser cette base gouvernementale secrète.', 'laissé', ['laisser', 'laissent', 'laissaient'], 'laisser_infinitive'),
  'That experienced farmer made that old irrigation system work efficiently.': item("Cet agriculteur expérimenté a fait fonctionner efficacement ce vieux système d'irrigation.", "Cet agriculteur expérimenté a ___ fonctionner efficacement ce vieux système d'irrigation.", 'fait', ['faire', 'faites', 'faisait'], 'faire_causative'),
  'We heard that furious customer demand that immediate refund.': item('Nous avons entendu ce client furieux exiger ce remboursement immédiat.', 'Nous avons ___ ce client furieux exiger ce remboursement immédiat.', 'entendu', ['entendre', 'écouté', 'entendions'], 'perception_entendre_infinitive'),
  'She felt that soft woolen fabric touch her sensitive skin.': item('Elle a senti ce tissu de laine doux toucher sa peau sensible.', 'Elle a ___ ce tissu de laine doux toucher sa peau sensible.', 'senti', ['sentir', 'touché', 'sentait'], 'perception_sentir_infinitive'),
  'They saw that experienced archaeologist find that rare gold coin.': item("Ils ont vu cet archéologue expérimenté trouver cette rare pièce d'or.", "Ils ont ___ cet archéologue expérimenté trouver cette rare pièce d'or.", 'vu', ['voir', 'regardé', 'voyaient'], 'perception_voir_infinitive'),
  'That wise mentor made that lazy student rewrite that graduation thesis.': item("Ce mentor sage a fait réécrire cette thèse de fin d'études à cet étudiant paresseux.", "Ce mentor sage a ___ réécrire cette thèse de fin d'études à cet étudiant paresseux.", 'fait', ['faire', 'faites', 'faisait'], 'faire_causative'),
  'We heard that talented violinist perform that sad melody on that city square.': item('Nous avons entendu ce violoniste talentueux interpréter cette mélodie triste sur cette place de la ville.', 'Nous avons ___ ce violoniste talentueux interpréter cette mélodie triste sur cette place de la ville.', 'entendu', ['entendre', 'écouté', 'entendions'], 'perception_entendre_infinitive'),
  'She felt that hot steam burn her right hand.': item('Elle a senti cette vapeur chaude brûler sa main droite.', 'Elle a ___ cette vapeur chaude brûler sa main droite.', 'senti', ['sentir', 'touché', 'sentait'], 'perception_sentir_infinitive'),
  'They let that local reporter interview that nervous city mayor.': item('Ils ont laissé ce journaliste local interviewer ce maire nerveux.', 'Ils ont ___ ce journaliste local interviewer ce maire nerveux.', 'laissé', ['laisser', 'laissent', 'laissaient'], 'laisser_infinitive'),
  'That strict landlord made that noisy tenant pay that huge electricity bill.': item("Ce propriétaire strict a fait payer cette énorme facture d'électricité à ce locataire bruyant.", "Ce propriétaire strict a ___ payer cette énorme facture d'électricité à ce locataire bruyant.", 'fait', ['faire', 'faites', 'faisait'], 'faire_causative'),
  'She felt that heavy object hit her left knee.': item('Elle a senti cet objet lourd frapper son genou gauche.', 'Elle a ___ cet objet lourd frapper son genou gauche.', 'senti', ['sentir', 'touché', 'sentait'], 'perception_sentir_infinitive'),
  'They let that experienced engineer test that new solar engine.': item('Ils ont laissé cet ingénieur expérimenté tester ce nouveau moteur solaire.', 'Ils ont ___ cet ingénieur expérimenté tester ce nouveau moteur solaire.', 'laissé', ['laisser', 'laissent', 'laissaient'], 'laisser_infinitive'),
  'I saw that stray dog cross that busy street.': item("J'ai vu ce chien errant traverser cette rue animée.", "J'ai ___ ce chien errant traverser cette rue animée.", 'vu', ['voir', 'regardé', 'voyais'], 'perception_voir_infinitive'),
  'They heard that quiet student ask that difficult question.': item('Ils ont entendu cet étudiant calme poser cette question difficile.', 'Ils ont ___ cet étudiant calme poser cette question difficile.', 'entendu', ['entendre', 'écouté', 'entendaient'], 'perception_entendre_infinitive'),
  'She felt that warm sunlight reach her tired eyes.': item('Elle a senti cette lumière chaude du soleil atteindre ses yeux fatigués.', 'Elle a ___ cette lumière chaude du soleil atteindre ses yeux fatigués.', 'senti', ['sentir', 'touché', 'sentait'], 'perception_sentir_infinitive'),
  'We noticed that tall stranger leave that crowded station.': item('Nous avons remarqué ce grand inconnu quitter cette gare bondée.', 'Nous avons ___ ce grand inconnu quitter cette gare bondée.', 'remarqué', ['remarquer', 'vu', 'remarquions'], 'perception_remarquer_infinitive'),
  'That brave firefighter made that panicked family follow that emergency exit.': item('Ce pompier courageux a fait emprunter la sortie de secours à cette famille paniquée.', 'Ce pompier courageux a ___ emprunter la sortie de secours à cette famille paniquée.', 'fait', ['faire', 'faites', 'faisait'], 'faire_causative'),
  'He heard that young couple plan that expensive wedding.': item('Il a entendu ce jeune couple organiser ce mariage coûteux.', 'Il a ___ ce jeune couple organiser ce mariage coûteux.', 'entendu', ['entendre', 'écouté', 'entendait'], 'perception_entendre_infinitive'),
  'She saw that nervous candidate sign that official document.': item('Elle a vu ce candidat nerveux signer ce document officiel.', 'Elle a ___ ce candidat nerveux signer ce document officiel.', 'vu', ['voir', 'regardé', 'voyait'], 'perception_voir_infinitive'),
  'They let that famous artist paint that massive mural.': item('Ils ont laissé cet artiste célèbre peindre cette immense fresque.', 'Ils ont ___ cet artiste célèbre peindre cette immense fresque.', 'laissé', ['laisser', 'laissent', 'laissaient'], 'laisser_infinitive'),
  'I felt that strong wind push my empty cart.': item("J'ai senti ce vent fort pousser mon chariot vide.", "J'ai ___ ce vent fort pousser mon chariot vide.", 'senti', ['sentir', 'touché', 'sentais'], 'perception_sentir_infinitive'),
  'We heard that strict teacher read that long list of rules.': item('Nous avons entendu ce professeur strict lire cette longue liste de règles.', 'Nous avons ___ ce professeur strict lire cette longue liste de règles.', 'entendu', ['entendre', 'écouté', 'entendions'], 'perception_entendre_infinitive'),
  'That kind nurse made the shy child take that bitter medicine.': item("Cette infirmière gentille a fait prendre ce médicament amer à l'enfant timide.", "Cette infirmière gentille a ___ prendre ce médicament amer à l'enfant timide.", 'fait', ['faire', 'faites', 'faisait'], 'faire_causative'),
  'She noticed that old man drop that metal key into that storm drain.': item("Elle a remarqué ce vieil homme laisser tomber cette clé métallique dans cette bouche d'égout.", "Elle a ___ ce vieil homme laisser tomber cette clé métallique dans cette bouche d'égout.", 'remarqué', ['remarquer', 'vu', 'remarquait'], 'perception_remarquer_infinitive'),
  'They saw that wild horse jump that high wooden fence.': item('Ils ont vu ce cheval sauvage sauter par-dessus cette haute clôture en bois.', 'Ils ont ___ ce cheval sauvage sauter par-dessus cette haute clôture en bois.', 'vu', ['voir', 'regardé', 'voyaient'], 'perception_voir_infinitive'),
  'I heard that local judge announce that surprising verdict.': item("J'ai entendu ce juge local annoncer ce verdict surprenant.", "J'ai ___ ce juge local annoncer ce verdict surprenant.", 'entendu', ['entendre', 'écouté', 'entendais'], 'perception_entendre_infinitive'),
  'We felt the whole building shake during that short earthquake.': item('Nous avons senti tout le bâtiment trembler pendant ce court tremblement de terre.', 'Nous avons ___ tout le bâtiment trembler pendant ce court tremblement de terre.', 'senti', ['sentir', 'touché', 'sentions'], 'perception_sentir_infinitive'),
  'She let that helpful guide show that ancient map to that tourist group.': item('Elle a laissé ce guide serviable montrer cette carte ancienne à ce groupe de touristes.', 'Elle a ___ ce guide serviable montrer cette carte ancienne à ce groupe de touristes.', 'laissé', ['laisser', 'laisse', 'laissait'], 'laisser_infinitive'),
  'That firm manager made that late employee finish that boring report.': item('Ce manager ferme a fait terminer ce rapport ennuyeux à cet employé en retard.', 'Ce manager ferme a ___ terminer ce rapport ennuyeux à cet employé en retard.', 'fait', ['faire', 'faites', 'faisait'], 'faire_causative'),
  'They heard that skilled mechanic explain that serious engine problem.': item('Ils ont entendu ce mécanicien compétent expliquer ce grave problème de moteur.', 'Ils ont ___ ce mécanicien compétent expliquer ce grave problème de moteur.', 'entendu', ['entendre', 'écouté', 'entendaient'], 'perception_entendre_infinitive'),
  'I saw that heavy branch fall onto that parked car.': item("J'ai vu cette lourde branche tomber sur cette voiture garée.", "J'ai ___ cette lourde branche tomber sur cette voiture garée.", 'vu', ['voir', 'regardé', 'voyais'], 'perception_voir_infinitive'),
  'She felt that cold hand touch her bare arm.': item('Elle a senti cette main froide toucher son bras nu.', 'Elle a ___ cette main froide toucher son bras nu.', 'senti', ['sentir', 'touché', 'sentait'], 'perception_sentir_infinitive'),
};

function item(proposedFrench: string, text: string, correct: string, distractors: string[], category: string): TranslationSpec {
  return {
    proposedFrench,
    wordsFr: [{ text, correct, distractors, category }],
  };
}

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function repairMojibake(value: string): string {
  if (!/[ÃƒÃÃ‘]/.test(value)) return value;
  return Buffer.from(value, 'latin1').toString('utf8');
}

function renderMarkdown(ledger: Record<string, unknown>, outJson: string, repoRoot: string): string {
  const rows = Array.isArray(ledger.rows) ? ledger.rows as Array<Record<string, unknown>> : [];
  const lines = [
    '# GUSTAV French Lesson 31 Generated Ledger',
    '',
    `Output: \`${artifactPath(repoRoot, outJson)}\``,
    '',
    `Rows: ${rows.length}`,
    '',
    'Activation status: `blocked_pending_source_review`',
    '',
    'Active app seed allowed: `false`',
    '',
    '## Sample',
    '',
  ];
  for (const row of rows.slice(0, 10)) {
    lines.push(`- \`${String(row.phraseId)}\`: ${String(row.englishBase)} -> ${String(row.proposedFrench)}`);
  }
  lines.push(
    '',
    '## Safety',
    '',
    '- This file is generated inside the Gustav run container only.',
    '- It does not modify production app files.',
    '- Every row remains blocked for app activation until generated-content audit and apply approval.',
    '',
  );
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson31_ledger.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const readiness = readJson<Record<string, unknown>>(path.join(runDir, 'audits', 'gustav_readiness_gate.json'));
  const readinessState = readiness.readiness as Record<string, unknown> | undefined;
  if (!readinessState || readinessState.canStartFrenchGeneration !== true) {
    throw new Error('Readiness gate does not allow French generation.');
  }

  const graphPath = path.join(runDir, 'source_graph', 'source_graph.json');
  const graph = readJson<SourceGraph>(graphPath);
  const lessonRows = graph.phrases
    .filter((phrase) => phrase.lessonId === LESSON_ID)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (lessonRows.length !== 50) {
    throw new Error(`Expected 50 lesson ${LESSON_ID} rows, found ${lessonRows.length}.`);
  }

  const lessonTexts = new Set(lessonRows.map((row) => row.targetText));
  const unusedTranslations = Object.keys(TRANSLATIONS).filter((text) => !lessonTexts.has(text));
  if (unusedTranslations.length > 0) {
    throw new Error(`Translation table has unused rows: ${unusedTranslations.join(', ')}`);
  }

  const rows = lessonRows.map((phrase) => {
    const translation = TRANSLATIONS[phrase.targetText];
    if (!translation) throw new Error(`Missing French translation for ${phrase.targetText}`);
    const russianMeaning = phrase.sourcePrompts?.ru;
    const ukrainianMeaning = phrase.sourcePrompts?.uk;
    if (!russianMeaning || !ukrainianMeaning) {
      throw new Error(`Missing RU/UK meaning for ${phrase.id}`);
    }
    return {
      phraseId: phrase.id,
      englishBase: phrase.targetText,
      russianMeaning: repairMojibake(russianMeaning),
      ukrainianMeaning: repairMojibake(ukrainianMeaning),
      proposedFrench: translation.proposedFrench,
      wordsFr: translation.wordsFr,
      evidenceClaimIds: [
        'lesson31_causative_perception_generation_batch_v1',
        'lesson31_faire_laisser_voir_entendre_sentir_mapping_review_v1',
        'lesson31_source_graph_ru_uk_meaning_v1',
      ],
      requiredEvidence: REQUIRED_EVIDENCE,
      reviewerStatus: 'needs_review',
      activationStatus: 'blocked',
    };
  });

  const ledger = {
    schemaVersion: 'gustav-french-lesson-row-ledger-v0',
    runId,
    lessonId: LESSON_ID,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    sourceFile: lessonRows[0]?.sourceRef?.file ?? artifactPath(repoRoot, graphPath),
    activationStatus: 'blocked_pending_source_review',
    activeAppSeedAllowed: false,
    rows,
  };

  const outDir = path.join(runDir, 'generated', 'fr', 'lessons');
  ensureDir(outDir);
  const outJson = path.join(outDir, 'lesson31_row_ledger.json');
  const outMd = path.join(outDir, 'lesson31_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 31 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
