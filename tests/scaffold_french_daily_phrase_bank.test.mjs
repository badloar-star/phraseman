import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFrenchDailyPhraseScaffold,
  FRENCH_AUTHORITATIVE_SOURCE_ROWS,
  resolveFrenchSourceCheckedAt,
} from '../scripts/scaffold_french_daily_phrase_bank.mjs';

function legacyBank() {
  const firstTargets = [
    'Avoir le cafard',
    'Poser un lapin à quelqu’un',
    'Mettre les pieds dans le plat',
    'Avoir un poil dans la main',
    'Raconter des salades',
    'Couper les cheveux en quatre',
    'Coûter les yeux de la tête',
    'Tomber dans les pommes',
    'Prendre la mouche',
    'Faire la grasse matinée',
    'Avoir la tête dans les nuages',
    'Perdre la tête',
    'Avoir la tête sur les épaules',
    'Prendre ses jambes à son cou',
    'Avoir les dents longues',
    'Avoir l’estomac dans les talons',
    'Se creuser la tête',
    'En avoir ras le bol',
    'Avoir le bras long',
    'Mettre la main à la pâte',
    'Jeter l’éponge',
    'Avoir du pain sur la planche',
    'Mettre les bouchées doubles',
    'Cracher le morceau',
    'Tourner autour du pot',
    'Appuyer sur le champignon',
    'Faire chou blanc',
    'Tirer son épingle du jeu',
    'Tendre la perche',
    'Mettre la charrue avant les bœufs',
    'Quand les poules auront des dents',
    'Marcher sur des œufs',
    'Vendre la peau de l’ours avant de l’avoir tué',
    'Chercher la petite bête',
    'Être comme un poisson dans l’eau',
    'Avoir d’autres chats à fouetter',
    'Avoir une araignée au plafond',
    'Avoir le bourdon',
    'Être la cinquième roue du carrosse',
    'Faire d’une pierre deux coups',
    'Avoir la pêche',
    'Tomber à l’eau',
    'Être dans le pétrin',
    'Mettre du beurre dans les épinards',
    'Passer du coq à l’âne',
    'Mettre la puce à l’oreille',
    'Garder une poire pour la soif',
    'Compter pour du beurre',
    'C’est la fin des haricots',
    'Être dans les choux',
    'Les carottes sont cuites',
    'Découvrir le pot aux roses',
    'Avoir bon pied bon œil',
    'Dormir sur ses deux oreilles',
    'Tendre l’oreille',
    'Faire la sourde oreille',
    'Avoir le nez creux',
    'Mener quelqu’un par le bout du nez',
    'Prendre la porte',
    'Mettre la clé sous la porte',
    'Trouver chaussure à son pied',
    'Tirer les ficelles',
    'Jeter de l’huile sur le feu',
    'Mettre le feu aux poudres',
    'Il n’y a pas le feu au lac',
    'Remuer ciel et terre',
    'Être dans la lune',
    'Décrocher la lune',
    'Voir des étoiles',
    'Être aux anges',
    'Pleuvoir des cordes',
    'Après la pluie, le beau temps',
    'Faire la pluie et le beau temps',
    'Être trempé comme une soupe',
    'Être dans le brouillard',
    'Avoir le vent en poupe',
    'Changer de cap',
    'Mener sa barque',
    'Naviguer à vue',
    'Mettre les voiles',
    'Prendre le large',
    'Tenir la route',
    'Rouler quelqu’un dans la farine',
    'Sortir des sentiers battus',
    'Prendre un virage',
    'Il y a de l’eau dans le gaz',
    'Avoir la main verte',
    'Donner un coup de main',
    'Avoir le dernier mot',
    'Mettre les points sur les i',
    'Tourner la page',
    'Lire entre les lignes',
    'Prêcher dans le désert',
    'Couper la parole',
    'Prendre la parole',
    'Tourner sept fois sa langue dans sa bouche',
    'Avoir les nerfs à vif',
    'Avoir le sang chaud',
    'Sauver la face',
    'Perdre la face',
    'Faire table rase',
    'Battre le fer pendant qu’il est chaud',
    'Avoir la gorge serrée',
    'Avoir les mains liées',
    'Faire des pieds et des mains',
    'Se faire des cheveux blancs',
    'Être au bout du rouleau',
    'Dérouler le tapis rouge',
    'Être dans le rouge',
    'Voir la vie en rose',
    'Broyer du noir',
    'Rire jaune',
    'Voir rouge',
    'Donner le feu vert',
    'Faire grise mine',
    'Chercher midi à quatorze heures',
    'Remettre les pendules à l’heure',
    'Être dans le bain',
    'Jeter un froid',
    'Briser la glace',
    'Battre froid à quelqu’un',
    'Tomber de haut',
    'Revenir de loin',
    'Voir venir',
    'Faire contre mauvaise fortune bon cœur',
    'Tirer le diable par la queue',
    'Mettre la main au portefeuille',
    'Jeter l’argent par les fenêtres',
    'Rouler sur l’or',
    'Valoir son pesant d’or',
    'Porter bonheur',
    'Malin comme un singe',
    'Rusé comme un renard',
    'Muet comme une carpe',
    'Faire le pied de grue',
    'Monter sur ses grands chevaux',
    'Prendre le taureau par les cornes',
    'Se regarder en chiens de faïence',
    'Être connu comme le loup blanc',
    'Hurler avec les loups',
  ];
  const firstLegacyIds = [
    'fr-daily-idiom-001',
    'fr-daily-idiom-002',
    'fr-daily-idiom-003',
    'fr-daily-idiom-005',
    'fr-daily-idiom-006',
    'fr-daily-idiom-007',
    'fr-daily-idiom-008',
    'fr-daily-idiom-009',
    'fr-daily-idiom-010',
    'fr-daily-idiom-011',
  ];
  return {
    rows: Array.from({ length: 176 }, (_, index) => ({
      id: firstLegacyIds[index] ?? `fr-daily-idiom-${String(index + 2).padStart(3, '0')}`,
      order: index + 1,
      targetText: firstTargets[index] ?? `Expression française ${index + 1}`,
      literal: `Ancien littéral ${index + 1}`,
      meaning: `Ancien sens ${index + 1}`,
      text: `Ancien texte sec ${index + 1}`,
      literal_uk: `Старий буквальний ${index + 1}`,
      meaning_uk: `Старе значення ${index + 1}`,
      text_uk: `Старий сухий текст ${index + 1}`,
      active: false,
      activationApproved: false,
    })),
  };
}

test('builds a closed 176-row French scaffold without promoting rejected legacy prose', () => {
  const result = buildFrenchDailyPhraseScaffold({
    legacyBank: legacyBank(),
    checkedAt: '2026-09-26T12:00:00.000Z',
  });

  assert.equal(result.bank.studyTarget, 'fr');
  assert.equal(result.bank.activationApproved, false);
  assert.equal(result.bank.status, 'SOURCE_PARTIAL_HOLD');
  assert.equal(result.bank.rows.length, 176);
  assert.deepEqual(result.bank.rows.map((row) => row.id),
    Array.from({ length: 176 }, (_, index) => `fr-${String(index + 1).padStart(3, '0')}`));

  const first = result.bank.rows[0];
  assert.equal(first.order, 1);
  assert.equal(first.legacyId, 'fr-daily-idiom-001');
  assert.equal(first.targetText, 'Avoir le cafard');
  assert.equal(first.targetExample, '');
  assert.equal(first.literal_ru, '');
  assert.equal(first.meaning_ru, '');
  assert.equal(first.text_ru, '');
  assert.equal(first.literal_uk, '');
  assert.equal(first.meaning_uk, '');
  assert.equal(first.text_uk, '');
  assert.equal(first.candidateStatus, 'SOURCE_SCAFFOLD_HOLD');
  assert.equal(first.active, false);
  assert.equal(first.activationApproved, false);
  assert.equal(first.legacyDraft.text_ru, 'Ancien texte sec 1');
  assert.equal(first.legacyDraft.text_uk, 'Старий сухий текст 1');
  assert.equal(result.bank.rows[3].legacyId, 'fr-daily-idiom-005');

  const progressionReplacement = result.bank.rows[37];
  assert.equal(progressionReplacement.id, 'fr-038');
  assert.equal(progressionReplacement.targetText, 'Avoir un cœur d’artichaut');
  assert.equal(progressionReplacement.legacyDraft.meaning_ru, 'Ancien sens 38');
  assert.deepEqual(progressionReplacement.selectionOverride, {
    legacyTargetText: 'Avoir le bourdon',
    replacementReason: 'near_duplicate_meaning_with_fr-001',
    conflictingRowId: 'fr-001',
    legacyDraftScope: 'SUPERSEDED_HISTORICAL_RECORD_ONLY',
    currentSourceId: 'larousse:artichaut',
  });
  assert.ok(!result.bank.rows.some((row) => row.targetText === 'Avoir le bourdon'));
});

