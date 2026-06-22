import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type FindingSeverity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: FindingSeverity;
  code: string;
  message: string;
  path?: string;
};

type SeedCard = {
  id: string;
  en: string;
  ru: string;
  rarity?: string;
  ipa?: string;
  literalRu?: string;
  meaningRu?: string;
  exampleEn: string;
  exampleRu?: string;
  originRu?: string;
  art?: string;
};

type SeedSet = {
  setId: string;
  titleEn: string;
  titleRu: string;
  secret: SeedCard;
  cards: SeedCard[];
};

type Translation = {
  translationFr: string;
  literalFr: string;
  meaningFr: string;
  exampleFr: string;
  originFr: string;
};

type GeneratedRow = Translation & {
  rowId: string;
  targetLocale: 'fr';
  setId: string;
  setTitleEn: string;
  setTitleFr: string;
  cardId: string;
  kind: 'card' | 'secret';
  sourceIndex: number;
  en: string;
  ipa?: string;
  rarity?: string;
  art?: string;
  sourcePreview: {
    ru: string;
    literalRu?: string;
    meaningRu?: string;
    exampleRu?: string;
    originRu?: string;
  };
  reviewerStatus: 'needs_review';
  activationApproved: false;
  generatedBy: 'gustav_collectible_reward_text_french_generation_packet';
};

type SetSummary = {
  setId: string;
  titleFr: string;
  expectedRows: number;
  generatedRows: number;
  rowsWithFrench: number;
  rowsWithReviewerNeedsReview: number;
  activationApprovedRows: number;
  missingFrenchFields: number;
  cyrillicLeaksInFrenchFields: number;
  mojibakeFrenchFields: number;
  blockers: number;
  warnings: number;
};

type Report = {
  schemaVersion: 'gustav-collectible-reward-text-french-generation-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: {
    collectibleRewardAssetGate: string;
    catalogSeed: string;
    sourceSets: string[];
  };
  outputs: {
    rowsJsonl: string;
    reviewerQueueTsv: string;
    packetJson: string;
    packetMd: string;
  };
  summary: {
    sets: number;
    expectedRows: number;
    generatedRows: number;
    rowsWithFrench: number;
    rowsWithReviewerNeedsReview: number;
    activationApprovedRows: number;
    duplicateRowIds: number;
    missingFrenchFields: number;
    cyrillicLeaksInFrenchFields: number;
    mojibakeFrenchFields: number;
    blockers: number;
    warnings: number;
    readyForReviewer: boolean;
    readyForFrenchCollectibleReview: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  setSummaries: SetSummary[];
  generationPolicy: string[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    sourceCollectibleFilesModifiedByThisScript: false;
    collectibleAssetsModifiedByThisScript: false;
    generatedFrenchLessonLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    readinessGateModifiedByThisScript: false;
    productionApplyApproved: false;
  };
};

const REQUIRED_SET_IDS = ['set09_work', 'set10_home', 'set11_love'] as const;

const SET_TITLE_FR: Record<string, string> = {
  set09_work: 'Travail et carrière',
  set10_home: 'Maison',
  set11_love: 'Amis et amour',
};

