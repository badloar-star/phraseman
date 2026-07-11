import fs from 'node:fs';
import path from 'node:path';
import { buildAdminSectionManifest, PM_BACKEND_SOURCES } from './admin_pm_source_manifest';
import { DIGEST_SOURCE_REGISTRY } from './admin_digest_sources';

const ROOT = path.resolve(__dirname, '..', '..');

test('classifies every current admin section exactly once', () => {
  const html = fs.readFileSync(path.join(ROOT, 'admin', 'index.html'), 'utf8');
  const tabs = [...html.matchAll(/switchTab\('([^']+)'\)/g)].map(match => match[1]);
  const uniqueTabs = [...new Set(tabs)];
  const manifest = buildAdminSectionManifest(uniqueTabs);
  expect(manifest.map(item => item.adminTab).sort()).toEqual(uniqueTabs.sort());
  expect(new Set(manifest.map(item => item.adminTab)).size).toBe(uniqueTabs.length);
  expect(manifest.every(item => ['included', 'excluded', 'unmapped'].includes(item.status))).toBe(true);
});

test('classifies every digest backend source and included sources name adapters', () => {
  const registered = new Set(PM_BACKEND_SOURCES.map(source => source.sourceId));
  for (const source of DIGEST_SOURCE_REGISTRY) expect(registered.has(source.id)).toBe(true);
  expect(PM_BACKEND_SOURCES.filter(source => source.status === 'included').every(source => source.adapterId && source.metricIds.length)).toBe(true);
});

test('keeps curated product goals in a human-owned overlay', () => {
  const overlay = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'product-codex', 'business-overlay.json'), 'utf8'));
  expect(overlay.schemaVersion).toBe(1);
  expect(overlay.goals).toHaveLength(4);
  expect(overlay.metricGlossary.every((metric: { formula?: string; sourceIds?: string[] }) => metric.formula && metric.sourceIds?.length)).toBe(true);
});

test('keeps curated journeys tied to real Codex screen entities', () => {
  const overlay = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'product-codex', 'business-overlay.json'), 'utf8'));
  const appCodex = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin', 'generated', 'app-codex.json'), 'utf8'));
  const entityIds = new Set((appCodex.entities || []).map((entity: { id: string }) => entity.id));
  for (const journey of overlay.journeys || []) {
    for (const screenId of journey.screenIds || []) {
      expect(entityIds.has(screenId)).toBe(true);
    }
  }
});

test('generates a server-side PM Codex projection from the curated overlay', () => {
  const generatedPath = path.join(ROOT, 'functions', 'src', 'generated', 'admin_pm_codex.ts');
  expect(fs.existsSync(generatedPath)).toBe(true);
  const generated = fs.readFileSync(generatedPath, 'utf8');
  expect(generated).toContain('ADMIN_PM_CODEX');
  expect(generated).toContain('growth_activation');
  expect(generated).toContain('metricGlossary');
});