test('creates an honest one-hundred-forty-of-176 authoritative source ledger and target-neutral linkage', () => {
  const result = buildFrenchDailyPhraseScaffold({
    legacyBank: legacyBank(),
    checkedAt: '2026-09-26T12:00:00.000Z',
  });

  assert.equal(FRENCH_AUTHORITATIVE_SOURCE_ROWS.length, 140);
  assert.equal(result.authoritativeLedger.requiredCount, 176);
  assert.equal(result.authoritativeLedger.acceptedCount, 140);
  assert.equal(result.authoritativeLedger.status, 'SOURCE_PARTIAL_HOLD');
  assert.equal(result.authoritativeLedger.rows.length, 140);
  assert.deepEqual(result.authoritativeLedger.sourceHomes, [
    'https://dictionnaire.lerobert.com/',
    'https://www.larousse.fr/dictionnaires/francais/',
  ]);
  assert.equal(Object.hasOwn(result.authoritativeLedger, 'sourceHome'), false);
  assert.deepEqual(result.linkage.authoritativeLedger.sourceHomes, result.authoritativeLedger.sourceHomes);
  assert.equal(Object.hasOwn(result.linkage.authoritativeLedger, 'sourceHome'), false);
  assert.deepEqual(result.linkage.linkedCandidateRows.map((link) => link.rowId),
    Array.from({ length: 140 }, (_, index) => `fr-${String(index + 1).padStart(3, '0')}`));
  assert.deepEqual(result.linkage.linkedCandidateRows.map((link) => link.ledgerRow),
    Array.from({ length: 140 }, (_, index) => index));
  assert.ok(result.linkage.linkedCandidateRows.every((link) => !Object.hasOwn(link, 'cvcRow')));
  assert.equal(result.linkage.status, 'SOURCE_PARTIAL_HOLD');
  assert.equal(result.authoritativeLedger.rows[0].checkedAt, '2026-09-26T19:57:37.994Z');
  assert.equal(result.authoritativeLedger.rows[14].checkedAt, '2026-09-27T01:08:57.113Z');
  assert.equal(result.authoritativeLedger.rows[19].checkedAt, '2026-09-27T01:17:22.756Z');
  assert.equal(result.authoritativeLedger.rows[16].httpStatus, 403);
  assert.equal(result.authoritativeLedger.rows[16].retrievalMethod, 'official_search_result_snippet');
  assert.equal(result.authoritativeLedger.rows[20].httpStatus, 403);
  assert.equal(result.authoritativeLedger.rows[23].httpStatus, 200);
  assert.equal(result.authoritativeLedger.rows[24].checkedAt, '2026-09-27T01:32:47.361Z');
  assert.ok(result.authoritativeLedger.rows.slice(25, 30).every((row) => row.httpStatus === 403));
  assert.ok(result.authoritativeLedger.rows.slice(25, 30).every((row) => row.retrievalMethod === 'official_search_result_snippet'));
  assert.equal(result.authoritativeLedger.rows[29].checkedAt, '2026-09-27T01:45:53.058Z');
  assert.ok(result.authoritativeLedger.rows.slice(30, 34).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(30, 34).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[30].definitionQuote, 'Quand les poules auront des dents, jamais.');
  assert.equal(result.authoritativeLedger.rows[31].definitionQuote, 'Marcher sur des œufs, marcher avec beaucoup de précautions ; parler, agir avec la plus grande prudence.');
  assert.equal(result.authoritativeLedger.rows[32].definitionQuote, "Vendre la peau de l'ours (avant de l'avoir tué), disposer d'une chose avant de la posséder ; se flatter trop tôt du succès.");
  assert.equal(result.authoritativeLedger.rows[33].definitionQuote, 'Chercher la petite bête, s’évertuer à découvrir un défaut sans importance qui permettra de déprécier qqn ou qqch.');
  assert.equal(result.authoritativeLedger.rows[34].httpStatus, 403);
  assert.equal(result.authoritativeLedger.rows[34].retrievalMethod, 'official_search_result_snippet');
  assert.equal(result.authoritativeLedger.rows[34].definitionQuote, 'Être comme un poisson dans l’eau, se trouver dans son élément.');
  assert.ok(result.authoritativeLedger.rows.slice(30, 35).every((row) => row.checkedAt === '2026-09-27T02:02:34.000Z'));
  assert.ok(result.authoritativeLedger.rows.slice(35, 40).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(35, 40).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[35].definitionQuote, "FAMILIER Avoir d'autres chats à fouetter, avoir des préoccupations plus sérieuses.");
  assert.equal(result.authoritativeLedger.rows[36].definitionQuote, "FAMILIER Avoir une araignée au plafond, avoir l'esprit dérangé.");
  assert.equal(result.authoritativeLedger.rows[37].targetText, 'Avoir un cœur d’artichaut');
  assert.equal(result.authoritativeLedger.rows[37].sourceId, 'larousse:artichaut');
  assert.equal(result.authoritativeLedger.rows[37].definitionQuote, "Figuré. Avoir un cœur d'artichaut, être inconstant en amour, volage.");
  assert.equal(result.authoritativeLedger.rows[37].usageMarker, 'Figuré');
  assert.equal(result.authoritativeLedger.rows[38].definitionQuote, "Familier. La cinquième roue du carrosse, personne qui n'est utile à rien, ou considérée comme inutile.");
  assert.equal(result.authoritativeLedger.rows[39].definitionQuote, "Faire coup double, faire d'une pierre deux coups, atteindre deux objectifs à la fois en n'utilisant qu'un seul moyen d'action.");
  assert.equal(result.authoritativeLedger.rows[35].checkedAt, '2026-09-27T02:08:02.000Z');
  assert.equal(result.authoritativeLedger.rows[36].checkedAt, '2026-09-27T02:08:02.000Z');
  assert.equal(result.authoritativeLedger.rows[37].checkedAt, '2026-09-27T06:04:24.751Z');
  assert.equal(result.authoritativeLedger.rows[38].checkedAt, '2026-09-27T02:08:02.000Z');
  assert.equal(result.authoritativeLedger.rows[39].checkedAt, '2026-09-27T02:08:02.000Z');
  assert.ok(result.authoritativeLedger.rows.slice(40, 45).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(40, 45).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[40].targetText, 'Avoir la pêche');
  assert.equal(result.authoritativeLedger.rows[40].definitionQuote, 'Avoir la pêche : être en forme (→ la frite).');
  assert.equal(result.authoritativeLedger.rows[40].usageMarker, 'locution, familier');
  assert.equal(result.authoritativeLedger.rows[41].definitionQuote, "Tomber à l'eau : être abandonné, échouer.");
  assert.equal(result.authoritativeLedger.rows[42].definitionQuote, 'FAMILIER Situation difficile, pénible : Être dans le pétrin.');
  assert.equal(result.authoritativeLedger.rows[43].definitionQuote, 'Mettre du beurre dans les épinards, améliorer sa situation financière.');
  assert.equal(result.authoritativeLedger.rows[44].definitionQuote, "Passer du coq à l'âne, passer sans raison d'un sujet à l'autre.");
  assert.ok(result.authoritativeLedger.rows.slice(40, 45).every((row) => row.checkedAt === '2026-09-27T06:56:49.2746827Z'));
  assert.ok(result.authoritativeLedger.rows.slice(45, 50).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(45, 50).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[45].sourceId, 'larousse:puce');
  assert.equal(result.authoritativeLedger.rows[45].targetText, 'Mettre la puce à l’oreille');
  assert.equal(result.authoritativeLedger.rows[45].definitionQuote, "Mettre la puce à l'oreille de quelqu'un, l'alerter, l'intriguer sur quelque chose qui se trame.");
  assert.equal(result.authoritativeLedger.rows[46].definitionQuote, "Garder une poire pour la soif, réserver quelque chose pour l'avenir, faire des économies pour un futur incertain.");
  assert.equal(result.authoritativeLedger.rows[47].definitionQuote, 'Compter pour du beurre, ne compter pour rien dans une partie ; être considéré comme quantité négligeable.');
  assert.equal(result.authoritativeLedger.rows[48].definitionQuote, "C'est la fin des haricots, c'est la fin de tout, le désastre complet.");
  assert.equal(result.authoritativeLedger.rows[48].usageMarker, 'Populaire');
  assert.equal(result.authoritativeLedger.rows[49].sourceId, 'larousse:chat');
  assert.equal(result.authoritativeLedger.rows[49].targetText, 'Avoir un chat dans la gorge');
  assert.equal(result.authoritativeLedger.rows[49].definitionQuote, "Avoir un chat dans la gorge, éprouver dans le gosier un embarras soudain ; être enroué.");
  assert.equal(result.authoritativeLedger.rows[49].usageMarker, 'expression');
  assert.ok(result.authoritativeLedger.rows.slice(45, 49).every((row) => row.checkedAt === '2026-09-27T07:26:17.8992425Z'));
  assert.equal(result.authoritativeLedger.rows[49].checkedAt, '2026-09-27T07:46:47.0416896Z');
  assert.ok(result.authoritativeLedger.rows.slice(50, 55).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(50, 55).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[50].sourceId, 'larousse:carotte');
  assert.equal(result.authoritativeLedger.rows[50].targetText, 'Les carottes sont cuites');
  assert.equal(result.authoritativeLedger.rows[50].usageMarker, 'Familier');
  assert.equal(result.authoritativeLedger.rows[51].sourceId, 'larousse:pot');
  assert.equal(result.authoritativeLedger.rows[51].targetText, 'Découvrir le pot aux roses');
  assert.equal(result.authoritativeLedger.rows[52].sourceId, 'larousse:pied');
  assert.equal(result.authoritativeLedger.rows[52].targetText, 'Avoir bon pied bon œil');
  assert.equal(result.authoritativeLedger.rows[53].sourceId, 'larousse:dormir');
  assert.equal(result.authoritativeLedger.rows[53].targetText, 'Dormir sur ses deux oreilles');
  assert.equal(result.authoritativeLedger.rows[54].sourceId, 'larousse:oreille');
  assert.equal(result.authoritativeLedger.rows[54].targetText, 'Tendre l’oreille');
  assert.ok(result.authoritativeLedger.rows.slice(50, 55).every((row) => row.checkedAt === '2026-09-27T08:02:54.8434687Z'));
  assert.ok(result.authoritativeLedger.rows.slice(55, 60).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(55, 60).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[55].sourceId, 'larousse:oreille');
  assert.equal(result.authoritativeLedger.rows[55].targetText, 'Faire la sourde oreille');
  assert.equal(result.authoritativeLedger.rows[56].sourceId, 'larousse:compas');
  assert.equal(result.authoritativeLedger.rows[56].targetText, 'Avoir le compas dans l’œil');
  assert.equal(result.authoritativeLedger.rows[57].sourceId, 'larousse:nez');
  assert.equal(result.authoritativeLedger.rows[57].targetText, 'Mener quelqu’un par le bout du nez');
  assert.equal(result.authoritativeLedger.rows[58].sourceId, 'larousse:porte');
  assert.equal(result.authoritativeLedger.rows[58].targetText, 'Prendre la porte');
  assert.equal(result.authoritativeLedger.rows[59].sourceId, 'larousse:cle');
  assert.equal(result.authoritativeLedger.rows[59].targetText, 'Mettre la clé sous la porte');
  assert.ok(result.authoritativeLedger.rows.slice(55, 60).every((row) => row.checkedAt === '2026-09-27T09:19:28.1020558Z'));
  assert.ok(result.authoritativeLedger.rows.slice(60, 64).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(60, 64).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[60].sourceId, 'larousse:chaussure');
  assert.equal(result.authoritativeLedger.rows[60].targetText, 'Trouver chaussure à son pied');
  assert.equal(result.authoritativeLedger.rows[61].sourceId, 'larousse:ficelle');
  assert.equal(result.authoritativeLedger.rows[61].targetText, 'Tirer les ficelles');
  assert.equal(result.authoritativeLedger.rows[62].sourceId, 'larousse:huile');
  assert.equal(result.authoritativeLedger.rows[62].targetText, 'Jeter de l’huile sur le feu');
  assert.equal(result.authoritativeLedger.rows[63].sourceId, 'larousse:poudre');
  assert.equal(result.authoritativeLedger.rows[63].targetText, 'Mettre le feu aux poudres');
  assert.equal(result.authoritativeLedger.rows[64].sourceId, 'le-robert:lac');
  assert.equal(result.authoritativeLedger.rows[64].targetText, 'Il n’y a pas le feu au lac');
  assert.equal(result.authoritativeLedger.rows[64].httpStatus, 403);
  assert.equal(result.authoritativeLedger.rows[64].retrievalMethod, 'official_search_result_snippet');
  assert.ok(result.authoritativeLedger.rows.slice(60, 65).every((row) => row.checkedAt === '2026-09-27T09:33:18.9489402Z'));
  assert.ok(result.authoritativeLedger.rows.slice(65, 70).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(65, 70).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[65].sourceId, 'larousse:ciel');
  assert.equal(result.authoritativeLedger.rows[65].targetText, 'Lever les yeux au ciel');
  assert.equal(result.authoritativeLedger.rows[66].sourceId, 'larousse:lune');
  assert.equal(result.authoritativeLedger.rows[66].targetText, 'Tomber de la lune');
  assert.equal(result.authoritativeLedger.rows[67].sourceId, 'larousse:decrocher');
  assert.equal(result.authoritativeLedger.rows[67].targetText, 'Décrocher la lune');
  assert.equal(result.authoritativeLedger.rows[68].sourceId, 'larousse:etoile');
  assert.equal(result.authoritativeLedger.rows[68].targetText, 'Voir les étoiles en plein midi');
  assert.equal(result.authoritativeLedger.rows[69].sourceId, 'larousse:ange');
  assert.equal(result.authoritativeLedger.rows[69].targetText, 'Être aux anges');
  assert.ok(result.authoritativeLedger.rows.slice(65, 70).every((row) => row.checkedAt === '2026-09-27T09:48:48.7133996Z'));
  assert.ok(result.authoritativeLedger.rows.slice(70, 75).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(70, 75).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[70].sourceId, 'larousse:pleuvoir');
  assert.equal(result.authoritativeLedger.rows[70].targetText, 'Il pleut des cordes');
  assert.equal(result.authoritativeLedger.rows[71].sourceId, 'le-robert:pluie');
  assert.equal(result.authoritativeLedger.rows[71].targetText, 'Après la pluie, le beau temps');
  assert.equal(result.authoritativeLedger.rows[72].sourceId, 'le-robert:pluie');
  assert.equal(result.authoritativeLedger.rows[72].targetText, 'Parler de la pluie et du beau temps');
  assert.equal(result.authoritativeLedger.rows[73].sourceId, 'le-robert:soupe');
  assert.equal(result.authoritativeLedger.rows[73].targetText, 'Être trempé comme une soupe');
  assert.equal(result.authoritativeLedger.rows[74].sourceId, 'larousse:brouillard');
  assert.equal(result.authoritativeLedger.rows[74].targetText, 'Être dans le brouillard');
  assert.ok(result.authoritativeLedger.rows.slice(70, 75).every((row) => row.checkedAt === '2026-09-27T09:59:29.8963350Z'));
  assert.ok(result.authoritativeLedger.rows.slice(75, 80).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(75, 80).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[75].sourceId, 'larousse:poupe');
  assert.equal(result.authoritativeLedger.rows[75].targetText, 'Avoir le vent en poupe');
  assert.equal(result.authoritativeLedger.rows[75].definitionQuote, 'Avoir le vent en poupe, être dans une période favorable pour réussir ; être en faveur auprès de beaucoup de gens.');
  assert.equal(result.authoritativeLedger.rows[76].sourceId, 'larousse:cap');
  assert.equal(result.authoritativeLedger.rows[76].targetText, 'Mettre le cap sur un objectif');
  assert.equal(result.authoritativeLedger.rows[76].definitionQuote, 'Mettre le cap sur un objectif, se diriger vers lui.');
  assert.equal(result.authoritativeLedger.rows[77].sourceId, 'le-robert:barque');
  assert.equal(result.authoritativeLedger.rows[77].targetText, 'Mener sa barque');
  assert.equal(result.authoritativeLedger.rows[77].definitionQuote, 'Mener, conduire la barque : diriger, être le maître. Bien mener sa barque : bien conduire son entreprise.');
  assert.equal(result.authoritativeLedger.rows[78].sourceId, 'larousse:galere');
  assert.equal(result.authoritativeLedger.rows[78].targetText, 'Vogue la galère');
  assert.equal(result.authoritativeLedger.rows[78].definitionQuote, 'Vogue la galère, advienne que pourra.');
  assert.equal(result.authoritativeLedger.rows[79].sourceId, 'larousse:port');
  assert.equal(result.authoritativeLedger.rows[79].targetText, 'Arriver à bon port');
  assert.equal(result.authoritativeLedger.rows[79].definitionQuote, 'Arriver à bon port, arriver à destination sain et sauf, en bon état, à son but.');
  assert.ok(result.authoritativeLedger.rows.slice(75, 80).every((row) => row.checkedAt === '2026-09-27T10:26:07.8749502Z'));
  assert.ok(result.authoritativeLedger.rows.slice(80, 85).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(80, 85).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[80].sourceId, 'le-robert:large');
  assert.equal(result.authoritativeLedger.rows[80].targetText, 'Prendre le large');
  assert.equal(result.authoritativeLedger.rows[80].definitionQuote, 'La haute mer. Gagner le large. Vers le large. Locution, familier. Prendre le large, partir, s’enfuir.');
  assert.equal(result.authoritativeLedger.rows[81].sourceId, 'le-robert:route');
  assert.equal(result.authoritativeLedger.rows[81].targetText, 'Tenir la route');
  assert.equal(result.authoritativeLedger.rows[81].definitionQuote, 'Au figuré. Tenir la route : agir de manière fiable et durable, être solide.');
  assert.equal(result.authoritativeLedger.rows[82].sourceId, 'le-robert:farine');
  assert.equal(result.authoritativeLedger.rows[82].targetText, 'Rouler quelqu’un dans la farine');
  assert.equal(result.authoritativeLedger.rows[82].definitionQuote, 'Rouler quelqu’un dans la farine, le tromper.');
  assert.equal(result.authoritativeLedger.rows[83].sourceId, 'le-robert:sentier');
  assert.equal(result.authoritativeLedger.rows[83].targetText, 'Sortir des sentiers battus');
  assert.equal(result.authoritativeLedger.rows[83].definitionQuote, 'Les sentiers battus : les usages communs. Sortir des sentiers battus.');
  assert.equal(result.authoritativeLedger.rows[84].sourceId, 'le-robert:virage');
  assert.equal(result.authoritativeLedger.rows[84].targetText, 'Prendre un virage');
  assert.equal(result.authoritativeLedger.rows[84].definitionQuote, 'Mouvement d’un véhicule qui tourne, change de direction. Amorcer, prendre un virage. Au figuré : changement radical d’orientation, d’attitude.');
  assert.ok(result.authoritativeLedger.rows.slice(80, 85).every((row) => row.checkedAt === '2026-09-27T10:37:28.9691410Z'));
  assert.ok(result.authoritativeLedger.rows.slice(85, 90).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(85, 90).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[85].sourceId, 'larousse:eau');
  assert.equal(result.authoritativeLedger.rows[85].targetText, 'Il y a de l’eau dans le gaz');
  assert.equal(result.authoritativeLedger.rows[85].definitionQuote, 'Familier. Il y a de l’eau dans le gaz, les relations sont tendues, les choses vont mal tourner.');
  assert.equal(result.authoritativeLedger.rows[86].sourceId, 'larousse:main-fr-en');
  assert.equal(result.authoritativeLedger.rows[86].targetText, 'Avoir la main verte');
  assert.equal(result.authoritativeLedger.rows[86].definitionQuote, 'Avoir la main verte — to have green fingers (UK) ou a green thumb (US).');
  assert.equal(result.authoritativeLedger.rows[87].sourceId, 'larousse:main');
  assert.equal(result.authoritativeLedger.rows[87].targetText, 'Donner un coup de main');
  assert.equal(result.authoritativeLedger.rows[87].definitionQuote, 'Coup de main, aide apportée à quelqu’un ; habileté dans la manière de faire ; opération militaire locale menée par surprise sur un objectif limité.');
  assert.equal(result.authoritativeLedger.rows[88].sourceId, 'le-robert:mot');
  assert.equal(result.authoritativeLedger.rows[88].targetText, 'Avoir le dernier mot');
  assert.equal(result.authoritativeLedger.rows[88].definitionQuote, 'Avoir le dernier mot, ne plus avoir de contradicteur.');
  assert.equal(result.authoritativeLedger.rows[89].sourceId, 'larousse:i');
  assert.equal(result.authoritativeLedger.rows[89].targetText, 'Mettre les points sur les i');
  assert.equal(result.authoritativeLedger.rows[89].definitionQuote, 'Mettre les points sur les « i », s’expliquer d’une manière très claire et très précise pour éviter les ambiguïtés.');
  assert.ok(result.authoritativeLedger.rows.slice(85, 90).every((row) => row.checkedAt === '2026-09-27T10:52:06.5367846Z'));
  assert.ok(result.authoritativeLedger.rows.slice(90, 95).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(90, 95).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[90].sourceId, 'larousse:page');
  assert.equal(result.authoritativeLedger.rows[90].targetText, 'Tourner la page');
  assert.equal(result.authoritativeLedger.rows[90].definitionQuote, 'Tourner la page, ne plus s’occuper du passé afin de recommencer sur de nouvelles bases.');
  assert.equal(result.authoritativeLedger.rows[91].sourceId, 'le-robert:ligne');
  assert.equal(result.authoritativeLedger.rows[91].targetText, 'Lire entre les lignes');
  assert.equal(result.authoritativeLedger.rows[91].definitionQuote, 'Lire entre les lignes, deviner ce qui est sous-entendu.');
  assert.equal(result.authoritativeLedger.rows[92].sourceId, 'larousse:desert');
  assert.equal(result.authoritativeLedger.rows[92].targetText, 'Prêcher dans le désert');
  assert.equal(result.authoritativeLedger.rows[92].definitionQuote, 'Parler, crier, prêcher dans le désert, sans être écouté.');
  assert.equal(result.authoritativeLedger.rows[93].sourceId, 'larousse:couper');
  assert.equal(result.authoritativeLedger.rows[93].targetText, 'Couper la parole');
  assert.equal(result.authoritativeLedger.rows[93].definitionQuote, 'Couper la parole à quelqu’un, couper quelqu’un, l’interrompre, l’empêcher de continuer à parler.');
  assert.equal(result.authoritativeLedger.rows[94].sourceId, 'larousse-junior:parole');
  assert.equal(result.authoritativeLedger.rows[94].targetText, 'Prendre la parole');
  assert.equal(result.authoritativeLedger.rows[94].definitionQuote, 'Prendre la parole, commencer à parler.');
  assert.ok(result.authoritativeLedger.rows.slice(90, 95).every((row) => row.checkedAt === '2026-09-27T11:12:25.1728652Z'));
  assert.ok(result.authoritativeLedger.rows.slice(95, 100).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(95, 100).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[95].sourceId, 'larousse:langue');
  assert.equal(result.authoritativeLedger.rows[95].targetText, 'Tourner sept fois sa langue dans sa bouche');
  assert.equal(result.authoritativeLedger.rows[95].definitionQuote, 'Tourner sept fois sa langue dans sa bouche, réfléchir avant de s’exprimer pour s’éviter une bévue, un impair, etc.');
  assert.equal(result.authoritativeLedger.rows[96].sourceId, 'larousse:nerfs');
  assert.equal(result.authoritativeLedger.rows[96].targetText, 'Avoir les nerfs à vif');
  assert.equal(result.authoritativeLedger.rows[96].definitionQuote, 'Avoir, mettre les nerfs en boule, à cran, à fleur de peau, en pelote, à vif, avoir les nerfs tendus, être très énervé, très irrité ; mettre dans un grand état d’énervement, d’irritation.');
  assert.equal(result.authoritativeLedger.rows[97].sourceId, 'le-robert:sang');
  assert.equal(result.authoritativeLedger.rows[97].targetText, 'Avoir le sang chaud');
  assert.equal(result.authoritativeLedger.rows[97].definitionQuote, 'Avoir le sang chaud : être irascible, ou impétueux.');
  assert.equal(result.authoritativeLedger.rows[98].sourceId, 'larousse:face-college');
  assert.equal(result.authoritativeLedger.rows[98].targetText, 'Sauver la face');
  assert.equal(result.authoritativeLedger.rows[98].definitionQuote, 'Sauver la face, préserver sa dignité.');
  assert.equal(result.authoritativeLedger.rows[99].sourceId, 'larousse:face-college');
  assert.equal(result.authoritativeLedger.rows[99].targetText, 'Perdre la face');
  assert.equal(result.authoritativeLedger.rows[99].definitionQuote, 'Perdre la face, perdre tout prestige, tout crédit.');
  assert.ok(result.authoritativeLedger.rows.slice(95, 100).every((row) => row.checkedAt === '2026-09-27T11:28:11.0595669Z'));
  assert.ok(result.authoritativeLedger.rows.slice(100, 105).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(100, 105).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[100].sourceId, 'larousse:table');
  assert.equal(result.authoritativeLedger.rows[100].targetText, 'Faire table rase');
  assert.equal(result.authoritativeLedger.rows[100].definitionQuote, 'Faire table rase (de quelque chose), détruire, rejeter ce qui a été dit, écrit ou fait antérieurement.');
  assert.equal(result.authoritativeLedger.rows[101].sourceId, 'larousse-college:battre');
  assert.equal(result.authoritativeLedger.rows[101].targetText, 'Battre le fer pendant qu’il est chaud');
  assert.equal(result.authoritativeLedger.rows[101].definitionQuote, "Battre le fer pendant qu'il est chaud, profiter sans tarder d'une occasion favorable.");
  assert.equal(result.authoritativeLedger.rows[102].sourceId, 'larousse-fr-en:serrer');
  assert.equal(result.authoritativeLedger.rows[102].targetText, 'Avoir la gorge serrée');
  assert.equal(result.authoritativeLedger.rows[102].definitionQuote, "avoir la gorge serrée par l'émotion — to be choked with emotion");
  assert.equal(result.authoritativeLedger.rows[103].sourceId, 'larousse:main');
  assert.equal(result.authoritativeLedger.rows[103].targetText, 'Avoir les mains liées');
  assert.equal(result.authoritativeLedger.rows[103].definitionQuote, "Avoir les mains libres, avoir les mains liées, avoir, ne pas avoir de liberté d'action.");
  assert.equal(result.authoritativeLedger.rows[104].sourceId, 'larousse-junior:pied');
  assert.equal(result.authoritativeLedger.rows[104].targetText, 'Faire des pieds et des mains');
  assert.equal(result.authoritativeLedger.rows[104].definitionQuote, 'Faire des pieds et des mains, se démener pour obtenir quelque chose.');
  assert.ok(result.authoritativeLedger.rows.slice(100, 105).every((row) => row.checkedAt === '2026-09-27T11:44:22.8251091Z'));
  assert.ok(result.authoritativeLedger.rows.slice(105, 110).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(105, 110).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[105].sourceId, 'larousse:cheveu');
  assert.equal(result.authoritativeLedger.rows[105].targetText, 'Se faire des cheveux blancs');
  assert.equal(result.authoritativeLedger.rows[105].definitionQuote, "Familier. Se faire des cheveux (blancs), se faire du tracas, s'inquiéter.");
  assert.equal(result.authoritativeLedger.rows[106].sourceId, 'le-robert:rouleau');
  assert.equal(result.authoritativeLedger.rows[106].targetText, 'Être au bout du rouleau');
  assert.equal(result.authoritativeLedger.rows[106].definitionQuote, 'Être au bout de son rouleau, du rouleau, avoir épuisé toutes ses ressources, ses forces.');
  assert.equal(result.authoritativeLedger.rows[107].sourceId, 'larousse:tapis');
  assert.equal(result.authoritativeLedger.rows[107].targetText, 'Dérouler le tapis rouge');
  assert.equal(result.authoritativeLedger.rows[107].definitionQuote, 'Dérouler le tapis rouge, recevoir quelqu’un avec tous les honneurs.');
  assert.equal(result.authoritativeLedger.rows[108].sourceId, 'le-robert:rouge');
  assert.equal(result.authoritativeLedger.rows[108].targetText, 'Être dans le rouge');
  assert.equal(result.authoritativeLedger.rows[108].definitionQuote, 'Être dans le rouge, dans une situation (notamment financière) difficile, critique.');
  assert.equal(result.authoritativeLedger.rows[109].sourceId, 'larousse:rose');
  assert.equal(result.authoritativeLedger.rows[109].targetText, 'Voir la vie en rose');
  assert.equal(result.authoritativeLedger.rows[109].definitionQuote, 'Voir tout en rose, voir la vie en rose, voir tout en beau, voir le bon côté des choses.');
  assert.ok(result.authoritativeLedger.rows.slice(105, 110).every((row) => row.checkedAt === '2026-09-27T11:54:36.7986003Z'));
  assert.ok(result.authoritativeLedger.rows.slice(110, 115).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(110, 115).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[110].sourceId, 'larousse:patience');
  assert.equal(result.authoritativeLedger.rows[110].targetText, 'Prendre son mal en patience');
  assert.equal(result.authoritativeLedger.rows[110].definitionQuote, 'Prendre quelque chose en patience, le supporter sans se plaindre : Prendre son mal en patience.');
  assert.equal(result.authoritativeLedger.rows[111].sourceId, 'le-robert:jaune');
  assert.equal(result.authoritativeLedger.rows[111].targetText, 'Rire jaune');
  assert.equal(result.authoritativeLedger.rows[111].definitionQuote, "Rire jaune, d'un rire forcé.");
  assert.equal(result.authoritativeLedger.rows[112].sourceId, 'le-robert:rouge');
  assert.equal(result.authoritativeLedger.rows[112].targetText, 'Voir rouge');
  assert.equal(result.authoritativeLedger.rows[112].definitionQuote, 'Voir rouge, avoir un accès de colère.');
  assert.equal(result.authoritativeLedger.rows[113].sourceId, 'le-robert:feu');
  assert.equal(result.authoritativeLedger.rows[113].targetText, 'Donner le feu vert');
  assert.equal(result.authoritativeLedger.rows[113].definitionQuote, 'Donner le feu vert à, autoriser (une action ; qqn à agir).');
  assert.equal(result.authoritativeLedger.rows[114].sourceId, 'larousse:mine');
  assert.equal(result.authoritativeLedger.rows[114].targetText, 'Faire grise mine');
  assert.equal(result.authoritativeLedger.rows[114].definitionQuote, "Faire grise, triste mine, avoir l'air dépité, déçu.");
  assert.ok(result.authoritativeLedger.rows.slice(110, 115).every((row) => row.checkedAt === '2026-09-27T12:06:49.3577516Z'));
  assert.ok(result.authoritativeLedger.rows.slice(115, 120).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(115, 120).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[115].sourceId, 'larousse:midi');
  assert.equal(result.authoritativeLedger.rows[115].targetText, 'Chercher midi à quatorze heures');
  assert.equal(result.authoritativeLedger.rows[115].definitionQuote, "Chercher midi à quatorze heures, chercher des difficultés où il n'y en a pas.");
  assert.equal(result.authoritativeLedger.rows[116].sourceId, 'le-robert:pendule');
  assert.equal(result.authoritativeLedger.rows[116].targetText, 'Remettre les pendules à l’heure');
  assert.equal(result.authoritativeLedger.rows[116].definitionQuote, "Remettre les pendules à l'heure : mettre les choses au point.");
  assert.equal(result.authoritativeLedger.rows[117].sourceId, 'larousse:bain');
  assert.equal(result.authoritativeLedger.rows[117].targetText, 'Être dans le bain');
  assert.equal(result.authoritativeLedger.rows[117].definitionQuote, 'Familier. Être dans le bain, être engagé dans une entreprise ; connaître pleinement quelque chose ; être compromis dans une affaire.');
  assert.equal(result.authoritativeLedger.rows[118].sourceId, 'larousse:froid');
  assert.equal(result.authoritativeLedger.rows[118].targetText, 'Jeter un froid');
  assert.equal(result.authoritativeLedger.rows[118].definitionQuote, 'Jeter un froid, faire naître, par un acte ou une parole, la gêne, la contrainte.');
  assert.equal(result.authoritativeLedger.rows[119].sourceId, 'larousse:glace');
  assert.equal(result.authoritativeLedger.rows[119].targetText, 'Briser la glace');
  assert.equal(result.authoritativeLedger.rows[119].definitionQuote, "Briser la glace, faire cesser la contrainte ou la gêne existant entre plusieurs personnes au cours d'un entretien.");
  assert.ok(result.authoritativeLedger.rows.slice(115, 120).every((row) => row.checkedAt === '2026-09-27T12:23:16.2983326Z'));
  assert.ok(result.authoritativeLedger.rows.slice(120, 125).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(120, 125).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[120].sourceId, 'larousse:froid');
  assert.equal(result.authoritativeLedger.rows[120].targetText, 'Battre froid à quelqu’un');
  assert.equal(result.authoritativeLedger.rows[120].definitionQuote, "Battre froid (à quelqu'un), manifester ostensiblement de la réserve, de l'hostilité à quelqu'un.");
  assert.equal(result.authoritativeLedger.rows[121].sourceId, 'le-robert:haut');
  assert.equal(result.authoritativeLedger.rows[121].targetText, 'Tomber de haut');
  assert.equal(result.authoritativeLedger.rows[121].definitionQuote, 'Tomber de haut : perdre ses illusions.');
  assert.equal(result.authoritativeLedger.rows[122].sourceId, 'larousse:revenir');
  assert.equal(result.authoritativeLedger.rows[122].targetText, 'Revenir de loin');
  assert.equal(result.authoritativeLedger.rows[122].definitionQuote, "En revenir, revenir de loin, sortir sain et sauf d'une maladie ou d'un danger où l'on risquait de perdre la vie.");
  assert.equal(result.authoritativeLedger.rows[123].sourceId, 'larousse:venir');
  assert.equal(result.authoritativeLedger.rows[123].targetText, 'Voir venir');
  assert.equal(result.authoritativeLedger.rows[123].definitionQuote, "Familier. Voir venir (de loin), prévoir quelque chose (longtemps à l'avance) ; pénétrer les intentions de quelqu'un.");
  assert.equal(result.authoritativeLedger.rows[124].sourceId, 'larousse:fortune');
  assert.equal(result.authoritativeLedger.rows[124].targetText, 'Faire contre mauvaise fortune bon cœur');
  assert.equal(result.authoritativeLedger.rows[124].definitionQuote, 'Faire contre mauvaise fortune bon cœur, ne pas se laisser abattre par les revers.');
  assert.ok(result.authoritativeLedger.rows.slice(120, 125).every((row) => row.checkedAt === '2026-09-27T12:38:53.1849636Z'));
  assert.ok(result.authoritativeLedger.rows.slice(125, 130).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(125, 130).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[125].sourceId, 'larousse:diable');
  assert.equal(result.authoritativeLedger.rows[125].targetText, 'Tirer le diable par la queue');
  assert.equal(result.authoritativeLedger.rows[125].definitionQuote, 'Tirer le diable par la queue, avoir la plus grande peine à trouver les ressources nécessaires pour vivre.');
  assert.equal(result.authoritativeLedger.rows[126].sourceId, 'larousse:poche');
  assert.equal(result.authoritativeLedger.rows[126].targetText, 'Mettre la main à la poche');
  assert.equal(result.authoritativeLedger.rows[126].definitionQuote, "Familier. Mettre la main à la poche, donner de l'argent.");
  assert.equal(result.authoritativeLedger.rows[127].sourceId, 'larousse:fenetre');
  assert.equal(result.authoritativeLedger.rows[127].targetText, 'Jeter l’argent par les fenêtres');
  assert.equal(result.authoritativeLedger.rows[127].definitionQuote, "Jeter l'argent par les fenêtres, dépenser sans compter.");
  assert.equal(result.authoritativeLedger.rows[128].sourceId, 'larousse:or');
  assert.equal(result.authoritativeLedger.rows[128].targetText, 'Rouler sur l’or');
  assert.equal(result.authoritativeLedger.rows[128].definitionQuote, "Rouler sur l'or, être cousu d'or, être très riche, vivre dans l'opulence.");
  assert.equal(result.authoritativeLedger.rows[129].sourceId, 'larousse:pesant');
  assert.equal(result.authoritativeLedger.rows[129].targetText, 'Valoir son pesant d’or');
  assert.equal(result.authoritativeLedger.rows[129].definitionQuote, "Valoir son pesant d'or, avoir un grand mérite, une grande valeur.");
  assert.ok(result.authoritativeLedger.rows.slice(125, 130).every((row) => row.checkedAt === '2026-09-27T13:10:17.1132998Z'));
  assert.ok(result.authoritativeLedger.rows.slice(130, 135).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(130, 135).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[130].sourceId, 'larousse:bonheur');
  assert.equal(result.authoritativeLedger.rows[130].targetText, 'Porter bonheur');
  assert.equal(result.authoritativeLedger.rows[130].definitionQuote, "Porter bonheur à quelqu'un, avoir une influence favorable sur son avenir.");
  assert.equal(result.authoritativeLedger.rows[131].sourceId, 'le-robert:agneau');
  assert.equal(result.authoritativeLedger.rows[131].targetText, 'Doux comme un agneau');
  assert.equal(result.authoritativeLedger.rows[131].definitionQuote, "Doux comme un agneau, d'un caractère doux et pacifique.");
  assert.equal(result.authoritativeLedger.rows[132].sourceId, 'larousse-college:ruse');
  assert.equal(result.authoritativeLedger.rows[132].targetText, 'Rusé comme un renard');
  assert.equal(result.authoritativeLedger.rows[132].definitionQuote, 'Qui dénote la ruse ; qui agit avec ruse : Rusé comme un renard.');
  assert.equal(result.authoritativeLedger.rows[133].sourceId, 'larousse:carpe');
  assert.equal(result.authoritativeLedger.rows[133].targetText, 'Muet comme une carpe');
  assert.equal(result.authoritativeLedger.rows[133].definitionQuote, 'Muet comme une carpe, sans rien dire.');
  assert.equal(result.authoritativeLedger.rows[134].sourceId, 'larousse:grue');
  assert.equal(result.authoritativeLedger.rows[134].targetText, 'Faire le pied de grue');
  assert.equal(result.authoritativeLedger.rows[134].definitionQuote, 'Familier. Faire le pied de grue, attendre longtemps, debout à la même place.');
  assert.ok(result.authoritativeLedger.rows.slice(130, 135).every((row) => row.checkedAt === '2026-09-27T13:34:17.0963618Z'));
  assert.ok(result.authoritativeLedger.rows.slice(135, 140).every((row) => row.httpStatus === 200));
  assert.ok(result.authoritativeLedger.rows.slice(135, 140).every((row) => row.retrievalMethod === 'official_dictionary_page'));
  assert.equal(result.authoritativeLedger.rows[135].sourceId, 'larousse:cheval');
  assert.equal(result.authoritativeLedger.rows[135].targetText, 'Monter sur ses grands chevaux');
  assert.equal(result.authoritativeLedger.rows[135].definitionQuote, "Monter sur ses grands chevaux, se gendarmer, s'emporter.");
  assert.equal(result.authoritativeLedger.rows[136].sourceId, 'larousse:taureau');
  assert.equal(result.authoritativeLedger.rows[136].targetText, 'Prendre le taureau par les cornes');
  assert.equal(result.authoritativeLedger.rows[136].definitionQuote, 'Prendre le taureau par les cornes, affronter résolument une difficulté.');
  assert.equal(result.authoritativeLedger.rows[137].sourceId, 'larousse:chien');
  assert.equal(result.authoritativeLedger.rows[137].targetText, 'Se regarder en chiens de faïence');
  assert.equal(result.authoritativeLedger.rows[137].definitionQuote, "Se regarder en chiens de faïence, se regarder l'un l'autre d'un œil fixe et irrité, en silence.");
  assert.equal(result.authoritativeLedger.rows[138].sourceId, 'le-robert:loup');
  assert.equal(result.authoritativeLedger.rows[138].targetText, 'Être connu comme le loup blanc');
  assert.equal(result.authoritativeLedger.rows[138].definitionQuote, 'Être connu comme le loup blanc, très connu.');
  assert.equal(result.authoritativeLedger.rows[139].sourceId, 'le-robert:hurler');
  assert.equal(result.authoritativeLedger.rows[139].targetText, 'Hurler avec les loups');
  assert.equal(result.authoritativeLedger.rows[139].definitionQuote, 'Hurler avec les loups, se ranger du côté du plus fort ; faire comme les autres.');
  assert.ok(result.authoritativeLedger.rows.slice(135, 140).every((row) => row.checkedAt === '2026-09-27T13:54:28.7609098Z'));
  assert.equal(result.authoritativeLedger.checkedAt, '2026-09-27T13:54:28.7609098Z');
  assert.equal(result.bank.rows[49].targetText, 'Avoir un chat dans la gorge');
  assert.deepEqual(result.bank.rows[49].selectionOverride, {
    legacyTargetText: 'Être dans les choux',
    replacementReason: 'authoritative_secondary_sense_collides_with_fr-027_and_quiz_answer',
    conflictingRowId: 'fr-027',
    legacyDraftScope: 'SUPERSEDED_HISTORICAL_RECORD_ONLY',
    currentSourceId: 'larousse:chat',
  });
  assert.equal(result.bank.rows[56].targetText, 'Avoir le compas dans l’œil');
  assert.deepEqual(result.bank.rows[56].selectionOverride, {
    legacyTargetText: 'Avoir le nez creux',
    replacementReason: 'hard_semantic_duplicate_with_fr-159',
    conflictingRowId: 'fr-159',
    legacyDraftScope: 'SUPERSEDED_HISTORICAL_RECORD_ONLY',
    currentSourceId: 'larousse:compas',
  });
  assert.equal(result.bank.rows[65].targetText, 'Lever les yeux au ciel');
  assert.deepEqual(result.bank.rows[65].selectionOverride, {
    legacyTargetText: 'Remuer ciel et terre',
    replacementReason: 'hard_semantic_duplicate_with_fr-105',
    conflictingRowId: 'fr-105',
    legacyDraftScope: 'SUPERSEDED_HISTORICAL_RECORD_ONLY',
    currentSourceId: 'larousse:ciel',
  });
  assert.equal(result.bank.rows[66].targetText, 'Tomber de la lune');
  assert.deepEqual(result.bank.rows[66].selectionOverride, {
    legacyTargetText: 'Être dans la lune',
    replacementReason: 'hard_semantic_duplicate_with_fr-011',
    conflictingRowId: 'fr-011',
    legacyDraftScope: 'SUPERSEDED_HISTORICAL_RECORD_ONLY',
    currentSourceId: 'larousse:lune',
  });
  assert.equal(result.bank.rows[68].targetText, 'Voir les étoiles en plein midi');
  assert.deepEqual(result.bank.rows[68].selectionOverride, {
    legacyTargetText: 'Voir des étoiles',
    replacementReason: 'authoritative_dictionary_requires_canonical_expanded_form',
    conflictingRowId: null,
    legacyDraftScope: 'SUPERSEDED_HISTORICAL_RECORD_ONLY',
    currentSourceId: 'larousse:etoile',
  });
  assert.equal(result.bank.rows[70].targetText, 'Il pleut des cordes');
  assert.deepEqual(result.bank.rows[70].selectionOverride, {
    legacyTargetText: 'Pleuvoir des cordes',
    replacementReason: 'authoritative_dictionary_requires_canonical_impersonal_form',
    conflictingRowId: null,
    legacyDraftScope: 'SUPERSEDED_HISTORICAL_RECORD_ONLY',
    currentSourceId: 'larousse:pleuvoir',
  });
  assert.equal(result.bank.rows[72].targetText, 'Parler de la pluie et du beau temps');
  assert.deepEqual(result.bank.rows[72].selectionOverride, {
    legacyTargetText: 'Faire la pluie et le beau temps',
    replacementReason: 'near_duplicate_meaning_with_fr-019',
    conflictingRowId: 'fr-019',
    legacyDraftScope: 'SUPERSEDED_HISTORICAL_RECORD_ONLY',
    currentSourceId: 'le-robert:pluie',
  });
  assert.equal(result.bank.rows[76].targetText, 'Mettre le cap sur un objectif');
  assert.deepEqual(result.bank.rows[76].selectionOverride, {
    legacyTargetText: 'Changer de cap',
    replacementReason: 'near_duplicate_meaning_with_fr-085',
    conflictingRowId: 'fr-085',
    legacyDraftScope: 'SUPERSEDED_HISTORICAL_RECORD_ONLY',
    currentSourceId: 'larousse:cap',
  });
  assert.equal(result.bank.rows[78].targetText, 'Vogue la galère');
  assert.deepEqual(result.bank.rows[78].selectionOverride, {
    legacyTargetText: 'Naviguer à vue',
    replacementReason: 'intended_figurative_sense_not_supported_by_allowed_dictionary_page',
    conflictingRowId: null,
    legacyDraftScope: 'SUPERSEDED_HISTORICAL_RECORD_ONLY',
    currentSourceId: 'larousse:galere',
  });
  assert.equal(result.bank.rows[79].targetText, 'Arriver à bon port');
  assert.deepEqual(result.bank.rows[79].selectionOverride, {
    legacyTargetText: 'Mettre les voiles',
    replacementReason: 'near_duplicate_meaning_with_fr-059_and_fr-081',
    conflictingRowId: 'fr-059',
    legacyDraftScope: 'SUPERSEDED_HISTORICAL_RECORD_ONLY',
    currentSourceId: 'larousse:port',
  });
  assert.equal(result.bank.rows[110].targetText, 'Prendre son mal en patience');
  assert.deepEqual(result.bank.rows[110].selectionOverride, {
    legacyTargetText: 'Broyer du noir',
    replacementReason: 'hard_semantic_duplicate_with_fr-001',
    conflictingRowId: 'fr-001',
    legacyDraftScope: 'SUPERSEDED_HISTORICAL_RECORD_ONLY',
    currentSourceId: 'larousse:patience',
  });
  assert.equal(result.bank.rows[126].targetText, 'Mettre la main à la poche');
  assert.deepEqual(result.bank.rows[126].selectionOverride, {
    legacyTargetText: 'Mettre la main au portefeuille',
    replacementReason: 'official_dictionary_prefers_canonical_french_expression',
    conflictingRowId: null,
    legacyDraftScope: 'SUPERSEDED_HISTORICAL_RECORD_ONLY',
    currentSourceId: 'larousse:poche',
  });
  assert.equal(result.bank.rows[131].targetText, 'Doux comme un agneau');
  assert.deepEqual(result.bank.rows[131].selectionOverride, {
    legacyTargetText: 'Malin comme un singe',
    replacementReason: 'hard_semantic_duplicate_with_fr-133',
    conflictingRowId: 'fr-133',
    legacyDraftScope: 'SUPERSEDED_HISTORICAL_RECORD_ONLY',
    currentSourceId: 'le-robert:agneau',
  });
});