const TRANSLATIONS: Record<string, Translation> = {
  work_secret: {
    translationFr: 'Enfin vendredi !',
    literalFr: 'merci Dieu, c’est vendredi',
    meaningFr: 'Cri de soulagement à la fin de la semaine de travail, quand le week-end approche.',
    exampleFr: 'Dernier e-mail envoyé : enfin vendredi, on se voit lundi !',
    originFr: 'Abréviation de "Thank God It’s Friday", devenue une formule culte du vendredi.',
  },
  work_01: {
    translationFr: 'Passer aux choses sérieuses',
    literalFr: 'descendre aux affaires',
    meaningFr: 'Arrêter les bavardages et s’occuper directement du sujet principal.',
    exampleFr: 'Assez parlé : passons aux choses sérieuses.',
    originFr: 'L’image oppose la discussion légère au vrai travail à faire.',
  },
  work_02: {
    translationFr: 'Gravir les échelons',
    literalFr: 'monter l’échelle de carrière',
    meaningFr: 'Progresser peu à peu vers des postes plus élevés.',
    exampleFr: 'Elle a commencé comme stagiaire et a lentement gravi les échelons.',
    originFr: 'L’échelle est une vieille image de progression étape par étape.',
  },
  work_03: {
    translationFr: 'Mener la danse',
    literalFr: 'annoncer les tirs',
    meaningFr: 'Être celui qui décide et fixe la direction.',
    exampleFr: 'Dans cette cuisine, c’est le chef qui mène la danse.',
    originFr: 'L’expression vient probablement de l’idée de désigner à l’avance la cible d’un tir.',
  },
  work_04: {
    translationFr: 'Sortir des sentiers battus',
    literalFr: 'penser en dehors de la boîte',
    meaningFr: 'Chercher une solution originale au lieu de choisir l’évidence.',
    exampleFr: 'Pour gagner de nouveaux clients, il faut sortir des sentiers battus.',
    originFr: 'Popularisée par des énigmes et formations où la solution exige de dépasser le cadre habituel.',
  },
  work_05: {
    translationFr: 'Apprendre les ficelles',
    literalFr: 'apprendre les cordes',
    meaningFr: 'Comprendre comment fonctionne un nouveau poste ou une nouvelle activité.',
    exampleFr: 'Donne-moi une semaine pour apprendre les ficelles et ça ira.',
    originFr: 'Image venue de la navigation : un marin devait connaître les cordages pour manœuvrer.',
  },
  work_06: {
    translationFr: 'Travailler tard dans la nuit',
    literalFr: 'brûler l’huile de minuit',
    meaningFr: 'Rester éveillé très tard pour travailler ou étudier.',
    exampleFr: 'J’ai travaillé tard dans la nuit pour finir le rapport à temps.',
    originFr: 'Avant l’électricité, travailler tard signifiait user l’huile de la lampe.',
  },
  work_07: {
    translationFr: 'Bâcler le travail',
    literalFr: 'couper les coins',
    meaningFr: 'Faire au plus vite ou au moins cher en sacrifiant la qualité.',
    exampleFr: 'Ils ont bâclé la réparation, et le toit fuit encore.',
    originFr: 'L’image vient du raccourci pris en coupant un angle, au risque de perdre en fiabilité.',
  },
  work_08: {
    translationFr: 'Retour à la case départ',
    literalFr: 'retour à la planche à dessin',
    meaningFr: 'Le premier plan a échoué : il faut tout repenser depuis le début.',
    exampleFr: 'Le client a détesté notre idée, donc retour à la case départ.',
    originFr: 'Popularisée par une caricature du New Yorker où un ingénieur repart à sa planche à dessin.',
  },
  work_09: {
    translationFr: 'Burn-out',
    literalFr: 'combustion jusqu’à l’épuisement',
    meaningFr: 'Épuisement profond causé par un travail trop long ou trop intense.',
    exampleFr: 'Après deux ans sans pause, il a fait un burn-out total.',
    originFr: 'Le terme a été popularisé en psychologie du travail dans les années 1970.',
  },
  work_10: {
    translationFr: 'Porter plusieurs casquettes',
    literalFr: 'porter beaucoup de chapeaux',
    meaningFr: 'Assumer plusieurs rôles ou responsabilités en même temps.',
    exampleFr: 'Dans une petite startup, on porte plusieurs casquettes chaque jour.',
    originFr: 'La casquette symbolise un métier ou un rôle ; en porter plusieurs signifie changer de fonction sans cesse.',
  },
  home_secret: {
    translationFr: 'Caverne d’homme',
    literalFr: 'grotte d’homme',
    meaningFr: 'Pièce ou coin personnel où un homme se détend à sa façon.',
    exampleFr: 'Il a transformé le garage en caverne d’homme avec une grande télé et un frigo.',
    originFr: 'Expression moderne jouant sur l’idée d’un refuge privé et un peu tribal.',
  },
  home_01: {
    translationFr: 'Fais comme chez toi',
    literalFr: 'rends-toi à la maison',
    meaningFr: 'Invitation à se sentir à l’aise comme dans son propre foyer.',
    exampleFr: 'Entre, enlève tes chaussures et fais comme chez toi !',
    originFr: 'Formule d’hospitalité qui transforme l’invité en membre temporaire du foyer.',
  },
  home_02: {
    translationFr: 'Doux foyer',
    literalFr: 'maison douce maison',
    meaningFr: 'Expression chaleureuse quand on retrouve enfin son chez-soi.',
    exampleFr: 'Après deux semaines d’absence, j’ai posé mes sacs et soupiré : doux foyer.',
    originFr: 'La formule anglaise est liée à la chanson populaire "Home, Sweet Home!" du XIXe siècle.',
  },
  home_03: {
    translationFr: 'Grand nettoyage de printemps',
    literalFr: 'nettoyage de printemps',
    meaningFr: 'Nettoyage complet de la maison, souvent après l’hiver.',
    exampleFr: 'On a fait un grand nettoyage de printemps et jeté trois sacs de bazar.',
    originFr: 'Tradition liée au retour des beaux jours, quand on aère et remet la maison en ordre.',
  },
  home_04: {
    translationFr: 'Tout sauf l’évier de la cuisine',
    literalFr: 'tout sauf l’évier de la cuisine',
    meaningFr: 'Emporter ou inclure presque tout, bien plus que nécessaire.',
    exampleFr: 'Pour une seule nuit, elle a pris tout sauf l’évier de la cuisine.',
    originFr: 'L’évier représente l’objet fixe impossible à emporter : s’il manque seulement lui, c’est qu’on a tout pris.',
  },
  home_05: {
    translationFr: 'Un cadavre dans le placard',
    literalFr: 'un squelette dans le placard',
    meaningFr: 'Secret honteux ou problème familial dont personne ne parle.',
    exampleFr: 'Chaque famille a un cadavre dans le placard dont elle ne parle pas.',
    originFr: 'Image victorienne d’un secret caché si longtemps qu’il devient un squelette.',
  },
  home_06: {
    translationFr: 'Faire un triomphe',
    literalFr: 'faire tomber la maison',
    meaningFr: 'Déclencher un enthousiasme énorme dans le public.',
    exampleFr: 'Sa dernière chanson a fait un triomphe : tout le monde était debout.',
    originFr: 'Dans le théâtre, une salle qui explose d’applaudissements semble presque faire trembler le bâtiment.',
  },
  home_07: {
    translationFr: 'S’entendre à merveille',
    literalFr: 's’entendre comme une maison en feu',
    meaningFr: 'Créer très vite une relation vive, facile et chaleureuse.',
    exampleFr: 'Je craignais qu’ils se disputent, mais ils se sont entendus à merveille.',
    originFr: 'Le feu évoque ici quelque chose qui prend vite et fortement, pas une catastrophe.',
  },
  home_08: {
    translationFr: 'Un toit au-dessus de la tête',
    literalFr: 'un toit au-dessus de ta tête',
    meaningFr: 'Un logement, même modeste, qui protège et donne un minimum de sécurité.',
    exampleFr: 'C’est un petit appartement, mais au moins nous avons un toit au-dessus de la tête.',
    originFr: 'Le toit représente la protection de base offerte par une maison.',
  },
  home_09: {
    translationFr: 'Le foyer est là où est le cœur',
    literalFr: 'la maison est là où est le cœur',
    meaningFr: 'Le vrai chez-soi est auprès des personnes qu’on aime.',
    exampleFr: 'J’ai vécu dans cinq villes, mais le foyer est là où est le cœur : avec ma famille.',
    originFr: 'Vieille idée sentimentale : l’attachement compte plus que l’adresse.',
  },
  home_10: {
    translationFr: 'Mettre ça sous le tapis',
    literalFr: 'balayer sous le tapis',
    meaningFr: 'Cacher un problème au lieu de le régler.',
    exampleFr: 'On ne peut pas simplement mettre cette erreur sous le tapis en espérant que personne ne la voie.',
    originFr: 'Image domestique : on cache la poussière au lieu de nettoyer vraiment.',
  },
  love_secret: {
    translationFr: 'Amitié masculine très proche',
    literalFr: 'bromance',
    meaningFr: 'Relation très complice entre deux hommes, avec une affection visible mais non romantique.',
    exampleFr: 'Ces deux-là sont inséparables : une vraie bromance.',
    originFr: 'Mot-valise moderne formé de "bro" et "romance".',
  },
  love_01: {
    translationFr: 'Accrocher tout de suite',
    literalFr: 'se frapper bien',
    meaningFr: 'Bien s’entendre immédiatement avec quelqu’un.',
    exampleFr: 'On s’est rencontrés à une fête et on a accroché tout de suite.',
    originFr: 'L’expression suggère un contact qui fonctionne dès le premier moment.',
  },
  love_02: {
    translationFr: 'Dans les bons comme dans les mauvais moments',
    literalFr: 'à travers l’épais et le mince',
    meaningFr: 'Rester fidèle et présent malgré les difficultés.',
    exampleFr: 'Elle est restée à mes côtés dans les bons comme dans les mauvais moments.',
    originFr: 'Image ancienne de traverser des terrains faciles ou difficiles sans abandonner.',
  },
  love_03: {
    translationFr: 'Une épaule sur laquelle pleurer',
    literalFr: 'une épaule pour pleurer dessus',
    meaningFr: 'Personne qui écoute et console quand on souffre.',
    exampleFr: 'Après la rupture, elle avait juste besoin d’une épaule sur laquelle pleurer.',
    originFr: 'Le geste physique de poser sa tête sur l’épaule devient symbole de soutien émotionnel.',
  },
  love_04: {
    translationFr: 'Se marier',
    literalFr: 'nouer le nœud',
    meaningFr: 'Se marier, officialiser une union.',
    exampleFr: 'Après dix ans ensemble, ils se sont enfin mariés.',
    originFr: 'Dans plusieurs traditions, les mains des mariés étaient liées par un ruban ou une corde.',
  },
  love_05: {
    translationFr: 'Coup de foudre',
    literalFr: 'amour au premier regard',
    meaningFr: 'Amour ressenti immédiatement en voyant quelqu’un.',
    exampleFr: 'Pour mes parents, ce fut un coup de foudre à un arrêt de bus.',
    originFr: 'L’idée que l’amour entre par les yeux remonte à l’Antiquité et aux images de flèches amoureuses.',
  },
  love_06: {
    translationFr: 'Comme deux gouttes d’eau',
    literalFr: 'deux pois dans une cosse',
    meaningFr: 'Deux personnes très proches ou très semblables.',
    exampleFr: 'Ces jumeaux sont comme deux gouttes d’eau.',
    originFr: 'Des pois dans la même cosse se ressemblent et restent côte à côte.',
  },
  love_07: {
    translationFr: 'Faire sa demande',
    literalFr: 'faire jaillir la question',
    meaningFr: 'Demander quelqu’un en mariage.',
    exampleFr: 'Il a fait sa demande sur la plage au coucher du soleil.',
    originFr: 'Le verbe "pop" suggère une question lâchée soudainement.',
  },
  love_08: {
    translationFr: 'Des relations haut placées',
    literalFr: 'des amis dans les hauts lieux',
    meaningFr: 'Des connaissances influentes capables d’aider.',
    exampleFr: 'Il a obtenu le contrat parce qu’il a des relations haut placées.',
    originFr: 'Les "hauts lieux" évoquent les postes de pouvoir et les personnes qui ouvrent des portes.',
  },
  love_09: {
    translationFr: 'Une union parfaite',
    literalFr: 'une paire faite au paradis',
    meaningFr: 'Deux personnes ou choses qui vont parfaitement ensemble.',
    exampleFr: 'Le café et un matin pluvieux : une union parfaite.',
    originFr: 'L’expression repose sur l’idée ancienne que certaines unions sont décidées par le ciel.',
  },
  love_10: {
    translationFr: 'Ma moitié',
    literalFr: 'ma meilleure moitié',
    meaningFr: 'Nom affectueux pour son conjoint ou la personne aimée.',
    exampleFr: 'J’aimerais venir, mais je vais d’abord demander à ma moitié.',
    originFr: 'L’idée du partenaire comme moitié de soi existe depuis l’Antiquité.',
  },
};

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

