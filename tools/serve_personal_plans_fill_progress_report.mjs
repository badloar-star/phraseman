import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reportsDir = path.resolve(__dirname, '..', 'docs', 'reports');
const port = Number(process.argv[2] || process.env.PORT || 4317);

const allowedFiles = new Set([
  'personal-plans-fill-progress-report.html',
  'personal-plans-fill-progress-data.json',
]);

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
]);

function resolveRequestPath(url = '/') {
  const requestUrl = new URL(url, `http://localhost:${port}`);
  const requested = requestUrl.pathname === '/'
    ? 'personal-plans-fill-progress-report.html'
    : path.basename(requestUrl.pathname);

  if (!allowedFiles.has(requested)) {
    return null;
  }

  return path.join(reportsDir, requested);
}

const server = http.createServer(async (req, res) => {
  const filePath = resolveRequestPath(req.url);

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  try {
    const body = await fs.readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentTypes.get(path.extname(filePath)) || 'application/octet-stream',
    });
    res.end(body);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Report server error: ${error.message}`);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(
    `Personal Plans fill progress live report: http://localhost:${port}/personal-plans-fill-progress-report.html`,
  );
  console.log(
    `Live data: http://localhost:${port}/personal-plans-fill-progress-data.json`,
  );
});
