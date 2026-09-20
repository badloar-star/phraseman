import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('sealed match plans survive publication rotation without crossing targets', () => {
  const source = read('functions/src/arena_v2.ts');
  const home = source.slice(source.indexOf('export const arenaV2Home ='), source.indexOf('export const arenaV2FindMatch ='));
  assert.match(home, /activeMatch\?\.data\(\)\?\.studyTarget === publication\.studyTarget/);
  assert.match(home, /activeMatch\?\.data\(\)\?\.publicationFingerprint\s*=== activePrivate\?\.data\(\)\?\.publicationFingerprint/);
  assert.doesNotMatch(home, /activeMatch\?\.data\(\)\?\.publicationFingerprint === publication\.publicationFingerprint/);

  const plan = source.slice(source.indexOf('export const arenaV2MatchPlan ='), source.indexOf('function arenaDuelStoreOutcomes('));
  assert.match(plan, /arenaAssertSealedMatchTasks\(privateDoc, targetIdentity\)/);
  assert.doesNotMatch(plan, /arena_match_publication_stale/);
  assert.match(plan, /arenaDuelPlanTasks\(matchId, privateDoc, targetIdentity\)/);

  const sealed = source.slice(source.indexOf('function arenaAssertSealedMatchTasks('), source.indexOf('function arenaLegacyFinishRequested('));
  assert.match(sealed, /privateDoc\.sealedTasks/);
  assert.match(sealed, /adaptTournamentTaskForArena\(/);
  assert.match(sealed, /arena_match_sealed_task_projection_mismatch/);

  const finish = source.slice(source.indexOf('export const arenaV2MatchFinish ='), source.indexOf('export const arenaV2MatchSettle ='));
  assert.match(finish, /if \(targetIdentity\) arenaAssertSealedMatchTasks\(privateDoc, targetIdentity\)/);
});

test('duel plan and every task retain the sealed target identity', () => {
  const duel = read('functions/src/arena_duel_v3.ts');
  const planTask = duel.slice(duel.indexOf('export type ArenaPlanTask'), duel.indexOf('export type ArenaMatchPlanWire'));
  assert.match(planTask, /studyTarget: ArenaStudyTarget/);
  assert.match(planTask, /publicationFingerprint: string/);
  const planWire = duel.slice(duel.indexOf('export type ArenaMatchPlanWire'), duel.indexOf('export type ArenaOpponentTickWire'));
  assert.match(planWire, /studyTarget: ArenaStudyTarget/);
  assert.match(planWire, /publicationFingerprint: string/);
});

test('ghost lifecycle is target-bound and stores a sealed publication', () => {
  const source = read('functions/src/arena_expansion.ts');
  const create = source.slice(source.indexOf('export const arenaGhostCreate ='), source.indexOf('export const arenaGhostAccept ='));
  assert.match(create, /const publication = expansionRequiredTargetPublication\(who\.config, request\.data\?\.studyTarget\)/);
  assert.match(create, /targetPublication: publication/);
  assert.match(create, /privateMatch\.sealedTasks/);
  assert.match(create, /expansionAssertTaskProjection\(/);
  assert.match(create, /sealedTasks/);

  const accept = source.slice(source.indexOf('export const arenaGhostAccept ='), source.indexOf('export const arenaGhostStatus ='));
  assert.match(accept, /const sealedPublication = expansionSealedPublication\(\s*ghost,/);
  assert.match(accept, /expansionAssertTaskProjection\(/);
  assert.match(accept, /makeExpansionRun\([\s\S]*publication: sealedPublication/);

  const mutate = source.slice(source.indexOf('async function mutateRun('), source.indexOf('export const arenaTodaySubmitAnswer ='));
  assert.match(mutate, /expansionAssertSealedRunTarget\(/);
  assert.doesNotMatch(mutate, /arena_run_publication_mismatch/);
});

test('expansion Home keeps same-target sealed ghosts and rival series across publication rotation', () => {
  const source = read('functions/src/arena_expansion.ts');
  const home = source.slice(source.indexOf('export const arenaExpansionHome ='), source.indexOf('export const arenaTodayStart ='));
  assert.match(home, /const visibleGhostDocs = ghostDocs\.filter\(/);
  assert.match(home, /const visibleSeriesDocs = seriesDocs\.filter\(/);
  assert.match(home, /expansionHasSealedTarget\(doc\.data\(\), publication\.studyTarget\)/);
  assert.doesNotMatch(home, /doc\.data\(\)\.publicationFingerprint === publication\.publicationFingerprint/);
  assert.match(home, /ghosts: visibleGhostDocs\.map/);
  assert.match(home, /const rivalRows = visibleSeriesDocs\.map/);
});

test('all rival mutations use their immutable publication and responses expose identity', () => {
  const source = read('functions/src/arena_expansion.ts');
  const response = source.slice(source.indexOf('async function rivalResponse('), source.indexOf('function safeRivalPlayer('));
  assert.match(response, /studyTarget: series\.studyTarget/);
  assert.match(response, /publicationFingerprint: series\.publicationFingerprint/);
  for (const [start, end] of [
    ['export const arenaRivalLeave =', 'export const arenaRivalMute ='],
    ['export const arenaRivalMute =', 'export const arenaExpansionCleanup ='],
  ]) {
    const block = source.slice(source.indexOf(start), source.indexOf(end));
    assert.match(block, /expansionSealedPublication\(/);
    assert.doesNotMatch(block, /expansionAssertRecordTarget\(/);
  }
  for (const [start, end] of [
    ['export const arenaRivalAccept =', 'export const arenaRivalNext ='],
    ['export const arenaRivalNext =', 'export const arenaRivalLeave ='],
  ]) {
    const block = source.slice(source.indexOf(start), source.indexOf(end));
    assert.match(block, /const sealedPublication = expansionSealedPublication\(/);
    assert.match(block, /loadExpansionTaskPool\([\s\S]*sealedPublication/);
  }
});

test('all friend lifecycle responses return a top-level target identity', () => {
  const source = read('functions/src/arena_v2.ts');
  for (const [start, end] of [
    ['export const arenaV2InviteAccept =', 'export const arenaV2InviteReady ='],
    ['export const arenaV2InviteReady =', 'export const arenaV2InviteDecline ='],
    ['export const arenaV2InviteDecline =', 'export const arenaV2InviteCancel ='],
    ['export const arenaV2InviteCancel =', 'export const arenaV2InviteStatus ='],
    ['export const arenaV2InviteStatus =', 'const ARENA_FRIENDS_BOARD_LIMIT ='],
  ]) {
    const block = source.slice(source.indexOf(start), source.indexOf(end));
    assert.match(block, /studyTarget: publication\.studyTarget/);
    assert.match(block, /publicationFingerprint: publication\.publicationFingerprint/);
  }
});

test('tagged orphan reconciliation validates sealed tasks before any advance or settlement', () => {
  const source = read('functions/src/arena_v2.ts');
  const reconcile = source.slice(source.indexOf('async function reconcileOrphanMatch('), source.indexOf('async function deleteSnapshot('));
  assert.match(reconcile, /arenaAssertStoredMatchTarget\(match, privateDoc,/);
  assert.match(reconcile, /'allow-untagged-recovery'/);
  assert.ok(reconcile.indexOf('arenaAssertStoredMatchTarget') < reconcile.indexOf('advanceAnyMatch'));
  assert.ok(reconcile.indexOf('arenaAssertStoredMatchTarget') < reconcile.indexOf('settleMatch'));
});

test('Merkle proof verifier exports the complete proof type and callers do not erase it with any', () => {
  const publication = read('functions/src/tournament_pool_publication.ts');
  assert.match(publication, /export type ArenaPublication/);
  assert.match(publication, /readonly schemaVersion: 'tournament-task-merkle\.v1'/);
  assert.match(publication, /readonly proof:/);
  for (const file of ['functions/src/arena_v2.ts', 'functions/src/arena_expansion.ts']) {
    const source = read(file);
    assert.match(source, /type ArenaPublication/);
    assert.doesNotMatch(source, /verifyTournamentPoolTaskProof\([^\n]* as any/);
  }
});

test('server receipts and Match Lab history retain and filter by target identity', () => {
  const v2 = read('functions/src/arena_v2.ts');
  const settle = v2.slice(v2.indexOf('async function settleMatch('), v2.indexOf('export const arenaV2Home ='));
  assert.match(settle, /studyTarget: privateDoc\.studyTarget/);
  assert.match(settle, /publicationFingerprint: privateDoc\.publicationFingerprint/);

  const expansion = read('functions/src/arena_expansion.ts');
  const lab = expansion.slice(expansion.indexOf('function labRecord('), expansion.indexOf('async function settleExpansionRun('));
  assert.match(lab, /studyTarget: run\.studyTarget/);
  assert.match(lab, /publicationFingerprint: run\.publicationFingerprint/);
  const getLab = expansion.slice(expansion.indexOf('export const arenaMatchLabGet ='), expansion.indexOf('export const arenaStarStore ='));
  assert.match(getLab, /expansionRequiredTargetPublication\(who\.config, request\.data\?\.studyTarget\)/);
  assert.match(getLab, /\.where\('studyTarget', '==', publication\.studyTarget\)/);
  assert.match(getLab, /data\.studyTarget !== publication\.studyTarget/);

  const indexes = JSON.parse(read('firestore.indexes.json'));
  assert.ok(indexes.indexes.some((entry) => entry.collectionGroup === 'arena_v2_match_labs'
    && entry.fields.some((field) => field.fieldPath === 'studyTarget')
    && entry.fields.some((field) => field.fieldPath === 'createdAtMs' && field.order === 'DESCENDING')));
});
