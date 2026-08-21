import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'config/avatar-dna/human_v2_cc0_source.v1.json');
const fetcherUrl = pathToFileURL(path.join(root, 'scripts/avatar-dna/fetch_makehuman_cc0.mjs'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const expectedFiles = [
  { source: 'LICENSE.ASSETS.md', destination: 'LICENSE.ASSETS.md', bytes: 6962, sha256: 'f6089cba01cb570a24712b41ab8a586ccd3cc5ef53dc266ca50b95c288956d2c' },
  { source: 'makehuman/data/3dobjs/base.obj', destination: 'makehuman/data/3dobjs/base.obj', bytes: 1749303, sha256: '8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c' },
  { source: 'makehuman/data/targets/head/head-scale-horiz-decr.target', destination: 'head/head-scale-horiz-decr.target', bytes: 81690, sha256: 'cadb55b340cb94e96131860beb68b2e46204fccc7ee8f963f66cc9d22b03af0c' },
  { source: 'makehuman/data/targets/head/head-scale-horiz-incr.target', destination: 'head/head-scale-horiz-incr.target', bytes: 83156, sha256: '31830f645c194c9451cb5f59cffb8e1d2a1c8fb215afb0c2ab36028b2c24570d' },
  { source: 'makehuman/data/targets/chin/chin-width-decr.target', destination: 'chin/chin-width-decr.target', bytes: 2853, sha256: 'ac081bd1652c203fc8973f20988a868a423a49f1fe6449cb974727fd46c26af1' },
  { source: 'makehuman/data/targets/chin/chin-width-incr.target', destination: 'chin/chin-width-incr.target', bytes: 3706, sha256: 'deef506bfe1883d9d4c38667332c9970785226566efbae4724fd3d60c02efcf4' },
  { source: 'makehuman/data/targets/nose/nose-scale-horiz-decr.target', destination: 'nose/nose-scale-horiz-decr.target', bytes: 5074, sha256: '1227e6f513d202585e40045fe4234778597bb591ac492e7f9313347cd9a9f2ec' },
  { source: 'makehuman/data/targets/nose/nose-scale-horiz-incr.target', destination: 'nose/nose-scale-horiz-incr.target', bytes: 7568, sha256: 'cc319e3ddb0523fa2b563dcfc840cf2f915a890abe5612009a0becebecd3c5ae' },
  { source: 'makehuman/data/targets/nose/nose-scale-depth-decr.target', destination: 'nose/nose-scale-depth-decr.target', bytes: 5811, sha256: 'b46c35046c9c451b7ffe77acc0573bd945d7c6acaefe43d8c21912d4ce1a6e4c' },
  { source: 'makehuman/data/targets/nose/nose-scale-depth-incr.target', destination: 'nose/nose-scale-depth-incr.target', bytes: 5762, sha256: '6bb03c3065e048d6e9abbcfa58961bfbe1753a307be0d3de477cac6aeaf5f750' },
  { source: 'makehuman/data/targets/eyes/l-eye-scale-decr.target', destination: 'eyes/l-eye-scale-decr.target', bytes: 12544, sha256: 'a66719f1a42badd955fb0c725ac453969d7fda05cc6e4f4770d388b076703dc7' },
  { source: 'makehuman/data/targets/eyes/l-eye-scale-incr.target', destination: 'eyes/l-eye-scale-incr.target', bytes: 13397, sha256: 'f35550dc3170ca1c0aacae0b598ca139e4f1f913f2ccea146ec6ea5b4e050dbb' },
  { source: 'makehuman/data/targets/eyes/r-eye-scale-decr.target', destination: 'eyes/r-eye-scale-decr.target', bytes: 12118, sha256: 'f43ba41146723a192c755330aa8baa77b638bc28f3736c448e5ce72e8a588f32' },
  { source: 'makehuman/data/targets/eyes/r-eye-scale-incr.target', destination: 'eyes/r-eye-scale-incr.target', bytes: 12192, sha256: 'e1f4cb48575b60a46589635b99a8b87587ba82d7524a8ac1445ace0ba002e918' },
  { source: 'makehuman/data/targets/eyes/l-eye-trans-in.target', destination: 'eyes/l-eye-trans-in.target', bytes: 11686, sha256: 'a92495e3f6cda144b3c37cc07734ee2735934d263e8c20e4b5763b21650ce26b' },
  { source: 'makehuman/data/targets/eyes/l-eye-trans-out.target', destination: 'eyes/l-eye-trans-out.target', bytes: 12444, sha256: 'ca961a4637517aeb689fa351e9d36abb3c04108a2870b26220f3c8cda027bdee' },
  { source: 'makehuman/data/targets/eyes/r-eye-trans-in.target', destination: 'eyes/r-eye-trans-in.target', bytes: 10176, sha256: '4c494f3503b219b07782ebf78132da81f2b5711232825cf261dcd1ca57add3d6' },
  { source: 'makehuman/data/targets/eyes/r-eye-trans-out.target', destination: 'eyes/r-eye-trans-out.target', bytes: 12783, sha256: '02143e686611f18d36915ee70082234e37db3d38a791cb8e1a46c0c56c4be43c' },
  { source: 'makehuman/data/targets/mouth/mouth-scale-horiz-decr.target', destination: 'mouth/mouth-scale-horiz-decr.target', bytes: 12644, sha256: '07a9ef160755467a470bd0a1df035143d83ebddbc12e4612e69e93a64644405c' },
  { source: 'makehuman/data/targets/mouth/mouth-scale-horiz-incr.target', destination: 'mouth/mouth-scale-horiz-incr.target', bytes: 15657, sha256: 'ccfc39cca249883ebc46af6f2c96c4130df13a67ebce30a2550af17a48637770' },
  { source: 'makehuman/data/targets/mouth/mouth-upperlip-volume-decr.target', destination: 'mouth/mouth-upperlip-volume-decr.target', bytes: 2649, sha256: '20b285d94ecb62cf605907d65659ab11ff760dbb938ba9ae7fc13429b1e3ba16' },
  { source: 'makehuman/data/targets/mouth/mouth-upperlip-volume-incr.target', destination: 'mouth/mouth-upperlip-volume-incr.target', bytes: 3600, sha256: 'b124cbd9b9be318264f61a143da603b42e0357ed92b4b6afd1b31a83daaf8568' },
  { source: 'makehuman/data/targets/mouth/mouth-lowerlip-volume-decr.target', destination: 'mouth/mouth-lowerlip-volume-decr.target', bytes: 1828, sha256: '45f1fe355546cdaa86581512810ee1cd2c6971ac67ffb46d3391ac438e539d15' },
  { source: 'makehuman/data/targets/mouth/mouth-lowerlip-volume-incr.target', destination: 'mouth/mouth-lowerlip-volume-incr.target', bytes: 3585, sha256: 'dbdaf045b00c67bf8672d53bc8cf94eb3e3dea316de6fe18a278f7080564c65d' },
];
const sha = (bytes: Buffer) => crypto.createHash('sha256').update(bytes).digest('hex');

function invoke(code: string, payload: unknown): Promise<{ status: number | null; stderr: string }> {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['--input-type=module', '--eval', code], {
      cwd: root,
      env: { ...process.env, PAYLOAD: JSON.stringify(payload) },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 20_000,
      windowsHide: true,
    });
    let stderr = '';
    let settled = false;
    const finish = (status: number | null) => {
      if (!settled) { settled = true; resolve({ status, stderr }); }
    };
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.once('error', () => finish(1));
    child.once('close', status => finish(status));
  });
}

