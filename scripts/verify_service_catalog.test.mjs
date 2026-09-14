import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const VERIFIER = resolve('scripts/verify_service_catalog.mjs');

function service(id, manifest, overrides = {}) {
  return {
    id,
    name: id,
    type: manifest.kind,
    owner: 'engineering',
    dataClasses: ['operational-metadata'],
    criticality: 'tier-1',
    recoveryTier: 'R1',
    trustBoundary: 'managed-cloud',
    manifest,
    ...overrides,
  };
}

function fixture(mutator = (catalog) => catalog) {
  const root = mkdtempSync(join(tmpdir(), 'phraseman-service-catalog-'));
  mkdirSync(join(root, 'docs', 'architecture'), { recursive: true });
  writeFileSync(join(root, '.firebaserc'), JSON.stringify({
    projects: { default: 'demo-project' },
    targets: { 'demo-project': { hosting: { admin: ['demo-admin'] } } },
  }));
  writeFileSync(join(root, 'firebase.json'), JSON.stringify({
    functions: [
      { source: 'functions', codebase: 'default', runtime: 'nodejs22' },
      { source: 'functions-ai', codebase: 'ai', runtime: 'nodejs22' },
    ],
    hosting: [{
      target: 'admin',
      public: 'admin/v2',
      headers: [{ source: '**', headers: [{ key: 'Content-Security-Policy', value: "connect-src 'self' https://api.example.test" }] }],
    }],
  }));
  writeFileSync(join(root, 'app.json'), JSON.stringify({
    expo: { name: 'Demo', updates: { url: 'https://u.expo.dev/demo' } },
  }));
  writeFileSync(join(root, 'eas.json'), JSON.stringify({ build: { production: {} } }));

  const catalog = {
    schemaVersion: 1,
    verifiedOn: '2026-09-11',
    canonicalSources: ['.firebaserc', 'firebase.json', 'app.json', 'eas.json'],
    services: [
      service('admin-hosting', { kind: 'firebase-hosting', target: 'admin', sites: ['demo-admin'], public: 'admin/v2' }),
      service('functions-default', { kind: 'firebase-functions', codebase: 'default', source: 'functions', runtime: 'nodejs22' }, { criticality: 'tier-0', recoveryTier: 'R0' }),
      service('functions-ai', { kind: 'firebase-functions', codebase: 'ai', source: 'functions-ai', runtime: 'nodejs22' }),
      service('example-api', { kind: 'external-origin', origin: 'https://api.example.test' }),
      service('expo-updates', { kind: 'external-origin', origin: 'https://u.expo.dev' }),
    ],
  };
  writeFileSync(
    join(root, 'docs', 'architecture', 'SERVICE_CATALOG.json'),
    JSON.stringify(mutator(catalog), null, 2),
  );
  return root;
}

function verify(root) {
  return spawnSync(process.execPath, [VERIFIER, '--root', root], {
    cwd: root,
    encoding: 'utf8',
  });
}

test('accepts a catalog covering hosting, functions and external origins', () => {
  const root = fixture();
  try {
    const result = verify(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /service_catalog_ok/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects an uncovered Firebase Hosting target', () => {
  const root = fixture((catalog) => ({ ...catalog, services: catalog.services.filter((item) => item.id !== 'admin-hosting') }));
  try {
    const result = verify(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /hosting target admin/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects an uncovered Functions codebase', () => {
  const root = fixture((catalog) => ({ ...catalog, services: catalog.services.filter((item) => item.id !== 'functions-ai') }));
  try {
    const result = verify(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Functions codebase ai/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects an uncovered external origin', () => {
  const root = fixture((catalog) => ({ ...catalog, services: catalog.services.filter((item) => item.id !== 'example-api') }));
  try {
    const result = verify(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /external origin https:\/\/api\.example\.test/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects unknown ownership for Tier 0 and Tier 1 services', () => {
  const root = fixture((catalog) => ({
    ...catalog,
    services: catalog.services.map((item) => item.id === 'functions-default' ? { ...item, owner: 'unknown' } : item),
  }));
  try {
    const result = verify(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /functions-default.*owner/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
