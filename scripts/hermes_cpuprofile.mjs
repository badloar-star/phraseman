#!/usr/bin/env node
// зачем (координатор 12.10, Главная: «сперва логи на паузу 2792 мс — откуда, повторяется ли»): профиль JS-потока Hermes на холодном старте через CDP (Metro inspector proxy).
// Только dev-сборка и запущенный Metro; в приложении ничего не меняется и в Firestore не пишется. Один отладчик на приложение: закрой DevTools/Chrome, иначе подключение откажет.
//
// Порядок (один робот — это делает Сверка, параллельно с другими съёмками не запускать):
//   1) node scripts/hermes_cpuprofile.mjs --port 8081 --seconds 14 --out C:/Temp/claude/cold1.cpuprofile   (скрипт ждёт появления приложения)
//   2) adb shell am force-stop app.phraseman; запустить приложение (обычный холодный старт, без dev_state)
//   3) скрипт сам подключится, начнёт профиль, через --seconds остановит, запишет файл и напечатает [CPU-PROFILE] с занятыми участками
// Разбор готового файла без приложения: node scripts/hermes_cpuprofile.mjs --analyze C:/Temp/claude/cold1.cpuprofile
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import { formatSummary, summarizeProfile } from './lib/cpuprofile_summary.mjs';

const require = createRequire(import.meta.url);

function arg(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1] : fallback;
}

const analyzeOnly = arg('analyze', null);
if (analyzeOnly) {
  const profile = JSON.parse(fs.readFileSync(analyzeOnly, 'utf8'));
  console.log(formatSummary(summarizeProfile(profile, { minMs: Number(arg('min-ms', 400)) })));
  process.exit(0);
}

const port = Number(arg('port', 8081));
const seconds = Number(arg('seconds', 14));
const outPath = arg('out', `cold_${Date.now()}.cpuprofile`);
const waitSeconds = Number(arg('wait', 120));
const minMs = Number(arg('min-ms', 400));

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (error) { reject(error); } });
    }).on('error', reject);
  });
}

async function waitForTarget() {
  const deadline = Date.now() + waitSeconds * 1000;
  let lastLog = 0;
  while (Date.now() < deadline) {
    try {
      const list = await getJson(`http://localhost:${port}/json/list`);
      const target = list.find((item) => item.webSocketDebuggerUrl && /hermes|react native/i.test(`${item.vm ?? ''} ${item.title ?? ''} ${item.description ?? ''}`));
      if (target) return target;
    } catch (error) {
      if (Date.now() - lastLog > 5000) { console.log(`[CPU-PROFILE] Metro на порту ${port} не отвечает: ${error.message}`); lastLog = Date.now(); }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`приложение не появилось в /json/list за ${waitSeconds} с`);
}

async function main() {
  const WebSocket = require('ws');
  console.log(`[CPU-PROFILE] жду приложение на порту ${port}… (запусти холодный старт)`);
  const target = await waitForTarget();
  console.log(`[CPU-PROFILE] цель: ${target.title ?? target.id} (${target.vm ?? 'vm?'})`);
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let nextId = 1;
  const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  ws.on('message', (data) => {
    const msg = JSON.parse(String(data));
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.message}`)); else resolve(msg.result);
    }
  });
  await new Promise((resolve, reject) => { ws.on('open', resolve); ws.on('error', reject); });
  // зачем (Сверка 12.10: «Unsupported method 'Profiler.enable'» на всех трёх запусках): инспектор Hermes в dev-сборке не знает Profiler.enable — Profiler.start/stop работают и без него.
  // enable пробуем, отказ не фатален (в журнал), дальше сразу start; сам отказ start/stop — уже настоящая ошибка и роняет скрипт.
  await send('Profiler.enable').catch((error) => console.log(`[CPU-PROFILE] Profiler.enable не поддержан целью (${error.message}) — иду сразу на Profiler.start`));
  await send('Profiler.setSamplingInterval', { interval: 500 }).catch((error) => console.log(`[CPU-PROFILE] интервал не задан: ${error.message}`));
  const startedAt = Date.now();
  await send('Profiler.start');
  console.log(`[CPU-PROFILE] профиль идёт ${seconds} с`);
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  const { profile } = await send('Profiler.stop');
  fs.writeFileSync(outPath, JSON.stringify(profile));
  console.log(`[CPU-PROFILE] записано ${outPath} (${profile.samples.length} сэмплов, ${Date.now() - startedAt} мс)`);
  console.log(formatSummary(summarizeProfile(profile, { minMs })));
  ws.close();
}

main().catch((error) => {
  console.error(`[CPU-PROFILE] ошибка: ${error.message}`);
  process.exit(1);
});
