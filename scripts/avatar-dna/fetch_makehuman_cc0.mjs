import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifestPath = path.join(root, 'config/avatar-dna/human_v2_cc0_source.v1.json');

export const sourceCommit = '1f508f6083b2f823dab15de924b3bde72e08d77c';
export const baseUrl = `https://raw.githubusercontent.com/makehumancommunity/makehuman/${sourceCommit}/`;
export const vendorRoot = path.join(root, 'tools/avatar-dna/vendor/makehuman-v1.3.0');
export const DEFAULT_TIMEOUT_MS = 15_000;

function isSafeRelativePath(value) {
  return typeof value === 'string'
    && value.length > 0
    && !path.isAbsolute(value)
    && !/[\\%?#]/.test(value)
    && value.split('/').every(segment => (
      segment.length > 0
      && segment !== '.'
      && segment !== '..'
      && !segment.includes(':')
    ));
}

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function expectedSource(destination) {
  return destination === 'LICENSE.ASSETS.md' || destination === 'makehuman/data/3dobjs/base.obj'
    ? destination
    : `makehuman/data/targets/${destination}`;
}

function isValidFile(bytes, entry) {
  return bytes.length === entry.bytes && digest(bytes) === entry.sha256;
}

function isValidEntry(entry, destinations) {
  return entry !== null
    && typeof entry === 'object'
    && isSafeRelativePath(entry.source)
    && isSafeRelativePath(entry.destination)
    && Number.isSafeInteger(entry.bytes)
    && entry.bytes > 0
    && /^[a-f0-9]{64}$/.test(entry.sha256)
    && !destinations.has(entry.destination)
    && entry.source === expectedSource(entry.destination);
}

function isPinnedSourceUrl(source, pinnedBaseUrl) {
  const sourceUrl = new URL(source, pinnedBaseUrl);
  return sourceUrl.origin === pinnedBaseUrl.origin
    && sourceUrl.pathname.startsWith(pinnedBaseUrl.pathname)
    && !sourceUrl.search
    && !sourceUrl.hash
    && sourceUrl.href === `${baseUrl}${source}`;
}

export function validateManifest(manifest) {
  if (manifest?.sourceCommit !== sourceCommit
    || manifest.baseUrl !== baseUrl
    || manifest.license !== 'CC0-1.0'
    || !Array.isArray(manifest.files)
    || manifest.files.length !== 24) {
    throw new Error('Unexpected MakeHuman CC0 manifest identity');
  }

  const destinations = new Set();
  const pinnedBaseUrl = new URL(baseUrl);
  for (const entry of manifest.files) {
    if (!isValidEntry(entry, destinations)) {
      throw new Error(`Unsafe or invalid manifest entry: ${JSON.stringify(entry)}`);
    }
    if (!isPinnedSourceUrl(entry.source, pinnedBaseUrl)) {
      throw new Error(`Unsafe source URL: ${entry.source}`);
    }
    destinations.add(entry.destination);
  }
  return manifest;
}

async function streamVerifiedResponse(response, temporary, entry) {
  const contentLength = response.headers.get('content-length');
  const contentEncoding = response.headers.get('content-encoding');
  const identityEncoding = contentEncoding === null || contentEncoding.toLowerCase() === 'identity';
  if (identityEncoding && contentLength !== null
    && (!/^\d+$/.test(contentLength) || Number(contentLength) !== entry.bytes)) {
    throw new Error(`Content-Length mismatch: ${contentLength}`);
  }
  if (!response.body) throw new Error('Response body missing');

  const file = await open(temporary, 'wx');
  const checksum = createHash('sha256');
  let bytesWritten = 0;
  try {
    for await (const chunk of response.body) {
      const bytes = Buffer.from(chunk);
      bytesWritten += bytes.length;
      if (bytesWritten > entry.bytes) {
        throw new Error(`Response exceeds ${entry.bytes} bytes`);
      }
      checksum.update(bytes);
      await file.write(bytes);
    }
  } finally {
    await file.close();
  }

  if (bytesWritten !== entry.bytes || checksum.digest('hex') !== entry.sha256) {
    throw new Error('Downloaded bytes do not match manifest');
  }
  if ((await stat(temporary)).size !== entry.bytes) {
    throw new Error('Temporary bytes do not match manifest');
  }
}

function describeError(error) {
  return error instanceof Error ? error.message : String(error);
}

export async function downloadVerifiedFile({
  sourceUrl,
  destination,
  entry,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const temporary = path.join(
    path.dirname(destination),
    `.${path.basename(destination)}.${randomUUID()}.tmp`,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await mkdir(path.dirname(destination), { recursive: true });
    const response = await fetch(sourceUrl, { redirect: 'error', signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await streamVerifiedResponse(response, temporary, entry);
    await rename(temporary, destination);
  } catch (error) {
    try {
      await rm(temporary, { force: true });
    } catch {
      // Keep the download failure as the actionable error.
    }
    throw new Error(`Download failed for ${entry.source} -> ${entry.destination}: ${describeError(error)}`, {
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchManifest(manifest) {
  validateManifest(manifest);
  let verified = 0;
  let downloaded = 0;

  for (const entry of manifest.files) {
    const destination = path.resolve(vendorRoot, entry.destination);
    if (!destination.startsWith(`${vendorRoot}${path.sep}`)) {
      throw new Error(`Unsafe destination: ${entry.destination}`);
    }

    try {
      const existing = await readFile(destination);
      if (!isValidFile(existing, entry)) {
        throw new Error(`Existing file does not match manifest: ${entry.destination}`);
      }
      verified += 1;
      continue;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }

    await downloadVerifiedFile({
      sourceUrl: new URL(entry.source, baseUrl),
      destination,
      entry,
    });
    verified += 1;
    downloaded += 1;
  }

  return { verified, downloaded };
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const result = await fetchManifest(manifest);
  console.log(`verified=${result.verified} downloaded=${result.downloaded}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(describeError(error));
    process.exitCode = 1;
  });
}