const validate = (value: unknown) => invoke(
  `import { validateManifest } from ${JSON.stringify(fetcherUrl.href)}; validateManifest(JSON.parse(process.env.PAYLOAD));`, value,
);

test('locks the exact complete MakeHuman packet and its vendored bytes', async () => {
  expect(manifest.sourceCommit).toBe('1f508f6083b2f823dab15de924b3bde72e08d77c');
  expect(manifest.license).toBe('CC0-1.0');
  expect(manifest.files).toEqual(expectedFiles);
  for (const entry of expectedFiles) {
    const bytes = fs.readFileSync(path.join(root, 'tools/avatar-dna/vendor/makehuman-v1.3.0', entry.destination));
    expect(bytes.length).toBe(entry.bytes);
    expect(sha(bytes)).toBe(entry.sha256);
  }
  expect(await validate(manifest)).toMatchObject({ status: 0, stderr: '' });
}, 60_000);

test('marks every pinned MakeHuman source file as binary', () => {
  const vendorPrefix = 'tools/avatar-dna/vendor/makehuman-v1.3.0/';
  const result = spawnSync('git', ['check-attr', '-z', 'binary', 'text', '--stdin'], {
    cwd: root,
    encoding: 'utf8',
    input: `${expectedFiles.map(entry => `${vendorPrefix}${entry.destination}`).join('\0')}\0`,
  });

  expect(result.status).toBe(0);
  const attributes = result.stdout.split('\0').filter(Boolean);
  expect(attributes).toHaveLength(expectedFiles.length * 6);
  for (let index = 0; index < attributes.length; index += 6) {
    expect(attributes[index + 1]).toBe('binary');
    expect(attributes[index + 2]).toBe('set');
    expect(attributes[index + 4]).toBe('text');
    expect(attributes[index + 5]).toBe('unset');
  }
});

