import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifestPath = path.join(repositoryRoot, 'config/avatar-dna/human_v2_cc0_source.v1.json');
const vendorRoot = path.join(repositoryRoot, 'tools/avatar-dna/vendor/makehuman-v1.3.0');
const sourceCommit = '1f508f6083b2f823dab15de924b3bde72e08d77c';
const baseUrl = `https://raw.githubusercontent.com/makehumancommunity/makehuman/${sourceCommit}/`;

const isSafeRelativePath = (value) => typeof value === 'string'
  && value.length > 0
  && !path.isAbsolute(value)
  && !value.includes('\\')
  && !value.includes('?')
  && !value.includes('#')
  && value.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const validFile = (bytes, entry) => bytes.length === entry.bytes && digest(bytes) === entry.sha256;
const expectedSource = (destination) => (
  destination === 'LICENSE.ASSETS.md' || destination === 'makehuman/data/3dobjs/base.obj'
    ? destination
    : `makehuman/data/targets/${destination}`
);

const readExisting = async (destination) => {
  try {
    return await readFile(destination);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
};

const main = async () => {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.sourceCommit !== sourceCommit || manifest.baseUrl !== baseUrl || manifest.license !== 'CC0-1.0') {
    throw new Error('Unexpected MakeHuman CC0 manifest identity');
  }
  if (!Array.isArray(manifest.files) || manifest.files.length !== 24) {
    throw new Error('Expected exactly 24 MakeHuman CC0 files');
  }

  const destinations = new Set();
  const pinnedBaseUrl = new URL(baseUrl);
  let verified = 0;
  let downloaded = 0;
  for (const entry of manifest.files) {
    if (!isSafeRelativePath(entry.source) || !isSafeRelativePath(entry.destination)
      || !Number.isSafeInteger(entry.bytes) || entry.bytes <= 0 || !/^[a-f0-9]{64}$/.test(entry.sha256)
      || destinations.has(entry.destination) || entry.source !== expectedSource(entry.destination)) {
      throw new Error(`Unsafe or invalid manifest entry: ${JSON.stringify(entry)}`);
    }
    const sourceUrl = new URL(entry.source, pinnedBaseUrl);
    if (sourceUrl.origin !== pinnedBaseUrl.origin
      || !sourceUrl.pathname.startsWith(pinnedBaseUrl.pathname)
      || sourceUrl.search || sourceUrl.hash || sourceUrl.href !== `${baseUrl}${entry.source}`) {
      throw new Error(`Unsafe source URL: ${entry.source}`);
    }
    destinations.add(entry.destination);

    const destination = path.resolve(vendorRoot, entry.destination);
    if (!destination.startsWith(`${vendorRoot}${path.sep}`)) throw new Error(`Unsafe destination: ${entry.destination}`);
    const existing = await readExisting(destination);
    if (existing !== null) {
      if (!validFile(existing, entry)) throw new Error(`Existing file does not match manifest: ${entry.destination}`);
      verified += 1;
      continue;
    }

    await mkdir(path.dirname(destination), { recursive: true });
    const temporary = path.join(path.dirname(destination), `.${path.basename(destination)}.${randomUUID()}.tmp`);
    try {
      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error(`Download failed for ${entry.source}: HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!validFile(bytes, entry)) throw new Error(`Downloaded file does not match manifest: ${entry.source}`);
      await writeFile(temporary, bytes, { flag: 'wx' });
      const temporaryStats = await stat(temporary);
      const written = await readFile(temporary);
      if (temporaryStats.size !== entry.bytes || !validFile(written, entry)) {
        throw new Error(`Temporary file does not match manifest: ${entry.destination}`);
      }
      await rename(temporary, destination);
      verified += 1;
      downloaded += 1;
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
  }
  console.log(`verified=${verified} downloaded=${downloaded}`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
