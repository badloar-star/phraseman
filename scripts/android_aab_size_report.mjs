#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AUDIO_EXTENSIONS = new Set(['.aac', '.m4a', '.mp3', '.ogg', '.wav']);
const IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);
const FONT_EXTENSIONS = new Set(['.otf', '.ttf', '.woff', '.woff2']);
const DATA_EXTENSIONS = new Set(['.binarypb', '.db', '.dpk', '.json', '.sqlite']);
const EXPO_ASSET_NAMES = new Set([
  'base/assets/app.config',
  'base/assets/app.manifest',
  'base/assets/expo-root.pem',
]);

function categoryFor(name) {
  const extension = path.posix.extname(name).toLowerCase();
  if (name === 'base/assets/index.android.bundle') return 'JS/Hermes bytecode';
  if (name.startsWith('base/dex/')) return 'DEX bytecode';
  for (const abi of ['arm64-v8a', 'x86_64', 'armeabi-v7a', 'x86']) {
    if (name.startsWith(`base/lib/${abi}/`)) return `Native libraries: ${abi}`;
  }
  const isBundledResource = name.startsWith('base/res/') || name.startsWith('base/assets/');
  if (isBundledResource && AUDIO_EXTENSIONS.has(extension)) return 'Audio resources';
  if (isBundledResource && IMAGE_EXTENSIONS.has(extension)) return 'Image/icon resources';
  if (isBundledResource && FONT_EXTENSIONS.has(extension)) return 'Font resources';
  if (isBundledResource && DATA_EXTENSIONS.has(extension)) return 'Bundled data resources';
  if (name.startsWith('base/res/')) return 'Other compiled Android resources';
  if (name === 'base/resources.pb') return 'Android resource table';
  if (name.startsWith('base/manifest/')) return 'Android manifest';
  if (name.startsWith('base/root/')) return 'JVM/root resources';
  if (EXPO_ASSET_NAMES.has(name)) return 'Expo Updates config/manifest/certificate';
  if (name.startsWith('base/assets/')) return 'Other bundled assets';
  if (name === 'base/assets.pb' || name === 'base/native.pb') return 'Bundle module descriptors';
  if (name.startsWith('BUNDLE-METADATA/com.android.tools.build.debugsymbols/')) {
    return 'Bundle metadata: native debug symbols';
  }
  if (name === 'BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map') {
    return 'Bundle metadata: R8 mapping';
  }
  if (name.startsWith('BUNDLE-METADATA/com.android.tools.build.profiles/')) {
    return 'Bundle metadata: baseline profiles';
  }
  if (name.startsWith('BUNDLE-METADATA/com.android.tools.build.libraries/')) {
    return 'Bundle metadata: dependency manifest';
  }
  if (name.startsWith('BUNDLE-METADATA/')) return 'Bundle metadata: build tool metadata';
  if (name.startsWith('META-INF/')) return 'AAB signing metadata';
  if (name === 'BundleConfig.pb') return 'AAB bundle config';
  return 'Other';
}

function findEndOfCentralDirectory(buffer) {
  const minimumOffset = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error('invalid AAB/ZIP: end-of-central-directory record not found');
}

function readEntries(buffer) {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  if (entryCount === 0xffff || centralDirectoryOffset === 0xffffffff) {
    throw new Error('ZIP64 AABs are not supported by this report');
  }

  const entries = [];
  let offset = centralDirectoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`invalid AAB/ZIP: central-directory entry ${index} is malformed`);
    }
    const compressedBytes = buffer.readUInt32LE(offset + 20);
    const rawBytes = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    entries.push({ name, compressedBytes, rawBytes, category: categoryFor(name) });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

export function auditAab(aabPath) {
  const buffer = fs.readFileSync(aabPath);
  const entries = readEntries(buffer);
  const byCategory = new Map();
  let entriesCompressedBytes = 0;
  let entriesRawBytes = 0;

  for (const entry of entries) {
    entriesCompressedBytes += entry.compressedBytes;
    entriesRawBytes += entry.rawBytes;
    const category = byCategory.get(entry.category) ?? {
      category: entry.category,
      files: 0,
      compressedBytes: 0,
      rawBytes: 0,
    };
    category.files += 1;
    category.compressedBytes += entry.compressedBytes;
    category.rawBytes += entry.rawBytes;
    byCategory.set(entry.category, category);
  }

  return {
    fileBytes: buffer.length,
    entriesCompressedBytes,
    entriesRawBytes,
    structuralOverheadBytes: buffer.length - entriesCompressedBytes,
    entryCount: entries.length,
    categories: [...byCategory.values()].sort((left, right) => (
      right.compressedBytes - left.compressedBytes
    )),
    topEntries: [...entries]
      .sort((left, right) => right.compressedBytes - left.compressedBytes)
      .slice(0, 20),
  };
}

function parseArguments(argv) {
  const aabPath = argv.find((argument) => !argument.startsWith('--'));
  if (!aabPath) {
    console.error('Usage: node scripts/android_aab_size_report.mjs <artifact.aab>');
    process.exit(2);
  }
  return { aabPath };
}

export function printAudit(audit) {
  console.log(`AAB: ${audit.fileBytes} bytes (${(audit.fileBytes / 1_000_000).toFixed(6)} MB)`);
  console.log(`ZIP entries: ${audit.entriesCompressedBytes} bytes; structural overhead: ${audit.structuralOverheadBytes} bytes`);
  console.log('');
  console.log('Compressed bytes\tRaw bytes\tFiles\tCategory');
  for (const row of audit.categories) {
    console.log(`${row.compressedBytes}\t${row.rawBytes}\t${row.files}\t${row.category}`);
  }
  console.log('');
  console.log('Top 20 files by compressed bytes');
  for (const entry of audit.topEntries) {
    console.log(`${entry.compressedBytes}\t${entry.rawBytes}\t${entry.name}`);
  }
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const { aabPath } = parseArguments(process.argv.slice(2));
  const audit = auditAab(aabPath);
  printAudit(audit);
}
