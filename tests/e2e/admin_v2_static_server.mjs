import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const host = '127.0.0.1';
const port = Number(process.env.E2E_ADMIN_V2_PORT || 4173);
const adminV2Root = fileURLToPath(new URL('../../admin/v2/', import.meta.url));
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function resolveAdminV2File(requestUrl) {
  const pathname = new URL(requestUrl, `http://${host}`).pathname;
  if (pathname === '/v2' || pathname.startsWith('/v2/')) return null;
  const relativePath = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  const candidate = path.resolve(adminV2Root, relativePath);
  return path.relative(adminV2Root, candidate).startsWith('..') || path.isAbsolute(path.relative(adminV2Root, candidate)) ? null : candidate;
}

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method || '')) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }
  let filePath;
  try {
    filePath = resolveAdminV2File(request.url || '/');
  } catch {
    response.writeHead(400);
    response.end();
    return;
  }
  if (!filePath) {
    response.writeHead(404);
    response.end();
    return;
  }
  try {
    if (!(await stat(filePath)).isFile()) throw new Error('not_file');
    const type = contentTypes[path.extname(filePath)] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    if (request.method === 'GET') response.end(await readFile(filePath));
    else response.end();
  } catch {
    response.writeHead(404);
    response.end();
  }
});

server.listen(port, host);
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
