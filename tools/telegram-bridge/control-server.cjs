#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URLSearchParams } = require('url');
const {
  applyControlAction,
  buildControlCenterModel,
  buildControlCenterUrl,
  renderControlCenterHtml,
  writeControlCenter,
} = require('./control-center.cjs');
const { DEFAULT_DATA_DIR, ensureDirFor, loadConfig, loadState, saveState } = require('./core.cjs');

const PID_PATH = path.join(DEFAULT_DATA_DIR, 'control-server.pid.json');

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function parseActionBody(raw, contentType = '') {
  if (contentType.includes('application/json')) {
    return raw ? JSON.parse(raw) : {};
  }
  const params = new URLSearchParams(raw || '');
  return Object.fromEntries(params.entries());
}

function removePidFileIfCurrent(pidPath = PID_PATH, pid = process.pid) {
  try {
    const current = fs.existsSync(pidPath)
      ? JSON.parse(fs.readFileSync(pidPath, 'utf8').replace(/^\uFEFF/, ''))
      : null;
    if (Number(current?.pid) === Number(pid)) fs.rmSync(pidPath, { force: true });
  } catch {
    /* best effort cleanup */
  }
}

async function handle(req, res) {
  const config = loadConfig();
  if (req.method === 'OPTIONS') {
    send(res, 204, '');
    return;
  }
  if (req.method === 'GET' && (req.url === '/' || req.url === '/control-center.html')) {
    const state = loadState(config.statePath);
    const model = buildControlCenterModel(state, config);
    model.actionUrl = `${buildControlCenterUrl(config)}action`;
    send(res, 200, renderControlCenterHtml(model), 'text/html; charset=utf-8');
    return;
  }
  if (req.method === 'GET' && req.url === '/state') {
    const state = loadState(config.statePath);
    const model = buildControlCenterModel(state, config);
    send(res, 200, JSON.stringify(model, null, 2), 'application/json; charset=utf-8');
    return;
  }
  if (req.method === 'GET' && req.url === '/health') {
    send(res, 200, 'ok');
    return;
  }
  if (req.method === 'POST' && req.url === '/action') {
    try {
      const raw = await readBody(req);
      const input = parseActionBody(raw, req.headers['content-type'] || '');
      const state = loadState(config.statePath);
      const result = applyControlAction(config, state, input);
      saveState(config.statePath, state);
      writeControlCenter(config, state);
      send(res, result.ok ? 200 : 400, JSON.stringify(result, null, 2), 'application/json; charset=utf-8');
    } catch (error) {
      send(res, 500, JSON.stringify({ ok: false, message: error.message }, null, 2), 'application/json; charset=utf-8');
    }
    return;
  }
  send(res, 404, 'not found');
}

function startServer(config = loadConfig()) {
  const port = Number(config.controlCenterPort || 3999);
  const server = http.createServer((req, res) => {
    handle(req, res).catch((error) => send(res, 500, error.message));
  });
  server.on('error', (error) => {
    if (error && error.code === 'EADDRINUSE') {
      console.log(`Codex Control Center already running on ${buildControlCenterUrl(config)}`);
      process.exitCode = 0;
      return;
    }
    console.error(`[telegram-control-server] ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    ensureDirFor(PID_PATH);
    fs.writeFileSync(PID_PATH, JSON.stringify({
      pid: process.pid,
      startedAt: new Date().toISOString(),
      command: `${process.execPath} ${__filename}`,
    }, null, 2), 'utf8');
    console.log(`Codex Control Center: ${buildControlCenterUrl(config)}`);
  });
  server.on('close', () => {
    removePidFileIfCurrent(PID_PATH, process.pid);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  parseActionBody,
  removePidFileIfCurrent,
  startServer,
};
