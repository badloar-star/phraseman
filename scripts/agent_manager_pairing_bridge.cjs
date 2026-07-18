'use strict';

const http = require('node:http');
const { exchangePairing } = require('./agent_manager_codex_runner_core.cjs');
const { defaultConfigPath, writeConfig } = require('./agent_manager_codex_runner.cjs');

const PAIRING_BRIDGE_HOST = '127.0.0.1';
const PAIRING_BRIDGE_PORT = 43817;
const PAIRING_BRIDGE_PATH = '/v1/agent-manager/pairing';
const PAIRING_BRIDGE_ORIGIN = 'https://phraseman-ea0b3.web.app';
const MAX_BODY_BYTES = 4096;
const MAX_PAIRING_FUTURE_MS = 10 * 60 * 1000;
const PRODUCTION_ENDPOINTS = Object.freeze({
  exchangeUrl: 'https://us-central1-phraseman-ea0b3.cloudfunctions.net/agentManagerLocalRunnerExchangePairing',
  claimUrl: 'https://us-central1-phraseman-ea0b3.cloudfunctions.net/agentManagerLocalRunnerClaim',
  submitUrl: 'https://us-central1-phraseman-ea0b3.cloudfunctions.net/agentManagerLocalRunnerSubmit',
});
const PAIRING_ID = /^[A-Za-z][A-Za-z0-9._:-]{2,159}$/;
const PAIRING_CODE = /^[A-Za-z0-9_-]{8,160}$/;

function invalidPayload() { throw new Error('pairing payload is invalid'); }

function validatePairingPayload(value, nowMs = Date.now()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalidPayload();
  const payload = value;
  const keys = Object.keys(payload).sort();
  const expected = ['claimUrl', 'exchangeUrl', 'expiresAtMs', 'pairingCode', 'pairingId', 'submitUrl'];
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) invalidPayload();
  if (typeof payload.pairingId !== 'string' || typeof payload.pairingCode !== 'string' || !PAIRING_ID.test(payload.pairingId) || !PAIRING_CODE.test(payload.pairingCode)) invalidPayload();
  if (!Number.isSafeInteger(payload.expiresAtMs)) invalidPayload();
  if (payload.expiresAtMs <= nowMs) throw new Error('pairing payload is expired');
  if (payload.expiresAtMs > nowMs + MAX_PAIRING_FUTURE_MS) invalidPayload();
  for (const [key, endpoint] of Object.entries(PRODUCTION_ENDPOINTS)) {
    if (payload[key] !== endpoint) invalidPayload();
  }
  return Object.freeze({
    pairingId: payload.pairingId,
    pairingCode: payload.pairingCode,
    expiresAtMs: payload.expiresAtMs,
    exchangeUrl: payload.exchangeUrl,
    claimUrl: payload.claimUrl,
    submitUrl: payload.submitUrl,
  });
}

function send(response, status, body, origin) {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(body) };
  if (origin === PAIRING_BRIDGE_ORIGIN) {
    headers['access-control-allow-origin'] = PAIRING_BRIDGE_ORIGIN;
    headers['access-control-allow-methods'] = 'POST, OPTIONS';
    headers['access-control-allow-headers'] = 'content-type';
    headers['access-control-allow-private-network'] = 'true';
    headers.vary = 'Origin, Access-Control-Request-Private-Network';
  }
  response.writeHead(status, headers);
  response.end(body);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) { reject(new Error('request body is too large')); request.destroy(); return; }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('request body is invalid')); }
    });
    request.on('error', () => reject(new Error('request body is invalid')));
  });
}

function startPairingBridge(options = {}) {
  const port = Number.isInteger(options.port) && options.port >= 0 && options.port <= 65535 ? options.port : PAIRING_BRIDGE_PORT;
  const onPairing = typeof options.onPairing === 'function' ? options.onPairing : async () => {};
  const now = typeof options.now === 'function' ? options.now : Date.now;
  let reserved = false;
  let consumed = false;
  const server = http.createServer(async (request, response) => {
    const origin = request.headers.origin;
    if (request.socket.remoteAddress !== PAIRING_BRIDGE_HOST || request.url !== PAIRING_BRIDGE_PATH) { send(response, 404, '{"ok":false}', origin); return; }
    if (origin !== PAIRING_BRIDGE_ORIGIN) { send(response, 403, '{"ok":false}', origin); return; }
    if (request.method === 'OPTIONS') { send(response, 204, '', origin); return; }
    if (request.method !== 'POST' || !/^application\/json(?:;|$)/i.test(String(request.headers['content-type'] || ''))) { send(response, 405, '{"ok":false}', origin); return; }
    if (reserved || consumed) { send(response, 409, '{"ok":false}', origin); return; }
    reserved = true;
    try {
      const payload = validatePairingPayload(await readJson(request), now());
      consumed = true;
      await onPairing(payload);
      send(response, 202, '{"ok":true}', origin);
      if (options.closeAfterAccepted) void closeServer(server);
    } catch {
      if (!consumed) reserved = false;
      send(response, 400, '{"ok":false}', origin);
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen({ host: PAIRING_BRIDGE_HOST, port, exclusive: true }, () => {
      server.removeListener('error', reject);
      const address = server.address();
      resolve(Object.freeze({ host: PAIRING_BRIDGE_HOST, port: typeof address === 'object' && address ? address.port : port, close: () => closeServer(server) }));
    });
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

async function pairAndWriteConfig(payload, configPath) {
  const config = await exchangePairing({ ...payload, fetch: globalThis.fetch });
  writeConfig(configPath, config);
}

async function main(argv = process.argv.slice(2)) {
  const configIndex = argv.indexOf('--config');
  if (argv.length !== 0 && (configIndex !== 0 || argv.length !== 2 || !argv[1])) throw new Error('use only --config <path>');
  const configPath = configIndex === 0 ? argv[1] : defaultConfigPath();
  await startPairingBridge({ configPath, closeAfterAccepted: true, onPairing: (payload) => pairAndWriteConfig(payload, configPath) });
}

if (require.main === module) {
  main().catch(() => { process.exitCode = 1; });
}

module.exports = Object.freeze({
  PAIRING_BRIDGE_HOST,
  PAIRING_BRIDGE_ORIGIN,
  PAIRING_BRIDGE_PATH,
  PAIRING_BRIDGE_PORT,
  PRODUCTION_ENDPOINTS,
  pairAndWriteConfig,
  startPairingBridge,
  validatePairingPayload,
});
