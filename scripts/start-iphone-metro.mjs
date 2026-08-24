#!/usr/bin/env node
import net from 'node:net';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);

function has(name) {
  return argv.includes(name);
}

function value(name) {
  const inline = argv.find((item) => item.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function usage() {
  console.log(`
Phraseman Metro для физического iPhone

Запуск:
  npm run metro:iphone:mac              # LAN, Mac и iPhone в одной Wi-Fi сети
  npm run metro:iphone:mac:tunnel       # Expo Tunnel, если LAN недоступен
  npm run metro:iphone:mac:clear        # LAN с очисткой Metro cache

Опции:
  --lan                  локальная сеть (по умолчанию)
  --tunnel               туннель через Expo/ngrok
  --port 8081            предпочтительный порт; при занятости выберется следующий
  --strict-port          не выбирать другой порт, если указанный занят
  --clear                очистить Metro cache
  --dry-run              только показать итоговую команду
  --help                 эта справка

После запуска наведите обычную Камеру iPhone на QR-код в Terminal и нажмите
«Открыть в Phraseman». На телефоне должен быть установлен development build,
а не обычная версия из App Store.
`);
}

if (has('--help') || has('-h')) {
  usage();
  process.exit(0);
}

if (has('--lan') && has('--tunnel')) {
  console.error('Нельзя одновременно указать --lan и --tunnel.');
  process.exit(2);
}

const mode = has('--tunnel') ? 'tunnel' : 'lan';
const requestedPortRaw = value('--port') ?? process.env.PHRASEMAN_METRO_PORT ?? '8081';
const requestedPort = Number(requestedPortRaw);
if (!Number.isInteger(requestedPort) || requestedPort < 1024 || requestedPort > 65535) {
  console.error(`Некорректный порт: ${requestedPortRaw}`);
  process.exit(2);
}

function runCheck(label, command, args) {
  const result = spawnSync(command, args, {
    cwd: PROJECT_ROOT,
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    console.error(`\nОшибка проверки «${label}».`);
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status || 1);
  }
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  if (output) console.log(output);
}

function gitOutput(args) {
  const result = spawnSync('git', args, {
    cwd: PROJECT_ROOT,
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 20000,
  });
  return {
    ok: result.status === 0,
    stdout: String(result.stdout || '').trim(),
    stderr: String(result.stderr || '').trim(),
  };
}

function verifyCurrentGitSnapshot() {
  const branch = gitOutput(['branch', '--show-current']).stdout || '(detached HEAD)';
  const upstreamResult = gitOutput([
    'rev-parse',
    '--abbrev-ref',
    '--symbolic-full-name',
    '@{upstream}',
  ]);
  const upstream = upstreamResult.ok ? upstreamResult.stdout : '';
  const fetch = gitOutput(['fetch', '--quiet', 'origin', '--prune']);

  if (!fetch.ok) {
    console.warn(`GitHub сейчас недоступен; запускаю локальный working tree (${branch}).`);
  }

  if (upstream) {
    const counts = gitOutput(['rev-list', '--left-right', '--count', `HEAD...${upstream}`]);
    if (counts.ok) {
      const [aheadRaw, behindRaw] = counts.stdout.split(/\s+/);
      const ahead = Number(aheadRaw || 0);
      const behind = Number(behindRaw || 0);
      if (behind > 0) {
        const dirty = gitOutput(['status', '--porcelain']);
        if (dirty.stdout) {
          console.error(
            `В ${upstream} есть ${behind} новых коммит(а), но в working tree есть ` +
              'незакоммиченные изменения. Metro остановлен, чтобы не показывать ' +
              'неполную смесь версий и не перезаписать локальную работу.',
          );
          process.exit(4);
        }
        const merge = spawnSync('git', ['merge', '--ff-only', upstream], {
          cwd: PROJECT_ROOT,
          env: process.env,
          encoding: 'utf8',
          stdio: 'inherit',
        });
        if (merge.status !== 0) process.exit(merge.status || 4);
      }
      console.log(`Git: ${branch} ↔ ${upstream}; локально впереди: ${ahead}, удалённо: ${behind}.`);
    }
  } else {
    console.log(`Git: ${branch}; upstream не настроен, используется текущий working tree.`);
  }

  const workingTree = gitOutput(['status', '--porcelain']);
  const localChangeCount = workingTree.stdout ? workingTree.stdout.split('\n').length : 0;
  console.log(`Текущий working tree: ${localChangeCount} локальных изменений; все они входят в Metro.`);
}

async function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.listen({ host: '0.0.0.0', port }, () => server.close(() => resolve(true)));
  });
}

async function choosePort(first) {
  if (await isPortFree(first)) return first;
  if (has('--strict-port')) {
    console.error(`Порт ${first} уже занят. Остановите старый Metro или выберите --port.`);
    process.exit(3);
  }
  for (let port = first + 1; port <= Math.min(first + 20, 65535); port += 1) {
    if (await isPortFree(port)) {
      console.log(`Порт ${first} занят — безопасно использую ${port}, старый Metro не останавливаю.`);
      return port;
    }
  }
  console.error(`Не найден свободный порт рядом с ${first}.`);
  process.exit(3);
}

function lanAddresses() {
  const ignored = /^(lo|utun|awdl|llw|bridge|docker|vbox|vmnet)/i;
  const entries = [];
  for (const [name, addresses] of Object.entries(os.networkInterfaces())) {
    if (ignored.test(name)) continue;
    for (const address of addresses || []) {
      if (address.family !== 'IPv4' || address.internal || address.address.startsWith('169.254.')) continue;
      entries.push({ name, address: address.address });
    }
  }
  return entries;
}

