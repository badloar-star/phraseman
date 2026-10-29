#!/usr/bin/env node
// Проверка после выкладки: у каждой вызываемой (onCall) и HTTP (onRequest) функции на Cloud Run есть allUsers → roles/run.invoker.
//
// зачем (координатор 22.10, 🔴 согласие на ИИ): 12.08 первое создание recordAiDialogConsent и recordAiExplainConsent упало
// (Container Healthcheck), а firebase CLI выдаёт публичное право вызова ТОЛЬКО при успешном создании. Дальше шли обновления —
// права не было никогда, каждый вызов приложения получал 401 на входе Cloud Run, и ни одно согласие на ИИ не записалось за 2 месяца.
// Скрипт ловит такую функцию сразу после выкладки. Только чтение, без правок.
//
// зачем (координатор 29.10, ложный 🔴 на storyPollVote): поиск Cloud Asset отстаёт на минуты — право, выданное firebase deploy
// в 07:21:42, проверка через секунды ещё не видела. Поэтому «нет права» из Asset больше не приговор: читаем политику сервиса
// напрямую (get-iam-policy), а если и там нет — повторяем через 2,5 мин. 🔴 только когда оба прямых чтения сказали «нет».
// Выход: 0 — всё в порядке; 1 — есть функции без права (печатает их и команду починки); 2 — не удалось проверить.
//
//   node scripts/check_callable_invoker.mjs                 # все функции проекта
//   node scripts/check_callable_invoker.mjs --only a,b      # только эти функции (имена как в index.ts)
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const PROJECT = 'phraseman-ea0b3';
export const REGION = 'us-central1';
export const DEFAULT_RETRY_DELAY_MS = 150_000;
const LOG = '[INVOKER-CHECK]';

function realGcloud(args) {
  // зачем: на Windows gcloud — это gcloud.cmd; shell нужен, чтобы его найти
  return execFileSync('gcloud', args, { encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 });
}

const kindOf = (fn) => {
  const labels = fn.labels ?? {};
  if (fn.eventTrigger) return 'event';
  if (labels['deployment-scheduled']) return 'scheduled';
  if (labels['deployment-taskqueue']) return 'taskqueue';
  return labels['deployment-callable'] ? 'callable' : 'https';
};

const errText = (error) => String(error instanceof Error ? error.message : error).slice(0, 300);

/** Прямое чтение политики сервиса: 'public' | 'private' | 'error'. */
function readServicePolicy(gcloud, service, log) {
  try {
    const policy = JSON.parse(gcloud([
      'run', 'services', 'get-iam-policy', service, `--region=${REGION}`, `--project=${PROJECT}`, '--format=json',
    ]) || '{}');
    const bindings = Array.isArray(policy.bindings) ? policy.bindings : [];
    const invoker = bindings.find((b) => b.role === 'roles/run.invoker');
    const members = Array.isArray(invoker?.members) ? invoker.members : [];
    const verdict = members.includes('allUsers') ? 'public' : 'private';
    log(`${LOG} direct ${service}: ${verdict} (run.invoker members=${members.length ? members.join('|') : 'нет'})`);
    return verdict;
  } catch (error) {
    log(`${LOG} direct ${service}: ошибка чтения политики — ${errText(error)}`);
    return 'error';
  }
}

/**
 * @returns {Promise<{ code: 0|1|2, checked: number, missing: object[], unverified: object[] }>}
 */
export async function checkCallableInvokers({
  gcloud = realGcloud,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  only = null,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  log = (line) => console.log(line),
} = {}) {
  let functions;
  let publicServices;
  try {
    functions = JSON.parse(gcloud(['functions', 'list', `--project=${PROJECT}`, `--regions=${REGION}`, '--format=json']));
    publicServices = new Set(gcloud([
      'asset', 'search-all-iam-policies', `--scope=projects/${PROJECT}`, '--asset-types=run.googleapis.com/Service',
      '--query=policy:allUsers', '--format=value(resource)',
    ]).split(/\r?\n/).filter(Boolean).map((line) => line.split('/services/').pop()));
  } catch (error) {
    log(`${LOG} не удалось проверить: ${errText(error)}`);
    return { code: 2, checked: 0, missing: [], unverified: [] };
  }

  let suspects = [];
  let checked = 0;
  for (const fn of functions) {
    const name = String(fn.name ?? '').split('/').pop();
    if (only && !only.has(name)) continue;
    const kind = kindOf(fn);
    if (kind !== 'callable' && kind !== 'https') continue;
    checked += 1;
    const service = String(fn.serviceConfig?.service ?? '').split('/').pop() || name.toLowerCase();
    if (publicServices.has(service)) continue;
    log(`${LOG} asset: ${kind} ${name} (${service}) нет в поиске Cloud Asset — проверяю политику сервиса напрямую`);
    suspects.push({ name, kind, service });
  }
  log(`${LOG} asset: проверено ${checked}${only ? ` (из --only: ${only.size})` : ''}; под подозрением ${suspects.length}`);

  // попытка 1 — сразу; попытка 2 — после паузы, только для тех, кого прямое чтение не подтвердило
  let unverified = [];
  for (let attempt = 1; attempt <= 2 && suspects.length > 0; attempt += 1) {
    if (attempt === 2) {
      log(`${LOG} повтор через ${Math.round(retryDelayMs / 1000)} с для ${suspects.length}: ${suspects.map((s) => s.name).join(', ')} (право могло ещё не распространиться)`);
      await sleep(retryDelayMs);
    }
    const still = [];
    unverified = [];
    for (const s of suspects) {
      const verdict = readServicePolicy(gcloud, s.service, log);
      if (verdict === 'public') {
        log(`${LOG} ✅ ${s.name}: право есть (попытка ${attempt}, источник: get-iam-policy; Cloud Asset отставал)`);
      } else if (verdict === 'error') {
        unverified.push(s);
        still.push(s);
      } else {
        still.push(s);
      }
    }
    suspects = still;
  }

  const missing = suspects.filter((s) => !unverified.includes(s));
  log(`${LOG} проверено вызываемых/HTTP функций: ${checked}${only ? ` (из --only: ${only.size})` : ''}; без публичного права вызова: ${missing.length}; не удалось проверить: ${unverified.length}`);
  for (const m of missing) {
    log(`${LOG} 🔴 ${m.kind} ${m.name}: нет allUsers → roles/run.invoker (подтверждено get-iam-policy дважды) — приложение получит 401 на входе Cloud Run`);
    log(`${LOG}    починка (по «да» владельца): gcloud run services add-iam-policy-binding ${m.service} --region=${REGION} --project=${PROJECT} --member=allUsers --role=roles/run.invoker`);
  }
  for (const u of unverified) log(`${LOG} ⚠️ ${u.kind} ${u.name}: политику сервиса прочитать не удалось — проверить вручную`);
  const code = missing.length > 0 ? 1 : unverified.length > 0 ? 2 : 0;
  return { code, checked, missing, unverified };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const onlyArg = process.argv.indexOf('--only');
  const only = onlyArg > 0 ? new Set(String(process.argv[onlyArg + 1] ?? '').split(',').map((s) => s.trim()).filter(Boolean)) : null;
  const result = await checkCallableInvokers({ only });
  process.exit(result.code);
}