test('production validator rejects path, URL, and mapping bypasses', async () => {
  for (const source of ['/absolute.target', 'https://example.test/x', 'http:127.0.0.1/x', 'head\\x.target', '../x.target', 'head/../x.target', 'head/%2e%2e/x.target', 'head/%2E%2E/x.target', 'head/x.target?query', 'head/x.target#fragment']) {
    const copy = structuredClone(manifest);
    copy.files[2].source = source;
    expect((await validate(copy)).status).toBe(1);
  }
  const wrongMapping = structuredClone(manifest);
  wrongMapping.files[2].source = 'makehuman/data/targets/head/other.target';
  expect((await validate(wrongMapping)).status).toBe(1);

  const nullEntry = structuredClone(manifest);
  nullEntry.files[2] = null;
  const result = await validate(nullEntry);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('Unsafe or invalid manifest entry');
}, 60_000);

test('production downloader accepts only exact bytes and rejects unsafe responses', async () => {
  const compressedOk = gzipSync(Buffer.from('abc'));
  const server = http.createServer((request, response) => {
    switch (request.url) {
      case '/redirect': response.writeHead(302, { location: '/ok' }); response.end(); return;
      case '/oversize': response.writeHead(200); response.write('abc'); response.end('d'); return;
      case '/slow': setTimeout(() => response.end('abc'), 100); return;
      case '/bad': response.writeHead(500); response.end(); return;
      case '/wrong-length': response.writeHead(200, { 'content-length': '4' }); response.end('abcd'); return;
      case '/wrong-hash': response.writeHead(200, { 'content-length': '3' }); response.end('abd'); return;
      case '/undersize': response.writeHead(200); response.end('ab'); return;
      case '/gzip':
        response.writeHead(200, {
          'content-encoding': 'gzip',
          'content-length': String(compressedOk.length),
        });
        response.end(compressedOk);
        return;
      default: response.writeHead(200, { 'content-length': '3' }); response.end('abc');
    }
  });
  await new Promise<void>(resolve => server.listen(0, resolve));
  const port = (server.address() as { port: number }).port;
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'makehuman-test-'));
  const entry = { source: 'test', destination: 'test', bytes: 3, sha256: sha(Buffer.from('abc')) };
  const run = (route: string, timeoutMs = 1_000) => invoke(
    `import { downloadVerifiedFile } from ${JSON.stringify(fetcherUrl.href)}; await downloadVerifiedFile(JSON.parse(process.env.PAYLOAD));`,
    { sourceUrl: `http://127.0.0.1:${port}${route}`, destination: path.join(directory, `${route.slice(1)}.bin`), entry, timeoutMs },
  );
  try {
    for (const [route, timeoutMs] of [
      ['/redirect', 1_000],
      ['/oversize', 1_000],
      ['/bad', 1_000],
      ['/wrong-length', 1_000],
      ['/wrong-hash', 1_000],
      ['/undersize', 1_000],
      ['/slow', 10],
    ] as const) {
      expect((await run(route, timeoutMs)).status).toBe(1);
      expect(fs.existsSync(path.join(directory, `${route.slice(1)}.bin`))).toBe(false);
      expect(fs.readdirSync(directory).filter(name => name.startsWith('.'))).toEqual([]);
    }
    expect(await run('/ok')).toMatchObject({ status: 0, stderr: '' });
    expect(await run('/gzip')).toMatchObject({ status: 0, stderr: '' });
    expect(await fsp.readFile(path.join(directory, 'ok.bin'), 'utf8')).toBe('abc');
    expect(await fsp.readFile(path.join(directory, 'gzip.bin'), 'utf8')).toBe('abc');
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await fsp.rm(directory, { recursive: true, force: true });
  }
}, 60_000);
