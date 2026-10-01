'use strict';

// зачем: ремонт №2 WAL-кампании. Раньше лаунчер подменял "main" в общем package.json, и
// ~5 минут эту подмену видели бандлеры и коммиты других сессий. Dev-клиент всегда просит
// виртуальную точку входа Expo; этот прокси (только на время кампании, только на
// 127.0.0.1) переписывает ровно этот запрос на файл пробы. Metro отдаёт любой файл
// проекта как точку входа, поэтому общий package.json больше не трогается.
const http = require('node:http');
const net = require('node:net');

const VIRTUAL_PREFIX = '/.expo/.virtual-metro-entry.';
const PROBE_BASE = '/runtime-probes/android-account-sqlcipher-recovery/index.';
const PROBE_BUNDLE_PATH = `${PROBE_BASE}bundle`;
const LOG_PREFIX = '[WAL-ENTRY-PROXY]';

function rewriteEntryUrl(url) {
  if (typeof url !== 'string') return url;
  const queryStart = url.indexOf('?');
  const pathname = queryStart < 0 ? url : url.slice(0, queryStart);
  const suffix = pathname.startsWith(VIRTUAL_PREFIX) ? pathname.slice(VIRTUAL_PREFIX.length) : undefined;
  if (suffix !== 'bundle' && suffix !== 'map') return url;
  const params = new URLSearchParams(queryStart < 0 ? '' : url.slice(queryStart + 1));
  // Те же параметры, что Expo добавил бы виртуальной точке входа для Hermes-сборки.
  if (!params.has('transform.engine')) {
    params.set('transform.engine', 'hermes');
    params.set('transform.bytecode', '1');
    params.set('unstable_transformProfile', 'hermes-stable');
  }
  return `${PROBE_BASE}${suffix}?${params.toString()}`;
}

function createEntryProxy(upstreamPort, log = (line) => console.log(line)) {
  const server = http.createServer((request, response) => {
    const target = rewriteEntryUrl(request.url);
    if (target !== request.url) log(`${LOG_PREFIX} rewrite ${request.method} -> ${PROBE_BASE}*`);
    const upstream = http.request({
      host: '127.0.0.1',
      port: upstreamPort,
      method: request.method,
      path: target,
      headers: request.headers,
    }, (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    });
    upstream.on('error', (error) => {
      log(`${LOG_PREFIX} upstream_failed code=${error && error.code ? error.code : 'unknown'}`);
      if (!response.headersSent) response.writeHead(502, { 'content-type': 'text/plain' });
      response.end('entry_proxy_upstream_failed');
    });
    request.pipe(upstream);
  });
  server.on('upgrade', (request, socket, head) => {
    const target = rewriteEntryUrl(request.url);
    const upstream = net.connect(upstreamPort, '127.0.0.1', () => {
      const lines = [`${request.method} ${target} HTTP/${request.httpVersion}`];
      for (let index = 0; index < request.rawHeaders.length; index += 2) {
        lines.push(`${request.rawHeaders[index]}: ${request.rawHeaders[index + 1]}`);
      }
      upstream.write(`${lines.join('\r\n')}\r\n\r\n`);
      if (head && head.length > 0) upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    });
    upstream.on('error', (error) => {
      log(`${LOG_PREFIX} upgrade_upstream_failed code=${error && error.code ? error.code : 'unknown'}`);
      socket.destroy();
    });
    socket.on('error', (error) => {
      log(`${LOG_PREFIX} upgrade_client_failed code=${error && error.code ? error.code : 'unknown'}`);
      upstream.destroy();
    });
    socket.on('close', () => upstream.destroy());
    upstream.on('close', () => socket.destroy());
  });
  return server;
}

function parsePort(value) {
  return /^[1-9][0-9]{0,4}$/u.test(value ?? '') && Number(value) <= 65535 ? Number(value) : undefined;
}

if (require.main === module) {
  const listenPort = parsePort(process.argv[2]);
  const upstreamPort = parsePort(process.argv[3]);
  if (listenPort === undefined || upstreamPort === undefined || listenPort === upstreamPort) {
    console.error('entry_proxy_arguments_invalid');
    process.exit(2);
  }
  const server = createEntryProxy(upstreamPort);
  server.on('error', (error) => {
    console.error(`entry_proxy_listen_failed code=${error && error.code ? error.code : 'unknown'}`);
    process.exit(1);
  });
  server.listen(listenPort, '127.0.0.1', () => console.log(`${LOG_PREFIX} listening ${listenPort} -> ${upstreamPort}`));
}

module.exports = { PROBE_BUNDLE_PATH, createEntryProxy, rewriteEntryUrl };