function rowFromSeed(set: SeedSet, card: SeedCard, sourceIndex: number, kind: 'card' | 'secret'): GeneratedRow {
  const translation = TRANSLATIONS[card.id] ?? {
    translationFr: '',
    literalFr: '',
    meaningFr: '',
    exampleFr: '',
    originFr: '',
  };
  return {
    rowId: `fr_${set.setId}_${card.id}`,
    targetLocale: 'fr',
    setId: set.setId,
    setTitleEn: set.titleEn,
    setTitleFr: SET_TITLE_FR[set.setId] ?? '',
    cardId: card.id,
    kind,
    sourceIndex,
    en: card.en,
    ipa: card.ipa,
    rarity: card.rarity,
    art: card.art,
    ...translation,
    sourcePreview: {
      ru: card.ru,
      literalRu: card.literalRu,
      meaningRu: card.meaningRu,
      exampleRu: card.exampleRu,
      originRu: card.originRu,
    },
    reviewerStatus: 'needs_review',
    activationApproved: false,
    generatedBy: 'gustav_collectible_reward_text_french_generation_packet',
  };
}

function generateRows(seedSets: SeedSet[], findings: Finding[]): GeneratedRow[] {
  const rows: GeneratedRow[] = [];
  for (const setId of REQUIRED_SET_IDS) {
    const set = seedSets.find((entry) => entry.setId === setId);
    if (!set) {
      addFinding(findings, 'blocker', 'collectible_seed_set_missing', `Missing collectible seed set ${setId}.`, 'tools/collectibles/catalog_seed.json');
      continue;
    }
    if (!SET_TITLE_FR[setId]) {
      addFinding(findings, 'blocker', 'collectible_set_title_fr_missing', `Missing French title for ${setId}.`);
    }
    rows.push(rowFromSeed(set, set.secret, 0, 'secret'));
    set.cards.forEach((card, index) => rows.push(rowFromSeed(set, card, index + 1, 'card')));
  }
  return rows;
}