test('preserves already-authored safe rows when the scaffold is regenerated', () => {
  const existingRow = {
    id: 'fr-001',
    order: 1,
    legacyId: 'fr-daily-idiom-001',
    studyTarget: 'fr',
    sourceLocale: 'ru',
    surface: 'daily_phrase',
    targetText: 'Avoir le cafard',
    targetExample: 'Un exemple français vérifié.',
    literal_ru: 'Готовый буквальный перевод.',
    meaning_ru: 'Готовое точное значение.',
    text_ru: '❤️ Готовое описание сохраняется без потери.',
    literal_uk: 'Готовий буквальний переклад.',
    meaning_uk: 'Готове точне значення.',
    text_uk: '❤️ Готовий опис зберігається без втрати.',
    quiz_ru: { correctFeedback: 'Готово.', distractors: [] },
    quiz_uk: { correctFeedback: 'Готово.', distractors: [] },
    allowSave: true,
    active: false,
    activationApproved: false,
    candidateStatus: 'CANDIDATE_PENDING_INDEPENDENT_REVIEW',
    sourceEvidence: { sourceId: 'kept' },
    legacyDraft: { text_ru: 'kept legacy' },
  };

  const result = buildFrenchDailyPhraseScaffold({
    legacyBank: legacyBank(),
    existingBank: { rows: [existingRow] },
    checkedAt: '2026-09-26T12:00:00.000Z',
  });

  assert.deepEqual(result.bank.rows[0], existingRow);
  assert.equal(result.bank.rows[1].candidateStatus, 'SOURCE_SCAFFOLD_HOLD');
});

