#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_SOURCES = ['.firebaserc', 'firebase.json', 'app.json', 'eas.json'];
const REQUIRED_FIELDS = [
  'id',
  'name',
  'type',
  'owner',
  'dataClasses',
  'criticality',
  'recoveryTier',
  'trustBoundary',
  'manifest',
];
const CRITICALITIES = new Set(['tier-0', 'tier-1', 'tier-2', 'tier-3']);
const RECOVERY_TIERS = new Set(['R0', 'R1', 'R2', 'R3', 'unapproved']);
const ORIGIN_RE = /https?:\/\/(?:\*\.)?[A-Za-z0-9.-]+(?::\d+)?/g;

function parseArgs(argv) {
  const index = argv.indexOf('--root');
  return index >= 0 && argv[index + 1] ? path.resolve(argv[index + 1]) : process.cwd();
}

function readJson(root, relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}

function unique(values) {
  return [...new Set(values)];
}

function discover(root) {
  const firebaserc = readJson(root, '.firebaserc');
  const firebase = readJson(root, 'firebase.json');
  const project = firebaserc?.projects?.default;
  const targetMap = firebaserc?.targets?.[project]?.hosting || {};
  const hosting = (Array.isArray(firebase.hosting) ? firebase.hosting : [firebase.hosting])
    .filter(Boolean)
    .map((entry) => ({
      target: String(entry.target || ''),
      public: String(entry.public || ''),
      sites: Array.isArray(targetMap[entry.target]) ? targetMap[entry.target].map(String) : [],
    }));
  const functions = (Array.isArray(firebase.functions) ? firebase.functions : [firebase.functions])
    .filter(Boolean)
    .map((entry) => ({
      codebase: String(entry.codebase || 'default'),
      source: String(entry.source || 'functions'),
      runtime: String(entry.runtime || ''),
    }));
  const origins = unique(REQUIRED_SOURCES.flatMap((relative) => {
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    return source.match(ORIGIN_RE) || [];
  })).sort();
  return { hosting, functions, origins };
}

function listedOrigins(service) {
  const manifest = service?.manifest || {};
  return unique([
    ...(typeof manifest.origin === 'string' ? [manifest.origin] : []),
    ...(Array.isArray(manifest.origins) ? manifest.origins.filter((item) => typeof item === 'string') : []),
  ]);
}

function validate(root) {
  const errors = [];
  let catalog;
  try {
    catalog = readJson(root, 'docs/architecture/SERVICE_CATALOG.json');
  } catch (error) {
    return [`catalog unreadable: ${error instanceof Error ? error.message : String(error)}`];
  }
  if (catalog.schemaVersion !== 1) errors.push('schemaVersion must equal 1');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(catalog.verifiedOn || ''))) {
    errors.push('verifiedOn must use YYYY-MM-DD');
  }
  if (JSON.stringify(catalog.canonicalSources) !== JSON.stringify(REQUIRED_SOURCES)) {
    errors.push(`canonicalSources must equal ${REQUIRED_SOURCES.join(', ')}`);
  }

  const services = Array.isArray(catalog.services) ? catalog.services : [];
  const ids = new Set();
  for (const service of services) {
    for (const field of REQUIRED_FIELDS) {
      const value = service?.[field];
      const emptyArray = Array.isArray(value) && value.length === 0;
      if (value === undefined || value === null || value === '' || emptyArray) {
        errors.push(`${service?.id || '<unknown>'}: missing ${field}`);
      }
    }
    if (ids.has(service?.id)) errors.push(`${service.id}: duplicate id`);
    ids.add(service?.id);
    if (!CRITICALITIES.has(service?.criticality)) {
      errors.push(`${service?.id || '<unknown>'}: invalid criticality`);
    }
    if (!RECOVERY_TIERS.has(service?.recoveryTier)) {
      errors.push(`${service?.id || '<unknown>'}: invalid recoveryTier`);
    }
    if (['tier-0', 'tier-1'].includes(service?.criticality)
      && String(service?.owner || '').trim().toLowerCase() === 'unknown') {
      errors.push(`${service.id}: owner cannot be unknown for ${service.criticality}`);
    }
  }

  let discovered;
  try {
    discovered = discover(root);
  } catch (error) {
    errors.push(`canonical manifest discovery failed: ${error instanceof Error ? error.message : String(error)}`);
    return errors;
  }

  for (const item of discovered.hosting) {
    const match = services.find((service) => service?.manifest?.kind === 'firebase-hosting'
      && service.manifest.target === item.target);
    if (!match) {
      errors.push(`uncovered Firebase hosting target ${item.target}`);
      continue;
    }
    const catalogSites = Array.isArray(match.manifest.sites) ? match.manifest.sites.map(String).sort() : [];
    if (JSON.stringify(catalogSites) !== JSON.stringify([...item.sites].sort())) {
      errors.push(`hosting target ${item.target}: sites differ from .firebaserc`);
    }
    if (match.manifest.public !== item.public) {
      errors.push(`hosting target ${item.target}: public directory differs from firebase.json`);
    }
  }
  for (const item of discovered.functions) {
    const match = services.find((service) => service?.manifest?.kind === 'firebase-functions'
      && service.manifest.codebase === item.codebase);
    if (!match) {
      errors.push(`uncovered Functions codebase ${item.codebase}`);
      continue;
    }
    if (match.manifest.source !== item.source || match.manifest.runtime !== item.runtime) {
      errors.push(`Functions codebase ${item.codebase}: source/runtime differs from firebase.json`);
    }
  }
  const coveredOrigins = new Set(services.flatMap(listedOrigins));
  for (const origin of discovered.origins) {
    if (!coveredOrigins.has(origin)) errors.push(`uncovered external origin ${origin}`);
  }
  return errors;
}

const root = parseArgs(process.argv.slice(2));
const errors = validate(root);
if (errors.length) {
  process.stderr.write(`service_catalog_failed count=${errors.length}\n${errors.map((item) => `- ${item}`).join('\n')}\n`);
  process.exit(1);
}
const count = readJson(root, 'docs/architecture/SERVICE_CATALOG.json').services.length;
process.stdout.write(`service_catalog_ok services=${count} sources=${REQUIRED_SOURCES.length}\n`);
