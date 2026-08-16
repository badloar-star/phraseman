/**
 * Живучий Metro для разработки на iPhone.
 *
 * зачем: владелец жаловался, что сервер выключается сам, а правки не доезжают
 * на телефон без ручного reload. Скрипт закрывает три требования разом:
 *   1. окно не закрывается — что бы ни случилось с Metro;
 *   2. Metro упал → поднимаем заново сразу, сами;
 *   3. приложение перезагружается каждые 3 минуты, чтобы правка гарантированно
 *      доехала даже если Fast Refresh её пропустил.
 *
 * Reload идёт по websocket-каналу Metro /message — тем же, которым сам Metro
 * рассылает команды устройствам (проверено: сообщение доходит до клиента).
 * Запуск: node scripts/dev_metro_supervisor.mjs [--port 8085] [--tunnel]
 */
import { spawn } from 'node:child_process';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const argv = process.argv.slice(2);
const readFlag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};

const PORT = readFlag('--port', '8085');
const USE_TUNNEL = argv.includes('--tunnel');
const RELOAD_EVERY_MS = Number(readFlag('--reload-ms', String(3 * 60_000)));
const PROJECT_ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// Перезапуск не должен превращаться в бесконечный цикл на сломанном проекте:
// если Metro падает мгновенно несколько раз подряд — притормаживаем.
const RESTART_MIN_DELAY_MS = 2_000;
const RESTART_MAX_DELAY_MS = 30_000;
const HEALTHY_UPTIME_MS = 20_000;

let child = null;
let stopping = false;
let consecutiveFailures = 0;
let reloadTimer = null;

const stamp = () => new Date().toTimeString().slice(0, 8);
const log = (message) => console.log(`[${stamp()}] ${message}`);

function startMetro() {
  if (stopping) return;
  const startedAt = Date.now();
  const args = [
    'expo', 'start',
    '--port', PORT,
    '--dev-client',
    ...(USE_TUNNEL ? ['--tunnel'] : []),
  ];

  log(`запускаю Metro на порту ${PORT}${USE_TUNNEL ? ' (tunnel)' : ''}...`);
  child = spawn('npx', args, {
    cwd: PROJECT_ROOT,
    shell: true,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: {
      ...process.env,
      EXPO_NO_TELEMETRY: '1',
      CI: 'false',
      NODE_OPTIONS: '--max-old-space-size=12288',
      UV_THREADPOOL_SIZE: '128',
    },
  });

  child.on('exit', (code, signal) => {
    child = null;
    if (stopping) return;

    const uptimeMs = Date.now() - startedAt;
    // Продержался достаточно — считаем прошлый запуск здоровым и сбрасываем
    // счётчик, иначе редкие падения раз в час копились бы в максимальную паузу.
    if (uptimeMs >= HEALTHY_UPTIME_MS) consecutiveFailures = 0;
    else consecutiveFailures += 1;

    const delay = Math.min(
      RESTART_MAX_DELAY_MS,
      RESTART_MIN_DELAY_MS * 2 ** Math.max(0, consecutiveFailures - 1),
    );
    log(`Metro остановился (code=${code ?? '-'} signal=${signal ?? '-'}). Перезапуск через ${Math.round(delay / 1000)}с...`);
    setTimeout(startMetro, delay);
  });

  child.on('error', (error) => {
    log(`не удалось запустить Metro: ${error.message}`);
  });
}

/** Просим все подключённые устройства перезагрузить бандл. */
function broadcastReload() {
  let WebSocket;
  try {
    WebSocket = require('ws');
  } catch {
    log('модуль ws не найден — авто-reload пропущен');
    return;
  }

  const socket = new WebSocket(`ws://localhost:${PORT}/message`);
  const done = setTimeout(() => { try { socket.terminate(); } catch { /* уже закрыт */ } }, 5_000);

  socket.on('open', () => {
    socket.send(JSON.stringify({ version: 2, method: 'reload' }));
    log('отправил reload на устройства');
    clearTimeout(done);
    setTimeout(() => { try { socket.close(); } catch { /* уже закрыт */ } }, 300);
  });
  // Metro ещё не поднялся — это нормально, следующий тик попробует снова.
  socket.on('error', () => { clearTimeout(done); });
}

function startReloadTimer() {
  if (reloadTimer) clearInterval(reloadTimer);
  if (!Number.isFinite(RELOAD_EVERY_MS) || RELOAD_EVERY_MS <= 0) {
    log('авто-reload выключен (--reload-ms 0)');
    return;
  }
  reloadTimer = setInterval(broadcastReload, RELOAD_EVERY_MS);
  log(`авто-reload каждые ${Math.round(RELOAD_EVERY_MS / 1000)}с`);
}

function shutdown() {
  if (stopping) return;
  stopping = true;
  if (reloadTimer) clearInterval(reloadTimer);
  log('останавливаю Metro...');
  if (child) {
    child.kill();
    setTimeout(() => { if (child) child.kill('SIGKILL'); process.exit(0); }, 5_000);
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// Окно не должно закрываться из-за случайной ошибки самого супервизора.
process.on('uncaughtException', (error) => log(`сбой супервизора (продолжаю): ${error.message}`));
process.on('unhandledRejection', (reason) => log(`отклонённое обещание (продолжаю): ${String(reason)}`));

console.log('='.repeat(58));
console.log('  Phraseman Metro — живучий режим');
console.log(`  порт ${PORT}${USE_TUNNEL ? ' + tunnel' : ''} · авто-reload ${Math.round(RELOAD_EVERY_MS / 1000)}с`);
console.log('  Ctrl+C — остановить');
console.log('='.repeat(58));

startMetro();
startReloadTimer();