function validateSet(setId: string, rows: GeneratedRow[], findings: Finding[]): SetSummary {
  let missingFrenchFields = 0;
  let cyrillicLeaksInFrenchFields = 0;
  let mojibakeFrenchFields = 0;

  for (const row of rows) {
    const frenchFields = [
      row.setTitleFr,
      row.translationFr,
      row.literalFr,
      row.meaningFr,
      row.exampleFr,
      row.originFr,
    ];
    for (const value of frenchFields) {
      if (!hasText(value)) missingFrenchFields += 1;
      if (typeof value === 'string' && hasCyrillic(value)) cyrillicLeaksInFrenchFields += 1;
      if (typeof value === 'string' && hasMojibake(value)) mojibakeFrenchFields += 1;
    }
  }

  if (rows.length !== 11) {
    addFinding(findings, 'blocker', 'collectible_generated_set_row_count_mismatch', `${setId} generated ${rows.length} rows; expected 11.`);
  }
  if (missingFrenchFields > 0) {
    addFinding(findings, 'blocker', 'collectible_missing_french_fields', `${setId} has ${missingFrenchFields} missing French fields.`);
  }
  if (cyrillicLeaksInFrenchFields > 0) {
    addFinding(findings, 'blocker', 'collectible_cyrillic_leak_in_french_fields', `${setId} has ${cyrillicLeaksInFrenchFields} Cyrillic leaks in French fields.`);
  }
  if (mojibakeFrenchFields > 0) {
    addFinding(findings, 'blocker', 'collectible_mojibake_in_french_fields', `${setId} has ${mojibakeFrenchFields} mojibake markers in French fields.`);
  }

  const setFindings = findings.filter((finding) => finding.message.includes(setId));
  return {
    setId,
    titleFr: SET_TITLE_FR[setId] ?? '',
    expectedRows: 11,
    generatedRows: rows.length,
    rowsWithFrench: rows.filter((row) => hasText(row.translationFr)).length,
    rowsWithReviewerNeedsReview: rows.filter((row) => row.reviewerStatus === 'needs_review').length,
    activationApprovedRows: rows.filter((row) => row.activationApproved).length,
    missingFrenchFields,
    cyrillicLeaksInFrenchFields,
    mojibakeFrenchFields,
    blockers: setFindings.filter((finding) => finding.severity === 'blocker').length,
    warnings: setFindings.filter((finding) => finding.severity === 'warning').length,
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Collectible Reward Text French Generation Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Sets: ${report.summary.sets}`,
    `- Expected rows: ${report.summary.expectedRows}`,
    `- Generated rows: ${report.summary.generatedRows}`,
    `- Rows with French: ${report.summary.rowsWithFrench}`,
    `- Rows needing reviewer: ${report.summary.rowsWithReviewerNeedsReview}`,
    `- Activation-approved rows: ${report.summary.activationApprovedRows}`,
    `- Duplicate row ids: ${report.summary.duplicateRowIds}`,
    `- Missing French fields: ${report.summary.missingFrenchFields}`,
    `- Cyrillic leaks in French fields: ${report.summary.cyrillicLeaksInFrenchFields}`,
    `- Mojibake French fields: ${report.summary.mojibakeFrenchFields}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for French collectible review: ${report.summary.readyForFrenchCollectibleReview ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Set Summaries',
    '',
  ];

  for (const set of report.setSummaries) {
    lines.push(`- \`${set.setId}\` ${set.titleFr}: ${set.generatedRows}/${set.expectedRows} rows, French ${set.rowsWithFrench}, reviewer ${set.rowsWithReviewerNeedsReview}, blockers ${set.blockers}`);
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
    '- This packet did not modify source collectible files.',
    '- This packet did not modify collectible image assets.',
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
    throw new Error('Usage: npx tsx scripts/gustav_collectible_reward_text_french_generation_packet.ts --run <run-dir>');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const outDir = path.join(runDir, 'generated', 'fr', 'app_domains', 'collectibles');
  const auditsDir = path.join(runDir, 'audits');
  ensureDir(outDir);
  ensureDir(auditsDir);

  const assetGatePath = path.join(auditsDir, 'collectible_reward_asset_gate.json');
  const catalogSeedPath = path.resolve(repoRoot, 'tools/collectibles/catalog_seed.json');
  const rowsPath = path.join(outDir, 'collectible_reward_fr_rows.jsonl');
  const reviewerQueuePath = path.join(outDir, 'collectible_reward_fr_reviewer_queue.tsv');
  const packetJsonPath = path.join(auditsDir, 'collectible_reward_text_french_generation_packet.json');
  const packetMdPath = path.join(auditsDir, 'collectible_reward_text_french_generation_packet.md');

  const findings: Finding[] = [];
  if (!fs.existsSync(assetGatePath)) {
    addFinding(findings, 'blocker', 'collectible_asset_gate_missing', 'P7 collectible reward asset gate is missing.', rel(repoRoot, assetGatePath));
  } else {
    const assetGate = readJson<Record<string, unknown>>(assetGatePath);
    const summary = object(assetGate.summary);
    if (assetGate.status !== 'PASS' || !b(summary, 'readyForP8ReadinessExtension')) {
      addFinding(findings, 'blocker', 'collectible_asset_gate_not_ready', 'P7 collectible reward asset gate is not PASS/ready.', rel(repoRoot, assetGatePath));
    }
  }

  const catalogSeed = readJson<{ sets: SeedSet[] }>(catalogSeedPath);
  const rows = generateRows(catalogSeed.sets, findings);
  const setSummaries = REQUIRED_SET_IDS.map((setId) => validateSet(setId, rows.filter((row) => row.setId === setId), findings));
  const duplicateRowIds = rows.length - new Set(rows.map((row) => row.rowId)).size;
  if (duplicateRowIds > 0) addFinding(findings, 'blocker', 'collectible_duplicate_row_ids', `Generated collectible rows have ${duplicateRowIds} duplicate row ids.`);

  const activationApprovedRows = rows.filter((row) => row.activationApproved).length;
  if (activationApprovedRows > 0) addFinding(findings, 'blocker', 'collectible_rows_activation_approved', 'Generated collectible rows must not be activation-approved.');

  fs.writeFileSync(rowsPath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
  const tsvHeader = ['rowId', 'targetLocale', 'setId', 'cardId', 'kind', 'en', 'translationFr', 'literalFr', 'meaningFr', 'exampleFr', 'reviewerStatus', 'activationApproved'];
  const tsvRows = rows.map((row) => [
    row.rowId,
    row.targetLocale,
    row.setId,
    row.cardId,
    row.kind,
    row.en,
    row.translationFr,
    row.literalFr,
    row.meaningFr,
    row.exampleFr,
    row.reviewerStatus,
    row.activationApproved,
  ].map(tsvCell).join('\t'));
  fs.writeFileSync(reviewerQueuePath, `${tsvHeader.join('\t')}\n${tsvRows.join('\n')}\n`, 'utf8');

  const jsonlRows = lineCount(rowsPath);
  const tsvLineCount = lineCount(reviewerQueuePath);
  if (jsonlRows !== rows.length) addFinding(findings, 'blocker', 'jsonl_row_count_mismatch', `Rows JSONL has ${jsonlRows} lines; expected ${rows.length}.`, rel(repoRoot, rowsPath));
  if (tsvLineCount !== rows.length + 1) addFinding(findings, 'blocker', 'reviewer_tsv_row_count_mismatch', `Reviewer TSV has ${tsvLineCount} lines; expected ${rows.length + 1}.`, rel(repoRoot, reviewerQueuePath));

  const missingFrenchFields = setSummaries.reduce((sum, set) => sum + set.missingFrenchFields, 0);
  const cyrillicLeaksInFrenchFields = setSummaries.reduce((sum, set) => sum + set.cyrillicLeaksInFrenchFields, 0);
  const mojibakeFrenchFields = setSummaries.reduce((sum, set) => sum + set.mojibakeFrenchFields, 0);
  const rowsWithReviewerNeedsReview = rows.filter((row) => row.reviewerStatus === 'needs_review').length;
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;

  const report: Report = {
    schemaVersion: 'gustav-collectible-reward-text-french-generation-packet-v0',
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' : 'BLOCK',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      collectibleRewardAssetGate: rel(repoRoot, assetGatePath),
      catalogSeed: rel(repoRoot, catalogSeedPath),
      sourceSets: [...REQUIRED_SET_IDS],
    },
    outputs: {
      rowsJsonl: rel(repoRoot, rowsPath),
      reviewerQueueTsv: rel(repoRoot, reviewerQueuePath),
      packetJson: rel(repoRoot, packetJsonPath),
      packetMd: rel(repoRoot, packetMdPath),
    },
    summary: {
      sets: REQUIRED_SET_IDS.length,
      expectedRows: REQUIRED_SET_IDS.length * 11,
      generatedRows: rows.length,
      rowsWithFrench: rows.filter((row) => hasText(row.translationFr)).length,
      rowsWithReviewerNeedsReview,
      activationApprovedRows,
      duplicateRowIds,
      missingFrenchFields,
      cyrillicLeaksInFrenchFields,
      mojibakeFrenchFields,
      blockers,
      warnings,
      readyForReviewer: blockers === 0 && rowsWithReviewerNeedsReview === rows.length,
      readyForFrenchCollectibleReview: blockers === 0 && rows.length === 33,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    setSummaries,
    generationPolicy: [
      'Generated collectible text rows are reviewer-needed by default.',
      'Every generated collectible row is explicitly scoped to targetLocale=fr.',
      'No generated collectible row is activation-approved.',
      'Catalog seed, client catalog, server catalog, and image assets are read-only inputs.',
      'This packet writes only GUSTAV pipeline outputs and audit artifacts.',
      'Production app apply remains blocked until reviewer decisions and explicit app-write approval exist.',
    ],
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      sourceCollectibleFilesModifiedByThisScript: false,
      collectibleAssetsModifiedByThisScript: false,
      generatedFrenchLessonLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      readinessGateModifiedByThisScript: false,
      productionApplyApproved: false,
    },
  };

  fs.writeFileSync(packetJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(packetMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV collectible reward text French generation packet: ${report.status}`);
  console.log(`Generated rows: ${report.summary.generatedRows}/${report.summary.expectedRows}`);
  console.log(`Rows with French: ${report.summary.rowsWithFrench}`);
  console.log(`Rows needing reviewer: ${report.summary.rowsWithReviewerNeedsReview}`);
  console.log(`Activation-approved rows: ${report.summary.activationApprovedRows}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Ready for French collectible review: ${report.summary.readyForFrenchCollectibleReview ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, packetJsonPath)}`);

  if (report.status !== 'PASS') {
    process.exitCode = 1;
  }
}

main();
