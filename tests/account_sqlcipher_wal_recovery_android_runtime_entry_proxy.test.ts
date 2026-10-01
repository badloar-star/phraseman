import http from 'node:http';
import net from 'node:net';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

// зачем: ремонт №2 — проба больше не подменяет общий package.json (его ~5 минут видели
// бандлеры других сессий). Вместо этого собственный прокси лаунчера переписывает только
// запрос виртуальной точки входа Expo на файл пробы; всё остальное проходит как есть.
type EntryProxyModule = Readonly<{
  PROBE_BUNDLE_PATH: string;
  rewriteEntryUrl: (url: unknown) => unknown;
  createEntryProxy: (upstreamPort: number, log?: (line: string) => void) => http.Server;
}>;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const proxyModule = require(path.join(
  __dirname, '..', 'runtime-probes', 'android-account-sqlcipher-recovery', 'entry-proxy.js',
)) as EntryProxyModule;

const VIRTUAL = '/.expo/.virtual-metro-entry.bundle';
const QUERY = 'platform=android&dev=true&minify=false&app=app.phraseman&modulesOnly=false&runModule=true';

describe('WAL probe entry proxy: URL rewrite', () => {
  test('rewrites the virtual Expo entry bundle to the probe entry and keeps every query parameter', () => {
    const rewritten = String(proxyModule.rewriteEntryUrl(`${VIRTUAL}?${QUERY}`));
    const url = new URL(rewritten, 'http://localhost');
    expect(url.pathname).toBe(proxyModule.PROBE_BUNDLE_PATH);
    expect(proxyModule.PROBE_BUNDLE_PATH).toBe('/runtime-probes/android-account-sqlcipher-recovery/index.bundle');
    for (const [key, value] of new URLSearchParams(QUERY)) expect(url.searchParams.get(key)).toBe(value);
    expect(url.searchParams.get('transform.engine')).toBe('hermes');
  });

  test('rewrites the virtual entry source map to the probe source map', () => {
    const rewritten = String(proxyModule.rewriteEntryUrl(`/.expo/.virtual-metro-entry.map?${QUERY}`));
    expect(new URL(rewritten, 'http://localhost').pathname)
      .toBe('/runtime-probes/android-account-sqlcipher-recovery/index.map');
  });

  test('keeps an explicit transform engine untouched', () => {
    const rewritten = String(proxyModule.rewriteEntryUrl(`${VIRTUAL}?${QUERY}&transform.engine=jsc`));
    expect(new URL(rewritten, 'http://localhost').searchParams.getAll('transform.engine')).toEqual(['jsc']);
  });

  test.each([
    '/status',
    '/index.bundle?platform=android',
    '/.expo/.virtual-metro-entry.bundle.extra?platform=android',
    '/x/.expo/.virtual-metro-entry.bundle?platform=android',
    '/symbolicate',
    '/',
  ])('passes a non-entry URL through unchanged: %s', (url) => {
    expect(proxyModule.rewriteEntryUrl(url)).toBe(url);
  });
});

function listen(server: http.Server | net.Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port));
  });
}

function close(server: http.Server | net.Server): Promise<void> {
  return new Promise((resolve) => { server.close(() => resolve()); });
}

function get(port: number, url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: url, headers: { host: 'localhost:8081' }, agent: false }, (response) => {
      let body = '';
      response.on('data', (chunk: Buffer) => { body += chunk.toString('utf8'); });
      response.on('end', () => resolve({ status: response.statusCode ?? 0, body }));
    }).on('error', reject);
  });
}

describe('WAL probe entry proxy: forwarding', () => {
  test('forwards rewritten and plain requests with the original Host header and logs each rewrite', async () => {
    const seen: string[] = [];
    const upstream = http.createServer((request, response) => {
      seen.push(`${request.url}|${request.headers.host}`);
      response.end(`ok:${request.url}`);
    });
    const upstreamPort = await listen(upstream);
    const logs: string[] = [];
    const proxy = proxyModule.createEntryProxy(upstreamPort, (line) => logs.push(line));
    const proxyPort = await listen(proxy);
    try {
      const entry = await get(proxyPort, `${VIRTUAL}?${QUERY}`);
      const status = await get(proxyPort, '/status');
      expect(entry.status).toBe(200);
      expect(entry.body.startsWith(`ok:${proxyModule.PROBE_BUNDLE_PATH}?`)).toBe(true);
      expect(status.body).toBe('ok:/status');
      expect(seen.map((line) => line.split('|')[1])).toEqual(['localhost:8081', 'localhost:8081']);
      expect(logs.filter((line) => line.startsWith('[WAL-ENTRY-PROXY] rewrite'))).toHaveLength(1);
    } finally {
      await close(proxy);
      await close(upstream);
    }
  });

  test('answers 502 with a fixed code when the upstream bundler is down', async () => {
    const probe = net.createServer();
    const deadPort = await listen(probe);
    await close(probe);
    const logs: string[] = [];
    const proxy = proxyModule.createEntryProxy(deadPort, (line) => logs.push(line));
    const proxyPort = await listen(proxy);
    try {
      const result = await get(proxyPort, '/status');
      expect(result.status).toBe(502);
      expect(result.body).toBe('entry_proxy_upstream_failed');
      expect(logs.some((line) => line.includes('upstream_failed'))).toBe(true);
    } finally {
      await close(proxy);
    }
  });

  test('passes a WebSocket upgrade through as raw bytes in both directions', async () => {
    const upstream = http.createServer();
    const upgraded: net.Socket[] = [];
    upstream.on('upgrade', (request: http.IncomingMessage, socket: net.Socket) => {
      upgraded.push(socket);
      socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');
      socket.write(`path:${request.url}`);
      socket.on('data', (chunk: Buffer) => socket.write(`echo:${chunk.toString('utf8')}`));
    });
    const upstreamPort = await listen(upstream);
    const proxy = proxyModule.createEntryProxy(upstreamPort, () => undefined);
    const proxyPort = await listen(proxy);
    const client = net.connect(proxyPort, '127.0.0.1');
    try {
      const received = await new Promise<string>((resolve, reject) => {
        let buffer = '';
        client.on('data', (chunk: Buffer) => {
          buffer += chunk.toString('utf8');
          if (buffer.includes('path:/hot') && !buffer.includes('echo:')) client.write('ping');
          if (buffer.includes('echo:ping')) resolve(buffer);
        });
        client.on('error', reject);
        client.write('GET /hot HTTP/1.1\r\nHost: localhost:8081\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');
      });
      expect(received).toContain('101 Switching Protocols');
      expect(received).toContain('echo:ping');
    } finally {
      client.destroy();
      for (const socket of upgraded) socket.destroy();
      proxy.closeAllConnections();
      upstream.closeAllConnections();
      await close(proxy);
      await close(upstream);
    }
  });
});