test('resets a superseded authored row only for an explicit selection override', () => {
  const initial = buildFrenchDailyPhraseScaffold({
    legacyBank: legacyBank(),
    checkedAt: '2026-09-26T12:00:00.000Z',
  });
  const superseded = {
    ...initial.bank.rows[49],
    targetText: 'Être dans les choux',
    targetExample: 'Un ancien exemple rejeté.',
    literal_ru: 'Старое буквальное значение.',
    meaning_ru: 'Старое значение.',
    text_ru: '❤️ Старое описание больше не относится к выбранной идиоме.',
    literal_uk: 'Старе буквальне значення.',
    meaning_uk: 'Старе значення.',
    text_uk: '❤️ Старий опис більше не стосується вибраної ідіоми.',
    candidateStatus: 'CANDIDATE_PENDING_INDEPENDENT_REVIEW',
  };

  const result = buildFrenchDailyPhraseScaffold({
    legacyBank: legacyBank(),
    existingBank: { rows: [superseded] },
    checkedAt: '2026-09-26T12:00:00.000Z',
  });
  const replacement = result.bank.rows[49];

  assert.equal(replacement.targetText, 'Avoir un chat dans la gorge');
  assert.equal(replacement.targetExample, '');
  assert.equal(replacement.text_ru, '');
  assert.equal(replacement.text_uk, '');
  assert.equal(replacement.candidateStatus, 'SOURCE_SCAFFOLD_HOLD');
  assert.equal(replacement.selectionOverride.legacyTargetText, 'Être dans les choux');
});