async function stopStaleProjectMetro() {
  if (process.platform === 'win32') return;

  const result = spawnSync('ps', ['-axo', 'pid=,command='], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (result.status !== 0) return;

  const expoCommand = `${PROJECT_ROOT}/node_modules/.bin/expo start`;
  const stalePids = String(result.stdout || '')
    .split('\n')
    .map((line) => line.trim().match(/^(\d+)\s+(.+)$/))
    .filter((match) => match && match[2].includes(expoCommand))
    .map((match) => Number(match[1]))
    .filter((pid) => Number.isInteger(pid) && pid !== process.pid);

  if (!stalePids.length) return;

  console.log(`Останавливаю старый Metro этого проекта: ${stalePids.join(', ')}`);
  for (const pid of stalePids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch (error) {
      if (error?.code !== 'ESRCH') throw error;
    }
  }
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await isPortFree(requestedPort)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

process.chdir(PROJECT_ROOT);
runCheck('корень checkout', process.execPath, ['scripts/canonical_workspace_guard.mjs']);
verifyCurrentGitSnapshot();

if (!has('--dry-run')) await stopStaleProjectMetro();
const port = await choosePort(requestedPort);
const addresses = lanAddresses();

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║           PHRASEMAN · METRO ДЛЯ ФИЗИЧЕСКОГО iPHONE          ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log(`Режим: ${mode === 'lan' ? 'LAN — одна Wi-Fi сеть' : 'EXPO TUNNEL — работает через интернет'}`);
console.log(`Порт:   ${port}`);
if (mode === 'lan') {
  if (addresses.length) {
    console.log(`Mac IP: ${addresses.map(({ name, address }) => `${address} (${name})`).join(', ')}`);
  } else {
    console.log('Внимание: не найден обычный IPv4-интерфейс. Если QR не откроется, используйте --tunnel.');
  }
}
if (process.env.PHRASEMAN_METRO_PERSISTENT === '1') {
  console.log('\n1. Окно Terminal можно закрыть — Metro продолжит работать в фоне.');
} else {
  console.log('\n1. Не закрывайте это окно Terminal.');
}
console.log('2. Дождитесь QR-кода Expo ниже.');
console.log('3. Откройте Камеру на iPhone и наведите её на QR-код.');
console.log('4. Нажмите «Открыть в Phraseman».');
console.log('   Строку «Web is waiting on http://localhost…» ниже игнорируйте — она только для браузера.');
if (mode === 'lan') {
  console.log('5. Mac и iPhone должны быть в одной Wi-Fi сети; VPN лучше временно выключить.');
}
if (process.env.PHRASEMAN_METRO_PERSISTENT === '1') {
  console.log('\nСервер работает постоянно. Остановка: ярлык «ОСТАНОВИТЬ_PHRASEMAN_METRO» на Рабочем столе.\n');
} else {
  console.log('\nОстановка Metro: Ctrl+C\n');
}

const expoArgs = [
  'expo',
  'start',
  '--dev-client',
  '--scheme',
  'phraseman',
  `--${mode}`,
  '--port',
  String(port),
];
if (has('--clear')) expoArgs.push('--clear');

if (has('--dry-run')) {
  console.log(`DRY RUN: npx ${expoArgs.join(' ')}`);
  process.exit(0);
}

const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', expoArgs, {
  cwd: PROJECT_ROOT,
  env: {
    ...process.env,
    CI: 'false',
    NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=12288',
    EXPO_USE_FAST_RESOLVER: process.env.EXPO_USE_FAST_RESOLVER || '1',
    ...(mode === 'lan' && addresses[0]
      ? { REACT_NATIVE_PACKAGER_HOSTNAME: addresses[0].address }
      : {}),
  },
  stdio: 'inherit',
});

async function waitForMetroAndPrewarmIosBundle() {
  if (mode !== 'lan' || !addresses[0]) return;

  const hostname = addresses[0].address;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const running = await new Promise((resolve) => {
      const request = http.get({ hostname, port, path: '/status', timeout: 1000 }, (response) => {
        response.resume();
        resolve(response.statusCode === 200);
      });
      request.once('timeout', () => request.destroy());
      request.once('error', () => resolve(false));
    });
    if (running) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  console.log('\nГотовлю полный iOS bundle и ассеты. Первый запуск может занять около минуты…');
  const bundlePath =
    '/node_modules/expo-router/entry.bundle' +
    '?platform=ios&dev=true&hot=false&lazy=true' +
    '&transform.engine=hermes&transform.bytecode=1' +
    '&unstable_transformProfile=hermes-stable';

  await new Promise((resolve, reject) => {
    const request = http.get({ hostname, port, path: bundlePath, timeout: 180000 }, (response) => {
      response.resume();
      response.once('end', () => {
        if (response.statusCode === 200) resolve();
        else reject(new Error(`Metro вернул HTTP ${response.statusCode}`));
      });
    });
    request.once('timeout', () => request.destroy(new Error('таймаут подготовки iOS bundle')));
    request.once('error', reject);
  });

  console.log('\n✅ iOS bundle и ассеты готовы. Теперь приложение на iPhone загрузится полностью.\n');
}

void waitForMetroAndPrewarmIosBundle().catch((error) => {
  if (!child.killed) console.warn(`Не удалось заранее подготовить iOS bundle: ${error.message}`);
});

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    if (!child.killed) child.kill(signal);
  });
}

child.once('error', (error) => {
  console.error(`Не удалось запустить Expo Metro: ${error.message}`);
  process.exit(1);
});

child.once('exit', (code, signal) => {
  if (signal) process.exit(0);
  process.exit(code ?? 1);
});
