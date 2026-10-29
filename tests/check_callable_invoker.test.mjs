// зачем (координатор 29.10): storyPollVote получила allUsers → run.invoker от firebase deploy в 07:21:42, а проверка через
// секунды дала ложный 🔴 — поиск Cloud Asset отстаёт. Сторож: «нет в Asset» → прямое get-iam-policy → повтор → только потом 🔴.
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCallableInvokers } from '../scripts/check_callable_invoker.mjs';

const FUNCTIONS = [
  { name: 'projects/p/locations/us-central1/functions/storyPollVote', labels: { 'deployment-callable': 'true' }, serviceConfig: { service: 'projects/p/locations/us-central1/services/storypollvote' } },
  { name: 'projects/p/locations/us-central1/functions/oldCallable', labels: { 'deployment-callable': 'true' }, serviceConfig: { service: 'projects/p/locations/us-central1/services/oldcallable' } },
  { name: 'projects/p/locations/us-central1/functions/nightly', labels: { 'deployment-scheduled': 'true' } },
];
const ASSET_ONLY_OLD = 'projects/p/locations/us-central1/services/oldcallable\n';
const policy = (members) => JSON.stringify({ bindings: [{ role: 'roles/run.invoker', members }] });

function fakeGcloud(directAnswers) {
  const calls = { direct: 0 };
  const gcloud = (args) => {
    if (args[0] === 'functions') return JSON.stringify(FUNCTIONS);
    if (args[0] === 'asset') return ASSET_ONLY_OLD;
    if (args[0] === 'run' && args[2] === 'get-iam-policy') {
      const answer = directAnswers[calls.direct] ?? directAnswers.at(-1);
      calls.direct += 1;
      if (answer instanceof Error) throw answer;
      return answer;
    }
    throw new Error(`unexpected gcloud ${args.join(' ')}`);
  };
  return { gcloud, calls };
}

const run = (directAnswers, extra = {}) => {
  const { gcloud, calls } = fakeGcloud(directAnswers);
  const lines = [];
  const sleeps = [];
  return checkCallableInvokers({
    gcloud, sleep: async (ms) => { sleeps.push(ms); }, retryDelayMs: 150_000, log: (l) => lines.push(l), ...extra,
  }).then((result) => ({ result, lines, sleeps, calls }));
};

test('только что созданная функция: Asset отстал, прямое чтение видит allUsers → 0 без повтора', async () => {
  const { result, lines, sleeps, calls } = await run([policy(['allUsers'])]);
  assert.equal(result.code, 0);
  assert.equal(result.checked, 2); // scheduled не считается
  assert.deepEqual(sleeps, []);
  assert.equal(calls.direct, 1);
  assert.ok(lines.some((l) => l.includes('✅ storyPollVote') && l.includes('Cloud Asset отставал')));
  assert.ok(!lines.some((l) => l.includes('🔴')));
});

test('прямое чтение «нет» → повтор через 150 с → право появилось → 0', async () => {
  const { result, sleeps, calls, lines } = await run([policy([]), policy(['allUsers'])]);
  assert.equal(result.code, 0);
  assert.deepEqual(sleeps, [150_000]);
  assert.equal(calls.direct, 2);
  assert.ok(lines.some((l) => l.includes('повтор через 150 с') && l.includes('storyPollVote')));
});

test('нет права и после повтора → 1 и команда починки', async () => {
  const { result, lines } = await run([policy(['serviceAccount:x@y']), policy(['serviceAccount:x@y'])]);
  assert.equal(result.code, 1);
  assert.deepEqual(result.missing.map((m) => m.name), ['storyPollVote']);
  assert.ok(lines.some((l) => l.includes('🔴 callable storyPollVote') && l.includes('подтверждено get-iam-policy дважды')));
  assert.ok(lines.some((l) => l.includes('add-iam-policy-binding storypollvote')));
});

test('прямое чтение падает оба раза → 2 (не удалось проверить), без 🔴', async () => {
  const { result, lines } = await run([new Error('PERMISSION_DENIED'), new Error('PERMISSION_DENIED')]);
  assert.equal(result.code, 2);
  assert.deepEqual(result.unverified.map((u) => u.name), ['storyPollVote']);
  assert.ok(lines.some((l) => l.includes('ошибка чтения политики') && l.includes('PERMISSION_DENIED')));
  assert.ok(!lines.some((l) => l.includes('🔴')));
});

test('--only: проверяется только названная функция', async () => {
  const { result, calls } = await run([policy(['allUsers'])], { only: new Set(['oldCallable']) });
  assert.equal(result.code, 0);
  assert.equal(result.checked, 1);
  assert.equal(calls.direct, 0);
});

test('список функций не читается → 2', async () => {
  const lines = [];
  const result = await checkCallableInvokers({ gcloud: () => { throw new Error('gcloud missing'); }, log: (l) => lines.push(l) });
  assert.equal(result.code, 2);
  assert.ok(lines.some((l) => l.includes('не удалось проверить') && l.includes('gcloud missing')));
});