test('still rejects an authored target mismatch without an explicit selection override', () => {
  const initial = buildFrenchDailyPhraseScaffold({
    legacyBank: legacyBank(),
    checkedAt: '2026-09-26T12:00:00.000Z',
  });
  const mismatched = {
    ...initial.bank.rows[48],
    targetText: 'Expression inattendue',
    candidateStatus: 'CANDIDATE_PENDING_INDEPENDENT_REVIEW',
  };

  assert.throws(
    () => buildFrenchDailyPhraseScaffold({
      legacyBank: legacyBank(),
      existingBank: { rows: [mismatched] },
      checkedAt: '2026-09-26T12:00:00.000Z',
    }),
    /Existing authored row fr-049 violates the closed French scaffold contract/u,
  );
});

test('fails closed when the legacy selection is not exactly 176 ordered unique targets', () => {
  const short = legacyBank();
  short.rows.pop();
  assert.throws(
    () => buildFrenchDailyPhraseScaffold({ legacyBank: short, checkedAt: '2026-09-26T12:00:00.000Z' }),
    /exactly 176 rows/u,
  );

  const duplicate = legacyBank();
  duplicate.rows[1].targetText = duplicate.rows[0].targetText;
  assert.throws(
    () => buildFrenchDailyPhraseScaffold({ legacyBank: duplicate, checkedAt: '2026-09-26T12:00:00.000Z' }),
    /unique targetText/u,
  );
});

test('regeneration preserves the frozen source snapshot timestamp unless an explicit one is supplied', () => {
  const frozen = '2026-09-26T12:00:00.000Z';
  const replacement = '2026-09-27T12:00:00.000Z';
  assert.equal(resolveFrenchSourceCheckedAt('', { checkedAt: frozen }), frozen);
  assert.equal(resolveFrenchSourceCheckedAt(replacement, { checkedAt: frozen }), replacement);
});
