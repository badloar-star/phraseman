import crypto from 'node:crypto';
import { access, copyFile, lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = 'scripts/admin-v2-chart-assets.manifest.json';
const noticeDestination = 'admin/v2/vendor/THIRD_PARTY_NOTICES.txt';
const assets = [
  ['node_modules/chart.js/dist/chart.umd.js', 'admin/v2/vendor/chart.umd.js'],
  ['node_modules/chartjs-plugin-zoom/dist/chartjs-plugin-zoom.min.js', 'admin/v2/vendor/chartjs-plugin-zoom.min.js'],
  ['node_modules/hammerjs/hammer.min.js', 'admin/v2/vendor/hammer.min.js'],
];
const assetPackages = [
  { package: 'chart.js', version: '4.4.3' },
  { package: 'chartjs-plugin-zoom', version: '2.0.1' },
  { package: 'hammerjs', version: '2.0.8' },
];
const licenses = [
  { package: 'chart.js', version: '4.4.3', source: 'node_modules/chart.js/LICENSE.md' },
  { package: 'chartjs-plugin-zoom', version: '2.0.1', source: 'node_modules/chartjs-plugin-zoom/LICENSE.md' },
  { package: 'hammerjs', version: '2.0.8', source: 'node_modules/hammerjs/LICENSE.md' },
  { package: '@kurkle/color', version: '0.3.4', source: 'node_modules/@kurkle/color/LICENSE.md' },
];

let syncSequence = 0;

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function resolveFromRoot(root, relativePath) {
  const normalizedRoot = path.resolve(root);
  const resolved = path.resolve(normalizedRoot, relativePath);
  if (resolved !== normalizedRoot && !resolved.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new Error(`Path escapes sync root: ${relativePath}`);
  }
  return resolved;
}

function failManifest(reason) {
  throw new Error(`Chart asset manifest does not match pinned allowlist: ${reason}`);
}

function assertObjectKeys(value, expectedKeys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failManifest(`${label} must be an object`);
  }
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(sortedExpectedKeys)) {
    failManifest(`${label} has unexpected fields`);
  }
}

function assertDigest(value, label) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) {
    failManifest(`${label} must be a lowercase full SHA-256 digest`);
  }
}

function validateManifest(manifest) {
  assertObjectKeys(manifest, ['schemaVersion', 'assets', 'licenses', 'noticeDestination'], 'manifest');
  if (manifest.schemaVersion !== 1) failManifest('unsupported schemaVersion');
  if (manifest.noticeDestination !== noticeDestination) failManifest('notice destination is not allowlisted');
  if (!Array.isArray(manifest.assets) || manifest.assets.length !== assets.length) {
    failManifest('asset list length is not allowlisted');
  }
  if (!Array.isArray(manifest.licenses) || manifest.licenses.length !== licenses.length) {
    failManifest('license list length is not allowlisted');
  }

  for (let index = 0; index < assets.length; index += 1) {
    const entry = manifest.assets[index];
    const [source, destination] = assets[index];
    const identity = assetPackages[index];
    assertObjectKeys(entry, ['package', 'version', 'source', 'destination', 'sha256'], `assets[${index}]`);
    if (
      entry.package !== identity.package
      || entry.version !== identity.version
      || entry.source !== source
      || entry.destination !== destination
    ) {
      failManifest(`assets[${index}] is not allowlisted`);
    }
    assertDigest(entry.sha256, `assets[${index}].sha256`);
  }

  for (let index = 0; index < licenses.length; index += 1) {
    const entry = manifest.licenses[index];
    const expected = licenses[index];
    assertObjectKeys(entry, ['package', 'version', 'source', 'sha256'], `licenses[${index}]`);
    if (
      entry.package !== expected.package
      || entry.version !== expected.version
      || entry.source !== expected.source
    ) {
      failManifest(`licenses[${index}] is not allowlisted`);
    }
    assertDigest(entry.sha256, `licenses[${index}].sha256`);
  }

  return manifest;
}

async function readAndValidateManifest(root) {
  const absolutePath = resolveFromRoot(root, manifestPath);
  let source;
  try {
    source = await readFile(absolutePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`Missing chart asset manifest: ${manifestPath}`);
    }
    throw error;
  }

  try {
    return validateManifest(JSON.parse(source));
  } catch (error) {
    if (error instanceof SyntaxError) {
      failManifest('invalid JSON');
    }
    throw error;
  }
}

async function readVerifiedSource(root, entry, kind) {
  const source = entry.source;
  const absolutePath = resolveFromRoot(root, source);
  try {
    await access(absolutePath);
  } catch {
    throw new Error(`Missing vendor source: ${source}. Run npm install first.`);
  }

  const bytes = await readFile(absolutePath);
  const actualDigest = sha256(bytes);
  if (actualDigest !== entry.sha256) {
    throw new Error(
      `SHA-256 mismatch for ${source}: expected ${entry.sha256}, received ${actualDigest} (${kind})`,
    );
  }
  return { entry, absolutePath, bytes };
}

