import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const serverSource = fs.readFileSync(path.join(root, 'functions', 'src', 'shard_survey.ts'), 'utf8');
const coreSource = fs.readFileSync(path.join(root, 'functions', 'src', 'shard_survey_core.ts'), 'utf8');
const clientSource = fs.readFileSync(path.join(root, 'app', 'survey_client.ts'), 'utf8');
const controllerSource = fs.readFileSync(path.join(root, 'app', 'survey_flow_controller.ts'), 'utf8');

describe('shard survey idempotency contract', () => {
  const submitStart = serverSource.indexOf('export const submitShardSurvey');
  const submitEnd = serverSource.indexOf('export const adminWriteShardSurvey', submitStart);
  const submit = serverSource.slice(submitStart, submitEnd);

  test('uses occurrence-scoped response, reward-claim and economy-event identities', () => {
    expect(coreSource).toContain('return `${occurrenceId}__${stableUid}`;');
    expect(coreSource).toContain('return `survey_${occurrenceId}`;');
    expect(submit).toContain('.doc(shardSurveyRewardClaimId(occurrenceId))');
    expect(submit).toContain('eventId: occurrenceId');
  });

  test('a repeated claim returns zero reward without updating user balance or stats', () => {
    const repeatedStart = submit.indexOf('if (claimSnap.exists || responseSnap.exists)');
    const repeatedEnd = submit.indexOf('// Фиксированная выплата', repeatedStart);
    const repeatedBranch = submit.slice(repeatedStart, repeatedEnd);

    expect(repeatedBranch).toContain('alreadyGranted: true, reward: 0');
    expect(repeatedBranch).not.toContain('tx.set(responseRef');
    expect(repeatedBranch).not.toContain('tx.set(userRef');
    expect(repeatedBranch).not.toContain('tx.set(statsRef');
    expect(repeatedBranch).not.toContain('incrementStats(');
  });

  test('the first grant atomically appends an external fact, response and stats without a balance write', () => {
    const transactionStart = submit.indexOf('db.runTransaction');
    const transactionEnd = submit.indexOf('\n  return result;', transactionStart);
    const transaction = submit.slice(transactionStart, transactionEnd);

    expect(transaction).toContain('tx.set(claimRef');
    expect(transaction).toContain('tx.set(userRef');
    expect(transaction).toContain('appendExternalEconomyEvent(tx, userRef');
    expect(transaction).not.toContain('shards: newBalance');
    expect(transaction).not.toContain('balanceAfter');
    expect(transaction).toContain('tx.set(responseRef');
    expect(transaction).toContain('incrementStats(');
    expect(transaction).toContain('tx.set(statsRef');
    expect(transaction).toContain('alreadyGranted: false, reward');
  });

  test('client submission payload does not carry an attempt id', () => {
    const clientSubmitStart = clientSource.indexOf('export async function submitSurvey');
    const clientSubmitEnd = clientSource.indexOf('\n//', clientSubmitStart);
    const clientSubmit = clientSource.slice(clientSubmitStart, clientSubmitEnd);

    expect(clientSubmit).not.toContain('attemptId');
    expect(clientSubmit).toContain("'submitShardSurvey', data");
  });

  test('old client receives occurrence id as surveyId and therefore applies a cycle-safe event', () => {
    expect(serverSource).toContain('surveyId: occurrence ? occurrence.occurrenceId : config.surveyId');
    expect(serverSource).toContain('canonicalSurveyId: config.surveyId');
    expect(controllerSource).toContain('eventId: survey.surveyId');
  });
});
