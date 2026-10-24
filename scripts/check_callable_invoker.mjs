#!/usr/bin/env node
// Проверка после выкладки: у каждой вызываемой (onCall) и HTTP (onRequest) функции на Cloud Run есть allUsers → roles/run.invoker.
//
// зачем (координатор 22.10, 🔴 согласие на ИИ): 12.08 первое создание recordAiDialogConsent и recordAiExplainConsent упало
// (Container Healthcheck), а firebase CLI выдаёт публичное право вызова ТОЛЬКО при успешном создании. Дальше шли обновления —
// права не было никогда, каждый вызов приложения получал 401 на входе Cloud Run, и ни одно согласие на ИИ не записалось за 2 месяца.
// Скрипт ловит такую функцию сразу после выкладки. Только чтение: два запроса (список функций + поиск политик), без правок.
// Выход: 0 — всё в порядке; 1 — есть функции без права (печатает их и команду починки); 2 — не удалось проверить.
//
//   node scripts/check_callable_invoker.mjs                 # все функции проекта
//   node scripts/check_callable_invoker.mjs --only a,b      # только эти функции (имена как в index.ts)
import { execFileSync } from 'node:child_process';

const PROJECT = 'phraseman-ea0b3';
const REGION = 'us-central1';
const LOG = '[INVOKER-CHECK]';
const onlyArg = process.argv.indexOf('--only');
const only = onlyArg > 0 ? new Set(String(process.argv[onlyArg + 1] ?? '').split(',').map((s) => s.trim()).filter(Boolean)) : null;

function gcloud(args) {
  // зачем: на Windows gcloud — это gcloud.cmd; shell нужен, чтобы его найти
  return execFileSync('gcloud', args, { encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 });
}

let functions;
let publicServices;
try {
  functions = JSON.parse(gcloud(['functions', 'list', `--project=${PROJECT}`, `--regions=${REGION}`, '--format=json']));
  publicServices = new Set(gcloud([
    'asset', 'search-all-iam-policies', `--scope=projects/${PROJECT}`, '--asset-types=run.googleapis.com/Service',
    '--query=policy:allUsers', '--format=value(resource)',
  ]).split(/\r?\n/).filter(Boolean).map((line) => line.split('/services/').pop()));
} catch (error) {
  console.error(`${LOG} не удалось проверить: ${String(error instanceof Error ? error.message : error).slice(0, 300)}`);
  process.exit(2);
}

const kindOf = (fn) => {
  const labels = fn.labels ?? {};
  if (fn.eventTrigger) return 'event';
  if (labels['deployment-scheduled']) return 'scheduled';
  if (labels['deployment-taskqueue']) return 'taskqueue';
  return labels['deployment-callable'] ? 'callable' : 'https';
};
const missing = [];
let checked = 0;
for (const fn of functions) {
  const name = String(fn.name ?? '').split('/').pop();
  if (only && !only.has(name)) continue;
  const kind = kindOf(fn);
  if (kind !== 'callable' && kind !== 'https') continue;
  checked += 1;
  const service = String(fn.serviceConfig?.service ?? '').split('/').pop() || name.toLowerCase();
  if (!publicServices.has(service)) missing.push({ name, kind, service });
}

console.log(`${LOG} проверено вызываемых/HTTP функций: ${checked}${only ? ` (из --only: ${only.size})` : ''}; без публичного права вызова: ${missing.length}`);
if (missing.length === 0) process.exit(0);
for (const m of missing) {
  console.log(`${LOG} 🔴 ${m.kind} ${m.name}: нет allUsers → roles/run.invoker — приложение получит 401 на входе Cloud Run`);
  console.log(`${LOG}    починка (по «да» владельца): gcloud run services add-iam-policy-binding ${m.service} --region=${REGION} --project=${PROJECT} --member=allUsers --role=roles/run.invoker`);
}
process.exit(1);