function normalizeLicense(value) {
  return value
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n+$/g, '');
}

function buildThirdPartyNotices(verifiedLicenses) {
  const sections = verifiedLicenses.map(({ entry, bytes }) => [
    '================================================================================',
    `${entry.package}@${entry.version}`,
    `License source: ${entry.source}`,
    '================================================================================',
    '',
    normalizeLicense(bytes.toString('utf8')),
  ].join('\n'));

  return [
    'Phraseman Admin v2 third-party notices',
    'Generated from pinned npm packages. Do not edit manually.',
    '',
    sections.join('\n\n'),
    '',
  ].join('\n');
}

async function verifyFileDigest(absolutePath, expectedDigest, relativePath) {
  const actualDigest = sha256(await readFile(absolutePath));
  if (actualDigest !== expectedDigest) {
    throw new Error(`SHA-256 mismatch for ${relativePath}: expected ${expectedDigest}, received ${actualDigest}`);
  }
}

async function lstatOrNull(absolutePath) {
  try {
    return await lstat(absolutePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function inspectExistingDestinations(outputs) {
  const stats = [];
  for (const output of outputs) {
    stats.push(await lstatOrNull(output.destination));
  }

  for (let index = 0; index < outputs.length; index += 1) {
    const output = outputs[index];
    const stat = stats[index];
    if (stat && !stat.isFile()) {
      throw new Error(
        `Unsafe existing vendor destination: ${output.relativeDestination}; expected a regular file or absence`,
      );
    }
  }

  for (let index = 0; index < outputs.length; index += 1) {
    const output = outputs[index];
    const stat = stats[index];
    output.originallyExisted = Boolean(stat);
    output.originalBytes = stat ? await readFile(output.destination) : null;
    output.originalDigest = output.originalBytes ? sha256(output.originalBytes) : null;
    output.published = false;
  }
}

const errorMessage = (error) => error instanceof Error ? error.message : String(error);

async function rollbackPublishedOutputs(outputs) {
  const rollbackErrors = [];
  for (const output of outputs) {
    try {
      if (output.originallyExisted) {
        await copyFile(output.backupPath, output.rollbackTempPath);
        const rollbackBytes = await readFile(output.rollbackTempPath);
        if (!rollbackBytes.equals(output.originalBytes)) {
          throw new Error(`backup bytes changed for ${output.relativeDestination}`);
        }
        await verifyFileDigest(
          output.rollbackTempPath,
          output.originalDigest,
          `${output.relativeDestination} rollback candidate`,
        );
        await rename(output.rollbackTempPath, output.destination);
        const restoredBytes = await readFile(output.destination);
        if (!restoredBytes.equals(output.originalBytes)) {
          throw new Error(`restored bytes differ for ${output.relativeDestination}`);
        }
      } else if (output.published) {
        await rm(output.destination, { force: true });
        if (await lstatOrNull(output.destination)) {
          throw new Error(`new destination still exists: ${output.relativeDestination}`);
        }
      }
    } catch (error) {
      rollbackErrors.push(new Error(
        `Rollback failed for ${output.relativeDestination}: ${errorMessage(error)}`,
        { cause: error },
      ));
    }
  }
  return rollbackErrors;
}

async function cleanupOutputArtifacts(outputs) {
  const cleanupErrors = [];
  for (const output of outputs) {
    for (const artifactPath of [output.tempPath, output.backupPath, output.rollbackTempPath]) {
      try {
        await rm(artifactPath, { force: true });
      } catch (error) {
        cleanupErrors.push(new Error(
          `Cleanup failed for ${path.basename(artifactPath)}: ${errorMessage(error)}`,
          { cause: error },
        ));
      }
    }
  }
  return cleanupErrors;
}

function validateTestOnlyHooks(testOnlyHooks) {
  if (testOnlyHooks === undefined) return {};
  if (!testOnlyHooks || typeof testOnlyHooks !== 'object' || Array.isArray(testOnlyHooks)) {
    throw new TypeError('testOnlyHooks must be an object when provided');
  }
  const keys = Object.keys(testOnlyHooks);
  if (keys.some((key) => key !== 'beforePublishRename')) {
    throw new TypeError('testOnlyHooks contains an unsupported hook');
  }
  if (
    testOnlyHooks.beforePublishRename !== undefined
    && typeof testOnlyHooks.beforePublishRename !== 'function'
  ) {
    throw new TypeError('testOnlyHooks.beforePublishRename must be a function');
  }
  return testOnlyHooks;
}

export async function syncAdminV2ChartAssets(explicitRoot, testOnlyHooksInput) {
  if (typeof explicitRoot !== 'string' || explicitRoot.length === 0) {
    throw new TypeError('syncAdminV2ChartAssets requires an explicit root path');
  }
  const testOnlyHooks = validateTestOnlyHooks(testOnlyHooksInput);
  const root = path.resolve(explicitRoot);
  const manifest = await readAndValidateManifest(root);

  const verifiedAssets = [];
  const verifiedLicenses = [];
  for (const entry of manifest.assets) {
    verifiedAssets.push(await readVerifiedSource(root, entry, 'asset'));
  }
  for (const entry of manifest.licenses) {
    verifiedLicenses.push(await readVerifiedSource(root, entry, 'license'));
  }

  const notices = buildThirdPartyNotices(verifiedLicenses);
  const noticesBytes = Buffer.from(notices, 'utf8');
  const noticesDigest = sha256(noticesBytes);
  const vendorDirectory = resolveFromRoot(root, 'admin/v2/vendor');

  syncSequence += 1;
  const artifactSuffix = `${process.pid}-${syncSequence}`;
  const pendingOutputs = [
    ...verifiedAssets.map(({ entry, absolutePath }) => ({
      source: absolutePath,
      destination: resolveFromRoot(root, entry.destination),
      relativeDestination: entry.destination,
      expectedDigest: entry.sha256,
      bytes: null,
    })),
    {
      source: null,
      destination: resolveFromRoot(root, manifest.noticeDestination),
      relativeDestination: manifest.noticeDestination,
      expectedDigest: noticesDigest,
      bytes: noticesBytes,
    },
  ].map((output) => ({
    ...output,
    tempPath: path.join(path.dirname(output.destination), `.${path.basename(output.destination)}.tmp-${artifactSuffix}`),
    backupPath: path.join(path.dirname(output.destination), `.${path.basename(output.destination)}.backup-${artifactSuffix}`),
    rollbackTempPath: path.join(path.dirname(output.destination), `.${path.basename(output.destination)}.rollback-${artifactSuffix}`),
  }));

  const vendorDirectoryStat = await lstatOrNull(vendorDirectory);
  if (vendorDirectoryStat && !vendorDirectoryStat.isDirectory()) {
    throw new Error('Unsafe Admin v2 vendor directory; expected a directory or absence');
  }
  await inspectExistingDestinations(pendingOutputs);
  await mkdir(vendorDirectory, { recursive: true });

  let operationError = null;
  try {
    for (const output of pendingOutputs) {
      if (output.source) {
        await copyFile(output.source, output.tempPath);
      } else {
        await writeFile(output.tempPath, output.bytes);
      }
      await verifyFileDigest(output.tempPath, output.expectedDigest, output.relativeDestination);
    }

    for (const output of pendingOutputs) {
      if (!output.originallyExisted) continue;
      await copyFile(output.destination, output.backupPath);
      const backupBytes = await readFile(output.backupPath);
      if (!backupBytes.equals(output.originalBytes)) {
        throw new Error(`Backup bytes differ for ${output.relativeDestination}`);
      }
      await verifyFileDigest(output.backupPath, output.originalDigest, `${output.relativeDestination} backup`);
    }

    try {
      for (let index = 0; index < pendingOutputs.length; index += 1) {
        const output = pendingOutputs[index];
        await testOnlyHooks.beforePublishRename?.({
          index,
          relativeDestination: output.relativeDestination,
        });
        await rename(output.tempPath, output.destination);
        output.published = true;
      }

      for (const output of pendingOutputs) {
        await verifyFileDigest(output.destination, output.expectedDigest, output.relativeDestination);
      }
    } catch (publishError) {
      const rollbackErrors = await rollbackPublishedOutputs(pendingOutputs);
      if (rollbackErrors.length > 0) {
        throw new AggregateError(
          [publishError, ...rollbackErrors],
          `Chart vendor publish failed: ${errorMessage(publishError)}; rollback also failed: ${rollbackErrors.map(errorMessage).join('; ')}`,
        );
      }
      throw publishError;
    }
  } catch (error) {
    operationError = error;
  }

  const cleanupErrors = await cleanupOutputArtifacts(pendingOutputs);
  if (operationError) {
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [operationError, ...cleanupErrors],
        `Chart vendor sync failed: ${errorMessage(operationError)}; cleanup also failed: ${cleanupErrors.map(errorMessage).join('; ')}`,
      );
    }
    throw operationError;
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, `Chart vendor cleanup failed: ${cleanupErrors.map(errorMessage).join('; ')}`);
  }

  return {
    assetCount: manifest.assets.length,
    noticeDestination: manifest.noticeDestination,
  };
}

const entryPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (entryPath === import.meta.url) {
  syncAdminV2ChartAssets(repoRoot)
    .then(({ assetCount }) => console.log(`Synced ${assetCount} Admin v2 chart assets and notices.`))
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[admin:v2:sync-chart-assets] ${message}`);
      process.exitCode = 1;
    });
}
