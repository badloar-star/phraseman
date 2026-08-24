#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const SOURCE_SPEC = 'docs/superpowers/specs/2026-08-24-phraseman-100-diverse-avatars-design.md';
const HOUSES_PATH = path.join(ROOT, 'content', 'avatar-100', 'houses.json');
const PILOT_ASSET_INDEXES = [63, 74, 87, 100, 108, 120, 129, 137, 147, 157];
const SUBJECT_TYPES = {
  C: 'creature',
  A: 'artifact',
  M: 'mask',
  X: 'abstract',
};

function parseOutPath(args) {
  if (args.length !== 2 || args[0] !== '--out' || !args[1]) {
    throw new Error('Usage: node scripts/avatar-100/build-manifest.mjs --out <path>');
  }
  return path.resolve(ROOT, args[1]);
}

function countBy(entries, key) {
  return entries.reduce((counts, entry) => {
    const value = entry[key];
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

export function buildManifest(specSource, houses) {
  const rowPattern = /^\| (\d+) \| ([PCAMX]) \| ([^|]+) \| ([^|]+) \|$/gm;
  const entries = [...specSource.matchAll(rowPattern)].map((match) => {
    const assetIndex = Number(match[1]);
    const subjectCode = match[2];
    const subjectType = SUBJECT_TYPES[subjectCode];
    if (!subjectType) throw new Error(`Forbidden avatar subject code ${subjectCode} at ${assetIndex}`);
    const houseId = Math.floor((assetIndex - 63) / 10) + 1;
    const house = houses[String(houseId)];
    if (!house) throw new Error(`Missing house configuration for house ${houseId}`);
    return {
      assetIndex,
      avatarId: `custom-gen-${assetIndex}`,
      houseId,
      subjectType,
      nameRu: match[3].trim(),
      visualMetaphor: match[4].trim(),
      house,
    };
  });

  const expectedIndexes = Array.from({ length: 100 }, (_, index) => index + 63);
  const actualIndexes = entries.map((entry) => entry.assetIndex);
  if (entries.length !== 100 || JSON.stringify(actualIndexes) !== JSON.stringify(expectedIndexes)) {
    throw new Error(`Expected exact avatar indexes 63-162; got ${actualIndexes.join(',')}`);
  }

  const names = entries.map((entry) => entry.nameRu);
  if (new Set(names).size !== names.length) throw new Error('Avatar archetype names must be unique');

  const houseCounts = countBy(entries, 'houseId');
  const expectedHouseSubjectCounts = { creature: 3, artifact: 3, mask: 2, abstract: 2 };
  for (let houseId = 1; houseId <= 10; houseId += 1) {
    if (houseCounts[houseId] !== 10) {
      throw new Error(`House ${houseId} must contain 10 entries; got ${houseCounts[houseId] ?? 0}`);
    }
    const actual = countBy(entries.filter((entry) => entry.houseId === houseId), 'subjectType');
    if (Object.entries(expectedHouseSubjectCounts).some(([type, count]) => actual[type] !== count)) {
      throw new Error(`Unexpected subject balance in house ${houseId}: ${JSON.stringify(actual)}`);
    }
  }

  const subjectCounts = countBy(entries, 'subjectType');
  const expectedSubjectCounts = { creature: 30, artifact: 30, mask: 20, abstract: 20 };
  if (Object.entries(expectedSubjectCounts).some(([type, count]) => subjectCounts[type] !== count)) {
    throw new Error(`Unexpected subject balance: ${JSON.stringify(subjectCounts)}`);
  }

  return {
    version: 1,
    sourceSpec: SOURCE_SPEC,
    pilotAssetIndexes: PILOT_ASSET_INDEXES,
    entries,
  };
}

function main() {
  const outputPath = parseOutPath(process.argv.slice(2));
  const specSource = fs.readFileSync(path.join(ROOT, SOURCE_SPEC), 'utf8');
  const houses = JSON.parse(fs.readFileSync(HOUSES_PATH, 'utf8'));
  const manifest = buildManifest(specSource, houses);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`avatar-100 manifest: ${manifest.entries.length} entries -> ${outputPath}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
